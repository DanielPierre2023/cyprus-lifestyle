// POST /api/partner/claim  { slug, email, name?, phone?, [HONEYPOT_FIELD] }
// ---------------------------------------------------------------------------
// DEPRECATED — this used to be a SECOND, weaker claim path (roadmap item 09): it emailed a
// verification link to WHOEVER matched the on-file email/domain, did NOT flip provenance,
// and wrote to its own `listing_claims` table. It has been RETIRED in favour of the single
// CLAIM-TO-OWN engine in lib/directory/claims.ts (canonical route: /api/directory/claim).
//
// To keep ONE claim path while NOT breaking any client still POSTing here, this endpoint now
// DELEGATES to startClaim(): the honest-verification engine that
//   • sends the secret only to the strongest proof-of-control recipient (on-file email →
//     website-domain match → phone OTP → manual) — never "to whatever the caller typed";
//   • FLIPS the listing to owner-verified on a confirmed claim (the old flow never did);
//   • returns an anti-enumerating, byte-identical response across email/manual outcomes.
// The in-repo UI (/partner) has been repointed to /api/directory/claim directly, so this
// route is now only a compatibility shim. Prefer /api/directory/claim for new work.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { startClaim } from '@/lib/directory/claims';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// A single generic, non-enumerating reply for inputs we don't forward (keeps parity with the
// engine's own generic message, so this shim can never reveal whether a listing/email exists).
const GENERIC =
  "Thanks — we've started verifying your claim. If ownership can be confirmed, a verification link will be sent to the business's contact address on file (or to your email if it matches the business's own website). Otherwise our team will review your request and follow up with you by email.";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  // Honeypot: accept silently so bots don't learn they were caught (matches /api/directory/claim).
  if (isHoneypot(body)) return NextResponse.json({ ok: true });
  if (!(await rateLimit(req, 'partner-claim', 8, 60))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }

  const slug = String(body.slug || '').trim().slice(0, 200);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 160);
  const name = String(body.name || '').trim().slice(0, 160) || null;
  const phone = String(body.phone || '').trim().slice(0, 40) || null;

  // Preserve the historical input contract: { slug, email } is enough. Invalid input gets the
  // same generic success as before (no enumeration), without starting a claim.
  if (!slug || !EMAIL_RE.test(email)) return NextResponse.json({ ok: true, message: GENERIC });

  const res = await startClaim({ slug, name, email, phone });

  // Phone-OTP is the only channel that must expose a code step; everything else returns the
  // single generic message so nothing about the listing is leaked.
  if (res.requiresCode && res.claimId) {
    return NextResponse.json({ ok: true, requiresCode: true, claimId: res.claimId, message: res.message });
  }
  return NextResponse.json({ ok: true, message: res.message });
}
