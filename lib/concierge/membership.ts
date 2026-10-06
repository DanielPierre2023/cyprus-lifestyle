// lib/concierge/membership.ts
// Concierge members' tier — server-side entitlement checks. A member is a row in
// concierge_members with status='active'. Recognised by the anonymous cid used at
// checkout, or restored on another device through an email-verified link (see confirmRestore). All best-effort: any failure means
// "not a member", so the concierge simply serves the free tier.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidCid } from '@/lib/concierge/memory';
import { isLocale } from '@/lib/locales';
import { MEMBER_PROMPT } from '@/lib/member/truth';
import { entitled, canSignIn, type MemberLike } from '@/lib/member/entitlement';
import {
  RESTORE_MAX_PER_HOUR, escapeLike, generateRestoreToken, hashRestoreToken, isPlausibleEmail,
  isPlausibleRestoreToken, normalizeEmail, restoreExpiry, type RestoreOutcome,
} from '@/lib/concierge/restoreToken';

export interface MemberStatus { member: boolean; tier: string | null; }

export async function memberStatus(cid: string): Promise<MemberStatus> {
  if (!isValidCid(cid)) return { member: false, tier: null };
  try {
    // 'failed' (payment problem) keeps the benefits for a grace period; see lib/member/entitlement.ts.
    const { data } = await supabaseAdmin()
      .from('concierge_members')
      .select('tier, status, current_period_end, updated_at')
      .eq('cid', cid).in('status', ['active', 'failed'])
      .limit(1).maybeSingle();
    return data && entitled(data as MemberLike) ? { member: true, tier: String(data.tier || 'concierge') } : { member: false, tier: null };
  } catch { return { member: false, tier: null }; }
}

export async function isMemberCid(cid: string): Promise<boolean> {
  return (await memberStatus(cid)).member;
}

// ── Email-verified restore (replaces the old unverified email→cid link) ──────────────
// The previous linkEmailToCid re-pointed a paid membership to whichever browser typed the
// member's email — anyone who knew an address could take the account over. Restoring is
// now a two-step proof of mailbox control:
//   1) issueRestoreToken: a single-use 32-byte token is emailed (only its hash is stored);
//   2) confirmRestore: the member opens the link, the page POSTs {token, cid}, and the cid
//      of THAT confirming browser — never one supplied when the email was requested — is
//      bound to the membership. Consumption is one atomic UPDATE … WHERE used_at IS NULL
//      AND expires_at > now() RETURNING, so a token can be used once and only once.
// Both take the client as a parameter so the security-critical flow is unit-testable.
export async function issueRestoreToken(
  sb: SupabaseClient, rawEmail: string, now: Date = new Date(),
): Promise<{ ok: true; token: string } | { ok: false; reason: 'no_member' | 'throttled' | 'error' }> {
  const email = normalizeEmail(rawEmail);
  if (!isPlausibleEmail(email)) return { ok: false, reason: 'no_member' };
  try {
    const { data: m, error: me } = await sb.from('concierge_members')
      .select('id').ilike('email', escapeLike(email)).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (me) return { ok: false, reason: 'error' };
    if (!m) return { ok: false, reason: 'no_member' };
    const memberId = String(m.id);

    // Per-member cap (the IP limiter cannot see "per email"): silently stop mailing.
    const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { data: recent, error: re } = await sb.from('membership_restore_tokens')
      .select('id').eq('member_id', memberId).gte('created_at', since).limit(RESTORE_MAX_PER_HOUR);
    if (re) return { ok: false, reason: 'error' };
    if ((recent || []).length >= RESTORE_MAX_PER_HOUR) return { ok: false, reason: 'throttled' };

    // Only the newest link works: invalidate this member's older unused tokens.
    const inv = await sb.from('membership_restore_tokens')
      .update({ used_at: now.toISOString() }).eq('member_id', memberId).is('used_at', null);
    if (inv.error) return { ok: false, reason: 'error' };

    const token = generateRestoreToken();
    const ins = await sb.from('membership_restore_tokens').insert({
      member_id: memberId, token_hash: hashRestoreToken(token), expires_at: restoreExpiry(now).toISOString(),
    });
    if (ins.error) return { ok: false, reason: 'error' };
    return { ok: true, token };
  } catch { return { ok: false, reason: 'error' }; }
}

export async function confirmRestore(
  sb: SupabaseClient, token: unknown, confirmingCid: unknown, now: Date = new Date(),
): Promise<RestoreOutcome> {
  const cid = typeof confirmingCid === 'string' ? confirmingCid : '';
  if (!isPlausibleRestoreToken(token) || !isValidCid(cid)) return 'invalid';
  const hash = hashRestoreToken(token);
  try {
    // Atomic single-use consume.
    const { data: used, error } = await sb.from('membership_restore_tokens')
      .update({ used_at: now.toISOString() })
      .eq('token_hash', hash).is('used_at', null).gt('expires_at', now.toISOString())
      .select('member_id');
    if (error) return 'error';
    if (!used || used.length === 0) {
      const { data: known, error: ke } = await sb.from('membership_restore_tokens')
        .select('id').eq('token_hash', hash).limit(1).maybeSingle();
      if (ke) return 'error';
      return known ? 'expired' : 'invalid';
    }
    const memberId = String(used[0].member_id);
    const { data: member, error: me } = await sb.from('concierge_members')
      .select('id').eq('id', memberId).eq('status', 'active').limit(1).maybeSingle();
    if (me) return 'error';
    if (!member) return 'invalid';

    // Bind the CONFIRMING browser. A browser belongs to one membership: release this cid
    // from any other row first, then point the member at it.
    const rel = await sb.from('concierge_members').update({ cid: null, updated_at: now.toISOString() })
      .eq('cid', cid).neq('id', memberId);
    if (rel.error) return 'error';
    const bind = await sb.from('concierge_members').update({ cid, updated_at: now.toISOString() }).eq('id', memberId).select('id');
    if (bind.error || !bind.data || bind.data.length === 0) return 'error';
    return 'restored';
  } catch { return 'error'; }
}

