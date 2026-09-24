// POST /api/admin/editorial/cover   (admin session-gated)
// Give ONE piece a matching cover image, on demand — from the board's "Photo" /
// "AI image" buttons, or to re-roll an existing cover.
//   Body: { id, mode?: 'stock' | 'ai' | 'stock-then-ai' }
//     mode defaults to the desk's imageSource setting.
//   • stock         — a real, relevance-ranked Unsplash photo (Cyprus-grounded).
//   • ai            — a photorealistic editorial illustration (gpt-image-1),
//                     grounded on the same brief, stored in the blog-images bucket.
//   • stock-then-ai — a real photo if one fits, else an AI illustration.
// force:true always replaces the current cover (the board buttons set it), so this
// is also the "swap the photo" action.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getEditorialSettings } from '@/lib/editorial/settings';
import { attachCover, coverInputFromPiece, type ImageSource } from '@/lib/editorial/cover';

export const runtime = 'nodejs';
export const maxDuration = 60; // AI generation needs the headroom.

const MODES: ImageSource[] = ['off', 'stock', 'ai', 'stock-then-ai'];

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = typeof body.id === 'string' ? body.id : '';
  if (!id) return NextResponse.json({ ok: false, error: 'Provide { id }.' }, { status: 400 });

  const settings = await getEditorialSettings();
  const mode: ImageSource = MODES.includes(body.mode as ImageSource) && body.mode !== 'off'
    ? (body.mode as ImageSource)
    : (settings.imageSource === 'off' ? 'stock' : settings.imageSource);

  const sb = supabaseAdmin();
  const { data: piece, error } = await sb.from('blog_posts')
    .select('id, slug, source_lang, title_en, title_el, category, subcategory, county, angle, excerpt_en, summary_en, cover_image')
    .eq('id', id).maybeSingle();
  if (error || !piece) return NextResponse.json({ ok: false, error: 'Piece not found.' }, { status: 404 });
  const p = piece as Record<string, unknown>;

  const sourceLang = (typeof p.source_lang === 'string' && p.source_lang) || 'en';
  const input = coverInputFromPiece(p, sourceLang);
  if (!input.title) return NextResponse.json({ ok: false, error: 'The piece has no title to search a cover from.' }, { status: 400 });

  // force:true — this route is an explicit choice, so it always (re)sets the cover.
  const cover = await attachCover(id, input, mode, { force: true });
  if (!cover) {
    return NextResponse.json({
      ok: false,
      error: mode === 'stock'
        ? 'No matching photo found (or Unsplash is not configured). Try AI, or set one from the editor.'
        : 'Could not generate a cover. Check the image keys, or try a different mode.',
    }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id, source: cover.source, url: cover.url, credit: cover.credit });
}
