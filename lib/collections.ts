// Cyprus Lifestyle — "collections": programmatic guide pages that pair a
// directory type with a district ("The best restaurants in Paphos"). Pure,
// framework-free helpers so both server code (queries, sitemap) and the page can
// share one canonical slug scheme. The slug is ALWAYS English + locale-prefixed
// in the URL, so /el/best/restaurants-in-paphos and /best/restaurants-in-paphos
// point at the same collection in two editions.

// A collection needs at least this many published listings to be worth a page
// (thin pages hurt SEO and read poorly).
export const MIN_COLLECTION_SIZE = 4;

// Canonical English plural used in the URL slug — language-independent.
export const TYPE_PLURAL_EN: Record<string, string> = {
  restaurant: 'restaurants',
  winery: 'wineries',
  development: 'developments',
  hotel: 'hotels',
  beach: 'beaches',
  vendor: 'services',
};

// Complementary types to cross-link from a collection — the "intent bundle".
// Someone reading "hotels in Paphos" almost certainly also wants beaches and
// restaurants there; a real-estate reader wants services (builders, furniture)
// first. Order = priority. This is what turns a flat directory into a journey.
export const INTENT_BUNDLES: Record<string, string[]> = {
  hotel: ['beach', 'restaurant', 'winery', 'vendor'],
  development: ['vendor', 'beach', 'restaurant', 'hotel'],
  restaurant: ['hotel', 'beach', 'winery', 'vendor'],
  beach: ['restaurant', 'hotel', 'vendor', 'winery'],
  winery: ['restaurant', 'hotel', 'beach', 'development'],
  vendor: ['development', 'hotel', 'restaurant', 'beach'],
};

// district string → URL-safe slug (diacritics folded, spaces → dashes).
export function slugifyDistrict(district: string): string {
  return (district || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// district string → display label ("ayia napa" → "Ayia Napa").
export function districtLabel(district: string): string {
  return (district || '')
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

// (type, districtSlug) → canonical collection slug, e.g. "restaurants-in-paphos".
export function collectionSlug(type: string, districtSlug: string): string {
  return `${TYPE_PLURAL_EN[type] || type}-in-${districtSlug}`;
}

export interface CollectionFacet {
  type: string;
  district: string;      // exact DB value, for querying
  districtSlug: string;
  slug: string;
  count: number;
}
