// lib/events/pipeline.ts — the events pipeline: fetch -> parse -> normalise -> dedupe -> store, for every due source.
// ALL I/O is injected (PipelineDeps), so the whole flow is unit-tested with fixtures of real captured payloads and no network.
// Production wiring is lib/events/run.ts. Properties:
//   * time-boxed: stops starting new requests before the deadline (Vercel Hobby = 60 s; the queue job uses 30 s, the admin button 50 s) and resumes next run;
//   * resumable: event pages already stored are not fetched again, so each run advances through a long feed;
//   * polite: robots.txt is read (cached per run) before every request, a pause separates requests to one host, an
//     identifying User-Agent is sent, ETag revalidation is used where the feed supports it, and each source has a minimum interval;
//   * safe: one failing source never stops the others; a human-edited event is never overwritten.
import type { EventSource, ExistingEvent, NormEvent, RawEvent, RunSummary, SourceResult, SourceState } from './types';
import { EVENT_SOURCES } from './sources';
import { parseFeedItems, parseIcal, parseJsonLdEvents, parseTribe } from './parse';
import { cyprusPublicHolidays } from './holidays';
import { normaliseEvent } from './normalise';
import { addToIndex, buildIndex, findDuplicate, type DupIndex } from './dedupe';
import { decidePublication } from './rules';
import { robotsAllows } from './robots';
import { nicosiaParts } from './time';

export interface Fetched { ok: boolean; status: number; text: string; etag?: string | null; notModified?: boolean }

/** A row for public.events (columns added by migration 20261007120000_events_pipeline.sql). */
export interface EventRow {
  slug: string; ingest_key: string; source: string; source_name: string; source_lang: string; source_url: string; url: string | null;
  title_en: string; title_el: string | null; summary_en: string | null;
  venue: string | null; district: string | null; starts_at: string; ends_at: string | null; price: string | null; image: string | null;
  lat: number | null; lng: number | null; coords_precision: string | null; tags: string[]; organizer: string | null;
  status: 'published' | 'draft'; auto_published: boolean; date_confidence: string; recurrence: string; last_seen_at: string;
}

export interface PipelineDeps {
  now: () => number;
  fetch: (url: string, opts?: { timeoutMs?: number; etag?: string | null }) => Promise<Fetched>;
  sleep: (ms: number) => Promise<void>;
  loadExisting: (sinceIso: string) => Promise<ExistingEvent[]>;
  loadStates: () => Promise<Record<string, SourceState & { publish_mode?: 'auto' | 'draft' | null }>>;
  saveState: (slug: string, patch: Partial<SourceState>) => Promise<void>;
  insertEvent: (row: EventRow) => Promise<{ id: string; slug: string } | 'conflict' | null>;
  updateEvent: (id: string, patch: Record<string, unknown>) => Promise<void>;
  recordRun: (s: RunSummary, trigger: string) => Promise<void>;
}
export interface PipelineOpts {
  deadlineMs?: number; only?: string; force?: boolean; dryRun?: boolean; trigger?: string; sources?: EventSource[];
  politeDelayMs?: number; maxNew?: number;
}

const SAFETY_MS = 7_000;          // never START a request with less than this left

export function expandFeedUrl(tpl: string, now: number, yearOffset = 0): string {
  const p = nicosiaParts(now);
  return tpl.replace('{today}', `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`).replace('{year}', String(p.y + yearOffset));
}
function fnv(s: string): string { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(36).padStart(6, '0').slice(0, 6); }
export function eventSlug(ev: NormEvent): string {
  const base = ev.title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'event';
  return `${base}-${ev.startsAt.slice(0, 10).replace(/-/g, '')}-${fnv(ev.ingestKey)}`;
}
export function toRow(ev: NormEvent, src: EventSource, status: 'published' | 'draft', nowIso: string): EventRow {
  const srcUrl = ev.url || `${src.homepage.replace(/#.*$/, '')}#${fnv(ev.ingestKey)}`;
  return {
    slug: eventSlug(ev), ingest_key: ev.ingestKey, source: src.slug, source_name: src.attribution, source_lang: ev.lang, source_url: srcUrl, url: ev.url,
    title_en: ev.title, title_el: ev.titleEl ?? (ev.lang === 'el' ? ev.title : null), summary_en: ev.summary,
    venue: ev.venue, district: ev.district, starts_at: ev.startsAt, ends_at: ev.endsAt, price: ev.price, image: ev.image,
    lat: ev.lat, lng: ev.lng, coords_precision: ev.coordsPrecision, tags: ev.tags, organizer: ev.organizer,
    status, auto_published: status === 'published', date_confidence: ev.dateConfidence, recurrence: ev.recurrence, last_seen_at: nowIso,
  };
}

