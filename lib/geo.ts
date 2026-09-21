// lib/geo.ts — neighbourhood geocoding + distance for the concierge.
// Turns a street / area / postcode into a point (cached in geocode_cache so we never
// pay to resolve the same place twice), and measures real distance so the concierge
// can answer "what's around here". Cyprus-bounded so a stray match elsewhere is
// rejected. Uses Google Geocoding when a key is set, otherwise free Nominatim (OSM).
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface GeoPoint { lat: number; lng: number; label: string }

// Whole island bounding box (rejects wrong-country geocodes). The directory is
// south-only, so radius results are south regardless of the point.
const CY = { minLat: 34.45, maxLat: 35.75, minLng: 32.2, maxLng: 34.65 };
const inCyprus = (lat: number, lng: number) =>
  lat >= CY.minLat && lat <= CY.maxLat && lng >= CY.minLng && lng <= CY.maxLng;

export function haversineMeters(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000, toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// A lat/lng box that safely encloses a radius (for an indexed pre-filter).
export function bbox(lat: number, lng: number, radiusM: number) {
  const dLat = radiusM / 111_320;
  const dLng = radiusM / (111_320 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)));
  return { minLat: lat - dLat, maxLat: lat + dLat, minLng: lng - dLng, maxLng: lng + dLng };
}

const norm = (q: string) => q.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 160);

async function providerGeocode(q: string): Promise<GeoPoint | null> {
  const key = process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_GEOCODING_KEY || process.env.PLACES_KEY;
  const query = /cyprus|κύπρο|кипр|zypern/i.test(q) ? q : `${q}, Cyprus`;
  try {
    if (key) {
      const u = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=cy&key=${key}`;
      const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
      const d = await r.json();
      const g = d?.results?.[0];
      if (g?.geometry?.location) {
        const { lat, lng } = g.geometry.location;
        if (inCyprus(lat, lng)) return { lat, lng, label: g.formatted_address || q };
      }
      return null;
    }
    // Free fallback — Nominatim (OSM). Needs a UA; be gentle (cached, low volume).
    const u = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=cy&format=json&limit=1&addressdetails=0`;
    const r = await fetch(u, { headers: { 'User-Agent': 'CyprusLifestyle/1.0 (concierge geocoder)' }, signal: AbortSignal.timeout(8000) });
    const arr = await r.json();
    const g = Array.isArray(arr) ? arr[0] : null;
    if (g) {
      const lat = Number(g.lat), lng = Number(g.lon);
      if (isFinite(lat) && isFinite(lng) && inCyprus(lat, lng)) return { lat, lng, label: g.display_name || q };
    }
    return null;
  } catch { return null; }
}

// Resolve a location string to a point, caching both hits and misses.
export async function geocode(query: string): Promise<GeoPoint | null> {
  const q = norm(query);
  if (q.length < 2) return null;
  const sb = supabaseAdmin();
  try {
    const { data } = await sb.from('geocode_cache').select('lat, lng, label').eq('q', q).maybeSingle();
    if (data) return data.lat != null && data.lng != null ? { lat: data.lat as number, lng: data.lng as number, label: (data.label as string) || query } : null;
  } catch { /* cache miss path */ }

  const hit = await providerGeocode(q);
  try {
    await sb.from('geocode_cache').upsert({
      q, lat: hit?.lat ?? null, lng: hit?.lng ?? null, label: hit?.label ?? null,
      provider: (process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_GEOCODING_KEY || process.env.PLACES_KEY) ? 'google' : 'nominatim',
    });
  } catch { /* best-effort cache */ }
  return hit;
}
