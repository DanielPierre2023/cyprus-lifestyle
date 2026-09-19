'use client';
import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

export interface MapPoint {
  lat: number;
  lng: number;
  name: string;
  href?: string;
  type?: string;
  image?: string | null;
}

// Brand-coordinated colours per directory type (used for map pins + legend).
export const TYPE_COLORS: Record<string, string> = {
  restaurant: '#C0492E',
  winery: '#7B2D42',
  hotel: '#1F6F78',
  beach: '#2F86C4',
  development: '#8A6D3B',
  vendor: '#4E7A46',
  event: '#C9A24C',
};
const GOLD = '#C9A24C';

const CARTO_ATTR = '&copy; OpenStreetMap contributors &copy; CARTO';
const OSM_ATTR = '&copy; OpenStreetMap contributors';

function esc(s: string): string {
  return String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
}

export default function DirectoryMap({
  points, height = 520, typeLabels, locale = 'en', viewLabel = 'View', placesLabel = 'places', ariaLabel = 'Map',
}: {
  points: MapPoint[];
  height?: number;
  typeLabels?: Record<string, string>;
  locale?: string;
  viewLabel?: string;
  placesLabel?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | undefined>(undefined);
  const groupsRef = useRef<Record<string, import('leaflet').FeatureGroup>>({});
  const [off, setOff] = useState<Record<string, boolean>>({});

  // Types present in the data, in a stable order matching TYPE_COLORS.
  const present = Object.keys(TYPE_COLORS).filter((t) => points.some((p) => p.type === t));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default;
      const el = ref.current;
      if (cancelled || !el || el.dataset.init === '1') return;
      el.dataset.init = '1';
      const pts = points.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));
      const map = L.map(el, { scrollWheelZoom: false, preferCanvas: true, zoomControl: true });
      mapRef.current = map;

      const cartoKey = process.env.NEXT_PUBLIC_CARTO_KEY;
      const style = process.env.NEXT_PUBLIC_MAP_TILE_STYLE || 'voyager';
      let tileUrl: string; let attr: string;
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

      // One FeatureGroup per type so the legend can toggle each independently.
      const groups: Record<string, import('leaflet').FeatureGroup> = {};
      for (const p of pts) {
        const key = (p.type && TYPE_COLORS[p.type]) ? p.type : 'vendor';
        const color = TYPE_COLORS[key] || GOLD;
        const m = L.circleMarker([p.lat, p.lng], {
          radius: 6, color: '#fff', weight: 1.5, fillColor: color, fillOpacity: 0.95, bubblingMouseEvents: false,
        });
        const label = (typeLabels && p.type && typeLabels[p.type]) ? typeLabels[p.type] : (p.type || '');
        const img = p.image ? `<span class="mp-img" style="background-image:url('${esc(p.image)}')"></span>` : '';
        const link = p.href ? `<a class="mp-go" href="${esc(p.href)}">${esc(viewLabel)} →</a>` : '';
        m.bindPopup(
          `<div class="mp">${img}<div class="mp-b">${label ? `<span class="mp-t" style="color:${color}">${esc(label)}</span>` : ''}<b>${esc(p.name)}</b>${link}</div></div>`,
          { minWidth: 200, maxWidth: 240, closeButton: true, className: 'mp-pop' },
        );
        (groups[key] ||= L.featureGroup()).addLayer(m);
      }
      groupsRef.current = groups;
      const all = L.featureGroup(Object.values(groups)).addTo(map);
      if (pts.length) map.fitBounds(all.getBounds().pad(0.15), { maxZoom: 12 });
      else map.setView([34.92, 33.0], 8);
    })();
    return () => {
      cancelled = true;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = undefined; }
      groupsRef.current = {};
      if (ref.current) delete ref.current.dataset.init;
    };
    // typeLabels is only read for popup text; excluded from deps so a new object
    // identity per render never forces a full map rebuild.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, locale]);

  // Legend toggle → show/hide a type's group on the already-built map.
  useEffect(() => {
    const map = mapRef.current; const groups = groupsRef.current;
    if (!map) return;
    for (const [key, group] of Object.entries(groups)) {
      if (off[key]) { if (map.hasLayer(group)) map.removeLayer(group); }
      else if (!map.hasLayer(group)) map.addLayer(group);
    }
  }, [off]);

  const legend = typeLabels ? present : [];
  const visibleCount = points.filter((p) => {
    const key = (p.type && TYPE_COLORS[p.type]) ? p.type : 'vendor';
    return !off[key];
  }).length;

  return (
    // isolate: keep Leaflet's internal z-indexes (panes 400–700, controls up to
    // 1000) inside this box so they can't render over the fixed concierge chat.
    <div style={{ position: 'relative', isolation: 'isolate' }}>
      <style>{`
        .mp-pop .leaflet-popup-content-wrapper{border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:0;overflow:hidden}
        .mp-pop .leaflet-popup-content{margin:0;width:auto!important}
        .mp{display:flex;flex-direction:column;width:210px;font-family:var(--font-jost,system-ui,sans-serif)}
        .mp-img{display:block;height:112px;background-size:cover;background-position:center;background-color:#0B0E11}
        .mp-b{padding:10px 12px 12px}
        .mp-t{display:block;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:700;margin-bottom:3px}
        .mp-b b{font-family:var(--disp,Georgia,serif);font-weight:600;font-size:16px;line-height:1.2;color:#12181c;display:block}
        .mp-go{display:inline-block;margin-top:8px;font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a5b12;text-decoration:none}
        .mp-go:hover{text-decoration:underline}
        .dm-badge{position:absolute;top:10px;left:10px;z-index:500;background:rgba(255,255,255,.94);border:1px solid #e3d9c4;border-radius:999px;padding:5px 12px;font:600 12px/1 var(--font-jost,system-ui,sans-serif);color:#5b5647;box-shadow:0 2px 10px rgba(0,0,0,.08);letter-spacing:.02em}
        .dm-legend{position:absolute;top:10px;right:10px;z-index:500;background:rgba(255,255,255,.94);border:1px solid #e3d9c4;border-radius:6px;padding:7px;box-shadow:0 2px 10px rgba(0,0,0,.08);max-width:170px}
        .dm-legend button{display:flex;align-items:center;gap:7px;width:100%;background:none;border:0;padding:3px 5px;border-radius:4px;cursor:pointer;font:600 11px/1.4 var(--font-jost,system-ui,sans-serif);color:#5b5647;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap}
        .dm-legend button:hover{background:#f3ecdd}
        .dm-legend .sw{width:11px;height:11px;border-radius:50%;border:1px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.15);flex:0 0 auto}
        .dm-legend .lbl{flex:1 1 auto;text-align:left}
        .dm-legend button.is-off{opacity:.4}
      `}</style>
      <div ref={ref} style={{ height, width: '100%', borderRadius: 6, overflow: 'hidden', border: '1px solid #e3d9c4', boxShadow: '0 4px 20px rgba(0,0,0,.06)' }} aria-label={ariaLabel} />
      <div className="dm-badge">{visibleCount.toLocaleString()} {placesLabel}</div>
      {legend.length ? (
        <div className="dm-legend">
          {legend.map((t) => (
            <button key={t} type="button" className={off[t] ? 'is-off' : ''}
              onClick={() => setOff((o) => ({ ...o, [t]: !o[t] }))}
              aria-pressed={!off[t]} title={off[t] ? 'Show' : 'Hide'}>
              <span className="sw" style={{ background: TYPE_COLORS[t] || GOLD }} />
              <span className="lbl">{typeLabels![t]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
