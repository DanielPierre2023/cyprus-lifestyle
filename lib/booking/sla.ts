// lib/booking/sla.ts
// Pure SLA rules for the booking queue (no I/O). The SLA clock counts WORKING time in Cyprus
// (Europe/Nicosia): Monday–Friday, WORK_START–WORK_END. Public holidays are NOT modelled
// (HOLIDAYS is empty on purpose — fill it in if the desk wants them excluded); until then a request
// that arrives before a holiday will show as overdue earlier than the desk's real working time.
//
// What the SLA is: an internal, measured TARGET for the first personal reply to the guest.
// It is enforced in code as (a) a deadline stamped on every booking, (b) a live timer in the admin
// queue, (c) a one-off breach alert to the desk (lib/booking/engine.ts sweep). A person still has to
// do the replying — nothing here can promise that a reply happens, so public copy only says "target".
import type { Lane } from '@/lib/booking/queue';

export const WORK_START_MIN = 9 * 60;          // 09:00 Cyprus time
export const WORK_END_MIN = 18 * 60;           // 18:00 Cyprus time
export const WORK_DAY_MIN = WORK_END_MIN - WORK_START_MIN;
export const TIME_ZONE = 'Europe/Nicosia';
export const HOLIDAYS: readonly string[] = [];  // 'YYYY-MM-DD' local dates that are not working days

/** First-reply targets in WORKING minutes. Member: 4 working hours. Standard: one working day. */
export const SLA_TARGET_MIN: Record<Lane, number> = { member: 4 * 60, standard: WORK_DAY_MIN };
/** "Due soon" warning window, in wall-clock minutes before the deadline. */
export const DUE_SOON_MIN = 60;

const dtf = new Intl.DateTimeFormat('en-GB', {
  timeZone: TIME_ZONE, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short',
});
const DOW: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

export interface LocalParts { y: number; m: number; d: number; hh: number; mm: number; dow: number }

/** Wall-clock parts of an instant in Cyprus. */
export function localParts(ms: number): LocalParts {
  const o: Record<string, string> = {};
  for (const p of dtf.formatToParts(new Date(ms))) o[p.type] = p.value;
  return { y: +o.year, m: +o.month, d: +o.day, hh: +o.hour, mm: +o.minute, dow: DOW[o.weekday] ?? 1 };
}

/** The UTC instant of a Cyprus wall-clock time (handles DST; two fixed-point passes are exact for this zone). */
export function localToUtc(y: number, m: number, d: number, hh: number, mm: number): number {
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let guess = wall;
  for (let i = 0; i < 3; i++) {
    const p = localParts(guess);
    const seen = Date.UTC(p.y, p.m - 1, p.d, p.hh, p.mm);
    guess += wall - seen;
  }
  return guess;
}

const iso = (p: LocalParts) => `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
export const isWorkingDay = (p: LocalParts) => p.dow >= 1 && p.dow <= 5 && !HOLIDAYS.includes(iso(p));

function nextWorkingOpen(ms: number): number {
  let p = localParts(ms);
  for (let i = 0; i < 14; i++) {
    // tomorrow's local date at 12:00 is safe from DST edges; take its parts, then open time
    const noon = localToUtc(p.y, p.m, p.d, 12, 0) + 86_400_000;
    p = localParts(noon);
    if (isWorkingDay(p)) return localToUtc(p.y, p.m, p.d, WORK_START_MIN / 60, 0);
  }
  return ms;
}

/** The instant `minutes` WORKING minutes after `startMs`. Time outside working hours does not count. */
export function addWorkingMinutes(startMs: number, minutes: number): number {
  let cur = startMs;
  let left = Math.max(0, Math.round(minutes));
  for (let guard = 0; guard < 400; guard++) {
    const p = localParts(cur);
    const nowMin = p.hh * 60 + p.mm;
    if (!isWorkingDay(p) || nowMin >= WORK_END_MIN) { cur = nextWorkingOpen(cur); continue; }
    if (nowMin < WORK_START_MIN) { cur = localToUtc(p.y, p.m, p.d, WORK_START_MIN / 60, 0); continue; }
    const room = WORK_END_MIN - nowMin;
    if (left <= room) return cur + left * 60_000;
    left -= room;
    cur += room * 60_000;     // exactly the end of the working day; the next loop pass moves to the next opening
  }
  return cur;
}

export function dueAt(lane: Lane, createdAt: Date): Date {
  return new Date(addWorkingMinutes(createdAt.getTime(), SLA_TARGET_MIN[lane]));
}

export type SlaState = 'met' | 'met_late' | 'on_track' | 'due_soon' | 'breached' | 'not_applicable';
export interface SlaView { state: SlaState; minutesLeft: number | null }

export interface SlaInput { first_response_due_at: string | null; first_response_at: string | null; status?: string }

/** Where a booking stands against its first-reply target. Cancelled/closed bookings that never got a reply are not applicable. */
export function slaState(b: SlaInput, now: Date = new Date()): SlaView {
  const due = b.first_response_due_at ? Date.parse(b.first_response_due_at) : NaN;
  if (!Number.isFinite(due)) return { state: 'not_applicable', minutesLeft: null };
  if (b.first_response_at) {
    const at = Date.parse(b.first_response_at);
    return { state: Number.isFinite(at) && at <= due ? 'met' : 'met_late', minutesLeft: null };
  }
  if (b.status === 'cancelled' || b.status === 'closed') return { state: 'not_applicable', minutesLeft: null };
  const left = Math.round((due - now.getTime()) / 60_000);
  if (left < 0) return { state: 'breached', minutesLeft: left };
  return { state: left <= DUE_SOON_MIN ? 'due_soon' : 'on_track', minutesLeft: left };
}

/** "3h 20m left" / "overdue by 1d 2h" — admin-facing, English. */
export function formatMinutes(min: number | null): string {
  if (min === null) return '';
  const a = Math.abs(min);
  const d = Math.floor(a / 1440), h = Math.floor((a % 1440) / 60), m = a % 60;
  const s = d ? `${d}d ${h}h` : h ? `${h}h ${m}m` : `${m}m`;
  return min < 0 ? `overdue by ${s}` : `${s} left`;
}

/** Should the desk be alerted now? Once per booking (the caller stamps sla_alerted_at). */
export function needsBreachAlert(b: SlaInput & { sla_alerted_at?: string | null }, now: Date = new Date()): boolean {
  return !b.sla_alerted_at && slaState(b, now).state === 'breached';
}
