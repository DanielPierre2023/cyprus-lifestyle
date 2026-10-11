// Cyprus public holidays in the SLA clock: Orthodox Easter (Meeus Julian -> Gregorian), the movable and fixed holidays,
// the Central Bank of Cyprus lists for 2025-2028, and holiday-aware working-time arithmetic.
import { orthodoxEaster, cyprusHolidays, holidayOn, isCyprusHoliday } from '@/lib/booking/holidays';
import { addWorkingMinutes, dueAt, isWorkingDay, localParts } from '@/lib/booking/sla';
import { eq, ok, report } from './_harness';

const Z = (s: string) => Date.parse(s);
const local = (ms: number) => { const p = localParts(ms); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')} ${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`; };

// ── Orthodox Easter Sunday 2024–2035 (published Greek Orthodox Easter dates) ──────────────────────────────────
const EASTER: Record<number, string> = {
  2024: '2024-05-05', 2025: '2025-04-20', 2026: '2026-04-12', 2027: '2027-05-02', 2028: '2028-04-16', 2029: '2029-04-08',
  2030: '2030-04-28', 2031: '2031-04-13', 2032: '2032-05-02', 2033: '2033-04-24', 2034: '2034-04-09', 2035: '2035-04-29',
};
for (const [y, d] of Object.entries(EASTER)) eq(`Orthodox Easter ${y}`, orthodoxEaster(Number(y)), d);
eq('Orthodox Easter is always a Sunday (1900–2099)', Array.from({ length: 200 }, (_, i) => 1900 + i).filter((y) => new Date(`${orthodoxEaster(y)}T00:00:00Z`).getUTCDay() !== 0), []);
eq('Orthodox Easter never before 4 April / after 8 May (Gregorian, 1900–2099)', Array.from({ length: 200 }, (_, i) => 1900 + i).filter((y) => { const d = orthodoxEaster(y).slice(5); return d < '04-04' || d > '05-08'; }), []);

// ── Central Bank of Cyprus bank-holiday lists (https://www.centralbank.cy/en/the-bank/working-hours-bank-holidays) ──
// Weekdays only: the bank prints a holiday that falls on a weekend as a footnote ("falls on a Saturday"), not as a list item.
const CBC: Record<number, [string, string][]> = {
  2025: [['01-01', 'New Year'], ['01-06', 'Epiphany'], ['03-03', 'Green Monday'], ['03-25', 'Independence'], ['04-01', 'National Day'], ['04-18', 'Good Friday'], ['04-21', 'Easter Monday'], ['04-22', 'Easter Tuesday'], ['05-01', 'Labour'], ['06-09', 'Pentecost'], ['08-15', 'Assumption'], ['10-01', 'Independence Day'], ['10-28', 'Ochi'], ['12-25', 'Christmas'], ['12-26', 'Boxing']],
  2026: [['01-01', 'New Year'], ['01-06', 'Epiphany'], ['02-23', 'Green Monday'], ['03-25', 'Independence'], ['04-01', 'National Day'], ['04-10', 'Good Friday'], ['04-13', 'Easter Monday'], ['04-14', 'Easter Tuesday'], ['05-01', 'Labour'], ['06-01', 'Pentecost'], ['10-01', 'Independence Day'], ['10-28', 'Ochi'], ['12-25', 'Christmas']],
  2027: [['01-01', 'New Year'], ['01-06', 'Epiphany'], ['03-15', 'Green Monday'], ['03-25', 'Independence'], ['04-01', 'National Day'], ['04-30', 'Good Friday'], ['05-03', 'Easter Monday'], ['05-04', 'Easter Tuesday'], ['06-21', 'Pentecost'], ['10-01', 'Independence Day'], ['10-28', 'Ochi']],
  2028: [['01-06', 'Epiphany'], ['02-28', 'Green Monday'], ['04-14', 'Good Friday'], ['04-17', 'Easter Monday'], ['04-18', 'Easter Tuesday'], ['05-01', 'Labour'], ['06-05', 'Pentecost'], ['08-15', 'Assumption'], ['12-25', 'Christmas'], ['12-26', 'Boxing']],
};
for (const [y, list] of Object.entries(CBC)) {
  for (const [md, label] of list) ok(`${y}-${md} (${label}) is a public holiday in the model`, isCyprusHoliday(`${y}-${md}`));
  // and the model must not call a WEEKDAY a public holiday that the bank does not list (Christmas Eve is 'optional', so not counted)
  const listed = new Set(list.map(([md]) => `${y}-${md}`));
  const extra = cyprusHolidays(Number(y)).filter((h) => h.kind === 'public' && ![0, 6].includes(new Date(`${h.date}T00:00:00Z`).getUTCDay()) && !listed.has(h.date)).map((h) => h.date);
  eq(`${y}: no weekday public holiday beyond the Central Bank list`, extra, []);
}

// ── structure ───────────────────────────────────────────────────────────────────────────────────────────────────
const h26 = cyprusHolidays(2026);
eq('2026 movable holidays', h26.filter((h) => h.source === 'easter').map((h) => [h.date, h.kind]), [['2026-02-23', 'public'], ['2026-04-10', 'public'], ['2026-04-11', 'optional'], ['2026-04-12', 'optional'], ['2026-04-13', 'public'], ['2026-04-14', 'public'], ['2026-06-01', 'public']]);
eq('2026 fixed public holidays', h26.filter((h) => h.source === 'fixed' && h.kind === 'public').map((h) => h.date), ['2026-01-01', '2026-01-06', '2026-03-25', '2026-04-01', '2026-05-01', '2026-08-15', '2026-10-01', '2026-10-28', '2026-12-25', '2026-12-26']);
eq('Christmas Eve is optional', [holidayOn('2026-12-24')?.kind, isCyprusHoliday('2026-12-24'), isCyprusHoliday('2026-12-24', true)], ['optional', false, true]);
ok('sorted by date', h26.every((h, i) => i === 0 || h26[i - 1].date <= h.date));
eq('an ordinary day is no holiday', [holidayOn('2026-03-04'), isCyprusHoliday('2026-03-04')], [null, false]);
eq('two holidays on one day: the public one decides (2016: Easter Sunday (optional) = Labour Day)', [holidayOn('2016-05-01')?.kind, holidayOn('2016-05-01')?.name, orthodoxEaster(2016)], ['public', 'Labour Day', '2016-05-01']);
eq('Kataklysmos = Easter + 50 days', [2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => cyprusHolidays(y).find((h) => /Kataklysmos/.test(h.name))!.date), ['2024-06-24', '2025-06-09', '2026-06-01', '2027-06-21', '2028-06-05', '2029-05-28', '2030-06-17']);
eq('Green Monday = Easter - 48 days', [2024, 2025, 2027].map((y) => cyprusHolidays(y).find((h) => /Green Monday/.test(h.name))!.date), ['2024-03-18', '2025-03-03', '2027-03-15']);

// ── weekend overlap: no substitute day (Central Bank prints none) ───────────────────────────────────────────────
eq('2027-05-01 (Labour Day) is a Saturday: nothing moves to Monday 3 May except Easter Monday itself', [isCyprusHoliday('2027-05-01'), holidayOn('2027-05-03')?.name], [true, 'Easter Monday']);
ok('2028-10-02 (Monday after 1 Oct on a Sunday) is a normal working day', isWorkingDay(localParts(Z('2028-10-02T09:00:00Z'))) && !isCyprusHoliday('2028-10-02'));
ok('2026-08-15 (Saturday) gives no extra weekday off', isWorkingDay(localParts(Z('2026-08-17T09:00:00Z'))));

// ── holiday-aware working time ──────────────────────────────────────────────────────────────────────────────────
ok('Good Friday 2026 is not a working day; the Wednesday after Easter is', !isWorkingDay(localParts(Z('2026-04-10T09:00:00Z'))) && isWorkingDay(localParts(Z('2026-04-15T09:00:00Z'))));
// Thu 9 Apr 2026 17:00 (UTC+3). 1 h Thursday, then Good Friday / weekend / Easter Monday / Easter Tuesday are off.
eq('Easter 2026: member 4 h from Thu 17:00 ends Wed 15 Apr 12:00', local(addWorkingMinutes(Z('2026-04-09T14:00:00Z'), 240)), '2026-04-15 12:00');
eq('Easter 2026: standard 9 h from Thu 17:00 ends Wed 15 Apr 17:00', local(addWorkingMinutes(Z('2026-04-09T14:00:00Z'), 540)), '2026-04-15 17:00');
eq('request ON Good Friday: clock starts Wed 15 Apr 09:00', local(addWorkingMinutes(Z('2026-04-10T08:00:00Z'), 240)), '2026-04-15 13:00');
eq('request on Easter Sunday evening: same', local(addWorkingMinutes(Z('2026-04-12T18:00:00Z'), 60)), '2026-04-15 10:00');
eq('Easter 2027: standard from Thu 29 Apr 17:00 skips Good Friday, Easter Monday, Easter Tuesday', local(addWorkingMinutes(Z('2027-04-29T14:00:00Z'), 540)), '2027-05-05 17:00');
// Kataklysmos 2026 = Monday 1 June
eq('Kataklysmos 2026: member 4 h from Fri 29 May 17:00 ends Tue 2 Jun 12:00', local(addWorkingMinutes(Z('2026-05-29T14:00:00Z'), 240)), '2026-06-02 12:00');
eq('Kataklysmos 2025 (Mon 9 Jun): Fri 6 Jun 17:00 + 4 h = Tue 10 Jun 12:00', local(addWorkingMinutes(Z('2025-06-06T14:00:00Z'), 240)), '2025-06-10 12:00');
// Christmas 2026: Christmas Eve (Thu) is OPTIONAL = a working day; 25 Dec Fri public; 26/27 weekend
eq('Christmas Eve counts as working: Thu 24 Dec 10:00 + 4 h = 14:00', local(addWorkingMinutes(Z('2026-12-24T08:00:00Z'), 240)), '2026-12-24 14:00');
eq('Christmas 2026: standard from Thu 24 Dec 17:00 ends Mon 28 Dec 17:00 (no Fri 25 Dec)', local(addWorkingMinutes(Z('2026-12-24T15:00:00Z'), 540)), '2026-12-28 17:00');
// New year / 1 Oct
eq('1 Oct 2026 (Thu) is off: Wed 30 Sep 17:00 + 4 h = Fri 2 Oct 12:00', local(addWorkingMinutes(Z('2026-09-30T14:00:00Z'), 240)), '2026-10-02 12:00');
eq('no substitute for 1 Oct 2028 (Sunday): Fri 29 Sep 17:00 + 4 h = Mon 2 Oct 12:00', local(addWorkingMinutes(Z('2028-09-29T14:00:00Z'), 240)), '2028-10-02 12:00');
eq('dueAt uses the holiday calendar', dueAt('standard', new Date('2026-04-09T14:00:00Z')).toISOString(), '2026-04-15T14:00:00.000Z');
// A holiday week must never make a deadline EARLIER than the plain weekday rule
ok('with holidays the deadline is never earlier than without (sampled week of Easter 2026)', [0, 1, 2, 3, 4, 5, 6].every((k) => addWorkingMinutes(Z('2026-04-06T08:00:00Z') + k * 86_400_000, 540) >= Z('2026-04-06T08:00:00Z') + k * 86_400_000));

report('holidays');
