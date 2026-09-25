'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TYPE_COLORS } from '@/components/DirectoryMap';
import { loadMaplibre, cartoGlStyle, type MlMap, type MlPopup, type MaplibreGL, type GeoFeature, type GeoJSON } from '@/lib/map/maplibre';

export interface LiveItem { id: string; name: string; type: string; district: string | null; lat: number; lng: number; href: string; }

const GOLD = '#C9A24C';
const ITEM_COLORS: Record<string, string> = { ...TYPE_COLORS, event: GOLD };

function esc(s: string): string {
  return String(s).replace(/[<>&"']/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

// Colour points by type via a MapLibre "match" expression.
function colorExpression(): unknown {
  const match: unknown[] = ['match', ['get', 'type']];
  for (const [type, color] of Object.entries(ITEM_COLORS)) match.push(type, color);
  match.push(GOLD);
  return match;
}

export default function LiveMap({ items, locale = 'en', labels, ui }: { items: LiveItem[]; locale?: string; labels: Record<string, string>; ui: { search: string; inView: string; noMatches: string; mapAria: string; live: string; watchLive: string } }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const mlRef = useRef<MaplibreGL | null>(null);
  const popupRef = useRef<MlPopup | null>(null);
  const readyRef = useRef(false);

  const types = useMemo(() => {
    const present = Array.from(new Set(items.map((i) => i.type)));
    const order = ['restaurant', 'winery', 'hotel', 'beach', 'development', 'vendor', 'event'];
    return present.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [items]);

  const [enabled, setEnabled] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [showCams, setShowCams] = useState(true);
  useEffect(() => { const e: Record<string, boolean> = {}; types.forEach((t) => (e[t] = true)); setEnabled(e); }, [types]);

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    return items.filter((i) => (enabled[i.type] ?? true) && (!term || i.name.toLowerCase().includes(term) || (i.district || '').toLowerCase().includes(term)));
  }, [items, enabled, q]);

  const features = useMemo<GeoFeature[]>(() => shown
    .filter((i) => Number.isFinite(i.lat) && Number.isFinite(i.lng))
    .map((i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [i.lng, i.lat] },
      properties: { id: i.id, name: i.name, type: i.type, href: i.href, district: i.district || '' },
    })), [shown]);

  // Init the map once.
  useEffect(() => {
    let cancelled = false;
    const el = mapEl.current;
    if (!el) return;
    (async () => {
      let maplibregl: MaplibreGL;
      try { maplibregl = await loadMaplibre(); } catch { return; }
      if (cancelled || mapRef.current) return;
      mlRef.current = maplibregl;
      const map = new maplibregl.Map({
        container: el,
        style: cartoGlStyle(),
        center: [33.0, 34.92],
        zoom: 8,
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

      map.on('load', () => {
        if (cancelled) return;
        map.resize();
        map.addSource('items', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features },
          cluster: true,
          clusterRadius: 46,
          clusterMaxZoom: 13,
        });
        map.addLayer({
          id: 'clusters', type: 'circle', source: 'items', filter: ['has', 'point_count'],
          paint: {
            'circle-color': '#0B0E11', 'circle-opacity': 0.85,
            'circle-stroke-color': GOLD, 'circle-stroke-width': 1.5,
            'circle-radius': ['step', ['get', 'point_count'], 15, 25, 20, 100, 26, 500, 34],
          },
        });
        map.addLayer({
          id: 'cluster-count', type: 'symbol', source: 'items', filter: ['has', 'point_count'],
          layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-size': 12, 'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'] },
          paint: { 'text-color': '#F4EFE6' },
        });
        map.addLayer({
          id: 'points', type: 'circle', source: 'items', filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': colorExpression(),
            'circle-radius': ['case', ['==', ['get', 'type'], 'event'], 8, 6],
            'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.5,
          },
        });

        // ── Live-webcam layer (distinct gold-ringed marker), fetched from the API ──
        map.addSource('webcams', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({
          id: 'webcams', type: 'circle', source: 'webcams',
          paint: {
            'circle-color': '#0B0E11',
            'circle-radius': 7,
            'circle-stroke-color': GOLD,
            'circle-stroke-width': 3,
          },
        });
        fetch(`/api/map/webcams.geojson?locale=${encodeURIComponent(locale)}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((gj) => { if (!cancelled && gj) mapRef.current?.getSource('webcams')?.setData(gj as GeoJSON); })
          .catch(() => {});

        map.on('click', 'clusters', (e) => {
          const f = e.features?.[0];
          if (!f) return;
          const clusterId = f.properties.cluster_id as number;
          map.getSource('items')?.getClusterExpansionZoom(clusterId)
            .then((zoom) => map.easeTo({ center: f.geometry.coordinates, zoom }))
            .catch(() => {});
        });
        map.on('click', 'points', (e) => {
          const f = e.features?.[0];
          if (!f) return;
          openPopup(f.geometry.coordinates, f.properties as { name?: string; href?: string; district?: string });
        });
        map.on('click', 'webcams', (e) => {
          const f = e.features?.[0];
          if (!f) return;
          openCamPopup(f.geometry.coordinates, f.properties as { name?: string; url?: string; area?: string; district?: string });
        });
        for (const layer of ['clusters', 'points', 'webcams']) {
          map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
          map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
        }

        fitToData();
        readyRef.current = true;
      });
    })();
    return () => {
      cancelled = true;
      popupRef.current?.remove();
      popupRef.current = null;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      readyRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Sync filtered business data → source.
  useEffect(() => {
    if (!readyRef.current) return;
    mapRef.current?.getSource('items')?.setData({ type: 'FeatureCollection', features });
  }, [features]);

  // Toggle the webcam layer.
  useEffect(() => {
    if (!readyRef.current) return;
    try { mapRef.current?.setLayoutProperty('webcams', 'visibility', showCams ? 'visible' : 'none'); } catch { /* layer not ready yet */ }
  }, [showCams]);

  function fitToData() {
    const map = mapRef.current; const maplibregl = mlRef.current;
    if (!map || !maplibregl) return;
    const b = new maplibregl.LngLatBounds();
    let n = 0;
    for (const f of features) { b.extend(f.geometry.coordinates); n++; }
    if (n > 0 && !b.isEmpty()) map.fitBounds(b, { padding: 40, maxZoom: 12, duration: 0 });
  }

  function openPopup(coords: [number, number], p: { name?: string; href?: string; district?: string }) {
    const map = mapRef.current; const maplibregl = mlRef.current;
    if (!map || !maplibregl) return;
    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '240px' })
      .setLngLat(coords)
      .setHTML(`<a href="${esc(p.href || '')}" style="color:#8a5b12;font-weight:600">${esc(p.name || '')}</a>${p.district ? `<br><span style="color:#8a8371;font-size:12px">${esc(p.district)}</span>` : ''}`)
      .addTo(map);
  }

  function openCamPopup(coords: [number, number], p: { name?: string; url?: string; area?: string; district?: string }) {
    const map = mapRef.current; const maplibregl = mlRef.current;
    if (!map || !maplibregl) return;
    const place = [p.area, p.district].filter(Boolean).join(' · ');
    const external = !!(p.url && /^https?:\/\//.test(p.url));
    const target = external ? ' target="_blank" rel="noopener nofollow"' : '';
    popupRef.current?.remove();
    popupRef.current = new maplibregl.Popup({ closeButton: true, maxWidth: '240px' })
      .setLngLat(coords)
      .setHTML(`<b style="font-family:var(--disp,Georgia,serif);color:#12181c">${esc(p.name || '')}</b>${place ? `<br><span style="color:#8a8371;font-size:12px">${esc(place)}</span>` : ''}${p.url ? `<br><a href="${esc(p.url)}"${target} style="display:inline-block;margin-top:6px;color:#8a5b12;font-weight:600;font-size:12px">${esc(ui.watchLive)} →</a>` : ''}`)
      .addTo(map);
  }

  function focus(i: LiveItem) {
    const map = mapRef.current;
    if (!map) return;
    map.flyTo({ center: [i.lng, i.lat], zoom: 14 });
    openPopup([i.lng, i.lat], { name: i.name, href: i.href, district: i.district || '' });
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', minHeight: 'calc(100vh - 120px)', border: '1px solid #1c2128', borderRadius: 6, overflow: 'hidden', isolation: 'isolate' }}>
      {/* Sidebar */}
      <div style={{ flex: '1 1 320px', maxWidth: 380, background: '#0B0E11', color: '#e7e0d2', display: 'flex', flexDirection: 'column', minHeight: 360 }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #1c2128' }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ui.search}
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
            {/* Live-webcam layer toggle */}
            <button type="button" onClick={() => setShowCams((v) => !v)}
              style={{
                fontSize: 12, padding: '4px 10px', borderRadius: 999, cursor: 'pointer',
                border: `1px solid ${GOLD}`,
                background: showCams ? GOLD : 'transparent',
                color: showCams ? '#0B0E11' : '#8a8f98', fontWeight: 600,
              }}>
              📹 {ui.live}
            </button>
          </div>
        </div>
        <div style={{ padding: '8px 8px', fontSize: 11, color: '#8a8f98', textTransform: 'uppercase', letterSpacing: '.06em' }}>{shown.length} {ui.inView}</div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {shown.slice(0, 400).map((i) => (
            <button key={i.id} type="button" onClick={() => focus(i)}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderBottom: '1px solid #161b22', color: '#e7e0d2', padding: '10px 16px', cursor: 'pointer' }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: ITEM_COLORS[i.type] || GOLD, marginRight: 8 }} />
              <span style={{ fontWeight: 600 }}>{i.name}</span>
              <span style={{ display: 'block', fontSize: 12, color: '#8a8f98', marginLeft: 16 }}>{labels[i.type] || i.type}{i.district ? ` · ${i.district}` : ''}</span>
            </button>
          ))}
          {shown.length === 0 ? <p style={{ padding: 16, color: '#8a8f98' }}>{ui.noMatches}</p> : null}
        </div>
      </div>
      {/* Map */}
      <div ref={mapEl} style={{ flex: '2 1 420px', minHeight: 360, height: 'auto' }} aria-label={ui.mapAria} />
    </div>
  );
}
