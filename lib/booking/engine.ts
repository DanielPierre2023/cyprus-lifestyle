// lib/booking/engine.ts
// The booking engine: concierge request → booking (lane + SLA) → partner magic-link answers → guest status →
// confirmation → commission ledger (record only). All database access goes through the injected BookingStore and all
// side effects (mail, clock, ids, tokens) through Deps, so the whole flow is unit-tested without a database.
//
// Conventions: every state change writes a booking_events row (the audit trail). Mail is best-effort — a failed
// e-mail never loses a booking, and the admin sees whether it went out (and can copy the link instead).
import type { MemberLike } from '@/lib/member/entitlement';
import { canTransition, isTerminal, laneFor, type Lane } from '@/lib/booking/queue';
import { SLA_TARGET_MIN, dueAt, needsBreachAlert } from '@/lib/booking/sla';
import { checkLedgerInput } from '@/lib/booking/commission';
import { isPlausibleEmail, normalizeEmail } from '@/lib/concierge/restoreToken';
import { isLocale } from '@/lib/locales';
import {
  linkExpiry, linkState, needsReminder, parsePartnerResponse, shareable, statusAfterAnswer,
} from '@/lib/booking/partnerFlow';
import { deskMail, guestStatusUrl, guestUpdateMail, partnerReplyUrl, partnerRequestMail } from '@/lib/booking/mail';
import type { BookingRow, Deps, LedgerEntryRow, PartnerRequestRow } from '@/lib/booking/types';

export interface RequestInput {
  id: string; query: string; note: string | null; name: string | null; email: string | null; phone: string | null;
  locale: string; category: string | null; district: string | null; tier: string;
}

const REF_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';           // no 0/O/1/I
/** 'CL-' + 6 unambiguous characters, from an injected random source. */
export function makeRef(rand: () => number = Math.random): string {
  let s = 'CL-';
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[Math.floor(rand() * REF_ALPHABET.length) % REF_ALPHABET.length];
  return s;
}

const iso = (d: Date) => d.toISOString();
const adminUrl = (d: Deps) => `${d.siteUrl.replace(/\/$/, '')}/admin/bookings`;
const requestText = (b: { query: string; note: string | null; category?: string | null; district?: string | null }) =>
  [b.query, b.note, [b.category, b.district].filter(Boolean).join(' · ')].filter(Boolean).join('\n');

// ── 1. a concierge request becomes a booking ────────────────────────────────────────────────────────────────
export type CreateResult =
  | { created: true; booking: BookingRow; statusUrl: string; lane: Lane }
  | { created: false; reason: 'no_contact' | 'exists' | 'error'; booking?: BookingRow };

export async function createBooking(d: Deps, req: RequestInput, member: (MemberLike & { id?: string }) | null): Promise<CreateResult> {
  if (!req.email && !req.phone) return { created: false, reason: 'no_contact' };           // an anonymous demand signal stays in the old inbox
  const existing = await d.store.findBookingByRequest(req.id);
  if (existing) return { created: false, reason: 'exists', booking: existing };

  const now = d.now();
  const lane = laneFor(member, now);                                                        // decided once, here, from the member session
  const id = d.newId();
  const token = d.token('guest', id);
  for (let attempt = 0; attempt < 6; attempt++) {
    const row: BookingRow = {
      id, ref: d.newRef(), concierge_request_id: req.id, created_at: iso(now), updated_at: iso(now),
      locale: isLocale(req.locale) ? req.locale : 'en', guest_name: req.name, guest_email: req.email, guest_phone: req.phone,
      query: req.query, note: req.note, category: req.category, district: req.district, tier: req.tier === 'premium' ? 'premium' : 'standard',
      lane, member_id: lane === 'member' ? (member?.id ?? null) : null, status: 'new',
      assigned_to: null, assigned_at: null,
      first_response_due_at: iso(dueAt(lane, now)), first_response_at: null, sla_target_minutes: SLA_TARGET_MIN[lane], sla_alerted_at: null,
      status_token_hash: d.hash(token), closed_at: null,
    };
    const res = await d.store.insertBooking(row);
    if (res.ok) {
      await d.store.addEvent(row.id, 'system', 'created', { lane, due: row.first_response_due_at, target_working_minutes: row.sla_target_minutes });
      if (lane === 'member' && d.deskEmail) {
        const m = deskMail('member_request', { ref: row.ref, text: row.query, adminUrl: adminUrl(d), lane });
        await d.send({ to: d.deskEmail, subject: m.subject, html: m.html, replyTo: row.guest_email || undefined }).catch(() => undefined);
      }
      return { created: true, booking: row, statusUrl: guestStatusUrl(d.siteUrl, row.locale, token), lane };
    }
    if (res.conflict === 'request') { const e = await d.store.findBookingByRequest(req.id); return { created: false, reason: 'exists', booking: e || undefined }; }
    if (res.conflict !== 'ref') return { created: false, reason: 'error' };
  }
  return { created: false, reason: 'error' };
}

