// POST /api/directory/owner/request  { slug, [HONEYPOT_FIELD] }
//   Ask for a secure management link for an owner-verified listing. The link is emailed
//   ONLY to the listing's on-file claim_contact (the proven owner) — it is never sent to
//   whatever address the caller types, and the contact is never revealed. The response is
//   ANTI-ENUMERATING: byte-identical whether or not the listing exists, is owner-verified,
//   or has an email on file. Rate-limited + honeypot, mirroring /api/directory/claim.
//
// Logic lives in lib/directory/owner.ts (service role). directory_owner_tokens has RLS on
// with no public policies, so this route is the public surface. Never throws to the caller.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { requestOwnerLink } from '@/lib/directory/owner';

export const runtime = 'nodejs';

// One generic message for EVERY outcome — nothing about the listing is leaked.
const GENERIC_MESSAGE =
  "Thanks — if this listing is a verified owner profile, we've emailed a secure management link to the contact address on file. Please check that inbox to continue.";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  // Honeypot: accept silently so bots don't learn they were caught (matches claim/review routes).
  if (isHoneypot(body)) return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
  if (!(await rateLimit(req, 'owner-request', 5, 60))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }

  const slug = String(body.slug || '').trim().slice(0, 200);
  if (!slug) return NextResponse.json({ ok: false, error: 'Missing listing.' }, { status: 400 });

  await requestOwnerLink(slug);
  // Always the same generic body — never reveal whether a link was actually sent.
  return NextResponse.json({ ok: true, message: GENERIC_MESSAGE });
}
