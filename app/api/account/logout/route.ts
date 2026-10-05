// POST /api/account/logout { all?: boolean } — ends this device's session, or every session of the member.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SESSION_COOKIE, endAllSessions, endSession, resolveSession, sameOrigin } from '@/lib/member/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));
  if (body?.all === true) {
    const s = await resolveSession(sb, token);
    if (s) await endAllSessions(sb, s.member.id);
  } else {
    await endSession(sb, token);
  }
  jar.delete(SESSION_COOKIE);
  return NextResponse.json({ ok: true });
}
