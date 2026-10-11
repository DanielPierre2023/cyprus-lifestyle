// lib/activities/pageData.ts
// ============================================================================
// Pure helpers for the experience detail page: the honest place wording, the map-explorer
// link, the booking link, the visibility rule for tours that visit the north, the JSON-LD
// and the sitemap entries. No I/O.
// ============================================================================
import type { Locale } from '@/lib/locales';
import { urlFor, SITE_NAME } from '@/lib/seo';
import { affiliateUrl, kindLabel } from '@/lib/activities/classify';
import { fill, type ActivitiesCopy } from '@/lib/activities/pageCopy';
import type { PublicActivity } from '@/lib/activities/browse';

export { isActivitySlug } from '@/lib/activities/browse';

/**
 * Tours that VISIT sites in the north follow the existing editorial switch (lib/activities/data.ts,
 * ACTIVITIES_NORTH_TOURS=show): hidden by default → no page, no sitemap entry, no concierge card.
 */
export const isPubliclyVisible = (a: Pick<PublicActivity, 'visits_north'>, showNorth: boolean): boolean => !a.visits_north || showNorth;

/**
 * Where the experience happens, in words that never imply an exact meeting point:
 * 'landmark' precision = the landmark the trip is about (approximate area); 'town' = the
 * departure town (approximate area); anything else = confirmed when booking.
 */
export function placeText(a: Pick<PublicActivity, 'geo_precision' | 'landmark' | 'town'>, c: ActivitiesCopy): string {
  const town = (a.town || '').trim(); const landmark = (a.landmark || '').trim();
  if (a.geo_precision === 'landmark' && landmark) return fill(c.placeLandmark, { landmark, town: town || landmark }).replace(/\s*\(\s*\)/, '');
  if (a.geo_precision && town) return fill(c.placeTown, { town });
  return c.placeNone; // no pin (island-wide) or no town: say nothing more than "confirmed when you book"
}

/** Mirrors ACTIVITY_PREFIX of lib/map/explorer-taxonomy.ts (a test pins the equality; importing it would pull the whole explorer taxonomy into the page). */
export const MAP_ACTIVITY_PREFIX = 'act:';

/** Existing map explorer deep link: filters by experience kind (and district) — `?cat=act:<kind>&district=<d>`. */
export function mapHref(a: Pick<PublicActivity, 'kind' | 'district'>): string {
  const q = new URLSearchParams();
  q.set('cat', `${MAP_ACTIVITY_PREFIX}${a.kind}`);
  if (a.district) q.set('district', a.district);
  return `/map?${q.toString().replace(/%3A/gi, ':')}`;
}

/** Partner booking link (affiliate id applied via lib/activities/classify.ts affiliateUrl). */
export const bookingHref = (a: Pick<PublicActivity, 'booking_url'>, partnerId: string | null | undefined, campaign = 'cl-activity-page'): string | null =>
  affiliateUrl(a.booking_url, partnerId, campaign);

export const activityPath = (slug: string): string => `/activities/${slug}`;

/**
 * schema.org JSON-LD: a TouristTrip with only facts we hold. No ratings, no review counts, no
 * prices/offers, no coordinates (the point is an approximate area, never an exact place).
 */
export function activityJsonLd(a: PublicActivity, locale: Locale): Record<string, unknown> {
  const place = [a.landmark, a.town].filter(Boolean).join(', ');
  return {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: a.title,
    ...(a.summary ? { description: a.summary } : {}),
    url: urlFor(locale, activityPath(a.slug)),
    inLanguage: 'en',
    ...(place ? { itinerary: { '@type': 'Place', name: place } } : {}),
    additionalType: kindLabel(a.kind, 'en'),
    provider: { '@type': 'Organization', name: SITE_NAME, url: urlFor(locale, '/') },
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: urlFor(locale, '/') },
  };
}

/** schema.org ItemList of one page of the index (names + urls only). */
export function listJsonLd(items: Pick<PublicActivity, 'slug' | 'title'>[], locale: Locale): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((a, i) => ({ '@type': 'ListItem', position: i + 1, name: a.title, url: urlFor(locale, activityPath(a.slug)) })),
  };
}
