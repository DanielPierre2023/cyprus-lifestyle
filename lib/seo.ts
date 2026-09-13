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

const OG_LOCALE: Record<Locale, string> = { en: 'en_US', el: 'el_GR', ro: 'ro_RO', ar: 'ar_AR' };

/** A complete Metadata fragment for a page: title, description, alternates, Open Graph. */
export function pageMetadata(opts: {
  locale: Locale; path: string; title: string; description?: string;
  images?: string[]; type?: 'website' | 'article'; absoluteTitle?: boolean;
}) {
  const { locale, path, title, description, images, type = 'website', absoluteTitle } = opts;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: alternatesFor(locale, path),
    openGraph: {
      title, description, type, url: urlFor(locale, path), siteName: SITE_NAME,
      locale: OG_LOCALE[locale], images: images && images.length ? images : undefined,
    },
    twitter: {
      card: (images && images.length ? 'summary_large_image' : 'summary') as 'summary_large_image' | 'summary',
      title, description, images,
    },
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
  image?: string | null; author?: string | null; publishedAt?: string | null; section?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: { '@type': 'WebPage', '@id': urlFor(a.locale, `/article/${a.slug}`) },
    headline: a.title,
    description: a.description,
    image: a.image ? [a.image] : undefined,
    inLanguage: a.locale,
    datePublished: a.publishedAt || undefined,
    dateModified: a.publishedAt || undefined,
    articleSection: a.section || undefined,
    author: { '@type': 'Organization', name: a.author || SITE_NAME, url: SITE_URL },
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

/** Small helper component data: stringify + guard for dangerouslySetInnerHTML. */
export function ld(obj: unknown): string {
  return JSON.stringify(obj).replace(/</g, '\\u003c');
}
