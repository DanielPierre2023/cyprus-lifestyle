// Cyprus Lifestyle — OWNER PROFILE EDITOR engine (server-only).
// ---------------------------------------------------------------------------
// Lets an ALREADY owner-verified business edit its own listing without any owner
// login. Ownership is proven per-listing by a crypto-random MANAGEMENT TOKEN that is
// emailed ONLY to the listing's recorded claim_contact (the proven owner, set by the
// Phase-2 claim flow). The emailed link is single-use; verifying it mints a short-lived
// editing SESSION (carried in an httpOnly cookie). On save, low-risk STRUCTURED fields
// (hours / socials / amenities / website) are written straight to the listing's owned
// columns; FREE-TEXT / high-display-risk content (description, photo URLs) is queued in
// directory_listing_edits as PENDING moderation and never goes live directly.
//
// SECURITY
//   • Tokens are crypto-random and stored HASHED (sha256 hex) at rest; the raw token is
//     never stored or logged, and is only ever emailed to the on-file claim_contact.
//   • 'link' tokens are SINGLE-USE (used_at set on verify) and short-lived (~60 min).
//     'session' tokens are short-lived (~60 min) and revocable (used_at). Verifying a
//     link consumes it and mints a fresh session — a session token is never a link.
//   • ANTI-ENUMERATION: requestOwnerLink always returns the same generic result, whether
//     or not the listing exists / is owner-verified / has an email on file, and never
//     reveals the contact address. A link is sent ONLY to the on-file claim_contact.
//   • The claim code (lib/directory/claims.ts) is NOT touched: this reads the verified
//     provenance + claim_contact it produced.
//   • Every function degrades cleanly and never throws to the caller. No token/PII logged.
// All reads/writes go through supabaseAdmin() (service role); directory_owner_tokens and
// directory_listing_edits are RLS-on with no policies, so this is the only access path.
import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, brandedEmail } from '@/lib/email';
import { manageLinkMail } from '@/lib/directory/ownerCopy';
import { isLocale, DEFAULT_LOCALE, type Locale } from '@/lib/locales';

// ── config ───────────────────────────────────────────────────────────────────
/** httpOnly cookie that carries the editing session token. Shared by the verify
 *  route (sets it), the manage page (reads it) and the save route (reads it). */
export const OWNER_COOKIE = 'cl_owner_sess';

const LINK_TTL_MS = 60 * 60 * 1000;    // emailed management link: 60 minutes, single-use
const SESSION_TTL_MS = 60 * 60 * 1000; // editing session after verify: 60 minutes
/** Max seconds the session cookie should live — for the route that sets it. */
export const OWNER_SESSION_MAX_AGE = Math.floor(SESSION_TTL_MS / 1000);

// Which social platforms the editor accepts (a fixed allow-list keeps the jsonb clean
// and stops arbitrary keys being written). The website lives in its own `url` column, so
// it is deliberately NOT a socials key here.
const SOCIAL_KEYS = ['facebook', 'instagram', 'x', 'linkedin', 'youtube', 'tiktok', 'whatsapp'] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
// Days for the opening-hours object, in display order.
export const HOURS_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type HoursDay = (typeof HOURS_DAYS)[number];

const MAX_AMENITIES = 40;
const MAX_AMENITY_LEN = 60;
const MAX_PHOTOS = 12;
const MAX_URL_LEN = 500;
const MAX_HOURS_LEN = 40;
const MAX_DESCRIPTION_LEN = 4000;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// ── small pure helpers ─────────────────────────────────────────────────────────
/** sha256 hex of a string — secrets are hashed before they are stored. */
export function sha256(s: string): string {
  return createHash('sha256').update(String(s)).digest('hex');
}

/** A URL-safe, crypto-random, single-use token (~43 chars). */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

const normEmail = (v: unknown): string => {
  const e = String(v ?? '').trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : '';
};

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');
}

const esc = (s: string): string =>
  String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

