// lib/map/hours.ts
// ============================================================================
// "Open now" for the map popup — pure, unit-tested. Reads the listing's opening hours
// ({ mon: '09:00–18:00', sat: 'Closed', … }, free text per day as owners and imports
// write it) in Cyprus time and says open / closed / unknown, plus today's text.
// Understands "09:00–18:00", "9 AM – 5:30 PM", split shifts "10-14, 17-23", late
// nights that end after midnight ("20:00–02:00", also from yesterday), "Closed" and
// "Open 24 hours". Anything else stays "unknown" (we then just show today's text).
// ============================================================================
export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Day = (typeof DAYS)[number];

const RANGE = /(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\s*(?:-|–|—|to|until|bis|έως|до)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/gi;

const toMin = (h: string, m: string | undefined, ap: string | undefined): number | null => {
  let hh = Number(h); const mm = Number(m || 0);
  if (!(hh >= 0 && hh <= 24 && mm >= 0 && mm < 60)) return null;
  const p = (ap || '').toLowerCase().replace(/\./g, '');
  if (p === 'pm' && hh < 12) hh += 12;
  if (p === 'am' && hh === 12) hh = 0;
  return hh * 60 + mm;
};

/** Parse one day's text → minute ranges [start, end) (end may exceed 1440 for past-midnight). 'closed' / 'allday' / null (unreadable). */
export function parseDay(text: string | null | undefined): [number, number][] | 'closed' | 'allday' | null {
  const t = String(text || '').trim().toLowerCase();
  if (!t) return null;
  if (/24\s*(h|hours|ώρες|std|часа)|open 24|non-?stop|always open/.test(t)) return 'allday';
  const out: [number, number][] = [];
  for (const m of t.matchAll(RANGE)) {
    // "1 – 5 pm" → both pm; "9 – 5 pm" → 9 am. An unmarked start takes the end's pm only when it is earlier.
    const startAp = m[3] || (m[6] && /p/i.test(m[6]) && Number(m[1]) < Number(m[4]) ? m[6] : undefined);
    const a = toMin(m[1], m[2], startAp);
    let b = toMin(m[4], m[5], m[6]);
    if (a === null || b === null) continue;
    if (b <= a) b += 1440; // ends after midnight
    out.push([a, b]);
  }
  if (out.length) return out;
  if (/closed|κλειστ|închis|geschlossen|zamkni|закрыт|مغلق/.test(t)) return 'closed';
  return null;
}

/** Day + minutes-since-midnight in Cyprus for a given instant. */
export function cyprusClock(at: Date = new Date()): { day: Day; min: number } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Nicosia', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(at);
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  const day = get('weekday').slice(0, 3).toLowerCase() as Day;
  return { day: DAYS.includes(day) ? day : 'mon', min: Number(get('hour')) * 60 + Number(get('minute')) };
}

export interface OpenState { state: 'open' | 'closed' | 'unknown'; today: string | null }

export function openState(hours: Record<string, string> | null | undefined, at: Date = new Date()): OpenState | null {
  if (!hours || !Object.keys(hours).length) return null;
  const { day, min } = cyprusClock(at);
  const today = (hours[day] || '').trim() || null;
  const yesterday = DAYS[(DAYS.indexOf(day) + 6) % 7];
  const prev = parseDay(hours[yesterday]);
  if (Array.isArray(prev) && prev.some(([, b]) => b > 1440 && min < b - 1440)) return { state: 'open', today };
  const cur = parseDay(today);
  if (cur === 'allday') return { state: 'open', today };
  if (cur === 'closed') return { state: 'closed', today };
  if (cur === null) return { state: today ? 'unknown' : 'closed', today };
  return { state: cur.some(([a, b]) => min >= a && min < b) ? 'open' : 'closed', today };
}
