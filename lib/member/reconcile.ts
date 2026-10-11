// lib/member/reconcile.ts
// The daily "nobody keeps member benefits by accident" check, run from the daily job (/api/cron/tick):
//   1. For paid members whose paid period ended days ago but whose row still says active/failed (a cancellation or
//      payment event never reached us), ask Stripe what the subscription really is and bring the row in line.
//   2. Stamp lapsed_at on every ended membership (starts the data-retention clock).
//   3. Erase the durable concierge profile of members who lapsed more than PROFILE_RETENTION_DAYS ago.
//   4. Delete expired sign-in sessions and spent sign-in links.
// All steps are idempotent and best-effort; one failing row never stops the others.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { retrieveSubscription, type SubscriptionLookup } from '@/lib/stripe';
import { mapSubscriptionStatus, subscriptionPeriod } from '@/lib/stripe/events';
import { PROFILE_RETENTION_DAYS, needsReconcile, type MemberLike } from '@/lib/member/entitlement';
import { logServerError } from '@/lib/monitor.server';
import { sendEmail } from '@/lib/email';
import { runLifecycleNotices, type Sender } from '@/lib/member/lifecycle';

export interface ReconcileSummary { checked: number; changed: number; lapsedStamped: number; profilesErased: number; sessionsPurged: number; errors: number; graceNotices: number; endedNotices: number; noticeFailures: number }

interface Row extends MemberLike { id: string; stripe_subscription_id: string | null }

/** What the row should become, given Stripe's answer (pure). null = leave it. */
export function planUpdate(row: Row, lookup: SubscriptionLookup, nowIso: string): Record<string, unknown> | null {
  if (!lookup.found) {
    if (lookup.reason === 'missing') return { status: 'canceled', lapsed_at: nowIso, updated_at: nowIso };   // Stripe has no such subscription any more
    return null;                                                                                              // Stripe unreachable: decide tomorrow
  }
  const target = mapSubscriptionStatus(lookup.status);
  const period = subscriptionPeriod(lookup.subscription);
  const patch: Record<string, unknown> = {};
  if (target && target !== row.status) {
    patch.status = target;
    if (target === 'canceled') patch.lapsed_at = nowIso;
  }
  if (period.current_period_end && period.current_period_end !== row.current_period_end) patch.current_period_end = period.current_period_end;
  if (period.cancel_at_period_end !== (row.cancel_at_period_end === true)) patch.cancel_at_period_end = period.cancel_at_period_end;
  if (Object.keys(patch).length === 0) return null;
  patch.updated_at = nowIso;
  return patch;
}

export async function reconcileMembers(sb: SupabaseClient, now: Date = new Date(), lookup: (id: string) => Promise<SubscriptionLookup> = (id) => retrieveSubscription(id), send: Sender = (m) => sendEmail(m)): Promise<ReconcileSummary> {
  const out: ReconcileSummary = { checked: 0, changed: 0, lapsedStamped: 0, profilesErased: 0, sessionsPurged: 0, errors: 0, graceNotices: 0, endedNotices: 0, noticeFailures: 0 };
  const nowIso = now.toISOString();
  try {
    // 1. ask Stripe about stale rows (cap per run keeps the daily job short)
    const { data: cand } = await sb.from('concierge_members')
      .select('id, status, current_period_end, updated_at, stripe_subscription_id, cancel_at_period_end, lapsed_at')
      .in('status', ['active', 'failed']).not('stripe_subscription_id', 'is', null).limit(500);
    const stale = ((cand || []) as Row[]).filter((r) => needsReconcile(r, now)).slice(0, 40);
    for (const row of stale) {
      out.checked++;
      const found = await lookup(String(row.stripe_subscription_id));
      if (!found.found && found.reason === 'error') { out.errors++; continue; }
      const patch = planUpdate(row, found, nowIso);
      if (!patch) continue;
      const { error } = await sb.from('concierge_members').update(patch).eq('id', row.id).in('status', ['active', 'failed']);
      if (error) { out.errors++; await logServerError('member-reconcile', new Error(error.message), { member: row.id }, 'warn'); } else out.changed++;
    }

    // 2. start the retention clock on ended memberships
    const stamped = await sb.from('concierge_members').update({ lapsed_at: nowIso }).eq('status', 'canceled').is('lapsed_at', null).select('id');
    out.lapsedStamped = stamped.data?.length ?? 0;

    // 3. erase long-lapsed durable profiles
    const cutoff = new Date(now.getTime() - PROFILE_RETENTION_DAYS * 86_400_000).toISOString();
    const erased = await sb.from('concierge_members').update({ profile: {}, profile_updated_at: nowIso })
      .eq('status', 'canceled').lt('lapsed_at', cutoff).filter('profile', 'neq', '{}').select('id');
    out.profilesErased = erased.data?.length ?? 0;

    // 4. housekeeping
    const sess = await sb.from('member_sessions').delete().lt('expires_at', nowIso).select('id');
    out.sessionsPurged = sess.data?.length ?? 0;
    await sb.from('membership_restore_tokens').delete().lt('expires_at', new Date(now.getTime() - 86_400_000).toISOString());
  } catch (e) {
    out.errors++;
    await logServerError('member-reconcile', e, {}, 'warn');
  }

  // 5. lifecycle e-mails (own try/catch: a mail problem must never undo or hide the steps above)
  try {
    const site = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');
    const n = await runLifecycleNotices(sb, now, send, site);
    out.graceNotices = n.graceSent; out.endedNotices = n.endedSent; out.noticeFailures = n.failed;
  } catch (e) {
    out.errors++;
    await logServerError('member-lifecycle', e, {}, 'warn');
  }
  return out;
}
