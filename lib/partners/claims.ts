// lib/partners/claims.ts — partner self-service logic (roadmap item 09).
// Pure, testable pieces of the claim + moderated-edit flow. A partner proves control
// of the email/domain already on file for a listing (no new account system); edits are
// restricted to a whitelist and always go through moderation before touching the listing.

// The ONLY fields a partner may propose. Must mirror apply_listing_edit()'s whitelist
// in migration 0089 (contact + descriptions + their own pitch — never status/featured/rating/coords).
export const EDITABLE_FIELDS = [
  'phone', 'email', 'url', 'partner_pitch',
  'summary_en', 'summary_el', 'summary_ro', 'summary_ar', 'summary_de', 'summary_pl', 'summary_ru',
] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

const MAX_LEN: Record<string, number> = { phone: 40, email: 120, url: 300, partner_pitch: 600 };
const DEFAULT_SUMMARY_MAX = 800;

// Keep only whitelisted keys, trim, drop empties, and cap length. Returns a clean object
// safe to store as an edit request.
export function sanitizeEdit(input: unknown): Partial<Record<EditableField, string>> {
  const out: Partial<Record<EditableField, string>> = {};
  if (!input || typeof input !== 'object') return out;
  const obj = input as Record<string, unknown>;
  for (const k of EDITABLE_FIELDS) {
    const v = obj[k];
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    const cap = MAX_LEN[k] ?? DEFAULT_SUMMARY_MAX;
    out[k] = trimmed.slice(0, cap);
  }
  return out;
}

const domainOf = (email: string): string => (email.split('@')[1] || '').toLowerCase().trim();
const hostOf = (url: string): string =>
  (url || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0].trim();

// Anti-spoofing: a claim is only plausible if the claimant's email matches what's already
// on file — the same address, the same email domain, or the listing's website domain.
export function emailMatchesListing(claimEmail: string, listingEmail: string | null, listingUrl: string | null): boolean {
  const ce = (claimEmail || '').toLowerCase().trim();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(ce)) return false;
  const cd = domainOf(ce);
  if (!cd) return false;
  if (listingEmail) {
    const le = listingEmail.toLowerCase().trim();
    if (ce === le) return true;
    if (domainOf(le) && domainOf(le) === cd) return true;
  }
  if (listingUrl) {
    const host = hostOf(listingUrl);
    // match the registrable-ish domain: the claim domain equals or is a subdomain of the site host
    if (host && (cd === host || cd.endsWith('.' + host) || host.endsWith('.' + cd))) return true;
  }
  return false;
}

// A URL-safe one-time token. Not cryptographically audited, but unguessable enough for a
// short-lived email verification (paired with a DB unique index + expiry).
export function newToken(): string {
  const rnd = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9]/g, '');
  return (rnd + Math.random().toString(36).slice(2)).slice(0, 40);
}
