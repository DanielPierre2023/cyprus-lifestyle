// Cyprus Lifestyle — read helpers for the public site. Reads only PUBLISHED
// posts, projecting the fields for the active locale (falling back to English).
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Locale } from '@/lib/locales';

export interface Card {
  id: string; slug: string; title: string; excerpt: string; category: string | null;
  cover_image: string | null; cover_image_credit: string | null; author_name: string | null;
  author_slug: string | null;
  published_at: string | null; reading_time_min: number | null;
}
export interface Article extends Card {
  content: string; summary: string; tags: string[]; county: string | null;
  seo_title: string; seo_description: string; source_url: string | null; updated_at: string | null;
  sponsored: boolean; sponsor_name: string | null; sponsor_url: string | null;
}

function pick(r: Record<string, unknown>, base: string, locale: Locale): string {
  return String(r[`${base}_${locale}`] || r[`${base}_en`] || '');
}

const CARD_COLS = (l: Locale) =>
  `id, slug, category, cover_image, cover_image_credit, author_name, published_at, reading_time_min, title_${l}, title_en, excerpt_${l}, excerpt_en, author:authors(slug)`;

function toCard(r: Record<string, unknown>, l: Locale): Card {
  return {
    id: String(r.id), slug: String(r.slug), category: (r.category as string) ?? null,
    cover_image: (r.cover_image as string) ?? null, cover_image_credit: (r.cover_image_credit as string) ?? null,
    author_name: (r.author_name as string) ?? null,
    author_slug: ((r.author as { slug?: string } | null)?.slug) ?? null,
    published_at: (r.published_at as string) ?? null,
    reading_time_min: (r.reading_time_min as number) ?? null,
    title: pick(r, 'title', l), excerpt: pick(r, 'excerpt', l),
  };
}

export async function getLatest(locale: Locale, limit = 9, offset = 0): Promise<Card[]> {
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published').order('published_at', { ascending: false }).range(offset, offset + limit - 1);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toCard(r, locale)).filter((c) => c.title);
}

export async function getFeatured(locale: Locale): Promise<Card | null> {
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published').eq('is_breaking', true).order('published_at', { ascending: false }).limit(1);
  const rows = (data || []) as unknown as Record<string, unknown>[];
  if (rows.length) return toCard(rows[0], locale);
  const latest = await getLatest(locale, 1);
  return latest[0] || null;
}

export async function getByCategory(locale: Locale, category: string, limit = 18): Promise<Card[]> {
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published').eq('category', category).order('published_at', { ascending: false }).limit(limit);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toCard(r, locale)).filter((c) => c.title);
}

export async function searchArticles(locale: Locale, q: string, limit = 24): Promise<Card[]> {
  const query = (q || '').trim();
  if (query.length < 2) return [];
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published')
    .textSearch('search_document', query, { type: 'websearch', config: 'simple' })
    .order('published_at', { ascending: false }).limit(limit);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toCard(r, locale)).filter((c) => c.title);
}

export async function getArticle(locale: Locale, slug: string): Promise<Article | null> {
  const l = locale;
  const cols = `id, slug, category, county, cover_image, cover_image_credit, author_name, published_at, updated_at, reading_time_min, source_url,
    sponsored, sponsor_name, sponsor_url,
    title_${l}, title_en, excerpt_${l}, excerpt_en, summary_${l}, summary_en, content_${l}, content_en,
    seo_title_${l}, seo_title_en, seo_description_${l}, seo_description_en, tags_${l}, tags_en, author:authors(slug)`;
  const { data } = await supabaseAdmin().from('blog_posts').select(cols)
    .eq('status', 'published').eq('slug', slug).maybeSingle();
  if (!data) return null;
  const r = data as unknown as Record<string, unknown>;
  const tags = (r[`tags_${l}`] as string[]) || (r.tags_en as string[]) || [];
  return {
    ...toCard(r, l),
    county: (r.county as string) ?? null,
    content: pick(r, 'content', l),
    summary: pick(r, 'summary', l),
    seo_title: pick(r, 'seo_title', l) || pick(r, 'title', l),
    seo_description: pick(r, 'seo_description', l) || pick(r, 'excerpt', l),
    source_url: (r.source_url as string) ?? null,
    updated_at: (r.updated_at as string) ?? null,
    tags: Array.isArray(tags) ? tags : [],
    sponsored: Boolean(r.sponsored),
    sponsor_name: (r.sponsor_name as string) ?? null,
    sponsor_url: (r.sponsor_url as string) ?? null,
  };
}

