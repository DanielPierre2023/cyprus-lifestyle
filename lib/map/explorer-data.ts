// lib/map/explorer-data.ts
// ============================================================================
// Server-side data for the map explorer. Read-only: it SELECTs existing columns of
// directory_listings and events — no schema change, no writes, no geocoding.
//
// Same population as the directory map (lib/directory/map-data.ts): every geocoded
// business in status 'published' OR 'listed', occupied-north rows (north = true)
// excluded. Plus upcoming published events with coordinates, plus bookable
// activities (public.activities — empty until that migration is applied).
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { getActivities, getActivitiesByIds, searchActivities, gygPartnerId } from '@/lib/activities/data';
import {
  buildIndex, listingDetail, eventDetail, activityDetail, cleanSearch, cyprusPoint,
  type ExplorerIndex, type ExplorerDetail, type IndexListingRow, type IndexEventRow,
} from './explorer-index';
import { canonicalOf, EVENT_CAT, ACTIVITY_PREFIX } from './explorer-taxonomy';

const MAP_STATUSES = ['published', 'listed'];
const PAGE = 1000;           // PostgREST caps a request at ~1000 rows
const MAX_ROWS = 40000;      // hard ceiling (today ≈17.7k)
const PARALLEL = 6;

const INDEX_COLS =
  'slug, type, status, canonical_category, canonical_subtype, district, lat, lng, featured, verified, luxury, rating, rating_count, commercial_rank, price_band, price_from, image';

// A filtered base query for the map population. A function (not a shared builder):
// supabase-js builders are single-use.
function listingsQuery(cols: string, head = false) {
  return supabaseAdmin().from('directory_listings')
    .select(cols, head ? { count: 'exact', head: true } : undefined)
    .in('status', MAP_STATUSES)
    .not('lat', 'is', null).not('lng', 'is', null)
    .not('north', 'is', true);
}

async function fetchListingRows(): Promise<IndexListingRow[]> {
  const { count } = await listingsQuery('slug', true);
  const total = Math.min(count ?? MAX_ROWS, MAX_ROWS);
  const starts: number[] = [];
  for (let from = 0; from < total; from += PAGE) starts.push(from);
  const rows: IndexListingRow[] = [];
  // Page in parallel (bounded), with a stable sort so pages never overlap or skip.
  for (let i = 0; i < starts.length; i += PARALLEL) {
    const chunk = await Promise.all(starts.slice(i, i + PARALLEL).map(async (from) => {
      const { data } = await listingsQuery(INDEX_COLS).order('slug', { ascending: true }).range(from, from + PAGE - 1);
      return (data || []) as unknown as IndexListingRow[];
    }));
    for (const c of chunk) rows.push(...c);
  }
  return rows;
}

async function fetchEventRows(): Promise<IndexEventRow[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const { data } = await supabaseAdmin().from('events')
    .select('slug, district, lat, lng, starts_at, image')
    .eq('status', 'published').gte('starts_at', start.toISOString())
    .not('lat', 'is', null).order('starts_at', { ascending: true }).limit(1000);
  return (data || []) as unknown as IndexEventRow[];
}

// Small in-process memo on top of the CDN cache, so a burst of cold edge requests
// doesn't page the whole table repeatedly from one server instance.
let memo: { at: number; ix: ExplorerIndex } | null = null;
let inflight: Promise<ExplorerIndex> | null = null;
const MEMO_MS = 10 * 60 * 1000;

export async function getExplorerIndex(): Promise<ExplorerIndex> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.ix;
  if (inflight) return inflight;
  inflight = (async () => {
    const [listings, events, activities] = await Promise.all([fetchListingRows(), fetchEventRows(), getActivities()]);
    const ix = buildIndex(listings, events, new Date().toISOString(), activities);
    memo = { at: Date.now(), ix };
    return ix;
  })().finally(() => { inflight = null; });
  return inflight;
}

/** Category + district counts for the first paint (chips, filter dialog), from the index. */
export async function getExplorerCounts(): Promise<{ cats: Record<string, number>; districts: Record<string, number>; total: number }> {
  const ix = await getExplorerIndex();
  const cats: Record<string, number> = {};
  const districts: Record<string, number> = {};
  for (let i = 0; i < ix.n; i++) {
    const c = ix.cats[ix.c[i]]; cats[c] = (cats[c] || 0) + 1;
    if (ix.d[i] >= 0) { const d = ix.districts[ix.d[i]]; districts[d] = (districts[d] || 0) + 1; }
  }
  return { cats, districts, total: ix.n };
}

const localePrefix = (l: Locale) => (l === DEFAULT_LOCALE ? '' : `/${l}`);

