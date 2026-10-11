// lib/member/session.ts
// Member sessions: an opaque random token in an HttpOnly cookie; only its SHA-256 hash is stored (member_sessions).
// The cookie value alone is the credential, so it is long, random, HttpOnly, Secure and SameSite=Lax; it can be revoked
// server-side at any time (sign out, sign out everywhere, member deleted, membership data erased).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { generateRestoreToken, hashRestoreToken, isPlausibleRestoreToken } from '@/lib/concierge/restoreToken';
import { SESSION_TTL_DAYS } from '@/lib/member/entitlement';

export const SESSION_COOKIE = 'cl_member';
const TTL_MS = SESSION_TTL_DAYS * 86_400_000;
const TOUCH_AFTER_MS = 60 * 60 * 1000;                     // refresh "last seen" / sliding expiry at most hourly

export function cookieOptions(secure: boolean = process.env.NODE_ENV === 'production') {
  return { httpOnly: true, secure, sameSite: 'lax' as const, path: '/', maxAge: Math.floor(TTL_MS / 1000) };
}

export interface SessionMember {
  id: string; email: string | null; tier: string; status: string; cid: string | null;
  current_period_end: string | null; cancel_at_period_end: boolean | null; stripe_customer_id: string | null;
  stripe_subscription_id: string | null; created_at: string; updated_at: string | null; lapsed_at: string | null; last_login_at: string | null; locale: string | null;
}
export const MEMBER_COLS = 'id, email, tier, status, cid, current_period_end, cancel_at_period_end, stripe_customer_id, stripe_subscription_id, created_at, updated_at, lapsed_at, last_login_at, locale';

export async function createSession(sb: SupabaseClient, memberId: string, userAgent: string | null, now: Date = new Date()): Promise<string | null> {
  const token = generateRestoreToken();
  const { error } = await sb.from('member_sessions').insert({
    member_id: memberId, token_hash: hashRestoreToken(token), expires_at: new Date(now.getTime() + TTL_MS).toISOString(),
    user_agent: userAgent ? userAgent.slice(0, 160) : null,
  });
  if (error) return null;
  await sb.from('concierge_members').update({ last_login_at: now.toISOString() }).eq('id', memberId);
  return token;
}

/** Look a cookie value up. Never throws: any failure means "not signed in". */
export async function resolveSession(sb: SupabaseClient, token: string | null | undefined, now: Date = new Date()): Promise<{ sessionId: string; member: SessionMember } | null> {
  if (!isPlausibleRestoreToken(token)) return null;
  try {
    const { data: s } = await sb.from('member_sessions').select('id, member_id, expires_at, last_seen_at')
      .eq('token_hash', hashRestoreToken(token)).maybeSingle();
    if (!s || Date.parse(String(s.expires_at)) <= now.getTime()) return null;
    const { data: m } = await sb.from('concierge_members').select(MEMBER_COLS).eq('id', s.member_id).maybeSingle();
    if (!m) return null;
    const seen = Date.parse(String(s.last_seen_at));
    if (!Number.isFinite(seen) || now.getTime() - seen > TOUCH_AFTER_MS) {
      await sb.from('member_sessions').update({ last_seen_at: now.toISOString(), expires_at: new Date(now.getTime() + TTL_MS).toISOString() }).eq('id', s.id);
    }
    return { sessionId: String(s.id), member: m as unknown as SessionMember };
  } catch { return null; }
}

export async function endSession(sb: SupabaseClient, token: string | null | undefined): Promise<void> {
  if (!isPlausibleRestoreToken(token)) return;
  try { await sb.from('member_sessions').delete().eq('token_hash', hashRestoreToken(token)); } catch { /* best effort */ }
}
export async function endAllSessions(sb: SupabaseClient, memberId: string): Promise<void> {
  try { await sb.from('member_sessions').delete().eq('member_id', memberId); } catch { /* best effort */ }
}

/** Same-origin check for state-changing requests (defence in depth on top of SameSite=Lax + JSON bodies). */
export function sameOrigin(req: Request, siteUrl: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;                                // non-browser callers / same-origin GET-like fetches without Origin
  try {
    const o = new URL(origin).host;
    const own = new URL(req.url).host;
    if (o === own) return true;
    return !!siteUrl && new URL(siteUrl).host === o;
  } catch { return false; }
}
