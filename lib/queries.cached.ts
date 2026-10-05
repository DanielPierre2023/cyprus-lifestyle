// lib/queries.cached.ts — tag-aware drop-in for lib/queries.ts (Phase 6.1).
//
// Re-exports everything from lib/queries unchanged, and OVERRIDES the hot public reads
// with versions wrapped in `unstable_cache`, each carrying data tags (see lib/cache/tags.ts).
// A page that imports from here is still ISR (its own `revalidate` still applies as the
// safety net) but can additionally be refreshed instantly and surgically with
// `revalidateTag()` - see app/api/revalidate/tags/route.ts.
//
// Only SMALL result sets are cached here: Vercel's data cache refuses entries over 2 MB
// (the item is then simply not cached, which is harmless but pointless). Large reads
// (getAllListings, getPeers, getNearby, getMapItems...) stay in lib/queries and are
// tagged at PAGE level with `tagPage()` instead.
import 'server-only';
import { unstable_cache } from 'next/cache';
import * as q from '@/lib/queries';
import { base, withLocale } from '@/lib/cache/tags';

export * from '@/lib/queries';

/** Time-based safety net, identical to the pages' own `revalidate = 3600` (1 h): DB webhooks refresh by tag on every edit. */
const TTL = 3600;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function cached<F extends (...a: any[]) => Promise<any>>(
  name: string,
  fn: F,
  tagsOf: (...a: Parameters<F>) => string[],
  revalidate = TTL,
): F {
  return ((...a: Parameters<F>) =>
    unstable_cache(() => fn(...a), ['q1', name, ...a.map((x) => String(x))], { tags: tagsOf(...a), revalidate })()) as F;
}

// Articles ---------------------------------------------------------------------
export const getLatest = cached('getLatest', q.getLatest, (l) => withLocale(base.home(), l));
export const getFeatured = cached('getFeatured', q.getFeatured, (l) => withLocale(base.home(), l));
export const getByCategory = cached('getByCategory', q.getByCategory, (l, c) => withLocale(base.category(c), l));
export const getArticle = cached('getArticle', q.getArticle, (l, s) => withLocale(base.article(s), l));

// Directory --------------------------------------------------------------------
export const getListing = cached('getListing', q.getListing, (l, s) => withLocale(base.listing(s), l));
export const getListings = cached('getListings', q.getListings, (l, t) => [...withLocale(base.dir(t), l), ...withLocale(base.dir(null), l)]);

// Events -----------------------------------------------------------------------
export const getUpcomingEvents = cached('getUpcomingEvents', q.getUpcomingEvents, (l) => withLocale(base.events(), l));
export const getRecurringEvents = cached('getRecurringEvents', q.getRecurringEvents, (l) => withLocale(base.events(), l));
export const getEventBySlug = cached('getEventBySlug', q.getEventBySlug, (l, s) => [...withLocale(base.event(s), l), ...withLocale(base.events(), l)]);

/**
 * Tag a PAGE whose data is too big to cache (or comes from several uncached reads).
 * Registers `tags` on the page render through a tiny cached sentinel, so a later
 * `revalidateTag(tag)` regenerates the page. Costs one ~1-byte data-cache entry per
 * (page-kind, locale) - not per row.
 */
export async function tagPage(tags: string[], key: string): Promise<void> {
  await unstable_cache(async () => 1, ['tagPage', key], { tags, revalidate: TTL })();
}
export { base as cacheTag, withLocale as cacheTagWithLocale };
