// lib/directory/enrichment.ts
// ============================================================================
// "Complete every listing" — pure logic behind Admin → Directory → Complete listings
// (app/api/admin/directory/enrichment). Unit-tested; no I/O.
//
//   1. EXPORT  which businesses miss a photo, phone, email, website, opening hours or
//              social links → an Excel list (one row per business, current values
//              pre-filled, the gaps named) + a website list for the scraper.
//   2. IMPORT  read back what people / the scraper found (our "Fill in" sheet, or
//              Ultimate Web Scraper's Page / Email / Social-link exports as they come),
//              clean every value, match each row to a listing (slug → exact website →
//              website domain) and plan updates that ONLY FILL EMPTY FIELDS — nothing
//              already on file is ever overwritten.
// ============================================================================
import { cleanEmail, cleanPhone, safeUrl, photoList } from '@/lib/map/explorer-index';

export const NEED_KEYS = ['image', 'phone', 'email', 'website', 'hours', 'socials'] as const;
export type NeedKey = (typeof NEED_KEYS)[number];
export const NEED_LABEL: Record<NeedKey, string> = { image: 'photo', phone: 'phone', email: 'email', website: 'website', hours: 'opening hours', socials: 'social links' };

export const SOCIALS = ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin', 'x', 'whatsapp'] as const;
export type Social = (typeof SOCIALS)[number];
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
type Day = (typeof DAYS)[number];

/** The "Fill in" sheet: what we export and what the importer reads back. */
export const FILL_COLUMNS = [
  'slug', 'name', 'category', 'district', 'status', 'missing', 'website', 'phone', 'email', 'image_url',
  ...SOCIALS, ...DAYS.map((d) => `hours_${d}`), 'address', 'source_url', 'our_page', 'look_up',
] as const;

