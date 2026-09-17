// Cyprus Lifestyle — events-ingest (Deno edge function)
// =============================================================================
// Aggregates real Cyprus events — WITH their posters — from public listings and
// files them as DRAFTS in the events table for editorial approval in Admin →
// Agenda. This is the "why does cyprusnow.app have a picture per event and we
// don't" fix: those sites ingest a feed; now we do too, from the right source.
//
// Per city listing page  (https://allevents.in/<city>/all):
//   1. pull the event detail-page links
//   2. fetch each detail page, parse its schema.org/Event (or Festival/
//      MusicEvent/TheaterEvent…) JSON-LD  — the same structured data Google reads
//   3. download the poster and self-host it in Supabase Storage (bucket "listings",
//      path events/<slug>.jpg), storing provenance in image_credit
//   4. upsert as status='draft', source='allevents', deduped by source_url
//
// Nothing is published automatically. A human approves each draft in Admin →
// Agenda (and translate-on-approve fills the six non-English editions). No SDK
// import (pure fetch), so this pastes straight into the Supabase dashboard.
//
// Secrets (already set for enrich-directory — reused as-is):
//   ENRICH_SECRET   — the ?key= gate      (+ auto SUPABASE_URL / SERVICE_ROLE)
// One-time: the PUBLIC Storage bucket "listings" (created for enrich-directory).
//
// Run:  /functions/v1/events-ingest?key=SECRET
//   &cities=limassol,nicosia,larnaca,paphos,ayia-napa   (default; comma list)
//   &perCity=8      detail pages fetched per city   (1–20, default 8)
//   &limit=30       total events processed this run  (1–60, default 30)
//   &dryRun=1       parse + report, write nothing    (the "test yourself" mode)
//   &redo=1         re-download/re-insert even if source_url already exists
// =============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ENRICH_SECRET = Deno.env.get('ENRICH_SECRET') || '';
const BUCKET = Deno.env.get('ENRICH_BUCKET') || 'listings';

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const UA = 'Mozilla/5.0 (compatible; CyprusLifestyle/1.0; +https://cypruslifestyle.com)';
const DEFAULT_CITIES = ['limassol', 'nicosia', 'larnaca', 'paphos', 'ayia-napa'];

// ── the six Cyprus districts we file under ──────────────────────────────────
// Maps a JSON-LD addressLocality (or the allevents city slug) onto our districts.
// Government-controlled districts only; northern towns (Kyrenia/Girne, Famagusta
// town) map to their district name so the /agenda filter still works.
const DISTRICT_MAP: [RegExp, string][] = [
  [/nicosia|lefkosia|λευκωσ/i, 'nicosia'],
  [/limassol|lemesos|λεμεσ/i, 'limassol'],
  [/larnaca|larnaka|λάρνακ|λαρνακ/i, 'larnaca'],
  [/paphos|pafos|πάφο|παφο/i, 'paphos'],
  [/famagusta|ayia.?napa|agia.?napa|protaras|paralimni|deryneia|sotira|αμμόχωστ|αγία νάπα/i, 'famagusta'],
  [/kyrenia|girne|κερύνει/i, 'kyrenia'],
];

// event types we accept (schema.org Event + common subtypes allevents emits)
const EVENT_TYPES = new Set([
  'event', 'festival', 'musicevent', 'theaterevent', 'theatreevent', 'dancevent',
  'comedyevent', 'foodevent', 'visualartsevent', 'exhibitionevent', 'screeningevent',
  'sportsevent', 'socialevent', 'businessevent', 'educationevent', 'literaryevent',
  'childrensevent', 'publicationevent',
]);

