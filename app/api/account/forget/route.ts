// POST /api/account/forget — "forget me": erases what the concierge has learned about the signed-in member
// (the durable profile and the memory of the browser bound to the membership). The membership itself is untouched.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SESSION_COOKIE, resolveSession, sameOrigin } from '@/lib/member/session';
import { clearMemory, isValidCid } from '@/lib/concierge/memory';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  if (!(await rateLimit(req, 'account-forget', 5, 600))) return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  const sb = supabaseAdmin();
  const s = await resolveSession(sb, (await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false, error: 'signed_out' }, { status: 401 });
  await sb.from('concierge_members').update({ profile: {}, profile_updated_at: new Date().toISOString() }).eq('id', s.member.id);
  if (s.member.cid && isValidCid(s.member.cid)) await clearMemory(s.member.cid);
  return NextResponse.json({ ok: true });
}
