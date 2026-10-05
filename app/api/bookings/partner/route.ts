// POST /api/bookings/partner  { token, action: 'accept'|'quote'|'decline'|'alternative', amount?, note? }
// A partner answers a guest request through the magic link e-mailed (or pasted) by the desk. No login: the token is the credential
// (an HMAC of the partner-request id; only its SHA-256 is stored). Opening the link changes nothing; only this POST does.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/ratelimit';
import { isPlausibleRestoreToken } from '@/lib/concierge/restoreToken';
import { bookingDeps } from '@/lib/booking/runtime';
import { recordPartnerResponse } from '@/lib/booking/engine';
import { logServerError } from '@/lib/monitor.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'booking-partner', 20, 60))) return NextResponse.json({ ok: false, error: 'rate' }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const token = String(body.token || '');
  if (!isPlausibleRestoreToken(token)) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });
  try {
    const res = await recordPartnerResponse(bookingDeps(supabaseAdmin()), token, body);
    if (!res.ok) return NextResponse.json({ ok: false, error: res.error }, { status: res.error === 'invalid' ? 404 : 400 });
    return NextResponse.json({ ok: true, status: res.status });
  } catch (e) {
    await logServerError('booking-partner', e).catch(() => undefined);
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 });
  }
}
