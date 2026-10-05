// lib/booking/store.ts — the Supabase implementation of BookingStore (service role; the tables have RLS on and no policies).
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { BookingRow, BookingStore, EventRow, LedgerEntryRow, PartnerRequestRow } from '@/lib/booking/types';

export const BOOKING_COLS = 'id, ref, concierge_request_id, created_at, updated_at, locale, guest_name, guest_email, guest_phone, query, note, category, district, tier, lane, member_id, status, assigned_to, assigned_at, first_response_due_at, first_response_at, sla_target_minutes, sla_alerted_at, status_token_hash, closed_at';
export const PARTNER_COLS = 'id, booking_id, created_at, created_by, partner_name, partner_email, partner_locale, directory_slug, token_hash, expires_at, sent_at, email_status, reminded_at, status, responded_at, quote_amount_cents, response_note, shared_with_guest, shared_at';
export const LEDGER_COLS = 'id, created_at, created_by, booking_id, booking_ref, partner_request_id, partner_name, currency, gross_cents, rate_bps, commission_cents, status, note, voided_at, voided_by, void_reason';
const QUEUE = ['new', 'in_progress', 'awaiting_partner', 'quote_ready'];

export function supabaseStore(sb: SupabaseClient): BookingStore {
  const one = async <T>(q: PromiseLike<{ data: unknown; error: unknown }>): Promise<T | null> => { const { data } = await q; return (data as T) || null; };
  const many = async <T>(q: PromiseLike<{ data: unknown; error: unknown }>): Promise<T[]> => { const { data } = await q; return ((data as T[]) || []); };
  const must = async (q: PromiseLike<{ error: { message: string } | null }>) => { const { error } = await q; if (error) throw new Error(error.message); };
  return {
    async insertBooking(row) {
      const { error } = await sb.from('bookings').insert(row);
      if (!error) return { ok: true, row };
      const e = error as { code?: string; message: string };
      if (e.code === '23505') return { ok: false, conflict: /ref/.test(e.message) ? 'ref' : /request/.test(e.message) ? 'request' : 'other', error: e.message };
      return { ok: false, conflict: 'other', error: e.message };
    },
    findBookingByRequest: (id) => one<BookingRow>(sb.from('bookings').select(BOOKING_COLS).eq('concierge_request_id', id).maybeSingle()),
    getBooking: (id) => one<BookingRow>(sb.from('bookings').select(BOOKING_COLS).eq('id', id).maybeSingle()),
    getBookingByTokenHash: (h) => one<BookingRow>(sb.from('bookings').select(BOOKING_COLS).eq('status_token_hash', h).maybeSingle()),
    updateBooking: (id, patch) => must(sb.from('bookings').update(patch).eq('id', id)),
    listQueueBookings: () => many<BookingRow>(sb.from('bookings').select(BOOKING_COLS).in('status', QUEUE).limit(1000)),
    addEvent: async (bookingId, actor, kind, detail) => { await sb.from('booking_events').insert({ booking_id: bookingId, actor: actor.slice(0, 160), kind, detail: detail ?? null }); },
    insertPartner: (row) => must(sb.from('booking_partner_requests').insert(row)),
    getPartner: (id) => one<PartnerRequestRow>(sb.from('booking_partner_requests').select(PARTNER_COLS).eq('id', id).maybeSingle()),
    getPartnerByTokenHash: (h) => one<PartnerRequestRow>(sb.from('booking_partner_requests').select(PARTNER_COLS).eq('token_hash', h).maybeSingle()),
    listPartners: (bid) => many<PartnerRequestRow>(sb.from('booking_partner_requests').select(PARTNER_COLS).eq('booking_id', bid).order('created_at')),
    listUnansweredPartners: () => many<PartnerRequestRow>(sb.from('booking_partner_requests').select(PARTNER_COLS).eq('status', 'sent').is('reminded_at', null).limit(500)),
    updatePartner: (id, patch) => must(sb.from('booking_partner_requests').update(patch).eq('id', id)),
    async insertLedger(row) { const { error } = await sb.from('commission_ledger').insert(row); return error ? { ok: false, error: error.message } : { ok: true }; },
    getLedger: (id) => one<LedgerEntryRow>(sb.from('commission_ledger').select(LEDGER_COLS).eq('id', id).maybeSingle()),
    listLedger: (bid) => many<LedgerEntryRow>(sb.from('commission_ledger').select(LEDGER_COLS).eq('booking_id', bid).order('created_at')),
    updateLedger: (id, patch) => must(sb.from('commission_ledger').update(patch).eq('id', id)),
    async syncRequest(requestId, patch) {
      const p: Record<string, unknown> = {};
      if (patch.status) { p.status = patch.status; p.handled_at = new Date().toISOString(); }
      if (patch.handled_by !== undefined) p.handled_by = patch.handled_by;
      if (Object.keys(p).length) await sb.from('concierge_requests').update(p).eq('id', requestId);
    },
  };
}

export async function listEvents(sb: SupabaseClient, bookingId: string): Promise<EventRow[]> {
  const { data } = await sb.from('booking_events').select('id, booking_id, at, actor, kind, detail').eq('booking_id', bookingId).order('at', { ascending: false }).limit(200);
  return (data as EventRow[]) || [];
}
