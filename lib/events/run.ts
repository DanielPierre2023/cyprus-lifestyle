// lib/events/run.ts — production wiring of the events pipeline: real fetch (identifying User-Agent, no caching), Supabase
// persistence, cache revalidation and venue geocoding. Used by the 'events_ingest' / 'geocode_event' queue jobs
// (lib/jobs.handlers.ts) and by the admin "Run now" route.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { geocode } from '@/lib/geo';
import { logServerError } from '@/lib/monitor.server';
import { USER_AGENT } from './sources';
import { runPipeline, type EventRow, type Fetched, type PipelineDeps, type PipelineOpts } from './pipeline';
import type { ExistingEvent, RunSummary, SourceState } from './types';
import { acceptVenuePoint, nearestDistrict, venueGeocodeQuery } from './geocode';

const EVENT_COLS = 'id, slug, title_en, starts_at, ends_at, venue, district, source, source_url, ingest_key, status, image, price, lat, updated_at, last_seen_at';

async function realFetch(url: string, o?: { timeoutMs?: number; etag?: string | null }): Promise<Fetched> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT, 'Accept-Language': 'en,el;q=0.8',
        Accept: 'application/json,text/calendar,application/rss+xml,application/xml,text/html;q=0.9,*/*;q=0.5',
        ...(o?.etag ? { 'If-None-Match': o.etag } : {}),
      },
      redirect: 'follow', cache: 'no-store', signal: AbortSignal.timeout(o?.timeoutMs ?? 9000),
    });
    if (res.status === 304) return { ok: true, status: 304, text: '', notModified: true, etag: o?.etag ?? null };
    const text = res.ok ? (await res.text()).slice(0, 2_000_000) : '';
    return { ok: res.ok, status: res.status, text, etag: res.headers.get('etag') };
  } catch { return { ok: false, status: 0, text: '' }; }
}

export function productionDeps(sb: SupabaseClient): PipelineDeps {
  return {
    now: () => Date.now(),
    fetch: realFetch,
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    async loadExisting(sinceIso) {
      const { data, error } = await sb.from('events').select(EVENT_COLS).or(`starts_at.gte.${sinceIso},ends_at.gte.${sinceIso}`).order('starts_at', { ascending: true }).limit(3000);
      if (error) throw new Error(`load events: ${error.message}`);
      return (data || []) as unknown as ExistingEvent[];
    },
    async loadStates() {
      const { data, error } = await sb.from('events_sources').select('*');
      if (error) return {};
      return Object.fromEntries(((data || []) as (SourceState & { publish_mode?: 'auto' | 'draft' | null })[]).map((r) => [r.slug, r]));
    },
    async saveState(slug, patch) {
      const { error } = await sb.from('events_sources').upsert({ slug, ...patch, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
      if (error) throw new Error(error.message);
    },
    async insertEvent(row: EventRow) {
      const { data, error } = await sb.from('events').insert(row).select('id, slug').single();
      if (error) {
        if (error.code === '23505') return 'conflict';
        await logServerError('events:insert', new Error(error.message), { ingest_key: row.ingest_key }, 'warn');
        return null;
      }
      return data as { id: string; slug: string };
    },
    async updateEvent(id, patch) {
      const { error } = await sb.from('events').update(patch).eq('id', id);
      if (error) throw new Error(error.message);
    },
    async recordRun(s: RunSummary, trigger: string) {
      await sb.from('events_ingest_runs').insert({
        started_at: s.startedAt, finished_at: new Date().toISOString(), trigger, ms: s.ms, found: s.found, added: s.added, updated: s.updated,
        duplicates: s.duplicates, errors: s.errors, published: s.published, drafted: s.drafted, stopped_early: s.stoppedEarly,
        detail: s.sources.map(({ etag: _e, cursor: _c, ...rest }) => rest),
      });
      await sb.from('events_ingest_runs').delete().lt('started_at', new Date(Date.now() - 60 * 86_400_000).toISOString());
    },
  };
}

async function invalidateAgenda(): Promise<void> {
  try { const { revalidateTag } = await import('next/cache'); revalidateTag('events'); } catch { /* not in a request scope (tests/scripts) */ }
}

/** One pipeline run + follow-ups (agenda cache refresh, queue venue-geocoding for the new rows). */
export async function runEventsIngest(sb: SupabaseClient, opts: PipelineOpts = {}): Promise<RunSummary> {
  const summary = await runPipeline(productionDeps(sb), opts);
  if (!opts.dryRun && (summary.added > 0 || summary.updated > 0)) {
    await invalidateAgenda();
    try {
      const { enqueue } = await import('@/lib/jobs');
      const { data } = await sb.from('events').select('slug').not('source', 'is', null).is('geocoded_at', null).not('venue', 'is', null).gte('starts_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(12);
      for (const r of (data || []) as { slug: string }[]) await enqueue('geocode_event', { slug: r.slug }, { dedupeKey: `geo-event:${r.slug}`, priority: 0, maxAttempts: 2 });
    } catch { /* geocoding is a refinement only */ }
  }
  return summary;
}

/** Queue job: refine one event's pin from the town to the venue (free, cached geocoder). Always stamps geocoded_at so it runs once. */
export async function geocodeEventJob(sb: SupabaseClient, slug: string): Promise<void> {
  const { data } = await sb.from('events').select('slug, venue, district, lat, lng, coords_precision, status').eq('slug', slug).maybeSingle();
  const e = data as { slug: string; venue: string | null; district: string | null; lat: number | null; lng: number | null; coords_precision: string | null } | null;
  if (!e) return;
  const nowIso = new Date().toISOString();
  const stamp = { geocoded_at: nowIso, last_seen_at: nowIso };   // last_seen_at keeps the "edited by a human?" guard truthful
  if (e.coords_precision === 'exact') { await sb.from('events').update(stamp).eq('slug', slug); return; }
  const q = venueGeocodeQuery(e);
  const hit = q ? await geocode(q) : null;
  if (hit && acceptVenuePoint(e, hit)) {
    const district = e.district ?? nearestDistrict(hit.lat, hit.lng)?.district ?? null;      // a venue pin also tells us the district
    await sb.from('events').update({ ...stamp, lat: hit.lat, lng: hit.lng, coords_precision: 'exact', ...(district && !e.district ? { district } : {}) }).eq('slug', slug);
  }
  else await sb.from('events').update(stamp).eq('slug', slug);
}