// ── Account sign-in (the same proof of mailbox control, for ANY member row) ───────────────
// issueRestoreToken/confirmRestore above only serve ACTIVE members (restoring the benefits on a device).
// Signing in to the account page must also work for a member whose membership has ENDED — they need their invoices
// and the way back in — so these two accept every member row with a sign-in status. The benefits are unaffected:
// a browser is only bound to the membership (cid) when it is entitled, and entitlement is checked on every use.
export async function issueLoginToken(
  sb: SupabaseClient, rawEmail: string, now: Date = new Date(),
): Promise<{ ok: true; token: string } | { ok: false; reason: 'no_member' | 'throttled' | 'error' }> {
  const email = normalizeEmail(rawEmail);
  if (!isPlausibleEmail(email)) return { ok: false, reason: 'no_member' };
  try {
    const { data: m, error: me } = await sb.from('concierge_members')
      .select('id').ilike('email', escapeLike(email)).in('status', ['active', 'failed', 'canceled'])
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (me) return { ok: false, reason: 'error' };
    if (!m) return { ok: false, reason: 'no_member' };
    const memberId = String(m.id);

    const since = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { data: recent, error: re } = await sb.from('membership_restore_tokens')
      .select('id').eq('member_id', memberId).gte('created_at', since).limit(RESTORE_MAX_PER_HOUR);
    if (re) return { ok: false, reason: 'error' };
    if ((recent || []).length >= RESTORE_MAX_PER_HOUR) return { ok: false, reason: 'throttled' };

    const inv = await sb.from('membership_restore_tokens')
      .update({ used_at: now.toISOString() }).eq('member_id', memberId).is('used_at', null);
    if (inv.error) return { ok: false, reason: 'error' };

    const token = generateRestoreToken();
    const ins = await sb.from('membership_restore_tokens').insert({
      member_id: memberId, token_hash: hashRestoreToken(token), expires_at: restoreExpiry(now).toISOString(),
    });
    if (ins.error) return { ok: false, reason: 'error' };
    return { ok: true, token };
  } catch { return { ok: false, reason: 'error' }; }
}

export type LoginOutcome =
  | { outcome: 'signed_in'; memberId: string; entitled: boolean }
  | { outcome: 'invalid' | 'expired' | 'error' };

export async function confirmLogin(
  sb: SupabaseClient, token: unknown, confirmingCid: unknown, now: Date = new Date(),
): Promise<LoginOutcome> {
  if (!isPlausibleRestoreToken(token)) return { outcome: 'invalid' };
  const cid = typeof confirmingCid === 'string' && isValidCid(confirmingCid) ? confirmingCid : '';
  const hash = hashRestoreToken(token);
  try {
    const { data: used, error } = await sb.from('membership_restore_tokens')
      .update({ used_at: now.toISOString() })
      .eq('token_hash', hash).is('used_at', null).gt('expires_at', now.toISOString())
      .select('member_id');
    if (error) return { outcome: 'error' };
    if (!used || used.length === 0) {
      const { data: known, error: ke } = await sb.from('membership_restore_tokens')
        .select('id').eq('token_hash', hash).limit(1).maybeSingle();
      if (ke) return { outcome: 'error' };
      return { outcome: known ? 'expired' : 'invalid' };
    }
    const memberId = String(used[0].member_id);
    const { data: member, error: me } = await sb.from('concierge_members')
      .select('id, status, current_period_end, updated_at').eq('id', memberId).limit(1).maybeSingle();
    if (me) return { outcome: 'error' };
    if (!member || !canSignIn(String(member.status))) return { outcome: 'invalid' };

    const ok = entitled(member as MemberLike, now);
    if (ok && cid) {
      // A browser belongs to one membership: release this cid from any other row, then point the member at it.
      const rel = await sb.from('concierge_members').update({ cid: null, updated_at: now.toISOString() }).eq('cid', cid).neq('id', memberId);
      if (rel.error) return { outcome: 'error' };
      const bind = await sb.from('concierge_members').update({ cid, updated_at: now.toISOString() }).eq('id', memberId).select('id');
      if (bind.error || !bind.data || bind.data.length === 0) return { outcome: 'error' };
    }
    return { outcome: 'signed_in', memberId, entitled: ok };
  } catch { return { outcome: 'error' }; }
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
  locale?: string | null;         // the edition they joined from (lifecycle e-mails go out in it)
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
    ...(m.locale && isLocale(m.locale) ? { locale: m.locale } : {}),
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

// The system-prompt note that upgrades the concierge for a member. It must describe only what membership really changes
// (wording and the reasons live in lib/member/truth.ts): a more thorough, anticipatory answer, preferences remembered across
// devices, the priority lane for requests sent while signed in (a first-reply TARGET, not a guarantee). No named human
// concierge, no guaranteed times, no discounts.
export const MEMBER_BLOCK = MEMBER_PROMPT;
