// Cyprus Lifestyle — CLAIM-TO-OWN engine (server-only).
// ---------------------------------------------------------------------------
// Turns a borrowed, scraped REFERENCE listing into an OWNED, first-party record.
// A business claims its listing and PROVES it controls the BUSINESS (not merely
// its own inbox). On a verified claim the listing is flipped:
//   directory_listings.provenance = 'owner-verified', claimed_at = now,
//   verified_at = now, claim_contact = <claimant email or phone>
// and the desk is notified to complete the profile / upsell.
//
// HONEST-VERIFICATION CHANNEL PRIORITY (strongest proof first):
//   1. onfile_email — the listing has an email on file → send the verify LINK to
//      THAT address (only the real owner receives it). The claimant is never told
//      the address.
//   2. domain_email — else if the claimant's email domain matches the listing's
//      website host (url, minus www) → send the link to the claimant (reasonable
//      proof of affiliation). Generic free-mail / social hosts are excluded.
//   3. phone_otp — else if an SMS provider is configured AND the listing has a
//      phone on file → send a 6-digit OTP to the ON-FILE phone.
//   4. manual — else create a pending claim for manual review; the desk follows up.
//      We NEVER fall back to "send a link to whatever the claimant typed".
//
// SECURITY: tokens/OTPs are crypto-random, stored HASHED (sha256 hex) at rest,
// SINGLE-USE (cleared on success), with an EXPIRY (link ~72h, OTP ~10min) and an
// OTP ATTEMPT LIMIT (then the claim is locked). No token/PII is ever logged. All
// reads/writes go through supabaseAdmin() (directory_claims is RLS-on, no policies).
// Every function degrades cleanly and never throws to the caller.
import 'server-only';
import { createHash, randomBytes, randomInt } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sendEmail, brandedEmail } from '@/lib/email';

export type ClaimMethod = 'onfile_email' | 'domain_email' | 'phone_otp' | 'manual';

export interface StartClaimInput {
  slug: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface StartClaimResult {
  ok: boolean;
  /** Internal channel marker. The API route does NOT expose this for the email/
   *  manual channels (that would leak whether an on-file email exists). */
  method: ClaimMethod | 'already' | 'none';
  message: string;
  /** Present only for the phone-OTP channel (the claimant must enter the code). */
  requiresCode?: boolean;
  claimId?: string;
}

export interface VerifyResult {
  ok: boolean;
  slug?: string;
  type?: string | null;
  error?: 'expired' | 'invalid' | 'locked' | 'not_found';
  /** Attempts still allowed before the OTP claim locks (phone channel only). */
  remaining?: number;
}

export interface PeekResult {
  ok: boolean;
  /** Business display name, for the branded confirm page (present only when ok). */
  bizName?: string;
  slug?: string;
  error?: 'expired' | 'invalid' | 'not_found';
}

const EMAIL_LINK_TTL_MS = 72 * 60 * 60 * 1000; // 72 hours
const OTP_TTL_MS = 10 * 60 * 1000;             // 10 minutes
const OTP_MAX_ATTEMPTS = 5;

// One generic, non-enumerating message for EVERY email/manual outcome — including an
// unknown slug — so a caller can never tell from the response whether a listing has an
// on-file email, a matching domain, or nothing at all.
const GENERIC_MESSAGE =
  "Thanks — we've started verifying your claim. If ownership can be confirmed, a verification link will be sent to the business's contact address on file (or to your email if it matches the business's own website). Otherwise our team will review your request and follow up with you by email.";

const ALREADY_MESSAGE =
  'This business already has a verified owner profile. If you need access, please contact our team and we will help.';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Hosts that must NEVER satisfy a website-domain match — a listing whose `url` is a
// free-mail inbox, a social/profile page or a listings aggregator does not prove that
// an address at that domain controls the business.
const GENERIC_HOSTS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.gr', 'hotmail.com', 'hotmail.co.uk',
  'outlook.com', 'live.com', 'icloud.com', 'me.com', 'aol.com', 'gmx.com', 'gmx.net',
  'mail.com', 'proton.me', 'protonmail.com', 'yandex.com', 'zoho.com',
  'facebook.com', 'm.facebook.com', 'fb.com', 'instagram.com', 'linkedin.com',
  'x.com', 'twitter.com', 't.me', 'telegram.me', 'wa.me', 'whatsapp.com',
  'api.whatsapp.com', 'linktr.ee', 'youtube.com', 'tiktok.com',
  'google.com', 'maps.google.com', 'goo.gl', 'business.site', 'sites.google.com',
  'tripadvisor.com', 'booking.com', 'airbnb.com', 'wixsite.com', 'blogspot.com',
  'wordpress.com', 'weebly.com', 'squarespace.com',
]);

