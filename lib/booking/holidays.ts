// lib/booking/holidays.ts — public holidays of the Republic of Cyprus for the SLA clock (pure, no I/O).
//
// Movable holidays follow GREEK ORTHODOX Easter, computed with the Meeus Julian algorithm and converted to the
// Gregorian calendar. Fixed holidays are plain month/day pairs.
//
// SOURCES (checked 2026-10-05):
//   • Central Bank of Cyprus, "Bank holidays to be observed in Cyprus during 2025 / 2026 / 2027 / 2028"
//     (https://www.centralbank.cy/en/the-bank/working-hours-bank-holidays) — the 2025–2028 lists are reproduced in
//     scripts/tests/holidays.test.ts and the computed dates must equal them.
//   • Office of the Financial Commissioner (state office) "Public Holidays" — official state holidays list
//     (https://financialombudsman.org.cy/en/public-holidays/).
//   • Cross-checks: Wikipedia "Public holidays in Cyprus", timeanddate.com/holidays/cyprus.
//
// KINDS
//   'public'   closed for banks AND/OR the state (Central Bank list or the state list). Counted as NON-working for the SLA clock.
//   'optional' observed by some businesses only (Christmas Eve is on the state list but NOT on the Central Bank list;
//              Holy Saturday / Easter Sunday fall on a weekend anyway). NOT counted as non-working unless a caller opts in.
//
// WEEKEND OVERLAP: no substitute day is modelled. The Central Bank's own notices say only "falls on a Saturday/Sunday"
// (e.g. 2027: 1 May, 15 Aug, 25 Dec, 26 Dec; 2028: 1 Jan, 25 Mar, 1 Apr, 1 Oct, 28 Oct) and publish no replacement
// weekday, so a holiday on a weekend changes nothing here. (Some payroll sites claim "Sunday -> next Monday"; that is
// not stated by the Central Bank or the state list and is deliberately NOT applied.)
//
// Not modelled: one-off government decrees (extra bridge days, national mourning days). Add those to HOLIDAYS in sla.ts.

export type HolidayKind = 'public' | 'optional';
export interface Holiday { date: string; name: string; kind: HolidayKind; source: 'fixed' | 'easter' }

const pad = (n: number) => String(n).padStart(2, '0');
const isoOf = (ms: number) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
const DAY = 86_400_000;

/** Orthodox Easter Sunday of `year` as a Gregorian ISO date (Meeus Julian algorithm + Julian→Gregorian offset). */
export function orthodoxEaster(year: number): string {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);            // 3 = March, 4 = April (Julian calendar)
  const day = ((d + e + 114) % 31) + 1;
  const offset = Math.floor(year / 100) - Math.floor(year / 400) - 2;   // 13 days for 1900–2099
  return isoOf(Date.UTC(year, month - 1, day) + offset * DAY);
}

const addDays = (iso: string, n: number) => isoOf(Date.parse(`${iso}T00:00:00Z`) + n * DAY);

const FIXED: { md: string; name: string; kind: HolidayKind }[] = [
  { md: '01-01', name: "New Year's Day", kind: 'public' },
  { md: '01-06', name: 'Epiphany', kind: 'public' },
  { md: '03-25', name: 'Greek Independence Day', kind: 'public' },
  { md: '04-01', name: 'Cyprus National Day', kind: 'public' },
  { md: '05-01', name: 'Labour Day', kind: 'public' },
  { md: '08-15', name: 'Dormition of the Theotokos (Assumption)', kind: 'public' },
  { md: '10-01', name: 'Cyprus Independence Day', kind: 'public' },
  { md: '10-28', name: 'Greek National Day (Ochi Day)', kind: 'public' },
  { md: '12-24', name: 'Christmas Eve', kind: 'optional' },
  { md: '12-25', name: 'Christmas Day', kind: 'public' },
  { md: '12-26', name: 'Boxing Day', kind: 'public' },
];

// Offsets from Orthodox Easter Sunday (days).
const MOVABLE: { off: number; name: string; kind: HolidayKind }[] = [
  { off: -48, name: 'Green Monday (Clean Monday)', kind: 'public' },
  { off: -2, name: 'Good Friday', kind: 'public' },
  { off: -1, name: 'Holy Saturday', kind: 'optional' },
  { off: 0, name: 'Easter Sunday', kind: 'optional' },
  { off: 1, name: 'Easter Monday', kind: 'public' },
  { off: 2, name: 'Easter Tuesday (bank holiday)', kind: 'public' },
  { off: 50, name: 'Pentecost Monday (Kataklysmos)', kind: 'public' },
];

const cache = new Map<number, Holiday[]>();

/** Every holiday of a calendar year, sorted by date. */
export function cyprusHolidays(year: number): Holiday[] {
  const hit = cache.get(year);
  if (hit) return hit;
  const easter = orthodoxEaster(year);
  const list: Holiday[] = [
    ...FIXED.map((f) => ({ date: `${year}-${f.md}`, name: f.name, kind: f.kind, source: 'fixed' as const })),
    ...MOVABLE.map((m) => ({ date: addDays(easter, m.off), name: m.name, kind: m.kind, source: 'easter' as const })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  cache.set(year, list);
  return list;
}

/** The holiday on a local date ('YYYY-MM-DD'), if any. */
export function holidayOn(isoDate: string): Holiday | null {
  const y = Number(isoDate.slice(0, 4));
  if (!Number.isFinite(y)) return null;
  const on = cyprusHolidays(y).filter((h) => h.date === isoDate);
  return on.find((h) => h.kind === 'public') || on[0] || null;      // two on one day: the public one decides
}

/** Is this local date a non-working holiday? Optional holidays count only when `includeOptional` is true. */
export function isCyprusHoliday(isoDate: string, includeOptional = false): boolean {
  const h = holidayOn(isoDate);
  return !!h && (h.kind === 'public' || includeOptional);
}
