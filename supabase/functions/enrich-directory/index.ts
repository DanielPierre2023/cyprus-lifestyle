// Cyprus Lifestyle — enrich-directory (Deno edge function)
// Batched enrichment for directory_listings. Per row:
//   • Google Places (New) text search  → real venue photo + website + phone
//   • Photo: download the Places photo (fallback: the site's og:image) and
//     self-host it in Supabase Storage; store attribution in image_credit
//   • Contacts: verify the website resolves, extract a public email from the
//     homepage + /contact — fill only confident finds, never guess
// Drain-forward: processes rows where enriched_at is null, sets enriched_at so
// repeated calls advance. Best-effort per row. NO SDK import (pure fetch) so it
// deno-checks cleanly and pastes straight into the dashboard.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   GOOGLE_PLACES_API_KEY   your Places API (New) key
//   ENRICH_SECRET           any random string; must be passed as ?key=...
//   (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically)
// One-time: create a PUBLIC Storage bucket named "listings".
//
// Run: POST/GET  /functions/v1/enrich-directory?key=ENRICH_SECRET&limit=10
//   optional: &redo=1 (reprocess even if enriched)  &contactsOnly=1  &imagesOnly=1

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const PLACES_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY') || '';
const ENRICH_SECRET = Deno.env.get('ENRICH_SECRET') || '';
const BUCKET = Deno.env.get('ENRICH_BUCKET') || 'listings';

const GENERIC_LOCAL = ['info', 'contact', 'reservations', 'bookings', 'sales', 'hello', 'office', 'enquiries', 'enquiry', 'admin', 'reception'];
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;