// ── small pure helpers ──────────────────────────────────────────────────────
/** sha256 hex of a string — used to hash secrets before they are stored. */
export function sha256(s: string): string {
  return createHash('sha256').update(String(s)).digest('hex');
}

/** A URL-safe, crypto-random, single-use email-verification token (~43 chars). */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}

/** A crypto-random 6-digit numeric OTP, zero-padded. */
export function newOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

const normEmail = (v: unknown): string => {
  const e = String(v ?? '').trim().toLowerCase();
  return EMAIL_RE.test(e) ? e : '';
};
const domainOf = (email: string): string => (email.split('@')[1] || '').trim();
const hostOf = (url: unknown): string =>
  String(url ?? '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0]
    .trim();
const normPhone = (v: unknown): string => String(v ?? '').replace(/[^\d+]/g, '').trim();

/** The claimant's email domain proves website affiliation: equal to, or a sub/parent
 *  domain of, the listing's website host. The host must not be a generic/social host. */
export function domainMatchesWebsite(claimantEmail: string, listingUrl: unknown): boolean {
  const host = hostOf(listingUrl);
  if (!host || GENERIC_HOSTS.has(host)) return false;
  const cd = domainOf(normEmail(claimantEmail));
  if (!cd || GENERIC_HOSTS.has(cd)) return false;
  return cd === host || cd.endsWith('.' + host) || host.endsWith('.' + cd);
}

export interface ChannelInputs {
  onfileEmail: string;    // the listing's on-file email, normalized ('' if none/invalid)
  listingUrl: string | null; // the listing's website (url column)
  onfilePhone: string;    // the listing's on-file phone, digits only ('' if none)
  claimantEmail: string;  // the claimant's email, normalized ('' if none/invalid)
  smsReady: boolean;      // whether an SMS provider is configured
}

/**
 * The honest-verification channel decision, as a pure function (unit-testable).
 * Priority: on-file email → website-domain match → phone OTP → manual. It NEVER
 * returns a channel that would send a secret to an address the claimant merely typed
 * (that is the whole point of 'manual' being the floor).
 */
export function chooseClaimMethod(i: ChannelInputs): ClaimMethod {
  if (i.onfileEmail) return 'onfile_email';
  if (i.claimantEmail && domainMatchesWebsite(i.claimantEmail, i.listingUrl)) return 'domain_email';
  if (i.smsReady && i.onfilePhone) return 'phone_otp';
  return 'manual';
}

/** True when an SMS provider is configured. Until then the phone channel is skipped. */
export function smsConfigured(): boolean {
  return Boolean(process.env.SMS_PROVIDER || process.env.TWILIO_ACCOUNT_SID);
}

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/$/, '');
}

const esc = (s: string): string =>
  String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));