// ── pure, unit-tested helpers ───────────────────────────────────────────────
export function slugify(input: string): string {
  return (input || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

// last long numeric run in a detail URL — the allevents event id; stable per event
export function idFromUrl(url: string): string {
  const m = (url.match(/(\d{6,})/g) || []);
  return m.length ? m[m.length - 1] : '';
}

// a slug that is stable across runs (so re-imports resolve to the same row) and
// collision-proof (the numeric event id disambiguates same-named events)
export function eventSlug(name: string, sourceUrl: string): string {
  const base = slugify(name).slice(0, 46) || 'event';
  const id = idFromUrl(sourceUrl);
  return id ? `${base}-${id.slice(-8)}` : base;
}

export function districtOf(locality: string | null, cityHint?: string | null): string | null {
  for (const hay of [locality, cityHint]) {
    if (!hay) continue;
    for (const [re, d] of DISTRICT_MAP) if (re.test(hay)) return d;
  }
  return null;
}

export function stripTags(s: string): string {
  return (s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&rsquo;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/\s+/g, ' ').trim();
}

export function isEventType(t: unknown): boolean {
  const arr = Array.isArray(t) ? t : [t];
  return arr.some((x) => typeof x === 'string' && EVENT_TYPES.has(x.toLowerCase().replace(/^https?:\/\/schema\.org\//, '')));
}

// Parse every <script type="application/ld+json"> block, leniently.
export function extractJsonLdBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    let raw = m[1].trim();
    if (!raw) continue;
    // strip HTML comments / CDATA wrappers some CMSs add
    raw = raw.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
    try { out.push(JSON.parse(raw)); }
    catch {
      // occasionally two JSON objects are concatenated; try the first balanced one
      const first = raw.match(/\{[\s\S]*\}/);
      if (first) { try { out.push(JSON.parse(first[0])); } catch { /* skip */ } }
    }
  }
  return out;
}

// Flatten @graph / arrays / nested and return objects that are Events.
export function collectEvents(blocks: unknown[]): Record<string, unknown>[] {
  const found: Record<string, unknown>[] = [];
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number) => {
    if (!node || typeof node !== 'object' || depth > 6 || seen.has(node)) return;
    seen.add(node);
    if (Array.isArray(node)) { for (const x of node) walk(x, depth + 1); return; }
    const o = node as Record<string, unknown>;
    if (isEventType(o['@type'])) found.push(o);
    if (Array.isArray(o['@graph'])) for (const x of o['@graph']) walk(x, depth + 1);
  };
  for (const b of blocks) walk(b, 0);
  return found;
}

function firstUrl(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v || null;
  if (Array.isArray(v)) { for (const x of v) { const u = firstUrl(x); if (u) return u; } return null; }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return firstUrl(o.url) || firstUrl(o.contentUrl) || null;
  }
  return null;
}

export function normalizeDate(s: unknown): string | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  let v = s.trim();
  if (!/[T ]/.test(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)) v += 'T00:00:00';
  v = v.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T'); // "YYYY-MM-DD HH:.." → ISO
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export interface ParsedEvent {
  slug: string;
  title_en: string;
  summary_en: string | null;
  venue: string | null;
  district: string | null;
  starts_at: string;
  ends_at: string | null;
  price: string | null;
  url: string | null;
  image_src: string | null;
  lat: number | null;
  lng: number | null;
  source_url: string;
  tags: string[];
}

function num(v: unknown): number | null {
  const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : NaN;
  return isFinite(n) ? n : null;
}

// offers → a human price string ("Free", "€20", "€15–€40") when present
function priceOf(offers: unknown): string | null {
  const arr = Array.isArray(offers) ? offers : offers ? [offers] : [];
  const nums: number[] = [];
  let sym = '€';
  for (const o of arr) {
    if (!o || typeof o !== 'object') continue;
    const r = o as Record<string, unknown>;
    const p = num(r.price ?? r.lowPrice);
    const hi = num(r.highPrice);
    const cur = String(r.priceCurrency || '').toUpperCase();
    if (cur === 'USD') sym = '$'; else if (cur === 'GBP') sym = '£';
    if (p !== null) nums.push(p);
    if (hi !== null) nums.push(hi);
  }
  if (!nums.length) return null;
  const lo = Math.min(...nums), hiN = Math.max(...nums);
  if (lo === 0 && hiN === 0) return 'Free';
  if (lo === hiN) return `${sym}${lo}`;
  return `${sym}${lo}–${sym}${hiN}`;
}

// One JSON-LD event object → our normalized row shape. No I/O. Returns null when
// the essentials (a name and a valid start date) are missing.
export function parseEvent(ev: Record<string, unknown>, sourceUrl: string, cityHint?: string | null): ParsedEvent | null {
  const title = stripTags(String(ev.name || '')).slice(0, 180);
  const starts = normalizeDate(ev.startDate);
  if (!title || !starts) return null;

  const loc = (Array.isArray(ev.location) ? ev.location[0] : ev.location) as Record<string, unknown> | undefined;
  const addr = (loc?.address && typeof loc.address === 'object' ? loc.address : {}) as Record<string, unknown>;
  const geo = (loc?.geo && typeof loc.geo === 'object' ? loc.geo : {}) as Record<string, unknown>;
  const locality = String(addr.addressLocality || addr.addressRegion || '') || null;
  const venue = stripTags(String(loc?.name || '')).slice(0, 160) || (locality ? stripTags(locality) : null);

  const type = ev['@type'];
  const tags = new Set<string>();
  const arrT = Array.isArray(type) ? type : [type];
  for (const t of arrT) {
    const k = String(t || '').toLowerCase().replace(/^https?:\/\/schema\.org\//, '');
    if (k === 'festival') tags.add('festival');
    else if (k === 'musicevent') { tags.add('music'); tags.add('concert'); }
    else if (k === 'theaterevent' || k === 'theatreevent') tags.add('theatre');
    else if (k === 'danceevent') tags.add('dance');
    else if (k === 'foodevent') tags.add('food');
    else if (k === 'screeningevent') tags.add('film');
    else if (k === 'exhibitionevent' || k === 'visualartsevent') tags.add('exhibition');
    else if (k === 'sportsevent') tags.add('sport');
  }

  return {
    slug: eventSlug(title, sourceUrl),
    title_en: title,
    summary_en: ev.description ? stripTags(String(ev.description)).slice(0, 600) || null : null,
    venue,
    district: districtOf(locality, cityHint),
    starts_at: starts,
    ends_at: normalizeDate(ev.endDate),
    price: priceOf(ev.offers),
    url: firstUrl(ev.offers) || (typeof ev.url === 'string' ? ev.url : null) || sourceUrl,
    image_src: firstUrl(ev.image),
    lat: num(geo.latitude),
    lng: num(geo.longitude),
    source_url: sourceUrl,
    tags: [...tags],
  };
}

// Detail-page links on a city listing page. allevents detail URLs look like
// https://allevents.in/<city>/<slug>/<numeric-id> ; also accept /e/<id> short links.
export function extractEventLinks(html: string, origin = 'https://allevents.in'): string[] {
  const set = new Set<string>();
  const re = /https?:\/\/(?:www\.)?allevents\.in\/[a-z0-9-]+\/[A-Za-z0-9][^"'\s<>]*?\/\d{6,}/gi;
  for (const m of html.match(re) || []) set.add(m.split('?')[0].replace(/\/$/, ''));
  const short = /https?:\/\/(?:www\.)?allevents\.in\/e\/[A-Za-z0-9]{6,}/gi;
  for (const m of html.match(short) || []) set.add(m.split('?')[0]);
  // reject obvious non-event paths
  const bad = /\/(all|search|create|login|signup|blog|help|about|privacy|terms|category|online)\//i;
  return [...set].filter((u) => !bad.test(u + '/')).map((u) => (u.startsWith('http') ? u : origin + u));
}

// ── I/O helpers (mirrors enrich-directory) ──────────────────────────────────
function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}
async function timedFetch(url: string, ms = 12000, init: RequestInit = {}): Promise<Response | null> {
  try { return await fetch(url, { ...init, headers: { 'User-Agent': UA, ...(init.headers || {}) }, signal: AbortSignal.timeout(ms) }); }
  catch { return null; }
}
async function getHtml(url: string, ms = 12000): Promise<string> {
  const r = await timedFetch(url, ms, { headers: { Accept: 'text/html,application/xhtml+xml' } });
  if (!r || !r.ok) return '';
  return await r.text().catch(() => '');
}
type ImgData = { buf: ArrayBuffer; ct: string };
async function downloadImage(url: string): Promise<ImgData | null> {
  const res = await timedFetch(url, 12000);
  if (!res || !res.ok) return null;
  const ct = res.headers.get('content-type') || 'image/jpeg';
  if (!ct.startsWith('image/')) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 3000) return null; // reject 1px trackers / spinners
  return { buf, ct };
}
async function uploadToStorage(slug: string, buf: ArrayBuffer, ct: string): Promise<string | null> {
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
  const path = `events/${slug}.${ext}`;
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': ct, 'x-upsert': 'true' },
    body: buf,
  }).catch(() => null);
  if (!up || !up.ok) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

