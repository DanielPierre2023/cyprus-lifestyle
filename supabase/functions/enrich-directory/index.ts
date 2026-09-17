// Cyprus Lifestyle — enrich-directory (Deno edge function)
// Batched enrichment for directory_listings AND events (Agenda). Per row:
//   • Google Places (New) text search → real photo (+ website/phone for directory)
//   • Photo: download the Places photo OR the page's og:image (logos rejected)
//     and self-host it in Supabase Storage; store attribution in image_credit
//   • directory only: verify the website + extract a public email (never guessed)
// Drain-forward via enriched_at. Best-effort per row. No SDK import (pure fetch).
//
// Secrets: GOOGLE_PLACES_API_KEY, ENRICH_SECRET  (+ auto SUPABASE_URL / SERVICE_ROLE)
// One-time: create a PUBLIC Storage bucket named "listings".
//
// Run: /functions/v1/enrich-directory?key=SECRET&entity=directory&limit=10
//   entity = directory (default) | events
//   optional: &redo=1  &imagesOnly=1  &contactsOnly=1   (contacts apply to directory only)

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PLACES_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY') || '';
const ENRICH_SECRET = Deno.env.get('ENRICH_SECRET') || '';
const BUCKET = Deno.env.get('ENRICH_BUCKET') || 'listings';

const GENERIC_LOCAL = ['info', 'contact', 'reservations', 'bookings', 'sales', 'hello', 'office', 'enquiries', 'enquiry', 'admin', 'reception'];
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// ── entity config ───────────────────────────────────────────────────────────
interface EntityCfg { table: string; nameField: string; select: string; imageFirst: 'places' | 'website'; contacts: boolean }
const ENTITIES: Record<string, EntityCfg> = {
  directory: { table: 'directory_listings', nameField: 'name_en', select: 'id,slug,name_en,district,url,email,image,phone', imageFirst: 'places', contacts: true },
  events: { table: 'events', nameField: 'title_en', select: 'id,slug,title_en,venue,district,url,source_url,image', imageFirst: 'website', contacts: false },
};

// ── pure helpers (unit-tested) ──────────────────────────────────────────────
export function domainOf(url: string): string {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}
export function extractEmails(html: string): string[] {
  const set = new Set<string>();
  for (const m of (html.match(EMAIL_RE) || [])) {
    const e = m.toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(e)) continue;
    if (/(example\.com|sentry|wixpress|\.wixpress|domain\.com|email\.com|yourdomain|godaddy)/.test(e)) continue;
    if (/@\d/.test(e)) continue;
    set.add(e);
  }
  return [...set];
}
export function pickEmail(emails: string[], siteDomain: string): string | null {
  if (!emails.length) return null;
  const score = (e: string): number => {
    const [local, dom] = e.split('@');
    let s = 0;
    if (siteDomain && dom.endsWith(siteDomain)) s += 5;
    if (GENERIC_LOCAL.includes(local)) s += 3;
    if (/(gmail|yahoo|hotmail|outlook|icloud|mail\.ru|gmx)/.test(dom)) s -= 2;
    return s;
  };
  return [...emails].sort((a, b) => score(b) - score(a))[0] || null;
}
export function resolveUrl(src: string, base: string): string {
  try { return new URL(src, base).href; } catch { return src; }
}
export function extractOgImage(html: string, base: string): string | null {
  const pats = [
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  ];
  for (const re of pats) { const m = html.match(re); if (m?.[1]) return resolveUrl(m[1], base); }
  return null;
}
export function isLikelyLogo(url: string): boolean {
  const u = url.toLowerCase();
  return u.endsWith('.svg') || /logo|favicon|icon|placeholder|sprite/.test(u);
}

// ── REST + fetch helpers ────────────────────────────────────────────────────
function rest(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}
async function timedFetch(url: string, ms = 9000, init: RequestInit = {}): Promise<Response | null> {
  try { return await fetch(url, { ...init, signal: AbortSignal.timeout(ms) }); } catch { return null; }
}