// ── 2. partner outreach ──────────────────────────────────────────────────────────────────────────────────────
export type Actor = string;                                   // 'admin:<email>' | 'system' | 'guest' | 'partner:<name>'
type Fail = { ok: false; error: string };

export async function sendPartnerRequest(d: Deps, actor: Actor, bookingId: string, v: { partnerName: unknown; partnerEmail?: unknown; partnerLocale?: unknown; directorySlug?: unknown }):
  Promise<Fail | { ok: true; partner: PartnerRequestRow; replyUrl: string; emailed: boolean }> {
  const b = await d.store.getBooking(bookingId);
  if (!b) return { ok: false, error: 'Booking not found.' };
  if (isTerminal(b.status)) return { ok: false, error: 'This booking is closed.' };
  const name = String(v.partnerName || '').trim().slice(0, 120);
  if (!name) return { ok: false, error: 'Partner name is required.' };
  const email = normalizeEmail(v.partnerEmail);
  if (email && !isPlausibleEmail(email)) return { ok: false, error: 'That partner e-mail does not look right.' };
  const plocale = isLocale(String(v.partnerLocale)) ? String(v.partnerLocale) : 'en';
  const now = d.now();
  const id = d.newId();
  const token = d.token('partner', id);
  const partner: PartnerRequestRow = {
    id, booking_id: b.id, created_at: iso(now), created_by: actor, partner_name: name, partner_email: email || null, partner_locale: plocale,
    directory_slug: String(v.directorySlug || '').trim().slice(0, 160) || null, token_hash: d.hash(token), expires_at: iso(linkExpiry(now)),
    sent_at: null, email_status: 'not_sent', reminded_at: null, status: 'sent', responded_at: null, quote_amount_cents: null, response_note: null,
    shared_with_guest: false, shared_at: null,
  };
  const replyUrl = partnerReplyUrl(d.siteUrl, plocale, token);
  let emailed = false;
  if (email) {
    const m = partnerRequestMail(plocale, { ref: b.ref, partnerName: name, requestText: requestText(b), expiresAt: partner.expires_at, replyUrl, reminder: false });
    const r = await d.send({ to: email, subject: m.subject, html: m.html }).catch(() => ({ ok: false }));
    emailed = r.ok; partner.email_status = r.ok ? 'sent' : 'failed';
  }
  partner.sent_at = iso(now);                                                // the link exists from now on (copied by hand if e-mail did not go)
  await d.store.insertPartner(partner);
  await d.store.addEvent(b.id, actor, 'partner_requested', { partner: name, emailed, email_status: partner.email_status });
  if (canTransition(b.status, 'awaiting_partner')) {
    await d.store.updateBooking(b.id, { status: 'awaiting_partner', updated_at: iso(now) });
    await d.store.addEvent(b.id, actor, 'status', { from: b.status, to: 'awaiting_partner' });
  }
  await d.store.syncRequest(b.concierge_request_id, { status: 'routed' }).catch(() => undefined);
  return { ok: true, partner, replyUrl, emailed };
}

/** The link for an existing partner request (derived, so it can be shown again). */
export function partnerLink(d: Deps, p: Pick<PartnerRequestRow, 'id' | 'partner_locale'>): string { return partnerReplyUrl(d.siteUrl, p.partner_locale, d.token('partner', p.id)); }
export function guestLink(d: Deps, b: Pick<BookingRow, 'id' | 'locale'>): string { return guestStatusUrl(d.siteUrl, b.locale, d.token('guest', b.id)); }

