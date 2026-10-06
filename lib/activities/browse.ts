// lib/activities/browse.ts
// ============================================================================
// Pure logic of the public experiences pages — filtering, facet counts, pagination and the
// STATIC-FRIENDLY filter URLs. Filters live in the PATH (never in ?query), so every filtered
// list is an ordinary ISR page that can be cached and linked:
//
//   /activities                                   all, page 1
//   /activities/browse/kind-boat                   one facet
//   /activities/browse/kind-boat_district-paphos_dur-half_price-2_page-2
//
// The key is canonical (fixed order kind, district, dur, price, page; page 1 omitted), so one
// list has exactly one URL; a non-canonical key parses to null (the page answers 404).
// ============================================================================
import { ACTIVITY_KIND_KEYS } from '@/lib/activities/classify';

/** A slug is publishable when it is the catalogue's own shape (ends in the partner product id) — also keeps '/browse' etc. free. */
export const isActivitySlug = (s: string): boolean => /^[a-z0-9][a-z0-9-]{2,120}$/.test(s) && /\d$/.test(s);

export const PAGE_SIZE = 24;
export const DISTRICT_KEYS = ['paphos', 'limassol', 'larnaca', 'famagusta', 'nicosia'] as const;
export const DURATION_KEYS = ['short', 'half', 'full'] as const;
export const PRICE_BANDS = ['€', '€€', '€€€', '€€€€'] as const;
export type DurationKey = (typeof DURATION_KEYS)[number];

export interface Filters { kind?: string; district?: string; dur?: DurationKey; price?: number; page: number; }

/** The catalogue columns the public pages read (a subset of public.activities — nothing else). */
export interface PublicActivity {
  external_id: string; slug: string; title: string; summary: string | null; kind: string; tags: string[];
  district: string | null; town: string | null; landmark: string | null; geo_precision: string | null;
  duration_min: number | null; duration_label: string | null; price_band: string | null; price_basis: string | null;
  group_max: number | null; booking_url: string | null; priority: number; visits_north: boolean; north_site: string | null;
}

/** ≤ 2 h → short, 2–5 h → half, > 5 h → full; unknown duration belongs to no bucket. */
export function durationBucket(min: number | null | undefined): DurationKey | null {
  if (min == null || !Number.isFinite(min) || min <= 0) return null;
  return min <= 120 ? 'short' : min <= 300 ? 'half' : 'full';
}
export const priceLevel = (band: string | null | undefined): number | null => {
  const i = (PRICE_BANDS as readonly string[]).indexOf(String(band || ''));
  return i < 0 ? null : i + 1;
};

const KIND_SET = new Set<string>(ACTIVITY_KIND_KEYS);
const DISTRICT_SET = new Set<string>(DISTRICT_KEYS);

/** 'all' → no filter; otherwise the canonical key. Anything else (unknown value, wrong order, page-1, duplicates) → null. */
export function parseFilterKey(key: string): Filters | null {
  if (key === 'all') return { page: 1 };
  if (!/^[a-z0-9_-]{1,120}$/.test(key)) return null;
  const f: Filters = { page: 1 };
  for (const part of key.split('_')) {
    const i = part.indexOf('-');
    if (i < 1) return null;
    const name = part.slice(0, i); const val = part.slice(i + 1);
    if (name === 'kind' && KIND_SET.has(val) && !f.kind) f.kind = val;
    else if (name === 'district' && DISTRICT_SET.has(val) && !f.district) f.district = val;
    else if (name === 'dur' && (DURATION_KEYS as readonly string[]).includes(val) && !f.dur) f.dur = val as DurationKey;
    else if (name === 'price' && /^[1-4]$/.test(val) && !f.price) f.price = Number(val);
    else if (name === 'page' && /^[2-9]\d{0,2}$/.test(val) && f.page === 1) f.page = Number(val);
    else return null;
  }
  return filterKey(f) === key ? f : null;
}

