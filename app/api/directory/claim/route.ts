// POST /api/directory/claim  { slug, name, email, phone?, [HONEYPOT_FIELD] }
//   Start a CLAIM-TO-OWN for a directory listing. Honest verification: the channel is
//   chosen server-side by priority (on-file email → website-domain email → phone OTP →
//   manual) in lib/directory/claims.ts, and a link/OTP is sent only to an address/phone
//   that proves control of the BUSINESS. The response is ANTI-ENUMERATING: for every
//   email/manual outcome it is byte-identical, so a caller cannot tell whether a listing
//   has an on-file email, a matching domain, or nothing. Rate-limited + honeypot, mirroring
//   /api/directory/lead and /api/directory/reviews.
//
// Reads/writes go through lib/directory/claims.ts (service role). directory_claims has RLS
// on with no public policies, so this route is the public surface.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { startClaim } from '@/lib/directory/claims';
import { localeOf } from '@/lib/i18n/resolveLocale';
import { errorBody } from '@/lib/i18n/apiErrors';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  // Honeypot: accept silently so bots don't learn they were caught (matches lead/review routes).
  if (isHoneypot(body)) return NextResponse.json({ ok: true });
  const locale = localeOf(req, body.locale);
  // Errors carry a stable `code` (new) next to `error` (same English text for en, localised otherwise).
  if (!(await rateLimit(req, 'directory-claim', 5, 60))) {
    return NextResponse.json(errorBody('rate_limited', locale), { status: 429 });
  }

  const slug = String(body.slug || '').trim().slice(0, 200);
  const name = String(body.name || '').trim().slice(0, 160);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  const phone = String(body.phone || '').trim().slice(0, 40) || null;

  if (!slug) return NextResponse.json(errorBody('missing_listing', locale), { status: 400 });
  if (!name || !EMAIL_RE.test(email)) {
    return NextResponse.json(errorBody('name_email_required', locale), { status: 400 });
  }

  const res = await startClaim({ slug, name, email, phone, locale });

  // Phone-OTP is the only channel that must expose more (the claimant enters a code).
  // Everything else returns an identical body so nothing about the listing is leaked.
  if (res.requiresCode && res.claimId) {
    return NextResponse.json({ ok: true, requiresCode: true, claimId: res.claimId, message: res.message });
  }
  return NextResponse.json({ ok: true, message: res.message });
}
