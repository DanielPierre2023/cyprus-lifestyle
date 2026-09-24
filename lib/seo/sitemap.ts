// lib/seo/sitemap.ts
// ---------------------------------------------------------------------------
// Shared, server-only helpers for the sitemap INDEX (app/sitemap.xml) and its
// chunked child sitemaps (app/sitemaps/[segment]). Everything here is read-only
// and additive — no schema, no writes, no new columns.
//
// Why hand-rolled XML instead of the app/sitemap.ts metadata convention?
//   • The convention can only emit a single <urlset>, never a <sitemapindex>.
//   • next-intl `generateSitemaps` would relocate /sitemap.xml to
//     /sitemap/[id].xml, breaking the well-known path that robots.ts advertises.
//   • ~17k listings × 7 locales must be split across files (≤50k URLs / ≤50MB
//     each) and Supabase caps a single request at ~1000 rows, so each chunk is
//     paginated internally.
import 'server-only';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';
import { SITE_URL, urlFor } from '@/lib/seo';
import { supabaseAdmin } from '@/lib/supabase/admin';

/** Max URLs per child sitemap. Kept well under the 50k / 50MB hard limits — with
 *  seven hreflang alternates per URL a file of this size is ~10MB. */
export const CHUNK = 10_000;
/** Supabase returns at most ~1000 rows per request; we page within a chunk. */
const PAGE = 1_000;

type PublishedTable = 'directory_listings' | 'blog_posts';

export function xmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface UrlEntry {
  /** Locale-agnostic path, e.g. '/directory/restaurant/some-slug'. */
  path: string;
  lastmod?: string | Date | null;
  /** Optional representative image (absolute URL) for the image sitemap. */
  image?: string | null;
}

// One <url> per path: the default-locale URL as <loc>, with an <xhtml:link>
// alternate for every edition plus x-default (the multilingual sitemap pattern
// Google documents).
function urlXml(e: UrlEntry): string {
  const loc = xmlEscape(urlFor(DEFAULT_LOCALE, e.path));
  let s = `<url>\n<loc>${loc}</loc>\n`;
  for (const l of LOCALES) {
    s += `<xhtml:link rel="alternate" hreflang="${l}" href="${xmlEscape(urlFor(l, e.path))}"/>\n`;
  }
  s += `<xhtml:link rel="alternate" hreflang="x-default" href="${loc}"/>\n`;
  if (e.lastmod) {
    const d = e.lastmod instanceof Date ? e.lastmod : new Date(e.lastmod);
    if (!Number.isNaN(d.getTime())) s += `<lastmod>${d.toISOString()}</lastmod>\n`;
  }
  if (e.image) {
    s += `<image:image><image:loc>${xmlEscape(e.image)}</image:loc></image:image>\n`;
  }
  return s + '</url>\n';
}

export function urlsetXml(entries: UrlEntry[]): string {
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n';
  s += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n';
  for (const e of entries) s += urlXml(e);
  return s + '</urlset>\n';
}

export function sitemapIndexXml(children: { loc: string; lastmod?: string }[]): string {
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n';
  s += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const c of children) {
    s += `<sitemap>\n<loc>${xmlEscape(c.loc)}</loc>\n`;
    if (c.lastmod) s += `<lastmod>${c.lastmod}</lastmod>\n`;
    s += '</sitemap>\n';
  }
  return s + '</sitemapindex>\n';
}

/** Absolute URL of a child sitemap segment (e.g. 'listings-0'). */
export function childSitemapUrl(segment: string): string {
  return `${SITE_URL}/sitemaps/${segment}`;
}

/** Read-only count of published rows in a table (best-effort). */
export async function countPublished(table: PublishedTable): Promise<number> {
  try {
    const { count } = await supabaseAdmin()
      .from(table)
      .select('id', { count: 'exact', head: true })
      .eq('status', 'published');
    return count || 0;
  } catch {
    return 0;
  }
}

/** Number of child sitemaps needed for a table's published rows. */
export async function chunkCount(table: PublishedTable): Promise<number> {
  return Math.ceil((await countPublished(table)) / CHUNK);
}

// Fetch one chunk [chunk*CHUNK, chunk*CHUNK + CHUNK) of published rows, paging in
// PAGE-sized requests to defeat Supabase's per-request row cap. Best-effort: on
// any error it returns whatever it has gathered so far, so the sitemap route
// never throws (a partial/empty child is still valid XML).
async function fetchChunk(
  table: PublishedTable,
  select: string,
  chunk: number,
  toEntry: (r: Record<string, unknown>) => UrlEntry,
): Promise<UrlEntry[]> {
  const start = chunk * CHUNK;
  const end = start + CHUNK; // exclusive
  const out: UrlEntry[] = [];
  try {
    const sb = supabaseAdmin();
    for (let offset = start; offset < end; ) {
      const to = Math.min(offset + PAGE, end) - 1; // inclusive
      const want = to - offset + 1;
      const { data, error } = await sb
        .from(table)
        .select(select)
        .eq('status', 'published')
        .order('slug', { ascending: true })
        .range(offset, to);
      if (error) break;
      const rows = (data || []) as unknown as Record<string, unknown>[];
      for (const r of rows) out.push(toEntry(r));
      offset += rows.length;
      if (rows.length < want) break; // reached the end of the table
    }
  } catch {
    /* return what we have */
  }
  return out;
}

/** Published directory listings for child sitemap `listings-<chunk>`. */
export function listingChunkEntries(chunk: number): Promise<UrlEntry[]> {
  return fetchChunk('directory_listings', 'slug, type, updated_at, image', chunk, (r) => ({
    path: `/directory/${String(r.type)}/${String(r.slug)}`,
    lastmod: (r.updated_at as string) ?? null,
    image: (r.image as string) ?? null,
  }));
}

/** Published articles for child sitemap `articles-<chunk>`. */
export function articleChunkEntries(chunk: number): Promise<UrlEntry[]> {
  return fetchChunk('blog_posts', 'slug, published_at, updated_at, cover_image', chunk, (r) => ({
    path: `/article/${String(r.slug)}`,
    lastmod: (r.updated_at as string) ?? (r.published_at as string) ?? null,
    image: (r.cover_image as string) ?? null,
  }));
}
