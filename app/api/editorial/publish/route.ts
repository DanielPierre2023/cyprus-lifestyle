// POST /api/editorial/publish?id=<pieceId>&key=<ENRICH_SECRET>
// Take a piece live: set status 'published' + pipeline_status 'published' (this is
// what makes it visible to the public — blog_posts is read publicly only where
// status = 'published'), stamping published_at (honouring scheduled_at if it is set).
// Then ELEVATE the subject business in the directory — featured = true, and
// commercial_tier = 'featured' only if it is currently null (never downgrading an
// existing partner/featured/listed tier). Key-gated like the concierge routes.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { denyReason } from '@/lib/editorial/gate';
import { getEditorialSettings } from '@/lib/editorial/settings';
import { proofread, AI_PROOFREAD_LANGS } from '@/lib/desk/proofread';
import type { Lang } from '@/lib/antiAi';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function run(req: NextRequest): Promise<Record<string, unknown>> {
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return { ok: false, error: 'Missing ?id= (the piece id).' };
  const sb = supabaseAdmin();

  const { data: piece, error } = await sb.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error) return { ok: false, error: `Could not load the piece: ${error.message}` };
  if (!piece) return { ok: false, error: 'No piece with that id.' };
  const p = piece as {
    id: string; slug: string; status: string | null;
    published_at: string | null; scheduled_at: string | null; subject_listing_id: string | null;
  };
  const row = piece as Record<string, unknown>;

  // AUTO-CLEAN BEFORE GO-LIVE. Any inflected edition (el/ar/de/pl/ru) that still
  // reads medium+ on the AI-tell score gets the proofread pass right now, so the
  // published version is clean however the piece reached publish (translated, then
  // hand-edited, re-published, etc.). proofread() self-gates on the score, so a
  // clean edition triggers no model call and costs nothing. Toggle via settings.
  const clean: Record<string, unknown> = {};
  const autoCleaned: string[] = [];
  try {
    if ((await getEditorialSettings()).autoClean) {
      for (const l of AI_PROOFREAD_LANGS as Lang[]) {
        const body = String(row[`content_${l}`] || '');
        if (!body.trim()) continue;
        try {
          const pr = await proofread({ text: body, lang: l, isHtml: true, title: String(row[`title_${l}`] || '') });
          if (pr.changed && pr.text) { clean[`content_${l}`] = pr.text; autoCleaned.push(l); }
        } catch { /* keep the existing edition on any proofread failure */ }
      }
    }
  } catch { /* settings unavailable → publish without the clean pass */ }

  const publishedAt = p.published_at || p.scheduled_at || new Date().toISOString();
  const { error: ue } = await sb.from('blog_posts').update({
    ...clean,
    status: 'published',
    pipeline_status: 'published',
    published_at: publishedAt,
  }).eq('id', id);
  if (ue) return { ok: false, error: `Could not publish the piece: ${ue.message}` };

  // Elevate the subject business — the client-acquisition payoff of the interview.
  let elevated: Record<string, unknown> | null = null;
  if (p.subject_listing_id) {
    const { data: listing } = await sb.from('directory_listings')
      .select('id, commercial_tier').eq('id', p.subject_listing_id).maybeSingle();
    if (listing) {
      const l = listing as { id: string; commercial_tier: string | null };
      const upd: Record<string, unknown> = { featured: true };
      if (l.commercial_tier == null) upd.commercial_tier = 'featured'; // never downgrade an existing tier
      const { error: le } = await sb.from('directory_listings').update(upd).eq('id', l.id);
      elevated = le
        ? { listingId: l.id, error: le.message }
        : { listingId: l.id, featured: true, commercial_tier: l.commercial_tier ?? 'featured' };
    }
  }

  return {
    ok: true,
    id,
    slug: p.slug,
    status: 'published',
    pipeline_status: 'published',
    published_at: publishedAt,
    autoCleaned,
    elevated,
    note: elevated ? 'Published and the subject business elevated in the directory.' : 'Published (no subject listing to elevate).',
  };
}

export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req));
}
