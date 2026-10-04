// lib/activities/data.ts
// ============================================================================
// Server-side reads of the experiences catalogue, public.activities (migration
// 20261004120000 + seed 20261004120100). Read-only and graceful: until the migration
// is applied — or if the query fails — this returns [] and the map and the concierge
// behave exactly as before.
//
//   GYG_PARTNER_ID         → appended to every booking link (GetYourGuide partner
//                            programme / affiliate tracking). Unset → YEP5D0C (lib/gyg.ts).
//   ACTIVITIES_NORTH_TOURS → 'show' also surfaces experiences from the south that VISIT
//                            northern sites (visits_north). Default: hidden, in line
//                            with the site's "never Northern Cyprus" editorial rule.
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { gygPartnerIdFromEnv } from '@/lib/gyg';

/** One catalogue entry — our own wording and classification, plus the booking link. */
export interface ActivityRow {
  external_id: string; slug: string | null; title: string; summary: string | null; kind: string; tags: string[];
  district: string | null; town: string | null; landmark: string | null; lat: number | null; lng: number | null;
  geo_precision: string | null; duration_min: number | null; duration_label: string | null;
  price_band: string | null; price_basis: string | null; group_max: number | null;
  booking_url: string | null; priority: number; visits_north: boolean;
}

const COLS = 'external_id, slug, title, summary, kind, tags, district, town, landmark, lat, lng, geo_precision, duration_min, duration_label, price_band, price_basis, group_max, booking_url, priority, visits_north';

export const showNorthTours = () => (process.env.ACTIVITIES_NORTH_TOURS || '').trim().toLowerCase() === 'show';
export const gygPartnerId = () => gygPartnerIdFromEnv(); // GYG_PARTNER_ID env, else the account default (lib/gyg.ts)

const n = (v: unknown) => (v == null ? null : Number(v));
const toRow = (r: Record<string, unknown>): ActivityRow => ({
  ...(r as unknown as ActivityRow),
  tags: Array.isArray(r.tags) ? (r.tags as string[]) : [],
  lat: n(r.lat), lng: n(r.lng), duration_min: n(r.duration_min), group_max: n(r.group_max),
  priority: Number(r.priority) || 0,
});

let memo: { at: number; rows: ActivityRow[] } | null = null;
const MEMO_MS = 10 * 60 * 1000;

/** Every active catalogue entry (≈570), editorial picks first, cached 10 min per server instance. */
export async function getActivities(): Promise<ActivityRow[]> {
  if (memo && Date.now() - memo.at < MEMO_MS) return memo.rows;
  try {
    let q = supabaseAdmin().from('activities').select(COLS).eq('status', 'active').not('booking_url', 'is', null);
    if (!showNorthTours()) q = q.eq('visits_north', false);
    // Editorial picks first, then the everyday options (€ before €€€€, shorter first) — the
    // order the map list and the concierge fall back to when nothing else separates them.
    const { data, error } = await q.order('priority', { ascending: false }).order('price_band', { ascending: true, nullsFirst: false })
      .order('duration_min', { ascending: true, nullsFirst: false }).order('title', { ascending: true }).limit(5000);
    if (error) return memo?.rows || [];
    const rows = ((data || []) as unknown as Record<string, unknown>[]).map(toRow);
    memo = { at: Date.now(), rows };
    return rows;
  } catch {
    return memo?.rows || [];
  }
}

/** Catalogue entries by booking-partner product id (for the map's card details). */
export async function getActivitiesByIds(ids: string[]): Promise<ActivityRow[]> {
  if (!ids.length) return [];
  const all = await getActivities();
  const want = new Set(ids);
  return all.filter((a) => want.has(a.external_id));
}

/** Title / landmark / town search for the map's search box. */
export async function searchActivities(q: string, limit = 6): Promise<ActivityRow[]> {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const parts = s.split(/\s+/).filter(Boolean);
  const all = await getActivities();
  return all.filter((a) => { const t = `${a.title} ${a.landmark || ''} ${a.town || ''}`.toLowerCase(); return parts.every((p) => t.includes(p)); }).slice(0, limit);
}
