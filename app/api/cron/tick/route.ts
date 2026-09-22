// Vercel Cron — the daily job. As of item 13 it no longer runs the heavy subsystems
// inline; it ENQUEUES the day's background work (scrape, developer projects, regulation
// watch, events, outreach — each guarded by its switch) and coordinate backfill, then
// drains a time-boxed batch. With Supabase pg_cron enabled, /api/cron/worker drains the
// rest continuously between ticks, so throughput is no longer capped by this 60s window.
// AI-desk processing remains its own route (/api/cron/process).
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logServerError } from '@/lib/monitor.server';
import { runWorker } from '@/lib/jobs';
import { enqueueGeocodeBacklog, enqueueDailySubsystems } from '@/lib/jobs.handlers';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();
  const out: Record<string, unknown> = { ok: true };

  // Enqueue the day's background work (guarded per subsystem) + top up coordinate backfill.
  try {
    out.subsystemsEnqueued = await enqueueDailySubsystems(sb);
    out.geocodeEnqueued = await enqueueGeocodeBacklog(sb, 60);
  } catch (e) { await logServerError('cron-tick:enqueue', e); }

  // Drain a time-boxed batch now, so work progresses even without pg_cron. pg_cron
  // (when enabled) drains continuously between ticks.
  try {
    out.jobs = await runWorker({ deadlineMs: 45_000 });
  } catch (e) { await logServerError('cron-tick:drain', e); }

  // Self-maintain the error log (keep 90 days). Best-effort.
  try { await sb.rpc('prune_error_log'); } catch { /* function not migrated yet — ignore */ }

  return NextResponse.json(out);
}
