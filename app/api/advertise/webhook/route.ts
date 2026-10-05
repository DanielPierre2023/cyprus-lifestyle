// POST /api/advertise/webhook — Stripe events. Verifies the signature against
// STRIPE_WEBHOOK_SECRET, then reconciles the matching ad_orders row / concierge member.
// Register the endpoint URL in the Stripe dashboard and paste its signing secret into Vercel.
//
// Delivery semantics (Stripe redelivers any non-2xx for up to ~3 days with back-off):
//   • MEMBERSHIP writes are strict — a paid membership, a cancellation, a failed payment.
//     If the write does not land we answer 500 so Stripe retries, and answer 2xx only once
//     it is durably recorded. These writes are idempotent (keyed on the Stripe
//     subscription / session id), so a redelivery never duplicates or double-applies.
//   • Event types we don't handle are acknowledged with 2xx on purpose.
//   • The advertising-order checkout branch now checks its ONE reconciliation write (mark
//     the order paid): a real DB failure there answers 500 for a retry, since no side-effect
//     has run yet. Its downstream CRM / fulfilment / email side-effects stay best-effort
//     (not idempotent, so a blanket retry could duplicate deals and emails) — swallowed but
//     logged. A no-match / malformed id is acknowledged, not retried.
//   • Idempotency: every event id is claimed in stripe_events first; an already-processed id
//     is acknowledged with no side effects, and processed_at is set only AFTER success.
//     (No table yet → previous behaviour.)
//   • Order-safety: status changes are conditional updates (lib/stripe/events.ts allowedFrom),
//     so a late/duplicate event can never resurrect a 'canceled' row.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyWebhook } from '@/lib/stripe';
import { onboardingEmail, type OrderLike } from '@/lib/fulfilment';
import { sendEmail } from '@/lib/email';
import { recordMembershipCheckout } from '@/lib/concierge/membership';
import { logServerError } from '@/lib/monitor.server';
import {
  PAYABLE_FROM, allowedFrom, invoiceSubscriptionId, isMissingSchema, isMoneyBackEvent, isPaidSession,
  mapSubscriptionStatus, subscriptionPeriod,
} from '@/lib/stripe/events';
import { claimEvent, markProcessed, releaseClaim } from '@/lib/stripe/ledger';
import type { SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Answer 500 so Stripe redelivers — what we want whenever a write that matters did not
// land. Logs the event id/type, the step and the DB error text only: never the payload
// (customer PII) and never a secret.
async function retryLater(event: Record<string, unknown>, step: string, detail: string) {
  await logServerError('stripe-webhook', new Error(`${step} failed: ${detail}`.slice(0, 300)), {
    eventId: String(event.id || ''), type: String(event.type || ''), step,
  });
  return NextResponse.json({ ok: false, error: 'processing failed — Stripe will retry' }, { status: 500 });
}

// Status transition on both subscription-backed tables, guarded by allowedFrom().
async function transition(sb: SupabaseClient, subId: string, target: 'active' | 'failed' | 'canceled', now: string) {
  const from = allowedFrom(target);
  const patch = { status: target, updated_at: now };
  const ad = await sb.from('ad_orders').update(patch).eq('stripe_subscription_id', subId).in('status', from);
  const mem = await sb.from('concierge_members').update(patch).eq('stripe_subscription_id', subId).in('status', from);
  return ad.error || mem.error;
}

let warnedPeriod = false;
// Persist current_period_end / cancel_at_period_end. Needs the new columns; if they are not
// there yet (migration not run) it is skipped with a single log line — never an error.
async function persistPeriod(sb: SupabaseClient, subId: string, sub: Record<string, unknown>, now: string) {
  const p = subscriptionPeriod(sub);
  const patch: Record<string, unknown> = { cancel_at_period_end: p.cancel_at_period_end, updated_at: now };
  if (p.current_period_end) patch.current_period_end = p.current_period_end;
  for (const table of ['ad_orders', 'concierge_members']) {
    const r = await sb.from(table).update(patch).eq('stripe_subscription_id', subId).neq('status', 'canceled');
    if (!r.error) continue;
    if (isMissingSchema(r.error)) {
      if (!warnedPeriod) {
        warnedPeriod = true;
        await logServerError('stripe-webhook', new Error('current_period_end/cancel_at_period_end columns missing — run migration 20261004130200_stripe_events.sql'), {}, 'warn');
      }
      return null;
    }
    return r.error;
  }
  return null;
}

async function processEvent(sb: SupabaseClient, event: Record<string, unknown>, now: string): Promise<NextResponse> {
  const type = String(event.type || '');
  const obj = ((event.data as Record<string, unknown>)?.object || {}) as Record<string, unknown>;
  const ok = () => NextResponse.json({ received: true });

  // Flipped on as soon as we enter a membership-affecting branch, so the catch below knows
  // whether an unexpected error may be swallowed (ad-order branch) or must trigger a retry.
  let strict = false;
  try {
    const meta = (obj.metadata as Record<string, string>) || {};
    const completed = type === 'checkout.session.completed' || type === 'checkout.session.async_payment_succeeded';

    // Paid only when money moved (or none is due). A delayed-payment session that is still
    // 'unpaid' is acknowledged and waits for async_payment_succeeded / _failed.
    if (completed && !isPaidSession(obj.payment_status)) return ok();

    // Concierge membership — handled here so one Stripe endpoint covers both flows.
    if (completed && meta.kind === 'membership') {
      strict = true;
      const md = (obj.customer_details as Record<string, unknown>) || {};
      const rec = await recordMembershipCheckout(sb, {
        cid: meta.cid || (obj.client_reference_id as string) || null,
        email: (md.email as string) || (obj.customer_email as string) || null,
        tier: meta.tier || 'concierge',
        customerId: (obj.customer as string) || null,
        subscriptionId: (obj.subscription as string) || null,
        sessionId: (obj.id as string) || null,
      }, now);
      if (!rec.ok) return await retryLater(event, 'membership checkout write', rec.error);
      return ok();
    }
    if (completed) {
      const orderId = (obj.client_reference_id as string) || ((obj.metadata as Record<string, string>)?.order_id);
      const details = (obj.customer_details as Record<string, unknown>) || {};
      const patch: Record<string, unknown> = {
        status: obj.mode === 'subscription' ? 'active' : 'paid',
        stripe_customer_id: (obj.customer as string) || null,
        stripe_subscription_id: (obj.subscription as string) || null,
        stripe_payment_intent: (obj.payment_intent as string) || null,
        customer_email: (details.email as string) || (obj.customer_email as string) || null,
        updated_at: now,
      };
      let order: Record<string, unknown> | null = null;
      // The reconciliation write that marks the order paid. Check its error BEFORE any
      // (non-idempotent) CRM / fulfilment / email side-effect runs — nothing below has
      // happened yet, so a retry here is safe. A real DB failure → 500 so Stripe retries.
      // "No matching row" (PGRST116) and a malformed id (22P02) are PERMANENT — an order we
      // don't track, a foreign event, or one already paid/canceled (order-safety: only
      // pending/failed/expired orders are moved) — so acknowledge them instead of retry-storming.
      const ACK = new Set(['PGRST116', '22P02']);
      const sel = orderId
        ? await sb.from('ad_orders').update(patch).eq('id', orderId).in('status', PAYABLE_FROM).select('*').single()
        : obj.id
          ? await sb.from('ad_orders').update(patch).eq('stripe_session_id', obj.id as string).in('status', PAYABLE_FROM).select('*').single()
          : null;
      if (sel?.error && !ACK.has(sel.error.code || '')) return await retryLater(event, 'ad-order checkout write', sel.error.message);
      order = sel?.data ?? null;

      // Attach the sale to a CRM account: match/create, link, log the win, open a
      // live/won deal, and move the account to 'live'. Best-effort — a CRM hiccup
      // never fails the webhook (Stripe would just retry).
      if (order) {
        let orgId = (order.org_id as string) || null;
        if (!orgId) {
          const { data } = await sb.rpc('crm_upsert_account', {
            p_name: (order.company as string) || (order.customer_name as string) || null,
            p_email: (order.customer_email as string) || (patch.customer_email as string) || null,
            p_website: null, p_category: null, p_district: null,
          });
          orgId = (data as string) || null;
          if (orgId) await sb.from('ad_orders').update({ org_id: orgId }).eq('id', order.id as string);
        }
        if (orgId) {
          await sb.from('crm_activities').insert({ org_id: orgId, type: 'note', subject: `Paid — ${order.label || order.slot || 'placement'}`, body: `€${order.amount ?? ''} · ${order.mode ?? ''}` }).then(() => {}, () => {});
          await sb.from('crm_deals').insert({ org_id: orgId, stage: order.mode === 'subscription' ? 'live' : 'won', product: order.slot ?? null, value_eur: (order.amount as number) ?? null }).then(() => {}, () => {});
          await sb.from('crm_orgs').update({ status: 'live', updated_at: now }).eq('id', orgId).then(() => {}, () => {});
        }

        // Auto-provision the placement + raise a fulfilment task (best-effort).
        await sb.rpc('fulfil_ad_order', { p_order_id: order.id as string }).then(() => {}, () => {});
        // Onboarding intake email — asks the buyer for exactly what we need to go live.
        const toEmail = (order.customer_email as string) || (patch.customer_email as string) || null;
        if (toEmail) {
          const mail = onboardingEmail(order as OrderLike);
          await sendEmail({ to: toEmail, subject: mail.subject, html: mail.html }).catch(() => {});
        }
      }
    } else if (type === 'checkout.session.expired' || type === 'checkout.session.async_payment_failed') {
      // Pending ad order whose session lapsed / whose delayed payment failed. Only if it is
      // still pending — a paid or canceled order is never touched.
      if (obj.id) {
        const next = type === 'checkout.session.expired' ? 'expired' : 'failed';
        const r = await sb.from('ad_orders').update({ status: next, updated_at: now }).eq('stripe_session_id', obj.id as string).eq('status', 'pending');
        if (r.error) return await retryLater(event, `ad-order ${next} write`, r.error.message);
      }
    } else if (type === 'customer.subscription.deleted') {
      if (obj.id) {
        strict = true;
        // Plain, idempotent status writes, so a retry is always safe. Both run even if the
        // first fails, then either failure is reported (a member whose cancellation is not
        // recorded would keep premium access).
        const err = await transition(sb, obj.id as string, 'canceled', now);
        if (err) return await retryLater(event, 'subscription cancel write', err.message);
      }
    } else if (type === 'customer.subscription.updated') {
      if (obj.id) {
        strict = true;
        const target = mapSubscriptionStatus(obj.status);
        if (target) {
          const err = await transition(sb, obj.id as string, target, now);
          if (err) return await retryLater(event, 'subscription status write', err.message);
        }
        if (target !== 'canceled') {
          const perr = await persistPeriod(sb, obj.id as string, obj, now);
          if (perr) return await retryLater(event, 'subscription period write', perr.message);
        }
      }
    } else if (type === 'invoice.payment_failed') {
      const sub = invoiceSubscriptionId(obj);
      if (sub) {
        strict = true;
        const err = await transition(sb, sub, 'failed', now);
        if (err) return await retryLater(event, 'payment-failed write', err.message);
      }
    } else if (type === 'invoice.paid') {
      // A card recovered by Stripe's retry: failed → active, and only from failed.
      const sub = invoiceSubscriptionId(obj);
      if (sub) {
        strict = true;
        const err = await transition(sb, sub, 'active', now);
        if (err) return await retryLater(event, 'invoice-paid write', err.message);
      }
    } else if (isMoneyBackEvent(type)) {
      // Refunds / disputes: full handling is Phase 1 — record it visibly and acknowledge.
      await logServerError('stripe-webhook:money-back', new Error(`${type} received — manual review`), {
        eventId: String(event.id || ''), type, objectId: String(obj.id || ''),
      }, 'warn');
    }
  } catch (e) {
    // Membership branches: an unexpected error must not look like success → retry.
    if (strict) return retryLater(event, 'unexpected error', (e as Error).message);
    // Advertising-order branch: never fail the webhook on our own logic error (its side
    // effects aren't idempotent, so retrying could duplicate them). Logged, so a swallowed
    // failure is visible in the admin error log.
    await logServerError('stripe-webhook:ad-order', e, { eventId: String(event.id || ''), type: String(event.type || '') });
  }
  return ok();
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'not configured' }, { status: 400 });

  const raw = await req.text(); // raw body is required for signature verification
  const event = verifyWebhook(raw, req.headers.get('stripe-signature'), secret);
  if (!event) return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 400 });

  const sb = supabaseAdmin();
  const now = new Date().toISOString();
  const eventId = String(event.id || '');

  // Idempotency: already processed → ack with no side effects; being handled by a concurrent
  // delivery → 409 so Stripe retries later; ledger unavailable → process as before.
  const claim = eventId ? await claimEvent(sb, eventId, String(event.type || ''), now) : 'untracked';
  if (claim === 'skip') return NextResponse.json({ received: true, duplicate: true });
  if (claim === 'busy') return NextResponse.json({ ok: false, error: 'event in progress — Stripe will retry' }, { status: 409 });

  const res = await processEvent(sb, event, now);
  if (claim === 'process') {
    if (res.ok) await markProcessed(sb, eventId, new Date().toISOString());
    else await releaseClaim(sb, eventId);
  }
  return res;
}
