'use client';
// ============================================================================
// MapLibre GL JS loader — pinned CDN + Subresource Integrity.
// ----------------------------------------------------------------------------
// Loads MapLibre GL at runtime the same way the app already lazy-loads its map
// library on mount, but WITHOUT adding an npm dependency / touching the lockfile
// (so the whole map ships via a GitHub-web-UI commit with no build-break risk).
// The script + stylesheet are fetched from a pinned jsDelivr version with SRI
// hashes, so a tampered CDN payload is rejected by the browser. The map's tiles
// already come from CARTO's CDN at runtime, so this adds no new availability risk.
//
// To bump the version: change VERSION and paste the new sha384 integrity hashes
// (jsDelivr shows them, or `openssl dgst -sha384 -binary file | openssl base64`).
// ============================================================================

const VERSION = '5.6.1';
const JS_URL = `https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSION}/dist/maplibre-gl.js`;
const JS_SRI = 'sha384-/L1njH4bbgNt9Uk3HwJ272N9fxJzRBQCxhtwGkZiqgl+Nxpq2ETUNZhNMNV1RgyW';
const CSS_URL = `https://cdn.jsdelivr.net/npm/maplibre-gl@${VERSION}/dist/maplibre-gl.css`;
const CSS_SRI = 'sha384-Nq6PQ+9vJPvw7U/VfDELyrWoGQMsy0gi6QShhaSrGzkpF5KkM40csg2leky+YMTd';

// ---- Minimal typed surface (only the API this app uses) --------------------
export type LngLat = [number, number];

export interface GeoFeature {
  type: 'Feature';
  geometry: { type: 'Point'; coordinates: LngLat };
  properties: Record<string, unknown>;
}
export interface GeoJSON { type: 'FeatureCollection'; features: GeoFeature[]; }

export interface GeoJSONSource {
  setData(data: GeoJSON): void;
  getClusterExpansionZoom(clusterId: number): Promise<number>;
}

export interface MlPopup {
  setLngLat(c: LngLat): MlPopup;
  setHTML(html: string): MlPopup;
  addTo(map: MlMap): MlPopup;
  remove(): void;
}

export interface MlBounds {
  extend(c: LngLat): MlBounds;
  isEmpty(): boolean;
}

export interface MlMapEvent {
  lngLat: { lng: number; lat: number };
  point: { x: number; y: number };
  features?: Array<{ properties: Record<string, unknown>; geometry: { type: string; coordinates: LngLat } }>;
}

export interface MlMap {
  on(type: string, layerOrListener: string | ((e: MlMapEvent) => void), listener?: (e: MlMapEvent) => void): void;
  once(type: string, listener: () => void): void;
  addSource(id: string, source: Record<string, unknown>): void;
  getSource(id: string): GeoJSONSource | undefined;
  addLayer(layer: Record<string, unknown>): void;
  setLayoutProperty(id: string, name: string, value: unknown): void;
  setFilter(id: string, filter: unknown): void;
  addControl(control: unknown, position?: string): void;
  getCanvas(): HTMLCanvasElement;
  getZoom(): number;
  flyTo(opts: Record<string, unknown>): void;
  easeTo(opts: Record<string, unknown>): void;
  fitBounds(bounds: MlBounds, opts?: Record<string, unknown>): void;
  resize(): void;
  remove(): void;
}

export interface MaplibreGL {
  Map: new (opts: Record<string, unknown>) => MlMap;
  Popup: new (opts?: Record<string, unknown>) => MlPopup;
  NavigationControl: new (opts?: Record<string, unknown>) => unknown;
  AttributionControl: new (opts?: Record<string, unknown>) => unknown;
  LngLatBounds: new () => MlBounds;
}

declare global {
  interface Window { maplibregl?: MaplibreGL }
}

let loader: Promise<MaplibreGL> | null = null;

/** Idempotently load MapLibre GL (JS + CSS) from the pinned CDN with SRI. */
export function loadMaplibre(): Promise<MaplibreGL> {
  if (typeof window === 'undefined') return Promise.reject(new Error('MapLibre can only load in the browser'));
  if (window.maplibregl) return Promise.resolve(window.maplibregl);
  if (loader) return loader;

  loader = new Promise<MaplibreGL>((resolve, reject) => {
    // Stylesheet (once).
    if (!document.querySelector('link[data-maplibre]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = CSS_URL;
      link.integrity = CSS_SRI;
      link.crossOrigin = 'anonymous';
      link.setAttribute('data-maplibre', '');
      document.head.appendChild(link);
    }

    const done = () => {
      if (window.maplibregl) resolve(window.maplibregl);
      else reject(new Error('MapLibre GL failed to initialise'));
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-maplibre]');
    if (existing) {
      if (window.maplibregl) { done(); return; }
      existing.addEventListener('load', done);
      existing.addEventListener('error', () => reject(new Error('MapLibre GL failed to load')));
      return;
    }

    const script = document.createElement('script');
    script.src = JS_URL;
    script.integrity = JS_SRI;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.setAttribute('data-maplibre', '');
    script.onload = done;
    script.onerror = () => reject(new Error('MapLibre GL failed to load'));
    document.head.appendChild(script);
  });

  return loader;
}

/** The CARTO GL vector basemap style URL (free, no API key). Overridable via env. */
export function cartoGlStyle(): string {
  const env = process.env.NEXT_PUBLIC_MAP_GL_STYLE;
  if (env) return env;
  // voyager | positron | dark-matter — voyager keeps continuity with the prior raster style.
  const name = process.env.NEXT_PUBLIC_MAP_GL_STYLE_NAME || 'voyager';
  return `https://basemaps.cartocdn.com/gl/${name}-gl-style/style.json`;
}
