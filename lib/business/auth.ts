// lib/business/auth.ts — business sign-in (e-mail link) and sessions. Same approach as lib/member/* (no Supabase Auth,
// no passwords): a single-use emailed link proves control of a mailbox, then the server opens a cookie session of which only
// the SHA-256 hash is stored. All I/O goes through the injected service-role client, so it is unit-testable with a fake.
//
// WHO MAY SIGN IN: an address that is the verified claim contact of at least one listing (directory_listings.provenance =
// 'owner-verified' and claim_contact = that address), or that already has a business account. Ownership is re-checked from
// the listing on EVERY request (see managedListings in data.ts), so a change to a listing's claim contact takes effect at once,
// without waiting for sessions to expire.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateRestoreToken, hashRestoreToken, isPlausibleRestoreToken, escapeLike } from '@/lib/concierge/restoreToken';
import { LOGIN_MAX_PER_HOUR, LOGIN_TTL_MS, SESSION_COOKIE, SESSION_TTL_DAYS, normEmail } from '@/lib/business/rules';

export { SESSION_COOKIE };
const TTL_MS = SESSION_TTL_DAYS * 86_400_000;
const TOUCH_AFTER_MS = 60 * 60 * 1000;

export function cookieOptions(secure: boolean = process.env.NODE_ENV === 'production') {
  return { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge: Math.floor(TTL_MS / 1000) };
}

export interface BusinessAccount { id: string; email: string; name: string | null; locale: string | null; status: string; created_at: string; last_login_at: string | null }
const ACCOUNT_COLS = 'id, email, name, locale, status, created_at, last_login_at';

/** Slugs of listings whose verified claim contact is this address. */
export async function verifiedSlugsFor(sb: SupabaseClient, email: string): Promise<string[]> {
  const { data, error } = await sb.from('directory_listings').select('slug')
    .eq('provenance', 'owner-verified').ilike('claim_contact', escapeLike(email));
  if (error) throw new Error(error.message);
  return ((data || []) as { slug: string }[]).map((r) => String(r.slug));
}

export type LoginRequest =
  | { ok: true; token: string; accountId: string }
  | { ok: false; reason: 'not_eligible' | 'throttled' | 'disabled' | 'error' };

/** Issue a sign-in link for an eligible address. The caller must answer every request identically (no enumeration). */
export async function requestBusinessLogin(sb: SupabaseClient, rawEmail: string, locale: string | null, now: Date = new Date()): Promise<LoginRequest> {
  const email = normEmail(rawEmail);
  if (!email) return { ok: false, reason: 'not_eligible' };
  try {
    const { data: existing, error: ae } = await sb.from('business_accounts').select(ACCOUNT_COLS).eq('email', email).limit(1).maybeSingle();
    if (ae) return { ok: false, reason: 'error' };
    let account = existing as BusinessAccount | null;
    if (account && account.status !== 'active') return { ok: false, reason: 'disabled' };
    if ((await verifiedSlugsFor(sb, email)).length === 0) return { ok: false, reason: 'not_eligible' };   // also for an existing account whose listings are gone
    if (!account) {
      const ins = await sb.from('business_accounts').insert({ email, locale, status: 'active' });
      if (ins.error && ins.error.code !== '23505') return { ok: false, reason: 'error' };
      const { data: again, error: re } = await sb.from('business_accounts').select(ACCOUNT_COLS).eq('email', email).limit(1).maybeSingle();
      if (re || !again) return { ok: false, reason: 'error' };
      account = again as BusinessAccount;
    }
    const since = new Date(now.getTime() - 3600_000).toISOString();
    const { data: recent, error: te } = await sb.from('business_login_tokens').select('id').eq('account_id', account.id).gte('created_at', since).limit(LOGIN_MAX_PER_HOUR);
    if (te) return { ok: false, reason: 'error' };
    if ((recent || []).length >= LOGIN_MAX_PER_HOUR) return { ok: false, reason: 'throttled' };
    const inv = await sb.from('business_login_tokens').update({ used_at: now.toISOString() }).eq('account_id', account.id).is('used_at', null);
    if (inv.error) return { ok: false, reason: 'error' };
    const token = generateRestoreToken();
    const ins = await sb.from('business_login_tokens').insert({
      account_id: account.id, token_hash: hashRestoreToken(token), expires_at: new Date(now.getTime() + LOGIN_TTL_MS).toISOString(), created_at: now.toISOString(),
    });
    if (ins.error) return { ok: false, reason: 'error' };
    return { ok: true, token, accountId: account.id };
  } catch { return { ok: false, reason: 'error' }; }
}

