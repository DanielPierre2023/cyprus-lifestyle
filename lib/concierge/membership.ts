// lib/concierge/membership.ts
// Concierge members' tier — server-side entitlement checks. A member is a row in
// concierge_members with status='active'. Recognised by the anonymous cid used at
// checkout, or linked by email across devices. All best-effort: any failure means
// "not a member", so the concierge simply serves the free tier.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidCid } from '@/lib/concierge/memory';

export interface MemberStatus { member: boolean; tier: string | null; }

export async function memberStatus(cid: string): Promise<MemberStatus> {
  if (!isValidCid(cid)) return { member: false, tier: null };
  try {
    const { data } = await supabaseAdmin()
      .from('concierge_members')
      .select('tier, status')
      .eq('cid', cid).eq('status', 'active')
      .limit(1).maybeSingle();
    return data ? { member: true, tier: String(data.tier || 'concierge') } : { member: false, tier: null };
  } catch { return { member: false, tier: null }; }
}

export async function isMemberCid(cid: string): Promise<boolean> {
  return (await memberStatus(cid)).member;
}

// Link this browser (cid) to an existing active membership by email — so a member
// who subscribed on another device is recognised here after entering their email.
export async function linkEmailToCid(cid: string, email: string): Promise<boolean> {
  const e = (email || '').trim().toLowerCase();
  if (!isValidCid(cid) || !e || !e.includes('@')) return false;
  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from('concierge_members')
      // Escape LIKE wildcards: without this, email='%' matches ANY active member and
      // this call would re-point that member's account to the caller's browser (cid) —
      // an account takeover. ilike stays (case-insensitive exact match on the address).
      .select('id, cid').ilike('email', e.replace(/([\\%_])/g, '\\$1')).eq('status', 'active').limit(1).maybeSingle();
    if (!data) return false;
    await sb.from('concierge_members').update({ cid, updated_at: new Date().toISOString() }).eq('id', data.id as string);
    return true;
  } catch { return false; }
}

// ── Recording a paid membership (called by the Stripe webhook) ───────────────────────
// Unlike the entitlement reads above, this write is deliberately NOT best-effort: the
// webhook must know whether the member was durably recorded so it can answer 5xx (Stripe
// then redelivers) instead of 200 (Stripe gives up — the member paid and is never
// recorded).
//
// Why not supabase `.upsert(row, { onConflict: 'stripe_subscription_id' })`, as before?
// The only unique index on that column (migration 0050, concierge_members_sub_idx) is
// PARTIAL — `where stripe_subscription_id is not null`. PostgREST emits a bare
// `ON CONFLICT (stripe_subscription_id)`; Postgres can only match a partial index when the
// statement repeats its predicate, so every call failed with error 42P10 and no member
// row was ever written (the result was never read, so it looked like success).
// Instead: update the row for this subscription if it exists, else insert. That needs no
// schema change, is idempotent (a redelivered event refreshes the same row), and if two
// deliveries race, the partial index still rejects the duplicate insert (23505), which we
// resolve by updating the row that won.
export interface MembershipCheckout {
  sessionId: string | null;       // Stripe Checkout Session id (cs_…)
  subscriptionId: string | null;  // Stripe Subscription id (sub_…) — the membership's identity
  customerId: string | null;      // Stripe Customer id (cus_…)
  cid: string | null;             // anonymous browser id the member checked out from
  email: string | null;
  tier: string;
}
export type RecordMembershipResult =
  | { ok: true; action: 'inserted' | 'updated' }
  | { ok: false; error: string };

export async function recordMembershipCheckout(
  sb: SupabaseClient, m: MembershipCheckout, nowIso: string = new Date().toISOString(),
): Promise<RecordMembershipResult> {
  // The stable identity of this membership across Stripe redeliveries: a retry of the
  // same event carries the same ids, so it always finds the row the first attempt wrote.
  const key: [string, string] | null = m.subscriptionId ? ['stripe_subscription_id', m.subscriptionId]
    : m.sessionId ? ['stripe_session_id', m.sessionId]
    : null;
  if (!key) return { ok: false, error: 'membership event carries no subscription or session id' };

  const row = {
    cid: m.cid, email: m.email, tier: m.tier, status: 'active',
    stripe_customer_id: m.customerId, stripe_subscription_id: m.subscriptionId, stripe_session_id: m.sessionId,
    updated_at: nowIso,
  };
  const refresh = () => sb.from('concierge_members').update(row).eq(key[0], key[1]).select('id');

  try {
    // 1) Already recorded (a Stripe retry or duplicate delivery) → refresh that row.
    let r = await refresh();
    if (r.error) return { ok: false, error: r.error.message };
    if (r.data && r.data.length > 0) return { ok: true, action: 'updated' };

    // 2) First delivery → insert.
    const ins = await sb.from('concierge_members').insert(row);
    if (!ins.error) return { ok: true, action: 'inserted' };

    // 3) A concurrent delivery inserted the same subscription between steps 1 and 2 and
    //    the unique index rejected ours (23505) → the row exists now, so refresh it.
    if (ins.error.code === '23505') {
      r = await refresh();
      if (r.error) return { ok: false, error: r.error.message };
      if (r.data && r.data.length > 0) return { ok: true, action: 'updated' };
    }
    return { ok: false, error: ins.error.message };
  } catch (e) {
    return { ok: false, error: (e as Error).message || 'unexpected error' };
  }
}

// The system-prompt note that upgrades the concierge for a member.
export const MEMBER_BLOCK =
  '\n\nThis guest is a Cyprus Lifestyle MEMBER. Give them your very best: be especially thorough, anticipatory and generous with detail and time; go a step beyond what was asked. For anything bespoke or high-stakes, warmly offer to hand them to their dedicated human concierge.';
