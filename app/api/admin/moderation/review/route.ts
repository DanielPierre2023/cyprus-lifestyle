// app/api/admin/moderation/review/route.ts
// Admin MODERATION — enrichment-review queue (directory_listings.text_status='review').
//   GET                                               → list the listings the
//        enrichment job held back (generated blurb failed the grounding gate;
//        summary_en left hollow, kept out of the sitemap).
//   POST { slug, action:'save'|'requeue'|'skip', text? }
//        • 'save'    — write the hand-authored summary_en (→ text_status='owned').
//        • 'requeue' — mark text_status='stub' so the next enrichment run retries.
//        • 'skip'    — no write; leave it in review (console dismisses it for now).
//
// AUTH: admin session only — the same isAdmin() gate as the other admin write routes.
// All writes go through supabaseAdmin() (inside lib/directory/moderation); no secret
// is exposed to the client.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { listReviewListings, applyReviewDecision, normalizeReviewAction } from '@/lib/directory/moderation';

export const runtime = 'nodejs';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const listings = await listReviewListings();
  return NextResponse.json({ ok: true, count: listings.length, listings });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const slug = typeof body.slug === 'string' ? body.slug : '';
  const action = normalizeReviewAction(body.action);
  const text = typeof body.text === 'string' ? body.text : undefined;
  if (!slug || !action) {
    return NextResponse.json({ ok: false, error: "Provide { slug, action:'save'|'requeue'|'skip', text? }." }, { status: 400 });
  }
  const res = await applyReviewDecision(slug, action, text);
  return NextResponse.json(res, { status: res.ok ? 200 : 400 });
}