export interface ListingRow {
  slug: string; type?: string | null; status?: string | null; name_en?: string | null; canonical_category?: string | null;
  district?: string | null; address?: string | null; url?: string | null; phone?: string | null; email?: string | null;
  image?: string | null; gallery?: unknown; owned_photos?: unknown; socials?: unknown; hours?: unknown;
  rating_count?: number | string | null;
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const objOf = (v: unknown): Record<string, unknown> => {
  if (isObj(v)) return v;
  if (typeof v === 'string' && v.trim().startsWith('{')) { try { const o = JSON.parse(v); return isObj(o) ? o : {}; } catch { /* not JSON */ } }
  return {};
};
const hasHours = (v: unknown) => DAYS.some((d) => String(objOf(v)[d] ?? '').trim());
const hasSocial = (v: unknown) => Object.values(objOf(v)).some((x) => !!safeUrl(x));

/** What a listing is missing (of the fields guests use on the map popup). */
export function missingOf(r: ListingRow): NeedKey[] {
  const out: NeedKey[] = [];
  if (!photoList(r.image, r.owned_photos, r.gallery).length) out.push('image');
  if (!cleanPhone(r.phone)) out.push('phone');
  if (!cleanEmail(r.email)) out.push('email');
  if (!safeUrl(r.url)) out.push('website');
  if (!hasHours(r.hours)) out.push('hours');
  if (!hasSocial(r.socials)) out.push('socials');
  return out;
}

/** Work order: our own (published) pages first, then the places guests look at most, then rows with a website (scrapable). */
export function priorityOf(r: ListingRow): number {
  return (r.status === 'published' ? 1e6 : 0) + Math.min(99999, Number(r.rating_count) || 0) * 5 + (safeUrl(r.url) ? 3 : 0);
}

export const hostOf = (u: string | null | undefined): string => {
  const s = String(u || '').trim();
  if (!s) return '';
  try { return new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
};
// Hosts that are not a business's own website (a profile on a platform): never matched by
// domain, never sent to the scraper, never stored as "website".
const PLATFORM_HOST = /(^|\.)(facebook\.com|fb\.com|fb\.me|instagram\.com|tiktok\.com|youtube\.com|youtu\.be|linkedin\.com|x\.com|twitter\.com|wa\.me|whatsapp\.com|google\.[a-z.]+|goo\.gl|g\.page|maps\.app\.goo\.gl|linktr\.ee|booking\.com|tripadvisor\.[a-z.]+|airbnb\.[a-z.]+|business\.site|foursquare\.com|yelp\.[a-z.]+|wolt\.com|foody\.com\.cy|bolt\.eu|ubereats\.com)$/;
export const isOwnWebsite = (u: string | null | undefined) => { const h = hostOf(u); return !!h && !PLATFORM_HOST.test(h); };

/** Normalised URL for exact matching: host + path, no protocol / www / query / trailing slash. */
export const urlKey = (u: string | null | undefined): string => {
  const s = String(u || '').trim();
  if (!s) return '';
  try { const x = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); return `${x.hostname.replace(/^www\./, '').toLowerCase()}${x.pathname.replace(/\/+$/, '').toLowerCase()}`; } catch { return ''; }
};

/** One export row for the "Fill in" sheet (existing values pre-filled). */
export function exportRow(r: ListingRow, site = 'https://cypruslifestyle.eu'): Record<(typeof FILL_COLUMNS)[number], string> {
  const so = objOf(r.socials); const ho = objOf(r.hours);
  const name = String(r.name_en || r.slug);
  const row = {
    slug: r.slug, name, category: String(r.canonical_category || r.type || ''), district: String(r.district || ''),
    status: String(r.status || ''), missing: missingOf(r).map((k) => NEED_LABEL[k]).join(', '),
    website: safeUrl(r.url) || '', phone: String(r.phone || ''), email: String(r.email || ''),
    image_url: photoList(r.image, r.owned_photos, r.gallery)[0] || '',
    address: String(r.address || ''), source_url: '',
    our_page: r.status === 'published' ? `${site}/directory/${r.type || 'vendor'}/${r.slug}` : '',
    look_up: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([name, r.district, 'Cyprus'].filter(Boolean).join(', '))}`,
  } as Record<string, string>;
  for (const k of SOCIALS) row[k] = String(safeUrl(so[k] ?? (k === 'x' ? so.twitter : undefined)) || '');
  for (const d of DAYS) row[`hours_${d}`] = String(ho[d] ?? '');
  return row as Record<(typeof FILL_COLUMNS)[number], string>;
}

// ---- Import --------------------------------------------------------------------------
/** CSV / semicolon CSV (Excel in German, Greek …) / tab-separated → objects. */
export function parseDelimited(text: string): Record<string, string>[] {
  const s = text.replace(/^﻿/, '');
  const first = s.split(/\r?\n/, 1)[0] || '';
  const count = (ch: string) => first.split(ch).length - 1;
  const delim = [',', ';', '\t'].sort((a, b) => count(b) - count(a))[0];
  const rows: string[][] = []; let row: string[] = []; let field = ''; let q = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { field += '"'; i++; } else q = false; } else field += ch; }
    else if (ch === '"') q = true;
    else if (ch === delim) { row.push(field); field = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(field); field = ''; if (row.some((c) => c !== '')) rows.push(row); row = []; }
    else field += ch;
  }
  if (field !== '' || row.length) { row.push(field); if (row.some((c) => c !== '')) rows.push(row); }
  if (!rows.length) return [];
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, '');
const DAY_WORDS: Record<string, Day> = { mon: 'mon', monday: 'mon', tue: 'tue', tues: 'tue', tuesday: 'tue', wed: 'wed', wednesday: 'wed', thu: 'thu', thur: 'thu', thurs: 'thu', thursday: 'thu', fri: 'fri', friday: 'fri', sat: 'sat', saturday: 'sat', sun: 'sun', sunday: 'sun' };
const SCHEMA_DAY: Record<string, Day> = { mo: 'mon', tu: 'tue', we: 'wed', th: 'thu', fr: 'fri', sa: 'sat', su: 'sun' };
const SOCIAL_HOST: Record<Social, RegExp> = {
  instagram: /(^|\.)instagram\.com$/, facebook: /(^|\.)(facebook\.com|fb\.com|fb\.me)$/, tiktok: /(^|\.)tiktok\.com$/,
  youtube: /(^|\.)(youtube\.com|youtu\.be)$/, linkedin: /(^|\.)linkedin\.com$/, x: /(^|\.)(x\.com|twitter\.com)$/, whatsapp: /(^|\.)(wa\.me|whatsapp\.com)$/,
};
const SHARE_PATH = /\/(sharer|share|intent|dialog|plugins|login|hashtag|explore|p|reel|reels|stories|watch|shorts|status|search|tr)(\/|\?|$)|[?&](u|url|text)=/i;

/** A social profile link → the network it belongs to (share buttons, posts and logins are rejected). */
export function classifySocial(u: string): { k: Social; url: string } | null {
  const url = safeUrl(u.trim().replace(/^\/\//, 'https://'));
  if (!url) return null;
  let x: URL; try { x = new URL(url); } catch { return null; }
  const host = x.hostname.replace(/^www\.|^m\.|^mobile\./, '').toLowerCase();
  for (const k of SOCIALS) {
    if (!SOCIAL_HOST[k].test(host)) continue;
    if (k !== 'whatsapp' && (SHARE_PATH.test(x.pathname + x.search) || x.pathname.replace(/\/+$/, '') === '')) return null;
    return { k, url: `${x.protocol}//${x.hostname}${x.pathname.replace(/\/+$/, '')}` };
  }
  return null;
}

