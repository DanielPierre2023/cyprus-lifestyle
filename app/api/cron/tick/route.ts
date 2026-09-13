// Vercel Cron — the SINGLE daily job used while on the Hobby plan.
// Hobby allows one run per day and caps functions at 60s, so this does a light,
// best-effort pass: scrape active feeds (time-boxed), then process a small batch
// if the AI processor is enabled. Everything is guarded by automation_settings
// and is idempotent (dedup + the rewrite-jobs lock + the stuck-job sweeper), so a
// partial run is safe and the next day continues.
//
// On Vercel Pro, replace this with the frequent per-task crons (see README →
// "Going to production") and raise the heavy routes back to maxDuration 300.
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { scrapeAllActive } from '@/lib/scraper';
import { processBatch } from '@/lib/desk/queue';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();
  const { data } = await sb.from('automation_settings').select('scraper_enabled, processor_enabled, auto_publish').eq('id', 1).maybeSingle();
  const s = data as { scraper_enabled: boolean; processor_enabled: boolean; auto_publish: boolean } | null;

  const start = Date.now();
  const out: Record<string, unknown> = { ok: true };

  if (s?.scraper_enabled) {
    out.scrape = await scrapeAllActive(sb, { deadlineMs: 30_000 }); // ~30s ceiling
  }
  if (s?.processor_enabled) {
    const remaining = 52_000 - (Date.now() - start);
    if (remaining > 9_000) {
      out.process = await processBatch(sb, { autoPublish: !!s.auto_publish, max: 1, deadlineMs: remaining });
    } else {
      out.process = { skipped: 'no_time_budget' };
    }
  }
  if (!s?.scraper_enabled && !s?.processor_enabled) out.skipped = 'automation_disabled';
  return NextResponse.json(out);
}