// ── delivery (all best-effort; failures never surface to the claimant) ───────
async function sendVerifyLink(to: string, bizName: string, token: string): Promise<void> {
  const url = `${siteUrl()}/api/directory/claim/verify?token=${encodeURIComponent(token)}`;
  const html = brandedEmail({
    locale: 'en',
    heading: `Confirm your claim of ${bizName}`,
    bodyHtml:
      `<p>Someone asked to claim and verify the Cyprus Lifestyle listing for <strong>${esc(bizName)}</strong>.</p>` +
      `<p>If this was you (or your business), open the secure confirmation page below and click <strong>Confirm</strong> to take ownership of the listing. The link is valid for 72 hours and can be used once — ownership transfers only when you click Confirm on that page, so it is safe to open.</p>` +
      `<p>If you did not request this, you can safely ignore this email — nothing will change.</p>`,
    ctaLabel: 'Review your claim',
    ctaUrl: url,
    preheader: `Verify your claim of ${bizName} on Cyprus Lifestyle`,
  });
  await sendEmail({ to, subject: `Verify your claim — ${bizName}`, html }).catch(() => {});
}

// Minimal Twilio REST send, used only when the phone channel is reached (i.e. a provider
// is configured). Returns false (never throws) if creds are incomplete or the call fails.
async function sendOtpSms(toPhone: string, code: string): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!sid || !token || !from) return false; // provider named but not fully wired → skip
  try {
    const params = new URLSearchParams();
    if (process.env.TWILIO_MESSAGING_SERVICE_SID && !process.env.TWILIO_FROM) {
      params.set('MessagingServiceSid', process.env.TWILIO_MESSAGING_SERVICE_SID);
    } else {
      params.set('From', from);
    }
    params.set('To', toPhone);
    params.set('Body', `Your Cyprus Lifestyle verification code is ${code}. It expires in 10 minutes.`);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  } catch {
    return false; // never leak the code or the error
  }
}

async function notifyDesk(subject: string, heading: string, bodyHtml: string, preheader: string): Promise<void> {
  const to = process.env.DIRECTORY_INBOX || process.env.ADVERTISE_INBOX || process.env.EMAIL_FROM;
  if (!to) return;
  try {
    const html = brandedEmail({ locale: 'en', heading, bodyHtml, preheader });
    await sendEmail({ to, subject, html }).catch(() => {});
  } catch { /* desk notification is best-effort */ }
}

// ── the flip: promote a listing to owner-verified ───────────────────────────
async function flipListing(sb: ReturnType<typeof supabaseAdmin>, slug: string, contact: string | null, nowIso: string):
  Promise<{ type: string | null; name: string }> {
  try {
    const { data } = await sb.from('directory_listings')
      .update({ provenance: 'owner-verified', claimed_at: nowIso, verified_at: nowIso, claim_contact: contact, updated_at: nowIso })
      .eq('slug', slug)
      .select('slug, type, name_en')
      .maybeSingle();
    const r = (data || {}) as Record<string, unknown>;
    return { type: (r.type as string) ?? null, name: String(r.name_en || slug) };
  } catch {
    return { type: null, name: slug };
  }
}

// ── public API ──────────────────────────────────────────────────────────────
/**
 * Start a claim. Picks the honest-verification channel by priority, creates a
 * directory_claims row with the HASHED secret, triggers delivery, and notifies the
 * desk. Always returns a non-enumerating result. Never throws.
 */
