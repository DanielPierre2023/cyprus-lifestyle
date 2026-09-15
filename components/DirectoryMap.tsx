'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  lat: number;
  lng: number;
  name: string;
  href?: string;
  type?: string;
}

// Brand-coordinated colours per directory type (used for map pins + legend).
export const TYPE_COLORS: Record<string, string> = {
  restaurant: '#C0492E',
  winery: '#7B2D42',
  hotel: '#1F6F78',
  beach: '#2F86C4',
  development: '#8A6D3B',
  vendor: '#4E7A46',
};
const GOLD = '#C9A24C';

// Base map resolution (NEXT_PUBLIC_* are inlined at build time — set them in
// Vercel and redeploy):
//   1) NEXT_PUBLIC_MAP_TILE_URL  — full Leaflet tile URL override; the tokens
//      {lang} (current locale) and {key} (NEXT_PUBLIC_CARTO_KEY) are substituted.
//      A full street map with cities, roads and labels (labels in local language).
//   2) NEXT_PUBLIC_CARTO_KEY     — CARTO basemaps now REQUIRE a key. Style is
//      NEXT_PUBLIC_MAP_TILE_STYLE (default 'voyager' = full labelled street map;
//      set 'voyager_nolabels' if you ever want a clean label-free base instead).
//   3) fallback — keyless OpenStreetMap (always works; full labelled street map).
const CARTO_ATTR = '&copy; OpenStreetMap contributors &copy; CARTO';
const OSM_ATTR = '&copy; OpenStreetMap contributors';

export default function DirectoryMap({
  points, height = 440, typeLabels, locale = 'en',
}: {
  points: MapPoint[];
  height?: number;
  typeLabels?: Record<string, string>;
  locale?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import('leaflet').Map | undefined;
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      const el = ref.current;
      if (cancelled || !el || el.dataset.init === '1') return;
      el.dataset.init = '1';
      const pts = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      map = L.map(el, { scrollWheelZoom: false });

      const cartoKey = process.env.NEXT_PUBLIC_CARTO_KEY;
      const style = process.env.NEXT_PUBLIC_MAP_TILE_STYLE || 'voyager';
      let tileUrl: string;
      let attr: string;
      if (process.env.NEXT_PUBLIC_MAP_TILE_URL) {
        tileUrl = process.env.NEXT_PUBLIC_MAP_TILE_URL.replace('{lang}', locale).replace('{key}', cartoKey || '');
        attr = process.env.NEXT_PUBLIC_MAP_TILE_ATTR || CARTO_ATTR;
      } else if (cartoKey) {
        tileUrl = `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png?key=${cartoKey}`;
        attr = process.env.NEXT_PUBLIC_MAP_TILE_ATTR || CARTO_ATTR;
      } else {
        tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
        attr = OSM_ATTR;
      }
      L.tileLayer(tileUrl, { attribution: attr, subdomains: 'abc', maxZoom: 19 }).addTo(map);

      if (pts.length) {
        const markers = pts.map((p) => {
          const color = (p.type && TYPE_COLORS[p.type]) || GOLD;
          const m = L.circleMarker([p.lat, p.lng], {
            radius: 7, color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.95,
          });
          const safe = p.name.replace(/[<>&]/g, '');
          m.bindPopup(p.href ? `<a href="${p.href}">${safe}</a>` : safe);
          return m;
        });
        const group = L.featureGroup(markers).addTo(map);
        map.fitBounds(group.getBounds().pad(0.25), { maxZoom: 12 });
      } else {
        map.setView([34.92, 33.0], 8); // Cyprus
      }
    })();
    return () => {
      cancelled = true;
      if (map) map.remove();
      if (ref.current) delete ref.current.dataset.init;
    };
  }, [points, locale]);

  // Legend (only when caller passes localized type labels and points carry types).
  const legendTypes = typeLabels
    ? Object.keys(typeLabels).filter((t) => points.some((p) => p.type === t))
    : [];

  return (
    <div style={{ position: 'relative' }}>
      <div ref={ref} style={{ height, width: '100%', borderRadius: 4, overflow: 'hidden' }} aria-label="Map" />
      {legendTypes.length ? (
        <div style={{
          position: 'absolute', top: 10, right: 10, zIndex: 500,
          background: 'rgba(255,255,255,0.92)', border: '1px solid #e3d9c4', borderRadius: 4,
          padding: '8px 10px', font: '11px/1.5 var(--font-jost, system-ui, sans-serif)',
          boxShadow: '0 2px 10px rgba(0,0,0,.08)', maxWidth: 160,
        }}>
          {legendTypes.map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: TYPE_COLORS[t] || GOLD, display: 'inline-block', border: '1px solid #fff', boxShadow: '0 0 0 1px rgba(0,0,0,.15)' }} />
              <span style={{ textTransform: 'uppercase', letterSpacing: '.08em', color: '#5b5647' }}>{typeLabels![t]}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
