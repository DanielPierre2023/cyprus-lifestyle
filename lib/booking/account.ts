// lib/booking/account.ts — a signed-in member's own bookings for /account (server-side; builds a view model, no HTML).
// "Own" = opened while signed in (bookings.member_id) OR sent with the member's verified e-mail address (the sign-in link is
// e-mailed to that address). Shows reference, status, lane, and how many partner answers the desk has SHARED with the guest, plus the
// guest's private status link (derived server-side; the same link the guest received by e-mail). Partner e-mails, prices the desk
// has not approved, internal notes and the commission ledger are never part of this view.
import { guestLink } from '@/lib/booking/engine';
import type { Lane } from '@/lib/booking/queue';
import type { Deps } from '@/lib/booking/types';

export interface MemberBookingView {
  ref: string; status: string; lane: Lane; createdAt: string; query: string; sharedAnswers: number; statusUrl: string;
}

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

export async function memberBookings(d: Deps, member: { id: string; email: string | null }, limit = 20): Promise<MemberBookingView[]> {
  const rows = await d.store.listBookingsForMember(member.id, member.email, limit);
  const out: MemberBookingView[] = [];
  for (const b of rows) {
    const partners = await d.store.listPartners(b.id);
    out.push({
      ref: b.ref, status: b.status, lane: b.lane, createdAt: b.created_at, query: clip(b.query, 140),
      sharedAnswers: partners.filter((p) => p.shared_with_guest).length, statusUrl: guestLink(d, b),
    });
  }
  return out;
}
