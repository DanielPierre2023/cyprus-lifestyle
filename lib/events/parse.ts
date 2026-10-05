// lib/events/parse.ts — pure parsers for the structured formats the registry uses. No network, no Node-only APIs.
// Each returns RawEvent[] (loose strings) which normalise.ts then validates and converts.
import type { RawEvent } from './types';

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', euro: '€',
};
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const n = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}
/** HTML (possibly double-escaped, as some WordPress plugins emit) -> plain text. */
export function htmlToText(input: unknown): string {
  let s = String(input ?? '');
  if (!s) return '';
  s = decodeEntities(s);
  s = s.replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n').replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s).replace(/\\n/g, '\n');
  return s.replace(/[ \t ]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}
const oneLine = (s: unknown) => htmlToText(s).replace(/\s+/g, ' ').trim();
const str = (v: unknown): string | null => { const s = typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : ''; return s || null; };

// ── WordPress "The Events Calendar" REST API ─────────────────────────────────────────────────────────────
interface TribeEvent {
  id?: number; title?: string; description?: string; url?: string; all_day?: boolean; start_date?: string; end_date?: string; cost?: string;
  image?: { url?: string } | false; categories?: { name?: string }[]; status?: string; website?: string;
  venue?: { venue?: string; address?: string; city?: string; geo_lat?: number | string; geo_lng?: number | string } | []; organizer?: { organizer?: string }[] | { organizer?: string };
}
export function parseTribe(json: string): RawEvent[] {
  let d: { events?: TribeEvent[] };
  try { d = JSON.parse(json); } catch { return []; }
  const out: RawEvent[] = [];
  for (const e of d.events || []) {
    const title = oneLine(e.title);
    if (!title || !e.start_date) continue;
    const venue = e.venue && !Array.isArray(e.venue) ? e.venue : null;
    const org = Array.isArray(e.organizer) ? e.organizer[0]?.organizer : (e.organizer as { organizer?: string } | undefined)?.organizer;
    const lat = venue?.geo_lat != null ? Number(venue.geo_lat) : null, lng = venue?.geo_lng != null ? Number(venue.geo_lng) : null;
    out.push({
      uid: String(e.url || e.id || `${title}|${e.start_date}`),
      title, description: htmlToText(e.description) || null,
      start: e.all_day ? e.start_date.slice(0, 10) : e.start_date,
      end: e.end_date ? (e.all_day ? e.end_date.slice(0, 10) : e.end_date) : null,
      allDay: !!e.all_day, url: str(e.url), image: e.image && typeof e.image === 'object' ? str(e.image.url) : null,
      venue: oneLine(venue?.venue) || null, address: oneLine(venue?.address) || null, city: oneLine(venue?.city) || null,
      lat: Number.isFinite(lat as number) ? lat : null, lng: Number.isFinite(lng as number) ? lng : null,
      price: str(e.cost), organizer: org ? oneLine(org) : null,
      categories: (e.categories || []).map((c) => oneLine(c.name)).filter(Boolean),
      cancelled: /cancel/i.test(String(e.status || '')),
    });
  }
  return out;
}

// ── iCalendar ────────────────────────────────────────────────────────────────────────────────────────────
function icalUnescape(s: string): string { return s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1'); }
export function parseIcal(text: string): RawEvent[] {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const out: RawEvent[] = [];
  let cur: Record<string, { params: string; value: string }[]> | null = null;
  const first = (k: string) => cur?.[k]?.[0]?.value ?? null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') {
      if (cur) {
        const startRaw = cur['DTSTART']?.[0];
        const title = oneLine(icalUnescape(first('SUMMARY') || ''));
        if (startRaw && title) {
          const endRaw = cur['DTEND']?.[0];
          const dateOnly = /VALUE=DATE(?!-)/i.test(startRaw.params) || /^\d{8}$/.test(startRaw.value);
          const geo = (first('GEO') || '').split(';').map(Number);
          // iCal all-day DTEND is exclusive: make it the inclusive last day.
          let end: string | null = endRaw?.value ?? null;
          if (end && dateOnly && /^\d{8}$/.test(end)) { const d = new Date(Date.UTC(+end.slice(0, 4), +end.slice(4, 6) - 1, +end.slice(6, 8) - 1)); end = d.toISOString().slice(0, 10); }
          const attach = cur['ATTACH']?.find((a) => /^https?:/i.test(a.value))?.value ?? null;
          const org = cur['ORGANIZER']?.[0]?.params.match(/CN="?([^";:]+)"?/i)?.[1] ?? null;
          out.push({
            uid: first('UID') || first('URL') || `${title}|${startRaw.value}`,
            title, description: htmlToText(icalUnescape(first('DESCRIPTION') || '')) || null,
            start: startRaw.value, end, allDay: dateOnly, url: str(first('URL')), image: attach,
            venue: oneLine(icalUnescape(first('LOCATION') || '')) || null,
            lat: geo.length === 2 && geo.every(Number.isFinite) ? geo[0] : null, lng: geo.length === 2 && geo.every(Number.isFinite) ? geo[1] : null,
            organizer: org ? oneLine(org) : null,
            categories: (first('CATEGORIES') || '').split(',').map((c) => oneLine(icalUnescape(c))).filter(Boolean),
            cancelled: /CANCEL/i.test(first('STATUS') || ''),
          });
        }
      }
      cur = null; continue;
    }
    if (!cur) continue;
    const m = /^([A-Z][A-Z0-9-]*)((?:;[^:]*)?):(.*)$/.exec(line);
    if (m) (cur[m[1]] ||= []).push({ params: m[2], value: m[3] });
  }
  return out;
}

