'use client';
// ============================================================================
// MapExplorer — the GetYourGuide-style list + map explorer over the WHOLE directory.
// ----------------------------------------------------------------------------
// Data (see lib/map/explorer-index.ts):
//   • /api/map/index    — every geocoded business (published + listed) and upcoming
//                         event, compact; loaded once, filtered/ranked/clustered here.
//   • /api/map/details  — names, photos, address, website (+ phone for published
//                         listings only) for the cards and the popup on screen.
//   • /api/map/search   — business / event name suggestions.
//   • /api/map/geocode  — "search this address" (Google key server-side, else OSM).
//   • /api/map/webcams.geojson — existing live-webcam layer.
// UI:
//   LEFT  search with suggestions (all 89 categories, districts, businesses,
//         addresses) · TABS: one category at a time — All · Agenda · Experiences ·
//         every category by size (tap the active tab again → All) · FILTERS: combine
//         as many categories as you like (17 groups + experiences + agenda with dates),
//         places, interests, price, features, star rating → a "N categories ×" tab ·
//         cards that follow the map.
//   MAP   district bubbles (big selections) → clusters → category-icon pins (+ rating;
//         dashed = approximate area) with canvas dots for the rest · popup with
//         everything we hold: photos, rating ★ 4.7 (1,234), address, opening hours
//         (open now), phone, email, website, socials, amenities, description, and
//         View profile / Call / Email / Website / Directions · full screen · locate.
// Ranking: paid tier (Partner > Featured > Listed) → featured → rating × volume.
// ============================================================================
import './MapExplorer.css';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  loadMaplibre, cartoGlStyle,
  type MlMap, type MlPopup, type MlMarker, type MaplibreGL, type GeoFeature, type GeoJSON, type LngLat,
} from '@/lib/map/maplibre';
import { decodeIndex, rankScore, F, DISTRICT_CENTRE, SOCIAL_ORDER, type ExplorerIndex, type ExplorerPoint, type ExplorerDetail } from '@/lib/map/explorer-index';
import { openState } from '@/lib/map/hours';
import { EVENT_CAT, EVENT_GROUP, isActivityCat, type ExplorerCategory, type ExplorerGroup } from '@/lib/map/explorer-taxonomy';
import type { ExplorerUi } from '@/lib/map/explorer-i18n';

export interface MapExplorerProps {
  locale: string;
  categories: ExplorerCategory[];   // all canonical categories + the events pseudo-category
  groups: ExplorerGroup[];          // the 17 canonical groups + events
  ui: ExplorerUi;
  mode?: 'page' | 'embed';
  endpoints?: Partial<Record<'index' | 'details' | 'search' | 'geocode' | 'webcams', string>>;
}

const GOLD = '#C9A24C';
const REGION_ZOOM = 9.4;   // below this, one bubble per district
const PAGE = 40;           // cards per "show more"
const LIST_CAP = 8;        // options per filter section before "show more"
const MAX_PINS = 140;      // DOM pins per view; the rest stay as canvas dots
const SAVED_KEY = 'cl:saved-places';
const PRICE_BANDS = ['€', '€€', '€€€', '€€€€'];
const RATING_STEPS = [3, 3.5, 4, 4.5];
const FEATURE_KEYS = ['partner', 'featured', 'verified', 'luxury', 'profile', 'photo', 'saved'] as const;

// ---- Icons ----------------------------------------------------------------------
const P = {
  pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13zM20 20l-4.8-4.8',
  heart: 'M12 20s-7.5-4.6-9.2-9.3C1.6 7.4 3.8 4.5 7 4.5c2 0 3.3 1.1 5 3 1.7-1.9 3-3 5-3 3.2 0 5.4 2.9 4.2 6.2C19.5 15.4 12 20 12 20z',
  close: 'M6 6l12 12M18 6L6 18', plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', locate: 'M21 3L3 10.5l7.5 3 3 7.5z',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', chevR: 'M9 5l7 7-7 7', chevL: 'M15 5l-7 7 7 7', chevD: 'M5 9l7 7 7-7',
  cam: 'M3 7h12v10H3zM15 10.5l6-3.5v10l-6-3.5', sliders: 'M4 7h9M17 7h3M4 17h3M11 17h9M15 5v4M9 15v4', check: 'M5 12.5l4.5 4.5L19 7.5',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3',
  route: 'M21 3L3 10.5l7.5 3 3 7.5z', ext: 'M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  mail: 'M4 6h16v12H4zM4 7l8 6 8-6', clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', euro: 'M17 6.5A6 6 0 0 0 7.5 9.5M17 17.5a6 6 0 0 1-9.5-3M5 10.5h8M5 13.5h7',
};
// Generic outline glyphs for social links (not brand logos).
const SOCIAL_ICON: Record<string, string> = {
  instagram: 'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM17.5 6.5h0',
  facebook: 'M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V9a1 1 0 0 1 1-1z',
  tiktok: 'M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5M14 3c.5 2.8 2.4 4.6 5 5',
  youtube: 'M3 8.5A3.5 3.5 0 0 1 6.5 5h11A3.5 3.5 0 0 1 21 8.5v7a3.5 3.5 0 0 1-3.5 3.5h-11A3.5 3.5 0 0 1 3 15.5zM10 9v6l5-3z',
  linkedin: 'M4 9h4v11H4zM6 4.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM11 9h3.8v1.6c.6-1 1.8-1.9 3.6-1.9 3 0 3.6 2 3.6 4.6V20h-4v-5.8c0-1.4-.3-2.4-1.6-2.4-1.4 0-1.8 1-1.8 2.4V20H11z',
  x: 'M4 4l16 16M20 4L4 20',
  whatsapp: 'M12 3a9 9 0 0 0-7.8 13.5L3 21l4.6-1.2A9 9 0 1 0 12 3zM9 8.5c0 3.5 3 6.5 6.5 6.5l1-1.6-2-1-1 .8a5 5 0 0 1-2.2-2.2l.8-1-1-2z',
};
const STAR = 'M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z';

