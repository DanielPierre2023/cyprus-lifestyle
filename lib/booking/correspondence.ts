// lib/booking/correspondence.ts — every e-mail of a booking, kept in the booking history (booking_events).
//
//   OUT  mail_out  every e-mail the booking engine sends (guest acknowledgement, partner link + reminder, desk alerts,
//                  replies to the guest): direction, recipient, subject, plain-text body, delivered or not.
//   IN   mail_in   replies from the guest or a partner that arrive through the existing mail intake
//                  (POST /api/email/inbound -> inbound_emails). Matched to a booking by its reference CL-XXXXXX.
//
// The pure parts (reference extraction, safe matching, sender classification, HTML -> text, link redaction) have no I/O and
// are unit-tested; attachInboundMail() is the only function that touches the store, through the same Deps as the engine.
//
// SAFETY of the matching (an inbound mail is attached only when ALL hold):
//   1. exactly ONE distinct reference is found — in the subject, otherwise in the body (two different references = ambiguous,
//      the mail stays in Admin -> Mail only);
//   2. that reference belongs to an existing booking;
//   3. the same inbound mail is attached once (idempotent on the inbound_emails id).
// The sender is classified (guest / partner / our own domain / unknown). An UNKNOWN sender is still attached — but flagged
// "unverified" — because the reference is not a secret: such a mail NEVER changes the booking (no status change, no first-reply
// stamp, no SLA effect). It only appears in the history for a human to read.
//
// PRIVACY: private links (/booking/<token>, /booking/reply/<token>) are redacted before anything is stored, so the history
// never holds a usable bearer link; bodies are capped; the rows are booking_events and cascade away with the booking (GDPR erase).
import type { BookingRow, Deps, PartnerRequestRow } from '@/lib/booking/types';

export type MailDirection = 'out' | 'in';
export type MailParty = 'guest' | 'partner' | 'desk' | 'unknown';
export type MailKind =
  | 'guest_ack' | 'guest_message' | 'partner_request' | 'partner_reminder'
  | 'desk_new_request' | 'desk_member_request' | 'desk_partner_answer' | 'desk_breach'
  | 'inbound_guest' | 'inbound_partner' | 'inbound_desk' | 'inbound_unknown';

export interface MailRecord {
  direction: MailDirection; kind: MailKind; party: MailParty;
  to: string | null; from: string | null; subject: string; body: string;
  ok: boolean | null;                       // outbound: delivered to the mail provider? (null for inbound)
  error?: string | null; verified?: boolean; matched_by?: 'subject' | 'body'; partner?: string | null; inbound_email_id?: string | null; message_id?: string | null;
}

export const BODY_CAP = 20_000;

// ── reference extraction ────────────────────────────────────────────────────────────────────────────────────
const REF_RX = /(?<![A-Za-z0-9])[Cc][Ll]-([A-HJ-NP-Za-hj-np-z2-9]{6})(?![A-Za-z0-9])/g;

/** Distinct booking references (upper-cased) found in a text, in order of appearance. */
export function extractRefs(text: string | null | undefined): string[] {
  const out: string[] = [];
  for (const m of String(text || '').matchAll(REF_RX)) { const r = `CL-${m[1].toUpperCase()}`; if (!out.includes(r)) out.push(r); }
  return out;
}

export type RefPick = { ref: string; from: 'subject' | 'body' } | { ref: null; reason: 'none' | 'ambiguous' };

/** The one reference an inbound mail refers to — or null when there is none or when it is ambiguous. Subject wins over body. */
export function pickRef(subject: string | null | undefined, body: string | null | undefined): RefPick {
  const s = extractRefs(subject);
  if (s.length === 1) return { ref: s[0], from: 'subject' };
  if (s.length > 1) return { ref: null, reason: 'ambiguous' };
  const b = extractRefs(body);
  if (b.length === 1) return { ref: b[0], from: 'body' };
  if (b.length > 1) return { ref: null, reason: 'ambiguous' };
  return { ref: null, reason: 'none' };
}

// ── sender classification ───────────────────────────────────────────────────────────────────────────────────
export const normAddr = (s: string | null | undefined) => String(s || '').trim().toLowerCase();
const domainOf = (a: string) => a.slice(a.lastIndexOf('@') + 1);

export interface Sender { party: MailParty; verified: boolean; partner: PartnerRequestRow | null }

/** Who wrote? guest = the booking's e-mail; partner = a partner asked for this booking; desk = our own mail domain. */
export function classifySender(fromEmail: string, booking: Pick<BookingRow, 'guest_email'>, partners: PartnerRequestRow[], ownDomains: string[] = []): Sender {
  const from = normAddr(fromEmail);
  if (from && normAddr(booking.guest_email) === from) return { party: 'guest', verified: true, partner: null };
  const p = partners.find((x) => x.partner_email && normAddr(x.partner_email) === from);
  if (p) return { party: 'partner', verified: true, partner: p };
  if (from.includes('@') && ownDomains.map((d) => d.toLowerCase()).includes(domainOf(from))) return { party: 'desk', verified: true, partner: null };
  return { party: 'unknown', verified: false, partner: null };
}