// ── schema.org Event JSON-LD ─────────────────────────────────────────────────────────────────────────────
const EVENT_TYPE = /^(?:[A-Za-z]*Event|Festival)$/;
function typeList(t: unknown): string[] { return (Array.isArray(t) ? t : [t]).filter((x): x is string => typeof x === 'string').map((x) => x.replace(/^.*[/#]/, '')); }
function ldBlocks(html: string): unknown[] {
  const out: unknown[] = [];
  for (const m of html.matchAll(/<script[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi)) {
    const raw = m[1].trim();
    if (!raw) continue;
    try { out.push(JSON.parse(raw)); continue; } catch { /* fall through */ }
    try { out.push(JSON.parse(raw.replace(/[\u0000-\u001f]+/g, ' '))); } catch { /* unparseable block: ignore */ }
  }
  return out;
}
function* walk(node: unknown): Generator<Record<string, unknown>> {
  if (Array.isArray(node)) { for (const n of node) yield* walk(n); return; }
  if (!node || typeof node !== 'object') return;
  const o = node as Record<string, unknown>;
  yield o;
  if (o['@graph']) yield* walk(o['@graph']);
  if (o['itemListElement']) yield* walk(o['itemListElement']);
  if (o['item'] && typeof o['item'] === 'object') yield* walk(o['item']);
}
const imgOf = (v: unknown): string | null => {
  if (!v) return null;
  if (typeof v === 'string') return str(v);
  if (Array.isArray(v)) return imgOf(v[0]);
  if (typeof v === 'object') return str((v as Record<string, unknown>).url);
  return null;
};
function priceOf(offers: unknown, free: unknown): string | null {
  if (free === true) return 'Free';
  const o = (Array.isArray(offers) ? offers : [offers]).find((x) => x && typeof x === 'object') as Record<string, unknown> | undefined;
  if (!o) return null;
  const p = o.price ?? o.lowPrice;
  if (p == null || p === '') return null;
  const n = Number(p);
  if (Number.isFinite(n) && n === 0) return 'Free';
  const cur = String(o.priceCurrency || 'EUR').toUpperCase();
  const sym = cur === 'EUR' ? '€' : cur + ' ';
  return Number.isFinite(n) ? `${sym}${n % 1 ? n.toFixed(2) : n}` : str(p);
}
export function parseJsonLdEvents(html: string, pageUrl?: string | null): RawEvent[] {
  const out: RawEvent[] = [];
  const seen = new Set<string>();
  for (const block of ldBlocks(html)) {
    for (const o of walk(block)) {
      if (!typeList(o['@type']).some((t) => EVENT_TYPE.test(t))) continue;
      const title = oneLine(o.name);
      const start = str(o.startDate);
      if (!title || !start) continue;
      const mode = String(o.eventAttendanceMode || '');
      if (/OnlineEventAttendanceMode$/.test(mode)) continue;            // online-only: not a Cyprus happening
      const locs = Array.isArray(o.location) ? o.location : [o.location];
      const place = locs.find((l) => l && typeof l === 'object' && !typeList((l as Record<string, unknown>)['@type']).includes('VirtualLocation')) as Record<string, unknown> | undefined;
      const addr = place?.address;
      const a = addr && typeof addr === 'object' ? (addr as Record<string, unknown>) : null;
      const geo = place?.geo && typeof place.geo === 'object' ? (place.geo as Record<string, unknown>) : null;
      const lat = geo ? Number(geo.latitude) : NaN, lng = geo ? Number(geo.longitude) : NaN;
      const url = str(o.url) || pageUrl || null;
      const uid = url || str(o['@id']) || `${title}|${start}`;
      if (seen.has(uid + '|' + start)) continue;
      seen.add(uid + '|' + start);
      const org = Array.isArray(o.organizer) ? o.organizer[0] : o.organizer;
      out.push({
        uid, title, description: htmlToText(o.description) || null, start, end: str(o.endDate), url, image: imgOf(o.image),
        venue: oneLine(place?.name) || (typeof addr === 'string' ? oneLine(addr) : null),
        address: a ? oneLine(a.streetAddress) || null : null,
        city: a ? oneLine(a.addressLocality) || null : null,
        lat: Number.isFinite(lat) ? lat : null, lng: Number.isFinite(lng) ? lng : null,
        price: priceOf(o.offers, o.isAccessibleForFree),
        organizer: org && typeof org === 'object' ? oneLine((org as Record<string, unknown>).name) || null : null,
        cancelled: /Cancel|Postpone/i.test(String(o.eventStatus || '')),
      });
    }
  }
  return out;
}

// ── RSS / Atom item list ─────────────────────────────────────────────────────────────────────────────────
export interface FeedItem { title: string; link: string; guid: string | null; published: string | null }
const tag = (xml: string, name: string): string | null => {
  const m = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i').exec(xml);
  if (!m) return null;
  const v = m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
  return v || null;
};
export function parseFeedItems(xml: string): FeedItem[] {
  const out: FeedItem[] = [];
  const blocks = [...xml.matchAll(/<item[\s>][\s\S]*?<\/item>/gi), ...xml.matchAll(/<entry[\s>][\s\S]*?<\/entry>/gi)].map((m) => m[0]);
  for (const b of blocks) {
    const title = oneLine(tag(b, 'title') || '');
    const link = decodeEntities(tag(b, 'link') || /<link[^>]+href=["']([^"']+)["']/i.exec(b)?.[1] || '').trim();
    if (!/^https?:\/\//i.test(link)) continue;
    out.push({ title, link, guid: tag(b, 'guid') || tag(b, 'id'), published: tag(b, 'pubDate') || tag(b, 'updated') || tag(b, 'published') });
  }
  return out;
}
