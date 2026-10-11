// /api/directory/reviews
//   POST { slug, rating, author?, contact?, body?, locale? }
//     Submit a FIRST-PARTY review for a directory listing. Stored status='pending'
//     (moderation is a NEXT-PHASE step — no admin/approval UI is built here).
//     Rate-limited + honeypot, mirroring /api/directory/lead.
//   GET  ?slug=…  → { ok, reviews }  (APPROVED reviews only)
//
// Reads/writes go through lib/directory/reviews.ts (service role). directory_reviews
// has RLS on with no public policies, so this route is the public surface.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { submitReview, getApprovedReviews } from '@/lib/directory/reviews';
import { isLocale } from '@/lib/locales';
import { localeOf } from '@/lib/i18n/resolveLocale';
import { errorBody, codedError, errorMessage } from '@/lib/i18n/apiErrors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  // Honeypot: accept silently so bots don't learn they were caught (matches lead route).
  if (isHoneypot(body)) return NextResponse.json({ ok: true });
  if (!(await rateLimit(req, 'directory-review', 5, 60))) {
    return NextResponse.json(errorBody('rate_limited', localeOf(req, body.locale)), { status: 429 });
  }

  const slug = String(body.slug || '').trim().slice(0, 200);
  const rating = Math.trunc(Number(body.rating));
  const author = String(body.author || '').trim().slice(0, 120) || null;
  const contact = String(body.contact || '').trim().slice(0, 200) || null;
  const text = String(body.body || '').trim().slice(0, 4000) || null;
  const locale = isLocale(String(body.locale)) ? String(body.locale) : 'en';

  if (!slug) return NextResponse.json(errorBody('missing_listing', locale), { status: 400 });
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(errorBody('rating_range', locale), { status: 400 });
  }
  if (text !== null && text.length < 2) {
    return NextResponse.json(errorBody('review_too_short', locale), { status: 400 });
  }

  const res = await submitReview({ slug, author, contact, rating, body: text, locale });
  if (!res.ok) return NextResponse.json(codedError('review_failed', res.error || errorMessage('review_failed', 'en')), { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const slug = (new URL(req.url).searchParams.get('slug') || '').trim().slice(0, 200);
  if (!slug) return NextResponse.json(errorBody('missing_slug', localeOf(req)), { status: 400 });
  const reviews = await getApprovedReviews(slug);
  return NextResponse.json({ ok: true, reviews });
}
