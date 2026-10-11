// lib/booking/partnerFlow.ts
// Pure rules for the partner magic-link response (no login: the link IS the credential).
//
// A partner receives a link to /booking/reply/<token>. The token is 32 random bytes; only its SHA-256 hash is
// stored. Opening the link (GET) changes nothing — mail scanners that pre-fetch links cannot answer for a partner.
// The partner answers with a POST: accept · quote (amount) · decline · propose an alternative (message required).
// A partner may change its answer until the link expires or the booking is closed; every answer is an audit event.
// Nothing a partner writes reaches the guest until a person on the desk ticks "share with guest".
import { eurosToCents } from '@/lib/booking/commission';

export const PARTNER_LINK_TTL_DAYS = 14;
export const PARTNER_REMINDER_AFTER_HOURS = 24;
export const PARTNER_ACTIONS = ['accept', 'quote', 'decline', 'alternative'] as const;
export type PartnerAction = (typeof PARTNER_ACTIONS)[number];
export const PARTNER_STATUSES = ['sent', 'accepted', 'quoted', 'declined', 'alternative'] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

const STATUS_FOR: Record<PartnerAction, PartnerStatus> = { accept: 'accepted', quote: 'quoted', decline: 'declined', alternative: 'alternative' };

export function linkExpiry(now: Date = new Date()): Date { return new Date(now.getTime() + PARTNER_LINK_TTL_DAYS * 86_400_000); }

export type ParsedResponse =
  | { ok: true; action: PartnerAction; status: PartnerStatus; amountCents: number | null; note: string | null }
  | { ok: false; error: string };

export function parsePartnerResponse(raw: Record<string, unknown>): ParsedResponse {
  const action = String(raw.action || '') as PartnerAction;
  if (!(PARTNER_ACTIONS as readonly string[]).includes(action)) return { ok: false, error: 'Unknown answer.' };
  const note = String(raw.note || '').trim().slice(0, 1500) || null;
  let amountCents: number | null = null;
  if (action === 'quote') {
    amountCents = eurosToCents(raw.amount);
    if (amountCents === null || amountCents <= 0) return { ok: false, error: 'Please enter the total price in euro, for example 120 or 120.50.' };
  }
  if (action === 'alternative' && !note) return { ok: false, error: 'Please describe the alternative you propose.' };
  return { ok: true, action, status: STATUS_FOR[action], amountCents, note };
}

export type LinkState = 'ok' | 'expired' | 'closed';
export function linkState(p: { expires_at: string }, bookingStatus: string, now: Date = new Date()): LinkState {
  if (bookingStatus === 'completed' || bookingStatus === 'cancelled' || bookingStatus === 'closed') return 'closed';
  return Date.parse(p.expires_at) > now.getTime() ? 'ok' : 'expired';
}

/** One reminder, 24 h after the request went out, if the partner still has not answered. */
export function needsReminder(p: { status: string; sent_at: string | null; reminded_at: string | null; expires_at: string; email_status?: string | null }, bookingStatus: string, now: Date = new Date()): boolean {
  if (p.status !== 'sent' || p.reminded_at || !p.sent_at || p.email_status === 'not_sent') return false;
  if (linkState(p, bookingStatus, now) !== 'ok') return false;
  return now.getTime() - Date.parse(p.sent_at) >= PARTNER_REMINDER_AFTER_HOURS * 3_600_000;
}

export const isAnswered = (status: string) => status !== 'sent';
/** Which partner answers can the desk show to the guest? Declines never. */
export const shareable = (status: string) => status === 'accepted' || status === 'quoted' || status === 'alternative';

/** Booking status that follows an answer (never moves a booking backwards or out of a confirmed/terminal state). */
export function statusAfterAnswer(bookingStatus: string, answer: PartnerStatus): string {
  if (bookingStatus === 'awaiting_partner' || bookingStatus === 'new' || bookingStatus === 'in_progress') {
    return shareable(answer) ? 'quote_ready' : bookingStatus;
  }
  return bookingStatus;
}
