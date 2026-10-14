// lib/partners/geo.ts: spread map points that share (almost) one coordinate so each pin can be touched. Pure, unit-tested.
//
// Several Leptos projects are known only to the village (precision "town") and therefore share one point. For the DRAWING we put
// them on a small ring around it; the stored coordinates are never changed. The map caption says that the pins show the place.

export interface PointLike { lat: number; lng: number }

const M_PER_DEG_LAT = 111_320;

/** Spread points that sit within ~11 m of each other on rings (default 6 per ring, 130 m apart). Input order is kept. */
export function fanOut<T extends PointLike>(items: T[], opts: { stepM?: number; perRing?: number } = {}): T[] {
  const stepM = opts.stepM ?? 130;
  const perRing = opts.perRing ?? 6;
  const groups = new Map<string, number[]>();
  items.forEach((p, i) => {
    const k = `${p.lat.toFixed(4)},${p.lng.toFixed(4)}`;
    const g = groups.get(k);
    if (g) g.push(i); else groups.set(k, [i]);
  });
  const out = items.slice();
  for (const idx of groups.values()) {
    if (idx.length < 2) continue;
    const c = items[idx[0]];
    const mPerDegLng = M_PER_DEG_LAT * Math.cos((c.lat * Math.PI) / 180);
    // the first point keeps the centre; the others fill rings of `perRing`, `2*perRing`, ... points
    let ring = 1, placed = 0, cap = perRing;
    for (let n = 1; n < idx.length; n++) {
      if (placed >= cap) { ring++; placed = 0; cap = perRing * ring; }
      const angle = (2 * Math.PI * placed) / cap + (ring % 2 ? 0 : Math.PI / cap);
      const r = stepM * ring;
      out[idx[n]] = { ...items[idx[n]], lat: c.lat + (r * Math.sin(angle)) / M_PER_DEG_LAT, lng: c.lng + (r * Math.cos(angle)) / mPerDegLng };
      placed++;
    }
  }
  return out;
}

/** Great-circle distance in metres (haversine). */
export function distM(a: PointLike, b: PointLike): number {
  const R = 6_371_000, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