export type LoginConfirm = { outcome: 'signed_in'; accountId: string } | { outcome: 'invalid' | 'expired' | 'error' };

/** Consume a link (single use, atomically) and report whom it signs in. The caller then opens the session. */
export async function confirmBusinessLogin(sb: SupabaseClient, token: unknown, now: Date = new Date()): Promise<LoginConfirm> {
  if (!isPlausibleRestoreToken(token)) return { outcome: 'invalid' };
  const hash = hashRestoreToken(token);
  try {
    const { data: used, error } = await sb.from('business_login_tokens').update({ used_at: now.toISOString() })
      .eq('token_hash', hash).is('used_at', null).gt('expires_at', now.toISOString()).select('account_id');
    if (error) return { outcome: 'error' };
    if (!used || used.length === 0) {
      const { data: known, error: ke } = await sb.from('business_login_tokens').select('id').eq('token_hash', hash).limit(1).maybeSingle();
      if (ke) return { outcome: 'error' };
      return { outcome: known ? 'expired' : 'invalid' };
    }
    const accountId = String(used[0].account_id);
    const { data: acc, error: ge } = await sb.from('business_accounts').select('id, email, status').eq('id', accountId).limit(1).maybeSingle();
    if (ge) return { outcome: 'error' };
    if (!acc || acc.status !== 'active') return { outcome: 'invalid' };
    // Record the listings this address verifiably owns (informational; access is re-checked on every request).
    const slugs = await verifiedSlugsFor(sb, String(acc.email));
    if (slugs.length === 0) return { outcome: 'invalid' };
    const { data: have, error: he } = await sb.from('business_listings').select('listing_slug').eq('account_id', accountId);
    if (he) return { outcome: 'error' };
    const known = new Set(((have || []) as { listing_slug: string }[]).map((r) => r.listing_slug));
    for (const slug of slugs.filter((s) => !known.has(s))) {
      const r = await sb.from('business_listings').insert({ account_id: accountId, listing_slug: slug, role: 'owner' });
      if (r.error && r.error.code !== '23505') return { outcome: 'error' };
    }
    return { outcome: 'signed_in', accountId };
  } catch { return { outcome: 'error' }; }
}

export async function createBusinessSession(sb: SupabaseClient, accountId: string, userAgent: string | null, locale: string | null, now: Date = new Date()): Promise<string | null> {
  const token = generateRestoreToken();
  const { error } = await sb.from('business_sessions').insert({
    account_id: accountId, token_hash: hashRestoreToken(token), expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
    user_agent: userAgent ? userAgent.slice(0, 160) : null,
  });
  if (error) return null;
  await sb.from('business_accounts').update({ last_login_at: now.toISOString(), ...(locale ? { locale } : {}) }).eq('id', accountId);
  return token;
}

/** Look a cookie value up. Never throws: any failure means "not signed in". */
export async function resolveBusinessSession(sb: SupabaseClient, token: string | null | undefined, now: Date = new Date()): Promise<{ sessionId: string; account: BusinessAccount } | null> {
  if (!isPlausibleRestoreToken(token)) return null;
  try {
    const { data: s } = await sb.from('business_sessions').select('id, account_id, expires_at, last_seen_at').eq('token_hash', hashRestoreToken(token)).maybeSingle();
    if (!s || Date.parse(String(s.expires_at)) <= now.getTime()) return null;
    const { data: a } = await sb.from('business_accounts').select(ACCOUNT_COLS).eq('id', s.account_id).maybeSingle();
    if (!a || (a as BusinessAccount).status !== 'active') return null;
    const seen = Date.parse(String(s.last_seen_at));
    if (!Number.isFinite(seen) || now.getTime() - seen > TOUCH_AFTER_MS) {
      await sb.from('business_sessions').update({ last_seen_at: now.toISOString(), expires_at: new Date(now.getTime() + TTL_MS).toISOString() }).eq('id', s.id);
    }
    return { sessionId: String(s.id), account: a as BusinessAccount };
  } catch { return null; }
}

export async function endBusinessSession(sb: SupabaseClient, token: string | null | undefined): Promise<void> {
  if (!isPlausibleRestoreToken(token)) return;
  try { await sb.from('business_sessions').delete().eq('token_hash', hashRestoreToken(token)); } catch { /* best effort */ }
}
export async function endAllBusinessSessions(sb: SupabaseClient, accountId: string): Promise<void> {
  try { await sb.from('business_sessions').delete().eq('account_id', accountId); } catch { /* best effort */ }
}
