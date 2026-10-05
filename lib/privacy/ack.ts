// lib/privacy/ack.ts — the acknowledgement e-mail for a privacy (DSAR) request.
// SECURITY MODEL: this mails an address that a visitor TYPED INTO A FORM, so it can be abused to
// make us mail a third party. It is therefore deliberately inert:
//   * ONE ack per address per 24 h (a DB lookup of earlier requests for that address — authoritative —
//     plus a per-address and a global send cap — best-effort), so a bot cannot use it to spam anyone;
//   * the content is a fixed, localised template: it echoes NOTHING the visitor typed (no name,
//     no free text, no request type) — only a reference derived from our own row id;
//   * no links, no attachments; every interpolated value is HTML-escaped.
import { brandedEmail } from '@/lib/email';
import { dsarAckCopy } from '@/lib/i18n/notices';
import { escapeHtml } from '@/lib/util';
import type { Locale } from '@/lib/locales';

export const DSAR_ACK_WINDOW_MS = 24 * 60 * 60 * 1000;

/** Short human reference from the stored row id (uuid): 'DSAR-1A2B3C4D'. Never derived from user input. */
export function dsarReference(id: string): string {
  const hex = String(id || '').replace(/[^0-9a-f]/gi, '').slice(0, 8).toUpperCase();
  return hex.length === 8 ? `DSAR-${hex}` : '';
}

/** ISO timestamp of the start of the ack window. */
export const dsarAckSince = (now: number = Date.now()): string => new Date(now - DSAR_ACK_WINDOW_MS).toISOString();

/** Send an ack only when there is NO earlier request from this address inside the window and the store lookup succeeded. */
export function shouldSendDsarAck(input: { priorInWindow: number | null; reference: string }): boolean {
  return input.priorInWindow === 0 && input.reference !== '';
}

export function buildDsarAck(locale: Locale, reference: string): { subject: string; html: string } {
  const c = dsarAckCopy(locale);
  const subject = c.subject.replace(/[\r\n]+/g, ' ').trim(); // header-injection safe: fixed copy, single line
  const bodyHtml = `<p>${escapeHtml(c.body)}</p><p style="font-size:14px;color:#6b6555">${escapeHtml(c.refLabel)}: <strong>${escapeHtml(reference)}</strong></p>`;
  return { subject, html: brandedEmail({ locale, heading: c.heading, bodyHtml, preheader: c.heading }) };
}
