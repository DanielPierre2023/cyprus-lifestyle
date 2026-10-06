// lib/cache/tags.ts — cache-tag vocabulary for tag-based revalidation (Phase 6.1).
// PURE (no Next imports) so it is unit-tested and importable anywhere.
//
// Why tags: the public site is ~3k pages x 7 locales. `revalidatePath` needs the exact
// URL of every affected page; a tag names the DATA a page was built from, so editing one
// article / listing / event refreshes exactly the pages that read it - in every locale,
// or in a single locale when only one translation changed - and nothing else.
//
// Every cached read carries two tags:  `<base>`  and  `<base>@<locale>`.
//   publish/edit (all locales)  -> invalidate `<base>`
//   one translation changed     -> invalidate `<base>@<locale>`
import { LOCALES, type Locale } from '@/lib/locales';

/** A slug / category / type is part of a tag: allow only what a slug can look like. */
export const SAFE_KEY = /^[a-z0-9][a-z0-9-_]{0,100}$/i;
export const MAX_TAGS_PER_CALL = 64; // Next allows 128 tags per entry / 256 chars per tag; stay well inside.

export type TagBase = string;

export const base = {
  home: (): TagBase => 'home',
  article: (slug: string): TagBase => `article:${slug}`,
  category: (cat: string): TagBase => `cat:${cat}`,
  listing: (slug: string): TagBase => `listing:${slug}`,
  dir: (type?: string | null): TagBase => (type ? `dir:${type}` : 'dir:all'),
  events: (): TagBase => 'events',
  event: (slug: string): TagBase => `event:${slug}`,
  activities: (): TagBase => 'activities',
  activity: (slug: string): TagBase => `activity:${slug}`,
};

/** Tags a cached read should carry: the base tag plus its per-locale twin. */
export function withLocale(b: TagBase, locale: string): string[] {
  return [b, `${b}@${locale}`];
}

const isLocaleCode = (l: unknown): l is Locale => typeof l === 'string' && (LOCALES as readonly string[]).includes(l);

/** Keep only valid, known locale codes (order preserved, de-duplicated). */
export function cleanLocales(l: unknown): Locale[] {
  if (!Array.isArray(l)) return [];
  return [...new Set(l.filter(isLocaleCode))] as Locale[];
}

export type Change =
  | { kind: 'article'; slug: string; category?: string; locales?: Locale[] }
  | { kind: 'listing'; slug: string; type?: string; locales?: Locale[] }
  | { kind: 'event'; slug: string; locales?: Locale[] }
  | { kind: 'activity'; slug: string; locales?: Locale[] };

const ok = (v: unknown): v is string => typeof v === 'string' && SAFE_KEY.test(v);

/**
 * Validate an untrusted body ({kind, slug, category|type, locales?}) into a Change.
 * Unknown kinds or unsafe keys return null (the route answers 400).
 */
export function parseChange(body: unknown): Change | null {
  if (!body || typeof body !== 'object') return null;
  const b = body as Record<string, unknown>;
  const locales = cleanLocales(b.locales);
  const loc = locales.length ? { locales } : {};
  if (b.kind === 'article' && ok(b.slug)) {
    return { kind: 'article', slug: b.slug, ...(ok(b.category) ? { category: b.category } : {}), ...loc };
  }
  if (b.kind === 'listing' && ok(b.slug)) {
    return { kind: 'listing', slug: b.slug, ...(ok(b.type) ? { type: b.type } : {}), ...loc };
  }
  if (b.kind === 'event' && ok(b.slug)) return { kind: 'event', slug: b.slug, ...loc };
  if (b.kind === 'activity' && ok(b.slug)) return { kind: 'activity', slug: b.slug, ...loc };
  return null;
}

/**
 * Supabase Database Webhook payload ({type, table, record, old_record}) -> Change(s).
 * An edit that MOVES an item (category/type changed) must refresh the old category too,
 * so both records are inspected.
 */
export function changesFromWebhook(body: unknown): Change[] {
  if (!body || typeof body !== 'object') return [];
  const b = body as { table?: unknown; record?: Record<string, unknown> | null; old_record?: Record<string, unknown> | null };
  const recs = [b.record, b.old_record].filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');
  const out: Change[] = [];
  for (const r of recs) {
    const c =
      b.table === 'blog_posts' ? parseChange({ kind: 'article', slug: r.slug, category: r.category })
      : b.table === 'directory_listings' ? parseChange({ kind: 'listing', slug: r.slug, type: r.type })
      : b.table === 'events' ? parseChange({ kind: 'event', slug: r.slug })
      : b.table === 'activities' ? parseChange({ kind: 'activity', slug: r.slug })
      : null;
    if (c) out.push(c);
  }
  return out;
}

/** The exact set of tags a change must invalidate (de-duplicated, capped). */
export function tagsForChange(c: Change): string[] {
  const bases: TagBase[] = [];
  if (c.kind === 'article') {
    bases.push(base.article(c.slug), base.home());           // the article page + the home feed
    if (c.category) bases.push(base.category(c.category));   // its category index
  } else if (c.kind === 'listing') {
    bases.push(base.listing(c.slug));
    bases.push(base.dir(c.type ?? null));                    // its type index (or all types when unknown)
  } else if (c.kind === 'activity') {
    bases.push(base.activity(c.slug), base.activities());   // the experience page + the /activities lists
  } else {
    bases.push(base.event(c.slug), base.events());
  }
  const tags = c.locales && c.locales.length
    ? bases.flatMap((b) => c.locales!.map((l) => `${b}@${l}`))
    : bases;
  return [...new Set(tags)].slice(0, MAX_TAGS_PER_CALL);
}
