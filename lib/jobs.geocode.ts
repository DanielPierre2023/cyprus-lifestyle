// lib/jobs.geocode.ts — pure helpers for the coordinate-backfill job (activation of the
// item-01 queue). Kept dependency-free so they can be unit-tested in isolation.

export interface GeocodableListing { lat?: number | null; lng?: number | null; address?: string | null; district?: string | null }

// Build a geocoding query for a listing from its address + district, scoped to Cyprus.
// Returns '' when there is nothing to geocode on.
export function geocodeQuery(l: GeocodableListing): string {
  const parts = [l.address, l.district].map((s) => (s || '').trim()).filter(Boolean);
  if (parts.length === 0) return '';
  return [...parts, 'Cyprus'].join(', ');
}

// A listing needs geocoding when it lacks coordinates but has something to geocode on.
export function needsGeocode(l: GeocodableListing): boolean {
  const missing = l.lat == null || l.lng == null;
  return missing && geocodeQuery(l).length > 0;
}
