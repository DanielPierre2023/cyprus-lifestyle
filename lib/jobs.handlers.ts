// lib/jobs.handlers.ts — the REAL background-job handlers (roadmap item 01 activation,
// extended in item 13 to carry ALL background work). Imported for its side effects by
// /api/cron/worker. Kept separate from lib/jobs.ts so the heavy engines are only pulled
// into the worker, not into every module that enqueues. Core 'noop'/'housekeeping' live
// in lib/jobs.ts. Every subsystem handler re-checks its own setting, so a queued job for
// a since-disabled subsystem safely no-ops (defence in depth).
import 'server-only';
import { registerJob, enqueue } from '@/lib/jobs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { geocode } from '@/lib/geo';
import { needsGeocode, geocodeQuery } from '@/lib/jobs.geocode';
import { scrapeAllActive } from '@/lib/scraper';
import { runDevelopmentsScrape } from '@/lib/scrape/developments';
import { runRegulationWatch } from '@/lib/scrape/regulations';
import { runEventsActualiser } from '@/lib/scrape/events';
import { runOutreach } from '@/lib/outreach';
import { EVAL_SET, runEvalBatch, newRunId } from '@/lib/concierge/eval';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Coordinate backfill — one listing per job (item 01/A). Cached + Cyprus-bounded.
registerJob('geocode_listing', async (payload) => {
  const slug = String(payload.slug || '');
  if (!slug) return;
  const sb = supabaseAdmin();
  const { data } = await sb.from('directory_listings')
    .select('slug, lat, lng, address, district').eq('slug', slug).maybeSingle();
  if (!data) return;
  const l = data as { slug: string; lat: number | null; lng: number | null; address: string | null; district: string | null };
  if (!needsGeocode(l)) return;
  const pt = await geocode(geocodeQuery(l));
  if (pt) await sb.from('directory_listings').update({ lat: pt.lat, lng: pt.lng }).eq('slug', slug);
});

// ── Living-knowledge subsystems (item 13) — each guarded by its own switch, so all
// heavy background work now runs off the queue (drained continuously by pg_cron) rather
// than inline in the 60s daily tick.
registerJob('scrape', async () => {
  const sb = supabaseAdmin();
  const { data } = await sb.from('automation_settings').select('scraper_enabled').eq('id', 1).maybeSingle();
  if (!(data as { scraper_enabled?: boolean } | null)?.scraper_enabled) return;
  await scrapeAllActive(sb, { deadlineMs: 40_000 });
});
registerJob('developments', async () => {
  const sb = supabaseAdmin();
  const { data } = await sb.from('automation_settings').select('developments_enabled, developments_autopublish').eq('id', 1).maybeSingle();
  const s = data as { developments_enabled?: boolean; developments_autopublish?: boolean } | null;
  if (!s?.developments_enabled) return;
  await runDevelopmentsScrape(sb, { deadlineMs: 25_000, maxSources: 4, autopublish: !!s.developments_autopublish });
});
registerJob('regulations', async () => {
  const sb = supabaseAdmin();
  const { data } = await sb.from('automation_settings').select('regulation_watch_enabled').eq('id', 1).maybeSingle();
  if (!(data as { regulation_watch_enabled?: boolean } | null)?.regulation_watch_enabled) return;
  await runRegulationWatch(sb, { deadlineMs: 20_000, maxSources: 4 });
});
registerJob('events_mine', async () => {
  const sb = supabaseAdmin();
  const { data } = await sb.from('automation_settings').select('events_watch_enabled').eq('id', 1).maybeSingle();
  if (!(data as { events_watch_enabled?: boolean } | null)?.events_watch_enabled) return;
  await runEventsActualiser(sb, { refresh: false, mine: true, mineLimit: 6, deadlineMs: 20_000 });
});
registerJob('outreach', async () => {
  const sb = supabaseAdmin();
  const { data } = await sb.from('crm_settings').select('sending_enabled').eq('id', 1).maybeSingle();
  if (!(data as { sending_enabled?: boolean } | null)?.sending_enabled) return;
  await runOutreach(sb, { commit: true });
});

// ── Live-model concierge quality evals (item 14) — ON-DEMAND ONLY. Enqueued by the
// admin "run full eval" action, NEVER auto-scheduled (each item costs an answer +
// judge model call). Runs one chunk of the eval set, then re-enqueues the next chunk,
// so the full set spreads across worker cycles and no single invocation is heavy.
registerJob('eval_concierge', async (payload) => {
  const runId = String(payload.runId || newRunId('full'));
  const offset = Math.max(0, Number(payload.offset || 0));
  const limit = Math.max(1, Math.min(Number(payload.limit || 6), 12));
  const slice = EVAL_SET.slice(offset, offset + limit);
  if (!slice.length) return;
  await runEvalBatch(slice, runId);
  const next = offset + limit;
  if (next < EVAL_SET.length) {
    await enqueue('eval_concierge', { runId, offset: next, limit }, { dedupeKey: `eval:${runId}:${next}`, priority: 2, maxAttempts: 2 });
  }
});

// ── Enqueue coordinate-backfill jobs for listings still missing coordinates.
export async function enqueueGeocodeBacklog(sb: SupabaseClient, limit = 40): Promise<number> {
  try {
    const { data } = await sb.from('directory_listings')
      .select('slug, address, district').in('status', ['published', 'listed']).is('lat', null)
      .limit(Math.max(1, Math.min(limit, 200)));
    const rows = (data as { slug: string; address: string | null; district: string | null }[] | null) || [];
    let n = 0;
    for (const r of rows) {
      if (!geocodeQuery(r)) continue;
      await enqueue('geocode_listing', { slug: r.slug }, { dedupeKey: `geocode:${r.slug}`, priority: 0, maxAttempts: 2 });
      n++;
    }
    return n;
  } catch { return 0; }
}

// ── Enqueue the day's subsystem jobs (item 13). One per subsystem per day (deduped),
// and only for enabled subsystems. The worker (tick drain + pg_cron) runs them, so a
// heavy subsystem no longer competes for the daily tick's 60s budget.
export async function enqueueDailySubsystems(sb: SupabaseClient): Promise<number> {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const [{ data: a }, { data: c }] = await Promise.all([
      sb.from('automation_settings').select('scraper_enabled, developments_enabled, regulation_watch_enabled, events_watch_enabled').eq('id', 1).maybeSingle(),
      sb.from('crm_settings').select('sending_enabled').eq('id', 1).maybeSingle(),
    ]);
    const s = (a as Record<string, boolean> | null) || {};
    const sending = (c as { sending_enabled?: boolean } | null)?.sending_enabled;
    const plan: Array<[string, string]> = [];
    if (s.scraper_enabled) plan.push(['scrape', `scrape:${day}`]);
    if (s.developments_enabled) plan.push(['developments', `dev:${day}`]);
    if (s.regulation_watch_enabled) plan.push(['regulations', `reg:${day}`]);
    if (s.events_watch_enabled) plan.push(['events_mine', `evt:${day}`]);
    if (sending) plan.push(['outreach', `outreach:${day}`]);
    let n = 0;
    for (const [kind, dedupeKey] of plan) { await enqueue(kind, {}, { dedupeKey, priority: 1, maxAttempts: 3 }); n++; }
    return n;
  } catch { return 0; }
}
