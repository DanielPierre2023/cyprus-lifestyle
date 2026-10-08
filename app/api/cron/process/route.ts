// Scheduler (pg_cron every 15 minutes, or Vercel) → the AI desk. The desk itself runs on Supabase, in the edge function
// `process-scraped-article` (fact core, seven independent native editions, per-edition fact check, publish bar); this route only wakes it.
// The older desk that lived in the app (an English draft translated into six languages) is retired: it had no fact check and, when a
// translation failed, filled the edition with English.
//
// The function reads `automation_settings` itself: it does nothing unless "AI processor" is ON, and publishes by itself only if
// "Auto-publish" is ON as well (and then only articles whose seven editions all pass; the others wait as drafts with the reasons).
// It answers at once ("dispatched") and finishes the work in the background on Supabase.
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { aiBudgetDeny } from '@/lib/spendGuard';

export const runtime = 'nodejs';
export const maxDuration = 60;

// The Supabase scheduler (ops.cron_post) calls this route with POST; Vercel and manual checks use GET. Both do the same work.
async function handle(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const budgetDeny = await aiBudgetDeny();
  if (budgetDeny) return NextResponse.json({ ok: true, skipped: 'ai_budget', reason: budgetDeny });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Supabase env not configured' }, { status: 500 });
  try {
    const res = await fetch(`${url}/functions/v1/process-scraped-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ source: 'cron', background: true }),
      signal: AbortSignal.timeout(25_000),
    });
    const data = await res.json().catch(() => ({} as Record<string, unknown>));
    return NextResponse.json({ ...data, ok: res.ok && data?.ok !== false }, { status: res.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}

export const GET = handle;
export const POST = handle;
