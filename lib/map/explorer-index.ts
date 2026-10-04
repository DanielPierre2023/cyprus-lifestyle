// lib/map/explorer-index.ts
// ============================================================================
// The map explorer's data contract — pure functions, no I/O, unit-tested.
//
// The directory has ~17.7k geocoded businesses (≈3k 'published' + ≈14.7k imported
// 'listed'), far too many to render into the page. So the map loads in two layers:
//
//   1. INDEX  (/api/map/index) — one compact, CDN-cached, columnar JSON with every
//      geocoded business + upcoming event: id, coordinates, category, district,
//      sub-type, price band, rating, paid tier and a few flags. Enough to cluster,
//      count, filter and rank everything client-side. NO names, NO contact data.
//   2. DETAILS (/api/map/details) — names, photos, address, website (and phone for
//      PUBLISHED listings only) for just the handful of places on screen.
//
// Privacy rules carried over from lib/directory/map-data.ts: phone only for
// 'published' rows, email never, and the bulk 'listed' set never as a contact dump.
// ============================================================================
import { canonicalOf, EVENT_CAT, ACTIVITY_PREFIX } from './explorer-taxonomy';
import { affiliateUrl, priceBasisLabel } from '@/lib/activities/classify';

export const INDEX_VERSION = 1;

/** Bit flags packed per row in the index. */
export const F = {
  PUBLISHED: 1,   // has a public profile page (/directory/<type>/<slug>)
  FEATURED: 2,
  VERIFIED: 4,
  LUXURY: 8,
  IMAGE: 16,
  EVENT: 32,
  ACTIVITY: 64,   // bookable experience (our catalogue) — links out to book with the booking partner
} as const;

/** A directory_listings row as selected by the index query. */
export interface IndexListingRow {
  slug: string; type: string | null; status: string | null;
  canonical_category: string | null; canonical_subtype: string | null; district: string | null;
  lat: number | string | null; lng: number | string | null;
  featured: boolean | null; verified: boolean | null; luxury: boolean | null;
  rating: number | string | null; rating_count: number | string | null; commercial_rank: number | string | null;
  price_band: string | null; price_from: number | string | null; image: string | null;
}

/** An events row as selected by the index query. */
export interface IndexEventRow {
  slug: string; district: string | null; lat: number | string | null; lng: number | string | null;
  starts_at: string | null; image: string | null;
}

/** A public.activities (experiences catalogue) row as selected by the index query. */
export interface IndexActivityRow {
  external_id: string; kind: string; district: string | null; landmark: string | null;
  lat: number | string | null; lng: number | string | null; price_band: string | null; priority?: number | string | null;
}

/** Columnar, dictionary-encoded index (what /api/map/index returns). */
export interface ExplorerIndex {
  v: number; built: string; n: number;
  cats: string[]; districts: string[]; subtypes: string[]; prices: string[]; types: string[];
  id: string[];       // listing slug, 'e:'+slug for events, 'a:'+booking-partner product id for experiences
  ty: number[];       // → types[]
  lat: number[]; lng: number[]; // 5 decimals (~1 m)
  c: number[];        // → cats[]
  d: number[];        // → districts[] (-1 none)
  s: number[];        // → subtypes[] (-1 none)
  p: number[];        // → prices[]   (-1 none)
  f: number[];        // flags (F.*)
  r: number[];        // rating × 10 (0 = none)
  rc: number[];       // rating count
  k: number[];        // commercial rank 0..3 (Partner 3 > Featured 2 > Listed 1); experiences: editorial priority 0..3
  pf: number[];       // price_from in EUR (0 = none)
  t: number[];        // event start, epoch minutes (0 = not an event)
}

