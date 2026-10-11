// lib/events/time.ts — Asia/Nicosia wall-clock <-> UTC, without a time-zone library (Node ships full ICU).
// Cyprus is on EET/EEST (UTC+2 / UTC+3, EU daylight-saving rules). Pure; unit-tested in scripts/tests/events.pipeline.test.ts.
export const TZ = 'Asia/Nicosia';

const fmt = new Intl.DateTimeFormat('en-GB', {
  timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

export interface Parts { y: number; m: number; d: number; h: number; mi: number; s: number }

/** The Nicosia wall-clock parts of an instant. */
export function nicosiaParts(ms: number): Parts {
  const o: Record<string, number> = {};
  for (const p of fmt.formatToParts(new Date(ms))) if (p.type !== 'literal') o[p.type] = Number(p.value);
  return { y: o.year, m: o.month, d: o.day, h: o.hour % 24, mi: o.minute, s: o.second };
}

/** Offset of Nicosia from UTC at an instant, in minutes (120 or 180). */
export function nicosiaOffsetMin(ms: number): number {
  const p = nicosiaParts(ms);
  return Math.round((Date.UTC(p.y, p.m - 1, p.d, p.h, p.mi, p.s) - Math.floor(ms / 1000) * 1000) / 60_000);
}

/** The instant (epoch ms) at which the Nicosia clock reads the given wall time. */
export function nicosiaWallToUtcMs(y: number, m: number, d: number, h = 0, mi = 0, s = 0): number {
  const guess = Date.UTC(y, m - 1, d, h, mi, s);
  let ms = guess - nicosiaOffsetMin(guess) * 60_000;
  const off2 = nicosiaOffsetMin(ms);
  ms = guess - off2 * 60_000;          // re-check across a DST edge
  return ms;
}

/** 'YYYY-MM-DD' of the Nicosia calendar day containing the instant. */
export function nicosiaDayKey(ms: number): string {
  const p = nicosiaParts(ms);
  return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
}

/** Start (00:00 Nicosia) of the Nicosia day containing the instant. */
export function nicosiaDayStartMs(ms: number): number {
  const p = nicosiaParts(ms);
  return nicosiaWallToUtcMs(p.y, p.m, p.d, 0, 0, 0);
}

export interface ParsedDate { ms: number; dateOnly: boolean; floating: boolean }

/**
 * Parse the date formats seen in Cyprus event feeds into an instant.
 *  - '2026-10-24T14:00+3:00'  (EventON writes a one-digit offset hour)  -> offset honoured
 *  - '2026-10-05T00:00:00+03:00' / '...Z'                                -> offset honoured
 *  - '2026-10-10 10:00:00' / '20261009T200000' (no zone)                 -> read as Nicosia wall time
 *  - '2026-10-11' / '20261011'                                           -> date only (all-day), Nicosia midnight
 */
export function parseEventDate(input: unknown): ParsedDate | null {
  if (input == null) return null;
  const s = String(input).trim();
  if (!s) return null;
  // iCal compact: 20261009T200000(Z)? or 20261011
  let m = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    if (!validYmd(y, mo, d)) return null;
    if (m[4] == null) return { ms: nicosiaWallToUtcMs(y, mo, d), dateOnly: true, floating: true };
    const [h, mi, se] = [Number(m[4]), Number(m[5]), Number(m[6] || 0)];
    if (m[7]) return { ms: Date.UTC(y, mo - 1, d, h, mi, se), dateOnly: false, floating: false };
    return { ms: nicosiaWallToUtcMs(y, mo, d, h, mi, se), dateOnly: false, floating: true };
  }
  m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?\s*(Z|[+-]\d{1,2}(?::?\d{2})?)?)?$/i.exec(s);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!validYmd(y, mo, d)) return null;
  if (m[4] == null) return { ms: nicosiaWallToUtcMs(y, mo, d), dateOnly: true, floating: true };
  const [h, mi, se] = [Number(m[4]), Number(m[5]), Number(m[6] || 0)];
  if (h > 23 || mi > 59 || se > 59) return null;
  const z = m[7];
  if (!z) return { ms: nicosiaWallToUtcMs(y, mo, d, h, mi, se), dateOnly: false, floating: true };
  if (/^z$/i.test(z)) return { ms: Date.UTC(y, mo - 1, d, h, mi, se), dateOnly: false, floating: false };
  const om = /^([+-])(\d{1,2})(?::?(\d{2}))?$/.exec(z);
  if (!om) return null;
  const off = (Number(om[2]) * 60 + Number(om[3] || 0)) * (om[1] === '-' ? -1 : 1);
  return { ms: Date.UTC(y, mo - 1, d, h, mi, se) - off * 60_000, dateOnly: false, floating: false };
}

function validYmd(y: number, m: number, d: number): boolean {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1) return false;
  return d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}