function Icon({ d, size = 16, fill = 'none', sw = 1.9, className }: { d: string; size?: number; fill?: string; sw?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={fill === 'none' ? 'currentColor' : 'none'}
      strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
}
/** Category icon: inner SVG markup from lib/directory/map-meta.ts (trusted, static). */
function CatIcon({ icon, size = 16 }: { icon: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: icon }} />
  );
}
const catSvg = (icon: string, size: number) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icon}</svg>`;

// ---- Helpers -----------------------------------------------------------------------
function esc(s: string): string {
  return String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string));
}
const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/(^|\s)(\p{L})/gu, (_m, a: string, b: string) => a + b.toUpperCase());
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fmtRating = (r: number) => (r >= 4.95 ? '5' : (Math.round(r * 10) / 10).toFixed(1));
function fmtDate(iso: string | null | undefined, locale: string): string {
  if (!iso) return '';
  try { return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' }); } catch { return ''; }
}
function readSaved(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(SAVED_KEY) || '[]') as string[]); } catch { return new Set(); }
}
const isEvent = (p: ExplorerPoint) => (p.flags & F.EVENT) !== 0;
const isAct = (p: ExplorerPoint) => (p.flags & F.ACTIVITY) !== 0;
const isApprox = (p: ExplorerPoint) => (p.flags & F.APPROX) !== 0;
const startOfToday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); };
const isOngoing = (p: ExplorerPoint) => !!p.date && Date.parse(p.date) < startOfToday() && (!p.end || Date.parse(p.end) >= startOfToday());
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

/** GetYourGuide-style rating: five stars (partly filled), the average, (number of reviews). */
function Stars({ value, count, locale, size = 14 }: { value: number; count: number; locale: string; size?: number }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (cls: string) => (
    <span className={cls}>{[0, 1, 2, 3, 4].map((i) => <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true"><path d={STAR} /></svg>)}</span>
  );
  return (
    <span className="clm-stars" aria-label={`${fmtRating(value)} / 5${count ? ` (${count})` : ''}`}>
      <span className="clm-stars__row">{row('clm-stars__bg')}<span className="clm-stars__fg" style={{ width: `${pct}%` }}>{row('clm-stars__on')}</span></span>
      <b>{fmtRating(value)}</b>
      {count ? <span className="clm-stars__n">({count.toLocaleString(locale)})</span> : null}
    </span>
  );
}
const timeBucket = (iso: string) => { const h = new Date(iso).getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };

// ---- Filters -----------------------------------------------------------------------
type When = 'today' | 'weekend' | 'week' | 'month';
interface Filters {
  cats: string[]; districts: string[]; subtypes: string[]; prices: string[]; features: string[]; times: string[];
  minRating: number | null; when: When | null; dateFrom: string | null; dateTo: string | null;
}
const EMPTY: Filters = { cats: [], districts: [], subtypes: [], prices: [], features: [], times: [], minRating: null, when: null, dateFrom: null, dateTo: null };
const activeCount = (f: Filters) => f.cats.length + f.districts.length + f.subtypes.length + f.prices.length + f.features.length
  + f.times.length + (f.minRating ? 1 : 0) + (f.when || f.dateFrom || f.dateTo ? 1 : 0);

/** The date window events must overlap: custom dates win over the quick choices. */
function dateWindow(f: Filters): [number, number] | null {
  if (f.dateFrom || f.dateTo) {
    const a = f.dateFrom ? new Date(`${f.dateFrom}T00:00:00`).getTime() : startOfToday();
    const b = f.dateTo ? new Date(`${f.dateTo}T00:00:00`).getTime() + 864e5 : Infinity;
    return [a, b];
  }
  return f.when ? whenRange(f.when) : null;
}

function whenRange(w: When): [number, number] {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  if (w === 'today') end.setDate(end.getDate() + 1);
  else if (w === 'week') end.setDate(end.getDate() + 7);
  else if (w === 'month') end.setDate(end.getDate() + 30);
  else {
    const dow = start.getDay();
    const toFri = dow === 0 ? -2 : dow === 6 ? -1 : 5 - dow;
    const fri = new Date(start); fri.setDate(fri.getDate() + toFri); fri.setHours(17);
    const mon = new Date(start); mon.setDate(mon.getDate() + toFri + 3); mon.setHours(0);
    return [Math.max(fri.getTime(), now.getTime() - 6 * 3600e3), mon.getTime()];
  }
  return [start.getTime(), end.getTime()];
}

function matches(p: ExplorerPoint, f: Filters, saved: Set<string>): boolean {
  if (f.cats.length && !f.cats.includes(p.cat)) return false;
  if (f.districts.length && !f.districts.includes(p.district || '')) return false;
  if (f.subtypes.length && !f.subtypes.includes(p.subtype || '')) return false;
  if (f.prices.length && !f.prices.includes(p.price || '')) return false;
  if (f.minRating && !(p.rating && p.rating >= f.minRating)) return false;
  // Date and start-time choices narrow the EVENTS; businesses and experiences stay.
  if (isEvent(p) && p.date) {
    if (f.times.length && !f.times.includes(timeBucket(p.date))) return false;
    const win = dateWindow(f);
    if (win) {
      const a = Date.parse(p.date); const b = p.end ? Date.parse(p.end) : a;
      if (!(a < win[1] && b >= win[0])) return false; // overlaps the window (running events count)
    }
  }
  for (const ft of f.features) {
    if (ft === 'partner' && !(p.rank > 0 && !isAct(p))) return false;
    if (ft === 'featured' && !(p.flags & F.FEATURED)) return false;
    if (ft === 'verified' && !(p.flags & F.VERIFIED)) return false;
    if (ft === 'luxury' && !(p.flags & F.LUXURY)) return false;
    if (ft === 'profile' && !((p.flags & F.PUBLISHED) && !isEvent(p))) return false;
    if (ft === 'photo' && !(p.flags & F.IMAGE)) return false;
    if (ft === 'saved' && !saved.has(p.id)) return false;
  }
  return true;
}

function countBy<T extends string>(list: ExplorerPoint[], key: (p: ExplorerPoint) => T | null | undefined): Map<T, number> {
  const m = new Map<T, number>();
  for (const p of list) { const k = key(p); if (k) m.set(k, (m.get(k) || 0) + 1); }
  return m;
}

// Read / write ?cat= & ?district= so a category view can be linked and shared.
function readUrlFilters(): Partial<Filters> {
  try {
    const sp = new URLSearchParams(window.location.search);
    const cats = sp.getAll('cat').flatMap((c) => c.split(',')).filter(Boolean);
    const districts = sp.getAll('district').flatMap((c) => c.split(',')).filter(Boolean);
    return { ...(cats.length ? { cats } : {}), ...(districts.length ? { districts } : {}) };
  } catch { return {}; }
}
function writeUrlFilters(f: Filters) {
  try {
    const u = new URL(window.location.href);
    u.searchParams.delete('cat'); u.searchParams.delete('district');
    if (f.cats.length) u.searchParams.set('cat', f.cats.join(','));
    if (f.districts.length) u.searchParams.set('district', f.districts.join(','));
    window.history.replaceState(window.history.state, '', u.toString());
  } catch { /* noop */ }
}

type Suggestion =
  | { kind: 'cat'; key: string; label: string; icon: string; count: number }
  | { kind: 'district'; key: string; label: string; count: number }
  | { kind: 'biz'; id: string; label: string; sub: string; icon: string; lat: number; lng: number }
  | { kind: 'addr'; label: string };

// ====================================================================================
export default function MapExplorer({ locale, categories, groups, ui, mode = 'page', endpoints = {} }: MapExplorerProps) {
  const U = ui;
  const ep = {
    index: endpoints.index || '/api/map/index',
    details: endpoints.details || '/api/map/details',
    search: endpoints.search || '/api/map/search',
    geocode: endpoints.geocode || '/api/map/geocode',
    webcams: endpoints.webcams || `/api/map/webcams.geojson?locale=${encodeURIComponent(locale)}`,
  };

  const catMeta = useMemo(() => new Map(categories.map((c) => [c.k, c])), [categories]);
  const groupMeta = useMemo(() => new Map(groups.map((g) => [g.k, g])), [groups]);
  const catLabelOf = useCallback((k: string) => catMeta.get(k)?.label || titleCase(k), [catMeta]);
  const catIconOf = useCallback((k: string) => catMeta.get(k)?.icon || catMeta.get('general-vendor')?.icon || '', [catMeta]);

  const mapEl = useRef<HTMLDivElement>(null);
  const chipsEl = useRef<HTMLDivElement>(null);
  const listEl = useRef<HTMLDivElement>(null);
  const searchBox = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MlMap | null>(null);
  const mlRef = useRef<MaplibreGL | null>(null);
  const camPopupRef = useRef<MlPopup | null>(null);
  const markersRef = useRef<Map<string, MlMarker>>(new Map());
  const meMarkerRef = useRef<MlMarker | null>(null);
  const placeMarkerRef = useRef<MlMarker | null>(null);
  const readyRef = useRef(false);

  // ---- Data -----------------------------------------------------------------------
  const [points, setPoints] = useState<ExplorerPoint[] | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  useEffect(() => {
    let off = false;
    fetch(ep.index)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((ix: ExplorerIndex) => { if (!off) setPoints(decodeIndex(ix)); })
      .catch(() => { if (!off) setLoadFailed(true); });
    return () => { off = true; };
  }, [ep.index]);
  const all = points || [];
  const byId = useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);

  const detailsRef = useRef(new Map<string, ExplorerDetail | null>());
  const pendingRef = useRef(new Set<string>());
  const [detailsVer, setDetailsVer] = useState(0);
  const requestDetails = useCallback((ids: string[]) => {
    const need = ids.filter((id) => !detailsRef.current.has(id) && !pendingRef.current.has(id));
    for (let i = 0; i < need.length; i += 60) {
      const chunk = need.slice(i, i + 60);
      chunk.forEach((id) => pendingRef.current.add(id));
      fetch(`${ep.details}${ep.details.includes('?') ? '&' : '?'}ids=${encodeURIComponent(chunk.join(','))}&locale=${encodeURIComponent(locale)}`)
        .then((r) => (r.ok ? r.json() : { items: [] }))
        .then((d: { items?: ExplorerDetail[] }) => {
          for (const it of d.items || []) detailsRef.current.set(it.id, it);
          for (const id of chunk) { if (!detailsRef.current.has(id)) detailsRef.current.set(id, null); pendingRef.current.delete(id); }
          setDetailsVer((v) => v + 1);
        })
        .catch(() => { chunk.forEach((id) => pendingRef.current.delete(id)); });
    }
  }, [ep.details, locale]);
  const detailOf = (id: string) => detailsRef.current.get(id) || null;

  // ---- UI state ---------------------------------------------------------------------
  const [ready, setReady] = useState(false);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [draft, setDraft] = useState<Filters | null>(null);
  const [openSec, setOpenSec] = useState<Record<string, boolean>>({});
  const [moreSec, setMoreSec] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [q, setQ] = useState('');
  const [sugOpen, setSugOpen] = useState(false);
  const [sugIdx, setSugIdx] = useState(-1);
  const [bizHits, setBizHits] = useState<Suggestion[]>([]);
  const [showCams, setShowCams] = useState(true);
  const [full, setFull] = useState(false);
  const [bounds, setBounds] = useState<{ w: number; s: number; e: number; n: number } | null>(null);
  const [limit, setLimit] = useState(PAGE);
  const [hotId, setHotId] = useState<string | null>(null);
  const [selId, setSelId] = useState<string | null>(null);
  const [popPos, setPopPos] = useState<{ x: number; y: number; w: number } | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  useEffect(() => { setPhotoIdx(0); }, [selId]);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  const [chipScroll, setChipScroll] = useState({ left: false, right: false });
  const [canLocate, setCanLocate] = useState(false);

  useEffect(() => {
    setSaved(readSaved());
    const fromUrl = readUrlFilters();
    if (fromUrl.cats || fromUrl.districts) setFilters((f) => ({ ...f, ...fromUrl }));
    const d = document as Document & { permissionsPolicy?: { allowsFeature(f: string): boolean }; featurePolicy?: { allowsFeature(f: string): boolean } };
    const policy = d.permissionsPolicy || d.featurePolicy;
    setCanLocate(!!navigator.geolocation && (policy ? policy.allowsFeature('geolocation') : true));
  }, []);
  const firstFilterWrite = useRef(true);
  useEffect(() => { if (firstFilterWrite.current) { firstFilterWrite.current = false; return; } writeUrlFilters(filters); }, [filters]);

  // ---- Derived ----------------------------------------------------------------------
  const catCounts = useMemo(() => {
    if (!points) return new Map(categories.map((c) => [c.k, c.count]));
    return countBy(points, (p) => p.cat);
  }, [points, categories]);
  // Tabs: one business category each, biggest first (experiences share one tab, events another).
  const chipCats = useMemo(() => categories
    .filter((c) => c.k !== EVENT_CAT && !isActivityCat(c.k) && (catCounts.get(c.k) || 0) > 0)
    .sort((a, b) => (catCounts.get(b.k) || 0) - (catCounts.get(a.k) || 0) || a.label.localeCompare(b.label, locale)), [categories, catCounts, locale]);
  const hasEvents = (catCounts.get(EVENT_CAT) || 0) > 0;
  const actKeys = useMemo(() => categories.filter((c) => isActivityCat(c.k) && (catCounts.get(c.k) || 0) > 0).map((c) => c.k), [categories, catCounts]);
  const actTotal = actKeys.reduce((a, k) => a + (catCounts.get(k) || 0), 0);

  // Which tab is on: All (no category), Agenda, Experiences, one category — or a custom
  // combination made in Filters ("N categories ×").
  const activeTab = useMemo(() => {
    const c = filters.cats;
    if (!c.length) return 'all';
    if (c.length === 1 && c[0] === EVENT_CAT) return 'event';
    if (c.every(isActivityCat) && actKeys.length > 0 && actKeys.every((k) => c.includes(k))) return 'exp';
    if (c.length === 1) return c[0];
    return 'custom';
  }, [filters.cats, actKeys]);

  const shown = useMemo(() => all.filter((p) => matches(p, filters, saved)), [all, filters, saved]);
  const shownRef = useRef(shown); shownRef.current = shown;
  const draftCount = useMemo(() => (draft ? all.filter((p) => matches(p, draft, saved)).length : 0), [all, draft, saved]);

  const inView = useMemo(() => {
    const list = bounds ? shown.filter((p) => p.lng >= bounds.w && p.lng <= bounds.e && p.lat >= bounds.s && p.lat <= bounds.n) : shown;
    // The Agenda tab lists by date (running events first); everything else by rank.
    if (activeTab === 'event') return list.slice().sort((a, b) => Date.parse(a.date || '') - Date.parse(b.date || ''));
    return list.map((p) => [p, rankScore(p)] as const).sort((a, b) => b[1] - a[1]).map(([p]) => p);
  }, [shown, bounds, activeTab]);
  const visible = inView.slice(0, limit);
  useEffect(() => { setLimit(PAGE); listEl.current?.scrollTo({ top: 0 }); }, [filters, bounds]);

  // Fetch card details for what's on screen (debounced).
  const visibleKey = visible.map((p) => p.id).join(',');
  useEffect(() => {
    if (!visibleKey) return;
    const t = setTimeout(() => requestDetails(visibleKey.split(',')), 120);
    return () => clearTimeout(t);
  }, [visibleKey, requestDetails]);
  useEffect(() => { if (selId) requestDetails([selId]); }, [selId, requestDetails]);

  const features = useMemo<GeoFeature[]>(() => shown.map((p) => ({
    type: 'Feature', geometry: { type: 'Point', coordinates: [p.lng, p.lat] }, properties: { id: p.id },
  })), [shown]);
  const featuresRef = useRef(features); featuresRef.current = features;

  const facets = useMemo(() => ({
    districts: Array.from(countBy(all, (p) => p.district).entries()).sort((a, b) => b[1] - a[1]),
    subtypes: Array.from(countBy(all, (p) => p.subtype).entries()).sort((a, b) => b[1] - a[1]).slice(0, 80),
    prices: PRICE_BANDS.filter((b) => all.some((p) => p.price === b)),
    hasRating: all.some((p) => p.rating),
  }), [all]);

  const selIdRef = useRef<string | null>(null); selIdRef.current = selId;
  const hotIdRef = useRef<string | null>(null); hotIdRef.current = hotId;

  // ---- Markers ----------------------------------------------------------------------
  const flyToPoints = useCallback((list: { lat: number; lng: number }[], maxZoom = 13) => {
    const map = mapRef.current; const ml = mlRef.current;
    if (!map || !ml || !list.length) return;
    if (list.length === 1) { map.flyTo({ center: [list[0].lng, list[0].lat], zoom: Math.max(map.getZoom(), 15) }); return; }
    const b = new ml.LngLatBounds();
    list.forEach((p) => b.extend([p.lng, p.lat]));
    map.fitBounds(b, { padding: 70, maxZoom, duration: 700 });
  }, []);

  const pinHtml = useCallback((p: ExplorerPoint): { html: string; cls: string; w: number } => {
    const icon = `<span class="clm-pin__ic">${catSvg(catIconOf(p.cat), 14)}</span>`;
    const d = detailOf(p.id);
    const tier = p.rank > 0 ? ' clm-pin--tier' : '';
    if ((p.rank >= 2 || p.flags & F.FEATURED) && d?.image) {
      return { cls: `clm-pin clm-pin--photo${tier}`, html: `<img src="${esc(d.image)}" alt="" loading="lazy"/><span>${esc(d.name)}</span>`, w: 170 };
    }
    const approx = isApprox(p) ? ' clm-pin--approx' : '';
    if (isEvent(p) && p.date) {
      const label = isOngoing(p) ? U.onNow : fmtDate(p.date, locale);
      return { cls: `clm-pin clm-pin--event${tier}${approx}`, html: `${icon}<b>${esc(label)}</b>`, w: 86 };
    }
    if (p.rating) return { cls: `clm-pin${tier}${approx}`, html: `${icon}<b>${fmtRating(p.rating)}</b>`, w: 64 };
    return { cls: `clm-pin clm-pin--icon${tier}${approx}`, html: icon, w: 34 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catIconOf, locale, U.onNow]);

  const updateMarkers = useCallback(() => {
    const map = mapRef.current; const ml = mlRef.current;
    if (!map || !ml || !readyRef.current) return;
    const next = new Map<string, { lngLat: LngLat; build: () => HTMLElement }>();
    const button = (cls: string, html: string) => {
      const el = document.createElement('button');
      el.type = 'button'; el.className = cls; el.innerHTML = html;
      return el;
    };
    // Island zoom + a big selection → one bubble per district; a small selection
    // (one category, a few events) shows its pins straight away.
    const regionMode = map.getZoom() < REGION_ZOOM && shownRef.current.length > 300;
    try { map.setLayoutProperty('pts-dot', 'visibility', regionMode ? 'none' : 'visible'); } catch { /* not ready */ }

    if (regionMode) {
      const nearest = (p: ExplorerPoint) => {
        let best = ''; let bd = Infinity;
        for (const [k, c] of Object.entries(DISTRICT_CENTRE)) { const d = (c.lat - p.lat) ** 2 + (c.lng - p.lng) ** 2; if (d < bd) { bd = d; best = k; } }
        return best;
      };
      const groupsBy = new Map<string, ExplorerPoint[]>();
      for (const p of shownRef.current) {
        const k = p.district && DISTRICT_CENTRE[p.district] ? p.district : nearest(p);
        const g = groupsBy.get(k); if (g) g.push(p); else groupsBy.set(k, [p]);
      }
      for (const [d, list] of groupsBy) {
        if (list.length < 1) continue;
        const lng = list.reduce((a, p) => a + p.lng, 0) / list.length;
        const lat = list.reduce((a, p) => a + p.lat, 0) / list.length;
        next.set(`r|${d}|${list.length}`, {
          lngLat: [lng, lat],
          build: () => {
            const el = button('clm-region', `<b>${esc(titleCase(d))}</b><span>${list.length.toLocaleString(locale)} ${esc(U.results)}</span>`);
            el.addEventListener('click', (e) => { e.stopPropagation(); flyToPoints(list); });
            return el;
          },
        });
      }
    } else {
      type Box = [number, number, number, number];
      const placed: Box[] = [];
      const overlaps = (b: Box) => placed.some((o) => b[0] < o[2] && b[2] > o[0] && b[1] < o[3] && b[3] > o[1]);
      const boxAt = (c: LngLat, w: number, h: number): Box => { const pt = map.project(c); return [pt.x - w / 2, pt.y - h - 8, pt.x + w / 2, pt.y]; };
      const pts: ExplorerPoint[] = [];
      const seen = new Set<string>();
      for (const f of map.querySourceFeatures('items')) {
        const pr = f.properties;
        if (pr.cluster) {
          const key = `c|${pr.cluster_id}`;
          if (next.has(key)) continue;
          const count = Number(pr.point_count); const cid = Number(pr.cluster_id); const at = f.geometry.coordinates;
          placed.push(boxAt(at, 44, 32));
          next.set(key, {
            lngLat: at,
            build: () => {
              const el = button('clm-pin clm-pin--count', `<b>${count >= 1000 ? `${Math.round(count / 100) / 10}k` : count}</b>`);
              el.addEventListener('click', (e) => {
                e.stopPropagation();
                map.getSource('items')?.getClusterExpansionZoom(cid).then((z) => map.easeTo({ center: at, zoom: z + 0.2 })).catch(() => {});
              });
              return el;
            },
          });
        } else {
          const id = String(pr.id);
          if (seen.has(id)) continue;
          seen.add(id);
          const p = byId.get(id);
          if (p) pts.push(p);
        }
      }
      pts.sort((a, b) => rankScore(b) - rankScore(a));
      let drawn = 0;
      for (const p of pts) {
        const forced = p.id === selIdRef.current;
        if (!forced && drawn >= MAX_PINS) continue;
        const spec = pinHtml(p);
        const box = boxAt([p.lng, p.lat], spec.w, spec.cls.includes('--photo') ? 44 : 32);
        if (!forced && overlaps(box)) continue; // stays a canvas dot underneath
        placed.push(box); drawn++;
        const key = `p|${spec.cls.includes('--photo') ? 'ph' : 'pn'}|${p.id}`;
        next.set(key, {
          lngLat: [p.lng, p.lat],
          build: () => {
            const el = button(spec.cls, spec.html);
            el.setAttribute('aria-label', detailOf(p.id)?.name || catLabelOf(p.cat));
            el.addEventListener('click', (e) => { e.stopPropagation(); setSelId(p.id); });
            el.addEventListener('mouseenter', () => setHotId(p.id));
            el.addEventListener('mouseleave', () => setHotId((h) => (h === p.id ? null : h)));
            return el;
          },
        });
      }
    }

    const cache = markersRef.current;
    for (const [k, m] of cache) if (!next.has(k)) { m.remove(); cache.delete(k); }
    for (const [k, spec] of next) {
      if (cache.has(k)) continue;
      const el = spec.build();
      const pid = k.startsWith('p|') ? k.slice(k.indexOf('|', 2) + 1) : null;
      if (pid && pid === selIdRef.current) el.classList.add('is-sel');
      if (pid && pid === hotIdRef.current) el.classList.add('is-hot');
      const wrap = document.createElement('div');
      wrap.className = 'clm-mk';
      wrap.appendChild(el);
      cache.set(k, new ml.Marker({ element: wrap, anchor: 'bottom' }).setLngLat(spec.lngLat).addTo(map));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byId, pinHtml, flyToPoints, U.results, locale, catLabelOf]);
  const updateRef = useRef(updateMarkers); updateRef.current = updateMarkers;

  // ---- Floating card ------------------------------------------------------------------
  const placePopup = useCallback(() => {
    const map = mapRef.current; const p = selIdRef.current ? byId.get(selIdRef.current) : null; const box = mapEl.current;
    if (!map || !p || !box) { setPopPos(null); return; }
    const pt = map.project([p.lng, p.lat]);
    setPopPos({ x: pt.x, y: pt.y, w: box.clientWidth });
  }, [byId]);
  const placeRef = useRef(placePopup); placeRef.current = placePopup;
  useEffect(() => { placePopup(); }, [selId, placePopup, full]);

  // Put the popup above its pin; below it when there is no room; else as high as fits.
  // Above its pin; else below; else beside it (a tall popup on a short map) — never on top of the pin.
  const popRef = useRef<HTMLDivElement>(null);
  const [popXY, setPopXY] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = popRef.current; const box = mapEl.current;
    if (!el || !popPos || !box) { setPopXY(null); return; }
    const h = el.offsetHeight; const w = el.offsetWidth; const H = box.clientHeight; const W = popPos.w;
    const minTop = H > 520 ? 64 : 8; // keep the Full screen button free on a big map
    const centred = Math.max(8, Math.min(popPos.x - w / 2, W - w - 8));
    let left = centred; let top = popPos.y - h - 46;
    if (top < minTop) {
      if (popPos.y + 14 + h <= H - 8) top = popPos.y + 14;
      else {
        top = Math.max(minTop, Math.min(popPos.y - h / 2, H - h - 8));
        left = popPos.x + 28 + w <= W - 8 ? popPos.x + 28 : popPos.x - 28 - w >= 8 ? popPos.x - 28 - w : centred;
      }
    }
    setPopXY({ left, top });
  }, [popPos, selId, detailsVer, photoIdx]);

  // ---- Map init -------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    const el = mapEl.current;
    if (!el) return;
    (async () => {
      let ml: MaplibreGL;
      try { ml = await loadMaplibre(); } catch { return; }
      if (cancelled || mapRef.current) return;
      mlRef.current = ml;
      const map = new ml.Map({
        container: el, style: cartoGlStyle(), center: [33.15, 34.9], zoom: 8, minZoom: 6.5, maxZoom: 19,
        attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false,
      });
      mapRef.current = map;
      const syncBounds = () => {
        const b = map.getBounds() as unknown as { getWest(): number; getSouth(): number; getEast(): number; getNorth(): number };
        setBounds({ w: b.getWest(), s: b.getSouth(), e: b.getEast(), n: b.getNorth() });
      };
      map.on('load', () => {
        if (cancelled) return;
        map.resize();
        map.addSource('items', {
          type: 'geojson', data: { type: 'FeatureCollection', features: featuresRef.current },
          cluster: true, clusterRadius: 48, clusterMaxZoom: 14,
        });
        // Every un-clustered place is at least a small canvas dot (cheap for thousands);
        // the best-ranked ones get an HTML pin on top.
        map.addLayer({
          id: 'pts-dot', type: 'circle', source: 'items', filter: ['!', ['has', 'point_count']],
          paint: { 'circle-radius': 4.5, 'circle-color': '#5d6873', 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 1.6 },
        });
        map.addLayer({ id: 'items-hit', type: 'circle', source: 'items', filter: ['has', 'point_count'], paint: { 'circle-radius': 1, 'circle-opacity': 0 } });
        map.on('click', 'pts-dot', (e) => { const f = e.features?.[0]; if (f) setSelId(String(f.properties.id)); });
        map.on('mouseenter', 'pts-dot', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'pts-dot', () => { map.getCanvas().style.cursor = ''; });

        map.addSource('webcams', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
        map.addLayer({ id: 'webcams', type: 'circle', source: 'webcams', paint: { 'circle-color': '#ffffff', 'circle-radius': 7, 'circle-stroke-color': GOLD, 'circle-stroke-width': 3 } });
        fetch(ep.webcams).then((r) => (r.ok ? r.json() : null))
          .then((gj) => { if (!cancelled && gj) mapRef.current?.getSource('webcams')?.setData(gj as GeoJSON); })
          .catch(() => {});
        map.on('click', 'webcams', (e) => {
          const f = e.features?.[0];
          if (f) openCamPopup(f.geometry.coordinates, f.properties as { name?: string; url?: string; area?: string; district?: string });
        });
        map.on('mouseenter', 'webcams', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'webcams', () => { map.getCanvas().style.cursor = ''; });

        map.on('click', () => setSelId(null));
        map.on('moveend', () => { syncBounds(); updateRef.current(); });
        map.on('sourcedata', (e) => {
          const ev = e as unknown as { sourceId?: string; isSourceLoaded?: boolean };
          if (ev.sourceId === 'items' && ev.isSourceLoaded) updateRef.current();
        });
        map.on('move', () => placeRef.current());
        readyRef.current = true;
        setReady(true);
        syncBounds();
      });
    })();
    return () => {
      cancelled = true;
      camPopupRef.current?.remove(); camPopupRef.current = null;
      markersRef.current.forEach((m) => m.remove()); markersRef.current.clear();
      meMarkerRef.current?.remove(); meMarkerRef.current = null;
      placeMarkerRef.current?.remove(); placeMarkerRef.current = null;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      readyRef.current = false;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  // Data / filters → source; first time the data arrives, frame it.
  const framed = useRef(false);
  useEffect(() => {
    if (!ready) return;
    mapRef.current?.getSource('items')?.setData({ type: 'FeatureCollection', features });
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
    if (points && !framed.current) {
      framed.current = true;
      fitPoints(shownRef.current.length ? shownRef.current : all, false);
    }
    updateRef.current();
    if (selIdRef.current && !shownRef.current.some((p) => p.id === selIdRef.current)) setSelId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [features, ready]);

  useEffect(() => {
    if (!ready) return;
    try { mapRef.current?.setLayoutProperty('webcams', 'visibility', showCams ? 'visible' : 'none'); } catch { /* not ready */ }
  }, [showCams, ready]);

  useEffect(() => { if (ready) updateRef.current(); }, [selId, ready]);
  useEffect(() => {
    markersRef.current.forEach((m, k) => {
      const wrap = m.getElement(); const el = wrap.firstElementChild as HTMLElement | null;
      const id = k.startsWith('p|') ? k.slice(k.indexOf('|', 2) + 1) : null;
      el?.classList.toggle('is-hot', !!id && id === hotId);
      el?.classList.toggle('is-sel', !!id && id === selId);
      wrap.style.zIndex = id && (id === selId || id === hotId) ? '5' : '';
    });
  }, [hotId, selId]);

  // ---- Actions ---------------------------------------------------------------------------
  function fitPoints(list: ExplorerPoint[], animate = true) {
    const map = mapRef.current; const ml = mlRef.current;
    if (!map || !ml || !list.length) return;
    const b = new ml.LngLatBounds();
    if (list.length < 25) list.forEach((p) => b.extend([p.lng, p.lat]));
    else {
      // Ignore the outer 4% on each side, so a few far-flung places don't zoom the map
      // out to the whole island.
      const q = (arr: number[], f: number) => arr[Math.min(arr.length - 1, Math.floor(arr.length * f))];
      const lats = list.map((p) => p.lat).sort((x, y) => x - y); const lngs = list.map((p) => p.lng).sort((x, y) => x - y);
      b.extend([q(lngs, 0.04), q(lats, 0.04)]); b.extend([q(lngs, 0.96), q(lats, 0.96)]);
    }
    const narrow = (mapEl.current?.clientWidth || 800) < 520;
    if (!b.isEmpty()) map.fitBounds(b, { padding: narrow ? { top: 56, bottom: 16, left: 42, right: 42 } : 50, maxZoom: 13, duration: animate ? 600 : 0 });
  }

  function openCamPopup(coords: LngLat, p: { name?: string; url?: string; area?: string; district?: string }) {
    const map = mapRef.current; const ml = mlRef.current;
    if (!map || !ml) return;
    const place = [p.area, p.district].filter(Boolean).join(' · ');
    const external = !!(p.url && /^https?:\/\//.test(p.url));
    const target = external ? ' target="_blank" rel="noopener nofollow"' : '';
    camPopupRef.current?.remove();
    camPopupRef.current = new ml.Popup({ closeButton: true, maxWidth: '260px', className: 'clm-campop' })
      .setLngLat(coords)
      .setHTML(`<b>${esc(p.name || '')}</b>${place ? `<br><span class="clm-muted">${esc(place)}</span>` : ''}${p.url ? `<br><a href="${esc(p.url)}"${target}>${esc(U.watchLive)} →</a>` : ''}`)
      .addTo(map);
  }

  function focusPoint(p: { id: string; lat: number; lng: number }) {
    setSelId(p.id);
    // On a phone the popup is a sheet over the lower map: keep the pin in the upper part.
    const box = mapEl.current; const narrow = typeof window !== 'undefined' && window.innerWidth <= 860;
    const offset: [number, number] = narrow && box ? [0, -Math.round(box.clientHeight * 0.3)] : [0, 0];
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: Math.max(mapRef.current.getZoom(), 15), duration: 800, offset });
  }

  function toggleSave(id: string) {
    setSaved((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(Array.from(s))); } catch { /* storage unavailable */ }
      return s;
    });
  }

  function locateMe() {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const map = mapRef.current; const ml = mlRef.current;
      if (!map || !ml) return;
      const c: LngLat = [pos.coords.longitude, pos.coords.latitude];
      meMarkerRef.current?.remove();
      const el = document.createElement('div'); el.className = 'clm-me';
      meMarkerRef.current = new ml.Marker({ element: el }).setLngLat(c).addTo(map);
      map.flyTo({ center: c, zoom: 14 });
    }, () => {}, { enableHighAccuracy: true, timeout: 8000 });
  }

  const toggleIn = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

  /** Tabs are single-choice: tapping one shows only that category; tapping it again → All. */
  function selectTab(k: string) {
    const cats = k === 'all' || k === activeTab ? [] : k === 'event' ? [EVENT_CAT] : k === 'exp' ? actKeys : [k];
    const nf = { ...filters, cats };
    setFilters(nf); setSelId(null);
    const next = all.filter((p) => matches(p, nf, saved));
    if (cats.length || nf.districts.length) fitPoints(next); else fitPoints(all);
  }

  function applyFilters() {
    if (!draft) return;
    setFilters(draft); setDraft(null);
    const next = all.filter((p) => matches(p, draft, saved));
    if (next.length && activeCount(draft) > 0) fitPoints(next);
  }

  // ---- Search with suggestions ---------------------------------------------------------
  const term = fold(q.trim());
  const districtCounts = useMemo(() => new Map(facets.districts), [facets.districts]);
  const localSugs = useMemo<Suggestion[]>(() => {
    if (term.length < 1) return [];
    const cats = categories
      .filter((c) => fold(c.label).includes(term) || c.k.includes(term))
      .map((c) => ({ c, n: catCounts.get(c.k) || 0 }))
      .sort((a, b) => Number(fold(b.c.label).startsWith(term)) - Number(fold(a.c.label).startsWith(term)) || b.n - a.n)
      .slice(0, 6)
      .map(({ c, n }) => ({ kind: 'cat' as const, key: c.k, label: c.label, icon: c.icon, count: n }));
    const dists = facets.districts
      .filter(([d]) => fold(d).includes(term))
      .slice(0, 4)
      .map(([d, n]) => ({ kind: 'district' as const, key: d, label: titleCase(d), count: n }));
    return [...cats, ...dists];
  }, [term, categories, catCounts, facets.districts]);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) { setBizHits([]); return; }
    let off = false;
    const t = setTimeout(() => {
      fetch(`${ep.search}${ep.search.includes('?') ? '&' : '?'}q=${encodeURIComponent(text)}&locale=${encodeURIComponent(locale)}`)
        .then((r) => (r.ok ? r.json() : { hits: [] }))
        .then((d: { hits?: { id: string; name: string; cat: string; district: string | null; lat: number; lng: number }[] }) => {
          if (off) return;
          setBizHits((d.hits || []).slice(0, 8).map((h) => ({
            kind: 'biz' as const, id: h.id, label: h.name,
            sub: [catLabelOf(h.cat), h.district ? titleCase(h.district) : ''].filter(Boolean).join(' · '),
            icon: catIconOf(h.cat), lat: h.lat, lng: h.lng,
          })));
        })
        .catch(() => { if (!off) setBizHits([]); });
    }, 220);
    return () => { off = true; clearTimeout(t); };
  }, [q, ep.search, locale, catLabelOf, catIconOf]);

  const suggestions: Suggestion[] = useMemo(() => {
    const out: Suggestion[] = [...localSugs, ...bizHits];
    if (q.trim().length >= 3) out.push({ kind: 'addr', label: q.trim() });
    return out;
  }, [localSugs, bizHits, q]);
  useEffect(() => { setSugIdx(-1); }, [q]);

  async function chooseSuggestion(s: Suggestion) {
    setSugOpen(false);
    if (s.kind === 'cat') {
      setQ('');
      const nf = { ...filters, cats: [s.key] };
      setFilters(nf);
      fitPoints(all.filter((p) => matches(p, nf, saved)));
    } else if (s.kind === 'district') {
      setQ('');
      const nf = { ...filters, districts: [s.key] };
      setFilters(nf);
      fitPoints(all.filter((p) => matches(p, nf, saved)));
    } else if (s.kind === 'biz') {
      setQ(s.label);
      const p = byId.get(s.id);
      if (p && !shownRef.current.some((x) => x.id === p.id)) setFilters(EMPTY);
      focusPoint(p || { id: s.id, lat: s.lat, lng: s.lng });
    } else {
      try {
        const r = await fetch(`${ep.geocode}${ep.geocode.includes('?') ? '&' : '?'}q=${encodeURIComponent(s.label)}`);
        const hit = r.ok ? (await r.json()) as { lat: number; lng: number; label: string } : null;
        const map = mapRef.current; const ml = mlRef.current;
        if (hit && map && ml) {
          placeMarkerRef.current?.remove();
          const el = document.createElement('div'); el.className = 'clm-place'; el.title = hit.label;
          placeMarkerRef.current = new ml.Marker({ element: el, anchor: 'bottom' }).setLngLat([hit.lng, hit.lat]).addTo(map);
          map.flyTo({ center: [hit.lng, hit.lat], zoom: 15 });
        }
      } catch { /* geocoder unavailable */ }
    }
  }

  function onSearchKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSugOpen(true); setSugIdx((i) => Math.min(suggestions.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSugIdx((i) => Math.max(-1, i - 1)); }
    else if (e.key === 'Escape') { setSugOpen(false); }
  }
  function onSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = suggestions[sugIdx >= 0 ? sugIdx : 0];
    if (s) chooseSuggestion(s);
  }
  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (searchBox.current && !searchBox.current.contains(e.target as Node)) setSugOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // ---- Chip row arrows --------------------------------------------------------------------
  const syncChips = useCallback(() => {
    const el = chipsEl.current; if (!el) return;
    const max = el.scrollWidth - el.clientWidth; const x = Math.abs(el.scrollLeft);
    setChipScroll({ left: x > 4, right: x < max - 4 });
  }, []);
  useEffect(() => {
    syncChips();
    window.addEventListener('resize', syncChips);
    return () => window.removeEventListener('resize', syncChips);
  }, [syncChips, chipCats.length]);
  useEffect(() => {
    const el = chipsEl.current?.querySelector<HTMLElement>('.clm-chip.is-on');
    if (!el || !chipsEl.current) return;
    const box = chipsEl.current; const l = el.offsetLeft - box.offsetLeft; const r = l + el.offsetWidth;
    if (l < box.scrollLeft + 48 || r > box.scrollLeft + box.clientWidth - 48) box.scrollTo({ left: Math.max(0, l - 120), behavior: 'smooth' });
  }, [activeTab]);
  const scrollChips = (dir: 1 | -1) => {
    const el = chipsEl.current; if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl' ? -1 : 1;
    el.scrollBy({ left: dir * rtl * 260, behavior: 'smooth' });
  };

  // ---- Full screen + dialog ------------------------------------------------------------------
  useEffect(() => {
    if (!full && !draft) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key !== 'Escape') return; if (draft) setDraft(null); else setFull(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [full, draft]);
  useEffect(() => { const t = setTimeout(() => { mapRef.current?.resize(); syncChips(); }, 40); return () => clearTimeout(t); }, [full, syncChips]);

  const sel = selId ? byId.get(selId) : null;
  // The Filters badge counts what the tabs don't show: everything but a single-tab category choice.
  const nActive = activeCount(filters) - (activeTab === 'custom' ? 0 : filters.cats.length);
  const tab = (k: string, label: string, icon: string | null, n: number | null) => (
    <button key={k} type="button" className={`clm-chip${activeTab === k ? ' is-on' : ''}`} aria-pressed={activeTab === k} onClick={() => selectTab(k)}>
      {icon ? <CatIcon icon={icon} size={15} /> : null}{label}{n != null ? <span className="clm-chip__n">{n.toLocaleString(locale)}</span> : null}
    </button>
  );

  // ---- Render helpers --------------------------------------------------------------------------
  // Our catalogue tags → short, translated labels on experience cards.
  const TAG: Record<string, string> = {
    pickup: U.pickup, meal: U.meal, 'small-group': U.smallGroup, private: U.privateGroup,
    family: U.family, 'adults-only': U.adults, sunset: U.sunset, beginners: U.beginners,
  };
  const timeOf = (iso: string) => {
    const t = new Date(iso);
    if (t.getHours() === 0 && t.getMinutes() === 0) return '';
    try { return `, ${t.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`; } catch { return ''; }
  };
  /** "12 Oct, 19:00" · "12 Oct – 3 Nov" · "On now · until 30 Nov". */
  const eventWhen = (p: ExplorerPoint) => {
    if (!p.date) return '';
    if (isOngoing(p)) return p.end ? `${U.onNow} · ${U.until.replace('{d}', fmtDate(p.end, locale))}` : U.onNow;
    const multi = !!p.end && Date.parse(p.end) - Date.parse(p.date) > 20 * 3600e3;
    return multi ? `${fmtDate(p.date, locale)} – ${fmtDate(p.end, locale)}` : `${fmtDate(p.date, locale)}${timeOf(p.date)}`;
  };
  const metaLine = (p: ExplorerPoint, d: ExplorerDetail | null = null) => isAct(p) ? [
    catLabelOf(p.cat),
    d?.duration || null,
    ...(d?.tags || []).map((t) => TAG[t]).filter(Boolean).slice(0, 2),
  ].filter(Boolean).join(' • ') : isEvent(p) ? [eventWhen(p), d?.venue || null].filter(Boolean).join(' • ') : [
    catLabelOf(p.cat),
    p.subtype ? titleCase(p.subtype) : null,
    p.rank > 0 ? U.partner : null,
    p.flags & F.VERIFIED ? U.verified : null,
    p.flags & F.LUXURY ? U.luxury : null,
  ].filter(Boolean).join(' • ');

  /** The listing's rating, else our own guests' reviews. Never a rating for experiences. */
  const ratingOf = (p: ExplorerPoint, d: ExplorerDetail | null): { v: number; n: number } | null =>
    isAct(p) ? null : p.rating ? { v: p.rating, n: p.ratingCount } : d?.own?.count ? { v: d.own.avg, n: d.own.count } : null;

  const priceOf = (p: ExplorerPoint, d: ExplorerDetail | null) =>
    p.priceFrom ? `${U.from} €${p.priceFrom.toLocaleString(locale)}` : (d?.eventPrice || p.price || null);
  const priceNode = (p: ExplorerPoint, d: ExplorerDetail | null) => {
    const price = priceOf(p, d);
    if (!price) return null;
    return (
      <span className="clm-price">
        {price}
        {isAct(p) && d?.basis ? <small className="clm-price__basis">{d.basis}</small> : null}
      </span>
    );
  };

  const dateTile = (p: ExplorerPoint, big = false) => {
    const iso = isOngoing(p) && p.end ? p.end : p.date;
    if (!iso) return null;
    const t = new Date(iso);
    return (
      <div className={`clm-date${isOngoing(p) ? ' is-now' : ''}${big ? ' clm-date--big' : ''}`}>
        <b>{t.getDate()}</b>
        <span>{isOngoing(p) ? `${U.until.replace('{d}', '').trim()} ` : ''}{(() => { try { return t.toLocaleDateString(locale, { month: 'short' }); } catch { return ''; } })()}</span>
      </div>
    );
  };

  const badgesOf = (p: ExplorerPoint, d: ExplorerDetail | null) => {
    const out: [string, string][] = [];
    if (isEvent(p)) {
      if (isOngoing(p)) out.push(['now', U.onNow]);
      if (isApprox(p)) out.push(['approx', U.approx.split(' — ')[0]]);
      return out;
    }
    if (isAct(p)) return out;
    if (p.rank > 0) out.push(['partner', U.partner]);
    if (p.flags & F.FEATURED) out.push(['featured', U.featured]);
    if (p.flags & F.VERIFIED || d?.claimed) out.push(['verified', U.verified]);
    if (p.flags & F.LUXURY) out.push(['lux', U.luxury]);
    return out;
  };

  const renderCard = (p: ExplorerPoint) => {
    const d = detailOf(p.id);
    const g = groupMeta.get(catMeta.get(p.cat)?.group || '') || groupMeta.get(EVENT_GROUP);
    const color = g?.color || GOLD;
    const isSaved = saved.has(p.id);
    const loading = !d && !detailsRef.current.has(p.id);
    const act = isAct(p); const ev = isEvent(p);
    const link = d?.href || (act ? d?.book : null) || null;
    const ext = act ? { target: '_blank', rel: 'sponsored noopener' } : {};
    const r = ratingOf(p, d);
    const badges = badgesOf(p, d).filter(([k]) => k === 'now' || k === 'approx');
    return (
      <article key={`list-${p.id}`}
        className={`clm-card clm-card--list${link ? ' is-link' : ''}${hotId === p.id ? ' is-hot' : ''}${p.rank > 0 ? ' is-tier' : ''}`}
        onClick={!link ? (e) => { if (!(e.target as HTMLElement).closest('a,button')) focusPoint(p); } : undefined}
        onMouseEnter={() => setHotId(p.id)}
        onMouseLeave={() => setHotId((h) => (h === p.id ? null : h))}>
        <div className="clm-card__media">
          {d?.image
            ? <img src={d.image} alt="" loading="lazy" />
            : ev ? <div className="clm-card__ph" style={{ color, background: `${color}1f` }}>{dateTile(p)}</div>
              : <div className="clm-card__ph" style={{ color, background: `${color}1f` }}><CatIcon icon={catIconOf(p.cat)} size={30} /></div>}
          <button type="button" className={`clm-heart${isSaved ? ' is-on' : ''}`} aria-pressed={isSaved} aria-label={U.save}
            onClick={(e) => { e.stopPropagation(); toggleSave(p.id); }}>
            <Icon d={P.heart} size={18} fill={isSaved ? 'currentColor' : 'none'} sw={2} />
          </button>
        </div>
        <div className="clm-card__body">
          {p.district ? <span className="clm-card__kicker">{titleCase(p.district)}{ev ? ` · ${U.events}` : ''}</span> : null}
          {loading
            ? <span className="clm-skel" aria-hidden="true" />
            : link
              ? <a className="clm-card__title" href={link} {...ext}>{d?.name}</a>
              : <span className="clm-card__title">{d?.name || catLabelOf(p.cat)}</span>}
          <span className="clm-card__meta">{metaLine(p, d)}</span>
          <div className="clm-card__foot">
            {r ? <Stars value={r.v} count={r.n} locale={locale} size={13} />
              : badges.length ? <span className="clm-badges">{badges.map(([k, l]) => <span key={k} className={`clm-badge clm-badge--${k}`}>{l}</span>)}</span>
                : <span />}
            {priceNode(p, d)}
          </div>
        </div>
      </article>
    );
  };

  // ---- Popup: everything we hold for the tapped item -------------------------------------------

  const row = (key: string, icon: string, body: React.ReactNode) => (
    <li key={key} className="clm-row"><Icon d={icon} size={16} className="clm-row__ic" /><span className="clm-row__t">{body}</span></li>
  );

  const renderPopup = (p: ExplorerPoint) => {
    const d = detailOf(p.id);
    const loading = !d && !detailsRef.current.has(p.id);
    const act = isAct(p); const ev = isEvent(p); const biz = !act && !ev;
    const g = groupMeta.get(catMeta.get(p.cat)?.group || '') || groupMeta.get(EVENT_GROUP);
    const color = g?.color || GOLD;
    const isSaved = saved.has(p.id);
    const photos = d?.photos?.length ? d.photos : d?.image ? [d.image] : [];
    const pi = Math.min(photoIdx, Math.max(0, photos.length - 1));
    const r = ratingOf(p, d);
    const hours = biz ? openState(d?.hours) : null;
    const socials = d?.socials ? SOCIAL_ORDER.filter((k) => d.socials![k]) : [];
    const badges = badgesOf(p, d);
    const listed = biz && !(p.flags & F.PUBLISHED);
    const link = d?.href || (act ? d?.book : null) || null;
    const kicker = biz ? [catLabelOf(p.cat), p.subtype ? titleCase(p.subtype) : null].filter(Boolean).join(' · ')
      : ev ? [p.district ? titleCase(p.district) : null, U.events].filter(Boolean).join(' · ') : catLabelOf(p.cat);
    const dirUrl = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
    return (
      <article className="clm-pc">
        <div className="clm-pc__media" style={photos.length ? undefined : { color, background: `${color}1f` }}>
          {photos.length
            ? <img key={photos[pi]} src={photos[pi]} alt="" />
            : ev ? dateTile(p, true) : <CatIcon icon={catIconOf(p.cat)} size={46} />}
          {photos.length > 1 ? (
            <>
              <button type="button" className="clm-pc__nav clm-pc__nav--l" aria-label="‹" onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}><Icon d={P.chevL} size={16} sw={2.6} /></button>
              <button type="button" className="clm-pc__nav clm-pc__nav--r" aria-label="›" onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}><Icon d={P.chevR} size={16} sw={2.6} /></button>
              <span className="clm-pc__count">{pi + 1} / {photos.length}</span>
            </>
          ) : null}
          <button type="button" className={`clm-heart${isSaved ? ' is-on' : ''}`} aria-pressed={isSaved} aria-label={U.save} onClick={() => toggleSave(p.id)}>
            <Icon d={P.heart} size={18} fill={isSaved ? 'currentColor' : 'none'} sw={2} />
          </button>
        </div>
        <div className="clm-pc__body">
          {badges.length ? <div className="clm-badges">{badges.map(([k, l]) => <span key={k} className={`clm-badge clm-badge--${k}`}>{l}</span>)}</div> : null}
          <span className="clm-card__kicker">{kicker}</span>
          {loading
            ? <span className="clm-skel" aria-hidden="true" />
            : link
              ? <a className="clm-card__title" href={link} {...(act ? { target: '_blank', rel: 'sponsored noopener' } : {})}>{d?.name}</a>
              : <span className="clm-card__title">{d?.name || catLabelOf(p.cat)}</span>}
          {act ? <span className="clm-card__meta">{metaLine(p, d)}</span> : null}
          {!ev && (r || priceOf(p, d)) ? (
            <div className="clm-pc__rate">
              {r ? <Stars value={r.v} count={r.n} locale={locale} size={15} /> : <span />}
              {priceNode(p, d)}
            </div>
          ) : null}
          <ul className="clm-rows">
            {ev && p.date ? row('when', P.cal, eventWhen(p)) : null}
            {ev && d?.eventPrice ? row('price', P.euro, d.eventPrice) : null}
            {d?.address ? row('addr', P.pin, d.address) : (biz && p.district ? row('addr', P.pin, titleCase(p.district)) : null)}
            {hours ? row('hours', P.clock, <>
              {hours.state !== 'unknown' ? <b className={hours.state === 'open' ? 'clm-open' : 'clm-closed'}>{hours.state === 'open' ? U.openNow : U.closedNow}</b> : null}
              {hours.today && !(hours.state === 'closed' && !/\d/.test(hours.today)) ? <>{hours.state !== 'unknown' ? ' · ' : ''}{U.todayHours} {hours.today}</> : null}
            </>) : null}
            {d?.phone ? row('phone', P.phone, <a dir="ltr" href={`tel:${d.phone.replace(/[^\d+]/g, '')}`}>{d.phone}</a>) : null}
            {d?.email ? row('email', P.mail, <a dir="ltr" href={`mailto:${d.email}`}>{d.email}</a>) : null}
            {d?.url && !act ? row('web', P.globe, <a dir="ltr" href={d.url} target="_blank" rel="noopener nofollow">{hostOf(d.url)}</a>) : null}
          </ul>
          {d?.summary ? <p className="clm-pc__sum">{d.summary}</p> : null}
          {d?.amenities?.length ? <div className="clm-amen">{d.amenities.slice(0, 8).map((a) => <span key={a}>{a}</span>)}</div> : null}
          {socials.length ? (
            <div className="clm-socials">
              {socials.map((k) => <a key={k} href={d!.socials![k]} target="_blank" rel="noopener nofollow" aria-label={titleCase(k)} title={titleCase(k)}><Icon d={SOCIAL_ICON[k]} size={16} sw={1.8} /></a>)}
            </div>
          ) : null}
          {act ? (
            <>
              <div className="clm-acts">
                {d?.book ? <a className="clm-act clm-act--main" href={d.book} target="_blank" rel="sponsored noopener">{U.book}<Icon d={P.ext} size={13} sw={2.2} /></a> : null}
              </div>
              <p className="clm-approx"><Icon d={P.pin} size={12} />{U.approx}</p>
              <p className="clm-approx clm-approx--note">{U.partnerNote}</p>
            </>
          ) : (
            <div className="clm-acts">
              {d?.href ? <a className="clm-act clm-act--main" href={d.href}>{ev ? U.eventDetails : U.viewProfile}<Icon d={P.chevR} size={13} sw={2.4} /></a> : null}
              {d?.phone ? <a className="clm-act" href={`tel:${d.phone.replace(/[^\d+]/g, '')}`}><Icon d={P.phone} size={13} />{U.call}</a> : null}
              {d?.email ? <a className="clm-act" href={`mailto:${d.email}`}><Icon d={P.mail} size={13} />{U.email}</a> : null}
              {d?.url ? <a className="clm-act" href={d.url} target="_blank" rel="noopener nofollow"><Icon d={P.globe} size={13} />{U.website}</a> : null}
              {!(ev && isApprox(p)) ? <a className="clm-act" href={dirUrl} target="_blank" rel="noopener noreferrer"><Icon d={P.route} size={13} />{U.directions}</a> : null}
            </div>
          )}
          {ev && isApprox(p) ? <p className="clm-approx"><Icon d={P.pin} size={12} />{U.approxArea}</p> : null}
          {biz && d && !d.claimed && d.claimHref ? (
            <p className="clm-approx clm-claim">{listed ? <>{U.listedNote} </> : null}<a href={d.claimHref}>{U.claim} →</a></p>
          ) : null}
        </div>
      </article>
    );
  };

  const section = (id: string, title: string, body: React.ReactNode, count?: number) => {
    const open = openSec[id] !== false;
    return (
      <section key={id} className={`clm-fsec${open ? ' is-open' : ''}`}>
        <button type="button" className="clm-fsec__head" aria-expanded={open} onClick={() => setOpenSec((st) => ({ ...st, [id]: !open }))}>
          <h3>{title}{count ? <span className="clm-fsec__n">{count}</span> : null}</h3><Icon d={P.chevD} size={18} sw={2.2} />
        </button>
        {open ? <div className="clm-fsec__body">{body}</div> : null}
      </section>
    );
  };

  type ListKey = 'districts' | 'subtypes' | 'prices' | 'features' | 'cats' | 'times';
  const checkRow = (key: ListKey, v: string, label: React.ReactNode, n?: number, disabled = false) => {
    if (!draft) return null;
    const on = draft[key].includes(v);
    return (
      <label key={v} className={`clm-check${disabled ? ' is-off' : ''}`}>
        <input type="checkbox" checked={on} disabled={disabled && !on} onChange={() => setDraft((d) => (d ? { ...d, [key]: toggleIn(d[key], v) } : d))} />
        <span className="clm-check__box"><Icon d={P.check} size={14} sw={3} /></span>
        <span className="clm-check__label">{label}</span>
        {n != null ? <span className="clm-check__n">{n.toLocaleString(locale)}</span> : null}
      </label>
    );
  };
  const checks = (id: string, opts: [string, string, number?][], key: ListKey) => {
    const expanded = !!moreSec[id];
    const list = expanded ? opts : opts.slice(0, LIST_CAP);
    return (
      <>
        {list.map(([v, label, n]) => checkRow(key, v, label, n))}
        {opts.length > LIST_CAP
          ? <button type="button" className="clm-linkbtn" onClick={() => setMoreSec((s) => ({ ...s, [id]: !expanded }))}>{expanded ? U.showLess : U.showMore}</button>
          : null}
      </>
    );
  };
  const radios = <T extends string | number>(name: string, opts: [T, string][], value: T | null, set: (v: T | null) => void) => (
    <>
      {opts.map(([v, label]) => (
        <label key={String(v)} className="clm-check clm-check--radio">
          <input type="radio" name={name} checked={value === v} onChange={() => set(v)} />
          <span className="clm-check__box" />
          <span className="clm-check__label">{label}</span>
        </label>
      ))}
      {value != null ? <button type="button" className="clm-linkbtn" onClick={() => set(null)}>{U.clear}</button> : null}
    </>
  );

  // All categories, grouped (every canonical key, even with 0 places yet).
  const categoriesByGroup = useMemo(() => groups
    .filter((g) => g.k !== EVENT_GROUP)
    .map((g) => ({ g, cats: categories.filter((c) => c.group === g.k).sort((a, b) => (catCounts.get(b.k) || 0) - (catCounts.get(a.k) || 0) || a.label.localeCompare(b.label, locale)) }))
    .filter((x) => x.cats.length), [groups, categories, catCounts, locale]);

  const categoryTree = (which: (groupKey: string) => boolean) => {
    if (!draft) return null;
    return categoriesByGroup.filter(({ g }) => which(g.k)).map(({ g, cats }) => {
      const keys = cats.map((c) => c.k);
      const nOn = keys.filter((k) => draft.cats.includes(k)).length;
      const total = keys.reduce((a, k) => a + (catCounts.get(k) || 0), 0);
      const open = openGroups[g.k] ?? nOn > 0;
      const allOn = nOn === keys.length;
      return (
        <div key={g.k} className={`clm-grp${open ? ' is-open' : ''}`}>
          <div className="clm-grp__row">
            <label className="clm-check clm-check--grp">
              <input type="checkbox" checked={allOn} ref={(el) => { if (el) el.indeterminate = nOn > 0 && !allOn; }}
                onChange={() => setDraft((d) => (d ? { ...d, cats: allOn ? d.cats.filter((k) => !keys.includes(k)) : Array.from(new Set([...d.cats, ...keys])) } : d))} />
              <span className="clm-check__box"><Icon d={nOn > 0 && !allOn ? P.minus : P.check} size={14} sw={3} /></span>
              <span className="clm-grp__ic" style={{ color: g.color }}><CatIcon icon={g.icon} size={16} /></span>
              <span className="clm-check__label">{g.label}</span>
              <span className="clm-check__n">{total.toLocaleString(locale)}</span>
            </label>
            <button type="button" className="clm-grp__tog" aria-expanded={open} aria-label={g.label} onClick={() => setOpenGroups((s) => ({ ...s, [g.k]: !open }))}>
              <Icon d={P.chevD} size={16} sw={2.2} />
            </button>
          </div>
          {open ? (
            <div className="clm-grp__cats">
              {cats.map((c) => checkRow('cats', c.k, <><span className="clm-grp__cic"><CatIcon icon={c.icon} size={14} /></span>{c.label}</>, catCounts.get(c.k) || 0, (catCounts.get(c.k) || 0) === 0))}
            </div>
          ) : null}
        </div>
      );
    });
  };

  // ---- Markup ------------------------------------------------------------------------------------
  const popW = popPos ? Math.min(360, popPos.w - 16) : 0;
  const featureLabels: Record<string, string> = {
    partner: U.partner, featured: U.featured, verified: U.verified, luxury: U.luxury, profile: U.profile, photo: U.withPhoto, saved: U.saved,
  };

  const sugGroups: { title: string; items: Suggestion[] }[] = [
    { title: U.categories, items: suggestions.filter((s) => s.kind === 'cat') },
    { title: U.places, items: suggestions.filter((s) => s.kind === 'district') },
    { title: groupMeta.get('activities')?.label || '', items: suggestions.filter((s) => s.kind === 'biz' && s.id.startsWith('a:')) },
    { title: U.businesses, items: suggestions.filter((s) => s.kind === 'biz' && !s.id.startsWith('a:')) },
    { title: '', items: suggestions.filter((s) => s.kind === 'addr') },
  ].filter((g) => g.items.length);

  return (
    <div className={`clm clm--${mode}${full ? ' clm--full' : ''}`}>
      {/* ── Left panel ── */}
      <aside className="clm-side">
        <div className="clm-searchwrap" ref={searchBox}>
          <form className="clm-search" onSubmit={onSearchSubmit} role="search">
            <Icon d={P.pin} size={18} className="clm-search__pin" />
            <input value={q} onChange={(e) => { setQ(e.target.value); setSugOpen(true); }} onFocus={() => setSugOpen(true)} onKeyDown={onSearchKey}
              placeholder={U.search} aria-label={U.search} aria-autocomplete="list" aria-expanded={sugOpen && suggestions.length > 0} role="combobox" aria-controls="clm-sug" />
            {q ? <button type="button" className="clm-search__clear" onClick={() => { setQ(''); placeMarkerRef.current?.remove(); placeMarkerRef.current = null; }} aria-label={U.clear}><Icon d={P.close} size={14} sw={2.4} /></button> : null}
            <button type="submit" className="clm-search__go" aria-label={U.search}><Icon d={P.search} size={18} sw={2.4} /></button>
          </form>
          {sugOpen && suggestions.length ? (
            <div className="clm-sug" id="clm-sug" role="listbox">
              {sugGroups.map((grp, gi) => (
                <div key={gi} className="clm-sug__grp">
                  {grp.title ? <div className="clm-sug__h">{grp.title}</div> : null}
                  {grp.items.map((s) => {

                    const idx = suggestions.indexOf(s);
                    const active = idx === sugIdx;
                    return (
                      <button key={`${s.kind}-${'key' in s ? s.key : 'id' in s ? s.id : s.label}`} type="button" role="option" aria-selected={active}
                        className={`clm-sug__it${active ? ' is-on' : ''}`} onMouseEnter={() => setSugIdx(idx)} onMouseDown={(e) => e.preventDefault()} onClick={() => chooseSuggestion(s)}>
                        <span className="clm-sug__ic">
                          {s.kind === 'cat' || s.kind === 'biz' ? <CatIcon icon={s.icon} size={16} /> : s.kind === 'district' ? <Icon d={P.pin} size={16} /> : <Icon d={P.search} size={16} />}
                        </span>
                        <span className="clm-sug__t">
                          {s.kind === 'addr' ? <>{U.searchAddress}: <b>{s.label}</b></> : <b>{s.label}</b>}
                          {s.kind === 'biz' && s.sub ? <small>{s.sub}</small> : null}
                        </span>
                        {s.kind === 'cat' || s.kind === 'district' ? <span className="clm-sug__n">{s.count.toLocaleString(locale)}</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="clm-chips-wrap">
          {chipScroll.left ? <button type="button" className="clm-chips__arrow clm-chips__arrow--l" onClick={() => scrollChips(-1)} aria-label="‹"><Icon d={P.chevL} size={16} sw={2.4} /></button> : null}
          <div className="clm-chips" ref={chipsEl} onScroll={syncChips}>
            <button type="button" className={`clm-chip clm-chip--filters${nActive ? ' is-set' : ''}`} onClick={() => setDraft({ ...filters })} aria-haspopup="dialog">
              <Icon d={P.sliders} size={16} sw={2} />{U.filters}{nActive ? <span className="clm-chip__badge">{nActive}</span> : null}
            </button>
            {activeTab === 'custom' ? (
              <button type="button" className="clm-chip is-on clm-chip--custom" onClick={() => selectTab('all')} aria-pressed="true">
                {U.nCategories.replace('{n}', String(filters.cats.length))}<Icon d={P.close} size={13} sw={2.6} />
              </button>
            ) : null}
            {tab('all', U.all, null, all.length || null)}
            {hasEvents ? tab('event', U.events, catIconOf(EVENT_CAT), catCounts.get(EVENT_CAT) || 0) : null}
            {actTotal ? tab('exp', U.experiences, groupMeta.get('activities')?.icon || null, actTotal) : null}
            {chipCats.map((c) => tab(c.k, c.label, c.icon, catCounts.get(c.k) || 0))}
            <button type="button" className={`clm-chip${showCams ? ' is-on' : ''}`} aria-pressed={showCams} onClick={() => setShowCams((v) => !v)}>
              <Icon d={P.cam} size={15} />{U.live}
            </button>
          </div>
          {chipScroll.right ? <button type="button" className="clm-chips__arrow clm-chips__arrow--r" onClick={() => scrollChips(1)} aria-label="›"><Icon d={P.chevR} size={16} sw={2.4} /></button> : null}
        </div>

        <div className="clm-count">
          <span>{points ? `${inView.length.toLocaleString(locale)} ${U.inView} · ${shown.length.toLocaleString(locale)} ${U.total}` : loadFailed ? U.noMatches : U.loading}</span>
          {activeCount(filters) ? <button type="button" className="clm-linkbtn" onClick={() => setFilters(EMPTY)}>{U.resetAll}</button> : null}
        </div>

        <div className="clm-list" ref={listEl}>
          {!points && !loadFailed ? Array.from({ length: 4 }, (_, i) => <div key={i} className="clm-card clm-card--ghost"><div className="clm-card__media" /><div className="clm-card__body"><span className="clm-skel" /><span className="clm-skel clm-skel--s" /></div></div>) : null}
          {visible.map((p) => renderCard(p))}
          {inView.length > limit
            ? <button type="button" className="clm-more" onClick={() => setLimit((n) => n + PAGE)}>{U.showMore} ({(inView.length - limit).toLocaleString(locale)})</button>
            : null}
          {points && inView.length === 0 ? <p className="clm-empty">{U.noMatches}</p> : null}
        </div>
      </aside>

      {/* ── Map ── */}
      <div className="clm-mapwrap">
        <div ref={mapEl} className="clm-map" aria-label={U.mapAria} />
        {!points ? <div className="clm-status">{loadFailed ? U.noMatches : U.loading}</div> : null}
        <button type="button" className="clm-full-btn" onClick={() => setFull((v) => !v)}>
          {full ? U.closeMap : U.fullscreen}<Icon d={full ? P.close : P.expand} size={16} sw={2.2} />
        </button>
        <div className="clm-ctrls">
          {canLocate ? <button type="button" className="clm-ctrl" onClick={locateMe} aria-label={U.locate} title={U.locate}><Icon d={P.locate} size={18} sw={2} /></button> : null}
          <div className="clm-ctrl-zoom">
            <button type="button" className="clm-ctrl" onClick={() => mapRef.current?.zoomIn()} aria-label={U.zoomIn}><Icon d={P.plus} size={18} sw={2.2} /></button>
            <button type="button" className="clm-ctrl" onClick={() => mapRef.current?.zoomOut()} aria-label={U.zoomOut}><Icon d={P.minus} size={18} sw={2.2} /></button>
          </div>
        </div>
        {sel && popPos ? (
          <div ref={popRef} className="clm-pop"
            style={{ width: popW, left: popXY?.left ?? -9999, top: popXY?.top ?? -9999 }}>
            {renderPopup(sel)}
            <button type="button" className="clm-pop__close" onClick={() => setSelId(null)} aria-label={U.close}><Icon d={P.close} size={14} sw={2.4} /></button>
          </div>
        ) : null}
      </div>

      {/* ── Filters dialog ── */}
      {draft ? (
        <div className="clm-modal" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setDraft(null); }}>
          <div className="clm-dialog" role="dialog" aria-modal="true" aria-label={U.filters}>
            <header className="clm-dialog__head">
              <button type="button" className="clm-dialog__x" onClick={() => setDraft(null)} aria-label={U.close}><Icon d={P.close} size={20} sw={2.2} /></button>
              <h2>{U.filters}</h2>
            </header>
            <div className="clm-dialog__body">
              {hasEvents ? section('agenda', U.events, <>
                {checkRow('cats', EVENT_CAT, <><span className="clm-grp__cic"><CatIcon icon={catIconOf(EVENT_CAT)} size={14} /></span>{U.events}</>, catCounts.get(EVENT_CAT) || 0)}
                <div className="clm-pills">
                  {([[null, U.anyDate], ['today', U.today], ['weekend', U.weekend], ['week', U.week], ['month', U.month]] as [When | null, string][]).map(([w, label]) => {
                    const on = !draft.dateFrom && !draft.dateTo && draft.when === w;
                    return <button key={w || 'any'} type="button" className={`clm-pill${on ? ' is-on' : ''}`} aria-pressed={on}
                      onClick={() => setDraft((d) => (d ? { ...d, when: w, dateFrom: null, dateTo: null } : d))}>{label}</button>;
                  })}
                </div>
                <div className="clm-dates">
                  <label><span>{U.from}</span><input type="date" value={draft.dateFrom || ''} onChange={(e) => setDraft((d) => (d ? { ...d, dateFrom: e.target.value || null, when: null } : d))} /></label>
                  <label><span>{U.to}</span><input type="date" value={draft.dateTo || ''} min={draft.dateFrom || undefined} onChange={(e) => setDraft((d) => (d ? { ...d, dateTo: e.target.value || null, when: null } : d))} /></label>
                </div>
                <h4 className="clm-fsub">{U.startTime}</h4>
                {checks('start', [['morning', U.morning], ['afternoon', U.afternoon], ['evening', U.evening]], 'times')}
              </>, catCounts.get(EVENT_CAT) || 0) : null}
              {actTotal ? section('experiences', U.experiences, <>{categoryTree((g) => g === 'activities')}</>, actTotal) : null}
              {section('categories', U.categories, <>{categoryTree((g) => g !== 'activities')}</>, categories.filter((c) => c.k !== EVENT_CAT && !isActivityCat(c.k)).length)}
              {facets.districts.length ? section('places', U.places, <>{checks('places', facets.districts.map(([d, n]) => [d, titleCase(d), n]), 'districts')}</>) : null}
              {facets.subtypes.length ? section('interests', U.interests, <>{checks('interests', facets.subtypes.map(([s, n]) => [s, titleCase(s), n]), 'subtypes')}</>) : null}
              {facets.prices.length ? section('price', U.price, <>
                <div className="clm-pricegrid">
                  {facets.prices.map((b) => {
                    const on = draft.prices.includes(b);
                    return <button key={b} type="button" className={`clm-pricebtn${on ? ' is-on' : ''}`} aria-pressed={on} onClick={() => setDraft((d) => (d ? { ...d, prices: toggleIn(d.prices, b) } : d))}>{b}</button>;
                  })}
                </div>
                {draft.prices.length ? <button type="button" className="clm-linkbtn" onClick={() => setDraft((d) => (d ? { ...d, prices: [] } : d))}>{U.clear}</button> : null}
              </>) : null}
              {section('features', U.features, <>{checks('features', FEATURE_KEYS.map((f) => [f, featureLabels[f]]), 'features')}</>)}
              {facets.hasRating ? section('rating', U.rating, <>{radios<number>('rating', RATING_STEPS.map((r) => [r, `${r.toFixed(1)}+`]), draft.minRating, (v) => setDraft((d) => (d ? { ...d, minRating: v } : d)))}</>) : null}
            </div>
            <footer className="clm-dialog__foot">
              <button type="button" className="clm-linkbtn clm-linkbtn--strong" onClick={() => setDraft({ ...EMPTY })}>{U.resetAll}</button>
              <button type="button" className="clm-primary" onClick={applyFilters} disabled={draftCount === 0}>
                {U.showResults.replace('{n}', draftCount.toLocaleString(locale))}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