export async function startClaim(input: StartClaimInput): Promise<StartClaimResult> {
  const generic: StartClaimResult = { ok: true, method: 'none', message: GENERIC_MESSAGE };
  const slug = String(input.slug ?? '').trim().slice(0, 200);
  if (!slug) return generic;

  const name = String(input.name ?? '').trim().slice(0, 160) || null;
  const claimantEmail = normEmail(input.email);
  const claimantPhone = normPhone(input.phone) || null;

  try {
    const sb = supabaseAdmin();
    const { data: L } = await sb.from('directory_listings')
      .select('slug, email, url, phone, provenance, name_en')
      .eq('slug', slug)
      .maybeSingle();

    // Unknown slug → look identical to a started claim (no probing which slugs exist).
    if (!L) return generic;
    const listing = L as Record<string, unknown>;

    // Already owned → nothing to do. (Verified state is already visible on the page.)
    if (String(listing.provenance || '') === 'owner-verified') {
      return { ok: true, method: 'already', message: ALREADY_MESSAGE };
    }

    const bizName = String(listing.name_en || slug);
    const onfileEmail = normEmail(listing.email);
    const onfilePhone = normPhone(listing.phone);

    // ── choose the channel (strongest proof first) ──
    const method = chooseClaimMethod({
      onfileEmail,
      listingUrl: (listing.url as string) ?? null,
      onfilePhone,
      claimantEmail,
      smsReady: smsConfigured(),
    });

    const nowIso = new Date().toISOString();

    // Build the row with the hashed secret for the chosen channel.
    const row: Record<string, unknown> = {
      listing_slug: slug,
      claimant_name: name,
      claimant_email: claimantEmail || null,
      claimant_phone: claimantPhone,
      method,
      status: 'pending',
      created_at: nowIso,
      updated_at: nowIso,
    };

    let rawToken = '';
    let rawOtp = '';
    if (method === 'onfile_email' || method === 'domain_email') {
      rawToken = newToken();
      row.token_hash = sha256(rawToken);
      row.expires_at = new Date(Date.now() + EMAIL_LINK_TTL_MS).toISOString();
    } else if (method === 'phone_otp') {
      rawOtp = newOtp();
      row.code_hash = sha256(rawOtp);
      row.expires_at = new Date(Date.now() + OTP_TTL_MS).toISOString();
    }

    // Persist FIRST — only deliver a secret that points at a real, stored claim.
    const { data: ins, error } = await sb.from('directory_claims').insert(row).select('id').single();
    if (error || !ins) return generic; // degrade silently (no enumeration, no secret sent)
    const claimId = String((ins as Record<string, unknown>).id);

    // Deliver + tell the desk a claim has started (all best-effort).
    if (method === 'onfile_email') {
      await sendVerifyLink(onfileEmail, bizName, rawToken);
      await notifyDesk(
        `Claim started — ${bizName}`,
        'A listing claim has started',
        `<p><strong>${esc(bizName)}</strong> (<code>${esc(slug)}</code>)</p>` +
        `<p>Channel: <strong>on-file email</strong> — a verification link was sent to the address on file for the business.</p>` +
        `<p>Claimant: ${esc(name || '—')}${claimantEmail ? ` &lt;${esc(claimantEmail)}&gt;` : ''}${claimantPhone ? ` · ${esc(claimantPhone)}` : ''}</p>`,
        `Claim started for ${bizName}`,
      );
      return { ok: true, method, message: GENERIC_MESSAGE };
    }

    if (method === 'domain_email') {
      await sendVerifyLink(claimantEmail, bizName, rawToken);
      await notifyDesk(
        `Claim started — ${bizName}`,
        'A listing claim has started',
        `<p><strong>${esc(bizName)}</strong> (<code>${esc(slug)}</code>)</p>` +
        `<p>Channel: <strong>website-domain match</strong> — a verification link was sent to the claimant's matching address.</p>` +
        `<p>Claimant: ${esc(name || '—')} &lt;${esc(claimantEmail)}&gt;${claimantPhone ? ` · ${esc(claimantPhone)}` : ''}</p>`,
        `Claim started for ${bizName}`,
      );
      return { ok: true, method, message: GENERIC_MESSAGE };
    }

    if (method === 'phone_otp') {
      const sent = await sendOtpSms(onfilePhone, rawOtp);
      await notifyDesk(
        `Claim started — ${bizName}`,
        'A listing claim has started',
        `<p><strong>${esc(bizName)}</strong> (<code>${esc(slug)}</code>)</p>` +
        `<p>Channel: <strong>phone OTP</strong> — a code was ${sent ? 'sent' : 'attempted'} to the phone on file.</p>` +
        `<p>Claimant: ${esc(name || '—')}${claimantEmail ? ` &lt;${esc(claimantEmail)}&gt;` : ''}</p>`,
        `Claim started for ${bizName}`,
      );
      return {
        ok: true,
        method,
        requiresCode: true,
        claimId,
        message: 'We’ve sent a 6-digit code by SMS to the phone number on file for this business. Enter it below to finish verifying your claim.',
      };
    }

    // manual
    await notifyDesk(
      `Manual claim to review — ${bizName}`,
      'A listing claim needs manual verification',
      `<p><strong>${esc(bizName)}</strong> (<code>${esc(slug)}</code>)</p>` +
      `<p>Channel: <strong>manual</strong> — no on-file email, no website-domain match, no usable phone/SMS. Verify ownership out-of-band before promoting.</p>` +
      `<p>Claimant: ${esc(name || '—')}${claimantEmail ? ` &lt;${esc(claimantEmail)}&gt;` : ''}${claimantPhone ? ` · ${esc(claimantPhone)}` : ''}</p>`,
      `Manual claim for ${bizName}`,
    );
    return { ok: true, method, message: GENERIC_MESSAGE };
  } catch {
    // Any unexpected failure still looks like a normal started claim.
    return generic;
  }
}

