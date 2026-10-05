// lib/events/holidays.ts — the statutory public holidays of the Republic of Cyprus, COMPUTED locally (no network, no API).
// This is what makes the Agenda "always present": a year of dated, true entries exists even if every web source is down.
// Fixed dates plus the movable ones from the Orthodox Easter (Meeus Julian algorithm + 13 days for 1900-2099).
// Validated in scripts/tests/events.pipeline.test.ts against Nager.Date's open holiday data for 2026 and 2027 (captured fixtures;
// the live API is deliberately not called: its robots.txt says "Disallow: /api/v").
import type { RawEvent } from './types';

/** Orthodox Easter Sunday of a year, as a Gregorian [month, day]. */
export function orthodoxEaster(year: number): [number, number] {
  const a = year % 4, b = year % 7, c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);              // 3 = March, 4 = April (Julian calendar)
  const day = ((d + e + 114) % 31) + 1;
  const g = new Date(Date.UTC(year, month - 1, day + 13));   // Julian -> Gregorian
  return [g.getUTCMonth() + 1, g.getUTCDate()];
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const plus = (y: number, m: number, d: number, days: number) => { const g = new Date(Date.UTC(y, m - 1, d + days)); return iso(g.getUTCFullYear(), g.getUTCMonth() + 1, g.getUTCDate()); };

export const HOLIDAY_PAGE = 'https://cypruslifestyle.eu/en/agenda';

export function cyprusPublicHolidays(year: number): RawEvent[] {
  const [em, ed] = orthodoxEaster(year);
  const list: [string, string, string][] = [
    [iso(year, 1, 1), "New Year's Day", 'Πρωτοχρονιά'],
    [iso(year, 1, 6), 'Epiphany', 'Θεοφάνεια'],
    [plus(year, em, ed, -48), 'Green Monday', 'Καθαρή Δευτέρα'],
    [iso(year, 3, 25), 'Greek Independence Day', 'Επέτειος Ελληνικής Ανεξαρτησίας'],
    [iso(year, 4, 1), 'Cyprus National Day', 'Κυπριακή Εθνική Επέτειος'],
    [plus(year, em, ed, -2), 'Good Friday', 'Μεγάλη Παρασκευή'],
    [plus(year, em, ed, 1), 'Easter Monday', 'Δευτέρα της Διακαινησίμου'],
    [iso(year, 5, 1), 'Labour Day', 'Πρωτομαγιά'],
    [plus(year, em, ed, 50), 'Whit Monday (Kataklysmos)', 'Δευτέρα Πεντηκοστής (Κατακλυσμός)'],
    [iso(year, 8, 15), 'Assumption of the Virgin Mary', 'Η Κοίμησις της Θεοτόκου'],
    [iso(year, 10, 1), 'Cyprus Independence Day', 'Επέτειος Κυπριακής Ανεξαρτησίας'],
    [iso(year, 10, 28), 'Ohi Day', 'Το Όχι'],
    [iso(year, 12, 24), 'Christmas Eve', 'Παραμονή Χριστουγέννων'],
    [iso(year, 12, 25), 'Christmas Day', 'Χριστούγεννα'],
    [iso(year, 12, 26), "St. Stephen's Day", 'Δεύτερη μέρα των Χριστουγέννων'],
  ];
  return list.map(([date, name, el]) => ({
    uid: `holiday:${date}`, title: `${name} (public holiday in Cyprus)`, titleEl: `${el} (αργία)`,
    start: date, end: null, allDay: true, url: `${HOLIDAY_PAGE}#public-holiday-${date}`, venue: null, price: 'Free', categories: ['Public holiday'],
  }));
}
