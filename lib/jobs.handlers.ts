// lib/jobs.handlers.ts — registers the REAL background-job handlers (roadmap item 01,
// activation). Imported for its side effects by /api/cron/worker. Kept separate from
// lib/jobs.ts so the heavy engines are only pulled into the worker, not into every module
// that merely enqueues work. Core 'noop'/'housekeeping' live in lib/jobs.ts.
import 'server-only';
import { registerJob, enqueue } from '@/lib/jobs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { geocode } from '@/lib/geo';
import { needsGeocode, geocodeQuery } from '@/lib/jobs.geocode';
import { runDevelopmentsScrape } from '@/lib/scrape/developments';
import { runRegulationWatch } from '@/lib/scrape/regulations';
import { runEventsActualiser } from '@/lib/scrape/events';
import { runOutreach } from '@/lib/outreach';
import type { SupabaseClient } from '@supabase/supabase-js';

// ── Coordinate backfill — the headline queue workload. One listing per job, so the
// worker drains a few every few minutes and lifts directory coord-coverage (item 04)
// over days, well within any cron cap. geocode() is cached + Cyprus-bounded.
registerJob('geocode_listing', async (payload) => {
  const slug = String(payload.slug || '');
  if (!slug) return;
  const sb = supabaseAdmin();
  const { data } = await sb.from('directory_listings')
    .select('slug, lat, lng, address, district').eq('slug', slug).maybeSingle();
  if (!data) return;
  const l = data as { slug: string; lat: number | null; lng: number | null; address: string | null; district: string | null };
  if (!needsGeocode(l)) return;                 // already has coords / nothing to geocode → done
  const pt = await geocode(geocodeQuery(l));    // returns null (not a throw) when not found
  if (pt) await sb.from('directory_listings').update({ lat: pt.lat, lng: pt.lng }).eq('slug', slug);
  // null → complete without change (don't burn retries on an unresolvable address)
});

// ── Living-knowledge subsystems, as enqueueable jobs (small batches). These mirror what
// the daily tick runs inline; having them as jobs lets pg_cron spread them out too.
registerJob('developments', async () => { await runDevelopmentsScrape(supabaseAdmin(), { deadlineMs: 20_000, maxSources: 3 }); });
registerJob('regulations',  async () => { await runRegulationWatch(supabaseAdmin(), { deadlineMs: 15_000, maxSources: 3 }); });
registerJob('events_mine',  async () => { await runEventsActualiser(supabaseAdmin(), { refresh: false, mine: true, mineLimit: 4, deadlineMs: 15_000 }); });
registerJob('outreach',     async () => { await runOutreach(supabaseAdmin(), { commit: true }); }); // no-ops unless sending is enabled

// ── Enqueue coordinate-backfill jobs for listings still missing coordinates. Deduped per
// slug (the queue's dedupe index), capped per call. Returns how many were enqueued.
export async function enqueueGeocodeBacklog(sb: SupabaseClient, limit = 40): Promise<number> {
  try {
    const { data } = await sb.from('directory_listings')
      .select('slug, address, district')
      .eq('status', 'published')
      .is('lat', null)
      .limit(Math.max(1, Math.min(limit, 200)));
    const rows = (data as { slug: string; address: string | null; district: string | null }[] | null) || [];
    let n = 0;
    for (const r of rows) {
      if (!geocodeQuery(r)) continue;           // nothing to geocode on — skip
      await enqueue('geocode_listing', { slug: r.slug }, { dedupeKey: `geocode:${r.slug}`, priority: 0, maxAttempts: 2 });
      n++;
    }
    return n;
  } catch { return 0; }
}