// ── 3. the partner answers through the magic link ────────────────────────────────────────────────────────────
export async function loadPartnerLink(d: Deps, token: string): Promise<{ partner: PartnerRequestRow; booking: BookingRow; state: 'ok' | 'expired' | 'closed' } | null> {
  const partner = await d.store.getPartnerByTokenHash(d.hash(token));
  if (!partner) return null;
  const booking = await d.store.getBooking(partner.booking_id);
  if (!booking) return null;
  return { partner, booking, state: linkState(partner, booking.status, d.now()) };
}

export async function recordPartnerResponse(d: Deps, token: string, raw: Record<string, unknown>): Promise<Fail | { ok: true; status: string }> {
  const link = await loadPartnerLink(d, token);
  if (!link) return { ok: false, error: 'invalid' };
  if (link.state !== 'ok') return { ok: false, error: link.state };
  const parsed = parsePartnerResponse(raw);
  if (!parsed.ok) return { ok: false, error: parsed.error };
  const { partner, booking } = link;
  const now = d.now();
  const patch: Partial<PartnerRequestRow> = {
    status: parsed.status, responded_at: iso(now), quote_amount_cents: parsed.amountCents, response_note: parsed.note,
  };
  const wasShared = partner.shared_with_guest;
  if (wasShared) { patch.shared_with_guest = false; patch.shared_at = null; }             // a changed answer must be re-approved by the desk
  await d.store.updatePartner(partner.id, patch);
  await d.store.addEvent(booking.id, `partner:${partner.partner_name}`, 'partner_answer', { status: parsed.status, amount_cents: parsed.amountCents, note: parsed.note, unshared: wasShared });
  const next = statusAfterAnswer(booking.status, parsed.status);
  if (next !== booking.status && canTransition(booking.status, next)) {
    await d.store.updateBooking(booking.id, { status: next, updated_at: iso(now) });
    await d.store.addEvent(booking.id, 'system', 'status', { from: booking.status, to: next });
  }
  if (d.deskEmail) {
    const m = deskMail('partner_answer', { ref: booking.ref, text: `${partner.partner_name}: ${parsed.status}`, adminUrl: adminUrl(d), lane: booking.lane, extra: parsed.note || undefined });
    await d.send({ to: d.deskEmail, subject: m.subject, html: m.html }).catch(() => undefined);
  }
  return { ok: true, status: parsed.status };
}

// ── 4. the desk works the booking ────────────────────────────────────────────────────────────────────────────
export async function shareWithGuest(d: Deps, actor: Actor, partnerId: string, share: boolean): Promise<Fail | { ok: true }> {
  const p = await d.store.getPartner(partnerId);
  if (!p) return { ok: false, error: 'Partner request not found.' };
  if (share && !shareable(p.status)) return { ok: false, error: 'Only an accepted, quoted or alternative answer can be shown to the guest.' };
  await d.store.updatePartner(p.id, { shared_with_guest: share, shared_at: share ? iso(d.now()) : null });
  await d.store.addEvent(p.booking_id, actor, share ? 'shared_with_guest' : 'unshared_from_guest', { partner: p.partner_name });
  return { ok: true };
}

async function stamp(d: Deps, b: BookingRow, patch: Partial<BookingRow>) { await d.store.updateBooking(b.id, { ...patch, updated_at: iso(d.now()) }); }

/** The first PERSONAL reply stops the SLA clock. Called by messageGuest and by markFirstReply. */
async function firstReply(d: Deps, actor: Actor, b: BookingRow, channel: string) {
  if (b.first_response_at) return;
  const patch: Partial<BookingRow> = { first_response_at: iso(d.now()) };
  if (b.status === 'new') patch.status = 'in_progress';
  await stamp(d, b, patch);
  await d.store.addEvent(b.id, actor, 'first_reply', { channel, within_target: d.now().getTime() <= Date.parse(b.first_response_due_at) });
}

export async function messageGuest(d: Deps, actor: Actor, bookingId: string, message: unknown): Promise<Fail | { ok: true; emailed: boolean }> {
  const b = await d.store.getBooking(bookingId);
  if (!b) return { ok: false, error: 'Booking not found.' };
  const text = String(message || '').trim().slice(0, 4000);
  if (text.length < 2) return { ok: false, error: 'Write a message first.' };
  if (!b.guest_email) return { ok: false, error: 'This guest left no e-mail address. Reply on the phone/WhatsApp number and press “Mark first reply done”.' };
  const m = guestUpdateMail(b.locale, { ref: b.ref, message: text, statusUrl: guestLink(d, b) });
  const r = await d.send({ to: b.guest_email, subject: m.subject, html: m.html }).catch(() => ({ ok: false, error: 'send failed' }));
  if (!r.ok) return { ok: false, error: 'The e-mail could not be sent (is RESEND_API_KEY configured?). Nothing was recorded.' };
  await d.store.addEvent(b.id, actor, 'guest_message', { text });
  await firstReply(d, actor, b, 'email');
  return { ok: true, emailed: true };
}

