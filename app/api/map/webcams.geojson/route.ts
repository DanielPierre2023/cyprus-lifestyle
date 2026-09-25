// GET /api/map/webcams.geojson?locale=<loc>
// Published webcams that have coordinates, as a GeoJSON FeatureCollection, so any
// map (the island map, a future /live map) can render them as a layer. Cached.
import { NextRequest, NextResponse } from 'next/server';
import { getPublishedWebcams } from '@/lib/webcams';
import { isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';
export const revalidate = 900;

export async function GET(req: NextRequest) {
  const lp = req.nextUrl.searchParams.get('locale') || DEFAULT_LOCALE;
  const locale: Locale = isLocale(lp) ? (lp as Locale) : (DEFAULT_LOCALE as Locale);
  const cams = await getPublishedWebcams(locale);

  const features = cams
    .filter((c) => c.lat != null && c.lng != null)
    .map((c) => {
      // Where "watch live" should go: the source page for link/snapshot cams,
      // otherwise the on-site /live section (locale-prefixed, default unprefixed).
      const livePath = locale === DEFAULT_LOCALE ? '/live' : `/${locale}/live`;
      const url = (c.provider === 'link' || c.provider === 'snapshot') && c.externalUrl ? c.externalUrl : livePath;
      return {
        type: 'Feature' as const,
        geometry: { type: 'Point' as const, coordinates: [c.lng as number, c.lat as number] },
        properties: {
          slug: c.slug,
          name: c.name,
          category: c.category,
          provider: c.provider,
          area: c.area || '',
          district: c.district || '',
          listingSlug: c.listingSlug || '',
          url,
        },
      };
    });

  return NextResponse.json({ type: 'FeatureCollection', features });
}