/** True when an administrator changed the row after the pipeline last touched it (then the pipeline leaves it alone). */
export function editedByHuman(e: Pick<ExistingEvent, 'updated_at' | 'last_seen_at'>): boolean {
  if (!e.updated_at || !e.last_seen_at) return false;
  return Date.parse(e.updated_at) - Date.parse(e.last_seen_at) > 60_000;
}

const blank = (slug: string): SourceResult => ({ slug, status: 'ok', found: 0, added: 0, updated: 0, duplicates: 0, skipped: 0, errors: 0, published: 0, drafted: 0, ms: 0 });

export async function runPipeline(deps: PipelineDeps, opts: PipelineOpts = {}): Promise<RunSummary> {
  const t0 = deps.now();
  const deadline = t0 + (opts.deadlineMs ?? 30_000);
  const registry = opts.sources ?? EVENT_SOURCES;
  const summary: RunSummary = { startedAt: new Date(t0).toISOString(), ms: 0, sources: [], found: 0, added: 0, updated: 0, duplicates: 0, errors: 0, published: 0, drafted: 0, stoppedEarly: false };

  const states = await deps.loadStates().catch(() => ({} as Awaited<ReturnType<PipelineDeps['loadStates']>>));
  const due = registry
    .filter((s) => (opts.only ? s.slug === opts.only : (states[s.slug]?.enabled ?? s.enabled)))
    .filter((s) => {
      if (opts.only || opts.force) return true;
      const last = states[s.slug]?.last_run_at;
      return !last || t0 - Date.parse(last) >= s.minIntervalMin * 60_000 - 60_000;
    })
    .sort((a, b) => Date.parse(states[a.slug]?.last_run_at || '1970-01-01') - Date.parse(states[b.slug]?.last_run_at || '1970-01-01'));
  if (!due.length) { summary.ms = deps.now() - t0; return summary; }

  const existing = await deps.loadExisting(new Date(t0 - 3 * 86_400_000).toISOString()).catch(() => [] as ExistingEvent[]);
  const ix = buildIndex(existing);
  const byKey = new Map(existing.filter((e) => e.ingest_key).map((e) => [e.ingest_key as string, e]));
  const robotsCache = new Map<string, string | null>();
  let newBudget = opts.maxNew ?? 400;

  for (const src of due) {
    if (deps.now() > deadline - SAFETY_MS) { summary.stoppedEarly = true; break; }
    const r = blank(src.slug); const s0 = deps.now();
    const st = states[src.slug];
    try {
      await ingestSource(src, st, { deps, deadline, ix, byKey, robotsCache, r, opts, nowIso: new Date(t0).toISOString(), budget: () => newBudget, spend: () => { newBudget--; } });
    } catch (e) { r.status = 'error'; r.errors++; r.error = String((e as Error)?.message || e).slice(0, 300); }
    r.ms = deps.now() - s0;
    summary.sources.push(r);
    if (!opts.dryRun) {
      const ok = r.status === 'ok' || r.status === 'not-modified';
      await deps.saveState(src.slug, {
        last_run_at: new Date(deps.now()).toISOString(), last_success_at: ok ? new Date(deps.now()).toISOString() : st?.last_success_at ?? null,
        last_status: r.status, last_found: r.found, last_added: r.added, last_duplicates: r.duplicates, last_errors: r.errors, last_error: r.error ?? null,
        consecutive_failures: ok ? 0 : (st?.consecutive_failures ?? 0) + 1, etag: r.etag ?? st?.etag ?? null,
        cursor: r.cursor ?? st?.cursor ?? null,
      }).catch(() => undefined);
    }
  }
  for (const r of summary.sources) { summary.found += r.found; summary.added += r.added; summary.updated += r.updated; summary.duplicates += r.duplicates; summary.errors += r.errors; summary.published += r.published; summary.drafted += r.drafted; }
  summary.ms = deps.now() - t0;
  if (!opts.dryRun) await deps.recordRun(summary, opts.trigger || 'queue').catch(() => undefined);
  return summary;
}

