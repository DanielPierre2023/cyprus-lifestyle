// GET/POST /api/cron/worker — drains the background job queue (roadmap item 01).
// Authorised by CRON_SECRET (Bearer or x-cron-secret), exactly like the other cron
// routes. Meant to be called frequently: Supabase pg_cron + pg_net can hit it every
// few minutes for free (see supabase/pg_cron/schedule.sql), which is what lifts the
// single-daily-cron ceiling. Time-boxed to stay within the serverless limit; safe to
// run concurrently (the queue claim uses FOR UPDATE SKIP LOCKED).
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { runWorker } from '@/lib/jobs';
// Side-effect import: registers real job handlers for later roadmap items. Safe when
// empty. Keeping registrations out of lib/jobs.ts avoids pulling heavy engines into
// the many modules that only need enqueue().
import '@/lib/jobs.handlers';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const summary = await runWorker({ deadlineMs: 50_000 });
  return NextResponse.json({ ok: true, ...summary });
}

export const GET = handle;
export const POST = handle;
