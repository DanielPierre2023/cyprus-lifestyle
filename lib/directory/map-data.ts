// lib/directory/map-data.ts
// ============================================================================
// Server-side data for the interactive directory map (paralieslive-style).
// Uses the FULL directory — every geocoded business in status 'published' OR
// 'listed' (the Google-scraped set) — with the EXISTING coordinates. Nothing is
// geocoded here. Northern-Cyprus rows (north = true) are excluded.
//
// Kept in its own module (not lib/queries.ts) so the map ships as self-contained
// new files with no edit to the large shared queries file.
// ============================================================================
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Locale } from '@/lib/locales';

const MAP_STATUSES = ['published', 'listed'] as const;

export interface MapCategory { cat: string; count: number }

// Sidebar categories with geocoded counts, keyed by canonical_category (the ~85
// the admin/coverage page uses). PostgREST has no GROUP BY, so we page the column
// (past the 1000-row cap) and aggregate in JS. Cached by the caller (the
// /directory page revalidates every 5 min).
export async function getMapCategories(): Promise<{ categories: MapCategory[]; total: number }> {
  const sb = supabaseAdmin();
  const count = new Map<string, number>();
  let total = 0;
  const page = 1000;
  for (let from = 0; from < 30000; from += page) {
    const { data } = await sb.from('directory_listings')
      .select('canonical_category')
      .in('status', MAP_STATUSES as unknown as string[])
      .not('lat', 'is', null).not('lng', 'is', null).not('north', 'is', true)
      .not('canonical_category', 'is', null)
      .range(from, from + page - 1);
    const batch = (data || []) as { canonical_category: string | null }[];
    for (const r of batch) {
      const c = r.canonical_category;
      if (!c) continue;
      total++;
      count.set(c, (count.get(c) || 0) + 1);
    }
    if (batch.length < page) break;
  }
  const categories: MapCategory[] = Array.from(count.entries())
    .map(([cat, n]) => ({ cat, count: n }))
    .sort((a, b) => b.count - a.count);
  return { categories, total };
}

export interface MapBusiness {
  slug: string; type: string; name: string; lat: number; lng: number;
  image: string | null; phone: string | null; email: string | null; url: string | null;
  district: string | null; address: string | null; cat: string | null;
}

// Every geocoded business in ONE canonical category (north excluded, featured
// first). This is what a sidebar category click loads. Existing coordinates only.
export async function getBusinessesForMap(
  locale: Locale, opts: { cat?: string | null; limit?: number },
): Promise<MapBusiness[]> {
  if (!opts.cat) return [];
  const sb = supabaseAdmin();
  const cap = Math.min(opts.limit ?? 8000, 12000);
  const cols = `slug, type, canonical_category, district, address, lat, lng, image, phone, email, url, featured, name_${locale}, name_en`;
  const out: MapBusiness[] = [];
  const page = 1000; // Supabase caps each request at ~1000 rows — page through to get them ALL.
  for (let from = 0; from < cap; from += page) {
    const to = Math.min(from + page, cap) - 1;
    const { data } = await sb.from('directory_listings')
      .select(cols)
      .in('status', MAP_STATUSES as unknown as string[])
      .not('lat', 'is', null).not('lng', 'is', null).not('north', 'is', true)
      .eq('canonical_category', opts.cat)
      .order('featured', { ascending: false, nullsFirst: false })
      .order('slug', { ascending: true }) // stable secondary sort so pages don't overlap/skip
      .range(from, to);
    const rows = (data || []) as unknown as Record<string, unknown>[];
    for (const r of rows) {
      const lat = Number(r.lat), lng = Number(r.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      out.push({
        slug: String(r.slug), type: String(r.type || 'vendor'),
        name: String(r[`name_${locale}`] || r.name_en || r.slug),
        lat, lng,
        image: (r.image as string) || null, phone: (r.phone as string) || null,
        email: (r.email as string) || null, url: (r.url as string) || null,
        district: (r.district as string) || null, address: (r.address as string) || null,
        cat: (r.canonical_category as string) || null,
      });
    }
    if (rows.length < page) break; // last page reached
  }
  return out;
}
