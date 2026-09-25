// app/sitemaps/news/route.ts
// ---------------------------------------------------------------------------
// Google News sitemap (articles from the last ~48h, in the sitemap-news schema).
// In practice the sibling dynamic route /sitemaps/[segment] resolves this path
// (segment === 'news') and serves the same output; this static route is kept as
// a thin, identical delegate so the endpoint is correct whichever one Next.js
// routes to. Both call the single builder in '@/lib/seo/sitemap'.
import { newsChildXml } from '@/lib/seo/sitemap';

export const revalidate = 900;

export async function GET(): Promise<Response> {
  return new Response(await newsChildXml(), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
}