// ── sanitizers (pure, unit-testable) ───────────────────────────────────────────
/** A safe http(s) URL, trimmed and length-capped, or null. Rejects anything that is
 *  not an absolute http/https URL (no javascript:, data:, relative, etc.). */
export function sanitizeUrl(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s || s.length > MAX_URL_LEN) return null;
  let u: URL;
  try { u = new URL(s); } catch { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  return u.toString();
}

/** Opening hours → a clean { mon..sun: string } object (unknown keys dropped, values
 *  trimmed + capped). Returns null when nothing usable was supplied. */
export function sanitizeHours(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const src = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const day of HOURS_DAYS) {
    const val = String(src[day] ?? '').trim().slice(0, MAX_HOURS_LEN);
    if (val) out[day] = val;
  }
  return Object.keys(out).length ? out : null;
}

/** Socials → a clean { platform: url } object over the allow-list (each value a valid
 *  http(s) URL). Returns null when nothing usable was supplied. */
export function sanitizeSocials(v: unknown): Record<string, string> | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const src = v as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const key of SOCIAL_KEYS) {
    const url = sanitizeUrl(src[key]);
    if (url) out[key] = url;
  }
  return Object.keys(out).length ? out : null;
}

/** Amenities → a de-duplicated string[] (accepts an array or a comma/newline-separated
 *  string). Each entry trimmed + capped; count capped. [] when nothing usable. */
export function sanitizeAmenities(v: unknown): string[] {
  let parts: string[];
  if (Array.isArray(v)) parts = v.map((x) => String(x ?? ''));
  else parts = String(v ?? '').split(/[,\n]/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const s = p.trim().slice(0, MAX_AMENITY_LEN);
    const key = s.toLowerCase();
    if (s && !seen.has(key)) { seen.add(key); out.push(s); }
    if (out.length >= MAX_AMENITIES) break;
  }
  return out;
}

/** Photo URLs → a de-duplicated string[] of valid http(s) URLs (accepts an array or a
 *  comma/newline-separated string). Count capped. [] when nothing usable. */
export function sanitizePhotos(v: unknown): string[] {
  let parts: string[];
  if (Array.isArray(v)) parts = v.map((x) => String(x ?? ''));
  else parts = String(v ?? '').split(/[,\n]/);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const url = sanitizeUrl(p);
    if (url && !seen.has(url)) { seen.add(url); out.push(url); }
    if (out.length >= MAX_PHOTOS) break;
  }
  return out;
}

/** Free-text description → trimmed + length-capped string ('' when empty). */
export function sanitizeDescription(v: unknown): string {
  return String(v ?? '').trim().slice(0, MAX_DESCRIPTION_LEN);
}

// ── types ──────────────────────────────────────────────────────────────────────
export interface OwnerEditable {
  slug: string;
  type: string | null;
  name: string;
  /** Currently displayed description (summary_en) — prefilled into the editor. */
  description: string;
  website: string | null;
  hours: Record<string, string>;
  socials: Record<string, string>;
  amenities: string[];
  photos: string[];
}

export interface OwnerSaveInput {
  description?: unknown;
  website?: unknown;
  hours?: unknown;
  socials?: unknown;
  amenities?: unknown;
  photos?: unknown;
}

export interface OwnerSaveResult {
  ok: boolean;
  /** Structured fields written straight to the listing. */
  saved: string[];
  /** Free-text / photo fields queued for moderation. */
  pending: string[];
  error?: 'unauthorized' | 'nothing' | 'failed';
}

// ── token lifecycle ──────────────────────────────────────────────────────────────
async function sendManageLink(to: string, bizName: string, token: string, locale: Locale = DEFAULT_LOCALE): Promise<void> {
  const url = `${siteUrl()}/api/directory/owner/verify?token=${encodeURIComponent(token)}&lang=${locale}`;
  const m = manageLinkMail(locale, bizName);
  const html = brandedEmail({ locale, heading: m.heading, bodyHtml: m.bodyHtml, ctaLabel: m.ctaLabel, ctaUrl: url, preheader: m.preheader });
  await sendEmail({ to, subject: m.subject, html }).catch(() => {});
}

