// lib/member/entitlement.ts
// Pure rules (no I/O) for "does this member get the member benefits right now?" and "what do we show on the account page?".
//
//   status in the database          benefits?                               account page says
//   ───────────────────────────     ───────────────────────────────────     ───────────────────────────
//   active (paid, or complimentary)  yes                                      Active  (+ renews / ends on …)
//   active + cancel_at_period_end    yes, until the paid period ends          Ends on …
//   failed  (payment problem)        yes for GRACE_DAYS after the period      Payment problem — update your card
//                                    end (Stripe retries the card meanwhile)
//   canceled                         NO                                       Ended on …  (+ rejoin)
//
// Stripe turns a cancelled subscription into 'canceled' via webhook; lib/member/reconcile.ts double-checks daily in case a
// webhook was ever missed, so nobody keeps benefits by accident.

export const GRACE_DAYS = 7;
export const PROFILE_RETENTION_DAYS = 90;
export const SESSION_TTL_DAYS = 30;

export interface MemberLike {
  status: string;
  current_period_end?: string | null;
  updated_at?: string | null;
  stripe_subscription_id?: string | null;
  cancel_at_period_end?: boolean | null;
  lapsed_at?: string | null;
}

const DAY = 86_400_000;
const ms = (iso: string | null | undefined) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? t : null; };

export const isComplimentary = (m: Pick<MemberLike, 'stripe_subscription_id'>) => !m.stripe_subscription_id;

/** Do the member benefits (more thorough concierge, cross-device memory) apply right now? */
export function entitled(m: MemberLike, now: Date = new Date()): boolean {
  if (m.status === 'active') return true;
  if (m.status === 'failed') {
    const anchor = ms(m.current_period_end) ?? ms(m.updated_at);
    return anchor !== null && now.getTime() < anchor + GRACE_DAYS * DAY;
  }
  return false;
}

/** Statuses that may sign in to the account page. Ended members can: they still need their invoices and the way back in. */
export const SIGN_IN_STATUSES = ['active', 'failed', 'canceled'] as const;
export const canSignIn = (status: string) => (SIGN_IN_STATUSES as readonly string[]).includes(status);

export type AccountState = 'complimentary' | 'active' | 'ending' | 'payment_problem' | 'ended';

export function accountState(m: MemberLike, now: Date = new Date()): AccountState {
  if (m.status === 'canceled' || !entitled(m, now)) return 'ended';
  if (m.status === 'failed') return 'payment_problem';
  if (isComplimentary(m)) return 'complimentary';
  return m.cancel_at_period_end ? 'ending' : 'active';
}

/** The durable concierge profile of a long-lapsed member is erased (data minimisation). */
export function profileExpired(lapsedAt: string | null | undefined, now: Date = new Date()): boolean {
  const t = ms(lapsedAt);
  return t !== null && now.getTime() - t > PROFILE_RETENTION_DAYS * DAY;
}

/** Date the member should see: when it renews, or when benefits end / ended. */
export function keyDate(m: MemberLike): string | null {
  return m.status === 'canceled' ? (m.lapsed_at || m.current_period_end || m.updated_at || null) : (m.current_period_end || null);
}

/** Active-looking rows whose paid period ended long ago: Stripe should be asked what really happened. */
export function needsReconcile(m: MemberLike & { stripe_subscription_id?: string | null }, now: Date = new Date(), staleDays = 2): boolean {
  if (!m.stripe_subscription_id) return false;                           // complimentary: no Stripe truth to check
  if (m.status !== 'active' && m.status !== 'failed') return false;
  const end = ms(m.current_period_end);
  if (end !== null) return now.getTime() > end + staleDays * DAY;
  const upd = ms(m.updated_at);                                          // period never recorded: give the webhook 40 days
  return upd !== null && now.getTime() > upd + 40 * DAY;
}
