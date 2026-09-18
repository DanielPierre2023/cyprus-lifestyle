// Centralised SEO helpers: canonical + hreflang alternates and JSON-LD builders.
// Routing is next-intl `as-needed` — the default locale (en) has no path prefix.
import { LOCALES, DEFAULT_LOCALE, LOCALE_NAME, type Locale } from '@/lib/locales';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cyprus-lifestyle.vercel.app').replace(/\/+$/, '');
export const SITE_NAME = 'Cyprus Lifestyle';

/** Locale-prefixed path. path is like '/', '/property', '/article/slug'. */
export function pathFor(locale: Locale, path: string): string {
  const clean = path === '/' ? '' : (path.startsWith('/') ? path : `/${path}`);
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;
  const full = `${prefix}${clean}`;
  return full === '' ? '/' : full;
}

export function urlFor(locale: Locale, path: string): string {
  return SITE_URL + pathFor(locale, path);
}

/** Metadata `alternates`: self-canonical + one hreflang per edition + x-default. */
export function alternatesFor(locale: Locale, path: string) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) languages[l] = urlFor(l, path);
  languages['x-default'] = urlFor(DEFAULT_LOCALE, path);
  return { canonical: urlFor(locale, path), languages };
}

const OG_LOCALE: Record<Locale, string> = { en: 'en_US', el: 'el_GR', ro: 'ro_RO', ar: 'ar_AR', de: 'de_DE', pl: 'pl_PL', ru: 'ru_RU' };

/** Absolute URL of a generated branded social card. */
export function ogImageUrl(o: { title: string; kicker?: string; locale: Locale; cover?: string | null }): string {
  const p = new URLSearchParams();
  p.set('t', o.title.slice(0, 200));
  if (o.kicker) p.set('k', o.kicker.slice(0, 60));
  p.set('l', o.locale);
  if (o.cover) p.set('c', o.cover);
  return `${SITE_URL}/api/og?${p.toString()}`;
}

/** A complete Metadata fragment for a page: title, description, alternates, Open Graph + branded social card. */
export function pageMetadata(opts: {
  locale: Locale; path: string; title: string; description?: string;
  type?: 'website' | 'article'; absoluteTitle?: boolean;
  ogTitle?: string; kicker?: string; cover?: string | null;
}) {
  const { locale, path, title, description, type = 'website', absoluteTitle, ogTitle, kicker, cover } = opts;
  const images = [ogImageUrl({ title: ogTitle || title, kicker, locale, cover })];
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      title, description, type, url: urlFor(locale, path), siteName: SITE_NAME,
      locale: OG_LOCALE[locale], images,
    },
    twitter: { card: 'summary_large_image' as const, title, description, images },
  };
}

/** Organization + WebSite JSON-LD for the site root. */
export function orgJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'NewsMediaOrganization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/brand/monogram.svg`,
        slogan: 'The island, in full colour',
        knowsLanguage: LOCALES.map((l) => LOCALE_NAME[l]),
        areaServed: 'CY',
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        inLanguage: LOCALES.map((l) => l),
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  };
}

/** NewsArticle JSON-LD for an article page. */
export function articleJsonLd(a: {
  locale: Locale; slug: string; title: string; description?: string;
  image?: string | null; author?: string | null; authorSlug?: string | null;
  publishedAt?: string | null; updatedAt?: string | null; section?: string | null;
}) {
  // A named editor → Person (E-E-A-T); otherwise fall back to the Organization.
  const author = a.author && a.authorSlug
    ? { '@type': 'Person', name: a.author, url: urlFor(a.locale, `/author/${a.authorSlug}`) }
    : { '@type': 'Organization', name: a.author || SITE_NAME, url: SITE_URL };
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': urlFor(a.locale, `/article/${a.slug}`) },
    headline: a.title,
    description: a.description,
    image: a.image ? [a.image] : undefined,
    inLanguage: a.locale,
    datePublished: a.publishedAt || undefined,
    dateModified: a.updatedAt || a.publishedAt || undefined,
    articleSection: a.section || undefined,
    author,
    publisher: { '@id': `${SITE_URL}/#organization` },
  };
}