async function notifyDesk(subject: string, heading: string, bodyHtml: string, preheader: string): Promise<void> {
  const to = process.env.DIRECTORY_INBOX || process.env.ADVERTISE_INBOX || process.env.EMAIL_FROM;
  if (!to) return;
  try {
    const html = brandedEmail({ locale: 'en', heading, bodyHtml, preheader });
    await sendEmail({ to, subject, html }).catch(() => {});
  } catch { /* desk notification is best-effort */ }
}

/**
 * Issue a management link for a listing. The link is emailed ONLY to the listing's
 * on-file claim_contact (the proven owner) and only when the listing is owner-verified.
 * The result is ALWAYS the same generic shape — a caller can never tell whether the
 * listing exists, is owner-verified, or has an email on file. Never throws.
 */
export async function requestOwnerLink(slug: string, localeIn?: string | null): Promise<{ ok: true }> {
  const locale: Locale = localeIn && isLocale(localeIn) ? localeIn : DEFAULT_LOCALE;
  const generic = { ok: true } as const;
  const s = String(slug ?? '').trim().slice(0, 200);
  if (!s) return generic;

  try {
    const sb = supabaseAdmin();
    const { data } = await sb.from('directory_listings')
      .select('slug, provenance, claim_contact, name_en')
      .eq('slug', s)
      .maybeSingle();
    const listing = data as Record<string, unknown> | null;

    // Unknown slug, not owner-verified, or no EMAIL on file → do nothing, look identical.
    // (claim_contact may be a phone for a phone-OTP-verified claim; we can only email.)
    if (!listing) return generic;
    if (String(listing.provenance || '') !== 'owner-verified') return generic;
    const contact = normEmail(listing.claim_contact);
    if (!contact) return generic;

    const bizName = String(listing.name_en || s);
    const raw = newToken();
    const nowIso = new Date().toISOString();

    // Persist the HASHED link FIRST — only ever email a secret that points at a stored row.
    const { error } = await sb.from('directory_owner_tokens').insert({
      listing_slug: s,
      kind: 'link',
      token_hash: sha256(raw),
      expires_at: new Date(Date.now() + LINK_TTL_MS).toISOString(),
      created_at: nowIso,
    });
    if (error) return generic; // degrade silently (no enumeration, no secret sent)

    await sendManageLink(contact, bizName, raw, locale);
    await notifyDesk(
      `Owner management link requested — ${bizName}`,
      'An owner requested a management link',
      `<p><strong>${esc(bizName)}</strong> (<code>${esc(s)}</code>)</p>` +
      `<p>A single-use management link (valid 60 min) was sent to the verified owner contact on file.</p>`,
      `Management link requested for ${bizName}`,
    );
    return generic;
  } catch {
    return generic; // any failure still looks like a normal request
  }
}

/**
 * Verify an emailed management link. Looks the LINK up by token_hash, checks it is
 * single-use + unexpired, consumes it, and mints a short-lived editing SESSION. Returns
 * the slug and the RAW session token (for the caller to set as an httpOnly cookie).
 * Never throws.
 */
