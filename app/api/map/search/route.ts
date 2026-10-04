// GET /api/map/search?q=<text>&locale=<loc>
// Business / event NAME suggestions for the map's search box (categories and
// districts are matched client-side; addresses go to /api/map/geocode).
// Rate-limited per IP; short CDN cache.
import { NextRequest, NextResponse } from 'next/server';
import { searchExplorer } from '@/lib/map/explorer-data';
import { rateLimit } from '@/lib/ratelimit';
import { isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get('q') || '').trim();
  if (q.length < 2) return NextResponse.json({ hits: [] });
  if (!(await rateLimit(req, 'map-search', 60, 60))) return NextResponse.json({ hits: [] }, { status: 429 });
  const lp = sp.get('locale') || DEFAULT_LOCALE;
  const locale: Locale = isLocale(lp) ? (lp as Locale) : (DEFAULT_LOCALE as Locale);
  const hits = await searchExplorer(locale, q);
  return NextResponse.json({ hits }, { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600' } });
}