// ── ingest one city ─────────────────────────────────────────────────────────
async function collectFromCity(city: string, perCity: number): Promise<Array<{ url: string; city: string }>> {
  const pages = [`https://allevents.in/${city}/all`, `https://allevents.in/${city}`];
  const links = new Set<string>();
  for (const p of pages) {
    const html = await getHtml(p);
    for (const u of extractEventLinks(html)) links.add(u);
    if (links.size >= perCity) break;
  }
  return [...links].slice(0, perCity).map((url) => ({ url, city }));
}

interface RowResult { title?: string; slug?: string; status: string; image?: boolean; district?: string | null; error?: string }

async function ingestOne(target: { url: string; city: string }, existing: Set<string>, dryRun: boolean): Promise<RowResult> {
  if (existing.has(target.url)) return { status: 'duplicate' };
  const html = await getHtml(target.url);
  if (!html) return { status: 'fetch-failed', error: target.url };
  const ev = collectEvents(extractJsonLdBlocks(html))[0];
  if (!ev) return { status: 'no-jsonld' };
  const p = parseEvent(ev, target.url, target.city);
  if (!p) return { status: 'unparseable' };

  if (dryRun) return { title: p.title_en, slug: p.slug, status: 'would-insert', image: !!p.image_src, district: p.district };

  // poster → self-hosted image
  let image: string | null = null;
  let image_credit: string | null = null;
  if (p.image_src) {
    const img = await downloadImage(p.image_src);
    if (img) { image = await uploadToStorage(p.slug, img.buf, img.ct); if (image) image_credit = 'Poster via allevents.in'; }
  }

  const row = {
    slug: p.slug, title_en: p.title_en, summary_en: p.summary_en,
    venue: p.venue, district: p.district,
    starts_at: p.starts_at, ends_at: p.ends_at, price: p.price,
    url: p.url, image, image_credit,
    lat: p.lat, lng: p.lng,
    tags: p.tags,
    status: 'draft', source: 'allevents', source_url: p.source_url,
    coords_precision: (p.lat && p.lng) ? 'exact' : 'town',
    date_confidence: 'confirmed',
    enrich_status: image ? 'ok' : 'partial',
  };

  // insert-if-new: ON CONFLICT (source_url) DO NOTHING, so re-runs never clobber
  // an editor's edits and never double-import.
  const ins = await rest('events?on_conflict=source_url', {
    method: 'POST',
    headers: { Prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify(row),
  });
  if (ins.status === 409) return { title: p.title_en, slug: p.slug, status: 'duplicate' };
  if (!ins.ok) {
    const t = await ins.text().catch(() => '');
    // a slug clash (different source, same title+id tail) shouldn't happen, but
    // don't fail the batch over one row
    return { title: p.title_en, slug: p.slug, status: 'insert-error', error: `${ins.status} ${t.slice(0, 140)}` };
  }
  const body = await ins.json().catch(() => []) as unknown[];
  if (Array.isArray(body) && body.length === 0) return { title: p.title_en, slug: p.slug, status: 'duplicate' };
  return { title: p.title_en, slug: p.slug, status: 'inserted', image: !!image, district: p.district };
}

async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  const u = new URL(req.url);
  if (ENRICH_SECRET && u.searchParams.get('key') !== ENRICH_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { ...CORS, 'Content-Type': 'application/json' } });
  }
  const cities = (u.searchParams.get('cities') || DEFAULT_CITIES.join(',')).split(',').map((c) => slugify(c.trim())).filter(Boolean);
  const perCity = Math.min(Math.max(Number(u.searchParams.get('perCity') || 8), 1), 20);
  const limit = Math.min(Math.max(Number(u.searchParams.get('limit') || 30), 1), 60);
  const dryRun = u.searchParams.get('dryRun') === '1';
  const redo = u.searchParams.get('redo') === '1';

  // 1) gather candidate detail URLs across cities
  let targets: Array<{ url: string; city: string }> = [];
  for (const c of cities) {
    if (targets.length >= limit) break;
    targets.push(...await collectFromCity(c, perCity));
  }
  // de-dupe URLs across cities, cap to limit
  const byUrl = new Map<string, { url: string; city: string }>();
  for (const t of targets) if (!byUrl.has(t.url)) byUrl.set(t.url, t);
  targets = [...byUrl.values()].slice(0, limit);

  // 2) which of these are already in the table (skip cheaply, no fetch/spend)
  const existing = new Set<string>();
  if (!redo && targets.length) {
    const inList = targets.map((t) => `"${t.url.replace(/"/g, '')}"`).join(',');
    const sel = await rest(`events?select=source_url&source_url=in.(${encodeURIComponent(inList)})`);
    if (sel.ok) { for (const r of (await sel.json().catch(() => [])) as Array<{ source_url: string }>) existing.add(r.source_url); }
  }

  // 3) ingest
  const results: RowResult[] = [];
  let inserted = 0;
  for (const t of targets) {
    try {
      const r = await ingestOne(t, existing, dryRun);
      if (r.status === 'inserted' || r.status === 'would-insert') inserted++;
      results.push(r);
    } catch (e) { results.push({ status: 'error', error: String(e) }); }
  }

  // 4) how many drafts are now waiting for approval
  const head = await rest(`events?select=id&status=eq.draft&source=eq.allevents`, { method: 'HEAD', headers: { Prefer: 'count=exact' } });
  const drafts_waiting = Number((head.headers.get('content-range') || '*/0').split('/')[1] || 0);

  return new Response(JSON.stringify({
    ok: true, dryRun, cities, candidates: targets.length, inserted, drafts_waiting, results,
  }, null, 2), { headers: { ...CORS, 'Content-Type': 'application/json' } });
}

if (import.meta.main) Deno.serve(handler);
