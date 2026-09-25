'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadMaplibre, cartoGlStyle, type MlMap, type MlPopup, type GeoFeature } from '@/lib/map/maplibre';

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

// HTML-escape for popup content — escapes quotes too so a value can never break
// out of an attribute (e.g. an image URL or name containing a double quote).
function esc(s: string): string {
  return String(s).replace(/[<>&"']/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

function normType(t?: string): string {
  return t && TYPE_COLORS[t] ? t : 'vendor';
}

// A MapLibre "match" expression that colours each point by its type.
function colorExpression(): unknown {
  const match: unknown[] = ['match', ['get', 'type']];
  for (const [type, color] of Object.entries(TYPE_COLORS)) match.push(type, color);
  match.push(GOLD); // default
  return match;
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
  const mapRef = useRef<MlMap | null>(null);
  const popupRef = useRef<MlPopup | null>(null);
  const readyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [off, setOff] = useState<Record<string, boolean>>({});

  // Types present in the data, in a stable order matching TYPE_COLORS.
  const present = useMemo(
    () => Object.keys(TYPE_COLORS).filter((t) => points.some((p) => normType(p.type) === t)),
    [points],
  );

  const features = useMemo<GeoFeature[]>(() => points
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .filter((p) => !off[normType(p.type)])
    .map((p) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { name: p.name, type: normType(p.type), href: p.href || '', image: p.image || '' },
    })), [points, off]);

  // Init the map once.
  useEffect(() => {
    let cancelled = false;
    const el = ref.current;
    if (!el) return;
    (async () => {
      let maplibregl;
      try { maplibregl = await loadMaplibre(); } catch { return; }
      if (cancelled || mapRef.current) return;
      const map = new maplibregl.Map({
        container: el,
        style: cartoGlStyle(),
        center: [33.2, 34.92],
        zoom: 7.4,
        attributionControl: { compact: true },
        scrollZoom: false,
        cooperativeGestures: true,
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      map.on('load', () => {
        if (cancelled) return;
        map.addSource('dir', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
          cluster: true,
          clusterRadius: 48,
          clusterMaxZoom: 13,
        });
        // Cluster bubbles.
        map.addLayer({
          id: 'clusters', type: 'circle', source: 'dir', filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#0B0E11',
            'circle-opacity': 0.85,
            'circle-stroke-color': GOLD,
            'circle-stroke-width': 1.5,
            'circle-radius': ['step', ['get', 'point_count'], 15, 25, 20, 100, 26, 500, 34],
          },
        });
        map.addLayer({
          id: 'cluster-count', type: 'symbol', source: 'dir', filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'] },
          paint: { 'text-color': '#F4EFE6' },
        });
        // Individual points, coloured by type.
        map.addLayer({
          id: 'points', type: 'circle', source: 'dir', filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': colorExpression(),
            'circle-radius': 6,
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.5,
          },
        });

        // Cluster click → zoom to expansion.
        map.on('click', 'clusters', (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const clusterId = f.properties.cluster_id as number;
          const src = map.getSource('dir');
          src?.getClusterExpansionZoom(clusterId).then((zoom) => {
            map.easeTo({ center: f.geometry.coordinates, zoom });
          }).catch(() => {});
        });
        // Point click → popup.
        map.on('click', 'points', (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const p = f.properties as { name?: string; type?: string; href?: string; image?: string };
          const type = normType(p.type);
          const color = TYPE_COLORS[type] || GOLD;
          const label = (typeLabels && p.type && typeLabels[p.type]) ? typeLabels[p.type] : (p.type || '');
          const img = p.image ? `<span class="mp-img" style="background-image:url('${esc(p.image)}')"></span>` : '';
          const link = p.href ? `<a class="mp-go" href="${esc(p.href)}">${esc(viewLabel)} →</a>` : '';
          popupRef.current?.remove();
          popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '240px', className: 'mp-pop' })
            .setLngLat(f.geometry.coordinates)
            .setHTML(`<div class="mp">${img}<div class="mp-b">${label ? `<span class="mp-t" style="color:${color}">${esc(label)}</span>` : ''}<b>${esc(p.name || '')}</b>${link}</div></div>`)
            .addTo(map);
        });
        for (const layer of ['clusters', 'points']) {
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
        }

        // Fit to the data once.
        fitToData(mapRef.current, maplibregl);
        readyRef.current = true;
        setReady(true);
      });
    })();
    return () => {
      cancelled = true;
      popupRef.current?.remove();
      popupRef.current = null;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      readyRef.current = false;
    };
    // Init once; data changes are handled by the sync effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Push filtered data to the source whenever the visible set changes.
  useEffect(() => {
    if (!readyRef.current) return;
    const src = mapRef.current?.getSource('dir');
    src?.setData({ type: 'FeatureCollection', features });
  }, [features]);

  function fitToData(map: MlMap | null, maplibregl: Awaited<ReturnType<typeof loadMaplibre>>) {
    if (!map) return;
    const b = new maplibregl.LngLatBounds();
    let n = 0;
    for (const f of features) { b.extend(f.geometry.coordinates); n++; }
    if (n > 0 && !b.isEmpty()) map.fitBounds(b, { padding: 48, maxZoom: 12, duration: 0 });
  }

  const legend = typeLabels ? present : [];
  const visibleCount = points.filter((p) => !off[normType(p.type)]).length;

  return (
    <div style={{ position: 'relative', isolation: 'isolate' }}>
      <style>{`
        .maplibregl-popup.mp-pop .maplibregl-popup-content{border-radius:6px;box-shadow:0 6px 24px rgba(0,0,0,.18);padding:0;overflow:hidden}
        .mp{display:flex;flex-direction:column;width:210px;font-family:var(--font-jost,system-ui,sans-serif)}
        .mp-img{display:block;height:112px;background-size:cover;background-position:center;background-color:#0B0E11}
        .mp-b{padding:10px 12px 12px}
        .mp-t{display:block;text-transform:uppercase;letter-spacing:.12em;font-size:10px;font-weight:700;margin-bottom:3px}
        .mp-b b{font-family:var(--disp,Georgia,serif);font-weight:600;font-size:16px;line-height:1.2;color:#12181c;display:block}
        .mp-go{display:inline-block;margin-top:8px;font-size:12px;font-weight:600;letter-spacing:.04em;color:#8a5b12;text-decoration:none}
        .mp-go:hover{text-decoration:underline}
        .dm-badge{position:absolute;top:10px;left:10px;z-index:5;background:rgba(255,255,255,.94);border:1px solid #e3d9c4;border-radius:999px;padding:5px 12px;font:600 12px/1 var(--font-jost,system-ui,sans-serif);color:#5b5647;box-shadow:0 2px 10px rgba(0,0,0,.08);letter-spacing:.02em}
        .dm-legend{position:absolute;top:10px;right:10px;z-index:5;background:rgba(255,255,255,.94);border:1px solid #e3d9c4;border-radius:6px;padding:7px;box-shadow:0 2px 10px rgba(0,0,0,.08);max-width:170px}
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
              aria-pressed={!off[t]} title={off[t] ? 'Show' : 'Hide'} disabled={!ready && !off[t]}>
              <span className="sw" style={{ background: TYPE_COLORS[t] || GOLD }} />
              <span className="lbl">{typeLabels![t]}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