export async function validateOwnerToken(token: string): Promise<{
  ok: boolean; slug?: string; type?: string | null; session?: string; error?: 'invalid' | 'expired';
}> {
  const t = String(token ?? '').trim();
  if (!t) return { ok: false, error: 'invalid' };
  try {
    const sb = supabaseAdmin();
    const nowIso = new Date().toISOString();
    const { data } = await sb.from('directory_owner_tokens')
      .select('id, listing_slug, kind, expires_at, used_at')
      .eq('token_hash', sha256(t))
      .eq('kind', 'link')
      .maybeSingle();
    const row = data as Record<string, unknown> | null;
    if (!row) return { ok: false, error: 'invalid' };
    if (row.used_at) return { ok: false, error: 'invalid' };               // single-use: already consumed
    if (row.expires_at && String(row.expires_at) < nowIso) return { ok: false, error: 'expired' };

    // Consume the link (single-use) — guard the update on used_at still being null so a
    // concurrent double-verify can't mint two sessions from one link.
    const { data: consumed } = await sb.from('directory_owner_tokens')
      .update({ used_at: nowIso })
      .eq('id', row.id as string)
      .is('used_at', null)
      .select('id')
      .maybeSingle();
    if (!consumed) return { ok: false, error: 'invalid' }; // lost the race / already used

    const slug = String(row.listing_slug);

    // Confirm the listing is still owner-verified before minting an editing session.
    const { data: L } = await sb.from('directory_listings')
      .select('slug, type, provenance')
      .eq('slug', slug)
      .maybeSingle();
    const listing = L as Record<string, unknown> | null;
    if (!listing || String(listing.provenance || '') !== 'owner-verified') {
      return { ok: false, error: 'invalid' };
    }

    // Mint the session (revocable via used_at).
    const session = newToken();
    const { error: sErr } = await sb.from('directory_owner_tokens').insert({
      listing_slug: slug,
      kind: 'session',
      token_hash: sha256(session),
      expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
      created_at: nowIso,
    });
    if (sErr) return { ok: false, error: 'invalid' };

    return { ok: true, slug, type: (listing.type as string) ?? null, session };
  } catch {
    return { ok: false, error: 'invalid' };
  }
}

/** Resolve an editing SESSION token to its listing slug, or null when it is missing,
 *  revoked, expired or not a session. Never throws. */
export async function validateOwnerSession(token: string | undefined | null): Promise<string | null> {
  const t = String(token ?? '').trim();
  if (!t) return null;
  try {
    const sb = supabaseAdmin();
    const nowIso = new Date().toISOString();
    const { data } = await sb.from('directory_owner_tokens')
      .select('listing_slug, kind, expires_at, used_at')
      .eq('token_hash', sha256(t))
      .eq('kind', 'session')
      .maybeSingle();
    const row = data as Record<string, unknown> | null;
    if (!row || row.used_at) return null;
    if (row.expires_at && String(row.expires_at) < nowIso) return null;
    return String(row.listing_slug);
  } catch {
    return null;
  }
}

// ── listing data for the editor ────────────────────────────────────────────────
/** Current editable values for an owner-verified listing, for prefilling the editor.
 *  Returns null when the listing is missing or not owner-verified. Never throws. */
export async function getOwnerEditable(slug: string): Promise<OwnerEditable | null> {
  const s = String(slug ?? '').trim();
  if (!s) return null;
  try {
    const { data } = await supabaseAdmin().from('directory_listings')
      .select('slug, type, name_en, provenance, url, summary_en, hours, socials, amenities, owned_photos')
      .eq('slug', s)
      .maybeSingle();
    const r = data as Record<string, unknown> | null;
    if (!r || String(r.provenance || '') !== 'owner-verified') return null;

    const hours = (r.hours && typeof r.hours === 'object' && !Array.isArray(r.hours)) ? (r.hours as Record<string, string>) : {};
    const socials = (r.socials && typeof r.socials === 'object' && !Array.isArray(r.socials)) ? (r.socials as Record<string, string>) : {};
    const amenities = Array.isArray(r.amenities) ? (r.amenities as string[]).map((x) => String(x)) : [];
    const photos = Array.isArray(r.owned_photos) ? (r.owned_photos as unknown[]).map((x) => String(x)) : [];

    return {
      slug: String(r.slug),
      type: (r.type as string) ?? null,
      name: String(r.name_en || s),
      description: String(r.summary_en || ''),
      website: (r.url as string) ?? null,
      hours,
      socials,
      amenities,
      photos,
    };
  } catch {
    return null;
  }
}

