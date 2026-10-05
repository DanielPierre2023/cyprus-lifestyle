// lib/booking/mail.ts — builds the booking e-mails (pure: returns subject + html, sends nothing).
// Guest and partner messages exist in all seven editions (lib/booking/copy.ts). Desk alerts are English (admin language).
import { brandedEmail } from '@/lib/email';
import { isLocale, type Locale } from '@/lib/locales';
import { bookingCopy, fill } from '@/lib/booking/copy';
import { SLA_TARGET_MIN } from '@/lib/booking/sla';
import type { Lane } from '@/lib/booking/queue';

export const esc = (s: string) => s.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string));
const loc = (l: string): Locale => (isLocale(l) ? (l as Locale) : 'en');
const multiline = (s: string) => esc(s).replace(/\r?\n/g, '<br>');

export function formatWhen(iso: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(loc(locale) === 'ar' ? 'ar' : loc(locale), { timeZone: 'Europe/Nicosia', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch { return iso; }
}
export function formatDay(iso: string, locale: string): string {
  try { return new Intl.DateTimeFormat(loc(locale) === 'ar' ? 'ar' : loc(locale), { timeZone: 'Europe/Nicosia', dateStyle: 'long' }).format(new Date(iso)); } catch { return iso; }
}

export const guestStatusUrl = (siteUrl: string, locale: string, token: string) =>
  `${siteUrl.replace(/\/$/, '')}${loc(locale) === 'en' ? '' : '/' + loc(locale)}/booking/${token}`;
export const partnerReplyUrl = (siteUrl: string, locale: string, token: string) =>
  `${siteUrl.replace(/\/$/, '')}${loc(locale) === 'en' ? '' : '/' + loc(locale)}/booking/reply/${token}`;

/** The lane / target / reference paragraphs added to the guest acknowledgement. Describes exactly what the code does. */
export function guestLaneHtml(locale: string, lane: Lane, ref: string): string {
  const c = bookingCopy(locale);
  const target = lane === 'member' ? c.targetMember : c.targetStandard;
  const line = fill(lane === 'member' ? c.laneMember : c.laneStandard, { target });
  return `<p style="margin-top:14px">${esc(fill(c.refLine, { ref }))}</p><p>${esc(line)}</p><p style="opacity:.7;font-size:14px">${esc(c.hoursNote)}</p>`;
}

export function guestUpdateMail(locale: string, v: { ref: string; message: string; statusUrl: string }): { subject: string; html: string } {
  const c = bookingCopy(locale);
  return {
    subject: fill(c.updSubject, { ref: v.ref }),
    html: brandedEmail({
      locale: loc(locale), heading: c.updHeading,
      bodyHtml: `<p>${esc(fill(c.updIntro, { ref: v.ref }))}</p><blockquote style="margin:14px 0;padding:10px 16px;border-inline-start:3px solid #C9A24C;background:#fbf8f1">${multiline(v.message)}</blockquote>`,
      ctaLabel: c.updCta, ctaUrl: v.statusUrl, preheader: c.updHeading,
    }),
  };
}

export function partnerRequestMail(locale: string, v: { ref: string; partnerName: string; requestText: string; expiresAt: string; replyUrl: string; reminder: boolean }): { subject: string; html: string } {
  const c = bookingCopy(locale);
  const greeting = v.partnerName ? fill(c.pGreeting, { name: esc(v.partnerName) }) : c.pGreetingAnon;
  return {
    subject: fill(v.reminder ? c.pReminderSubject : c.pSubject, { ref: v.ref }),
    html: brandedEmail({
      locale: loc(locale), heading: c.pHeading,
      bodyHtml: `<p>${greeting}</p><p>${esc(c.pIntro)}</p><p style="margin:14px 0 4px;opacity:.7">${esc(c.pRequestLabel)} · ${esc(v.ref)}</p>` +
        `<blockquote style="margin:0 0 14px;padding:10px 16px;border-inline-start:3px solid #C9A24C;background:#fbf8f1">${multiline(v.requestText)}</blockquote>` +
        `<p>${esc(c.pHow)}</p><p style="opacity:.75;font-size:14px">${esc(fill(c.pExpires, { date: formatDay(v.expiresAt, locale) }))} ${esc(c.pPrivacy)}</p><p style="margin-top:18px">${c.pClosing}</p>`,
      ctaLabel: c.pCta, ctaUrl: v.replyUrl, preheader: c.pHeading,
    }),
  };
}

/** English alerts to the desk (admin language). */
export function deskMail(kind: 'member_request' | 'breach' | 'partner_answer', v: { ref: string; text: string; adminUrl: string; lane: Lane; extra?: string }): { subject: string; html: string } {
  const head = kind === 'member_request' ? `MEMBER PRIORITY request ${v.ref}` : kind === 'breach' ? `SLA breached — ${v.ref}` : `Partner answered — ${v.ref}`;
  const intro = kind === 'member_request'
    ? `A signed-in member sent a request. It is in the priority lane (first-reply target ${SLA_TARGET_MIN.member / 60} working hours).`
    : kind === 'breach' ? `The first-reply target for this ${v.lane === 'member' ? 'MEMBER' : 'standard'} request has passed and nobody has replied yet.`
    : 'A partner replied through the magic link.';
  return {
    subject: head,
    html: brandedEmail({
      locale: 'en', heading: head,
      bodyHtml: `<p>${esc(intro)}</p><p><strong>${esc(v.text)}</strong></p>${v.extra ? `<p>${esc(v.extra)}</p>` : ''}`,
      ctaLabel: 'Open the queue', ctaUrl: v.adminUrl, preheader: head,
    }),
  };
}
