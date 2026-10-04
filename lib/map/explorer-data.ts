// lib/map/explorer-data.ts
// ============================================================================
// Server-side data for the map explorer. Read-only: it SELECTs existing columns of
// directory_listings and events — no schema change, no writes, no geocoding.
//
// Same population as the directory map (lib/directory/map-data.ts): every geocoded
// business in status 'published' OR 'listed', occupied-north rows (north = true)
// excluded. Plus every published event that is upcoming or still running (placed at
// its venue / town / district when it has no coordinates), plus the bookable
// experiences (public.activities — empty until that migration is applied).
//
// Robust by design: if a column is missing in the database the listing query falls
// back to fewer columns instead of returning nothing, and every error is recorded for
// /api/map/health (open it in a browser to see what the map is built from).
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { getActivities, getActivitiesByIds, searchActivities, gygPartnerId } from '@/lib/activities/data';
import {
  buildIndex, listingDetail, eventDetail, activityDetail, cleanSearch, cyprusPoint, venueLookup, placeEvent, ownRatings, F,
  type ExplorerIndex, type ExplorerDetail, type IndexListingRow, type IndexEventRow,
} from './explorer-index';
import { canonicalOf, EVENT_CAT, ACTIVITY_PREFIX } from './explorer-taxonomy';

const MAP_STATUSES = ['published', 'listed'];
const PAGE = 1000;           // PostgREST caps a request at ~1000 rows
const MAX_ROWS = 40000;      // hard ceiling (today ≈17.7k)
const PARALLEL = 6;

// Column sets, richest first. The first one the database accepts is used.
const INDEX_COLSETS: { name: string; cols: string }[] = [
  { name: 'full', cols: 'slug, type, status, canonical_category, canonical_subtype, district, lat, lng, featured, verified, luxury, rating, rating_count, commercial_rank, price_band, price_from, image, name_en' },
  { name: 'basic', cols: 'slug, type, status, canonical_category, district, lat, lng, featured, verified, rating, rating_count, image, name_en' },
  { name: 'minimal', cols: 'slug, type, status, district, lat, lng' },
];

export interface MapBuildStats {
  built: string | null; ms: number; colset: string | null; errors: string[];
  listings: { total: number; published: number; listed: number; withImage: number; withRating: number; onMap: number };
  events: { total: number; exact: number; approx: number; unplaced: number };
  activities: number; categories: number;
}
let lastStats: MapBuildStats | null = null;
export const mapBuildStats = () => lastStats;

type Errs = string[];
const errText = (where: string, e: unknown) => `${where}: ${(e as { message?: string })?.message || String(e)}`.slice(0, 300);

// A filtered base query for the map population. A function (not a shared builder):
// supabase-js builders are single-use.
function listingsQuery(cols: string, head = false) {
  return supabaseAdmin().from('directory_listings')
    .select(cols, head ? { count: 'exact', head: true } : undefined)
    .in('status', MAP_STATUSES)
    .not('lat', 'is', null).not('lng', 'is', null)
    .not('north', 'is', true);
}

async function fetchListingRows(errs: Errs): Promise<{ rows: IndexListingRow[]; colset: string | null }> {
  // 1) Pick the richest column set the database accepts (probe = the first page).
  let colset: (typeof INDEX_COLSETS)[number] | null = null;
  let first: IndexListingRow[] = [];
  for (const cs of INDEX_COLSETS) {
    const { data, error } = await listingsQuery(cs.cols).order('slug', { ascending: true }).range(0, PAGE - 1);
    if (error) { errs.push(errText(`listings[${cs.name}]`, error)); continue; }
    colset = cs; first = (data || []) as unknown as IndexListingRow[];
    break;
  }
  if (!colset) return { rows: [], colset: null };
  const rows: IndexListingRow[] = [...first];
  if (first.length < PAGE) return { rows, colset: colset.name };

  // 2) Page the rest in parallel (bounded), with a stable sort so pages never overlap.
  const { count, error: cErr } = await listingsQuery('slug', true);
  if (cErr) errs.push(errText('listings[count]', cErr));
  const fetchPage = async (from: number) => {
    const { data, error } = await listingsQuery(colset!.cols).order('slug', { ascending: true }).range(from, from + PAGE - 1);
    if (error) { errs.push(errText(`listings[page ${from}]`, error)); return [] as IndexListingRow[]; }
    return (data || []) as unknown as IndexListingRow[];
  };
  if (count != null) {
    const total = Math.min(count, MAX_ROWS);
    const starts: number[] = [];
    for (let from = PAGE; from < total; from += PAGE) starts.push(from);
    for (let i = 0; i < starts.length; i += PARALLEL) {
      const chunk = await Promise.all(starts.slice(i, i + PARALLEL).map(fetchPage));
      for (const c of chunk) rows.push(...c);
    }
  } else {
    // No count available: walk pages until a short one.
    for (let from = PAGE; from < MAX_ROWS; from += PAGE) {
      const page = await fetchPage(from);
      rows.push(...page);
      if (page.length < PAGE) break;
    }
  }
  return { rows, colset: colset.name };
}

