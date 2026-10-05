// lib/i18n/format.ts — ONE place for locale-aware numbers, money, dates and plurals.
// Pure (Intl only), safe in server and client code. Adopt it in NEW code; existing call
// sites are listed in docs/I18N.md and are deliberately not mass-edited.
//
// ARABIC NUMERALS DECISION (documented, reversible): Arabic uses LATIN digits (0-9).
// Evidence: messages/ar.json contains 0 Arabic-Indic digits and 41 Latin digits, prices and
// phone numbers are Latin everywhere on the site, and Node/ICU's plain `ar` already yields
// Latin digits today. We pin it with the `-u-nu-latn` extension so output no longer depends
// on the ICU version or the runtime's default region, and pin the Gregorian calendar
// (`-ca-gregory`) so `ar-SA` style defaults can never turn dates into Hijri.
// To switch to Eastern Arabic digits flip ARABIC_NUMERALS to 'arab' (one line, tests cover both).
import { isLocale, type Locale } from '@/lib/locales';

export const ARABIC_NUMERALS: 'latn' | 'arab' = 'latn';

/** Cyprus is the reference market: en-GB gives day-month order and 24h time, euro prices. */
const BASE_TAG: Record<Locale, string> = {
  en: 'en-GB', el: 'el-GR', ro: 'ro-RO', ar: 'ar', de: 'de-DE', pl: 'pl-PL', ru: 'ru-RU',
};

export const TIME_ZONE = 'Asia/Nicosia';
export const DEFAULT_CURRENCY = 'EUR';

/** BCP-47 tag to hand to Intl for a site locale. Unknown / empty input falls back to English. */
export function intlTag(locale?: string | null): string {
  const l: Locale = locale && isLocale(locale) ? locale : 'en';
  return l === 'ar' ? `ar-u-ca-gregory-nu-${ARABIC_NUMERALS}` : BASE_TAG[l];
}

export function formatNumber(locale: string | null | undefined, n: number, opts: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat(intlTag(locale), opts).format(n);
}

/** Money. `decimals: 'auto'` (default) shows no decimals for whole amounts, two otherwise. */
export function formatCurrency(
  locale: string | null | undefined, amount: number, currency: string = DEFAULT_CURRENCY,
  opts: { decimals?: 'auto' | number } = {},
): string {
  if (!Number.isFinite(amount)) return '';
  const d = opts.decimals ?? 'auto';
  const digits = d === 'auto' ? (Number.isInteger(amount) ? 0 : 2) : d;
  return new Intl.NumberFormat(intlTag(locale), {
    style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
  }).format(amount);
}

export function formatPercent(locale: string | null | undefined, ratio: number, fractionDigits = 0): string {
  if (!Number.isFinite(ratio)) return '';
  return new Intl.NumberFormat(intlTag(locale), { style: 'percent', maximumFractionDigits: fractionDigits }).format(ratio);
}

export type DateStyle = 'short' | 'medium' | 'long' | 'full' | 'dayMonth' | 'monthYear' | 'time' | 'dateTime';
const DATE_OPTS: Record<DateStyle, Intl.DateTimeFormatOptions> = {
  short: { day: '2-digit', month: '2-digit', year: 'numeric' },
  medium: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { day: 'numeric', month: 'long', year: 'numeric' },
  full: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  dayMonth: { day: 'numeric', month: 'long' },
  monthYear: { month: 'long', year: 'numeric' },
  time: { hour: '2-digit', minute: '2-digit' },
  dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
};

/** Dates in the island's time zone by default. Invalid input returns '' (never throws). */
export function formatDate(
  locale: string | null | undefined, value: Date | string | number, style: DateStyle = 'medium', timeZone: string = TIME_ZONE,
): string {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(intlTag(locale), { ...DATE_OPTS[style], timeZone, ...(style === 'time' || style === 'dateTime' ? { hourCycle: 'h23' as const } : {}) }).format(d);
  } catch { return ''; }
}

export type PluralForms = { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>;

/** CLDR plural category for n (en/el/ro/de: one|other(+few for ro); ar: zero..other; pl/ru: one|few|many|other). */
export function pluralCategory(locale: string | null | undefined, n: number): Intl.LDMLPluralRule {
  return new Intl.PluralRules(intlTag(locale)).select(n);
}

/**
 * Pick the right plural form and substitute `{n}` with the formatted number.
 *   plural('ru', 3, { one: '{n} объект', few: '{n} объекта', many: '{n} объектов', other: '{n} объекта' })
 * A missing category falls back to `other`.
 */
export function plural(locale: string | null | undefined, n: number, forms: PluralForms): string {
  const tpl = forms[pluralCategory(locale, n)] ?? forms.other;
  return tpl.replace(/\{n\}/g, formatNumber(locale, n));
}

export function formatList(locale: string | null | undefined, items: string[], type: 'conjunction' | 'disjunction' = 'conjunction'): string {
  try { return new Intl.ListFormat(intlTag(locale), { style: 'long', type }).format(items); } catch { return items.join(', '); }
}