interface Ctx {
  deps: PipelineDeps; deadline: number; ix: DupIndex; byKey: Map<string, ExistingEvent>; robotsCache: Map<string, string | null>;
  r: SourceResult; opts: PipelineOpts; nowIso: string; budget: () => number; spend: () => void;
}

async function allowed(url: string, c: Ctx): Promise<boolean> {
  let u: URL; try { u = new URL(url); } catch { return false; }
  if (!c.robotsCache.has(u.origin)) {
    const f = await c.deps.fetch(`${u.origin}/robots.txt`, { timeoutMs: 5000 }).catch(() => null);
    c.robotsCache.set(u.origin, f && f.ok ? f.text.slice(0, 100_000) : null);   // unreachable robots.txt = no restriction (RFC 9309), but 5xx is handled by the caller's own status
    await c.deps.sleep(150);
  }
  return robotsAllows(c.robotsCache.get(u.origin), u.pathname + u.search);
}
const timeLeft = (c: Ctx) => c.deadline - c.deps.now();

async function ingestSource(src: EventSource, st: (SourceState & { publish_mode?: 'auto' | 'draft' | null }) | undefined, c: Ctx): Promise<void> {
  const { deps, r } = c;
  const now = deps.now();
  const urls = src.format === 'computed' ? [] : [expandFeedUrl(src.feedUrl, now)];
  const raws: RawEvent[] = [];
  const badNow: Record<string, number> = { ...(st?.cursor?.bad || {}) };

  if (src.format === 'computed') {            // local generation: this year, and next year from September on
    const y = nicosiaParts(now).y;
    raws.push(...cyprusPublicHolidays(y), ...(nicosiaParts(now).m >= 9 ? cyprusPublicHolidays(y + 1) : []));
  }
  for (const url of urls) {
    if (timeLeft(c) < SAFETY_MS) { r.note = 'time box reached before the feed was fetched'; break; }
    if (!(await allowed(url, c))) { r.status = 'blocked'; r.error = `robots.txt disallows ${new URL(url).pathname}`; r.errors++; return; }
    const useEtag = src.format === 'tribe' || src.format === 'ical';
    const f = await deps.fetch(url, { timeoutMs: Math.min(9000, timeLeft(c) - 1000), etag: useEtag ? st?.etag : null });
    if (f.notModified || f.status === 304) { r.status = 'not-modified'; return; }
    if (!f.ok) { r.status = 'error'; r.errors++; r.error = `HTTP ${f.status || 'network error'} for ${new URL(url).host}${new URL(url).pathname}`; return; }
    r.etag = f.etag ?? null;

    if (src.format === 'tribe') raws.push(...parseTribe(f.text));
    else if (src.format === 'ical') raws.push(...parseIcal(f.text));
    else if (src.format === 'jsonld-page') raws.push(...parseJsonLdEvents(f.text, url));
    else if (src.format === 'rss-jsonld') {
      const items = parseFeedItems(f.text);
      const fresh = items.filter((i) => !c.byKey.has(`${src.slug}:${i.link}`) && !(badNow[i.link] >= 2));
      let fetched = 0;
      for (const it of fresh) {
        if (fetched >= src.maxDetailPerRun || timeLeft(c) < SAFETY_MS + 1000) { r.note = `${fresh.length - fetched} event page(s) left for the next run`; break; }
        if (!(await allowed(it.link, c))) { badNow[it.link] = 9; r.skipped++; continue; }
        await deps.sleep(c.opts.politeDelayMs ?? 600);
        const d = await deps.fetch(it.link, { timeoutMs: Math.min(9000, timeLeft(c) - 1000) });
        fetched++;
        if (!d.ok) { badNow[it.link] = (badNow[it.link] || 0) + 1; r.errors++; continue; }
        const evs = parseJsonLdEvents(d.text, it.link);
        if (!evs.length) { badNow[it.link] = (badNow[it.link] || 0) + 1; r.skipped++; continue; }
        raws.push(...evs);
      }
    }
  }
  r.found = raws.length;
  r.cursor = { bad: Object.fromEntries(Object.entries(badNow).slice(-200)) };

  for (const raw of raws) {
    const n = normaliseEvent(raw, src, deps.now());
    if (!n.ok) { r.skipped++; continue; }
    const ev = n.event;
    const dup = findDuplicate(ev, c.ix);
    if (dup) {
      const row = c.byKey.get(ev.ingestKey) ?? c.ix.rows.find((p) => p.e.id === dup.id)?.e;
      if (dup.reason === 'same-key' && row) {
        // Same event seen again: refresh what the source may have changed, unless an administrator edited it.
        const patch: Record<string, unknown> = { last_seen_at: c.nowIso };
        if (!editedByHuman(row)) {
          const changed = row.starts_at !== ev.startsAt || (row.ends_at ?? null) !== ev.endsAt || (row.venue ?? null) !== ev.venue || (row.price ?? null) !== ev.price || (row.title_en ?? '') !== ev.title;
          if (changed) Object.assign(patch, { title_en: ev.title, starts_at: ev.startsAt, ends_at: ev.endsAt, venue: ev.venue, price: ev.price, district: ev.district ?? row.district, summary_en: ev.summary });
          if (changed) r.updated++; else r.duplicates++;
        } else r.duplicates++;
        if (!c.opts.dryRun) await deps.updateEvent(row.id, patch).catch(() => { r.errors++; });
      } else {
        r.duplicates++;
        // Cross-source duplicate: keep the first row, fill only its EMPTY fields from the newcomer (never for hand-made rows).
        if (row && row.source && !c.opts.dryRun) {
          const fill: Record<string, unknown> = {};
          if (!row.image && ev.image) fill.image = ev.image;
          if (!row.price && ev.price) fill.price = ev.price;
          if (row.lat == null && ev.lat != null) Object.assign(fill, { lat: ev.lat, lng: ev.lng, coords_precision: ev.coordsPrecision });
          if (!row.district && ev.district) fill.district = ev.district;
          if (Object.keys(fill).length && !editedByHuman(row)) await deps.updateEvent(row.id, { ...fill, last_seen_at: c.nowIso }).catch(() => undefined);
        }
      }
      continue;
    }
    if (c.budget() <= 0) { r.skipped++; continue; }
    const status = decidePublication(ev, src, deps.now(), st?.publish_mode ?? null).status;
    const row = toRow(ev, src, status, c.nowIso);
    if (c.opts.dryRun) { r.added++; if (status === 'published') r.published++; else r.drafted++; c.spend(); addToIndex(c.ix, { id: `dry-${row.slug}`, slug: row.slug, title_en: row.title_en, starts_at: row.starts_at, ends_at: row.ends_at, venue: row.venue, district: row.district, source: row.source, source_url: row.source_url, ingest_key: row.ingest_key, status, image: row.image, price: row.price, lat: row.lat, updated_at: null, last_seen_at: null }); continue; }
    const ins = await deps.insertEvent(row).catch(() => null);
    if (ins === 'conflict') { r.duplicates++; continue; }
    if (!ins) { r.errors++; continue; }
    r.added++; if (status === 'published') r.published++; else r.drafted++; c.spend();
    addToIndex(c.ix, { id: ins.id, slug: ins.slug, title_en: row.title_en, starts_at: row.starts_at, ends_at: row.ends_at, venue: row.venue, district: row.district, source: row.source, source_url: row.source_url, ingest_key: row.ingest_key, status, image: row.image, price: row.price, lat: row.lat, updated_at: null, last_seen_at: c.nowIso });
  }
}
