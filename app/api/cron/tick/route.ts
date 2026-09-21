// Vercel Cron — the SINGLE daily job used while on the Hobby plan.
// Scrape active feeds (time-boxed), then run the outreach cadence. Both are
// guarded by settings and idempotent, so a partial run is safe.
//
// NOTE: AI-desk processing is handled by its own route (/api/cron/process) and
// is intentionally NOT dispatched from here — that keeps this route free of the
// desk/queue module, whose exports differ across branches.
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { scrapeAllActive } from '@/lib/scraper';
import { runOutreach } from '@/lib/outreach';
import { runDevelopmentsScrape } from '@/lib/scrape/developments';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();
  const out: Record<string, unknown> = { ok: true };

  // Scrape (guarded by automation_settings).
  try {
    const { data } = await sb.from('automation_settings').select('scraper_enabled').eq('id', 1).maybeSingle();
    if ((data as { scraper_enabled?: boolean } | null)?.scraper_enabled) {
      out.scrape = await scrapeAllActive(sb, { deadlineMs: 30_000 });
    }
  } catch (e) { out.scrapeError = (e as Error).message; }

  // Outreach cadence — only actually sends when sending is switched on in
  // crm_settings (otherwise runOutreach no-ops on commit).
  try {
    const { data: cs } = await sb.from('crm_settings').select('sending_enabled').eq('id', 1).maybeSingle();
    if ((cs as { sending_enabled?: boolean } | null)?.sending_enabled) {
      out.outreach = await runOutreach(sb, { commit: true });
    }
  } catch { /* crm_settings not present yet — ignore */ }

  // Living knowledge — developer projects. A small time-boxed batch each day so the
  // rotation refreshes every source over a few days within the 60s Hobby cap. Only
  // runs when switched on; content-hash change-detection keeps it cheap.
  try {
    const { data: a } = await sb.from('automation_settings').select('developments_enabled, developments_autopublish').eq('id', 1).maybeSingle();
    const s = a as { developments_enabled?: boolean; developments_autopublish?: boolean } | null;
    if (s?.developments_enabled) {
      out.developments = await runDevelopmentsScrape(sb, { deadlineMs: 12_000, maxSources: 2, autopublish: !!s?.developments_autopublish });
    }
  } catch (e) { out.developmentsError = (e as Error).message; }

  return NextResponse.json(out);
}
