// GET /api/cron/booking-sla — the booking sweep: one e-mail alert to the desk per booking whose first-reply target has passed
// without a reply, and one reminder to each partner who has not answered after 24 h. Idempotent (alerts/reminders are stamped).
// Authorised like every cron route (CRON_SECRET). Schedule it every 15–30 minutes (see docs/BOOKING-ENGINE.md).
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { bookingDeps } from '@/lib/booking/runtime';
import { sweep } from '@/lib/booking/engine';
import { logServerError } from '@/lib/monitor.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await sweep(bookingDeps(supabaseAdmin()))) });
  } catch (e) {
    await logServerError('cron-booking-sla', e).catch(() => undefined);
    return NextResponse.json({ ok: false, error: 'sweep failed' }, { status: 500 });
  }
}
