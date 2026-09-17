// POST /api/advertise/webhook — Stripe events. Verifies the signature against
// STRIPE_WEBHOOK_SECRET, then reconciles the matching ad_orders row. Register the
// endpoint URL in the Stripe dashboard and paste its signing secret into Vercel.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { verifyWebhook } from '@/lib/stripe';
import { onboardingEmail, type OrderLike } from '@/lib/fulfilment';
import { sendEmail } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ ok: false, error: 'not configured' }, { status: 400 });

  const raw = await req.text(); // raw body is required for signature verification
  const event = verifyWebhook(raw, req.headers.get('stripe-signature'), secret);
  if (!event) return NextResponse.json({ ok: false, error: 'invalid signature' }, { status: 400 });

  const type = String(event.type || '');
  const obj = ((event.data as Record<string, unknown>)?.object || {}) as Record<string, unknown>;
  const sb = supabaseAdmin();
  const now = new Date().toISOString();

  try {
    if (type === 'checkout.session.completed') {
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
      if (orderId) { const { data } = await sb.from('ad_orders').update(patch).eq('id', orderId).select('*').single(); order = data; }
      else if (obj.id) { const { data } = await sb.from('ad_orders').update(patch).eq('stripe_session_id', obj.id as string).select('*').single(); order = data; }

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
    } else if (type === 'customer.subscription.deleted') {
      if (obj.id) await sb.from('ad_orders').update({ status: 'canceled', updated_at: now }).eq('stripe_subscription_id', obj.id as string);
    } else if (type === 'invoice.payment_failed') {
      if (obj.subscription) await sb.from('ad_orders').update({ status: 'failed', updated_at: now }).eq('stripe_subscription_id', obj.subscription as string);
    }
  } catch {
    // Never fail the webhook on our own logic error — Stripe would retry endlessly.
  }
  return NextResponse.json({ received: true });
}
