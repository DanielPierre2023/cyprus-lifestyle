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
//   2. DETAILS (/api/map/details) — everything we hold for just the handful of places
//      on screen or the one that was tapped: name, photos, address, phone, email,
//      website, socials, opening hours, amenities, description and reviews.
//
// Contact data is public business contact data, served per item (at most 60 ids per
// request, never in the bulk index). Imported ('listed') businesses carry a "claim /
// update / remove" link so the business stays in control of its entry.
//
// Events: every published event that is upcoming OR still running is on the map. One
// without coordinates is placed at its venue (when the venue is a directory business),
// else at the town/landmark named in the venue or title (our gazetteer), else at its
// district centre — and flagged APPROX so the pin is drawn dashed ("approximate area").
// ============================================================================
import { canonicalOf, EVENT_CAT, ACTIVITY_PREFIX } from './explorer-taxonomy';
import { affiliateUrl, priceBasisLabel } from '@/lib/activities/classify';
import { findTown, findLandmarks, foldText } from '@/lib/activities/places';

export const INDEX_VERSION = 2;

/** Bit flags packed per row in the index. */
export const F = {
  PUBLISHED: 1,   // has a public profile page (/directory/<type>/<slug>)
  FEATURED: 2,
  VERIFIED: 4,
  LUXURY: 8,
  IMAGE: 16,
  EVENT: 32,
  ACTIVITY: 64,   // bookable experience (our catalogue) — links out to book with the booking partner
  APPROX: 128,    // location is approximate (event placed at its town / district) — dashed pin
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
  ends_at?: string | null; venue?: string | null; title_en?: string | null; coords_precision?: string | null;
}

/** Centre of each district (its main town; Famagusta = the free area around Paralimni). */
export const DISTRICT_CENTRE: Readonly<Record<string, { lat: number; lng: number }>> = {
  nicosia: { lat: 35.1725, lng: 33.3650 }, limassol: { lat: 34.6800, lng: 33.0400 }, larnaca: { lat: 34.9180, lng: 33.6230 },
  paphos: { lat: 34.7754, lng: 32.4218 }, famagusta: { lat: 35.0375, lng: 33.9824 },
};

/** Directory businesses by folded name → a point, for placing events at their venue. */
export type VenueLookup = Map<string, { lat: number; lng: number } | null>;

