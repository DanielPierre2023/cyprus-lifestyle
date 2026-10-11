// lib/gyg.ts
// ============================================================================
// GetYourGuide Partner Programme — one place for the partner id, the Cyprus
// location ids and link building. Pure; safe on server and client.
//
// How you earn: every link to getyourguide.com that carries ?partner_id=… sets
// GetYourGuide's 31-day attribution cookie, so a booking the visitor makes on
// GetYourGuide within 31 days is credited to this account. Widgets (city /
// activities / availability) earn the same way and REQUIRE the partner Analytics
// script ("Integration Analyzer") in the page head — loaded consent-gated by
// components/GygAnalytics.tsx.
// ============================================================================

/** Your partner id. Env wins (GYG_PARTNER_ID on the server, NEXT_PUBLIC_GYG_PARTNER_ID in the browser). */
export const DEFAULT_GYG_PARTNER_ID = 'YEP5D0C';
export function gygPartnerIdFromEnv(): string {
  const env = (typeof process !== 'undefined' && process.env)
    ? (process.env.GYG_PARTNER_ID || process.env.NEXT_PUBLIC_GYG_PARTNER_ID || '') : '';
  return env.trim() || DEFAULT_GYG_PARTNER_ID;
}

export const GYG_ANALYTICS_SRC = 'https://widget.getyourguide.com/dist/pa.umd.production.min.js';
export const GYG_CITY_FRAME = 'https://widget.getyourguide.com/default/city.frame';
export const GYG_ACTIVITIES_FRAME = 'https://widget.getyourguide.com/default/activities.frame';

/**
 * GetYourGuide location ids for Cyprus (from the activities export; verified pages
 * getyourguide.com/<slug>-l<id>/). NOTE: id 200 is Sydney, Australia — never use it here.
 */
export const GYG_LOCATIONS: Record<string, { id: number; slug: string; name: string }> = {
  cyprus:        { id: 169006, slug: 'cyprus',        name: 'Cyprus' },
  paphos:        { id: 426,    slug: 'paphos',        name: 'Paphos' },
  limassol:      { id: 32399,  slug: 'limassol',      name: 'Limassol' },
  larnaca:       { id: 1587,   slug: 'larnaca',       name: 'Larnaca' },
  nicosia:       { id: 415,    slug: 'nicosia',       name: 'Nicosia' },
  'ayia-napa':   { id: 124743, slug: 'ayia-napa',     name: 'Ayia Napa' },
  protaras:      { id: 132513, slug: 'protaras',      name: 'Protaras' },
  latsi:         { id: 164447, slug: 'latsi',         name: 'Latsi' },
  peyia:         { id: 164449, slug: 'peyia',         name: 'Peyia' },
  polis:         { id: 4554,   slug: 'polis',         name: 'Polis' },
  troodos:       { id: 254053, slug: 'troodos',       name: 'Troodos' },
  'pano-lefkara':{ id: 127763, slug: 'pano-lefkara',  name: 'Pano Lefkara' },
};

/** Directory district → the GetYourGuide location that best represents it. */
export const DISTRICT_GYG: Record<string, keyof typeof GYG_LOCATIONS> = {
  paphos: 'paphos', limassol: 'limassol', larnaca: 'larnaca', nicosia: 'nicosia', famagusta: 'ayia-napa',
};

export function gygLocationFor(districtOrTown: string | null | undefined) {
  const k = String(districtOrTown || '').toLowerCase().replace(/\s+/g, '-');
  return GYG_LOCATIONS[k] || GYG_LOCATIONS[DISTRICT_GYG[k] || ''] || GYG_LOCATIONS.cyprus;
}

/** Site locale → GetYourGuide widget locale code (languages GYG doesn't serve fall back to English). */
export function gygLocaleCode(locale: string): string {
  // el/ro were mapped to en-US (their own editions showed an English widget); GYG serves el-GR and ro-RO. Arabic stays
  // en-US: GYG's Arabic support could not be verified offline (unsupported codes fall back to English anyway).
  const M: Record<string, string> = { en: 'en-US', de: 'de-DE', pl: 'pl-PL', ru: 'ru-RU', el: 'el-GR', ro: 'ro-RO', ar: 'en-US' };
  return M[locale] || 'en-US';
}

/**
 * Add the partner id (+ optional campaign, shown in the partner portal) to any
 * getyourguide.com URL. Non-GetYourGuide or non-http(s) URLs are returned unchanged / null.
 */
export function gygLink(url: string | null | undefined, opts: { partnerId?: string | null; campaign?: string } = {}): string | null {
  const u = String(url || '').trim();
  if (!/^https?:\/\//i.test(u)) return null;
  const partner = opts.partnerId === undefined ? gygPartnerIdFromEnv() : opts.partnerId;
  try {
    const x = new URL(u);
    if (!/(^|\.)getyourguide\.[a-z.]+$/i.test(x.hostname) || !partner) return u;
    x.searchParams.set('partner_id', partner);
    if (!x.searchParams.has('utm_medium')) x.searchParams.set('utm_medium', 'online_publisher');
    if (opts.campaign) x.searchParams.set('cmp', opts.campaign);
    return x.toString();
  } catch { return u; }
}

/** A tagged link to a location's "things to do" page (fallback when the widget can't load). */
export function gygLocationLink(loc: { id: number; slug: string }, campaign: string, partnerId?: string | null): string {
  return gygLink(`https://www.getyourguide.com/${loc.slug}-l${loc.id}/`, { partnerId, campaign }) as string;
}
