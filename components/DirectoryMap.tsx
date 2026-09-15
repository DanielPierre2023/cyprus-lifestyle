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

// Base map. Default is a clean, label-free basemap so the map is language-neutral
// across all four editions (our own pins carry the localized names). To use a
// labelled / per-language provider, set NEXT_PUBLIC_MAP_TILE_URL (a Leaflet tile
// URL; the token {lang} is replaced with the current locale) and, if needed,
// NEXT_PUBLIC_MAP_TILE_ATTR. Any https tile host is allowed by the CSP.
const DEFAULT_TILES = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}.png';
const DEFAULT_ATTR = '&copy; OpenStreetMap contributors &copy; CARTO';

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

      const tileUrl = (process.env.NEXT_PUBLIC_MAP_TILE_URL || DEFAULT_TILES).replace('{lang}', locale);
      const attr = process.env.NEXT_PUBLIC_MAP_TILE_ATTR || DEFAULT_ATTR;
      L.tileLayer(tileUrl, { attribution: attr, subdomains: 'abcd', maxZoom: 18 }).addTo(map);

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