/**
 * Verify an email-link claim. Looks the claim up by token_hash, checks it is pending
 * and unexpired, marks it verified (clearing the single-use token), and FLIPS the
 * listing to owner-verified. Returns the slug (+type) on success. Never throws.
 */
export async function verifyClaimToken(token: string): Promise<VerifyResult> {
  const t = String(token ?? '').trim();
  if (!t) return { ok: false, error: 'not_found' };
  try {
    const sb = supabaseAdmin();
    const nowIso = new Date().toISOString();
    const { data } = await sb.from('directory_claims')
      .select('id, listing_slug, claimant_email, claimant_phone, status, expires_at, method')
      .eq('token_hash', sha256(t))
      .maybeSingle();
    const claim = data as Record<string, unknown> | null;
    if (!claim) return { ok: false, error: 'not_found' };
    // Single-use: a token on an already-settled claim is dead.
    if (String(claim.status) !== 'pending') return { ok: false, error: 'not_found' };
    if (claim.expires_at && String(claim.expires_at) < nowIso) {
      await sb.from('directory_claims').update({ status: 'expired', updated_at: nowIso }).eq('id', claim.id as string);
      return { ok: false, error: 'expired' };
    }

    // Mark verified and CLEAR the token so the link cannot be replayed.
    await sb.from('directory_claims')
      .update({ status: 'verified', verified_at: nowIso, token_hash: null, updated_at: nowIso })
      .eq('id', claim.id as string);

    const slug = String(claim.listing_slug);
    const contact = (claim.claimant_email as string) || (claim.claimant_phone as string) || null;
    const { type, name } = await flipListing(sb, slug, contact, nowIso);

    await notifyDesk(
      `Owner-verified — ${name}`,
      'A listing is now owner-verified',
      `<p><strong>${esc(name)}</strong> (<code>${esc(slug)}</code>) is now <strong>owner-verified</strong>.</p>` +
      `<p>Verified contact: ${esc(contact || '—')}</p>` +
      `<p>Next: complete the first-party profile (description, hours, photos) and discuss an upgraded placement.</p>`,
      `${name} is now owner-verified`,
    );
    return { ok: true, slug, type };
  } catch {
    return { ok: false, error: 'not_found' };
  }
}

/**
 * READ-ONLY lookup of an email-link claim by its token. This exists so the verify route
 * can render a branded CONFIRM page on GET **without** consuming the single-use token or
 * flipping the listing — that only happens on the deliberate POST (verifyClaimToken).
 * It is what makes the link safe against email security scanners / mailbox link
 * prefetchers, which issue background GETs: they reach this read only, never the flip.
 * Validates the claim is pending + unexpired and returns the business name for display.
 * NEVER mutates any row and NEVER throws.
 */
