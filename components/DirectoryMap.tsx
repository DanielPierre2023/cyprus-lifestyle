'use client';
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  lat: number;
  lng: number;
  name: string;
  href?: string;
}

// Vanilla Leaflet (no react-leaflet, no marker image assets — circle markers) so
// it is robust across React/Next versions. OpenStreetMap tiles; the map only
// renders points that have coordinates.
export default function DirectoryMap({ points, height = 440 }: { points: MapPoint[]; height?: number }) {
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
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18,
      }).addTo(map);
      if (pts.length) {
        const markers = pts.map((p) => {
          const m = L.circleMarker([p.lat, p.lng], {
            radius: 7,
            color: '#C9A24C',
            fillColor: '#C9A24C',
            fillOpacity: 0.9,
            weight: 2,
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
  }, [points]);

  return <div ref={ref} style={{ height, width: '100%', borderRadius: 4, overflow: 'hidden' }} aria-label="Map" />;
}
