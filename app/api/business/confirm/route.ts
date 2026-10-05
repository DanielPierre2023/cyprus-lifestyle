// POST /api/business/confirm { token, locale? } — exchanges an emailed link for a Business Hub session (HttpOnly cookie).
// POST-only on purpose: mail scanners and link previewers GET links and must never be able to consume a single-use token.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isLocale } from '@/lib/locales';
import { SESSION_COOKIE, confirmBusinessLogin, cookieOptions, createBusinessSession } from '@/lib/business/auth';
import { sameOrigin } from '@/lib/member/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 403 });
  if (!(await rateLimit(req, 'business-confirm', 10, 600))) return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const r = await confirmBusinessLogin(sb, body?.token);
  if (r.outcome === 'signed_in') {
    const locale = isLocale(String(body?.locale || '')) ? String(body.locale) : null;
    const session = await createBusinessSession(sb, r.accountId, req.headers.get('user-agent'), locale);
    if (!session) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
    (await cookies()).set(SESSION_COOKIE, session, cookieOptions());
    return NextResponse.json({ ok: true });
  }
  if (r.outcome === 'error') return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  return NextResponse.json({ ok: false, error: r.outcome === 'expired' ? 'expired' : 'invalid' }, { status: 400 });
}
