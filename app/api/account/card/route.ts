// POST /api/account/card  { action: 'name', name } | { action: 'rotate' }
//   name   — set (or clear, with an empty string) the first name / initials shown to venues that scan the card
//   rotate — replace the card: a new QR code is issued and the old one stops working at once
// Signed-in members only, and only while the membership is entitled (an ended membership has no card).
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SESSION_COOKIE, resolveSession, sameOrigin } from '@/lib/member/session';
import { entitled } from '@/lib/member/entitlement';
import { cardSecret } from '@/lib/member/card';
import { ensureCard, rotateCard, setCardName } from '@/lib/member/cardStore';
import { localeOf } from '@/lib/i18n/resolveLocale';
import { keyedErrorBody } from '@/lib/i18n/apiErrors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const loc = localeOf(req);
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, code: 'forbidden' }, { status: 403 });
  if (!(await rateLimit(req, 'account-card', 20, 600))) return NextResponse.json(keyedErrorBody('rate_limited', 'busy', loc), { status: 429 });
  const sb = supabaseAdmin();
  const s = await resolveSession(sb, (await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json(keyedErrorBody('signed_out', 'signed_out', loc), { status: 401 });
  if (!entitled(s.member)) return NextResponse.json(keyedErrorBody('forbidden', 'forbidden', loc), { status: 403 });
  const secret = cardSecret();
  if (!secret) return NextResponse.json(keyedErrorBody('unavailable', 'unavailable', loc), { status: 503 });

  const body = await req.json().catch(() => ({}));
  if (body?.action === 'name') {
    if (!(await ensureCard(sb, s.member.id, secret))) return NextResponse.json(keyedErrorBody('unavailable', 'unavailable', loc), { status: 503 });
    const ok = await setCardName(sb, s.member.id, body.name);
    return ok ? NextResponse.json({ ok: true }) : NextResponse.json(keyedErrorBody('invalid_input', 'invalid', loc), { status: 400 });
  }
  if (body?.action === 'rotate') {
    const card = await rotateCard(sb, s.member.id, secret);
    return card ? NextResponse.json({ ok: true }) : NextResponse.json(keyedErrorBody('unavailable', 'unavailable', loc), { status: 503 });
  }
  return NextResponse.json(keyedErrorBody('invalid_input', 'invalid', loc), { status: 400 });
}
