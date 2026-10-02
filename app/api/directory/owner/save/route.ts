// POST /api/directory/owner/save  { slug, description?, website?, hours?, socials?, amenities?, photos?, [HONEYPOT_FIELD] }
//   Save an owner's edits to their OWN listing. Authenticated by the httpOnly editing-session
//   cookie set by /api/directory/owner/verify — the session must resolve to the posted slug.
//   Low-risk structured fields (website/hours/socials/amenities) are written straight to the
//   listing; free-text (description) and photo URLs are queued for moderation. Rate-limited +
//   honeypot. The session token is read ONLY from the httpOnly cookie, never from the body.
//
// Logic lives in lib/directory/owner.ts (service role). Never throws to the caller.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { saveOwnerEdits, OWNER_COOKIE, type OwnerSaveInput } from '@/lib/directory/owner';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  // Honeypot: accept silently so bots don't learn they were caught.
  if (isHoneypot(body)) return NextResponse.json({ ok: true, saved: [], pending: [] });
  if (!(await rateLimit(req, 'owner-save', 10, 60))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }

  const session = req.cookies.get(OWNER_COOKIE)?.value || '';
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Your editing session has expired. Please request a fresh management link.' }, { status: 401 });
  }

  const slug = String(body.slug || '').trim().slice(0, 200);
  if (!slug) return NextResponse.json({ ok: false, error: 'Missing listing.' }, { status: 400 });

  const payload: OwnerSaveInput = {
    description: body.description,
    website: body.website,
    hours: body.hours,
    socials: body.socials,
    amenities: body.amenities,
    photos: body.photos,
  };

  const res = await saveOwnerEdits(slug, session, payload);

  if (!res.ok) {
    if (res.error === 'unauthorized') {
      return NextResponse.json({ ok: false, error: 'Your editing session is no longer valid. Please request a fresh management link.' }, { status: 401 });
    }
    if (res.error === 'nothing') {
      return NextResponse.json({ ok: false, error: 'Nothing to save — add or change a field first.' }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: 'Could not save your changes — please try again.' }, { status: 400 });
  }

  return NextResponse.json({ ok: true, saved: res.saved, pending: res.pending });
}