const venueKey = (s: string) => foldText(s).replace(/^the\s+/, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Build the venue lookup from listing names. Names shared by two far-apart places are ambiguous → null. */
export function venueLookup(rows: { name_en?: string | null; lat: unknown; lng: unknown }[]): VenueLookup {
  const m: VenueLookup = new Map();
  for (const r of rows) {
    const k = venueKey(String(r.name_en || ''));
    const pt = cyprusPoint(r.lat, r.lng);
    if (k.length < 5 || !pt) continue;
    if (!m.has(k)) { m.set(k, pt); continue; }
    const prev = m.get(k);
    if (prev && (Math.abs(prev.lat - pt.lat) > 0.01 || Math.abs(prev.lng - pt.lng) > 0.01)) m.set(k, null);
  }
  return m;
}

/**
 * Where to pin an event: its own coordinates; else its venue (a directory business);
 * else the town / landmark named in the venue or title; else its district centre.
 * Everything but an exact own / venue point is flagged approximate.
 */
export function placeEvent(ev: IndexEventRow, venues?: VenueLookup): { lat: number; lng: number; approx: boolean } | null {
  const own = cyprusPoint(ev.lat, ev.lng);
  if (own) return { ...own, approx: ev.coords_precision === 'town' };
  const venue = String(ev.venue || '').trim();
  if (venue && venues) {
    for (const cand of [venue, venue.split(/[,–—(|]/)[0]]) {
      const hit = venues.get(venueKey(cand));
      if (hit) return { ...hit, approx: false };
    }
  }
  const district = String(ev.district || '').toLowerCase();
  const inDistrict = (p: { district: string } | null | undefined) => !!p && (!district || p.district === district);
  for (const text of [venue, String(ev.title_en || '')]) {
    if (!text) continue;
    const lm = findLandmarks(text, null)[0];
    if (inDistrict(lm)) return { lat: lm.lat, lng: lm.lng, approx: true };
    const town = findTown(text);
    if (inDistrict(town)) return { lat: town!.lat, lng: town!.lng, approx: true };
  }
  const c = DISTRICT_CENTRE[district];
  return c ? { ...c, approx: true } : null;
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
  te: number[];       // event end, epoch minutes (0 = none / not an event)
}

/** One decoded point, as the client works with it. */
export interface ExplorerPoint {
  id: string; slug: string; type: string; cat: string; district: string | null; subtype: string | null;
  price: string | null; lat: number; lng: number; flags: number; rating: number | null; ratingCount: number;
  rank: number; priceFrom: number | null; date: string | null; end: string | null;
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
export function buildIndex(
  listings: IndexListingRow[], events: IndexEventRow[], builtIso: string, activities: IndexActivityRow[] = [], venues?: VenueLookup,
): ExplorerIndex {
  const cats = new Dict(), districts = new Dict(), subtypes = new Dict(), prices = new Dict(), types = new Dict();
  const ix: ExplorerIndex = {
    v: INDEX_VERSION, built: builtIso, n: 0, cats: cats.list, districts: districts.list, subtypes: subtypes.list,
    prices: prices.list, types: types.list,
    id: [], ty: [], lat: [], lng: [], c: [], d: [], s: [], p: [], f: [], r: [], rc: [], k: [], pf: [], t: [], te: [],
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
    ix.t.push(0); ix.te.push(0);
  }
  const stacked = new Map<string, number>(); // events sharing one spot
  for (const ev of events) {
    const start = ev.starts_at ? Date.parse(ev.starts_at) : NaN;
    if (!ev.slug || !Number.isFinite(start)) continue;
    const pt = placeEvent(ev, venues);
    if (!pt) continue;
    // Several events at one spot (a theatre's season; events placed at the same town /
    // district centre) fan out on a small spiral so each keeps its own pin: ≈40 m steps
    // at a real venue, ≈150 m in an approximate area.
    const key = `${pt.lat.toFixed(4)},${pt.lng.toFixed(4)}`;
    const n = stacked.get(key) || 0; stacked.set(key, n + 1);
    if (n > 0) { const r = (pt.approx ? 0.0016 : 0.0004) * Math.sqrt(n); const a = n * 2.39996; pt.lat += r * Math.sin(a); pt.lng += r * Math.cos(a) * 1.2; }
    const end = ev.ends_at ? Date.parse(ev.ends_at) : NaN;
    const id = `e:${ev.slug}`;
    if (seen.has(id)) continue;
    seen.add(id);
    ix.id.push(id);
    ix.ty.push(types.idx('event'));
    ix.lat.push(round5(pt.lat)); ix.lng.push(round5(pt.lng));
    ix.c.push(cats.idx(EVENT_CAT));
    ix.d.push(districts.idx(ev.district ? ev.district.toLowerCase() : null));
    ix.s.push(-1); ix.p.push(-1);
    ix.f.push(F.PUBLISHED | F.EVENT | (ev.image ? F.IMAGE : 0) | (pt.approx ? F.APPROX : 0));
    ix.r.push(0); ix.rc.push(0); ix.k.push(0); ix.pf.push(0);
    ix.t.push(Math.round(start / 60000));
    ix.te.push(Number.isFinite(end) && end >= start ? Math.round(end / 60000) : 0);
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
    ix.t.push(0); ix.te.push(0);
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
      end: ix.te && ix.te[i] ? new Date(ix.te[i] * 60000).toISOString() : null,
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

// ---- Details (the on-screen cards and the popup) ------------------------------------
export interface ExplorerDetail {
  id: string; name: string; image: string | null; address: string | null;
  phone: string | null; url: string | null; href: string | null; summary: string | null;
  priceTo: number | null; venue: string | null; endDate: string | null; eventPrice: string | null;
  // Everything else we hold for a business (popup)
  photos?: string[]; email?: string | null; socials?: Record<string, string>; hours?: Record<string, string> | null;
  amenities?: string[]; claimed?: boolean; claimHref?: string | null; own?: { avg: number; count: number } | null;
  startDate?: string | null;
  // Bookable experiences (our catalogue; link-out booking with the partner)
  book?: string | null; duration?: string | null; basis?: string | null; tags?: string[];
  provider?: string | null; approx?: boolean;
}

export const SOCIAL_ORDER = ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x', 'whatsapp'] as const;
export const HOUR_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
const EMAIL_OK = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/** A phone number as dialled: digits, +, spaces, dashes, dots, brackets; 6–30 chars. */
export function cleanPhone(v: unknown): string | null {
  const s = String(v ?? '').split(/[;,/|]|\s{2,}/)[0].trim();
  if (!/^[+()\d][\d\s().-]{5,29}$/.test(s) || (s.match(/\d/g) || []).length < 6) return null;
  return s;
}
export function cleanEmail(v: unknown): string | null {
  const s = String(v ?? '').trim().replace(/^mailto:/i, '').split(/[\s,;]+/)[0].toLowerCase();
  return EMAIL_OK.test(s) && s.length <= 120 ? s : null;
}
/** Photo URLs from image / owned_photos / gallery (strings or {url|src}), de-duplicated, http(s) only. */
export function photoList(...sources: unknown[]): string[] {
  const out: string[] = [];
  const add = (v: unknown) => {
    const u = safeUrl(typeof v === 'string' ? v : (v && typeof v === 'object' ? ((v as Record<string, unknown>).url ?? (v as Record<string, unknown>).src) : null));
    if (u && !out.includes(u)) out.push(u);
  };
  for (const src of sources) {
    let v = src;
    if (typeof v === 'string' && v.trim().startsWith('[')) { try { v = JSON.parse(v); } catch { /* plain string */ } }
    if (Array.isArray(v)) v.forEach(add); else add(v);
  }
  return out.slice(0, 8);
}
function socialsOf(v: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  const src = v as Record<string, unknown>;
  for (const k of SOCIAL_ORDER) {
    const raw = src[k] ?? (k === 'x' ? src.twitter : undefined);
    const u = safeUrl(raw);
    if (u) out[k] = u;
  }
  return out;
}
function hoursOf(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const src = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const d of HOUR_DAYS) { const t = String(src[d] ?? '').trim().slice(0, 40); if (t) out[d] = t; }
  return Object.keys(out).length ? out : null;
}

/** directory_listings row → everything we show about a business on the map. */
export function listingDetail(r: Record<string, unknown>, locale: string, prefix: string): ExplorerDetail {
  const published = String(r.status) === 'published';
  const slug = String(r.slug || '');
  const type = String(r.type || 'vendor');
  const photos = photoList(r.image, r.owned_photos, r.gallery);
  const claimed = String(r.provenance || '') === 'owner-verified' || !!r.claimed_at;
  const amenities = Array.isArray(r.amenities) ? (r.amenities as unknown[]).map((a) => String(a ?? '').trim()).filter(Boolean).slice(0, 12) : [];
  return {
    id: slug,
    name: String(r[`name_${locale}`] || r.name_en || slug),
    image: photos[0] || null,
    photos,
    address: (r.address as string) || null,
    phone: cleanPhone(r.phone),
    email: cleanEmail(r.email),
    url: safeUrl(r.url),
    socials: socialsOf(r.socials),
    hours: hoursOf(r.hours),
    amenities,
    href: published ? `${prefix}/directory/${type}/${slug}` : null, // 'listed' rows have no profile page
    summary: String(r[`summary_${locale}`] || r.summary_en || '').trim() || null,
    priceTo: num(r.price_to),
    claimed,
    claimHref: claimed ? null : `${prefix}/partner?listing=${encodeURIComponent(slug)}`,
    own: null,
    venue: null, endDate: null, eventPrice: null,
  };
}

/** events row → public card details. */
export function eventDetail(r: Record<string, unknown>, locale: string, prefix: string): ExplorerDetail {
  const slug = String(r.slug || '');
  const own = cyprusPoint(r.lat, r.lng);
  return {
    id: `e:${slug}`,
    name: String(r[`title_${locale}`] || r.title_en || slug),
    image: safeUrl(r.image),
    photos: photoList(r.image),
    address: (r.venue as string) || null,
    phone: null,
    url: safeUrl(r.url),
    href: `${prefix}/agenda/${slug}`,
    summary: String(r[`summary_${locale}`] || r.summary_en || '') || null,
    priceTo: null,
    venue: (r.venue as string) || null,
    startDate: (r.starts_at as string) || null,
    endDate: (r.ends_at as string) || null,
    eventPrice: (r.price as string) || null,
    approx: !own || r.coords_precision === 'town',
  };
}

/** Raw mean of approved first-party reviews per listing (what a guest expects to read). */
export function ownRatings(rows: { listing_slug: unknown; rating: unknown }[]): Map<string, { avg: number; count: number }> {
  const acc = new Map<string, { s: number; n: number }>();
  for (const r of rows) {
    const k = String(r.listing_slug || ''); const v = Number(r.rating);
    if (!k || !(v >= 1 && v <= 5)) continue;
    const a = acc.get(k) || { s: 0, n: 0 }; a.s += v; a.n++; acc.set(k, a);
  }
  return new Map([...acc].map(([k, a]) => [k, { avg: Math.round((a.s / a.n) * 10) / 10, count: a.n }]));
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
