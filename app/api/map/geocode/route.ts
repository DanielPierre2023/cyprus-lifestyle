// GET /api/map/geocode?q=<place or address>
// Powers the map's "search for a place or address" box. Resolves the text to a
// point inside Cyprus with lib/geo.ts → geocode(): Google Geocoding when
// GOOGLE_MAPS_KEY / GOOGLE_GEOCODING_KEY / PLACES_KEY is set (the key stays on
// the server), otherwise free Nominatim (OSM). Results — hits and misses — are
// cached in geocode_cache, and the route is rate-limited per IP.
import { NextRequest, NextResponse } from 'next/server';
import { geocode } from '@/lib/geo';
import { rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') || '').trim().slice(0, 160);
  if (q.length < 2) return NextResponse.json({ error: 'query too short' }, { status: 400 });
  if (!(await rateLimit(req, 'map-geocode', 20, 60))) return NextResponse.json({ error: 'slow down' }, { status: 429 });
  const hit = await geocode(q);
  if (!hit) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(hit, { headers: { 'Cache-Control': 'public, max-age=86400' } });
}
