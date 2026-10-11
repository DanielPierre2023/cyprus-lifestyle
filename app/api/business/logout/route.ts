// POST /api/business/logout { all?: boolean } — ends this device's Business Hub session, or all of the account's sessions.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SESSION_COOKIE, endAllBusinessSessions, endBusinessSession, resolveBusinessSession } from '@/lib/business/auth';
import { sameOrigin } from '@/lib/member/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));
  if (body?.all === true) {
    const s = await resolveBusinessSession(sb, token);
    if (s) await endAllBusinessSessions(sb, s.account.id);
  } else {
    await endBusinessSession(sb, token);
  }
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
