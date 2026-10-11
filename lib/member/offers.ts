// lib/member/offers.ts — partner offers shown on the member card: pure rules (no I/O).
// Offers are added by the owner (Admin → Member offers). None exist by default, and nothing on the site may imply an offer
// that is not in this list (docs/MEMBER-CARD.md, "What the site may say").
import { isLocale, LOCALES, type Locale } from '@/lib/locales';

export interface OfferRow {
  id: string; partner_name: string; offer_en: string; translations: Record<string, string> | null;
  valid_from: string | null; valid_to: string | null; active: boolean;
}

export const OFFER_PARTNER_MAX = 80;
export const OFFER_TEXT_MAX = 300;

/** Today's calendar date in Cyprus, 'YYYY-MM-DD' (offers and the once-a-day rule use the Cyprus calendar). */
export function cyprusToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Nicosia', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

/** Offered right now? active flag + inclusive validity window on the Cyprus calendar. */
export function offerIsLive(o: Pick<OfferRow, 'active' | 'valid_from' | 'valid_to'>, now: Date = new Date()): boolean {
  if (!o.active) return false;
  const today = cyprusToday(now);
  if (o.valid_from && today < o.valid_from) return false;
  if (o.valid_to && today > o.valid_to) return false;
  return true;
}

/** The offer in the viewer's language, falling back to the English text. */
export function offerText(o: Pick<OfferRow, 'offer_en' | 'translations'>, locale: string): string {
  const tr = o.translations && typeof o.translations === 'object' ? o.translations : {};
  const t = isLocale(locale) && locale !== 'en' ? tr[locale] : '';
  return typeof t === 'string' && t.trim() ? t.trim() : o.offer_en;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (s: string) => { if (!DATE_RE.test(s)) return false; const d = new Date(s + 'T00:00:00Z'); return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s; };
const oneLine = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '');

export type OfferInput = { partner_name: string; offer_en: string; translations: Record<string, string>; valid_from: string | null; valid_to: string | null; active: boolean };

/** Validate what the admin typed. Returns the clean row or a message for the admin (English). */
export function checkOfferInput(body: Record<string, unknown>): { ok: true; value: OfferInput } | { ok: false; error: string } {
  const partner = oneLine(body.partner_name, OFFER_PARTNER_MAX + 1);
  if (!partner) return { ok: false, error: 'Enter the partner name.' };
  if (partner.length > OFFER_PARTNER_MAX) return { ok: false, error: `The partner name can have at most ${OFFER_PARTNER_MAX} characters.` };
  const raw = typeof body.offer_en === 'string' ? body.offer_en : '';
  const en = oneLine(raw, OFFER_TEXT_MAX + 1);
  if (!en) return { ok: false, error: 'Enter the offer in English.' };
  if (en.length > OFFER_TEXT_MAX) return { ok: false, error: `The offer can have at most ${OFFER_TEXT_MAX} characters.` };
  const translations: Record<string, string> = {};
  const tr = body.translations && typeof body.translations === 'object' ? body.translations as Record<string, unknown> : {};
  for (const l of LOCALES) {
    if (l === 'en') continue;
    const t = oneLine(tr[l], OFFER_TEXT_MAX + 1);
    if (!t) continue;
    if (t.length > OFFER_TEXT_MAX) return { ok: false, error: `The ${l.toUpperCase()} text can have at most ${OFFER_TEXT_MAX} characters.` };
    translations[l] = t;
  }
  const from = typeof body.valid_from === 'string' && body.valid_from.trim() ? body.valid_from.trim() : null;
  const to = typeof body.valid_to === 'string' && body.valid_to.trim() ? body.valid_to.trim() : null;
  if (from && !validDate(from)) return { ok: false, error: '"Valid from" must be a date (YYYY-MM-DD).' };
  if (to && !validDate(to)) return { ok: false, error: '"Valid to" must be a date (YYYY-MM-DD).' };
  if (from && to && from > to) return { ok: false, error: '"Valid from" is after "Valid to".' };
  return { ok: true, value: { partner_name: partner, offer_en: en, translations, valid_from: from, valid_to: to, active: body.active !== false } };
}

/** Locales a translation may exist for (everything except English). */
export const TRANSLATION_LOCALES: Locale[] = LOCALES.filter((l) => l !== 'en');
