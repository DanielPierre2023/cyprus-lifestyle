// Admin → System health.
//   GET   run every check now and return the report
//   POST  run the checks AND (re)send the alert e-mail if the situation changed
import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditAdminRequest } from '@/lib/auditRequest';
import { runChecks, watchdogIfDue } from '@/lib/ops/watchdog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ ok: true, report: await runChecks(supabaseAdmin()) });
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  auditAdminRequest(req, 'health.check');
  const w = await watchdogIfDue(supabaseAdmin(), { force: true });
  return NextResponse.json({ ok: true, watchdog: w });
}
