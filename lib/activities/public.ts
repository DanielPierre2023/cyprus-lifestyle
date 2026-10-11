// lib/activities/public.ts
// ============================================================================
// Server-side reads for the PUBLIC experiences pages. Read-only, status = 'active' only,
// catalogue columns only. Cached with unstable_cache (1 h safety net, same as the other
// pages) and tagged `activities` / `activity:<slug>` so a catalogue edit can refresh exactly
// these pages (POST /api/revalidate/tags {kind:'activity', slug}; DB webhook table 'activities').
// A database error THROWS at runtime (it is not cached and ISR keeps serving the last good page); only 'no such
// experience' returns null. The sitemap helper is the one best-effort caller.
// ============================================================================
import 'server-only';
import { unstable_cache } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { base } from '@/lib/cache/tags';
import { showNorthTours } from '@/lib/activities/data';
import { publicOrder, type PublicActivity } from '@/lib/activities/browse';
import { isActivitySlug } from '@/lib/activities/pageData';

/** Catalogue columns only (data/activities/cyprus-experiences.csv); no other column of the table is ever read. */
export const PUBLIC_COLS = 'external_id, slug, title, summary, kind, tags, district, town, landmark, geo_precision, duration_min, duration_label, price_band, price_basis, group_max, booking_url, priority, visits_north, north_site';
const PAGE = 1000;
const TTL = 3600;

const num = (v: unknown) => (v == null ? null : Number(v));
export function toPublic(r: Record<string, unknown>): PublicActivity | null {
  const slug = String(r.slug || '');
  if (!isActivitySlug(slug) || !r.title || !r.external_id) return null;
  return {
    external_id: String(r.external_id), slug, title: String(r.title), summary: (r.summary as string) || null, kind: String(r.kind || 'sightseeing'),
    tags: Array.isArray(r.tags) ? (r.tags as unknown[]).map(String) : [],
    district: (r.district as string) || null, town: (r.town as string) || null, landmark: (r.landmark as string) || null,
    geo_precision: (r.geo_precision as string) || null, duration_min: num(r.duration_min), duration_label: (r.duration_label as string) || null,
    price_band: (r.price_band as string) || null, price_basis: (r.price_basis as string) || null, group_max: num(r.group_max),
    booking_url: (r.booking_url as string) || null, priority: Number(r.priority) || 0, visits_north: r.visits_north === true,
    north_site: (r.north_site as string) || null,
  };
}

async function loadAll(showNorth: boolean): Promise<PublicActivity[]> {
  const sb = supabaseAdmin();
  const out: PublicActivity[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = sb.from('activities').select(PUBLIC_COLS).eq('status', 'active').not('booking_url', 'is', null).not('slug', 'is', null);
    if (!showNorth) q = q.eq('visits_north', false);
    const { data, error } = await q.order('slug', { ascending: true }).range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const part = (data || []) as unknown as Record<string, unknown>[];
    for (const r of part) { const p = toPublic(r); if (p) out.push(p); }
    if (part.length < PAGE) break;
  }
  return publicOrder(out);
}

const cachedAll = (showNorth: boolean) => unstable_cache(() => loadAll(showNorth), ['activities:public:all:v1', showNorth ? 'north' : 'south'], { tags: [base.activities()], revalidate: TTL });

/** Every publicly visible experience (≈530 rows, ~150 KB), in public order. Throws when the DB is unreachable. */
export async function getPublicActivities(): Promise<PublicActivity[]> {
  try {
    return await cachedAll(showNorthTours())();
  } catch (e) {
    // Only while `next build` pre-renders /activities: an unreachable database must not fail the deploy (the other public
    // pages behave the same way). The page then renders empty and heals on its 1 h revalidate or an `activities` tag refresh.
    if (process.env.NEXT_PHASE === 'phase-production-build') return [];
    throw e;
  }
}

async function loadOne(slug: string, showNorth: boolean): Promise<PublicActivity | null> {
  let q = supabaseAdmin().from('activities').select(PUBLIC_COLS).eq('status', 'active').eq('slug', slug).not('booking_url', 'is', null);
  if (!showNorth) q = q.eq('visits_north', false);
  const { data, error } = await q.maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toPublic(data as unknown as Record<string, unknown>) : null;
}
/** One experience by slug (null = no such active, visible experience → the page answers 404). */
export async function getPublicActivity(slug: string): Promise<PublicActivity | null> {
  if (!isActivitySlug(slug)) return null;
  return unstable_cache(() => loadOne(slug, showNorthTours()), ['activities:public:one:v1', slug, showNorthTours() ? 'north' : 'south'], { tags: [base.activity(slug), base.activities()], revalidate: TTL })();
}

async function loadRelated(a: { slug: string; kind: string; district: string | null }, showNorth: boolean): Promise<PublicActivity[]> {
  let q = supabaseAdmin().from('activities').select(PUBLIC_COLS).eq('status', 'active').eq('kind', a.kind).neq('slug', a.slug).not('booking_url', 'is', null);
  if (a.district) q = q.eq('district', a.district);
  if (!showNorth) q = q.eq('visits_north', false);
  const { data, error } = await q.order('priority', { ascending: false }).order('slug', { ascending: true }).limit(4);
  if (error) throw new Error(error.message);
  return ((data || []) as unknown as Record<string, unknown>[]).map(toPublic).filter((x): x is PublicActivity => !!x);
}
/** Up to four more experiences of the same kind in the same district. */
export async function getRelatedActivities(a: { slug: string; kind: string; district: string | null }): Promise<PublicActivity[]> {
  try {
    return await unstable_cache(() => loadRelated(a, showNorthTours()), ['activities:public:related:v1', a.slug, showNorthTours() ? 'north' : 'south'], { tags: [base.activity(a.slug), base.activities()], revalidate: TTL })();
  } catch { return []; } // "more nearby" is optional: never fail the page for it
}

/** Sitemap entries: one per visible experience (+ the index). */
export async function activitySitemapPaths(): Promise<{ path: string }[]> {
  let rows: PublicActivity[] = [];
  try { rows = await getPublicActivities(); } catch { /* best-effort: a smaller (still valid) sitemap */ }
  return [{ path: '/activities' }, ...rows.map((r) => ({ path: `/activities/${r.slug}` }))];
}
