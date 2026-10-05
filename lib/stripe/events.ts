// Pure Stripe-webhook decision logic (no I/O) so it is unit-testable.
// Used by app/api/advertise/webhook/route.ts.

export type LocalStatus = 'pending' | 'paid' | 'active' | 'failed' | 'canceled' | 'expired';

/** Lease after which an unfinished claim on an event may be taken over (ms). */
export const CLAIM_LEASE_MS = 5 * 60 * 1000;

export interface EventRow { processed_at?: string | null; claimed_at?: string | null }

/**
 * What to do with an event whose id already exists in stripe_events.
 *  skip — already handled: acknowledge, no side effects
 *  busy — another delivery is handling it right now: answer non-2xx so Stripe retries later
 *  take — a previous attempt failed / its lease expired: process it
 */
export function claimDecision(row: EventRow | null, nowMs: number, leaseMs = CLAIM_LEASE_MS): 'process' | 'skip' | 'busy' | 'take' {
  if (!row) return 'process';
  if (row.processed_at) return 'skip';
  if (!row.claimed_at) return 'take';
  const t = Date.parse(row.claimed_at);
  return Number.isFinite(t) && nowMs - t < leaseMs ? 'busy' : 'take';
}

/** A Checkout Session counts as paid only when money moved or none is due (trial / 100% coupon). */
export function isPaidSession(paymentStatus: unknown): boolean {
  return paymentStatus === 'paid' || paymentStatus === 'no_payment_required';
}

/** Stripe subscription.status → our status, or null = leave the row untouched. */
export function mapSubscriptionStatus(s: unknown): 'active' | 'failed' | 'canceled' | null {
  switch (s) {
    case 'active': case 'trialing': return 'active';
    case 'past_due': case 'unpaid': return 'failed';
    case 'canceled': case 'incomplete_expired': return 'canceled';
    default: return null; // incomplete, paused, unknown
  }
}

/**
 * Order-safety: the statuses a row may currently have for us to move it to `target`.
 * Events arrive out of order, so every transition is a conditional update. 'canceled' is
 * terminal — nothing is ever allowed to move a row out of it.
 */
export function allowedFrom(target: 'active' | 'failed' | 'canceled'): LocalStatus[] {
  switch (target) {
    case 'active': return ['failed'];                              // recovery only
    case 'failed': return ['active'];                              // a live subscription lapsing
    case 'canceled': return ['active', 'failed', 'pending', 'paid'];
  }
}

/** Statuses an ad order may be in when a (late/redelivered) checkout completion marks it paid. */
export const PAYABLE_FROM: LocalStatus[] = ['pending', 'failed', 'expired'];

/** Subscription id of an invoice, across Stripe API versions. */
export function invoiceSubscriptionId(inv: Record<string, unknown>): string | null {
  const direct = inv.subscription;
  if (typeof direct === 'string' && direct) return direct;
  if (direct && typeof direct === 'object' && typeof (direct as { id?: unknown }).id === 'string') return (direct as { id: string }).id;
  const parent = inv.parent as { subscription_details?: { subscription?: unknown } } | undefined;
  const nested = parent?.subscription_details?.subscription;
  return typeof nested === 'string' && nested ? nested : null;
}

/** current_period_end / cancel_at_period_end of a subscription object, across API versions. */
export function subscriptionPeriod(sub: Record<string, unknown>): { current_period_end: string | null; cancel_at_period_end: boolean } {
  let secs = sub.current_period_end;
  if (typeof secs !== 'number') {
    const items = (sub.items as { data?: Array<{ current_period_end?: unknown }> } | undefined)?.data;
    secs = items?.[0]?.current_period_end;
  }
  return {
    current_period_end: typeof secs === 'number' && Number.isFinite(secs) ? new Date(secs * 1000).toISOString() : null,
    cancel_at_period_end: sub.cancel_at_period_end === true,
  };
}

/** Refund / dispute events that are logged and acknowledged only (full handling is Phase 1). */
export function isMoneyBackEvent(type: string): boolean {
  return type === 'charge.refunded' || type.startsWith('charge.dispute.') || type.startsWith('refund.');
}

/** True for a Postgres/PostgREST "relation or column is missing" error (migration not yet run). */
export function isMissingSchema(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(err.code || '')
    || /does not exist|could not find the .* (table|column)/i.test(err.message || '');
}

/** Escape LIKE/ILIKE wildcards so an email is matched literally (case-insensitive exact). */
export function escapeLike(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}
