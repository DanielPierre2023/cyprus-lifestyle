// app/sitemaps/[segment]/route.ts
// ---------------------------------------------------------------------------
// Child sitemaps referenced by the /sitemap.xml index. Each returns a <urlset>
// with hreflang alternates (7 editions + x-default) for every URL. Segments:
//   • pages          — static / marketing routes
//   • hubs           — directory type hubs, category-group hubs, best-of
//                      collections, practical guides, and audience markets
//   • articles-<n>   — published articles, chunk n
//   • listings-<n>   — published directory listings, chunk n
// All DB reads are read-only and best-effort; a failed read yields a smaller
// (still valid) sitemap rather than an error.
import { DIRECTORY_TYPES } from '@/lib/queries';
import {
  urlsetXml,
  listingChunkEntries,
  articleChunkEntries,
  type UrlEntry,
} from '@/lib/seo/sitemap';

// Regenerate at most daily — sitemaps do not need to be fresh to the second.
export const revalidate = 86_400;

const XML_HEADERS = { 'Content-Type': 'application/xml; charset=utf-8' } as const;

// Static / marketing routes (mirrors the previous single-file sitemap).
const STATIC_PATHS = [
  '/', '/property', '/relocation', '/culture', '/cyprus', '/business', '/escapes',
  '/table', '/agenda', '/people', '/world', '/directory', '/luxury', '/ask',
  '/guide', '/for', '/when-to-visit', '/membership', '/about', '/advertise',
  '/contact', '/standards', '/privacy', '/sourcing', '/partner',
];

async function pagesEntries(): Promise<UrlEntry[]> {
  return STATIC_PATHS.map((path) => ({ path }));
}

async function hubsEntries(): Promise<UrlEntry[]> {
  const entries: UrlEntry[] = [];
  // Directory type hubs — always available (static list).
  for (const tp of DIRECTORY_TYPES) entries.push({ path: `/directory/${tp}` });
  // Practical guides (one per knowledge-base intent) and audience markets — static.
  try {
    const { ALL_INTENTS, guideHref } = await import('@/lib/knowledge/qa');
    for (const h of ALL_INTENTS) entries.push({ path: guideHref(h.item.id) });
  } catch { /* skip */ }
  try {
    const { MARKET_IDS } = await import('@/lib/knowledge/markets');
    for (const id of MARKET_IDS) entries.push({ path: `/for/${id}` });
  } catch { /* skip */ }
  // Category-group hubs (12-group taxonomy) with published listings — DB-backed.
  try {
    const { getGroupCounts } = await import('@/lib/queries');
    const { GROUP_KEYS } = await import('@/lib/taxonomy');
    const gc = await getGroupCounts();
    for (const g of GROUP_KEYS) if ((gc[g] || 0) > 0) entries.push({ path: `/directory/g/${g}` });
  } catch { /* skip */ }
  // Programmatic best-of collections ("best restaurants in Paphos", …) — DB-backed.
  try {
    const { getCollectionFacets } = await import('@/lib/queries');
    for (const f of await getCollectionFacets()) entries.push({ path: `/best/${f.slug}` });
  } catch { /* skip */ }
  return entries;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ segment: string }> },
): Promise<Response> {
  const { segment } = await ctx.params;

  let entries: UrlEntry[] | null = null;
  if (segment === 'pages') {
    entries = await pagesEntries();
  } else if (segment === 'hubs') {
    entries = await hubsEntries();
  } else {
    const listings = /^listings-(\d+)$/.exec(segment);
    const articles = /^articles-(\d+)$/.exec(segment);
    if (listings) entries = await listingChunkEntries(Number(listings[1]));
    else if (articles) entries = await articleChunkEntries(Number(articles[1]));
  }

  if (!entries) return new Response('Not found', { status: 404 });
  return new Response(urlsetXml(entries), { headers: XML_HEADERS });
}
