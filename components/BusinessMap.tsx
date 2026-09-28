'use client';
// ============================================================================
// Interactive directory map (paralieslive-style), embedded on /directory.
// Left sidebar = canonical categories (classy line icon + translated name + count);
// click one → EVERY business in it drops on the map as its own pin (no clustering);
// click a pin → popup with photo/phone/email/website/directions. Cyprus-only,
// centred on the island, hand-drag + street-level zoom.
//
// Pins use a dark rounded-square badge with a white line icon (SVG), not emoji.
// Self-contained: depends only on loadMaplibre()/cartoGlStyle() and pure metadata.
// ============================================================================
import { useEffect, useMemo, useRef, useState } from 'react';
import { loadMaplibre, cartoGlStyle } from '@/lib/map/maplibre';
import { categoryIcon, catLabel, type BizCategory, type BizLabels } from '@/lib/directory/map-meta';

const GOLD = '#C9A24C';
// Centre on the Cyprus landmass (slightly inland of Larnaca) — plain center+zoom,
// the render config proven to work, so the map opens on land not on grey sea.
const ISLAND_CENTER: [number, number] = [33.35, 34.92];

// ---- Local MapLibre runtime types (only what this component calls) ----------
type LngLat = [number, number];
interface GJFeature { type: 'Feature'; geometry: { type: 'Point'; coordinates: LngLat }; properties: Record<string, unknown> }
interface GJ { type: 'FeatureCollection'; features: GJFeature[] }
interface MlSource { setData(d: GJ): void }
interface MlPopup { setLngLat(c: LngLat): MlPopup; setHTML(h: string): MlPopup; addTo(m: MlMap): MlPopup; remove(): void }
interface MlEvtFeature { properties: Record<string, unknown>; geometry: { type: string; coordinates: LngLat } }
interface MlEvent { features?: MlEvtFeature[] }
interface MlMap {
  on(type: string, layerOrCb: string | ((e: MlEvent) => void), cb?: (e: MlEvent) => void): void;
  addControl(control: unknown, position?: string): void;
  addSource(id: string, source: Record<string, unknown>): void;
  getSource(id: string): MlSource | undefined;
  addLayer(layer: Record<string, unknown>): void;
  addImage(id: string, image: ImageData | HTMLImageElement, opts?: Record<string, unknown>): void;
  removeImage(id: string): void;
  hasImage(id: string): boolean;
  getCanvas(): HTMLCanvasElement;
  resize(): void;
  remove(): void;
}
interface MlGL {
  Map: new (opts: Record<string, unknown>) => MlMap;
  Popup: new (opts?: Record<string, unknown>) => MlPopup;
  NavigationControl: new (opts?: Record<string, unknown>) => unknown;
  GeolocateControl: new (opts?: Record<string, unknown>) => unknown;
}

function esc(s: string): string {
  return String(s == null ? '' : s).replace(/[<>&"']/g, (c) => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string
  ));
}

// A small inline SVG (used in the sidebar list and the popup header).
function iconSvg(inner: string, color: string, size: number): string {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}

