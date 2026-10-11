// lib/events/normalise.ts — RawEvent (loose strings from a source) -> NormEvent (validated, Asia/Nicosia-correct, with
// district + coordinates) or a reason to skip it. Pure; unit-tested in scripts/tests/events.pipeline.test.ts.
import { findLocality } from '@/lib/concierge/localities';
import type { EventSource, NormEvent, RawEvent, SkipReason } from './types';
import { htmlToText } from './parse';
import { nicosiaDayStartMs, nicosiaWallToUtcMs, nicosiaParts, parseEventDate } from './time';

const DAY = 86_400_000;
export const MAX_AHEAD_DAYS = 548;      // ~18 months
export const MAX_SPAN_DAYS = 120;      // longer than ~4 months is a season / umbrella listing ("Spring & Easter events"), not an event

/** Occupied north / sites outside the Republic: this site covers the south only (same policy as lib/scrape/events.ts). */
const NORTH = /\b(kyrenia|girne|keryneia|trnc|northern cyprus|turkish republic|occupied|gazimağusa|gazimagusa|güzelyurt|guzelyurt|lapithos|bellapais|lefkoşa|dipkarpaz|salamis|varosha|north nicosia)\b/i;

const DISTRICT_WORDS: [RegExp, string][] = [
  // (no \b before Greek letters: JavaScript word boundaries only know ASCII)
  [/(\blimassol|\blemesos|λεμεσ)/i, 'limassol'], [/(\blarnaca|\blarnaka|λάρνακ|λαρνακ)/i, 'larnaca'], [/(\bpaphos|\bpafos|πάφο|παφο)/i, 'paphos'],
  [/(\bnicosia|\blefkosia|λευκωσ)/i, 'nicosia'], [/(\bayia napa|\bagia napa|\bprotaras|\bparalimni|famagusta district|αγία νάπα)/i, 'famagusta'],
];
const CY_BBOX = { minLat: 34.45, maxLat: 35.75, minLng: 32.2, maxLng: 34.65 };
const inCy = (lat: number, lng: number) => lat >= CY_BBOX.minLat && lat <= CY_BBOX.maxLat && lng >= CY_BBOX.minLng && lng <= CY_BBOX.maxLng;

/** Strip the date range some titles carry as a suffix ("... Festival - 10-11.10.2026"): the date is a field of its own. */
export function cleanTitle(raw: string): string {
  let t = htmlToText(raw).replace(/\s+/g, ' ').trim();
  t = t.replace(/\s*[-–—|:]\s*\d{1,2}(?:\s*[-–]\s*\d{1,2})?(?:[./]\d{1,2}){1,2}(?:[./]\d{2,4})?(?:\s*[-–]\s*\d{1,2}[./]\d{1,2}[./]\d{2,4})?\s*$/u, '').trim();
  t = t.replace(/[\s\-–—|:,]+$/u, '').trim();
  return t.slice(0, 200);
}

export function districtOf(parts: (string | null | undefined)[]): { district: string | null; lat: number | null; lng: number | null } {
  for (const p of parts) {
    if (!p) continue;
    const loc = findLocality(p);
    if (loc) return { district: loc.district, lat: loc.lat, lng: loc.lng };
  }
  const text = parts.filter(Boolean).join(' | ');
  for (const [re, d] of DISTRICT_WORDS) if (re.test(text)) return { district: d, lat: null, lng: null };
  return { district: null, lat: null, lng: null };
}

export function normalisePrice(p: string | null | undefined): string | null {
  const s = String(p ?? '').replace(/\s+/g, ' ').trim();
  if (!s) return null;
  if (/^(0+([.,]0+)?|free( entrance| admission)?|δωρεάν|free of charge)$/i.test(s)) return 'Free';
  if (/^\d+([.,]\d{1,2})?$/.test(s)) return `€${s.replace(',', '.')}`;
  return s.slice(0, 60);
}