const GENERIC_LOCAL = /^(info|contact|hello|office|reservations?|bookings?|enquir(y|ies)|sales|reception|admin|mail)$/;
const JUNK_EMAIL = /(example\.|sentry|wixpress|domain\.com|yourdomain|email\.com$|@2x|\.(png|jpe?g|gif|webp|svg)$|noreply|no-reply|donotreply)/i;
/** Best email from a scraper cell ("a@x.cy, b@y.com"): same domain as the website first, generic inboxes first. */
export function pickEmail(cell: string, website?: string | null): string | null {
  const host = hostOf(website);
  const all = Array.from(new Set(String(cell || '').split(/[\s,;|]+/).map((e) => cleanEmail(e)).filter((e): e is string => !!e && !JUNK_EMAIL.test(e))));
  if (!all.length) return null;
  const score = (e: string) => { const [local, dom] = e.split('@'); return (host && (dom === host || dom.endsWith(`.${host}`) || host.endsWith(`.${dom}`)) ? 10 : 0) + (GENERIC_LOCAL.test(local) ? 3 : 0); };
  return all.sort((a, b) => score(b) - score(a))[0];
}

/** Best phone from a scraper cell: Cypriot numbers (+357 / 2x / 9x, 8 digits) first. */
export function pickPhone(cell: string): string | null {
  const parts = String(cell || '').split(/[,;|\n]+/).map((p) => cleanPhone(p.trim())).filter((p): p is string => !!p);
  if (!parts.length) return null;
  const digits = (p: string) => p.replace(/\D/g, '');
  const cy = (p: string) => /^(00357|357)?[29]\d{7}$/.test(digits(p));
  return parts.find(cy) || parts.find((p) => digits(p).length >= 8) || null;
}

/** An image URL that is a photo, not a logo / icon / tracking pixel. */
export function pickImage(cell: string): string | null {
  for (const raw of String(cell || '').split(/[\s,|]+/)) {
    const u = safeUrl(raw);
    if (!u) continue;
    if (/\.svg(\?|$)|logo|favicon|icon|sprite|placeholder|pixel|blank\.|spacer|avatar|gravatar|1x1/i.test(u)) continue;
    return u;
  }
  return null;
}

