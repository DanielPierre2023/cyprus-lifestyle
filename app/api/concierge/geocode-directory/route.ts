// GET|POST /api/concierge/geocode-directory?key=<ENRICH_SECRET>
// Coordinate FAST PASS for the concierge's radius search. The bulk import (status
// 'listed') has no coordinates, so "nearest to me" skips it entirely. Geocoding every
// address one by one would crawl; instead this geocodes each DISTINCT town/village
// ONCE (cached in geocode_cache) and stamps that town's coordinate on every business
// in it — so radius search works within minutes. The per-address job (geocode_listing,
// now also fed 'listed' rows) then refines precision in the background.
//
// Re-runnable and chunked: if it can't finish in one pass, `remaining` > 0 — call
// again. Needs ENRICH_SECRET; a geocoder is optional (Google if keyed, else Nominatim,
// which is rate-limited politely). Only rows still missing coordinates are touched.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { geocode } from '@/lib/geo';
import { findLocality, localityQuery, type Locality } from '@/lib/concierge/localities';

export const runtime = 'nodejs';
export const maxDuration = 60;

const STATUSES = ['published', 'listed'];
const hasGoogle = () => !!(process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_GEOCODING_KEY || process.env.PLACES_KEY);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const cacheKey = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 160);

interface Row { slug: string; name_en: string | null; address: string | null; district: string | null }
type Pt = { lat: number; lng: number } | null;

async function run(): Promise<Record<string, unknown>> {
  const sb = supabaseAdmin();
  const started = Date.now();
  const BUDGET_MS = 45_000;
  const PAGE = 500;

  // Geocode each distinct locality once per run; a persistent geocode_cache hit needs
  // no external call (and no rate-limit sleep).
  const seen = new Map<string, Pt>();
  async function centroidFor(loc: Locality): Promise<Pt> {
    const key = `${loc.name}|${loc.district}`;
    if (seen.has(key)) return seen.get(key) as Pt;
    const q = localityQuery(loc);
    let cached = false; let pt: Pt = null;
    try {
      const { data } = await sb.from('geocode_cache').select('lat,lng').eq('q', cacheKey(q)).maybeSingle();
      if (data) { cached = true; pt = data.lat != null && data.lng != null ? { lat: data.lat as number, lng: data.lng as number } : null; }
    } catch { /* fall through to a live geocode */ }
    if (!cached) {
      const g = await geocode(q);
      pt = g ? { lat: g.lat, lng: g.lng } : null;
      if (!hasGoogle()) await sleep(1100); // be gentle with Nominatim (≤1 req/s)
    }
    seen.set(key, pt);
    return pt;
  }

  let stamped = 0, scanned = 0, unresolved = 0, localities = 0, after = '';
  for (;;) {
    if (Date.now() - started > BUDGET_MS) break;
    let q = sb.from('directory_listings').select('slug,name_en,address,district')
      .in('status', STATUSES).is('lat', null).order('slug').limit(PAGE);
    if (after) q = q.gt('slug', after);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message, stamped };
    const rows = (data as Row[] | null) || [];
    if (!rows.length) break;
    after = rows[rows.length - 1].slug;
    scanned += rows.length;

    // Bucket this page's rows by their resolved locality.
    const buckets = new Map<string, { loc: Locality; slugs: string[] }>();
    for (const r of rows) {
      const loc = findLocality(`${r.address || ''} ${r.name_en || ''}`);
      if (!loc) { unresolved++; continue; }
      const key = `${loc.name}|${loc.district}`;
      const b = buckets.get(key) || { loc, slugs: [] };
      b.slugs.push(r.slug);
      buckets.set(key, b);
    }
    // Stamp each locality's coordinate onto its businesses (still-null only, so we
    // never clobber a precise coordinate the per-address job may have set).
    for (const { loc, slugs } of buckets.values()) {
      if (Date.now() - started > BUDGET_MS) break;
      const pt = await centroidFor(loc);
      if (!pt) continue;
      localities++;
      for (let i = 0; i < slugs.length; i += 200) {
        const chunk = slugs.slice(i, i + 200);
        const { error: ue } = await sb.from('directory_listings').update({ lat: pt.lat, lng: pt.lng }).in('slug', chunk).is('lat', null);
        if (!ue) stamped += chunk.length;
      }
    }
  }

  let remaining: number | null = null;
  try {
    const { count } = await sb.from('directory_listings').select('slug', { count: 'exact', head: true }).in('status', STATUSES).is('lat', null);
    remaining = count ?? null;
  } catch { /* count is best-effort */ }

  return {
    ok: true, stamped, scanned, localitiesResolved: seen.size, localitiesStamped: localities,
    unresolvedRows: unresolved, remaining,
    note: remaining && remaining > 0
      ? 'Time budget reached, or the rest have no recognisable town — call again; anything still without coordinates is handled by the per-address geocode queue.'
      : 'Every locatable listing now has town-level coordinates.',
  };
}

function denyReason(req: NextRequest): string | null {
  if (!process.env.ENRICH_SECRET) return 'ENRICH_SECRET is not set on the server. Add it in Vercel → Settings → Environment Variables, redeploy, then call this URL with ?key=<that same value>.';
  if ((req.nextUrl.searchParams.get('key') || '') !== process.env.ENRICH_SECRET) return 'Unauthorized — the ?key= value does not match ENRICH_SECRET set on the server.';
  return null;
}

export async function GET(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run());
}
export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run());
}