// ── Directory / listings ─────────────────────────────────────────────────────
export const DIRECTORY_TYPES = ['restaurant', 'winery', 'development', 'hotel', 'beach', 'vendor'] as const;
export type DirectoryType = typeof DIRECTORY_TYPES[number];
export interface Listing {
  id: string; slug: string; type: string; district: string | null;
  name: string; summary: string; address: string | null;
  lat: number | null; lng: number | null; price_band: string | null;
  url: string | null; phone: string | null; image: string | null;
  tags: string[]; featured: boolean; verified: boolean;
}
const LISTING_COLS = (l: Locale) =>
  `id, slug, type, district, address, lat, lng, price_band, url, phone, image, tags, featured, verified, name_${l}, name_en, summary_${l}, summary_en`;
function toListing(r: Record<string, unknown>, l: Locale): Listing {
  return {
    id: String(r.id), slug: String(r.slug), type: String(r.type), district: (r.district as string) ?? null,
    name: pick(r, 'name', l), summary: pick(r, 'summary', l),
    address: (r.address as string) ?? null,
    lat: (r.lat as number) ?? null, lng: (r.lng as number) ?? null,
    price_band: (r.price_band as string) ?? null, url: (r.url as string) ?? null,
    phone: (r.phone as string) ?? null, image: (r.image as string) ?? null,
    tags: (r.tags as string[]) ?? [], featured: Boolean(r.featured), verified: Boolean(r.verified),
  };
}
export async function getListings(locale: Locale, type?: string, limit = 200): Promise<Listing[]> {
  let q = supabaseAdmin().from('directory_listings').select(LISTING_COLS(locale)).eq('status', 'published');
  if (type) q = q.eq('type', type);
  const { data } = await q.order('featured', { ascending: false }).order('name_en', { ascending: true }).limit(limit);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toListing(r, locale)).filter((x) => x.name);
}
// ALL published listings of a type (or all types), paginated past PostgREST's
// 1000-row cap. The category page uses this so nothing is hidden by a limit —
// getListings (limit 200) stays for previews.
export async function getAllListings(locale: Locale, type?: string): Promise<Listing[]> {
  const out: Listing[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    let q = supabaseAdmin().from('directory_listings').select(LISTING_COLS(locale)).eq('status', 'published');
    if (type) q = q.eq('type', type);
    const { data } = await q.order('featured', { ascending: false }).order('name_en', { ascending: true }).range(from, from + PAGE - 1);
    const rows = (data || []) as unknown as Record<string, unknown>[];
    out.push(...rows.map((r) => toListing(r, locale)).filter((x) => x.name));
    if (rows.length < PAGE) break;
  }
  return out;
}
export async function getListing(locale: Locale, slug: string): Promise<Listing | null> {
  const { data } = await supabaseAdmin().from('directory_listings').select(LISTING_COLS(locale))
    .eq('status', 'published').eq('slug', slug).maybeSingle();
  return data ? toListing(data as unknown as Record<string, unknown>, locale) : null;
}

// ── Events / Agenda ──────────────────────────────────────────────────────────
export interface EventItem {
  id: string; slug: string; district: string | null;
  title: string; summary: string; venue: string | null;
  starts_at: string; ends_at: string | null; price: string | null;
  url: string | null; image: string | null; lat: number | null; lng: number | null; tags: string[];
}
const EVENT_COLS = (l: Locale) =>
  `id, slug, district, venue, starts_at, ends_at, price, url, image, lat, lng, tags, title_${l}, title_en, summary_${l}, summary_en`;
