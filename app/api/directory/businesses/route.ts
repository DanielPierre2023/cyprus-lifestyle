// GET /api/directory/businesses?cat=<canonical_category>&locale=<loc>
// Every geocoded business in one canonical category, as a GeoJSON FeatureCollection,
// for the interactive directory map. Uses the existing coordinates (status published +
// listed); nothing is geocoded here. Cached 10 min.
import { NextRequest, NextResponse } from 'next/server';
import { getBusinessesForMap } from '@/lib/directory/map-data';
import { isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';
export const revalidate = 600;

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lp = sp.get('locale') || DEFAULT_LOCALE;
  const locale: Locale = isLocale(lp) ? (lp as Locale) : (DEFAULT_LOCALE as Locale);
  const cat = sp.get('cat');
  if (!cat) {
    return NextResponse.json({ type: 'FeatureCollection', features: [] });
  }

  const rows = await getBusinessesForMap(locale, { cat });
  const features = rows.map((b) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [b.lng, b.lat] },
    properties: {
      slug: b.slug,
      type: b.type,
      name: b.name,
      image: b.image || '',
      phone: b.phone || '',
      email: b.email || '',
      url: b.url || '',
      district: b.district || '',
      address: b.address || '',
      cat: b.cat || '',
    },
  }));

  return NextResponse.json(
    { type: 'FeatureCollection', features },
    { headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1800' } },
  );
}
