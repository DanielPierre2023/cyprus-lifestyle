// Booking engine (increment 2.2): SLA clock, lane + queue order, partner magic-link flow, commission ledger, sweep, copy parity.
import { addWorkingMinutes, dueAt, slaState, needsBreachAlert, formatMinutes, localParts, SLA_TARGET_MIN, WORK_START_MIN, WORK_END_MIN } from '@/lib/booking/sla';
import { laneFor, sortQueue, compareQueue, summarize, canTransition, isTerminal, STATUSES } from '@/lib/booking/queue';
import { computeCommissionCents, checkLedgerInput, eurosToCents, percentToBps, ledgerTotals } from '@/lib/booking/commission';
import { parsePartnerResponse, linkState, needsReminder, statusAfterAnswer, shareable, linkExpiry } from '@/lib/booking/partnerFlow';
import {
  createBooking, sendPartnerRequest, recordPartnerResponse, shareWithGuest, messageGuest, markFirstReply, assign, setStatus, addNote,
  recordCommission, confirmCommission, voidCommission, sweep, makeRef, loadPartnerLink, guestLink, partnerLink,
} from '@/lib/booking/engine';
import { deriveToken, linkSecret, deskInbox } from '@/lib/booking/runtime';
import { BOOKING_COPY, bookingCopy, fill } from '@/lib/booking/copy';
import { guestUpdateMail, partnerRequestMail, guestLaneHtml, guestStatusUrl, partnerReplyUrl } from '@/lib/booking/mail';
import { hashRestoreToken, isPlausibleRestoreToken } from '@/lib/concierge/restoreToken';
import { LOCALES } from '@/lib/locales';
import type { BookingRow, BookingStore, Deps, EventRow, LedgerEntryRow, Mail, PartnerRequestRow } from '@/lib/booking/types';
import { eq, ok, report } from './_harness';

