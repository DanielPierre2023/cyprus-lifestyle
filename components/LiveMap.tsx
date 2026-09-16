'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { TYPE_COLORS } from '@/components/DirectoryMap';

export interface LiveItem { id: string; name: string; type: string; district: string | null; lat: number; lng: number; href: string; }

const GOLD = '#C9A24C';
const ITEM_COLORS: Record<string, string> = { ...TYPE_COLORS, event: GOLD };
const CARTO_ATTR = '&copy; OpenStreetMap contributors &copy; CARTO';
const OSM_ATTR = '&copy; OpenStreetMap contributors';

function tile(locale: string): { url: string; attr: string } {
  const cartoKey = process.env.NEXT_PUBLIC_CARTO_KEY;
  const style = process.env.NEXT_PUBLIC_MAP_TILE_STYLE || 'voyager';
  if (process.env.NEXT_PUBLIC_MAP_TILE_URL) {
    return { url: process.env.NEXT_PUBLIC_MAP_TILE_URL.replace('{lang}', locale).replace('{key}', cartoKey || ''), attr: process.env.NEXT_PUBLIC_MAP_TILE_ATTR || CARTO_ATTR };
  }
  if (cartoKey) return { url: `https://{s}.basemaps.cartocdn.com/rastertiles/${style}/{z}/{x}/{y}.png?key=${cartoKey}`, attr: process.env.NEXT_PUBLIC_MAP_TILE_ATTR || CARTO_ATTR };
  return { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: OSM_ATTR };
}

export default function LiveMap({ items, locale = 'en', labels }: { items: LiveItem[]; locale?: string; labels: Record<string, string> }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const layerRef = useRef<import('leaflet').FeatureGroup | null>(null);
  const markerById = useRef<Record<string, import('leaflet').CircleMarker>>({});
  const LRef = useRef<typeof import('leaflet') | null>(null);

  const types = useMemo(() => {
    const present = Array.from(new Set(items.map((i) => i.type)));
    // stable, listings first then event
    const order = ['restaurant', 'winery', 'hotel', 'beach', 'development', 'vendor', 'event'];
    return present.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [items]);

  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  useEffect(() => { const e: Record<string, boolean> = {}; types.forEach((t) => (e[t] = true)); setEnabled(e); }, [types]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => (enabled[i.type] ?? true) && (!term || i.name.toLowerCase().includes(term) || (i.district || '').toLowerCase().includes(term)));
  }, [items, enabled, q]);

  // init map once
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;
      const map = L.map(mapEl.current, { scrollWheelZoom: true, zoomControl: true });
      const { url, attr } = tile(locale);
      L.tileLayer(url, { attribution: attr, subdomains: 'abc', maxZoom: 19 }).addTo(map);
      map.setView([34.92, 33.0], 9);
      mapRef.current = map;
      renderMarkers();
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // re-render markers when the filtered set changes
  useEffect(() => { renderMarkers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [shown]);

  function renderMarkers() {
    const L = LRef.current; const map = mapRef.current;
    if (!L || !map) return;
    if (layerRef.current) { layerRef.current.remove(); layerRef.current = null; }
    markerById.current = {};
    const markers = shown.map((i) => {
      const color = ITEM_COLORS[i.type] || GOLD;
      const m = L.circleMarker([i.lat, i.lng], { radius: i.type === 'event' ? 8 : 6, color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.95 });
      const safe = i.name.replace(/[<>&]/g, '');
      m.bindPopup(`<a href="${i.href}" style="color:#8a5b12;font-weight:600">${safe}</a>${i.district ? `<br><span style="color:#8a8371;font-size:12px">${i.district}</span>` : ''}`);
      markerById.current[i.id] = m;
      return m;
    });
    const group = L.featureGroup(markers).addTo(map);
    layerRef.current = group;
    if (markers.length) { try { map.fitBounds(group.getBounds().pad(0.2), { maxZoom: 12 }); } catch { /* single point */ } }
  }

  function focus(i: LiveItem) {
    const map = mapRef.current; const m = markerById.current[i.id];
    if (!map) return;
    map.setView([i.lat, i.lng], 14, { animate: true });
    if (m) m.openPopup();
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: 'calc(100vh - 120px)', border: '1px solid #1c2128', borderRadius: 6, overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ flex: '1 1 320px', maxWidth: 380, background: '#0B0E11', color: '#e7e0d2', display: 'flex', flexDirection: 'column', minHeight: 360 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1c2128' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search places, venues, events…"
            style={{ width: '100%', background: '#161b22', border: '1px solid #262d36', color: '#e7e0d2', borderRadius: 6, padding: '10px 12px', fontSize: 14 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
            {types.map((tp) => (
              <button key={tp} type="button" onClick={() => setEnabled((s) => ({ ...s, [tp]: !(s[tp] ?? true) }))}
                style={{
                  fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                  border: `1px solid ${enabled[tp] === false ? '#2a323c' : (ITEM_COLORS[tp] || GOLD)}`,
                  background: enabled[tp] === false ? 'transparent' : (ITEM_COLORS[tp] || GOLD),
                  color: enabled[tp] === false ? '#8a8f98' : '#0B0E11', fontWeight: 600, textTransform: 'capitalize',
                }}>
                {labels[tp] || tp}
              </button>
            ))}
          </div>
        </div>
        <div style={{ padding: '8px 8px', fontSize: 11, color: '#8a8f98', textTransform: 'uppercase', letterSpacing: '.06em' }}>{shown.length} in view</div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {shown.slice(0, 400).map((i) => (
            <button key={i.id} type="button" onClick={() => focus(i)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #161b22', color: '#e7e0d2', padding: '10px 16px', cursor: 'pointer' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ITEM_COLORS[i.type] || GOLD, marginRight: 8 }} />
              <span style={{ fontWeight: 600 }}>{i.name}</span>
              <span style={{ display: 'block', fontSize: 12, color: '#8a8f98', marginLeft: 16 }}>{labels[i.type] || i.type}{i.district ? ` · ${i.district}` : ''}</span>
            </button>
          ))}
          {shown.length === 0 ? <p style={{ padding: 16, color: '#8a8f98' }}>Nothing matches those filters.</p> : null}
        </div>
      </div>
      {/* Map */}
      <div ref={mapEl} style={{ flex: '2 1 420px', minHeight: 360, height: 'auto' }} aria-label="Map" />
    </div>
  );
}