// ── Places (New) ────────────────────────────────────────────────────────────
interface PlaceHit { websiteUri?: string; internationalPhoneNumber?: string; photoName?: string; photoAttr?: string }
async function placesLookup(query: string): Promise<PlaceHit | null> {
  if (!PLACES_KEY || !query.trim()) return null;
  const res = await timedFetch('https://places.googleapis.com/v1/places:searchText', 12000, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.internationalPhoneNumber,places.photos',
    },
    body: JSON.stringify({ textQuery: query, regionCode: 'CY', maxResultCount: 1 }),
  });
  if (!res || !res.ok) return null;
  const j = await res.json().catch(() => null) as { places?: Array<Record<string, unknown>> } | null;
  const p = j?.places?.[0];
  if (!p) return null;
  const photo = (p.photos as Array<Record<string, unknown>> | undefined)?.[0];
  const attr = (photo?.authorAttributions as Array<{ displayName?: string }> | undefined)?.[0]?.displayName;
  return {
    websiteUri: p.websiteUri as string | undefined,
    internationalPhoneNumber: p.internationalPhoneNumber as string | undefined,
    photoName: photo?.name as string | undefined,
    photoAttr: attr ? `Photo: ${attr} / Google` : (photo ? 'Photo: Google' : undefined),
  };
}