/** Card details for up to 60 ids (listing slugs, or 'e:'+slug for events). */
export async function getExplorerDetails(locale: Locale, ids: string[]): Promise<ExplorerDetail[]> {
  const clean = Array.from(new Set(ids.map((s) => String(s).trim()).filter((s) => /^([ea]:)?[a-z0-9][a-z0-9-]{0,180}$/i.test(s)))).slice(0, 60);
  const slugs = clean.filter((s) => !s.startsWith('e:') && !s.startsWith('a:'));
  const evSlugs = clean.filter((s) => s.startsWith('e:')).map((s) => s.slice(2));
  const actIds = clean.filter((s) => s.startsWith('a:')).map((s) => s.slice(2));
  const prefix = localePrefix(locale);
  const out: ExplorerDetail[] = [];
  const jobs: Promise<void>[] = [];
  if (slugs.length) {
    jobs.push((async () => {
      const { data } = await supabaseAdmin().from('directory_listings')
        .select(`slug, type, status, image, address, phone, url, price_to, name_${locale}, name_en, summary_${locale}, summary_en`)
        .in('status', MAP_STATUSES).not('north', 'is', true).in('slug', slugs);
      for (const r of (data || []) as unknown as Record<string, unknown>[]) out.push(listingDetail(r, locale, prefix));
    })());
  }
  if (evSlugs.length) {
    jobs.push((async () => {
      const { data } = await supabaseAdmin().from('events')
        .select(`slug, image, venue, url, price, ends_at, title_${locale}, title_en, summary_${locale}, summary_en`)
        .eq('status', 'published').in('slug', evSlugs);
      for (const r of (data || []) as unknown as Record<string, unknown>[]) out.push(eventDetail(r, locale, prefix));
    })());
  }
  if (actIds.length) {
    jobs.push((async () => {
      const partner = gygPartnerId();
      for (const r of await getActivitiesByIds(actIds)) out.push(activityDetail(r as unknown as Record<string, unknown>, locale, partner));
    })());
  }
  await Promise.all(jobs);
  return out;
}

export interface ExplorerHit { id: string; name: string; cat: string; district: string | null; lat: number; lng: number }

/** Business / event name search for the search box (case- and accent-insensitive-ish ilike). */
export async function searchExplorer(locale: Locale, query: string): Promise<ExplorerHit[]> {
  const q = cleanSearch(query);
  if (q.length < 2) return [];
  const pat = `*${q.replace(/\s+/g, '*')}*`;
  const nameCols = locale === 'en' ? ['name_en'] : [`name_${locale}`, 'name_en'];
  const [{ data: L }, { data: E }, A] = await Promise.all([
    listingsQuery(`slug, type, canonical_category, district, lat, lng, name_${locale}, name_en`)
      .or(nameCols.map((c) => `${c}.ilike.${pat}`).join(','))
      .order('commercial_rank', { ascending: false, nullsFirst: false })
      .order('featured', { ascending: false, nullsFirst: false })
      .limit(12),
    supabaseAdmin().from('events')
      .select(`slug, district, lat, lng, title_${locale}, title_en`)
      .eq('status', 'published').gte('starts_at', new Date(Date.now() - 864e5).toISOString())
      .not('lat', 'is', null).ilike('title_en', pat.replace(/\*/g, '%')).limit(4),
    searchActivities(q, 6).catch(() => []),
  ]);
  const hits: ExplorerHit[] = [];
  for (const r of (L || []) as unknown as Record<string, unknown>[]) {
    const pt = cyprusPoint(r.lat, r.lng);
    if (!pt) continue;
    hits.push({
      id: String(r.slug), name: String(r[`name_${locale}`] || r.name_en || r.slug),
      cat: canonicalOf(r.canonical_category as string | null, r.type as string | null),
      district: (r.district as string) || null, lat: pt.lat, lng: pt.lng,
    });
  }
  for (const r of (E || []) as unknown as Record<string, unknown>[]) {
    const pt = cyprusPoint(r.lat, r.lng);
    if (!pt) continue;
    hits.push({ id: `e:${r.slug}`, name: String(r[`title_${locale}`] || r.title_en || r.slug), cat: EVENT_CAT, district: (r.district as string) || null, lat: pt.lat, lng: pt.lng });
  }
  for (const a of A) {
    const pt = cyprusPoint(a.lat, a.lng);
    if (!pt) continue;
    hits.push({ id: `a:${a.external_id}`, name: a.title, cat: `${ACTIVITY_PREFIX}${a.kind}`, district: a.district, lat: pt.lat, lng: pt.lng });
  }
  return hits;
}
