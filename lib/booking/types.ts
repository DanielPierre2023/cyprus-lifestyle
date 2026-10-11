// lib/booking/types.ts — row shapes and the I/O contract of the booking engine (no runtime code).
import type { Lane } from '@/lib/booking/queue';

export interface BookingRow {
  id: string; ref: string; concierge_request_id: string; created_at: string; updated_at: string;
  locale: string; guest_name: string | null; guest_email: string | null; guest_phone: string | null;
  query: string; note: string | null; category: string | null; district: string | null; tier: string;
  lane: Lane; member_id: string | null; status: string;
  assigned_to: string | null; assigned_at: string | null;
  first_response_due_at: string; first_response_at: string | null; sla_target_minutes: number; sla_alerted_at: string | null;
  status_token_hash: string; closed_at: string | null;
}

export interface PartnerRequestRow {
  id: string; booking_id: string; created_at: string; created_by: string | null;
  partner_name: string; partner_email: string | null; partner_locale: string; directory_slug: string | null;
  token_hash: string; expires_at: string; sent_at: string | null; email_status: 'sent' | 'failed' | 'not_sent'; reminded_at: string | null;
  status: string; responded_at: string | null; quote_amount_cents: number | null; response_note: string | null;
  shared_with_guest: boolean; shared_at: string | null;
}

export interface LedgerEntryRow {
  id: string; created_at: string; created_by: string | null; booking_id: string | null; booking_ref: string; partner_request_id: string | null;
  partner_name: string; currency: string; gross_cents: number; rate_bps: number; commission_cents: number;
  status: 'expected' | 'confirmed' | 'void'; note: string | null; voided_at: string | null; voided_by: string | null; void_reason: string | null;
}

export interface EventRow { id: string; booking_id: string; at: string; actor: string; kind: string; detail: Record<string, unknown> | null }

export type InsertResult<T> = { ok: true; row: T } | { ok: false; conflict: 'ref' | 'request' | 'other'; error?: string };

/** Everything the engine needs from the database. Implemented by lib/booking/store.ts (Supabase) and by an in-memory fake in the tests. */
export interface BookingStore {
  insertBooking(row: BookingRow): Promise<InsertResult<BookingRow>>;
  findBookingByRequest(requestId: string): Promise<BookingRow | null>;
  getBooking(id: string): Promise<BookingRow | null>;
  getBookingByTokenHash(hash: string): Promise<BookingRow | null>;
  findBookingByRef(ref: string): Promise<BookingRow | null>;
  /** The member's own bookings (opened while signed in, or sent with the member's verified e-mail), newest first. */
  listBookingsForMember(memberId: string, email: string | null, limit: number): Promise<BookingRow[]>;
  updateBooking(id: string, patch: Partial<BookingRow>): Promise<void>;
  listQueueBookings(): Promise<BookingRow[]>;                    // statuses new / in_progress / awaiting_partner / quote_ready
  addEvent(bookingId: string, actor: string, kind: string, detail?: Record<string, unknown>): Promise<void>;
  insertPartner(row: PartnerRequestRow): Promise<void>;
  getPartner(id: string): Promise<PartnerRequestRow | null>;
  getPartnerByTokenHash(hash: string): Promise<PartnerRequestRow | null>;
  listPartners(bookingId: string): Promise<PartnerRequestRow[]>;
  listUnansweredPartners(): Promise<PartnerRequestRow[]>;        // status 'sent'
  updatePartner(id: string, patch: Partial<PartnerRequestRow>): Promise<void>;
  insertLedger(row: LedgerEntryRow): Promise<{ ok: boolean; error?: string }>;
  getLedger(id: string): Promise<LedgerEntryRow | null>;
  listLedger(bookingId: string): Promise<LedgerEntryRow[]>;
  updateLedger(id: string, patch: Partial<LedgerEntryRow>): Promise<void>;
  /** Atomic claim: true only for the ONE caller that stamped sla_alerted_at (it was empty). Makes overlapping sweeps send one alert. */
  claimSlaAlert(bookingId: string, at: string): Promise<boolean>;
  releaseSlaAlert(bookingId: string): Promise<void>;
  /** Atomic claim of the partner reminder (reminded_at was empty and the partner had not answered). */
  claimPartnerReminder(partnerId: string, at: string): Promise<boolean>;
  releasePartnerReminder(partnerId: string): Promise<void>;
  /** Has this inbound e-mail (inbound_emails.id) already been attached to the booking? */
  hasInboundMail(bookingId: string, inboundEmailId: string): Promise<boolean>;
  syncRequest(requestId: string, patch: { status?: string; handled_by?: string | null }): Promise<void>;
}

export interface Mail { to: string; subject: string; html: string; replyTo?: string }
export interface Deps {
  store: BookingStore;
  now: () => Date;
  newId: () => string;
  newRef: () => string;
  /** Deterministic bearer token for a booking / partner request (HMAC of the id with a server secret). Throws if no secret is configured. */
  token: (kind: 'guest' | 'partner', id: string) => string;
  hash: (token: string) => string;
  send: (mail: Mail) => Promise<{ ok: boolean; error?: string }>;
  siteUrl: string;
  deskEmail: string | null;
}
