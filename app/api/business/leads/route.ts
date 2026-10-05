// POST /api/business/leads { id, status } — a signed-in business marks an enquiry about one of ITS listings as new/seen/replied/closed.
// (Replying happens in the business's own mailbox: the enquirer's address is shown, nothing is sent from here.)
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SESSION_COOKIE, resolveBusinessSession } from '@/lib/business/auth';
import { managedListings, setLeadStatus } from '@/lib/business/data';
import { sameOrigin } from '@/lib/member/session';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const s = await resolveBusinessSession(sb, (await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false, error: 'signin' }, { status: 401 });
  if (!(await rateLimit(req, 'business-leads', 60, 60))) return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const slugs = (await managedListings(sb, s.account)).map((l) => l.slug);
  const ok = await setLeadStatus(sb, slugs, body.id, body.status);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