type ImgData = { buf: ArrayBuffer; ct: string };
async function placesPhotoBytes(photoName: string): Promise<ImgData | null> {
  const meta = await timedFetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1280&skipHttpRedirect=true&key=${PLACES_KEY}`, 12000);
  if (!meta || !meta.ok) return null;
  const j = await meta.json().catch(() => null) as { photoUri?: string } | null;
  if (!j?.photoUri) return null;
  return downloadImage(j.photoUri);
}
async function downloadImage(url: string): Promise<ImgData | null> {
  const res = await timedFetch(url, 12000);
  if (!res || !res.ok) return null;
  const ct = res.headers.get('content-type') || 'image/jpeg';
  if (!ct.startsWith('image/')) return null;
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 3000) return null;
  return { buf, ct };
}
async function uploadToStorage(entity: string, slug: string, buf: ArrayBuffer, ct: string): Promise<string | null> {
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
  const path = `${entity}/${slug}.${ext}`;
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': ct, 'x-upsert': 'true' },
    body: buf,
  }).catch(() => null);
  if (!up || !up.ok) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
async function ogImage(siteUrl: string): Promise<ImgData | null> {
  const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  const res = await timedFetch(base, 9000, { headers: { 'User-Agent': 'CyprusLifestyleBot/1.0' } });
  if (!res || !res.ok) return null;
  const html = await res.text().catch(() => '');
  const og = extractOgImage(html, base);
  if (!og || isLikelyLogo(og)) return null;
  return downloadImage(og);
}
async function findEmail(siteUrl: string): Promise<string | null> {
  const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  const dom = domainOf(base);
  const pages = [base, `${base.replace(/\/$/, '')}/contact`, `${base.replace(/\/$/, '')}/contact-us`];
  const found: string[] = [];
  for (const pg of pages) {
    const res = await timedFetch(pg, 9000, { headers: { 'User-Agent': 'CyprusLifestyleBot/1.0 (+directory enrichment)' } });
    if (!res || !res.ok) continue;
    found.push(...extractEmails(await res.text().catch(() => '')));
    if (found.some((e) => e.split('@')[1]?.endsWith(dom))) break;
  }
  return pickEmail(found, dom);
}

// ── per-row enrichment ──────────────────────────────────────────────────────
async function enrichRow(entity: string, cfg: EntityCfg, r: Record<string, unknown>, opts: { imagesOnly: boolean; contactsOnly: boolean }): Promise<Record<string, unknown>> {
  const patch: Record<string, unknown> = { enriched_at: new Date().toISOString() };
  let hits = 0;
  const name = String(r[cfg.nameField] || '');
  const district = (r.district as string) || null;
  const query = entity === 'events'
    ? [String(r.venue || name), district, 'Cyprus'].filter(Boolean).join(', ')
    : [name, district, 'Cyprus'].filter(Boolean).join(', ');
  const place = await placesLookup(query);
  const site = (r.url as string) || (r.source_url as string) || place?.websiteUri || null;

  if (cfg.contacts) {
    if (!r.url && place?.websiteUri) { patch.url = place.websiteUri; hits++; }
    if (!r.phone && place?.internationalPhoneNumber) { patch.phone = place.internationalPhoneNumber; hits++; }
  }

  if (!opts.contactsOnly && !r.image) {
    let img: ImgData | null = null;
    let credit: string | undefined;
    const tryWebsite = async () => { if (!img && site) { const g = await ogImage(site); if (g) { img = g; credit = entity === 'events' ? 'Photo: event page' : 'Photo: business website'; } } };
    const tryPlaces = async () => { if (!img && place?.photoName) { const p = await placesPhotoBytes(place.photoName); if (p) { img = p; credit = place.photoAttr; } } };
    if (cfg.imageFirst === 'website') { await tryWebsite(); await tryPlaces(); }
    else { await tryPlaces(); await tryWebsite(); }
    if (img) {
      const publicUrl = await uploadToStorage(entity, String(r.slug), (img as ImgData).buf, (img as ImgData).ct);
      if (publicUrl) { patch.image = publicUrl; patch.image_credit = credit; hits++; }
    }
  }

  if (cfg.contacts && !opts.imagesOnly && !r.email && site) {
    const email = await findEmail(site);
    if (email) { patch.email = email; hits++; }
  }

  patch.enrich_status = hits === 0 ? 'none' : ((patch.image || r.image) && (!cfg.contacts || patch.email || r.email) ? 'ok' : 'partial');
  return patch;
}

async function handler(req: Request): Promise<Response> {
  const u = new URL(req.url);
  if (ENRICH_SECRET && u.searchParams.get('key') !== ENRICH_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const entity = (u.searchParams.get('entity') || 'directory').toLowerCase();
  const cfg = ENTITIES[entity];
  if (!cfg) return new Response(JSON.stringify({ ok: false, error: 'entity must be directory or events' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

  const limit = Math.min(Math.max(Number(u.searchParams.get('limit') || 10), 1), 40);
  const redo = u.searchParams.get('redo') === '1';
  const imagesOnly = u.searchParams.get('imagesOnly') === '1';
  const contactsOnly = u.searchParams.get('contactsOnly') === '1';
  const filter = redo ? '' : '&enriched_at=is.null';

  const sel = await rest(`${cfg.table}?select=${cfg.select}&status=eq.published${filter}&order=${cfg.nameField}.asc&limit=${limit}`);
  if (!sel.ok) return new Response(JSON.stringify({ ok: false, error: `select ${sel.status}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  const rows = await sel.json() as Record<string, unknown>[];

  let updated = 0;
  const results: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    try {
      const patch = await enrichRow(entity, cfg, r, { imagesOnly, contactsOnly });
      const up = await rest(`${cfg.table}?id=eq.${r.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
      if (up.ok) { updated++; results.push({ name: r[cfg.nameField], status: patch.enrich_status, image: !!patch.image, email: patch.email || undefined, url: patch.url || undefined }); }
    } catch (e) { results.push({ name: r[cfg.nameField], error: String(e) }); }
  }

  const head = await rest(`${cfg.table}?select=id&status=eq.published&enriched_at=is.null`, { method: 'HEAD', headers: { Prefer: 'count=exact' } });
  const remaining = Number((head.headers.get('content-range') || '*/0').split('/')[1] || 0);

  return new Response(JSON.stringify({ ok: true, entity, processed: rows.length, updated, remaining, results }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

if (import.meta.main) Deno.serve(handler);
