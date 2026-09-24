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
const UNSPLASH_KEY = Deno.env.get('UNSPLASH_ACCESS_KEY') || '';

const GENERIC_LOCAL = ['info', 'contact', 'reservations', 'bookings', 'sales', 'hello', 'office', 'enquiries', 'enquiry', 'admin', 'reception'];
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// ── entity config ───────────────────────────────────────────────────────────
interface EntityCfg { table: string; nameField: string; select: string; imageFirst: 'places' | 'website'; contacts: boolean }
const ENTITIES: Record<string, EntityCfg> = {
  directory: { table: 'directory_listings', nameField: 'name_en', select: 'id,slug,type,name_en,district,url,email,image,phone,summary_en,rating', imageFirst: 'places', contacts: true },
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
  return u.endsWith('.svg') || /logo|favicon|icon|placeholder|sprite|watermark|brandmark/.test(u);
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
interface PlaceReview { author?: string; rating?: number; text?: string; when?: string }
interface PlaceHit { websiteUri?: string; internationalPhoneNumber?: string; photoName?: string; photoAttr?: string; rating?: number; ratingCount?: number; editorial?: string; primaryType?: string; reviews?: PlaceReview[] }
async function placesLookup(query: string, wantReviews = false): Promise<PlaceHit | null> {
  if (!PLACES_KEY || !query.trim()) return null;
  // photos already put this call in the top field-mask tier, so rating/editorialSummary/
  // primaryType ride it for free. `places.reviews` is Google's pricier Atmosphere SKU, so
  // it's only requested when explicitly asked for (&reviews=1) — the stall fix never needs it.
  const mask = 'places.id,places.displayName,places.websiteUri,places.internationalPhoneNumber,places.photos,places.rating,places.userRatingCount,places.editorialSummary,places.primaryTypeDisplayName,places.businessStatus'
    + (wantReviews ? ',places.reviews' : '');
  const res = await timedFetch('https://places.googleapis.com/v1/places:searchText', 12000, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': PLACES_KEY, 'X-Goog-FieldMask': mask },
    body: JSON.stringify({ textQuery: query, regionCode: 'CY', maxResultCount: 1 }),
  });
  if (!res || !res.ok) return null;
  const j = await res.json().catch(() => null) as { places?: Array<Record<string, unknown>> } | null;
  const p = j?.places?.[0];
  if (!p) return null;
  const photo = (p.photos as Array<Record<string, unknown>> | undefined)?.[0];
  const attr = (photo?.authorAttributions as Array<{ displayName?: string }> | undefined)?.[0]?.displayName;
  const ed = (p.editorialSummary as { text?: string } | undefined)?.text;
  const pt = (p.primaryTypeDisplayName as { text?: string } | undefined)?.text;
  let reviews: PlaceReview[] | undefined;
  if (wantReviews) {
    const rv = (p.reviews as Array<Record<string, unknown>> | undefined) || [];
    reviews = rv.slice(0, 5).map((x) => ({
      author: (x.authorAttribution as { displayName?: string } | undefined)?.displayName,
      rating: typeof x.rating === 'number' ? x.rating : undefined,
      text: ((((x.text as { text?: string } | undefined)?.text) || ((x.originalText as { text?: string } | undefined)?.text) || '')).replace(/\s+/g, ' ').trim().slice(0, 600),
      when: x.relativePublishTimeDescription as string | undefined,
    })).filter((r) => r.text);
    if (!reviews.length) reviews = undefined;
  }
  return {
    websiteUri: p.websiteUri as string | undefined,
    internationalPhoneNumber: p.internationalPhoneNumber as string | undefined,
    photoName: photo?.name as string | undefined,
    photoAttr: attr ? `Photo: ${attr} / Google` : (photo ? 'Photo: Google' : undefined),
    rating: typeof p.rating === 'number' ? p.rating : undefined,
    ratingCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : undefined,
    editorial: ed && ed.trim() ? ed.trim() : undefined,
    primaryType: pt && pt.trim() ? pt.trim() : undefined,
    reviews,
  };
}