// ── text helpers ────────────────────────────────────────────────────────────────────────────────────────────
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ldquo: '“', rdquo: '”', lsquo: '‘', rsquo: '’', mdash: '—', ndash: '–', hellip: '…' };
const decode = (s: string) => s
  .replace(/&#(\d+);/g, (_, n) => { const c = Number(n); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; })
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => { const c = parseInt(n, 16); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; })
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);

/** Replace private booking/partner links by a placeholder — no usable bearer link is ever stored. */
export function redactLinks(text: string): string {
  return text.replace(/(\/booking\/(?:reply\/)?)[A-Za-z0-9_-]{20,}/g, '$1[private link]');
}

/** A branded HTML e-mail -> readable plain text: heading + body + button label; the template's masthead, footer and hidden preheader are dropped. */
export function htmlToText(html: string): string {
  let h = String(html || '');
  const heading = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(h)?.[1] || '';
  const start = /<\/h1>/i.exec(h);
  if (start) h = h.slice(start.index + 5);
  const foot = h.indexOf('The media title of');
  if (foot > 0) h = h.slice(0, h.lastIndexOf('<tr', foot) > 0 ? h.lastIndexOf('<tr', foot) : foot);
  const toText = (x: string) => decode(x
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, '')
    .replace(/<span[^>]*display:\s*none[\s\S]*?<\/span>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6]|blockquote|table)>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, ''));
  const lines = toText(h).split('\n').map((l) => l.replace(/[ \t ]+/g, ' ').trim());
  const head = toText(heading).replace(/\s+/g, ' ').trim();
  const body = lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return redactLinks([head, body].filter(Boolean).join('\n\n')).slice(0, BODY_CAP);
}

export const cleanInboundBody = (text: string | null | undefined) => redactLinks(String(text || '').replace(/\r\n?/g, '\n').replace(/\n{4,}/g, '\n\n\n').trim()).slice(0, BODY_CAP);

// ── record builders ─────────────────────────────────────────────────────────────────────────────────────────
export function outboundRecord(kind: MailKind, party: MailParty, mail: { to: string; subject: string; html: string }, result: { ok: boolean; error?: string }, from: string | null = null, partner: string | null = null): MailRecord {
  return { direction: 'out', kind, party, to: mail.to, from, subject: mail.subject.slice(0, 300), body: htmlToText(mail.html), ok: !!result.ok, error: result.ok ? null : (result.error || 'not sent').slice(0, 200), partner };
}

export const recordToDetail = (r: MailRecord): Record<string, unknown> => ({ ...r });

// ── the only I/O: attach an inbound mail to its booking ─────────────────────────────────────────────────────
export interface InboundMail { emailId: string; fromEmail: string; fromName?: string | null; toEmail?: string | null; subject: string | null; body: string | null; messageId?: string | null }
export type AttachResult =
  | { attached: true; bookingId: string; ref: string; party: MailParty; verified: boolean }
  | { attached: false; reason: 'no_reference' | 'ambiguous_reference' | 'unknown_booking' | 'duplicate' | 'no_sender' };

export async function attachInboundMail(d: Deps, mail: InboundMail, ownDomains: string[] = []): Promise<AttachResult> {
  const from = normAddr(mail.fromEmail);
  if (!from) return { attached: false, reason: 'no_sender' };
  const pick = pickRef(mail.subject, mail.body);
  if (pick.ref === null) return { attached: false, reason: pick.reason === 'ambiguous' ? 'ambiguous_reference' : 'no_reference' };
  const booking = await d.store.findBookingByRef(pick.ref);
  if (!booking) return { attached: false, reason: 'unknown_booking' };
  if (mail.emailId && (await d.store.hasInboundMail(booking.id, mail.emailId))) return { attached: false, reason: 'duplicate' };
  const partners = await d.store.listPartners(booking.id);
  const who = classifySender(from, booking, partners, ownDomains);
  const kind: MailKind = who.party === 'guest' ? 'inbound_guest' : who.party === 'partner' ? 'inbound_partner' : who.party === 'desk' ? 'inbound_desk' : 'inbound_unknown';
  const rec: MailRecord = {
    direction: 'in', kind, party: who.party, to: normAddr(mail.toEmail) || null, from, subject: String(mail.subject || '(no subject)').slice(0, 300),
    body: cleanInboundBody(mail.body), ok: null, verified: who.verified, partner: who.partner?.partner_name ?? null, inbound_email_id: mail.emailId || null, message_id: mail.messageId || null,
  };
  const actor = who.party === 'guest' ? 'guest' : who.party === 'partner' ? `partner:${who.partner?.partner_name}` : who.party === 'desk' ? 'desk' : 'unverified sender';
  await d.store.addEvent(booking.id, actor, 'mail_in', recordToDetail({ ...rec, matched_by: pick.from }));
  return { attached: true, bookingId: booking.id, ref: booking.ref, party: who.party, verified: who.verified };
}
