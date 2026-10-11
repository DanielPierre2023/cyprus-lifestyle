// lib/newsletterUnsub.ts
// Personal, signed unsubscribe links for the newsletter (pure — no I/O, unit-tested).
//
// Why: the digest used to carry the literal text "{{unsubscribe}}" as its unsubscribe link, which only means
// something inside a Resend *Broadcast*; in an ordinary message it is a dead link — and a working opt-out is a
// legal requirement for a mailing list. Each recipient now gets a link that proves itself:
//     /api/newsletter/unsubscribe?e=<address, base64url>&t=<HMAC of the address>&l=<edition>
// The HMAC key never leaves the server, so nobody can unsubscribe somebody else by guessing a URL.
import { createHmac, timingSafeEqual } from 'node:crypto';

/** The server-side key for the links. Without one the newsletter must not be sent at all. */
export function unsubscribeSecret(env: Record<string, string | undefined> = process.env): string {
  return (env.NEWSLETTER_UNSUB_SECRET || env.CRON_SECRET || env.ENRICH_SECRET || '').trim();
}

const normalise = (email: string) => String(email || '').trim().toLowerCase();

export function unsubscribeToken(email: string, secret: string): string {
  return createHmac('sha256', secret).update(`newsletter-unsubscribe:${normalise(email)}`, 'utf8').digest('base64url').slice(0, 43);
}

export function verifyUnsubscribeToken(email: string, token: string, secret: string): boolean {
  if (!secret || !email || !token) return false;
  const want = Buffer.from(unsubscribeToken(email, secret));
  const got = Buffer.from(String(token));
  return want.length === got.length && timingSafeEqual(want, got);
}

export const encodeEmailParam = (email: string) => Buffer.from(normalise(email), 'utf8').toString('base64url');
export function decodeEmailParam(p: string): string {
  try {
    const s = Buffer.from(String(p || ''), 'base64url').toString('utf8');
    return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s) && s.length <= 254 ? s : '';
  } catch { return ''; }
}

export function unsubscribeUrl(siteUrl: string, email: string, locale: string, secret: string): string {
  const base = siteUrl.replace(/\/$/, '');
  return `${base}/api/newsletter/unsubscribe?e=${encodeEmailParam(email)}&t=${unsubscribeToken(email, secret)}&l=${encodeURIComponent(locale)}`;
}

/** Mail-client "unsubscribe" button (RFC 2369 / RFC 8058 one-click) — headers for one message. */
export function unsubscribeHeaders(url: string): Record<string, string> {
  return { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' };
}

export { UNSUB_PLACEHOLDER, personalise } from '@/lib/newsletterPlan';