/** One decoded point, as the client works with it. */
export interface ExplorerPoint {
  id: string; slug: string; type: string; cat: string; district: string | null; subtype: string | null;
  price: string | null; lat: number; lng: number; flags: number; rating: number | null; ratingCount: number;
  rank: number; priceFrom: number | null; date: string | null;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Cyprus box; swapped lat/lng are recovered, off-island rows dropped (same rule as
// cyprusCoord() in lib/queries.ts).
export function cyprusPoint(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const a = num(lat), b = num(lng);
  if (a === null || b === null) return null;
  const inBox = (x: number, y: number) => x >= 34.4 && x <= 35.9 && y >= 32.0 && y <= 34.7;
  if (inBox(a, b)) return { lat: a, lng: b };
  if (inBox(b, a)) return { lat: b, lng: a };
  return null;
}

const round5 = (x: number) => Math.round(x * 1e5) / 1e5;

class Dict {
  private m = new Map<string, number>();
  readonly list: string[] = [];
  idx(v: string | null | undefined): number {
    if (!v) return -1;
    let i = this.m.get(v);
    if (i === undefined) { i = this.list.length; this.list.push(v); this.m.set(v, i); }
    return i;
  }
}

/** Build the compact index from raw rows. Rows without valid Cyprus coordinates are skipped. */
export function buildIndex(listings: IndexListingRow[], events: IndexEventRow[], builtIso: string, activities: IndexActivityRow[] = []): ExplorerIndex {
  const cats = new Dict(), districts = new Dict(), subtypes = new Dict(), prices = new Dict(), types = new Dict();
  const ix: ExplorerIndex = {
    v: INDEX_VERSION, built: builtIso, n: 0, cats: cats.list, districts: districts.list, subtypes: subtypes.list,
    prices: prices.list, types: types.list,
    id: [], ty: [], lat: [], lng: [], c: [], d: [], s: [], p: [], f: [], r: [], rc: [], k: [], pf: [], t: [],
  };
  const seen = new Set<string>();
  for (const row of listings) {
    const pt = cyprusPoint(row.lat, row.lng);
    if (!pt || !row.slug || seen.has(row.slug)) continue;
    seen.add(row.slug);
    let flags = 0;
    if (row.status === 'published') flags |= F.PUBLISHED;
    if (row.featured) flags |= F.FEATURED;
    if (row.verified) flags |= F.VERIFIED;
    if (row.luxury) flags |= F.LUXURY;
    if (row.image) flags |= F.IMAGE;
    const rating = num(row.rating);
    ix.id.push(row.slug);
    ix.ty.push(types.idx(row.type || 'vendor'));
    ix.lat.push(round5(pt.lat)); ix.lng.push(round5(pt.lng));
    ix.c.push(cats.idx(canonicalOf(row.canonical_category, row.type)));
    ix.d.push(districts.idx(row.district ? row.district.toLowerCase() : null));
    ix.s.push(subtypes.idx(row.canonical_subtype ? row.canonical_subtype.toLowerCase() : null));
    ix.p.push(prices.idx(row.price_band));
    ix.f.push(flags);
    ix.r.push(rating && rating > 0 ? Math.round(rating * 10) : 0);
    ix.rc.push(Math.max(0, Math.round(num(row.rating_count) || 0)));
    ix.k.push(Math.max(0, Math.min(3, Math.round(num(row.commercial_rank) || 0))));
    ix.pf.push(Math.max(0, Math.round(num(row.price_from) || 0)));
    ix.t.push(0);
  }
  for (const ev of events) {
    const pt = cyprusPoint(ev.lat, ev.lng);
    const start = ev.starts_at ? Date.parse(ev.starts_at) : NaN;
    if (!pt || !ev.slug || !Number.isFinite(start)) continue;
    const id = `e:${ev.slug}`;
    if (seen.has(id)) continue;
    seen.add(id);
    ix.id.push(id);
    ix.ty.push(types.idx('event'));
    ix.lat.push(round5(pt.lat)); ix.lng.push(round5(pt.lng));
    ix.c.push(cats.idx(EVENT_CAT));
    ix.d.push(districts.idx(ev.district ? ev.district.toLowerCase() : null));
    ix.s.push(-1); ix.p.push(-1);
    ix.f.push(F.PUBLISHED | F.EVENT | (ev.image ? F.IMAGE : 0));
    ix.r.push(0); ix.rc.push(0); ix.k.push(0); ix.pf.push(0);
    ix.t.push(Math.round(start / 60000));
  }
  for (const a of activities) {
    const pt = cyprusPoint(a.lat, a.lng);
    if (!pt || !a.external_id) continue;
    const id = `a:${a.external_id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    ix.id.push(id);
    ix.ty.push(types.idx('activity'));
    ix.lat.push(round5(pt.lat)); ix.lng.push(round5(pt.lng));
    ix.c.push(cats.idx(`${ACTIVITY_PREFIX}${a.kind || 'sightseeing'}`));
    ix.d.push(districts.idx(a.district ? a.district.toLowerCase() : null));
    ix.s.push(subtypes.idx(a.landmark ? a.landmark.toLowerCase() : null)); // landmark → "Interests" filter
    ix.p.push(prices.idx(a.price_band));                                  // €…€€€€ → the Price filter
    ix.f.push(F.ACTIVITY);
    ix.r.push(0); ix.rc.push(0);                                          // no third-party ratings
    ix.k.push(Math.max(0, Math.min(3, Math.round(num(a.priority) || 0))));
    ix.pf.push(0);
    ix.t.push(0);
  }
  ix.n = ix.id.length;
  return ix;
}

/** Decode the columnar index into point objects (client side). */
export function decodeIndex(ix: ExplorerIndex): ExplorerPoint[] {
  const out: ExplorerPoint[] = new Array(ix.n);
  for (let i = 0; i < ix.n; i++) {
    const id = ix.id[i];
    const prefixed = (ix.f[i] & (F.EVENT | F.ACTIVITY)) !== 0;
    out[i] = {
      id, slug: prefixed ? id.slice(2) : id, type: ix.types[ix.ty[i]] || 'vendor', cat: ix.cats[ix.c[i]] || 'general-vendor',
      district: ix.d[i] >= 0 ? ix.districts[ix.d[i]] : null, subtype: ix.s[i] >= 0 ? ix.subtypes[ix.s[i]] : null,
      price: ix.p[i] >= 0 ? ix.prices[ix.p[i]] : null, lat: ix.lat[i], lng: ix.lng[i], flags: ix.f[i],
      rating: ix.r[i] ? ix.r[i] / 10 : null, ratingCount: ix.rc[i], rank: ix.k[i], priceFrom: ix.pf[i] || null,
      date: ix.t[i] ? new Date(ix.t[i] * 60000).toISOString() : null,
    };
  }
  return out;
}

/**
 * Ranking used for the list and for which pins win when they overlap:
 * paid tier (Partner > Featured > Listed — the "map priority" the Listed tier sells),
 * then editorially featured, then rating weighted by review volume, then photo/profile.
 */
export function rankScore(p: Pick<ExplorerPoint, 'rank' | 'flags' | 'rating' | 'ratingCount'>): number {
  return p.rank * 10000
    + ((p.flags & F.FEATURED) ? 1000 : 0)
    + (p.rating ? p.rating * Math.log10(10 + p.ratingCount) : 0)
    + ((p.flags & F.IMAGE) ? 0.5 : 0)
    + ((p.flags & F.PUBLISHED) ? 0.3 : 0);
}

// ---- Details (the on-screen cards) ---------------------------------------------------
export interface ExplorerDetail {
  id: string; name: string; image: string | null; address: string | null;
  phone: string | null; url: string | null; href: string | null; summary: string | null;
  priceTo: number | null; venue: string | null; endDate: string | null; eventPrice: string | null;
  // Bookable experiences (our catalogue; link-out booking with the partner)
  book?: string | null; duration?: string | null; basis?: string | null; tags?: string[];
  provider?: string | null; approx?: boolean;
}

/** directory_listings row → public card details. Enforces the contact-data rules. */
export function listingDetail(r: Record<string, unknown>, locale: string, prefix: string): ExplorerDetail {
  const published = String(r.status) === 'published';
  const slug = String(r.slug || '');
  const type = String(r.type || 'vendor');
  return {
    id: slug,
    name: String(r[`name_${locale}`] || r.name_en || slug),
    image: (r.image as string) || null,
    address: (r.address as string) || null,
    phone: published ? ((r.phone as string) || null) : null, // never for the bulk 'listed' set
    url: safeUrl(r.url),
    href: published ? `${prefix}/directory/${type}/${slug}` : null, // 'listed' rows have no profile page
    summary: published ? (String(r[`summary_${locale}`] || r.summary_en || '') || null) : null,
    priceTo: num(r.price_to),
    venue: null, endDate: null, eventPrice: null,
  };
}

/** events row → public card details. */
export function eventDetail(r: Record<string, unknown>, locale: string, prefix: string): ExplorerDetail {
  const slug = String(r.slug || '');
  return {
    id: `e:${slug}`,
    name: String(r[`title_${locale}`] || r.title_en || slug),
    image: (r.image as string) || null,
    address: (r.venue as string) || null,
    phone: null,
    url: safeUrl(r.url),
    href: `${prefix}/agenda/${slug}`,
    summary: String(r[`summary_${locale}`] || r.summary_en || '') || null,
    priceTo: null,
    venue: (r.venue as string) || null,
    endDate: (r.ends_at as string) || null,
    eventPrice: (r.price as string) || null,
  };
}

/** Only http(s) links are ever rendered. */
export function safeUrl(u: unknown): string | null {
  const s = typeof u === 'string' ? u.trim() : '';
  return /^https?:\/\//i.test(s) ? s : null;
}

/** Strip characters that would break a PostgREST or() filter; keep letters in every script. */
export function cleanSearch(q: string): string {
  return String(q || '').replace(/[%*,()\\:"'.]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** Experiences-catalogue row → card details. The booking link carries the partner id. */
export function activityDetail(r: Record<string, unknown>, locale: string, partnerId: string | null): ExplorerDetail {
  const area = [r.landmark, r.town ? `${r.town}` : null].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ');
  return {
    id: `a:${String(r.external_id || '')}`,
    name: String(r.title || ''),
    image: null,                                   // no third-party photos — the card shows the kind icon
    address: area || null,
    phone: null, url: null, href: null,
    summary: (r.summary as string) || null,
    priceTo: null, venue: null, endDate: null, eventPrice: null,
    book: affiliateUrl(r.booking_url as string, partnerId, 'cl-map'),
    duration: (r.duration_label as string) || null,
    basis: r.price_basis ? priceBasisLabel(String(r.price_basis), locale, num(r.group_max)) : null,
    tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
    provider: 'GetYourGuide',
    approx: true,
  };
}