async function fetchEventRows(errs: Errs): Promise<IndexEventRow[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const iso = start.toISOString();
  // Upcoming OR still running (started earlier, ends today or later) — with or without coordinates.
  for (const cols of ['slug, district, lat, lng, starts_at, ends_at, image, venue, title_en, coords_precision', 'slug, district, lat, lng, starts_at, ends_at, image, venue, title_en']) {
    const { data, error } = await supabaseAdmin().from('events')
      .select(cols)
      .eq('status', 'published').or(`starts_at.gte.${iso},ends_at.gte.${iso}`)
      .order('starts_at', { ascending: true }).limit(3000);
    if (error) { errs.push(errText('events', error)); continue; }
    return (data || []) as unknown as IndexEventRow[];
  }
  return [];
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
    const t0 = Date.now();
    const errs: Errs = [];
    const [{ rows: listings, colset }, events, activities] = await Promise.all([
      fetchListingRows(errs).catch((e) => { errs.push(errText('listings', e)); return { rows: [] as IndexListingRow[], colset: null }; }),
      fetchEventRows(errs).catch((e) => { errs.push(errText('events', e)); return [] as IndexEventRow[]; }),
      getActivities().catch((e) => { errs.push(errText('activities', e)); return []; }),
    ]);
    const venues = venueLookup(listings as unknown as { name_en?: string | null; lat: unknown; lng: unknown }[]);
    const ix = buildIndex(listings, events, new Date().toISOString(), activities, venues);
    if (errs.length) console.error('[map] index built with errors:', errs.join(' | '));
    let exact = 0, approx = 0, onMap = 0;
    for (let i = 0; i < ix.n; i++) {
      if (ix.f[i] & F.EVENT) { if (ix.f[i] & F.APPROX) approx++; else exact++; } else if (!(ix.f[i] & F.ACTIVITY)) onMap++;
    }
    lastStats = {
      built: ix.built, ms: Date.now() - t0, colset, errors: errs,
      listings: {
        total: listings.length, published: listings.filter((r) => r.status === 'published').length,
        listed: listings.filter((r) => r.status === 'listed').length, withImage: listings.filter((r) => !!r.image).length,
        withRating: listings.filter((r) => Number(r.rating) > 0).length, onMap,
      },
      events: { total: events.length, exact, approx, unplaced: events.length - exact - approx },
      activities: ix.f.filter((f) => f & F.ACTIVITY).length, categories: ix.cats.length,
    };
    // Don't keep an empty index for 10 minutes if the database hiccupped.
    if (ix.n > 0) memo = { at: Date.now(), ix };
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
      const names = `name_${locale}, name_en, summary_${locale}, summary_en`;
      const colsets = [
        `slug, type, status, image, gallery, owned_photos, address, phone, email, url, socials, hours, amenities, provenance, claimed_at, price_to, ${names}`,
        `slug, type, status, image, address, phone, email, url, price_to, ${names}`,
        `slug, type, status, image, address, phone, url, name_en, summary_en`,
      ];
      for (const cols of colsets) {
        const { data, error } = await supabaseAdmin().from('directory_listings')
          .select(cols).in('status', MAP_STATUSES).not('north', 'is', true).in('slug', slugs);
        if (error) { console.error('[map] details', error.message); continue; }
        const rows = (data || []) as unknown as Record<string, unknown>[];
        // First-party (Cyprus Lifestyle) reviews — shown when the listing has no other rating.
        let own = new Map<string, { avg: number; count: number }>();
        try {
          const { data: rv } = await supabaseAdmin().from('directory_reviews')
            .select('listing_slug, rating').eq('status', 'approved').in('listing_slug', slugs).limit(5000);
          own = ownRatings((rv || []) as { listing_slug: unknown; rating: unknown }[]);
        } catch { /* reviews table missing → none */ }
        for (const r of rows) out.push({ ...listingDetail(r, locale, prefix), own: own.get(String(r.slug)) || null });
        break;
      }
    })());
  }
  if (evSlugs.length) {
    jobs.push((async () => {
      const { data } = await supabaseAdmin().from('events')
        .select(`slug, image, venue, url, price, starts_at, ends_at, lat, lng, title_${locale}, title_en, summary_${locale}, summary_en`)
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
      .select(`slug, district, lat, lng, venue, starts_at, title_${locale}, title_en`)
      .eq('status', 'published').or(`starts_at.gte.${new Date(Date.now() - 864e5).toISOString()},ends_at.gte.${new Date(Date.now() - 864e5).toISOString()}`)
      .ilike('title_en', pat.replace(/\*/g, '%')).limit(4),
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
    const pt = placeEvent(r as unknown as IndexEventRow);
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