// A clean, factual one-liner when Google has no editorial summary — never invented
// marketing, just what the place verifiably is and where. e.g. "Seafood restaurant
// in Paphos." Uses Google's own primary type when available, else our category noun.
const TYPE_NOUN: Record<string, string> = {
  restaurant: 'Restaurant', winery: 'Winery', hotel: 'Hotel',
  beach: 'Beach', development: 'Property development', vendor: 'Local business',
};
function titleCase(s: string): string { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
export function composedSummary(entityType: string, primaryType: string | undefined, district: string | null): string {
  const noun = (primaryType && primaryType.trim()) || TYPE_NOUN[entityType] || 'Local business';
  const where = district ? ` in ${titleCase(district)}` : ' in Cyprus';
  return `${noun}${where}.`;
}

type ImgData = { buf: ArrayBuffer; ct: string };
async function placesPhotoBytes(photoName: string): Promise<ImgData | null> {
  const meta = await timedFetch(`https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1280&skipHttpRedirect=true&key=${PLACES_KEY}`, 12000);
  if (!meta || !meta.ok) return null;
  const j = await meta.json().catch(() => null) as { photoUri?: string } | null;
  if (!j?.photoUri) return null;
  return downloadImage(j.photoUri);
}
const MAX_IMG_BYTES = 5_000_000; // 5 MB — larger is almost always a mistake and risks the worker's memory (a cause of the 546 stalls)
async function downloadImage(url: string): Promise<ImgData | null> {
  const res = await timedFetch(url, 12000);
  if (!res || !res.ok) return null;
  const ct = res.headers.get('content-type') || 'image/jpeg';
  if (!ct.startsWith('image/')) return null;
  const len = Number(res.headers.get('content-length') || 0);
  if (len && len > MAX_IMG_BYTES) { try { await res.body?.cancel(); } catch { /* ignore */ } return null; } // skip oversized before buffering
  const buf = await res.arrayBuffer();
  if (buf.byteLength < 3000 || buf.byteLength > MAX_IMG_BYTES) return null;
  return { buf, ct };
}
let LAST_UPLOAD_ERR = '';
async function uploadToStorage(entity: string, slug: string, buf: ArrayBuffer, ct: string): Promise<string | null> {
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
  // slugs are ASCII-hyphen already, but guard the storage key against stray chars
  const safe = String(slug || 'x').toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '') || 'x';
  const path = `${entity}/${safe}.${ext}`;
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    // apikey is REQUIRED by the Supabase API gateway for storage writes — without
    // it every upload is rejected before it reaches storage (the bug that made all
    // downloads get silently discarded). Authorization alone is not enough.
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': ct, 'x-upsert': 'true' },
    body: buf,
  }).catch((e) => { LAST_UPLOAD_ERR = 'throw ' + String(e).slice(0, 80); return null; });
  if (!up) return null;
  if (!up.ok) { LAST_UPLOAD_ERR = up.status + ' ' + (await up.text().catch(() => '')).slice(0, 120); return null; }
  LAST_UPLOAD_ERR = '';
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}
const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

