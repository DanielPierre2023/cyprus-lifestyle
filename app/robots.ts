import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

// Private account pages (member + Business Hub) are noindex in their metadata; they are also kept out of crawling,
// in every edition (English has no prefix).
const ACCOUNT = ['/account', ...LOCALES.filter((l) => l !== DEFAULT_LOCALE).map((l) => `/${l}/account`)];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin', '/api', ...ACCOUNT] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