export async function markFirstReply(d: Deps, actor: Actor, bookingId: string, channel: unknown): Promise<Fail | { ok: true }> {
  const b = await d.store.getBooking(bookingId);
  if (!b) return { ok: false, error: 'Booking not found.' };
  const ch = ['phone', 'whatsapp', 'email', 'other'].includes(String(channel)) ? String(channel) : 'other';
  if (b.first_response_at) return { ok: false, error: 'A first reply is already recorded.' };
  await firstReply(d, actor, b, ch);
  return { ok: true };
}

export async function assign(d: Deps, actor: Actor, bookingId: string, assignee: unknown): Promise<Fail | { ok: true }> {
  const b = await d.store.getBooking(bookingId);
  if (!b) return { ok: false, error: 'Booking not found.' };
  const who = String(assignee || '').trim().slice(0, 120) || null;
  const patch: Partial<BookingRow> = { assigned_to: who, assigned_at: who ? iso(d.now()) : null };
  if (who && b.status === 'new') patch.status = 'in_progress';
  await stamp(d, b, patch);
  await d.store.addEvent(b.id, actor, 'assigned', { to: who });
  await d.store.syncRequest(b.concierge_request_id, { handled_by: who }).catch(() => undefined);
  return { ok: true };
}

export async function setStatus(d: Deps, actor: Actor, bookingId: string, to: unknown): Promise<Fail | { ok: true }> {
  const b = await d.store.getBooking(bookingId);
  if (!b) return { ok: false, error: 'Booking not found.' };
  const target = String(to || '');
  if (!canTransition(b.status, target)) return { ok: false, error: `A booking cannot move from “${b.status}” to “${target}”.` };
  await stamp(d, b, { status: target, closed_at: isTerminal(target) ? iso(d.now()) : null });
  await d.store.addEvent(b.id, actor, 'status', { from: b.status, to: target });
  const reqStatus = target === 'completed' ? 'fulfilled' : target === 'cancelled' || target === 'closed' ? 'closed' : 'routed';
  await d.store.syncRequest(b.concierge_request_id, { status: reqStatus }).catch(() => undefined);
  return { ok: true };
}

export async function addNote(d: Deps, actor: Actor, bookingId: string, text: unknown): Promise<Fail | { ok: true }> {
  const b = await d.store.getBooking(bookingId);
  if (!b) return { ok: false, error: 'Booking not found.' };
  const t = String(text || '').trim().slice(0, 2000);
  if (!t) return { ok: false, error: 'Write a note first.' };
  await d.store.addEvent(b.id, actor, 'note', { text: t });
  return { ok: true };
}

// ── 5. commission ledger — RECORD ONLY ───────────────────────────────────────────────────────────────────────
export async function recordCommission(d: Deps, actor: Actor, partnerId: string, v: { grossCents?: unknown; rateBps: unknown; note?: unknown }): Promise<Fail | { ok: true; entry: LedgerEntryRow }> {
  const p = await d.store.getPartner(partnerId);
  if (!p) return { ok: false, error: 'Partner request not found.' };
  const b = await d.store.getBooking(p.booking_id);
  if (!b) return { ok: false, error: 'Booking not found.' };
  if (b.status !== 'confirmed' && b.status !== 'completed') return { ok: false, error: 'A commission can only be recorded once the booking is confirmed.' };
  if (p.status !== 'accepted' && p.status !== 'quoted' && p.status !== 'alternative') return { ok: false, error: 'This partner has not accepted the booking.' };
  const chk = checkLedgerInput({ grossCents: v.grossCents ?? p.quote_amount_cents, rateBps: v.rateBps });
  if (!chk.ok) return { ok: false, error: chk.error };
  const existing = await d.store.listLedger(b.id);
  if (existing.some((e) => e.partner_request_id === p.id && e.status !== 'void')) return { ok: false, error: 'A commission is already recorded for this partner — void it first to correct it.' };
  const entry: LedgerEntryRow = {
    id: d.newId(), created_at: iso(d.now()), created_by: actor, booking_id: b.id, booking_ref: b.ref, partner_request_id: p.id, partner_name: p.partner_name,
    currency: chk.currency, gross_cents: chk.grossCents, rate_bps: chk.rateBps, commission_cents: chk.commissionCents, status: 'expected',
    note: String(v.note || '').trim().slice(0, 500) || null, voided_at: null, voided_by: null, void_reason: null,
  };
  const r = await d.store.insertLedger(entry);
  if (!r.ok) return { ok: false, error: r.error || 'Could not record the commission.' };
  await d.store.addEvent(b.id, actor, 'commission_recorded', { partner: p.partner_name, gross_cents: entry.gross_cents, rate_bps: entry.rate_bps, commission_cents: entry.commission_cents });
  return { ok: true, entry };
}

