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
import { dispatchEdgeProcessing } from '@/lib/desk/queue';
import { runOutreach } from '@/lib/outreach';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();
  const { data } = await sb.from('automation_settings').select('scraper_enabled, processor_enabled, auto_publish').eq('id', 1).maybeSingle();
  const s = data as { scraper_enabled: boolean; processor_enabled: boolean; auto_publish: boolean } | null;

  const out: Record<string, unknown> = { ok: true };

  if (s?.scraper_enabled) {
    out.scrape = await scrapeAllActive(sb, { deadlineMs: 30_000 }); // ~30s ceiling
  }
  if (s?.processor_enabled) {
    // Dispatch to the edge desk (background). It ACKs immediately and runs the
    // batch to completion on Supabase, so the 60s cron limit is a non-issue.
    out.process = await dispatchEdgeProcessing();
  }
  if (!s?.scraper_enabled && !s?.processor_enabled) out.skipped = 'automation_disabled';

  // Outreach cadence — best-effort, and only actually sends when sending is
  // switched on in crm_settings (otherwise runOutreach no-ops on commit).
  try {
    const { data: cs } = await sb.from('crm_settings').select('sending_enabled').eq('id', 1).maybeSingle();
    if ((cs as { sending_enabled?: boolean } | null)?.sending_enabled) {
      out.outreach = await runOutreach(sb, { commit: true });
    }
  } catch { /* crm_settings not present yet — ignore */ }

  return NextResponse.json(out);
}