// Ordered list of real-photo candidates from a page: social preview images first
// (og:image / twitter:image / link image_src / JSON-LD image), then the biggest-
// looking content <img> (uploads/media/gallery/hero), skipping logos, icons, svg,
// data-URIs, spacers. This is what makes "download the website photography" work.
export function siteImageCandidates(html: string, base: string): string[] {
  const out: string[] = [];
  const add = (u?: string | null) => { if (u) { const r = resolveUrl(u.replace(/&amp;/g, '&'), base); if (r && !out.includes(r)) out.push(r); } };
  const meta = (re: RegExp) => html.match(re)?.[1];
  add(meta(/<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i));
  add(meta(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i));
  add(meta(/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i));
  add(meta(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i));
  for (const m of html.matchAll(/"image"\s*:\s*"([^"]+\.(?:jpe?g|png|webp)[^"]*)"/gi)) add(m[1]);
  const SKIP = /logo|favicon|icon|sprite|placeholder|avatar|badge|flag|spacer|pixel|spinner|loader|blank|1x1|data:image/i;
  for (const m of html.matchAll(/<img[^>]+(?:data-src|data-lazy-src|data-original|src)=["']([^"']+)["']/gi)) {
    const src = m[1];
    if (!src || /^data:/i.test(src) || /\.svg(\?|$)/i.test(src) || SKIP.test(src)) continue;
    if (/\.(jpe?g|png|webp)(\?|$)/i.test(src) || /\/(uploads|media|images?|img|photos?|gallery|wp-content|assets)\//i.test(src)) add(src);
  }
  return out.slice(0, 15);
}

// Fetch a business/event site and self-host its best real photo. Tries each
// candidate until one is a genuine photo (>9KB skips small logos/icons).
async function websiteImage(siteUrl: string): Promise<{ data: ImgData; src: string } | null> {
  const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  const res = await timedFetch(base, 9000, { headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml' } });
  if (!res || !res.ok) return null;
  const html = await res.text().catch(() => '');
  for (const cand of siteImageCandidates(html, base)) {
    if (isLikelyLogo(cand)) continue;
    const img = await downloadImage(cand);
    if (img && img.buf.byteLength > 9000) return { data: img, src: cand };
  }
  return null;
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

// Unsplash fallback — a tasteful, license-clean, ATTRIBUTED representative photo
// so events (and, if you opt in, listings) are never blank. Uses your existing
// UNSPLASH_ACCESS_KEY. We store the Unsplash CDN url directly (hotlinking is what
// Unsplash intends), so this needs no Storage upload.
export function eventQuery(title: string, district: string | null): string {
  const t = (title || '').toLowerCase();
  const map: [RegExp, string][] = [
    [/wine|grape|vineyard/, 'wine festival'], [/medieval/, 'medieval festival'],
    [/jazz|music|concert|philharmon|symphony/, 'music concert'], [/film|cinema/, 'film festival'],
    [/art|paint|sculpt|galler|exhibition/, 'art exhibition'], [/dance|ballet/, 'dance performance'],
    [/theatre|theater|drama|perform|fringe/, 'theatre stage'], [/food|gastronom|culinary|taste/, 'food festival'],
    [/carnival/, 'carnival celebration'], [/book|literature/, 'book fair'], [/flower|anthestiria/, 'flower festival'],
  ];
  for (const [re, kw] of map) if (re.test(t)) return `${kw} Cyprus`;
  return `${district ? district + ' ' : ''}Cyprus festival celebration`;
}
async function unsplashImage(query: string): Promise<{ url: string; credit: string } | null> {
  if (!UNSPLASH_KEY || !query.trim()) return null;
  const res = await timedFetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&content_filter=high`, 9000, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });
  if (!res || !res.ok) return null;
  const j = await res.json().catch(() => null) as { results?: Array<{ urls?: { regular?: string }; user?: { name?: string } }> } | null;
  const p = j?.results?.[0];
  if (!p?.urls?.regular) return null;
  return { url: p.urls.regular, credit: `Photo: ${p.user?.name || 'Unsplash'} / Unsplash` };
}

// ── per-row enrichment ──────────────────────────────────────────────────────
async function enrichRow(entity: string, cfg: EntityCfg, r: Record<string, unknown>, opts: { imagesOnly: boolean; contactsOnly: boolean; stock: boolean; wantReviews: boolean }): Promise<Record<string, unknown>> {
  const patch: Record<string, unknown> = { enriched_at: new Date().toISOString() };
  let hits = 0;
  const name = String(r[cfg.nameField] || '');
  const district = (r.district as string) || null;
  const query = entity === 'events'
    ? [String(r.venue || name), district, 'Cyprus'].filter(Boolean).join(', ')
    : [name, district, 'Cyprus'].filter(Boolean).join(', ');
  // Lazy Places lookup: only spend a Places call when we actually need a website,
  // phone or photo we don't already have. A listing that already has a URL costs
  // ZERO Places calls — we go straight to its website for the photo.
  let placeChecked = false;
  let place: PlaceHit | null = null;
  const getPlace = async (): Promise<PlaceHit | null> => { if (!placeChecked) { placeChecked = true; place = await placesLookup(query, opts.wantReviews); } return place; };

  if (cfg.contacts) {
    if (!r.url) { const p = await getPlace(); if (p?.websiteUri) { patch.url = p.websiteUri; hits++; } }
    if (!r.phone) { const p = await getPlace(); if (p?.internationalPhoneNumber) { patch.phone = p.internationalPhoneNumber; hits++; } }
  }

  const site = (r.url as string) || (r.source_url as string) || (patch.url as string) || null;

  if (!opts.contactsOnly && !r.image) {
    let img: ImgData | null = null;
    let credit: string | undefined;
    const tryPlaces = async () => { if (!img) { const p = await getPlace(); if (p?.photoName) { const pb = await placesPhotoBytes(p.photoName); if (pb) { img = pb; credit = p.photoAttr; } } } };
    const tryWebsite = async () => { if (!img && site) { const w = await websiteImage(site); if (w) { img = w.data; credit = entity === 'events' ? 'Photo: event page' : 'Photo: business website'; } } };
    // Directory: REAL Google Places photo of the place first (avoids grabbing a
    // site's og:image, which is often just the company logo — e.g. 360 Nicosia →
    // Cyfield logo); the business website is a non-logo fallback. Events: the
    // event page first (posters), Places as backup.
    if (cfg.imageFirst === 'website') { await tryWebsite(); await tryPlaces(); }
    else { await tryPlaces(); await tryWebsite(); }
    if (img) {
      const publicUrl = await uploadToStorage(entity, String(r.slug), (img as ImgData).buf, (img as ImgData).ct);
      if (publicUrl) { patch.image = publicUrl; patch.image_credit = credit; hits++; }
    }
    // 3) Unsplash theme fallback: always for events; directory only with &stock=1
    if (!patch.image) {
      const q = entity === 'events' ? eventQuery(name, district) : (opts.stock ? `${(r.type as string) || ''} ${district || ''} Cyprus`.trim() : '');
      if (q) { const us = await unsplashImage(q); if (us) { patch.image = us.url; patch.image_credit = us.credit; hits++; } }
    }
  }

  if (cfg.contacts && !opts.imagesOnly && !r.email && site) {
    const email = await findEmail(site);
    if (email) { patch.email = email; hits++; }
  }

  // Description + rating (directory only). Google's editorial summary when it has
  // one (accurate, authoritative); otherwise a clean factual line. Never overwrites
  // an editor's existing description.
  if (cfg.contacts) {
    const p = await getPlace();
    if (!r.summary_en) { patch.summary_en = (p?.editorial) || composedSummary(String(r.type || ''), p?.primaryType, district); hits++; }
    if (p?.rating != null && r.rating == null) { patch.rating = p.rating; if (p.ratingCount != null) patch.rating_count = p.ratingCount; }
    if (opts.wantReviews && p?.reviews && p.reviews.length) { patch.reviews = p.reviews; hits++; } // Google review snippets → jsonb (0111)
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
  const stock = u.searchParams.get('stock') === '1';
  const wantReviews = u.searchParams.get('reviews') === '1'; // opt-in: fetch+store Google review snippets (pricier SKU)
  const retry = u.searchParams.get('retry') === '1';         // re-run rows parked at enrich_status processing/error

  // ── diagnostics: ?debug=<name substring> — inspects ONE listing, writes nothing,
  // and reports exactly what the edge sees so we can tell why a photo is missing.
  const dbg = u.searchParams.get('debug');
  if (dbg) {
    const dsel = await rest(`${cfg.table}?select=${cfg.select}&status=eq.published&${cfg.nameField}=ilike.*${encodeURIComponent(dbg)}*&limit=1`);
    const drow = ((await dsel.json().catch(() => [])) as Record<string, unknown>[])[0];
    if (!drow) return new Response(JSON.stringify({ debug: 'no match for ' + dbg }), { headers: { 'Content-Type': 'application/json' } });
    const nm = String(drow[cfg.nameField] || '');
    const dist = (drow.district as string) || null;
    const q = [nm, dist, 'Cyprus'].filter(Boolean).join(', ');
    const out: Record<string, unknown> = { name: nm, existing_url: drow.url || null };
    const pl = await placesLookup(q);
    out.places = pl ? { website: pl.websiteUri || null, hasPhoto: !!pl.photoName, photoName: (pl.photoName || '').slice(0, 70) } : 'no place match';
    if (pl?.photoName) { const pb = await placesPhotoBytes(pl.photoName); out.placesPhotoDownload = pb ? { ok: true, bytes: pb.buf.byteLength, ct: pb.ct } : { ok: false }; }
    const site = (drow.url as string) || pl?.websiteUri || null;
    if (site) {
      const base = site.startsWith('http') ? site : `https://${site}`;
      const res = await timedFetch(base, 9000, { headers: { 'User-Agent': BROWSER_UA, Accept: 'text/html,application/xhtml+xml' } });
      const w: Record<string, unknown> = { url: base, status: res ? res.status : 'fetch-failed' };
      if (res && res.ok) {
        const html = await res.text().catch(() => '');
        const cands = siteImageCandidates(html, base);
        w.bytes = html.length; w.candidates = cands.slice(0, 5);
        if (cands[0]) { const im = await downloadImage(cands[0]); w.firstDownload = im ? { ok: true, bytes: im.buf.byteLength, ct: im.ct } : { ok: false }; }
      }
      out.website = w;
    }
    // prove the Storage upload works now (writes one probe file, reports the result)
    let testImg: ImgData | null = null;
    if (pl?.photoName) testImg = await placesPhotoBytes(pl.photoName);
    if (!testImg && site) { const w = await websiteImage(site.startsWith('http') ? site : `https://${site}`); if (w) testImg = w.data; }
    if (testImg) { const url = await uploadToStorage('debugtest', `probe-${Date.now()}`, testImg.buf, testImg.ct); out.uploadTest = url ? { ok: true, url } : { ok: false, error: LAST_UPLOAD_ERR }; }
    return new Response(JSON.stringify(out, null, 2), { headers: { 'Content-Type': 'application/json' } });
  }

  const filter = redo ? '' : (retry ? '&enrich_status=in.(processing,error)' : '&enriched_at=is.null');
  const isJunk = (nm: string) => /^\d+$/.test(nm.trim()) || /\[closed\]/i.test(nm); // numeric codes + closed places

  const sel = await rest(`${cfg.table}?select=${cfg.select}&status=eq.published${filter}&order=${cfg.nameField}.asc&limit=${limit}`);
  if (!sel.ok) return new Response(JSON.stringify({ ok: false, error: `select ${sel.status}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  const rows = await sel.json() as Record<string, unknown>[];

  let updated = 0;
  let stoppedEarly = false;
  // Hard per-invocation time budget. Each row is committed as it finishes, so
  // returning early loses nothing — the next cron call picks up where we stopped.
  // This is what makes the drain unstallable: it can never run long enough for the
  // platform to kill the worker mid-batch (the 546 that used to freeze the queue).
  const DEADLINE = Date.now() + 40000;
  const results: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    if (Date.now() > DEADLINE) { stoppedEarly = true; break; }
    const nm = String(r[cfg.nameField] || '');
    // Cheaply drain junk directory rows (numeric import codes, [CLOSED]) — no API spend.
    if (entity === 'directory' && isJunk(nm)) {
      await rest(`${cfg.table}?id=eq.${r.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ enriched_at: new Date().toISOString(), enrich_status: 'skipped' }) });
      updated++; results.push({ name: nm, status: 'skipped' }); continue;
    }
    // CLAIM the row up-front: set enriched_at NOW so a throw — or a platform worker-kill
    // (the 546) mid-row — can never re-block the queue. The heavy work runs after; if it
    // dies, this row is already out of the `enriched_at is null` selection, so the next
    // call moves on instead of re-reading the same poison row forever (the 1,683 stall).
    // A row left at enrich_status='processing' is the retry signal (&retry=1).
    await rest(`${cfg.table}?id=eq.${r.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ enriched_at: new Date().toISOString(), enrich_status: 'processing' }) }).catch(() => {});
    try {
      // Hard per-row cap so one slow/poison row can't run long enough to get the worker killed.
      const patch = await Promise.race([
        enrichRow(entity, cfg, r, { imagesOnly, contactsOnly, stock, wantReviews }),
        new Promise<Record<string, unknown>>((_, rej) => setTimeout(() => rej(new Error('row-timeout')), 32000)),
      ]);
      const up = await rest(`${cfg.table}?id=eq.${r.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
      if (up.ok) { updated++; results.push({ name: nm, status: patch.enrich_status, image: !!patch.image, email: patch.email || undefined, url: patch.url || undefined }); }
      else results.push({ name: nm, error: `patch ${up.status}` });
    } catch (e) {
      // already claimed (enriched_at set) — mark it a retry candidate and move on
      await rest(`${cfg.table}?id=eq.${r.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ enrich_status: 'error' }) }).catch(() => {});
      results.push({ name: nm, error: String(e).slice(0, 80) });
    }
  }

  const head = await rest(`${cfg.table}?select=id&status=eq.published&enriched_at=is.null`, { method: 'HEAD', headers: { Prefer: 'count=exact' } });
  const remaining = Number((head.headers.get('content-range') || '*/0').split('/')[1] || 0);

  return new Response(JSON.stringify({ ok: true, entity, processed: updated, fetched: rows.length, stoppedEarly, remaining, results }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

if (import.meta.main) Deno.serve(handler);