export async function peekClaimToken(token: string): Promise<PeekResult> {
  const t = String(token ?? '').trim();
  if (!t) return { ok: false, error: 'not_found' };
  try {
    const sb = supabaseAdmin();
    const nowIso = new Date().toISOString();
    const { data } = await sb.from('directory_claims')
      .select('id, listing_slug, status, expires_at')
      .eq('token_hash', sha256(t))
      .maybeSingle();
    const claim = data as Record<string, unknown> | null;
    if (!claim) return { ok: false, error: 'not_found' };
    // Single-use: a token on an already-settled claim is dead (mirror verifyClaimToken).
    if (String(claim.status) !== 'pending') return { ok: false, error: 'not_found' };
    // Expiry is REPORTED here but not persisted — peek must not write. The status flip to
    // 'expired' happens if/when the claimant actually submits the confirm (verifyClaimToken).
    if (claim.expires_at && String(claim.expires_at) < nowIso) return { ok: false, error: 'expired' };

    const slug = String(claim.listing_slug);
    let bizName = slug;
    try {
      const { data: L } = await sb.from('directory_listings').select('name_en').eq('slug', slug).maybeSingle();
      const r = (L || {}) as Record<string, unknown>;
      bizName = String(r.name_en || slug);
    } catch { /* fall back to the slug for display */ }
    return { ok: true, bizName, slug };
  } catch {
    return { ok: false, error: 'not_found' };
  }
}

/**
 * Verify a phone-OTP claim. Enforces expiry and an attempt limit (locks the claim
 * after OTP_MAX_ATTEMPTS). On success, flips the listing. Never throws.
 */
export async function verifyClaimOtp(input: { claimId: string; code: string }): Promise<VerifyResult> {
  const claimId = String(input.claimId ?? '').trim();
  const code = String(input.code ?? '').trim();
  if (!UUID_RE.test(claimId) || !/^\d{4,8}$/.test(code)) return { ok: false, error: 'invalid' };
  try {
    const sb = supabaseAdmin();
    const nowIso = new Date().toISOString();
    const { data } = await sb.from('directory_claims')
      .select('id, listing_slug, claimant_email, claimant_phone, status, expires_at, attempts, code_hash, method')
      .eq('id', claimId)
      .maybeSingle();
    const claim = data as Record<string, unknown> | null;
    if (!claim || String(claim.method) !== 'phone_otp') return { ok: false, error: 'not_found' };
    if (String(claim.status) !== 'pending') return { ok: false, error: 'not_found' };
    if (claim.expires_at && String(claim.expires_at) < nowIso) {
      await sb.from('directory_claims').update({ status: 'expired', updated_at: nowIso }).eq('id', claimId);
      return { ok: false, error: 'expired' };
    }
    const attempts = Number(claim.attempts || 0);
    if (attempts >= OTP_MAX_ATTEMPTS) {
      await sb.from('directory_claims').update({ status: 'rejected', updated_at: nowIso }).eq('id', claimId);
      return { ok: false, error: 'locked' };
    }

    const match = Boolean(claim.code_hash) && sha256(code) === String(claim.code_hash);
    if (!match) {
      const next = attempts + 1;
      const locked = next >= OTP_MAX_ATTEMPTS;
      await sb.from('directory_claims')
        .update({ attempts: next, ...(locked ? { status: 'rejected' } : {}), updated_at: nowIso })
        .eq('id', claimId);
      return locked ? { ok: false, error: 'locked' } : { ok: false, error: 'invalid', remaining: OTP_MAX_ATTEMPTS - next };
    }

    // Success — settle the claim, clear the single-use code, flip the listing.
    await sb.from('directory_claims')
      .update({ status: 'verified', verified_at: nowIso, code_hash: null, updated_at: nowIso })
      .eq('id', claimId);

    const slug = String(claim.listing_slug);
    const contact = (claim.claimant_phone as string) || (claim.claimant_email as string) || null;
    const { type, name } = await flipListing(sb, slug, contact, nowIso);

    await notifyDesk(
      `Owner-verified — ${name}`,
      'A listing is now owner-verified',
      `<p><strong>${esc(name)}</strong> (<code>${esc(slug)}</code>) is now <strong>owner-verified</strong> (phone OTP).</p>` +
      `<p>Verified contact: ${esc(contact || '—')}</p>` +
      `<p>Next: complete the first-party profile and discuss an upgraded placement.</p>`,
      `${name} is now owner-verified`,
    );
    return { ok: true, slug, type };
  } catch {
    return { ok: false, error: 'not_found' };
  }
}