function excerpt(text: string | null | undefined, max = 320): string | null {
  const t = String(text ?? '').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  return (stop > max * 0.5 ? cut.slice(0, stop + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…').trim();
}

export type NormResult = { ok: true; event: NormEvent } | { ok: false; reason: SkipReason };

export function normaliseEvent(raw: RawEvent, source: EventSource, now: number): NormResult {
  const title = cleanTitle(raw.title);
  if (title.length < 3) return { ok: false, reason: 'no-title' };
  if (/https?:\/\/|www\./i.test(title)) return { ok: false, reason: 'spam' };
  if (raw.cancelled) return { ok: false, reason: 'cancelled' };

  const sd = parseEventDate(raw.start);
  if (!sd) return { ok: false, reason: 'bad-date' };
  const ed = parseEventDate(raw.end);
  const allDay = !!raw.allDay || sd.dateOnly;
  const startMs = allDay ? nicosiaDayStartMs(sd.ms) : sd.ms;
  let endMs: number | null = null;
  if (ed) {
    endMs = ed.dateOnly ? nicosiaDayStartMs(ed.ms) + DAY - 1000 : ed.ms;
    if (allDay && !ed.dateOnly) { const p = nicosiaParts(ed.ms); endMs = nicosiaWallToUtcMs(p.y, p.m, p.d, 23, 59, 59); }
    if (endMs < startMs) endMs = null;
  }
  const effEnd = endMs ?? startMs + (allDay ? DAY - 1000 : 3 * 3_600_000);
  if (effEnd < now) return { ok: false, reason: 'past' };
  if (startMs > now + MAX_AHEAD_DAYS * DAY) return { ok: false, reason: 'too-far' };
  if (endMs != null && endMs - startMs > MAX_SPAN_DAYS * DAY) return { ok: false, reason: 'too-long' };

  const where = [raw.city, raw.address, raw.venue];
  const text = [title, ...where].filter(Boolean).join(' ');
  if (NORTH.test(text)) return { ok: false, reason: 'north' };

  // Event pages often name the place only in the text ("📍 Paradox Museum Limassol"): use that line as the venue when none is given.
  const pin = !raw.venue && !raw.address ? /📍\s*([^\n]{3,120})/u.exec(String(raw.description || ''))?.[1]?.trim() ?? null : null;
  const d0 = districtOf([raw.city, raw.address, raw.venue, pin, title]);
  const hint = !d0.district && source.districtHint ? findLocality(source.districtHint) : null;
  const d = hint ? { district: hint.district as string, lat: hint.lat, lng: hint.lng } : d0;
  let lat = raw.lat ?? null, lng = raw.lng ?? null, precision: 'exact' | 'town' | null = null;
  if (lat != null && lng != null && inCy(lat, lng)) precision = 'exact';
  else { lat = null; lng = null; if (d.lat != null && d.lng != null) { lat = d.lat; lng = d.lng; precision = 'town'; } }

  const url = raw.url && /^https?:\/\//i.test(raw.url) ? raw.url : null;
  const image = source.images && raw.image && /^https:\/\//i.test(raw.image) ? raw.image : null;
  const tags = [...new Set([...(source.tags || []), ...(raw.categories || []).map((c) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')).filter(Boolean)])].slice(0, 5);
  const approx = !!raw.dateApprox || /\b(tbc|tba|to be confirmed|to be announced|provisional|tentative)\b/i.test(`${title} ${raw.description || ''}`);
  const venue = (raw.venue || '').trim() || pin || null;
  const el = raw.titleEl ? htmlToText(raw.titleEl).slice(0, 200) : null;

  return {
    ok: true,
    event: {
      sourceSlug: source.slug, uid: raw.uid, ingestKey: `${source.slug}:${raw.uid}`.slice(0, 300),
      title, titleEl: el, summary: source.factsOnly ? null : excerpt(raw.description),
      startsAt: new Date(startMs).toISOString(), endsAt: endMs != null ? new Date(endMs).toISOString() : null, allDay,
      venue: venue ? venue.slice(0, 160) : (raw.address || raw.city || null)?.toString().slice(0, 160) || null,
      district: d.district, lat, lng, coordsPrecision: precision,
      price: normalisePrice(raw.price), url, image, organizer: raw.organizer ? raw.organizer.slice(0, 120) : null, tags,
      dateConfidence: approx ? 'approximate' : 'confirmed',
      recurrence: source.tags?.includes('public-holiday') ? 'annual' : 'one-off',
      lang: source.lang,
    },
  };
}
