// lib/i18n/format.ts, resolveLocale.ts, apiErrors.ts — pure locale helpers.
import { siteIntlTag, dateFormatter, formatDateWith, numberFormatter, intlTag, formatNumber, formatCurrency, formatDate, formatPercent, pluralCategory, plural, formatList, ARABIC_NUMERALS } from '../../lib/i18n/format';
import { resolveLocale, localeFromPath, localeFromAcceptLanguage, localeOf } from '../../lib/i18n/resolveLocale';
import { errorBody, errorMessage, API_ERROR_CODES, isApiErrorCode } from '../../lib/i18n/apiErrors';
import { LOCALES } from '../../lib/locales';
import { eq, ok, report } from './_harness';

const nb = (s: string) => s.replace(/[  ]/g, ' ');

// Arabic numerals decision: Latin digits
eq('ARABIC_NUMERALS default', ARABIC_NUMERALS, 'latn');
eq('ar tag pins latin digits + gregorian', intlTag('ar'), 'ar-u-ca-gregory-nu-latn');
eq('unknown locale -> en tag', [intlTag('xx'), intlTag(''), intlTag(null), intlTag(undefined)], ['en-GB', 'en-GB', 'en-GB', 'en-GB']);
ok('ar number uses 0-9', /^1,234\.5$/.test(formatNumber('ar', 1234.5)) && !/[٠-٩]/.test(formatNumber('ar', 1234.5)));
ok('ar date has no Arabic-Indic digits', !/[٠-٩]/.test(formatDate('ar', '2026-10-05T10:00:00Z', 'long')) && /5/.test(formatDate('ar', '2026-10-05T10:00:00Z', 'long')));
ok('ar date is Gregorian (2026, not 14xx)', /2026/.test(formatDate('ar', '2026-10-05T10:00:00Z', 'long')));

// numbers
eq('en number', formatNumber('en', 1234567.5), '1,234,567.5');
eq('de number', formatNumber('de', 1234567.5), '1.234.567,5');
eq('ru number', nb(formatNumber('ru', 1234567.5)), '1 234 567,5');
eq('NaN -> empty', formatNumber('en', NaN), '');

// currency
eq('en EUR whole', formatCurrency('en', 1250), '€1,250');
eq('en EUR cents', formatCurrency('en', 1250.5), '€1,250.50');
eq('de EUR', nb(formatCurrency('de', 1250.5)), '1.250,50 €');
eq('forced decimals', formatCurrency('en', 10, 'EUR', { decimals: 2 }), '€10.00');
ok('every locale formats EUR with a euro sign', LOCALES.every((l) => formatCurrency(l, 99).includes('€') || /EUR/.test(formatCurrency(l, 99))));
ok('ar EUR keeps latin digits', /99/.test(formatCurrency('ar', 99)));
eq('percent', formatPercent('en', 0.256, 1), '25.6%');

// dates (Asia/Nicosia is UTC+3 in October)
const d = '2026-10-05T10:00:00Z';
eq('en long', formatDate('en', d, 'long'), '5 October 2026');
eq('de long', formatDate('de', d, 'long'), '5. Oktober 2026');
ok('el long has Greek month', /Οκτωβρίου/.test(formatDate('el', d, 'long')));
ok('ru long has Russian month', /октября/.test(formatDate('ru', d, 'long')));
ok('pl long has Polish month', /października/.test(formatDate('pl', d, 'long')));
ok('ro long has Romanian month', /octombrie/.test(formatDate('ro', d, 'long')));
eq('time uses Nicosia zone, 24h', formatDate('en', d, 'time'), '13:00');
eq('date near midnight uses Nicosia day', formatDate('en', '2026-10-05T22:30:00Z', 'long'), '6 October 2026');
eq('invalid date -> empty', formatDate('en', 'not a date'), '');
eq('bad time zone -> empty, no throw', formatDate('en', d, 'long', 'Nowhere/Land'), '');

// plurals
const cats = (l: string, ns: number[]) => ns.map((n) => pluralCategory(l, n));
eq('en plural cats', cats('en', [0, 1, 2]), ['other', 'one', 'other']);
eq('ru plural cats', cats('ru', [1, 2, 5, 11, 21, 22, 25]), ['one', 'few', 'many', 'many', 'one', 'few', 'many']);
eq('pl plural cats', cats('pl', [1, 2, 5, 12, 22, 25]), ['one', 'few', 'many', 'many', 'few', 'many']);
eq('ar plural cats', cats('ar', [0, 1, 2, 3, 10, 11, 99, 100]), ['zero', 'one', 'two', 'few', 'few', 'many', 'many', 'other']);
eq('ro plural cats', cats('ro', [1, 2, 19, 20]), ['one', 'few', 'few', 'other']);
const ruForms = { one: '{n} объект', few: '{n} объекта', many: '{n} объектов', other: '{n} объекта' };
eq('ru plural text', [plural('ru', 1, ruForms), plural('ru', 3, ruForms), plural('ru', 7, ruForms)], ['1 объект', '3 объекта', '7 объектов']);
eq('plural falls back to other', plural('en', 5, { one: '{n} place', other: '{n} places' }), '5 places');
eq('plural formats the number', plural('en', 1500, { other: '{n} places' }), '1,500 places');
eq('ar missing category falls back', plural('ar', 0, { one: 'x', other: '{n} أماكن' }), '0 أماكن');

