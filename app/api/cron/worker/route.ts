// GET/POST /api/cron/worker — drains the background job queue (roadmap item 01).
// Authorised by CRON_SECRET (Bearer or x-cron-secret), exactly like the other cron
// routes. Meant to be called frequently: Supabase pg_cron + pg_net can hit it every
// few minutes for free (see supabase/pg_cron/install-jobs.sql), which is what lifts the
// single-daily-cron ceiling. Time-boxed to stay within the serverless limit; safe to
// run concurrently (the queue claim uses FOR UPDATE SKIP LOCKED).
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { runWorker } from '@/lib/jobs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendApproved } from '@/lib/newsletterDigest';
import { processOutbox } from '@/lib/socialAuto';
import { watchdogIfDue } from '@/lib/ops/watchdog';
// Side-effect import: registers real job handlers for later roadmap items. Safe when
// empty. Keeping registrations out of lib/jobs.ts avoids pulling heavy engines into
// the many modules that only need enqueue().
import '@/lib/jobs.handlers';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  // Finish delivering any newsletter edition an administrator has APPROVED (a no-op, one cheap query, when none is).
  // Time-boxed so the job queue below still gets most of the window while a send is in progress.
  const newsletter = await sendApproved(supabaseAdmin(), { deadlineMs: 20_000 }).catch(() => null);
  // Facebook + Instagram posts waiting in the queue (filled by the database the moment an article is published).
  const social = await processOutbox(supabaseAdmin(), { deadlineMs: 20_000, maxItems: 3 }).catch(() => null);
  const busy = (newsletter && newsletter.campaigns > 0) || (social && (social.posted + social.failed + social.skipped) > 0);
  const summary = await runWorker({ deadlineMs: busy ? 26_000 : 50_000 });
  // Health watchdog: throttled to once per 30 minutes, e-mails the administrator only when something turns red or recovers.
  await watchdogIfDue(supabaseAdmin()).catch(() => null);
  return NextResponse.json({ ok: true, ...summary, ...(newsletter && newsletter.campaigns > 0 ? { newsletter } : {}), ...(social && busy ? { social } : {}) });
}

export const GET = handle;
export const POST = handle;
