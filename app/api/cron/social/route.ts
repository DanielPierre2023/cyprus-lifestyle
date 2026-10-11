// Cron/manual → work the Facebook + Instagram queue (lib/socialAuto.ts). The queue is filled by a database trigger the moment an
// article is published, and is also worked every ~3 minutes by /api/cron/worker, so this route is only a manual/backup entry point.
// (It used to post the last 24 hours of articles in one go on a schedule that was never set up.)
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { processOutbox } from '@/lib/socialAuto';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ ok: true, ...(await processOutbox(supabaseAdmin(), { deadlineMs: 45_000 })) });
}
