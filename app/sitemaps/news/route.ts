// app/sitemaps/news/route.ts
// ---------------------------------------------------------------------------
// Google News sitemap: the articles published in the last 48 hours, in the
// News schema Google's Publisher Center expects (a <urlset> carrying the
// sitemap-news/0.9 namespace). It is registered as an extra child of the
// /sitemap.xml index.
//
// Google News only ingests URLs from the previous ~48h and caps a News sitemap
// at 1,000 URLs, so we query exactly that window. All reads are read-only and
// best-effort: any DB failure yields an empty (still valid) <urlset> rather
// than throwing, so the route can never break the crawl.
import { SITE_NAME, urlFor } from '@/lib/seo';
import { xmlEscape } from '@/lib/seo/sitemap';
import { supabaseAdmin } from '@/lib/supabase/admin';

// News moves fast — refresh far more often than the daily content sitemaps.
export const revalidate = 900;

const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' } as const;

// Google News ingestion window: the trailing 48 hours.
const WINDOW_MS = 48 * 60 * 60 * 1000;

interface NewsRow {
  slug: string | null;
  published_at: string | null;
  title_en: string | null;
}

/** Published articles from the last 48h, newest first (best-effort). */
async function recentArticles(): Promise<NewsRow[]> {
  try {
    const since = new Date(Date.now() - WINDOW_MS).toISOString();
    const { data, error } = await supabaseAdmin()
      .from('blog_posts')
      .select('slug, published_at, title_en')
      .eq('status', 'published')
      .gte('published_at', since)
      .order('published_at', { ascending: false })
      .limit(1000);
    if (error) return [];
    return (data || []) as unknown as NewsRow[];
  } catch {
    return [];
  }
}

function newsUrlsetXml(rows: NewsRow[]): string {
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n';
  s += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n';
  for (const r of rows) {
    if (!r.slug || !r.published_at) continue;
    const d = new Date(r.published_at);
    if (Number.isNaN(d.getTime())) continue;
    const loc = xmlEscape(urlFor('en', `/article/${r.slug}`));
    const title = xmlEscape(r.title_en || r.slug);
    s += `<url>\n<loc>${loc}</loc>\n`;
    s += '<news:news>\n';
    s += '<news:publication>\n';
    s += `<news:name>${xmlEscape(SITE_NAME)}</news:name>\n`;
    s += '<news:language>en</news:language>\n';
    s += '</news:publication>\n';
    s += `<news:publication_date>${d.toISOString()}</news:publication_date>\n`;
    s += `<news:title>${title}</news:title>\n`;
    s += '</news:news>\n';
    s += '</url>\n';
  }
  return s + '</urlset>\n';
}

export async function GET(): Promise<Response> {
  const rows = await recentArticles();
  return new Response(newsUrlsetXml(rows), { headers: XML_HEADERS });
}
