// lib/booking/queue.ts
// Pure rules for the booking queue: lanes, statuses, and THE ORDERING.
//
//   Lane      who                                               first-reply target (lib/booking/sla.ts)
//   member    a signed-in member whose entitlement is active    4 working hours
//   standard  everybody else                                    1 working day
//
// The lane is decided ONCE, when the request arrives, from the member session cookie (never from a
// browser-supplied id or an e-mail address typed into the form) using the same rule as every other member
// benefit: lib/member/entitlement.ts → entitled(). It is stored on the booking and cannot be changed by the guest.
//
// ORDER (owner decision: the membership buys a real priority lane): members first, always; inside a lane the
// bookings still waiting for their first personal reply come before the ones already answered, earliest deadline
// first. The admin page shows a separate "standard requests overdue" counter so the strict ordering can never
// hide a neglected standard request.
import { entitled, type MemberLike } from '@/lib/member/entitlement';

export type Lane = 'member' | 'standard';

export const STATUSES = ['new', 'in_progress', 'awaiting_partner', 'quote_ready', 'confirmed', 'completed', 'cancelled', 'closed'] as const;
export type BookingStatus = (typeof STATUSES)[number];
/** Needs the desk's attention (shown in the queue). */
export const QUEUE_STATUSES: readonly string[] = ['new', 'in_progress', 'awaiting_partner', 'quote_ready'];
export const isQueueStatus = (s: string) => QUEUE_STATUSES.includes(s);
export const isTerminal = (s: string) => s === 'completed' || s === 'cancelled' || s === 'closed';

const NEXT: Record<string, readonly string[]> = {
  new: ['in_progress', 'awaiting_partner', 'cancelled', 'closed'],
  in_progress: ['awaiting_partner', 'quote_ready', 'confirmed', 'cancelled', 'closed'],
  awaiting_partner: ['in_progress', 'quote_ready', 'confirmed', 'cancelled', 'closed'],
  quote_ready: ['in_progress', 'awaiting_partner', 'confirmed', 'cancelled', 'closed'],
  confirmed: ['completed', 'cancelled', 'in_progress'],
  completed: [],
  cancelled: ['in_progress'],
  closed: ['in_progress'],
};
export const canTransition = (from: string, to: string) => from !== to && (NEXT[from] || []).includes(to);

/** Lane for a request, given the member behind the session cookie (or null). */
export function laneFor(member: MemberLike | null | undefined, now: Date = new Date()): Lane {
  return member && entitled(member, now) ? 'member' : 'standard';
}

export interface QueueItem {
  id: string; lane: string; status: string; created_at: string;
  first_response_at: string | null; first_response_due_at: string | null;
}
const t = (iso: string | null | undefined) => { const v = iso ? Date.parse(iso) : NaN; return Number.isFinite(v) ? v : Number.MAX_SAFE_INTEGER; };

/** Comparator: negative = a before b. */
export function compareQueue(a: QueueItem, b: QueueItem): number {
  const la = a.lane === 'member' ? 0 : 1, lb = b.lane === 'member' ? 0 : 1;
  if (la !== lb) return la - lb;                                               // members first — always
  const wa = a.first_response_at ? 1 : 0, wb = b.first_response_at ? 1 : 0;
  if (wa !== wb) return wa - wb;                                               // still waiting for a first reply first
  const da = t(a.first_response_due_at), db = t(b.first_response_due_at);
  if (da !== db) return da - db;                                               // earliest deadline first
  const ca = t(a.created_at), cb = t(b.created_at);
  if (ca !== cb) return ca - cb;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;                               // stable, deterministic
}
export const sortQueue = <T extends QueueItem>(rows: readonly T[]): T[] => [...rows].sort(compareQueue);

export interface QueueSummary { open: number; memberOpen: number; standardOpen: number; unanswered: number; breached: number; standardBreached: number }
export function summarize(rows: readonly (QueueItem & { sla_state?: string })[]): QueueSummary {
  const open = rows.filter((r) => isQueueStatus(r.status));
  return {
    open: open.length,
    memberOpen: open.filter((r) => r.lane === 'member').length,
    standardOpen: open.filter((r) => r.lane !== 'member').length,
    unanswered: open.filter((r) => !r.first_response_at).length,
    breached: open.filter((r) => r.sla_state === 'breached').length,
    standardBreached: open.filter((r) => r.lane !== 'member' && r.sla_state === 'breached').length,
  };
}
