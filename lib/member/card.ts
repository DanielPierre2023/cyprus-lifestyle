// lib/member/card.ts — the member card: pure rules (no I/O).
//
// The card is a verification URL  /card/verify/<token>.  The token is an HMAC of (member id, card version) under a server
// secret: unguessable (256 bits), derived on demand (so it is never stored — only its SHA-256 hash is, in member_cards),
// and REVOCABLE in two ways:
//   • rotation  — bumping member_cards.version gives the member a new token and the old one stops resolving;
//   • lapse     — verification asks the live entitlement rule (lib/member/entitlement.ts entitled(): active, complimentary,
//                 or a payment problem inside the 7-day grace), so a lapsed membership's card turns invalid at the same moment
//                 the benefits stop. No job has to run for that to be true.
// If the secret is changed, every card token changes; the account page re-derives and re-registers the member's hash the next
// time they open it, so nothing breaks (outstanding printed/screenshotted cards stop working, which is the point of a rotation).
import { createHmac } from 'node:crypto';
import { entitled, type MemberLike } from '@/lib/member/entitlement';
import { isLocale, type Locale } from '@/lib/locales';

/** MEMBER_CARD_SECRET if set, else the service-role key (server-only and already secret), like the booking links. */
export function cardSecret(env: Record<string, string | undefined> = process.env): string | null {
  const s = env.MEMBER_CARD_SECRET || env.SUPABASE_SERVICE_ROLE_KEY || '';
  return s.length >= 16 ? s : null;
}

/** 32-byte HMAC → 43 base64url characters: the same shape as every other bearer link on the site. */
export function deriveCardToken(secret: string, memberId: string, version: number): string {
  return createHmac('sha256', secret).update(`membercard:v1:${memberId}:${version}`).digest('base64url');
}

export function cardVerifyUrl(siteUrl: string, locale: string, token: string): string {
  const l: Locale = isLocale(locale) ? (locale as Locale) : 'en';
  return `${siteUrl.replace(/\/$/, '')}${l === 'en' ? '' : '/' + l}/card/verify/${token}`;
}

/** The optional name on the card: first name or initials, letters / spaces / . - ' only, at most 24 characters. */
export function cleanCardName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const s = raw.normalize('NFC').replace(/\s+/g, ' ').trim();
  if (!s || s.length > 24) return null;
  if (!/^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u.test(s)) return null;
  return s;
}

/** Year the membership started (Cyprus calendar). */
export function memberSinceYear(createdAt: string | null | undefined): number | null {
  const t = createdAt ? Date.parse(createdAt) : NaN;
  if (!Number.isFinite(t)) return null;
  return Number(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Nicosia', year: 'numeric' }).format(new Date(t)));
}

export interface CardMember extends MemberLike { id: string; created_at?: string | null }

/** What a venue is shown: nothing but this. No e-mail, no phone, no member id. */
export type CardVerdict =
  | { valid: false }
  | { valid: true; name: string | null; sinceYear: number | null };

export function verdictFor(member: CardMember | null, displayName: string | null, now: Date = new Date()): CardVerdict {
  if (!member || !entitled(member, now)) return { valid: false };
  return { valid: true, name: cleanCardName(displayName), sinceYear: memberSinceYear(member.created_at) };
}