/** BreadcrumbList JSON-LD. items: [{name, path}] in order. */
export function breadcrumbJsonLd(locale: Locale, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem', position: i + 1, name: it.name, item: urlFor(locale, it.path),
    })),
  };
}

const LISTING_SCHEMA_TYPE: Record<string, string> = {
  restaurant: 'Restaurant',
  winery: 'Winery',
  hotel: 'Hotel',
  development: 'ApartmentComplex',
  beach: 'Beach',
  vendor: 'LocalBusiness',
};

/** LocalBusiness (or a more specific subtype) JSON-LD for a directory listing. */
export function listingJsonLd(a: {
  locale: Locale; slug: string; type: string; name: string; description?: string;
  url?: string | null; image?: string | null; address?: string | null;
  lat?: number | null; lng?: number | null; district?: string | null; priceRange?: string | null;
  rating?: number | null; ratingCount?: number | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': LISTING_SCHEMA_TYPE[a.type] || 'LocalBusiness',
    '@id': urlFor(a.locale, `/directory/${a.type}/${a.slug}`),
    name: a.name,
    description: a.description || undefined,
    url: urlFor(a.locale, `/directory/${a.type}/${a.slug}`),
    sameAs: a.url ? [a.url] : undefined,
    image: a.image ? [a.image] : undefined,
    priceRange: a.priceRange || undefined,
    aggregateRating: (typeof a.rating === 'number' && a.rating > 0 && a.ratingCount && a.ratingCount > 0)
      ? { '@type': 'AggregateRating', ratingValue: a.rating, reviewCount: a.ratingCount, bestRating: 5 }
      : undefined,
    address: (a.address || a.district)
      ? {
        '@type': 'PostalAddress',
        streetAddress: a.address || undefined,
        addressRegion: a.district ? a.district[0].toUpperCase() + a.district.slice(1) : undefined,
        addressCountry: 'CY',
      }
      : undefined,
    geo: (typeof a.lat === 'number' && typeof a.lng === 'number')
      ? { '@type': 'GeoCoordinates', latitude: a.lat, longitude: a.lng }
      : undefined,
    areaServed: 'CY',
  };
}

/** ItemList JSON-LD for a directory listing page. */
export function itemListJsonLd(locale: Locale, items: { name: string; type: string; slug: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      url: urlFor(locale, `/directory/${it.type}/${it.slug}`),
    })),
  };
}

/** Event JSON-LD for an agenda entry. */
export function eventJsonLd(a: {
  locale: Locale; name: string; description?: string; startsAt: string; endsAt?: string | null;
  venue?: string | null; district?: string | null; url?: string | null; image?: string | null;
  lat?: number | null; lng?: number | null; price?: string | null;
}) {
  const placeName = a.venue || (a.district ? a.district[0].toUpperCase() + a.district.slice(1) : 'Cyprus');
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: a.name,
    description: a.description || undefined,
    startDate: a.startsAt,
    endDate: a.endsAt || undefined,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    image: a.image ? [a.image] : undefined,
    url: a.url || undefined,
    location: {
      '@type': 'Place',
      name: placeName,
      address: { '@type': 'PostalAddress', addressRegion: a.district || undefined, addressCountry: 'CY' },
      geo: (typeof a.lat === 'number' && typeof a.lng === 'number')
        ? { '@type': 'GeoCoordinates', latitude: a.lat, longitude: a.lng }
        : undefined,
    },
    offers: a.price
      ? { '@type': 'Offer', price: a.price, priceCurrency: 'EUR', url: a.url || undefined }
      : undefined,
    organizer: { '@id': `${SITE_URL}/#organization` },
  };
}

/** FAQPage JSON-LD. items: [{q, a}]. */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((it) => ({
      '@type': 'Question',
      name: it.q,
      acceptedAnswer: { '@type': 'Answer', text: it.a },
    })),
  };
}

/** HowTo JSON-LD. steps: ordered strings. */
export function howToJsonLd(name: string, steps: string[], description?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((s, i) => ({ '@type': 'HowToStep', position: i + 1, text: s })),
  };
}

/** Small helper component data: stringify + guard for dangerouslySetInnerHTML. */
export function ld(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
