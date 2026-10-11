// GET/POST /api/cron/voice — the voice worker: repairs ONE published edition per call (the worst one that still has attempts left),
// so every call fits the 60 s function limit. Does nothing until it is switched on (Admin → /api/admin/voice?on=1) and never
// exceeds the daily cap (default 120 editions). pg_cron job 'cl-voice' (supabase/pg_cron/install-jobs.sql) calls it with POST and
// the x-cron-secret header; a manual run may use GET with `Authorization: Bearer $CRON_SECRET`.
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runVoiceOnce } from '@/lib/voice/runner';
import { logServerError } from '@/lib/monitor.server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  try {
    const r = await runVoiceOnce(supabaseAdmin());
    return NextResponse.json({ ok: true, ...r });
  } catch (e) {
    await logServerError('cron-voice', e).catch(() => undefined);
    return NextResponse.json({ ok: false, error: 'voice run failed' }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