/** schema.org openingHours ("Mo-Fr 09:00-18:00", "Sa 10:00-14:00") or "Monday: 9 AM – 5 PM" lines → per day. */
export function parseOpeningHours(text: string): Partial<Record<Day, string>> {
  const out: Partial<Record<Day, string>> = {};
  const s = String(text || '').trim();
  if (!s) return out;
  // schema.org style
  for (const m of s.matchAll(/\b(Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(Mo|Tu|We|Th|Fr|Sa|Su))?((?:\s*,\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))*)\s+(\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}(?:\s*,\s*\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2})*)/g)) {
    const a = DAYS.indexOf(SCHEMA_DAY[m[1].toLowerCase()]); const b = m[2] ? DAYS.indexOf(SCHEMA_DAY[m[2].toLowerCase()]) : a;
    const days: Day[] = [];
    for (let i = a; ; i = (i + 1) % 7) { days.push(DAYS[i]); if (i === b) break; }
    for (const extra of (m[3] || '').split(',').map((x) => x.trim()).filter(Boolean)) days.push(SCHEMA_DAY[extra.toLowerCase()]);
    const t = m[4].replace(/\s*-\s*/g, '–').replace(/\s*,\s*/g, ', ');
    for (const d of days) out[d] = t;
  }
  if (Object.keys(out).length) return out;
  // "Monday: 09:00–17:00; Tuesday: Closed" (Google-style lines)
  for (const m of s.matchAll(/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s*[:\-–]\s*([^;\n|]+)/gi)) {
    out[DAY_WORDS[m[1].toLowerCase()]] = m[2].trim().slice(0, 40);
  }
  return out;
}