// lists
eq('en list', formatList('en', ['a', 'b', 'c']), 'a, b and c');
eq('empty list', formatList('en', []), '');

// resolveLocale
eq('path locale', [localeFromPath('/el/directory/x'), localeFromPath('https://cypruslifestyle.eu/ru/guide?x=1'), localeFromPath('/directory'), localeFromPath(null), localeFromPath('/elx/a')], ['el', 'ru', null, null, null]);
eq('accept-language q ordering', localeFromAcceptLanguage('fr;q=0.9, pl-PL;q=0.8, de;q=0.2'), 'pl');
eq('accept-language skips unsupported / wildcard', localeFromAcceptLanguage('*, fr, ar-EG'), 'ar');
eq('accept-language none', localeFromAcceptLanguage('fr, ja'), null);
eq('accept-language q=0 ignored', localeFromAcceptLanguage('de;q=0, ro;q=0.1'), 'ro');
eq('resolve: explicit wins', resolveLocale({ explicit: 'DE', referer: 'https://x/el/a', acceptLanguage: 'ru' }), 'de');
eq('resolve: referer next', resolveLocale({ explicit: 'zz', referer: 'https://x/el/a', acceptLanguage: 'ru' }), 'el');
eq('resolve: accept-language next', resolveLocale({ acceptLanguage: 'ru-RU,ru;q=0.9' }), 'ru');
eq('resolve: default en', resolveLocale({}), 'en');
const h = (m: Record<string, string>) => ({ headers: { get: (k: string) => m[k.toLowerCase()] ?? null } });
eq('localeOf reads referer', localeOf(h({ referer: 'https://x/ar/directory/hotels/a' })), 'ar');
eq('localeOf ignores non-string explicit', localeOf(h({}), 42), 'en');

// API error codes
ok('all codes have 7 non-empty messages', API_ERROR_CODES.every((c) => LOCALES.every((l) => errorMessage(c, l).trim().length > 2)));
ok('non-en messages differ from en (translated)', API_ERROR_CODES.every((c) => LOCALES.filter((l) => l !== 'en').every((l) => errorMessage(c, l) !== errorMessage(c, 'en'))));
eq('error body shape (en = previous text)', errorBody('rate_limited'), { ok: false, code: 'rate_limited', error: 'Too many requests — please wait a moment.' });
eq('previous English texts preserved', [errorMessage('missing_listing', 'en'), errorMessage('name_email_required', 'en')], ['Missing listing.', 'A name and a valid email are required.']);
eq('unknown locale -> en', errorMessage('forbidden', 'xx'), 'Forbidden');
ok('isApiErrorCode', isApiErrorCode('rate_limited') && !isApiErrorCode('nope') && !isApiErrorCode(3));

// ── 5.2 adapters: migrated call sites keep English output identical, other editions use the shared tags ──
const SAMPLE = new Date('2026-10-05T10:00:00Z');
const OPTS: Intl.DateTimeFormatOptions[] = [
  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, { day: 'numeric', month: 'short' },
  { month: 'long', year: 'numeric' }, { day: '2-digit' }, { hour: '2-digit', minute: '2-digit' },
];
for (const o of OPTS) {
  eq('en identical to the previous bare-en Intl call ' + JSON.stringify(o), formatDateWith('en', SAMPLE, o), new Intl.DateTimeFormat('en', o).format(SAMPLE));
  for (const l of ['el', 'ro', 'de', 'pl', 'ru'] as const)
    eq(`${l} identical to the previous bare-locale Intl call`, formatDateWith(l, SAMPLE, o), new Intl.DateTimeFormat(l, o).format(SAMPLE));
}
ok('ar digits are Latin and Gregorian', !/[٠-٩]/.test(formatDateWith('ar', SAMPLE, OPTS[0])) && /2026/.test(formatDateWith('ar', SAMPLE, OPTS[0])));
eq('siteIntlTag en = legacy', [siteIntlTag('en'), siteIntlTag('xx'), siteIntlTag(null)], ['en', 'en', 'en']);
eq('siteIntlTag el = el-GR', siteIntlTag('el'), 'el-GR');
eq('formatDateWith invalid -> empty', formatDateWith('el', 'nope', OPTS[1]), '');
ok('time zone is applied when given', dateFormatter('en', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }, 'Asia/Nicosia').format(new Date('2026-10-05T21:30:00Z')) === '00:30');
eq('numberFormatter en max 0 digits', numberFormatter('en', { maximumFractionDigits: 0 }).format(1234.6), '1,235');
ok('numberFormatter ar uses latin digits', numberFormatter('ar').format(1234) === '1,234');
eq('formatNumber matches the old toLocaleString for el/ro/de', ['el', 'ro', 'de'].map((l) => formatNumber(l, 12345.678)), ['el', 'ro', 'de'].map((l) => (12345.678).toLocaleString(l)));

report('i18n-format');
