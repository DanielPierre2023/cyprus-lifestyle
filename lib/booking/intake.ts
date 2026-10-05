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
import type { Lane } from '@/lib/booking/queue';

export interface Intake { ref: string; lane: Lane; statusUrl: string; laneHtml: string; ctaLabel: string }

export async function openBookingForRequest(sb: SupabaseClient, sessionCookie: string | undefined, req: RequestInput): Promise<Intake | null> {
  try {
    const session = await resolveSession(sb, sessionCookie);                 // null for visitors; the cookie is HttpOnly + server-verified
    const res = await createBooking(bookingDeps(sb), req, session ? { ...session.member } : null);
    if (!res.created) return null;
    return {
      ref: res.booking.ref, lane: res.lane, statusUrl: res.statusUrl,
      laneHtml: guestLaneHtml(res.booking.locale, res.lane, res.booking.ref), ctaLabel: bookingCopy(res.booking.locale).trackCta,
    };
  } catch (e) {
    await logServerError('booking-intake', e).catch(() => undefined);
    return null;
  }
}
