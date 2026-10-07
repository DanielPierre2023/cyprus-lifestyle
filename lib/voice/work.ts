// lib/voice/work.ts — the backlog logic of the voice worker: which edition next, how many per day, when to give up.
// Pure (no I/O), unit-tested. The state lives in one site_settings row (key 'voice_engine'), so no migration is needed.
//
// Consequences of each rule:
//  • enabled defaults to FALSE: nothing is rewritten and no AI money is spent until the owner switches the worker on.
//  • dailyCap bounds spend: at most N paid editions per UTC day, whatever the backlog (default 60).
//  • an edition is tried at most MAX_ATTEMPTS times, and not again within RETRY_AFTER_MS after a failed attempt: a stubborn
//    piece cannot loop forever or burn the budget; after the third failure it is left for a human (the admin report lists it).
//  • the source edition of a piece is repaired before its translations, and the worst scores first.
import type { Desk } from '@/lib/voice/desks';

export const STATE_KEY = 'voice_engine';
export const MAX_ATTEMPTS = 3;
export const RETRY_AFTER_MS = 2 * 3600_000;
export const DEFAULT_DAILY_CAP = 120;
export const RECENT_KEEP = 30;

export interface Attempt { n: number; last: string; ok: boolean; score: number }
export interface RecentRun { at: string; id: string; slug: string; lang: string; before: number; after: number; ok: boolean; changed: boolean; note: string }
export interface VoiceState {
  enabled: boolean; dailyCap: number; day: string; usedToday: number;
  attempts: Record<string, Attempt>; recent: RecentRun[];
  idleUntil: string;   // when nothing needed repair, look again after this time (ISO)
  lastRunAt: string;   // last time a repair was attempted (ISO)
}
export interface Unit { id: string; slug: string; lang: string; isSource: boolean; score: number; high: boolean; ok: boolean; desk: Desk; words: number }

export const unitKey = (id: string, lang: string) => `${id}:${lang}`;
export const dayKey = (now: Date) => now.toISOString().slice(0, 10);

export function parseState(raw: unknown): VoiceState {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const cap = Number(o.dailyCap);
  return {
    enabled: o.enabled === true,   // off until you switch it on at /api/admin/voice?on=1 (it spends API money)
    dailyCap: Number.isFinite(cap) && cap >= 0 && cap <= 1000 ? Math.floor(cap) : DEFAULT_DAILY_CAP,
    day: typeof o.day === 'string' ? o.day : '',
    usedToday: Number.isFinite(Number(o.usedToday)) ? Math.max(0, Math.floor(Number(o.usedToday))) : 0,
    attempts: o.attempts && typeof o.attempts === 'object' ? (o.attempts as Record<string, Attempt>) : {},
    idleUntil: typeof o.idleUntil === 'string' ? o.idleUntil : '',
    lastRunAt: typeof o.lastRunAt === 'string' ? o.lastRunAt : '',
    recent: Array.isArray(o.recent) ? (o.recent as RecentRun[]).slice(0, RECENT_KEEP) : [],
  };
}

/** Roll the daily counter over at midnight UTC. */
export function withDay(s: VoiceState, now: Date): VoiceState {
  const d = dayKey(now);
  return s.day === d ? s : { ...s, day: d, usedToday: 0 };
}

export const MIN_GAP_MS = 9 * 60_000;
export const IDLE_RECHECK_MS = 30 * 60_000;

/** Cheap check used by the background tick: is there any reason to look at the articles right now? */
export function due(s: VoiceState, now: Date): boolean {
  const st = withDay(s, now);
  if (!st.enabled || st.usedToday >= st.dailyCap) return false;
  if (st.idleUntil && now.getTime() < Date.parse(st.idleUntil)) return false;
  if (st.lastRunAt && now.getTime() - Date.parse(st.lastRunAt) < MIN_GAP_MS) return false;
  return true;
}

export function canRun(s: VoiceState, now: Date, force = false): { ok: boolean; reason?: string } {
  const st = withDay(s, now);
  if (!force && !st.enabled) return { ok: false, reason: 'The voice worker is switched off.' };
  if (st.usedToday >= st.dailyCap) return { ok: false, reason: `Daily cap of ${st.dailyCap} editions reached.` };
  return { ok: true };
}

export function eligible(u: Unit, s: VoiceState, now: Date): boolean {
  if (u.ok) return false;
  const a = s.attempts[unitKey(u.id, u.lang)];
  if (!a) return true;
  if (a.n >= MAX_ATTEMPTS) return false;
  if (!a.ok && now.getTime() - Date.parse(a.last) < RETRY_AFTER_MS) return false;
  return true;
}

/** Source editions first, then the worst score first (a "high" machine signature outranks any score). */
export function chooseNext(units: Unit[], s: VoiceState, now: Date): Unit | null {
  const list = units.filter((u) => eligible(u, s, now));
  list.sort((a, b) => Number(b.isSource) - Number(a.isSource) || Number(b.high) - Number(a.high) || b.score - a.score);
  return list[0] || null;
}

export function recordRun(s: VoiceState, u: Unit, r: { ok: boolean; before: number; after: number; changed: boolean; note: string }, now: Date, paid: boolean): VoiceState {
  const st = withDay(s, now);
  const key = unitKey(u.id, u.lang);
  const prev = st.attempts[key];
  const attempts = { ...st.attempts, [key]: { n: (prev?.n || 0) + 1, last: now.toISOString(), ok: r.ok, score: r.after } };
  const run: RecentRun = { at: now.toISOString(), id: u.id, slug: u.slug, lang: u.lang, before: r.before, after: r.after, ok: r.ok, changed: r.changed, note: r.note.slice(0, 160) };
  return { ...st, usedToday: st.usedToday + (paid ? 1 : 0), attempts, lastRunAt: now.toISOString(), idleUntil: '', recent: [run, ...st.recent].slice(0, RECENT_KEEP) };
}

/** Editions that were tried the maximum number of times and still fail: they need a human editor. */
export function stuck(s: VoiceState): string[] {
  return Object.entries(s.attempts).filter(([, a]) => a.n >= MAX_ATTEMPTS && !a.ok).map(([k]) => k);
}