function toEvent(r: Record<string, unknown>, l: Locale): EventItem {
  return {
    id: String(r.id), slug: String(r.slug), district: (r.district as string) ?? null,
    title: pick(r, 'title', l), summary: pick(r, 'summary', l), venue: (r.venue as string) ?? null,
    starts_at: String(r.starts_at), ends_at: (r.ends_at as string) ?? null, price: (r.price as string) ?? null,
    url: (r.url as string) ?? null, image: (r.image as string) ?? null,
    lat: (r.lat as number) ?? null, lng: (r.lng as number) ?? null, tags: (r.tags as string[]) ?? [],
  };
}
export async function getUpcomingEvents(locale: Locale, limit = 60): Promise<EventItem[]> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data } = await supabaseAdmin().from('events').select(EVENT_COLS(locale))
    .eq('status', 'published').gte('starts_at', start.toISOString())
    .order('featured', { ascending: false }).order('starts_at', { ascending: true }).limit(limit);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toEvent(r, locale)).filter((e) => e.title);
}

export async function getEventBySlug(locale: Locale, slug: string): Promise<EventItem | null> {
  const { data } = await supabaseAdmin().from('events').select(EVENT_COLS(locale))
    .eq('status', 'published').eq('slug', slug).maybeSingle();
  return data ? toEvent(data as unknown as Record<string, unknown>, locale) : null;
}

// A few published listings in the same district — "while you're in …" cross-links.
export async function getListingsByDistrict(locale: Locale, district: string, limit = 6): Promise<Listing[]> {
  const { data } = await supabaseAdmin().from('directory_listings').select(LISTING_COLS(locale))
    .eq('status', 'published').eq('district', district)
    .order('featured', { ascending: false }).limit(limit);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toListing(r, locale));
}

// Everything with coordinates, for the live map — published listings + upcoming events.
export interface MapItem { id: string; name: string; type: string; district: string | null; lat: number; lng: number; href: string; }

// Cyprus bounding box (a little generous around the island). Rows whose lat/lng are
// outside it are either genuinely wrong (dropped) or stored swapped — a common
// import mistake that lands points in the sea — which we recover by flipping them.
function cyprusCoord(lat: number, lng: number): { lat: number; lng: number } | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const inBox = (a: number, b: number) => a >= 34.4 && a <= 35.9 && b >= 32.0 && b <= 34.7;
  if (inBox(lat, lng)) return { lat, lng };
  if (inBox(lng, lat)) return { lat: lng, lng: lat }; // lat/lng were swapped → recover
  return null; // off the island → drop rather than draw a pin in the water
}

// Page past PostgREST's 1000-row cap to fetch coordinates for EVERY published
// listing (thousands), not just the first page. Bounds-guarded via cyprusCoord.
async function allPublishedListingCoords(locale: Locale): Promise<Record<string, any>[]> {
  const sb = supabaseAdmin();
  const rows: Record<string, any>[] = [];
  const page = 1000;
  for (let from = 0; from < 12000; from += page) {
    const { data } = await sb.from('directory_listings')
      .select(`slug, type, district, lat, lng, image, name_${locale}, name_en`)
      .eq('status', 'published').not('lat', 'is', null)
      .order('slug').range(from, from + page - 1);
    const batch = (data || []) as Record<string, any>[];
    rows.push(...batch);
    if (batch.length < page) break;
  }
  return rows;
}

