// lib/booking/intake.ts — called by POST /api/concierge/request right after the request row is saved.
// Opens the booking (lane from the member session cookie, SLA deadline, private status link) and returns the pieces the
// guest acknowledgement e-mail needs. NEVER throws and never blocks the request: if anything fails the guest gets the
// normal acknowledgement and the request is still in the old inbox.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { resolveSession } from '@/lib/member/session';
import { createBooking, type RequestInput } from '@/lib/booking/engine';
import { bookingDeps } from '@/lib/booking/runtime';
import { guestLaneHtml } from '@/lib/booking/mail';
import { bookingCopy } from '@/lib/booking/copy';
import { logServerError } from '@/lib/monitor.server';
import { outboundRecord, recordToDetail, type MailKind, type MailParty } from '@/lib/booking/correspondence';
import type { Lane } from '@/lib/booking/queue';

export interface Intake { bookingId: string; ref: string; lane: Lane; statusUrl: string; laneHtml: string; ctaLabel: string }

export async function openBookingForRequest(sb: SupabaseClient, sessionCookie: string | undefined, req: RequestInput): Promise<Intake | null> {
  try {
    const session = await resolveSession(sb, sessionCookie);                 // null for visitors; the cookie is HttpOnly + server-verified
    const res = await createBooking(bookingDeps(sb), req, session ? { ...session.member } : null);
    if (!res.created) return null;
    return {
      bookingId: res.booking.id, ref: res.booking.ref, lane: res.lane, statusUrl: res.statusUrl,
      laneHtml: guestLaneHtml(res.booking.locale, res.lane, res.booking.ref), ctaLabel: bookingCopy(res.booking.locale).trackCta,
    };
  } catch (e) {
    await logServerError('booking-intake', e).catch(() => undefined);
    return null;
  }
}

/** Keep an e-mail that /api/concierge/request sends itself (the guest acknowledgement, the desk notification) in the booking history.
 *  Best-effort: never throws. `result` is what sendEmail returned. */
export async function logRouteMail(sb: SupabaseClient, bookingId: string, kind: MailKind, party: MailParty, mail: { to: string; subject: string; html: string }, result: { ok: boolean; error?: string }): Promise<void> {
  try {
    await bookingDeps(sb).store.addEvent(bookingId, 'system', 'mail_out', recordToDetail(outboundRecord(kind, party, mail, result)));
  } catch (e) {
    await logServerError('booking-mail-log', e).catch(() => undefined);
  }
}