// The full map pin: dark rounded-square badge + white line icon, as a data URL.
function pinDataUrl(inner: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">`
    + `<rect x="9" y="9" width="42" height="42" rx="12" fill="#12181c" stroke="${GOLD}" stroke-width="2.5"/>`
    + `<g transform="translate(18 18)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${inner}</g>`
    + `</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export default function BusinessMap({
  locale = 'en', categories, labels,
}: {
  locale?: string;
  categories: BizCategory[];
  labels: BizLabels;
}) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const glRef = useRef<MlGL | null>(null);
  const popupRef = useRef<MlPopup | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);
  const curRef = useRef<string>('');

  const byk = useMemo(() => Object.fromEntries(categories.map((c) => [c.k, c])), [categories]);
  const defaultCat = useMemo(() => (byk['restaurant'] ? 'restaurant' : categories[0]?.k || ''), [byk, categories]);

  const [sel, setSel] = useState<string>('');
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState<number | null>(null);

  // Render the category's line icon into the shared 'cat-icon' map image (async:
  // an SVG data URL → Image → addImage). Every pin in the category then uses it.
  function setIcon(cat: string) {
    const map = mapRef.current;
    if (!map) return;
    const url = pinDataUrl(categoryIcon(cat));
    const img = new Image();
    img.onload = () => {
      try {
        if (map !== mapRef.current) return;
        if (map.hasImage('cat-icon')) map.removeImage('cat-icon');
        map.addImage('cat-icon', img, { pixelRatio: 2 });
      } catch { /* noop */ }
    };
    img.onerror = () => { /* keep the gold dot underneath */ };
    img.src = url;
  }

  async function loadCategory(cat: string) {
    if (!cat) return;
    setSel(cat); curRef.current = cat;
    setLoading(true); setShown(null);
    popupRef.current?.remove();
    setIcon(cat);
    try {
      const res = await fetch(`/api/directory/businesses?cat=${encodeURIComponent(cat)}&locale=${encodeURIComponent(locale)}`);
      const gj = (res.ok ? await res.json() : { type: 'FeatureCollection', features: [] }) as GJ;
      if (curRef.current !== cat) return; // a newer click won
      mapRef.current?.getSource('biz')?.setData(gj);
      setShown(gj.features.length);
    } catch {
      setShown(0);
    } finally {
      if (curRef.current === cat) setLoading(false);
    }
  }

  function openPopup(coords: LngLat, p: Record<string, string>) {
    const map = mapRef.current; const gl = glRef.current;
    if (!map || !gl) return;
    const label = catLabel(p.cat || '', locale);
    const icon = iconSvg(categoryIcon(p.cat), '#8a5b12', 14);
    const media = p.image
      ? `<div class="bm-im" style="background-image:url('${esc(p.image)}')"></div>`
      : `<div class="bm-im bm-ph">${iconSvg(categoryIcon(p.cat), '#3b5560', 44)}</div>`;
    const place = [p.address, p.district].filter(Boolean).join(' · ');
    const a: string[] = [];
    if (p.phone) a.push(`<a class="bm-act" href="tel:${esc(p.phone.replace(/\s+/g, ''))}">☎ ${esc(labels.call)}</a>`);
    if (p.email) a.push(`<a class="bm-act" href="mailto:${esc(p.email)}">✉ ${esc(labels.email)}</a>`);
    if (p.url) a.push(`<a class="bm-act" href="${esc(p.url)}" target="_blank" rel="noopener nofollow">↗ ${esc(labels.website)}</a>`);
    a.push(`<a class="bm-act" href="https://www.google.com/maps/dir/?api=1&destination=${coords[1]},${coords[0]}" target="_blank" rel="noopener noreferrer">➤ ${esc(labels.directions)}</a>`);
    popupRef.current?.remove();
    popupRef.current = new gl.Popup({ closeButton: true, maxWidth: '250px', className: 'bm-pop', offset: 14 })
      .setLngLat(coords)
      .setHTML(`<div class="bm-card">${media}<div class="bm-b"><span class="bm-t">${icon} ${esc(label)}</span><b>${esc(p.name || '')}</b>${place ? `<span class="bm-place">${esc(place)}</span>` : ''}<span class="bm-acts">${a.join('')}</span></div></div>`)
      .addTo(map);
  }

  // Init the live map once.
  useEffect(() => {
    let cancelled = false;
    const el = mapEl.current;
    if (!el) return;
    (async () => {
      let gl: MlGL;
      try { gl = (await loadMaplibre()) as unknown as MlGL; } catch { return; }
      if (cancelled || mapRef.current) return;
      glRef.current = gl;
      const map = new gl.Map({
        container: el,
        style: cartoGlStyle(),
        center: ISLAND_CENTER,
        zoom: 8.4,
        minZoom: 7,
        maxZoom: 19,
        // Locked to Cyprus; drag (hand) + scroll/pinch zoom down to street level.
        maxBounds: [[31.9, 34.4], [35.1, 36.0]],
        attributionControl: { compact: true },
      });
      mapRef.current = map;
      map.addControl(new gl.NavigationControl({ showCompass: false }), 'top-right');
      try {
        map.addControl(new gl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true }, trackUserLocation: true, showUserLocation: true,
        }), 'top-right');
      } catch { /* geolocate optional */ }

      // Repaint whenever the container changes size (e.g. scrolled into view),
      // so the map never renders as a blank/half-drawn grey box.
      try {
        const ro = new ResizeObserver(() => { try { map.resize(); } catch { /* noop */ } });
        ro.observe(el);
        roRef.current = ro;
      } catch { /* ResizeObserver optional */ }

      map.on('load', () => {
        if (cancelled) return;
        map.resize();
        // NO clustering — every business is its own point.
        map.addSource('biz', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        // Base dot — a native circle that ALWAYS renders, so a pin can never be
        // invisible even while the icon image is still loading or if it fails.
        map.addLayer({
          id: 'pts-dot', type: 'circle', source: 'biz',
          paint: { 'circle-radius': 7, 'circle-color': '#ffffff', 'circle-stroke-color': GOLD, 'circle-stroke-width': 2 },
        });
        // Category badge icon on top.
        map.addLayer({
          id: 'pts', type: 'symbol', source: 'biz',
          layout: { 'icon-image': 'cat-icon', 'icon-size': 0.5, 'icon-allow-overlap': true, 'icon-anchor': 'center' },
        });
        setIcon(defaultCat);
        const onPointClick = (e: MlEvent) => {
          const f = e.features?.[0];
          if (!f) return;
          openPopup(f.geometry.coordinates as LngLat, f.properties as Record<string, string>);
        };
        map.on('click', 'pts-dot', onPointClick);
        map.on('click', 'pts', onPointClick);
        map.on('mouseenter', 'pts-dot', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'pts-dot', () => { map.getCanvas().style.cursor = ''; });
        loadCategory(defaultCat);
        // Belt-and-braces: repaint shortly after load in case the container settled late.
        setTimeout(() => { try { map.resize(); } catch { /* noop */ } }, 300);
      });
    })();
    return () => {
      cancelled = true;
      try { roRef.current?.disconnect(); } catch { /* noop */ }
      roRef.current = null;
      popupRef.current?.remove();
      popupRef.current = null;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const term = q.trim().toLowerCase();
  const list = useMemo(
    () => (term ? categories.filter((c) => catLabel(c.k, locale).toLowerCase().includes(term) || c.k.includes(term)) : categories),
    [term, categories, locale],
  );

  return (
    <div className="bm-wrap">
      <style>{`
        .bm-wrap{display:flex;flex-wrap:wrap;border:1px solid #1c2128;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,.12);background:#0B0E11;isolation:isolate;min-height:560px;height:80vh;max-height:900px}
        .bm-side{flex:1 1 300px;max-width:330px;min-width:250px;min-height:0;background:#0B0E11;color:#e7e0d2;display:flex;flex-direction:column;border-right:1px solid #1c2128}
        .bm-head{padding:15px 16px 12px;border-bottom:1px solid #1c2128;flex:0 0 auto}
        .bm-head h2{margin:0;font-family:var(--disp,Georgia,serif);font-weight:600;font-size:19px;color:#fff}
        .bm-head p{margin:3px 0 0;font-size:12px;color:#8a8f98}
        .bm-search{margin-top:11px;width:100%;background:#161b22;border:1px solid #262d36;color:#e7e0d2;border-radius:8px;padding:9px 12px;font-size:14px}
        .bm-search::placeholder{color:#6b727c}
        .bm-list{overflow-y:auto;-webkit-overflow-scrolling:touch;flex:1 1 auto;min-height:0;padding:6px 0 12px}
        .bm-row{display:flex;align-items:center;gap:11px;width:100%;background:none;border:0;padding:8px 15px;cursor:pointer;color:#e7e0d2;text-align:left;font:inherit}
        .bm-row:hover{background:#12161c}
        .bm-row.on{background:#1b2230}
        .bm-ic{width:30px;height:30px;border-radius:8px;background:#161b22;display:flex;align-items:center;justify-content:center;flex:0 0 auto;color:#d8cfbb}
        .bm-row.on .bm-ic{background:${GOLD};color:#0B0E11}
        .bm-nm{flex:1;font-size:13.5px;font-weight:600}
        .bm-n{font-size:11px;color:#9aa0a8;background:#161b22;border-radius:999px;padding:2px 8px}
        .bm-mapcol{flex:2 1 500px;min-width:300px;position:relative}
        .bm-map{position:absolute;inset:0}
        .bm-status{position:absolute;top:10px;left:10px;z-index:4;background:rgba(11,14,17,.86);color:#e7e0d2;border:1px solid #2a323c;border-radius:999px;padding:6px 13px;font:600 12px/1 var(--font-jost,system-ui,sans-serif);pointer-events:none}
        .maplibregl-popup.bm-pop .maplibregl-popup-content{border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.28);padding:0;overflow:hidden}
        .bm-card{display:flex;flex-direction:column;width:224px;font-family:var(--font-jost,system-ui,sans-serif)}
        .bm-im{display:block;height:116px;background-size:cover;background-position:center;background:#12242b}
        .bm-im.bm-ph{display:flex;align-items:center;justify-content:center}
        .bm-b{padding:11px 13px 13px}
        .bm-t{display:flex;align-items:center;gap:5px;text-transform:uppercase;letter-spacing:.08em;font-size:10px;font-weight:700;margin-bottom:3px;color:#8a5b12}
        .bm-b b{font-family:var(--disp,Georgia,serif);font-weight:600;font-size:16px;line-height:1.25;color:#12181c;display:block}
        .bm-place{display:block;font-size:12px;color:#6b6456;margin-top:3px;text-transform:capitalize}
        .bm-acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
        .bm-act{font-size:12px;font-weight:600;color:#8a5b12;text-decoration:none;border:1px solid #ecdfc2;border-radius:999px;padding:4px 9px}
        .bm-act:hover{background:#f6efdf;text-decoration:none}
        @media(max-width:760px){.bm-wrap{flex-direction:column;height:auto;max-height:none}.bm-side{max-width:none;width:100%;border-right:0;border-bottom:1px solid #1c2128}.bm-list{max-height:180px}.bm-mapcol{width:100%;height:64vh;min-height:400px;flex:none}}
      `}</style>

      <div className="bm-side">
        <div className="bm-head">
          <h2>{labels.title}</h2>
          <p>{labels.subtitle}</p>
          <input className="bm-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={labels.searchPh} aria-label={labels.searchPh} />
        </div>
        <div className="bm-list">
          {list.map((c) => (
            <button key={c.k} type="button" className={`bm-row${sel === c.k ? ' on' : ''}`} onClick={() => loadCategory(c.k)}>
              <span className="bm-ic" dangerouslySetInnerHTML={{ __html: iconSvg(c.icon, 'currentColor', 17) }} />
              <span className="bm-nm">{catLabel(c.k, locale)}</span>
              <span className="bm-n">{c.count.toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bm-mapcol">
        <div ref={mapEl} className="bm-map" aria-label={labels.title} />
        <div className="bm-status">
          {loading ? labels.loading : shown != null ? `${shown.toLocaleString()} ${labels.inView}` : labels.choose}
        </div>
      </div>
    </div>
  );
}