export async function getMapItems(locale: Locale): Promise<MapItem[]> {
  const sb = supabaseAdmin();
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const items: MapItem[] = [];
  for (const r of await allPublishedListingCoords(locale)) {
    const c = cyprusCoord(Number(r.lat), Number(r.lng));
    if (!c) continue;
    items.push({ id: `l-${r.slug}`, name: r[`name_${locale}`] || r.name_en || r.slug, type: String(r.type || 'vendor'), district: r.district ?? null, lat: c.lat, lng: c.lng, href: `/directory/${r.type}/${r.slug}` });
  }
  const { data: E } = await sb.from('events').select(`slug, district, lat, lng, starts_at, title_${locale}, title_en`)
    .eq('status', 'published').gte('starts_at', start.toISOString()).not('lat', 'is', null).limit(500);
  for (const r of ((E || []) as Record<string, any>[])) {
    const c = cyprusCoord(Number(r.lat), Number(r.lng));
    if (!c) continue;
    items.push({ id: `e-${r.slug}`, name: r[`title_${locale}`] || r.title_en || r.slug, type: 'event', district: r.district ?? null, lat: c.lat, lng: c.lng, href: `/agenda/${r.slug}` });
  }
  return items;
}

// Directory landing map — every published listing as a point (paginated, bounds-guarded).
export async function getDirectoryMapPoints(locale: Locale): Promise<{ lat: number; lng: number; name: string; type: string; slug: string; image: string | null }[]> {
  const out: { lat: number; lng: number; name: string; type: string; slug: string; image: string | null }[] = [];
  for (const r of await allPublishedListingCoords(locale)) {
    const c = cyprusCoord(Number(r.lat), Number(r.lng));
    if (!c) continue;
    out.push({ lat: c.lat, lng: c.lng, name: r[`name_${locale}`] || r.name_en || r.slug, type: String(r.type || 'vendor'), slug: String(r.slug), image: (r.image as string) ?? null });
  }
  return out;
}

// True published head-count per directory type (uncapped), for the category chips.
export async function getDirectoryCounts(): Promise<Record<string, number>> {
  const sb = supabaseAdmin();
  const out: Record<string, number> = {};
  await Promise.all(DIRECTORY_TYPES.map(async (ty) => {
    const { count } = await sb.from('directory_listings').select('id', { count: 'exact', head: true }).eq('status', 'published').eq('type', ty);
    out[ty] = count || 0;
  }));
  return out;
}

export interface Banner { id: string; advertiser_name: string; headline: string; body: string; cta: string; url: string; image_url: string | null; bg_color: string; accent_color: string }
export async function getBanner(locale: Locale, slot = 'sidebar-homepage'): Promise<Banner | null> {
  const l = locale;
  const { data } = await supabaseAdmin().from('sponsor_banners')
    .select(`id, advertiser_name, url, image_url, bg_color, accent_color, headline_${l}, headline_en, body_${l}, body_en, cta_${l}, cta_en`)
    .eq('slot', slot).eq('is_active', true).order('weight', { ascending: false }).limit(1);
  const rows = (data || []) as unknown as Record<string, unknown>[];
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: String(r.id), advertiser_name: String(r.advertiser_name || ''), url: String(r.url || '#'),
    image_url: (r.image_url as string) ?? null, bg_color: String(r.bg_color || '#0B0E11'), accent_color: String(r.accent_color || '#C9A24C'),
    headline: pick(r, 'headline', l), body: pick(r, 'body', l), cta: pick(r, 'cta', l),
  };
}

export interface Author {
  id: string; slug: string; name: string; title: string; bio: string; specialties: string[];
}

export async function getAuthor(locale: Locale, slug: string): Promise<Author | null> {
  const l = locale;
  const { data } = await supabaseAdmin().from('authors')
    .select(`id, slug, specialties, name_${l}, name_en, title_${l}, title_en, bio_${l}, bio_en`)
    .eq('slug', slug).eq('active', true).maybeSingle();
  if (!data) return null;
  const r = data as unknown as Record<string, unknown>;
  return {
    id: String(r.id), slug: String(r.slug),
    name: pick(r, 'name', l), title: pick(r, 'title', l), bio: pick(r, 'bio', l),
    specialties: Array.isArray(r.specialties) ? (r.specialties as string[]) : [],
  };
}

export async function getByAuthor(locale: Locale, authorId: string, limit = 24): Promise<Card[]> {
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published').eq('author_id', authorId).order('published_at', { ascending: false }).limit(limit);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toCard(r, locale)).filter((c) => c.title);
}
