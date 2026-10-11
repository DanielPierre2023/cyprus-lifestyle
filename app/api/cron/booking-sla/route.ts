// GET/POST /api/cron/booking-sla — the booking sweep: one e-mail alert to the desk per booking whose first-reply target has passed
// without a reply, and one reminder to each partner who has not answered after 24 h.
//
// Safe to run every 15 minutes (pg_cron: supabase/pg_cron/install-jobs.sql, job 'cl-booking-sla', which calls this with POST and the
// x-cron-secret header; Vercel Cron / manual runs may use GET with `Authorization: Bearer $CRON_SECRET`):
//   • authorised by CRON_SECRET only (401 otherwise; refuses everything when CRON_SECRET is not set);
//   • idempotent and overlap-safe: every alert / reminder is claimed atomically before it is sent (lib/booking/engine.ts sweep);
//   • time-boxed to 45 s of the 60 s function limit — anything left is handled by the next run;
//   • never throws to the scheduler: a failure is logged and answered with a 500 JSON body (pg_cron records the call).
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { bookingDeps } from '@/lib/booking/runtime';
import { sweep } from '@/lib/booking/engine';
import { logServerError } from '@/lib/monitor.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ ok: true, ...(await sweep(bookingDeps(supabaseAdmin()), { deadlineMs: 45_000 })) });
  } catch (e) {
    await logServerError('cron-booking-sla', e).catch(() => undefined);
    return NextResponse.json({ ok: false, error: 'sweep failed' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
