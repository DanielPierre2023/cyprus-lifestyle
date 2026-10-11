// lib/events/geocode.ts — pure helpers for refining an event's pin from "town centroid" to its venue, using the existing free
// geocoder (lib/geo.ts: cached Nominatim). A venue pin is accepted only if it lies near the town we already know, so a wrong
// match elsewhere on the island never replaces a correct town pin.
import { CY_LOCALITIES, DISTRICT_NAME } from '@/lib/concierge/localities';

export function venueGeocodeQuery(e: { venue: string | null; district: string | null }): string {
  const v = (e.venue || '').replace(/\s+/g, ' ').trim();
  if (v.length < 3) return '';
  const d = e.district && (DISTRICT_NAME as Record<string, string>)[e.district];
  return [v, d, 'Cyprus'].filter(Boolean).join(', ');
}

export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371, rad = (x: number) => (x * Math.PI) / 180;
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Accept the venue point when there is no town pin yet, or when it is within 25 km of it. */
export function acceptVenuePoint(town: { lat: number | null; lng: number | null }, hit: { lat: number; lng: number } | null): boolean {
  if (!hit) return false;
  if (town.lat == null || town.lng == null) return true;
  return distanceKm(town.lat, town.lng, hit.lat, hit.lng) <= 25;
}

/** District of the closest known locality, if one lies within 12 km (used to fill a missing district from a venue pin). */
export function nearestDistrict(lat: number, lng: number): { district: string; name: string } | null {
  let best: { district: string; name: string; km: number } | null = null;
  for (const l of CY_LOCALITIES) {
    const km = distanceKm(lat, lng, l.lat, l.lng);
    if (!best || km < best.km) best = { district: l.district, name: l.name, km };
  }
  return best && best.km <= 12 ? { district: best.district, name: best.name } : null;
}
