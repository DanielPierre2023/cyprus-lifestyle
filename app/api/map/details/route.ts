// GET /api/map/details?ids=<slug>,<slug>,e:<event-slug>&locale=<loc>
// Card + popup details for the places currently on screen (max 60 per request):
// name, photos, address, phone, email, website, socials, opening hours, amenities,
// description, reviews and the profile / claim link. Cached 10 min at the CDN.
import { NextRequest, NextResponse } from 'next/server';
import { getExplorerDetails } from '@/lib/map/explorer-data';
import { isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lp = sp.get('locale') || DEFAULT_LOCALE;
  const locale: Locale = isLocale(lp) ? (lp as Locale) : (DEFAULT_LOCALE as Locale);
  const ids = (sp.get('ids') || '').split(',').filter(Boolean).slice(0, 60);
  if (!ids.length) return NextResponse.json({ items: [] });
  const items = await getExplorerDetails(locale, ids);
  return NextResponse.json({ items }, {
    headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' },
  });
}