// ── pure helpers (unit-tested) ──────────────────────────────────────────────
export function domainOf(url: string): string {
  try { return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

export function extractEmails(html: string): string[] {
  const set = new Set<string>();
  for (const m of (html.match(EMAIL_RE) || [])) {
    const e = m.toLowerCase();
    if (/\.(png|jpg|jpeg|gif|webp|svg)$/.test(e)) continue;         // asset filenames like logo@2x.png
    if (/(example\.com|sentry|wixpress|\.wixpress|domain\.com|email\.com|yourdomain|godaddy)/.test(e)) continue;
    if (/@\d/.test(e)) continue;                                     // e.g. sprite@2x
    set.add(e);
  }
  return [...set];
}

export function pickEmail(emails: string[], siteDomain: string): string | null {
  if (!emails.length) return null;
  const score = (e: string): number => {
    const [local, dom] = e.split('@');
    let s = 0;
    if (siteDomain && dom.endsWith(siteDomain)) s += 5;             // same domain as the business
    if (GENERIC_LOCAL.includes(local)) s += 3;                       // role address
    if (/(gmail|yahoo|hotmail|outlook|icloud|mail\.ru|gmx)/.test(dom)) s -= 2; // personal mailbox
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

// ── REST helpers ────────────────────────────────────────────────────────────
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

async function placesLookup(name: string, district: string | null): Promise<PlaceHit | null> {
  if (!PLACES_KEY) return null;
  const textQuery = [name, district, 'Cyprus'].filter(Boolean).join(', ');
  const res = await timedFetch('https://places.googleapis.com/v1/places:searchText', 12000, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': PLACES_KEY,
      'X-Goog-FieldMask': 'places.id,places.displayName,places.websiteUri,places.internationalPhoneNumber,places.photos',
    },
    body: JSON.stringify({ textQuery, regionCode: 'CY', maxResultCount: 1 }),
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
  if (buf.byteLength < 3000) return null; // too tiny to be a real photo
  return { buf, ct };
}

async function uploadToStorage(slug: string, buf: ArrayBuffer, ct: string): Promise<string | null> {
  const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
  const path = `directory/${slug}.${ext}`;
  const up = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': ct, 'x-upsert': 'true' },
    body: buf,
  }).catch(() => null);
  if (!up || !up.ok) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

async function findEmail(siteUrl: string): Promise<string | null> {
  const base = siteUrl.startsWith('http') ? siteUrl : `https://${siteUrl}`;
  const dom = domainOf(base);
  const pages = [base, `${base.replace(/\/$/, '')}/contact`, `${base.replace(/\/$/, '')}/contact-us`];
  const found: string[] = [];
  for (const pg of pages) {
    const res = await timedFetch(pg, 9000, { headers: { 'User-Agent': 'CyprusLifestyleBot/1.0 (+directory enrichment)' } });
    if (!res || !res.ok) continue;
    const html = await res.text().catch(() => '');
    found.push(...extractEmails(html));
    if (found.some((e) => e.split('@')[1]?.endsWith(dom))) break; // good enough once we have a same-domain hit
  }
  return pickEmail(found, dom);
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

interface Row { id: string; slug: string; name_en: string; district: string | null; url: string | null; email: string | null; image: string | null; phone: string | null }

async function enrichRow(r: Row, opts: { imagesOnly: boolean; contactsOnly: boolean }): Promise<Record<string, unknown>> {
  const patch: Record<string, unknown> = { enriched_at: new Date().toISOString() };
  let hits = 0;
  const place = await placesLookup(r.name_en, r.district);

  // website + phone from Places (only when missing)
  const site = r.url || place?.websiteUri || null;
  if (!r.url && place?.websiteUri) { patch.url = place.websiteUri; hits++; }
  if (!r.phone && place?.internationalPhoneNumber) { patch.phone = place.internationalPhoneNumber; hits++; }

  // image
  if (!opts.contactsOnly && !r.image) {
    let img: ImgData | null = null;
    let credit: string | undefined;
    if (place?.photoName) { img = await placesPhotoBytes(place.photoName); credit = place.photoAttr; }
    if (!img && site) { img = await ogImage(site); credit = 'Photo: business website'; }
    if (img) {
      const publicUrl = await uploadToStorage(r.slug, img.buf, img.ct);
      if (publicUrl) { patch.image = publicUrl; patch.image_credit = credit; hits++; }
    }
  }

  // email
  if (!opts.imagesOnly && !r.email && site) {
    const email = await findEmail(site);
    if (email) { patch.email = email; hits++; }
  }

  patch.enrich_status = hits === 0 ? 'none' : (patch.image || (r.image) ) && (patch.email || r.email) ? 'ok' : 'partial';
  return patch;
}

async function handler(req: Request): Promise<Response> {
  const u = new URL(req.url);
  if (ENRICH_SECRET && u.searchParams.get('key') !== ENRICH_SECRET) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }
  const limit = Math.min(Math.max(Number(u.searchParams.get('limit') || 10), 1), 40);
  const redo = u.searchParams.get('redo') === '1';
  const imagesOnly = u.searchParams.get('imagesOnly') === '1';
  const contactsOnly = u.searchParams.get('contactsOnly') === '1';

  const filter = redo ? '' : '&enriched_at=is.null';
  const sel = await rest(`directory_listings?select=id,slug,name_en,district,url,email,image,phone&status=eq.published${filter}&order=name_en.asc&limit=${limit}`);
  if (!sel.ok) return new Response(JSON.stringify({ ok: false, error: `select ${sel.status}` }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  const rows = await sel.json() as Row[];

  let updated = 0;
  const results: Array<Record<string, unknown>> = [];
  for (const r of rows) {
    try {
      const patch = await enrichRow(r, { imagesOnly, contactsOnly });
      const up = await rest(`directory_listings?id=eq.${r.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(patch) });
      if (up.ok) { updated++; results.push({ name: r.name_en, status: patch.enrich_status, image: !!patch.image, email: patch.email || null, url: patch.url || null }); }
    } catch (e) { results.push({ name: r.name_en, error: String(e) }); }
  }

  // how many still to go
  const head = await rest(`directory_listings?select=id&status=eq.published&enriched_at=is.null`, { method: 'HEAD', headers: { Prefer: 'count=exact' } });
  const remaining = Number((head.headers.get('content-range') || '*/0').split('/')[1] || 0);

  return new Response(JSON.stringify({ ok: true, processed: rows.length, updated, remaining, results }, null, 2), { headers: { 'Content-Type': 'application/json' } });
}

if (import.meta.main) Deno.serve(handler);