/** What one imported row offers, cleaned. Headers are matched loosely (our sheet, the scraper's exports, other tools). */
export interface Offer {
  slug: string | null; site: string | null; matchUrls: string[];
  website: string | null; phone: string | null; email: string | null; image: string | null;
  socials: Partial<Record<Social, string>>; hours: Partial<Record<Day, string>>; address: string | null;
}
export function offerFrom(raw: Record<string, string>): Offer {
  const cols = Object.entries(raw).map(([h, v]) => [norm(h), String(v ?? '').trim()] as const).filter(([, v]) => v);
  const pick = (test: (h: string) => boolean) => cols.filter(([h]) => test(h)).map(([, v]) => v);
  const slug = pick((h) => h === 'slug')[0] || null;
  const siteCells = pick((h) => ['website', 'url', 'seedurl', 'pageurl', 'homepage', 'web', 'site', 'link', 'domain', 'startingurl', 'inputurl'].includes(h));
  const canon = pick((h) => h.includes('canonical'));
  const site = siteCells.map((v) => safeUrl(/^https?:\/\//i.test(v) ? v : `https://${v}`)).find(Boolean) || null;
  const emailCell = pick((h) => h.includes('email') && !h.includes('count')).join(', ');
  const phoneCell = pick((h) => (h.includes('phone') || h === 'tel' || h === 'telephone' || h === 'mobile') && !h.includes('count')).join(', ');
  const imageCell = pick((h) => ['imageurl', 'image', 'ogimage', 'photo', 'picture', 'pagemetadataimage', 'metadataimage', 'metaimage', 'thumbnail'].includes(h) || h.endsWith('ogimage')).join(' ');
  const socials: Partial<Record<Social, string>> = {};
  for (const [h, v] of cols) {
    const isSocialCol = SOCIALS.some((k) => h.includes(k === 'x' ? 'twitter' : k)) || h === 'x' || h.includes('social');
    if (!isSocialCol && !/^https?:\/\/(www\.|m\.)?(instagram|facebook|fb|tiktok|youtube|youtu|linkedin|x|twitter|wa)\.(com|me|be)/i.test(v)) continue;
    for (const part of v.split(/[\s,;|]+/)) { const c = classifySocial(part); if (c && !socials[c.k]) socials[c.k] = c.url; }
  }
  const hours: Partial<Record<Day, string>> = {};
  for (const [h, v] of cols) {
    // "hours_mon" (our sheet) or a column simply called "Monday"
    const day = DAY_WORDS[h.replace(/^(hours|opening|open)/, '')];
    if (day && (h !== h.replace(/^(hours|opening|open)/, '') || DAY_WORDS[h])) hours[day] = v.slice(0, 40);
  }
  if (!Object.keys(hours).length) {
    const oh = pick((h) => h.includes('openinghours') || h === 'hours' || h === 'openinghoursspecification').join('; ');
    Object.assign(hours, parseOpeningHours(oh));
  }
  const address = pick((h) => h === 'address' || h === 'streetaddress' || h === 'fulladdress')[0] || null;
  return {
    slug, site, matchUrls: [...siteCells, ...canon],
    website: isOwnWebsite(site) ? site : null, phone: pickPhone(phoneCell), email: pickEmail(emailCell, site), image: pickImage(imageCell),
    socials, hours, address: address ? address.slice(0, 200) : null,
  };
}

export interface Patch { slug: string; fields: Record<string, unknown>; filled: string[] }
export interface ImportPlan {
  rows: number; matched: number; unmatched: number; noNews: number;
  patches: Patch[];
  filled: Record<string, number>;           // how many listings get each field
  unmatchedSamples: string[];
}

/**
 * Match offers to listings and keep only what fills an EMPTY field. A website shared by
 * several listings (a chain) only contributes email + social links, never one branch's
 * phone / photo / hours to all of them.
 */
export function planImport(offers: Offer[], listings: ListingRow[]): ImportPlan {
  const bySlug = new Map(listings.map((l) => [l.slug, l]));
  const byUrl = new Map<string, ListingRow[]>(); const byHost = new Map<string, ListingRow[]>();
  for (const l of listings) {
    const k = urlKey(l.url); const h = hostOf(l.url);
    if (k) byUrl.set(k, [...(byUrl.get(k) || []), l]);
    if (h && isOwnWebsite(l.url)) byHost.set(h, [...(byHost.get(h) || []), l]);
  }
  const acc = new Map<string, Patch>();
  const plan: ImportPlan = { rows: offers.length, matched: 0, unmatched: 0, noNews: 0, patches: [], filled: {}, unmatchedSamples: [] };
  for (const o of offers) {
    let targets: ListingRow[] = [];
    if (o.slug && bySlug.has(o.slug)) targets = [bySlug.get(o.slug)!];
    if (!targets.length) for (const u of o.matchUrls) { const t = byUrl.get(urlKey(u)); if (t?.length) { targets = t; break; } }
    if (!targets.length) for (const u of o.matchUrls) { if (!isOwnWebsite(u)) continue; const t = byHost.get(hostOf(u)); if (t?.length) { targets = t; break; } }
    if (!targets.length) { plan.unmatched++; if (plan.unmatchedSamples.length < 15) plan.unmatchedSamples.push(o.slug || o.matchUrls[0] || '(empty row)'); continue; }
    plan.matched++;
    const shared = targets.length > 1;
    let any = false;
    for (const l of targets) {
      const p = acc.get(l.slug) || { slug: l.slug, fields: {}, filled: [] };
      const set = (col: string, label: string, v: unknown) => { if (v == null || p.fields[col] !== undefined) return; p.fields[col] = v; p.filled.push(label); any = true; };
      if (!safeUrl(l.url) && o.website && !shared) set('url', 'website', o.website);
      if (!cleanEmail(l.email) && o.email) set('email', 'email', o.email);
      if (!shared && !cleanPhone(l.phone) && o.phone) set('phone', 'phone', o.phone);
      if (!shared && !photoList(l.image, l.owned_photos, l.gallery).length && o.image) set('image', 'photo', o.image);
      if (!shared && !hasHours(l.hours) && Object.keys(o.hours).length) set('hours', 'opening hours', o.hours);
      if (!shared && !String(l.address || '').trim() && o.address) set('address', 'address', o.address);
      const cur = objOf(l.socials); const add: Record<string, string> = {};
      for (const k of SOCIALS) if (o.socials[k] && !safeUrl(cur[k] ?? (k === 'x' ? cur.twitter : undefined))) add[k] = o.socials[k]!;
      if (Object.keys(add).length) {
        const prev = (p.fields.socials as Record<string, string> | undefined) || {};
        const merged = { ...cur, ...add, ...prev };
        if (p.fields.socials === undefined) p.filled.push('social links');
        p.fields.socials = merged; any = true;
      }
      if (Object.keys(p.fields).length) acc.set(l.slug, p);
    }
    if (!any) plan.noNews++;
  }
  plan.patches = [...acc.values()];
  for (const p of plan.patches) for (const f of new Set(p.filled)) plan.filled[f] = (plan.filled[f] || 0) + 1;
  return plan;
}
