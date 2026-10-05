// POST /api/membership/restore { token, cid }
// Confirms an emailed sign-in / restore link. POST-only on purpose: mail scanners and link
// previewers GET links, and must never be able to consume a single-use token.
//   • if the member is entitled, the membership is bound to `cid` — the browser that opened the link and is confirming;
//   • in every successful case a member SESSION is opened (HttpOnly cookie) so /account recognises them.
// A member whose membership has ended can still sign in (invoices, rejoin); the response says member:false then.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { confirmLogin } from '@/lib/concierge/membership';
import { SESSION_COOKIE, cookieOptions, createSession, sameOrigin } from '@/lib/member/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 403 });
  if (!(await rateLimit(req, 'membership-restore-confirm', 10, 600))) {
    return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const r = await confirmLogin(sb, body?.token, body?.cid);
  if (r.outcome === 'error') console.error('[membership/restore] confirm failed (are migrations 20261004130100 and 20261005160000 applied?)');
  if (r.outcome === 'signed_in') {
    const session = await createSession(sb, r.memberId, req.headers.get('user-agent'));
    if (!session) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
    (await cookies()).set(SESSION_COOKIE, session, cookieOptions());
    return NextResponse.json({ ok: true, member: r.entitled, signedIn: true });
  }
  // Generic and non-leaking: callers only learn "expired/used" vs "invalid" vs "try later".
  if (r.outcome === 'error') return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  return NextResponse.json({ ok: false, error: r.outcome === 'expired' ? 'expired' : 'invalid' }, { status: 400 });
}