export async function confirmCommission(d: Deps, actor: Actor, ledgerId: string): Promise<Fail | { ok: true }> {
  const e = await d.store.getLedger(ledgerId);
  if (!e) return { ok: false, error: 'Ledger entry not found.' };
  if (e.status !== 'expected') return { ok: false, error: 'Only an expected commission can be confirmed.' };
  await d.store.updateLedger(e.id, { status: 'confirmed' });
  if (e.booking_id) await d.store.addEvent(e.booking_id, actor, 'commission_confirmed', { ledger: e.id });
  return { ok: true };
}

export async function voidCommission(d: Deps, actor: Actor, ledgerId: string, reason: unknown): Promise<Fail | { ok: true }> {
  const e = await d.store.getLedger(ledgerId);
  if (!e) return { ok: false, error: 'Ledger entry not found.' };
  if (e.status === 'void') return { ok: false, error: 'Already void.' };
  const why = String(reason || '').trim().slice(0, 300);
  if (!why) return { ok: false, error: 'A reason is required to void a ledger entry.' };
  await d.store.updateLedger(e.id, { status: 'void', voided_at: iso(d.now()), voided_by: actor, void_reason: why });
  if (e.booking_id) await d.store.addEvent(e.booking_id, actor, 'commission_voided', { ledger: e.id, reason: why });
  return { ok: true };
}

// ── 6. the sweep: SLA breach alerts + one partner reminder ───────────────────────────────────────────────────
export interface SweepResult { checked: number; breachAlerts: number; noInbox: number; reminders: number }
export async function sweep(d: Deps): Promise<SweepResult> {
  const now = d.now();
  const out: SweepResult = { checked: 0, breachAlerts: 0, noInbox: 0, reminders: 0 };
  const queue = await d.store.listQueueBookings();
  out.checked = queue.length;
  for (const b of queue) {
    if (!needsBreachAlert(b, now)) continue;
    if (!d.deskEmail) { out.noInbox++; continue; }                                         // stays un-stamped: alerts the moment an inbox exists
    const m = deskMail('breach', { ref: b.ref, text: b.query, adminUrl: adminUrl(d), lane: b.lane });
    const r = await d.send({ to: d.deskEmail, subject: m.subject, html: m.html }).catch(() => ({ ok: false }));
    if (r.ok) { await d.store.updateBooking(b.id, { sla_alerted_at: iso(now) }); await d.store.addEvent(b.id, 'system', 'sla_breach_alert', { lane: b.lane }); out.breachAlerts++; }
  }
  const byId = new Map(queue.map((b) => [b.id, b] as const));
  for (const p of await d.store.listUnansweredPartners()) {
    const b = byId.get(p.booking_id) || (await d.store.getBooking(p.booking_id));
    if (!b || !p.partner_email || !needsReminder(p, b.status, now)) continue;
    const m = partnerRequestMail(p.partner_locale, { ref: b.ref, partnerName: p.partner_name, requestText: requestText(b), expiresAt: p.expires_at, replyUrl: partnerLink(d, p), reminder: true });
    const r = await d.send({ to: p.partner_email, subject: m.subject, html: m.html }).catch(() => ({ ok: false }));
    if (r.ok) { await d.store.updatePartner(p.id, { reminded_at: iso(now) }); await d.store.addEvent(b.id, 'system', 'partner_reminder', { partner: p.partner_name }); out.reminders++; }
  }
  return out;
}