export function filterKey(f: Filters): string {
  const parts: string[] = [];
  if (f.kind) parts.push(`kind-${f.kind}`);
  if (f.district) parts.push(`district-${f.district}`);
  if (f.dur) parts.push(`dur-${f.dur}`);
  if (f.price) parts.push(`price-${f.price}`);
  if (f.page > 1) parts.push(`page-${f.page}`);
  return parts.length ? parts.join('_') : 'all';
}
/** Locale-free path of a filtered list (page 1 of "all" is the index itself). */
export function filterPath(f: Filters): string {
  const k = filterKey(f);
  return k === 'all' ? '/activities' : `/activities/browse/${k}`;
}
export const facetCount = (f: Filters): number => (f.kind ? 1 : 0) + (f.district ? 1 : 0) + (f.dur ? 1 : 0) + (f.price ? 1 : 0);

export function matches(a: PublicActivity, f: Filters, skip?: 'kind' | 'district' | 'dur' | 'price'): boolean {
  if (f.kind && skip !== 'kind' && a.kind !== f.kind) return false;
  if (f.district && skip !== 'district' && a.district !== f.district) return false;
  if (f.dur && skip !== 'dur' && durationBucket(a.duration_min) !== f.dur) return false;
  if (f.price && skip !== 'price' && priceLevel(a.price_band) !== f.price) return false;
  return true;
}
export const applyFilters = (rows: PublicActivity[], f: Filters): PublicActivity[] => rows.filter((a) => matches(a, f));

export interface Facets {
  kind: { key: string; n: number }[];
  district: { key: string; n: number }[];
  dur: { key: DurationKey; n: number }[];
  price: { key: number; n: number }[];
}
/** Counts per option, each computed with the OTHER filters applied (so a chip shows what clicking it would give). */
export function facets(rows: PublicActivity[], f: Filters): Facets {
  const cnt = <K extends string | number>(skip: 'kind' | 'district' | 'dur' | 'price', get: (a: PublicActivity) => K | null) => {
    const m = new Map<K, number>();
    for (const a of rows) if (matches(a, f, skip)) { const k = get(a); if (k != null) m.set(k, (m.get(k) || 0) + 1); }
    return m;
  };
  const k = cnt('kind', (a) => a.kind); const d = cnt('district', (a) => a.district); const u = cnt('dur', (a) => durationBucket(a.duration_min)); const p = cnt('price', (a) => priceLevel(a.price_band));
  return {
    kind: ACTIVITY_KIND_KEYS.map((key) => ({ key, n: k.get(key) || 0 })).filter((x) => x.n > 0 || f.kind === x.key),
    district: DISTRICT_KEYS.map((key) => ({ key: key as string, n: d.get(key) || 0 })).filter((x) => x.n > 0 || f.district === x.key),
    dur: DURATION_KEYS.map((key) => ({ key, n: u.get(key) || 0 })).filter((x) => x.n > 0 || f.dur === x.key),
    price: [1, 2, 3, 4].map((key) => ({ key, n: p.get(key) || 0 })).filter((x) => x.n > 0 || f.price === x.key),
  };
}

/** Link target when a chip is toggled: the same filters with that facet set (or cleared when it is already active); page resets to 1. */
export function toggled(f: Filters, name: 'kind' | 'district' | 'dur' | 'price', value: string | number): Filters {
  const next: Filters = { ...f, page: 1 };
  const cur = f[name];
  if (cur === value) delete next[name]; else (next as unknown as Record<string, unknown>)[name] = value;
  return next;
}

export interface PageSlice { items: PublicActivity[]; page: number; pages: number; total: number; }
export function paginate(rows: PublicActivity[], page: number, size = PAGE_SIZE): PageSlice {
  const total = rows.length; const pages = Math.max(1, Math.ceil(total / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: rows.slice((p - 1) * size, p * size), page: p, pages, total };
}

/** Index of facets worth indexing: the unfiltered list and ONE facet, page 1. Everything else is noindex,follow (thin / duplicate combinations). */
export const isIndexable = (f: Filters): boolean => f.page === 1 && facetCount(f) <= 1;

/** Public order: editorial picks first, then € before €€€€, shorter first, then title — stable for ISR. */
export function publicOrder(rows: PublicActivity[]): PublicActivity[] {
  return [...rows].sort((a, b) =>
    (b.priority - a.priority)
    || ((priceLevel(a.price_band) ?? 9) - (priceLevel(b.price_band) ?? 9))
    || ((a.duration_min ?? 1e9) - (b.duration_min ?? 1e9))
    || a.title.localeCompare(b.title, 'en') || a.slug.localeCompare(b.slug));
}