// ── save ─────────────────────────────────────────────────────────────────────────
/**
 * Apply an owner's edits. Validates the SESSION token (must resolve to `slug`), writes
 * low-risk STRUCTURED fields (website/hours/socials/amenities) straight to the listing's
 * owned columns, and QUEUES free-text (description) and photo URLs into
 * directory_listing_edits as PENDING moderation. Empty fields are treated as "no change"
 * (never a destructive clear). Returns which fields saved vs went pending. Never throws.
 */
export async function saveOwnerEdits(slug: string, token: string, payload: OwnerSaveInput): Promise<OwnerSaveResult> {
  const fail = (error: OwnerSaveResult['error']): OwnerSaveResult => ({ ok: false, saved: [], pending: [], error });
  const s = String(slug ?? '').trim().slice(0, 200);
  if (!s) return fail('unauthorized');

  try {
    // Authorise: the session must resolve to THIS listing's slug.
    const sessionSlug = await validateOwnerSession(token);
    if (!sessionSlug || sessionSlug !== s) return fail('unauthorized');

    const sb = supabaseAdmin();

    // Defence-in-depth: re-confirm owner-verified and read the on-file contact (for
    // attribution on the moderation rows) + the displayed copy (to skip a no-op description).
    const { data: L } = await sb.from('directory_listings')
      .select('slug, provenance, claim_contact, name_en, summary_en')
      .eq('slug', s)
      .maybeSingle();
    const listing = L as Record<string, unknown> | null;
    if (!listing || String(listing.provenance || '') !== 'owner-verified') return fail('unauthorized');
    const submittedBy = String(listing.claim_contact || '') || null;
    const bizName = String(listing.name_en || s);
    const currentDescription = String(listing.summary_en || '');
    const nowIso = new Date().toISOString();

    const saved: string[] = [];
    const pending: string[] = [];

    // ── structured, low-risk → write straight to the owned columns ──
    const patch: Record<string, unknown> = {};
    const website = sanitizeUrl(payload.website);
    if (website) { patch.url = website; saved.push('website'); }
    const hours = sanitizeHours(payload.hours);
    if (hours) { patch.hours = hours; saved.push('hours'); }
    const socials = sanitizeSocials(payload.socials);
    if (socials) { patch.socials = socials; saved.push('socials'); }
    const amenities = sanitizeAmenities(payload.amenities);
    if (amenities.length) { patch.amenities = amenities; saved.push('amenities'); }

    if (Object.keys(patch).length) {
      patch.updated_at = nowIso;
      const { error } = await sb.from('directory_listings').update(patch).eq('slug', s);
      if (error) return fail('failed');
    }

    // ── free-text / high-display-risk → queue as PENDING moderation ──
    const edits: Record<string, unknown>[] = [];
    const description = sanitizeDescription(payload.description);
    // Only queue a description that actually differs from what is already displayed.
    if (description && description !== currentDescription) {
      edits.push({ listing_slug: s, field: 'description', proposed_value: description, status: 'pending', submitted_by: submittedBy, created_at: nowIso });
      pending.push('description');
    }
    const photos = sanitizePhotos(payload.photos);
    if (photos.length) {
      edits.push({ listing_slug: s, field: 'photos', proposed_value: photos, status: 'pending', submitted_by: submittedBy, created_at: nowIso });
      pending.push('photos');
    }
    if (edits.length) {
      const { error } = await sb.from('directory_listing_edits').insert(edits);
      if (error) return fail('failed');
    }

    if (!saved.length && !pending.length) return fail('nothing');

    await notifyDesk(
      `Owner updated their listing — ${bizName}`,
      'An owner edited their listing',
      `<p><strong>${esc(bizName)}</strong> (<code>${esc(s)}</code>)</p>` +
      (saved.length ? `<p>Published directly: <strong>${esc(saved.join(', '))}</strong>.</p>` : '') +
      (pending.length ? `<p>Awaiting moderation: <strong>${esc(pending.join(', '))}</strong> (see directory_listing_edits).</p>` : ''),
      `${bizName} listing updated`,
    );

    return { ok: true, saved, pending };
  } catch {
    return fail('failed');
  }
}
