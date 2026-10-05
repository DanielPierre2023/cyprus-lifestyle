// scripts/tests/_bookingWorld.ts — an in-memory BookingStore + Deps for the booking engine tests (shared by booking.test.ts and
// booking.correspondence.test.ts). Not a test itself.
import { makeRef } from '@/lib/booking/engine';
import { deriveToken } from '@/lib/booking/runtime';
import { hashRestoreToken } from '@/lib/concierge/restoreToken';
import type { BookingRow, BookingStore, Deps, EventRow, LedgerEntryRow, Mail, PartnerRequestRow } from '@/lib/booking/types';

export const SECRET = 'unit-test-secret-0123456789';

export function memory() {
  const bookings = new Map<string, BookingRow>(), partners = new Map<string, PartnerRequestRow>(), ledger = new Map<string, LedgerEntryRow>(), events: (EventRow & { _b: string })[] = [];
  const requests = new Map<string, { status?: string; handled_by?: string | null }>();
  const store: BookingStore = {
    async insertBooking(row) {
      for (const b of bookings.values()) { if (b.ref === row.ref) return { ok: false, conflict: 'ref' }; if (b.concierge_request_id === row.concierge_request_id) return { ok: false, conflict: 'request' }; }
      bookings.set(row.id, { ...row }); return { ok: true, row };
    },
    async findBookingByRequest(id) { return [...bookings.values()].find((b) => b.concierge_request_id === id) || null; },
    async getBooking(id) { return bookings.get(id) || null; },
    async findBookingByRef(ref) { return [...bookings.values()].find((b) => b.ref === ref) || null; },
    async listBookingsForMember(memberId, email, limit) {
      return [...bookings.values()].filter((b) => b.member_id === memberId || (!!email && b.guest_email === email.toLowerCase())).sort((x, y) => (x.created_at < y.created_at ? 1 : -1)).slice(0, limit);
    },
    async getBookingByTokenHash(h) { return [...bookings.values()].find((b) => b.status_token_hash === h) || null; },
    async updateBooking(id, patch) { Object.assign(bookings.get(id)!, patch); },
    async listQueueBookings() { return [...bookings.values()].filter((b) => ['new', 'in_progress', 'awaiting_partner', 'quote_ready'].includes(b.status)); },
    async addEvent(bid, actor, kind, detail) { events.push({ id: String(events.length), booking_id: bid, _b: bid, at: '', actor, kind, detail: detail ?? null }); },
    async insertPartner(row) { partners.set(row.id, { ...row }); },
    async getPartner(id) { return partners.get(id) || null; },
    async getPartnerByTokenHash(h) { return [...partners.values()].find((p) => p.token_hash === h) || null; },
    async listPartners(bid) { return [...partners.values()].filter((p) => p.booking_id === bid); },
    async listUnansweredPartners() { return [...partners.values()].filter((p) => p.status === 'sent' && !p.reminded_at); },
    async updatePartner(id, patch) { Object.assign(partners.get(id)!, patch); },
    async insertLedger(row) { if ([...ledger.values()].some((l) => l.partner_request_id === row.partner_request_id && l.status !== 'void')) return { ok: false, error: 'dup' }; ledger.set(row.id, { ...row }); return { ok: true }; },
    async getLedger(id) { return ledger.get(id) || null; },
    async listLedger(bid) { return [...ledger.values()].filter((l) => l.booking_id === bid); },
    async updateLedger(id, patch) { Object.assign(ledger.get(id)!, patch); },
    async claimSlaAlert(id, at) { const b = bookings.get(id)!; if (b.sla_alerted_at) return false; b.sla_alerted_at = at; return true; },
    async releaseSlaAlert(id) { bookings.get(id)!.sla_alerted_at = null; },
    async claimPartnerReminder(id, at) { const p = partners.get(id)!; if (p.reminded_at || p.status !== 'sent') return false; p.reminded_at = at; return true; },
    async releasePartnerReminder(id) { partners.get(id)!.reminded_at = null; },
    async hasInboundMail(bid, inboundId) { return events.some((e) => e._b === bid && e.kind === 'mail_in' && (e.detail as { inbound_email_id?: string } | null)?.inbound_email_id === inboundId); },
    async syncRequest(id, patch) { requests.set(id, { ...(requests.get(id) || {}), ...patch }); },
  };
  return { store, bookings, partners, ledger, events, requests };
}
export function world(opts: { desk?: string | null; sendOk?: boolean; start?: string } = {}) {
  const m = memory();
  const sent: Mail[] = [];
  let clock = new Date(opts.start || '2026-10-05T08:00:00Z');
  let n = 0;
  const refs = ['CL-AAAAAA', 'CL-AAAAAA', 'CL-BBBBBB', 'CL-CCCCCC', 'CL-DDDDDD', 'CL-EEEEEE', 'CL-FFFFFF'];
  const d: Deps = {
    store: m.store, now: () => clock, newId: () => `id-${++n}`, newRef: () => refs.shift() || makeRef(),
    token: (k, id) => deriveToken(SECRET, k, id), hash: hashRestoreToken,
    send: async (mail) => { if (opts.sendOk === false) return { ok: false, error: 'down' }; sent.push(mail); return { ok: true }; },
    siteUrl: 'https://example.test', deskEmail: opts.desk === undefined ? 'desk@example.test' : opts.desk,
  };
  return { ...m, d, sent, advance: (min: number) => { clock = new Date(clock.getTime() + min * 60000); }, at: (iso: string) => { clock = new Date(iso); } };
}
export const REQ = (id: string, over: Record<string, unknown> = {}) => ({ id, query: 'Boat trip to Akamas', note: '4 adults, Saturday', name: 'Anna', email: 'anna@guest.test', phone: null, locale: 'de', category: 'activities', district: 'Paphos', tier: 'standard', ...over });

