// Which public paths to refresh when an article changes (pure; used by /api/admin/revalidate).
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

/** Only what a slug/category can legitimately look like — they become part of a path. */
const SAFE = /^[a-z0-9][a-z0-9-_]{0,120}$/i;

const localized = (path: string): string[] => LOCALES.map((l) => (l === DEFAULT_LOCALE ? path : `/${l}${path === '/' ? '' : path}`));

export function pathsFor(body: { slug?: unknown; category?: unknown }): string[] {
  const paths = new Set<string>(['/']);
  if (typeof body.category === 'string' && SAFE.test(body.category)) paths.add(`/${body.category}`);
  if (typeof body.slug === 'string' && SAFE.test(body.slug)) paths.add(`/article/${body.slug}`);
  return [...paths].flatMap(localized);
}