const Z = (s: string) => Date.parse(s);
const local = (ms: number) => { const p = localParts(ms); return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')} ${String(p.hh).padStart(2, '0')}:${String(p.mm).padStart(2, '0')}`; };

// ── SLA clock (Cyprus working time, UTC+3 until 25 Oct 2026 then UTC+2) ───────────────────────────────────────
eq('working window', [WORK_START_MIN, WORK_END_MIN], [540, 1080]);
eq('targets', SLA_TARGET_MIN, { member: 240, standard: 540 });
eq('Mon 11:00 + member 4h = Mon 15:00', local(addWorkingMinutes(Z('2026-10-05T08:00:00Z'), 240)), '2026-10-05 15:00');
eq('Mon 11:00 + standard 9h = Tue 11:00', local(addWorkingMinutes(Z('2026-10-05T08:00:00Z'), 540)), '2026-10-06 11:00');
eq('Fri 17:00 + 4h rolls over the weekend to Mon 12:00', local(addWorkingMinutes(Z('2026-10-09T14:00:00Z'), 240)), '2026-10-12 12:00');
eq('Saturday request: clock starts Monday 09:00', local(addWorkingMinutes(Z('2026-10-10T07:00:00Z'), 240)), '2026-10-12 13:00');
eq('Sunday night request', local(addWorkingMinutes(Z('2026-10-11T20:00:00Z'), 60)), '2026-10-12 10:00');
eq('Mon 06:00 (before opening) + 4h = 13:00', local(addWorkingMinutes(Z('2026-10-05T03:00:00Z'), 240)), '2026-10-05 13:00');
eq('Mon 19:00 (after closing) + 1h = Tue 10:00', local(addWorkingMinutes(Z('2026-10-05T16:00:00Z'), 60)), '2026-10-06 10:00');
eq('across the DST change: Fri 23 Oct 17:00 (+3) + 9h = Mon 26 Oct 17:00 (+2)', local(addWorkingMinutes(Z('2026-10-23T14:00:00Z'), 540)), '2026-10-26 17:00');
eq('exactly at closing time (18:00) the clock starts next morning', local(addWorkingMinutes(Z('2026-10-05T15:00:00Z'), 240)), '2026-10-06 13:00');
eq('0 minutes in working time stays put', local(addWorkingMinutes(Z('2026-10-05T08:00:00Z'), 0)), '2026-10-05 11:00');
eq('dueAt(member) ISO', dueAt('member', new Date('2026-10-05T08:00:00Z')).toISOString(), '2026-10-05T12:00:00.000Z');
ok('a member deadline is never later than a standard one from the same instant', [Z('2026-10-05T08:00:00Z'), Z('2026-10-09T15:00:00Z'), Z('2026-10-10T10:00:00Z'), Z('2026-10-23T14:30:00Z')].every((t) => dueAt('member', new Date(t)) <= dueAt('standard', new Date(t))));

const NOW = new Date('2026-10-05T10:00:00Z');
const mins = (m: number) => new Date(NOW.getTime() + m * 60000).toISOString();
eq('on track', slaState({ first_response_due_at: mins(120), first_response_at: null }, NOW).state, 'on_track');
eq('due soon', slaState({ first_response_due_at: mins(30), first_response_at: null }, NOW).state, 'due_soon');
eq('breached', slaState({ first_response_due_at: mins(-5), first_response_at: null }, NOW), { state: 'breached', minutesLeft: -5 });
eq('met', slaState({ first_response_due_at: mins(-5), first_response_at: mins(-10) }, NOW).state, 'met');
eq('met late', slaState({ first_response_due_at: mins(-10), first_response_at: mins(-5) }, NOW).state, 'met_late');
eq('cancelled without reply → n/a', slaState({ first_response_due_at: mins(-500), first_response_at: null, status: 'cancelled' }, NOW).state, 'not_applicable');
eq('bad date → n/a', slaState({ first_response_due_at: null, first_response_at: null }, NOW).state, 'not_applicable');
ok('alert once', needsBreachAlert({ first_response_due_at: mins(-5), first_response_at: null }, NOW) && !needsBreachAlert({ first_response_due_at: mins(-5), first_response_at: null, sla_alerted_at: mins(-1) }, NOW));
eq('format', [formatMinutes(200), formatMinutes(-1500), formatMinutes(45), formatMinutes(null)], ['3h 20m left', 'overdue by 1d 1h', '45m left', '']);

// ── lane = the member entitlement rule ───────────────────────────────────────────────────────────────────────
eq('visitor → standard', laneFor(null, NOW), 'standard');
eq('active member → member', laneFor({ status: 'active', stripe_subscription_id: 'sub_1' }, NOW), 'member');
eq('complimentary member → member', laneFor({ status: 'active', stripe_subscription_id: null }, NOW), 'member');
eq('payment problem inside grace → member', laneFor({ status: 'failed', current_period_end: '2026-10-01T00:00:00Z' }, NOW), 'member');
eq('payment problem past grace → standard', laneFor({ status: 'failed', current_period_end: '2026-09-01T00:00:00Z' }, NOW), 'standard');
eq('cancelled member → standard', laneFor({ status: 'canceled', current_period_end: '2026-12-01T00:00:00Z' }, NOW), 'standard');

// ── queue order: members first, always ───────────────────────────────────────────────────────────────────────
const q = (id: string, lane: string, due: number, created: number, replied = false) =>
  ({ id, lane, status: 'new', created_at: mins(created), first_response_due_at: mins(due), first_response_at: replied ? mins(created + 1) : null });
const sorted = sortQueue([
  q('s-old-overdue', 'standard', -900, -2000), q('m-new', 'member', 230, 0), q('s-new', 'standard', 540, 0),
  q('m-replied', 'member', -10, -300, true), q('m-urgent', 'member', 15, -225), q('s-urgent', 'standard', 5, -535),
]).map((r) => r.id);
eq('order', sorted, ['m-urgent', 'm-new', 'm-replied', 's-old-overdue', 's-urgent', 's-new']);
ok('a brand-new member request outranks a standard request that is days overdue', compareQueue(q('m', 'member', 240, 0), q('s', 'standard', -5000, -6000)) < 0);
ok('ties are deterministic', compareQueue(q('a', 'member', 5, 0), q('b', 'member', 5, 0)) < 0 && compareQueue(q('b', 'member', 5, 0), q('a', 'member', 5, 0)) > 0);
ok('sort does not mutate its input', (() => { const inp = [q('x', 'standard', 1, 0), q('y', 'member', 1, 0)]; sortQueue(inp); return inp[0].id === 'x'; })());
eq('summary', summarize([{ ...q('a', 'member', 1, 0), sla_state: 'breached' }, { ...q('b', 'standard', 1, 0), sla_state: 'breached' }, { ...q('c', 'standard', 1, 0, true) }, { ...q('d', 'standard', 1, 0), status: 'confirmed' }]),
  { open: 3, memberOpen: 1, standardOpen: 2, unanswered: 2, breached: 2, standardBreached: 1 });
ok('status machine', canTransition('new', 'awaiting_partner') && canTransition('confirmed', 'completed') && !canTransition('completed', 'new') && !canTransition('new', 'new') && !canTransition('new', 'completed') && isTerminal('closed') && STATUSES.length === 8);

// ── commission arithmetic (record only) ──────────────────────────────────────────────────────────────────────
eq('12.5 % of 120.50', computeCommissionCents(12050, 1250), 1506);
eq('half rounds up', [computeCommissionCents(5, 1000), computeCommissionCents(15, 1000), computeCommissionCents(1050, 1000)], [1, 2, 105]);
eq('0 %', computeCommissionCents(10000, 0), 0);
eq('validation ok', checkLedgerInput({ grossCents: 12000, rateBps: 1000 }), { ok: true, grossCents: 12000, rateBps: 1000, commissionCents: 1200, currency: 'EUR' });
ok('validation rejects', !checkLedgerInput({ grossCents: 0, rateBps: 1000 }).ok && !checkLedgerInput({ grossCents: 10.5, rateBps: 1000 }).ok && !checkLedgerInput({ grossCents: 100, rateBps: 6000 }).ok
  && !checkLedgerInput({ grossCents: 100, rateBps: -1 }).ok && !checkLedgerInput({ grossCents: 100, rateBps: 100, currency: 'USD' }).ok && !checkLedgerInput({ grossCents: 'abc', rateBps: 100 }).ok);
eq('parsers', [eurosToCents('120'), eurosToCents('120,5'), eurosToCents('120.50'), eurosToCents('1e3'), eurosToCents('-5'), eurosToCents('1.234'), percentToBps('12.5'), percentToBps('x')], [12000, 12050, 12050, null, null, null, 1250, null]);
eq('totals ignore void', ledgerTotals([
  { status: 'expected', gross_cents: 1000, commission_cents: 100, currency: 'EUR' }, { status: 'confirmed', gross_cents: 2000, commission_cents: 200, currency: 'EUR' }, { status: 'void', gross_cents: 5000, commission_cents: 500, currency: 'EUR' }]),
  { expectedCents: 100, confirmedCents: 200, grossCents: 3000, entries: 2, voided: 1 });

// ── partner flow rules ───────────────────────────────────────────────────────────────────────────────────────
eq('parse accept', parsePartnerResponse({ action: 'accept' }), { ok: true, action: 'accept', status: 'accepted', amountCents: null, note: null });
eq('parse quote', parsePartnerResponse({ action: 'quote', amount: '99,90', note: ' hi ' }), { ok: true, action: 'quote', status: 'quoted', amountCents: 9990, note: 'hi' });
ok('quote needs an amount', !parsePartnerResponse({ action: 'quote' }).ok && !parsePartnerResponse({ action: 'quote', amount: '0' }).ok);
ok('alternative needs a message', !parsePartnerResponse({ action: 'alternative' }).ok && parsePartnerResponse({ action: 'alternative', note: 'Thursday instead' }).ok);
ok('unknown action rejected', !parsePartnerResponse({ action: 'delete' }).ok);
eq('note is capped', (parsePartnerResponse({ action: 'decline', note: 'x'.repeat(5000) }) as { note: string }).note.length, 1500);
eq('link state', [linkState({ expires_at: mins(10) }, 'new', NOW), linkState({ expires_at: mins(-1) }, 'new', NOW), linkState({ expires_at: mins(10) }, 'cancelled', NOW)], ['ok', 'expired', 'closed']);
const sentP = { status: 'sent', sent_at: mins(-24 * 60), reminded_at: null, expires_at: mins(5000), email_status: 'sent' };
ok('reminder after 24 h only once, only if e-mailed and unanswered', needsReminder(sentP, 'awaiting_partner', NOW) && !needsReminder({ ...sentP, sent_at: mins(-60) }, 'awaiting_partner', NOW)
  && !needsReminder({ ...sentP, reminded_at: mins(-1) }, 'awaiting_partner', NOW) && !needsReminder({ ...sentP, status: 'quoted' }, 'awaiting_partner', NOW)
  && !needsReminder({ ...sentP, email_status: 'not_sent' }, 'awaiting_partner', NOW) && !needsReminder(sentP, 'closed', NOW));
eq('answer moves a booking forward only when shareable', [statusAfterAnswer('awaiting_partner', 'quoted'), statusAfterAnswer('awaiting_partner', 'declined'), statusAfterAnswer('confirmed', 'quoted'), statusAfterAnswer('cancelled', 'accepted')], ['quote_ready', 'awaiting_partner', 'confirmed', 'cancelled']);
ok('declines are never shareable', shareable('quoted') && shareable('accepted') && shareable('alternative') && !shareable('declined') && !shareable('sent'));
eq('link ttl 14 days', Math.round((linkExpiry(NOW).getTime() - NOW.getTime()) / 86400000), 14);

// ── tokens ───────────────────────────────────────────────────────────────────────────────────────────────────
const SECRET = 'unit-test-secret-0123456789';
const t1 = deriveToken(SECRET, 'guest', 'id-1');
ok('token shape = every other bearer link', isPlausibleRestoreToken(t1));
ok('deterministic, per kind, per id, per secret', t1 === deriveToken(SECRET, 'guest', 'id-1') && t1 !== deriveToken(SECRET, 'partner', 'id-1') && t1 !== deriveToken(SECRET, 'guest', 'id-2') && t1 !== deriveToken(SECRET + 'x', 'guest', 'id-1'));
eq('secret choice', [linkSecret({ BOOKING_LINK_SECRET: 'a'.repeat(20), SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(20) }), linkSecret({ SUPABASE_SERVICE_ROLE_KEY: 'b'.repeat(20) }), linkSecret({}), linkSecret({ BOOKING_LINK_SECRET: 'short' })], ['a'.repeat(20), 'b'.repeat(20), null, null]);
eq('desk inbox precedence', [deskInbox({ CONCIERGE_INBOX: 'a@x', DIRECTORY_INBOX: 'b@x' }), deskInbox({}), deskInbox({ CONCIERGE_INBOX_LUXURY: 'l@x', CONCIERGE_INBOX: 'a@x' })], ['a@x', null, 'l@x']);
ok('ref shape', /^CL-[A-HJ-NP-Z2-9]{6}$/.test(makeRef()) && makeRef(() => 0) === 'CL-AAAAAA');

// ── the engine, against an in-memory store ───────────────────────────────────────────────────────────────────
function memory() {
  const bookings = new Map<string, BookingRow>(), partners = new Map<string, PartnerRequestRow>(), ledger = new Map<string, LedgerEntryRow>(), events: (EventRow & { _b: string })[] = [];
  const requests = new Map<string, { status?: string; handled_by?: string | null }>();
  const store: BookingStore = {
    async insertBooking(row) {
      for (const b of bookings.values()) { if (b.ref === row.ref) return { ok: false, conflict: 'ref' }; if (b.concierge_request_id === row.concierge_request_id) return { ok: false, conflict: 'request' }; }
      bookings.set(row.id, { ...row }); return { ok: true, row };
    },
    async findBookingByRequest(id) { return [...bookings.values()].find((b) => b.concierge_request_id === id) || null; },
    async getBooking(id) { return bookings.get(id) || null; },
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
    async syncRequest(id, patch) { requests.set(id, { ...(requests.get(id) || {}), ...patch }); },
  };
  return { store, bookings, partners, ledger, events, requests };
}
function world(opts: { desk?: string | null; sendOk?: boolean; start?: string } = {}) {
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
const REQ = (id: string, over: Record<string, unknown> = {}) => ({ id, query: 'Boat trip to Akamas', note: '4 adults, Saturday', name: 'Anna', email: 'anna@guest.test', phone: null, locale: 'de', category: 'activities', district: 'Paphos', tier: 'standard', ...over });

async function engineTests() {
  // member vs visitor
  const w = world();
  const a = await createBooking(w.d, REQ('r1'), { id: 'mem-1', status: 'active', stripe_subscription_id: 'sub_1' });
  ok('member request → member lane', a.created && a.lane === 'member' && a.booking.member_id === 'mem-1' && a.booking.sla_target_minutes === 240);
  eq('member deadline', a.created && a.booking.first_response_due_at, '2026-10-05T12:00:00.000Z');
  ok('member booking alerts the desk (English, priority)', w.sent.length === 1 && w.sent[0].to === 'desk@example.test' && /MEMBER PRIORITY/.test(w.sent[0].subject));
  ok('guest status link is in the guest locale and verifiable', a.created && a.statusUrl.startsWith('https://example.test/de/booking/') && (await w.store.getBookingByTokenHash(hashRestoreToken(a.statusUrl.split('/').pop()!)))?.id === a.booking.id);
  ok('the stored hash is not the link', a.created && !a.statusUrl.includes(a.booking.status_token_hash));
  const v = await createBooking(w.d, REQ('r2', { locale: 'en', email: null, phone: '+357 99 000000' }), null);
  ok('visitor → standard lane, 9 working hours, no member id, no desk alert', v.created && v.lane === 'standard' && v.booking.member_id === null && v.booking.sla_target_minutes === 540 && w.sent.length === 1);
  ok('English link has no locale prefix', v.created && v.statusUrl.startsWith('https://example.test/booking/'));
  const lapsed = await createBooking(w.d, REQ('r3'), { id: 'mem-2', status: 'canceled', current_period_end: '2026-12-01T00:00:00Z' });
  ok('cancelled member does NOT get the priority lane, and no member id is stored', lapsed.created && lapsed.lane === 'standard' && lapsed.booking.member_id === null);
  const none = await createBooking(w.d, REQ('r4', { email: null, phone: null }), null);
  eq('no contact → no booking (stays a demand signal)', none, { created: false, reason: 'no_contact' });
  const again = await createBooking(w.d, REQ('r1'), null);
  ok('same request twice → one booking (idempotent), lane unchanged', !again.created && again.reason === 'exists' && w.bookings.size === 3 && again.booking?.lane === 'member');
  ok('reference collision is retried', new Set([...w.bookings.values()].map((b) => b.ref)).size === 3);
  ok('booking_events audit', w.events.filter((e) => e.kind === 'created').length === 3);
  const noMail = world({ desk: null }); await createBooking(noMail.d, REQ('x'), { id: 'm', status: 'active' });
  ok('no desk inbox: booking still created, nothing sent', noMail.bookings.size === 1 && noMail.sent.length === 0);

  // partner flow
  const bk = a.created ? a.booking : (null as never);
  const pr = await sendPartnerRequest(w.d, 'admin:me', bk.id, { partnerName: 'Blue Wave', partnerEmail: 'Boss@Blue.test', partnerLocale: 'el' });
  ok('partner asked', pr.ok && pr.emailed && pr.replyUrl.startsWith('https://example.test/el/booking/reply/'));
  ok('booking → awaiting_partner; request synced to routed', w.bookings.get(bk.id)!.status === 'awaiting_partner' && w.requests.get('r1')?.status === 'routed');
  const mail = w.sent[w.sent.length - 1];
  ok('partner mail: lowercase address, localized subject, link, NO guest contact details', mail.to === 'boss@blue.test' && /Αίτημα επισκέπτη/.test(mail.subject) && mail.html.includes('/el/booking/reply/') && !mail.html.includes('anna@guest.test') && !mail.html.includes('Anna'));
  ok('partner request validation', !(await sendPartnerRequest(w.d, 'x', bk.id, { partnerName: '' })).ok && !(await sendPartnerRequest(w.d, 'x', bk.id, { partnerName: 'X', partnerEmail: 'nope' })).ok && !(await sendPartnerRequest(w.d, 'x', 'missing', { partnerName: 'X' })).ok);
  const link = pr.ok ? pr.replyUrl.split('/').pop()! : '';
  const pid = pr.ok ? pr.partner.id : '';
  ok('opening the link changes nothing', (await loadPartnerLink(w.d, link))?.state === 'ok' && w.partners.get(pid)!.status === 'sent');
  eq('wrong token', await recordPartnerResponse(w.d, 'A'.repeat(43), { action: 'accept' }), { ok: false, error: 'invalid' });
  eq('bad quote', (await recordPartnerResponse(w.d, link, { action: 'quote', amount: 'free' })).ok, false);
  eq('quote recorded', await recordPartnerResponse(w.d, link, { action: 'quote', amount: '240', note: 'incl. lunch' }), { ok: true, status: 'quoted' });
  ok('answer stored, booking → quote_ready, desk told', w.partners.get(pid)!.quote_amount_cents === 24000 && w.bookings.get(bk.id)!.status === 'quote_ready' && /Partner answered/.test(w.sent[w.sent.length - 1].subject));
  ok('nothing is visible to the guest yet', w.partners.get(pid)!.shared_with_guest === false);
  eq('desk shares', await shareWithGuest(w.d, 'admin:me', pid, true), { ok: true });
  await recordPartnerResponse(w.d, link, { action: 'quote', amount: '260' });
  ok('a CHANGED answer is un-shared until the desk re-approves it', w.partners.get(pid)!.shared_with_guest === false && w.partners.get(pid)!.quote_amount_cents === 26000 && w.events.some((e) => e.kind === 'partner_answer' && (e.detail as { unshared: boolean }).unshared === true));
  await recordPartnerResponse(w.d, link, { action: 'decline' });
  ok('declines cannot be shared', !(await shareWithGuest(w.d, 'x', pid, true)).ok);
  await recordPartnerResponse(w.d, link, { action: 'quote', amount: '250' });
  await shareWithGuest(w.d, 'admin:me', pid, true);

  // expired / closed links
  w.advance(15 * 24 * 60);
  eq('expired link refuses answers', await recordPartnerResponse(w.d, link, { action: 'accept' }), { ok: false, error: 'expired' });
  w.advance(-15 * 24 * 60);

  // SLA: guest message is the first personal reply
  ok('before any reply the SLA is running', slaState(w.bookings.get(bk.id)!, w.d.now()).state !== 'met');
  w.advance(90);
  const msgOk = await messageGuest(w.d, 'admin:me', bk.id, 'Wir haben zwei Optionen für Sie.');
  const gm = w.sent[w.sent.length - 1];
  ok('message goes out in the guest language with their status link and stops the clock', msgOk.ok && gm.to === 'anna@guest.test' && /Neuigkeiten/.test(gm.subject) && gm.html.includes(guestLink(w.d, bk)) && w.bookings.get(bk.id)!.first_response_at !== null && slaState(w.bookings.get(bk.id)!, w.d.now()).state === 'met');
  eq('second first-reply refused', (await markFirstReply(w.d, 'a', bk.id, 'phone')).ok, false);
  const down = world({ sendOk: false }); const c0 = await createBooking(down.d, REQ('rz'), null);
  const fail = await messageGuest(down.d, 'a', c0.created ? c0.booking.id : '', 'hello there');
  ok('failed e-mail records nothing and does not stop the clock', !fail.ok && c0.created && down.bookings.get(c0.booking.id)!.first_response_at === null && !down.events.some((e) => e.kind === 'guest_message'));
  const phoneOnly = await createBooking(w.d, REQ('rp', { email: null, phone: '+357 1' }), null);
  ok('phone-only guest cannot be e-mailed but the desk can mark a phone reply', phoneOnly.created && !(await messageGuest(w.d, 'a', phoneOnly.booking.id, 'hello')).ok && (await markFirstReply(w.d, 'a', phoneOnly.booking.id, 'phone')).ok && w.bookings.get(phoneOnly.booking.id)!.first_response_at !== null);
  ok('empty message refused', !(await messageGuest(w.d, 'a', bk.id, ' ')).ok);

  // handling
  eq('assign', (await assign(w.d, 'admin:me', bk.id, '  Maria  ')).ok && w.bookings.get(bk.id)!.assigned_to, 'Maria');
  ok('unassign', (await assign(w.d, 'admin:me', bk.id, '')).ok && w.bookings.get(bk.id)!.assigned_to === null);
  ok('note is an event', (await addNote(w.d, 'a', bk.id, 'call back after 5')).ok && w.events.some((e) => e.kind === 'note') && !(await addNote(w.d, 'a', bk.id, '')).ok);

  // commission
  ok('no commission before confirmation', !(await recordCommission(w.d, 'a', pid, { rateBps: 1000 })).ok);
  ok('illegal status jump refused', !(await setStatus(w.d, 'a', bk.id, 'completed')).ok);
  eq('confirm', (await setStatus(w.d, 'admin:me', bk.id, 'confirmed')).ok, true);
  const bad = await recordCommission(w.d, 'a', pid, { rateBps: 9000 });
  ok('rate sanity cap', !bad.ok);
  const c1 = await recordCommission(w.d, 'admin:me', pid, { rateBps: 1250 });
  ok('commission defaults to the partner’s quote and uses half-up cents', c1.ok && c1.entry.gross_cents === 25000 && c1.entry.commission_cents === 3125 && c1.entry.status === 'expected' && c1.entry.booking_ref === bk.ref);
  ok('second live entry for the same partner refused', !(await recordCommission(w.d, 'a', pid, { rateBps: 1000 })).ok);
  eq('confirm entry', c1.ok && (await confirmCommission(w.d, 'a', c1.entry.id)).ok, true);
  ok('only expected entries can be confirmed', c1.ok && !(await confirmCommission(w.d, 'a', c1.entry.id)).ok);
  ok('void needs a reason', c1.ok && !(await voidCommission(w.d, 'a', c1.entry.id, '')).ok);
  ok('void, then re-record', c1.ok && (await voidCommission(w.d, 'a', c1.entry.id, 'wrong rate')).ok && (await recordCommission(w.d, 'a', pid, { grossCents: 24000, rateBps: 1000 })).ok);
  ok('already void', c1.ok && !(await voidCommission(w.d, 'a', c1.entry.id, 'again')).ok);
  await setStatus(w.d, 'a', bk.id, 'completed');
  ok('completed → request fulfilled, closed_at stamped, no longer in the queue', w.requests.get('r1')?.status === 'fulfilled' && w.bookings.get(bk.id)!.closed_at !== null);

  // sweep
  const s = world();
  const m1 = await createBooking(s.d, REQ('s1'), { id: 'm', status: 'active' });
  const s1 = await createBooking(s.d, REQ('s2'), null);
  s.sent.length = 0;
  eq('nothing overdue yet', await sweep(s.d), { checked: 2, breachAlerts: 0, noInbox: 0, reminders: 0 });
  s.advance(5 * 60);                                                                                  // 13:00 Cyprus-equivalent → past the 4-working-hour member deadline only
  const sw = await sweep(s.d);
  ok('only the member booking is overdue, alerted once', sw.breachAlerts === 1 && /SLA breached/.test(s.sent[0].subject) && m1.created && s.bookings.get(m1.booking.id)!.sla_alerted_at !== null && s1.created && s.bookings.get(s1.booking.id)!.sla_alerted_at === null);
  eq('second sweep sends no duplicate alert', (await sweep(s.d)).breachAlerts, 0);
  const sp = await sendPartnerRequest(s.d, 'a', m1.created ? m1.booking.id : '', { partnerName: 'P', partnerEmail: 'p@p.test' });
  s.advance(25 * 60);
  const sw2 = await sweep(s.d);
  ok('one partner reminder after 24 h', sw2.reminders === 1 && sp.ok && s.partners.get(sp.partner.id)!.reminded_at !== null && /Reminder/.test(s.sent[s.sent.length - 1].subject));
  eq('no second reminder', (await sweep(s.d)).reminders, 0);
  const nm = world({ desk: null, start: '2026-10-05T08:00:00Z' }); await createBooking(nm.d, REQ('n1'), null); nm.advance(25 * 60);
  const sn = await sweep(nm.d);
  ok('no desk inbox: breach is counted, not stamped, so it alerts once an inbox exists', sn.noInbox === 1 && sn.breachAlerts === 0 && [...nm.bookings.values()][0].sla_alerted_at === null);
  const quiet = world(); const qb = await createBooking(quiet.d, REQ('q1'), null); quiet.advance(40 * 60);
  if (qb.created) await setStatus(quiet.d, 'a', qb.booking.id, 'cancelled');
  ok('cancelled bookings never alert', (await sweep(quiet.d)).breachAlerts === 0);
}

// ── mail + copy ──────────────────────────────────────────────────────────────────────────────────────────────
const upd = guestUpdateMail('en', { ref: 'CL-AAAAAA', message: '<script>alert(1)</script>\nSecond line', statusUrl: 'https://x.test/booking/t' });
ok('guest message is HTML-escaped', !upd.html.includes('<script>') && upd.html.includes('&lt;script&gt;') && upd.html.includes('<br>'));
const pm = partnerRequestMail('ar', { ref: 'CL-AAAAAA', partnerName: 'A <b>B</b>', requestText: 'x', expiresAt: '2026-10-19T00:00:00Z', replyUrl: 'https://x.test/ar/booking/reply/t', reminder: false });
ok('partner mail is RTL for Arabic and escapes the name', pm.html.includes('dir="rtl"') && !pm.html.includes('A <b>B</b>'));
eq('urls', [guestStatusUrl('https://s.test/', 'en', 'T'), guestStatusUrl('https://s.test', 'pl', 'T'), partnerReplyUrl('https://s.test', 'ru', 'T')], ['https://s.test/booking/T', 'https://s.test/pl/booking/T', 'https://s.test/ru/booking/reply/T']);
ok('lane paragraph differs by lane and names the real target', /4 working hours/.test(guestLaneHtml('en', 'member', 'CL-A')) && /priority lane/.test(guestLaneHtml('en', 'member', 'CL-A')) && !/priority/.test(guestLaneHtml('en', 'standard', 'CL-A')) && /one working day/.test(guestLaneHtml('en', 'standard', 'CL-A')));

const flat = (o: object) => Object.entries(o) as [string, string][];
const enKeys = flat(BOOKING_COPY.en).map(([k]) => k).sort();
ok('every one of the 7 editions exists', (LOCALES as readonly string[]).every((l) => l in BOOKING_COPY) && Object.keys(BOOKING_COPY).length === LOCALES.length);
for (const l of LOCALES) {
  const c = BOOKING_COPY[l];
  eq(`${l}: same keys as en`, flat(c).map(([k]) => k).sort(), enKeys);
  ok(`${l}: no empty value`, flat(c).every(([, v]) => typeof v === 'string' && v.trim() !== ''));
  const ph = (s: string) => (s.match(/\{\w+\}/g) || []).sort().join('|');
  ok(`${l}: placeholders match en`, flat(c).every(([k, v]) => ph(v) === ph((BOOKING_COPY.en as unknown as Record<string, string>)[k])));
  ok(`${l}: working hours stated are the real ones (09:00–18:00)`, c.hoursNote.includes('09:00') && c.hoursNote.includes('18:00'));
  ok(`${l}: member target states 4 hours`, /4/.test(c.targetMember));
  ok(`${l}: lane sentences carry the target`, c.laneMember.includes('{target}') && c.laneStandard.includes('{target}'));
  ok(`${l}: not just the English text`, l === 'en' || (c.laneMember !== BOOKING_COPY.en.laneMember && c.pHeading !== BOOKING_COPY.en.pHeading && c.ppAccept !== BOOKING_COPY.en.ppAccept));
  ok(`${l}: commission line is a disclosure of a possibility`, c.disclosure.length > 20);
}
ok('unknown locale falls back to English', bookingCopy('xx') === BOOKING_COPY.en);
eq('fill', fill('a {x} b {y} {z}', { x: 1, y: 'two' }), 'a 1 b two {z}');
ok('constants in the copy agree with the SLA module', WORK_START_MIN === 9 * 60 && WORK_END_MIN === 18 * 60 && SLA_TARGET_MIN.member === 240);

engineTests().then(() => report('booking engine'), (e) => { console.error(e); process.exitCode = 1; throw e; });
