// app/sitemap.xml/route.ts
// ---------------------------------------------------------------------------
// The sitemap INDEX, served at the well-known /sitemap.xml (the URL robots.ts
// advertises). It lists every child sitemap: the static pages, the hubs, and
// as many chunked article / listing sitemaps as the published row counts
// require (~17k listings → chunked at CHUNK URLs each). Children live under
// /sitemaps/<segment> (app/sitemaps/[segment]/route.ts).
//
// This replaces the former app/sitemap.ts single <urlset>, which the metadata
// convention caps at one file (and which silently truncated at Supabase's
// ~1000-row request limit).
import { sitemapIndexXml, chunkCount, childSitemapUrl } from '@/lib/seo/sitemap';

export const revalidate = 3_600;

const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' } as const;

export async function GET(): Promise<Response> {
  const now = new Date().toISOString();
  const children: { loc: string; lastmod?: string }[] = [
    { loc: childSitemapUrl('pages'), lastmod: now },
    { loc: childSitemapUrl('hubs'), lastmod: now },
    // Google News sitemap (trailing-48h articles); loc = `${SITE_URL}/sitemaps/news`.
    { loc: childSitemapUrl('news'), lastmod: now },
  ];

  // One child per chunk of published articles / listings. Counts are best-effort:
  // if the DB is unreachable they come back 0 and the index still lists the
  // static children, so /sitemap.xml is always valid.
  const [articleChunks, listingChunks] = await Promise.all([
    chunkCount('blog_posts'),
    chunkCount('directory_listings'),
  ]);
  for (let i = 0; i < articleChunks; i++) children.push({ loc: childSitemapUrl(`articles-${i}`), lastmod: now });
  for (let i = 0; i < listingChunks; i++) children.push({ loc: childSitemapUrl(`listings-${i}`), lastmod: now });

  return new Response(sitemapIndexXml(children), { headers: XML_HEADERS });
}
