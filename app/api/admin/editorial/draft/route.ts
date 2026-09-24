// POST /api/admin/editorial/draft   (admin session-gated)
// Draft ONE commissioned piece by id, in house voice + the franchise format + the
// anti-AI craft layer, and advance it to 'editing'. This runs as its own request
// (its own 60s budget), so the cockpit calls it as a second step after Approve —
// which keeps each step well inside the function limit (no inline-draft timeout).
// Body: { id, notes? }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { wordCount } from '@/lib/util';
import { subjectFromListing } from '@/lib/editorial/gate';
import { draftPiece } from '@/lib/editorial/generate';
import { mdToHtml, isPieceKind, isFranchise, type PipelineSubject, type PieceKind } from '@/lib/editorial/pipeline';
import { getEditorialSettings } from '@/lib/editorial/settings';
import { attachCover, coverInputFromPiece, type CoverResult } from '@/lib/editorial/cover';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = typeof body.id === 'string' ? body.id : '';
  const extraNotes = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (!id) return NextResponse.json({ ok: false, error: 'Provide { id }.' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data: piece, error } = await sb.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error || !piece) return NextResponse.json({ ok: false, error: 'Piece not found.' }, { status: 404 });
  const p = piece as Record<string, unknown>;

  const sourceLang = (typeof p.source_lang === 'string' && p.source_lang) || 'en';
  const kind: PieceKind = typeof p.kind === 'string' && isPieceKind(p.kind) ? p.kind : 'feature';
  const franchise = typeof p.franchise === 'string' && isFranchise(p.franchise) ? p.franchise : 'behind-the-business';

  let subject: PipelineSubject | null = null;
  if (p.subject_listing_id) {
    const { data: listing } = await sb.from('directory_listings').select('*').eq('id', p.subject_listing_id).maybeSingle();
    subject = subjectFromListing(listing as Record<string, unknown> | null);
  }
  if (!subject) {
    const title = (p[`title_${sourceLang}`] as string) || (p.title_en as string) || '';
    if (!title) return NextResponse.json({ ok: false, error: 'The piece has no subject and no working title to write from.' }, { status: 400 });
    subject = { name: title, summary: (p.angle as string) || null };
  }

  const dossier = (p.dossier && typeof p.dossier === 'object') ? p.dossier as Record<string, unknown> : {};
  const questions = Array.isArray(p.questions) ? (p.questions as unknown[]).map(String) : [];
  const notes = [
    p.angle ? `ANGLE: ${p.angle}` : '',
    typeof dossier.briefing === 'string' && dossier.briefing ? `BRIEF:\n${dossier.briefing}` : '',
    questions.length ? `INTERVIEW QUESTIONS:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : '',
    extraNotes ? `EDITOR / TRANSCRIPT NOTES:\n${extraNotes}` : '',
  ].filter(Boolean).join('\n\n');

  const res = await draftPiece({ kind, franchise, notes, subject });
  if (res.error || !res.bodyMd) return NextResponse.json({ ok: false, error: res.error || 'The draft came back empty.' }, { status: 502 });

  const html = mdToHtml(res.bodyMd);
  const words = wordCount(html);
  const upd: Record<string, unknown> = {
    [`content_${sourceLang}`]: html,
    word_count: words,
    reading_time_min: Math.max(1, Math.ceil(words / 200)),
    pipeline_status: 'editing',
  };
  if (res.title) upd[`title_${sourceLang}`] = res.title;
  const { error: ue } = await sb.from('blog_posts').update(upd).eq('id', id);
  if (ue) return NextResponse.json({ ok: false, error: `Drafted but could not save: ${ue.message}` }, { status: 500 });

  // Auto-attach a real, matching cover photo (best-effort). Uses STOCK only on this
  // path — it's fast and free, and it never risks the 60s draft budget (AI covers are
  // on-demand via /api/admin/editorial/cover). Time-boxed so a slow photo search can
  // never turn a saved draft into a timeout; the piece just stays cover-less and can
  // be given one from the board.
  let cover: { source: string; url: string } | null = null;
  try {
    const settings = await getEditorialSettings();
    if (settings.autoCover && !p.cover_image) {
      const ci = coverInputFromPiece({ ...p, [`title_${sourceLang}`]: res.title || p[`title_${sourceLang}`] }, sourceLang);
      const c = await Promise.race<CoverResult | null>([
        attachCover(id, ci, 'stock', { existing: (p.cover_image as string) || null }),
        new Promise<null>((r) => setTimeout(() => r(null), 12000)),
      ]);
      if (c) cover = { source: c.source, url: c.url };
    }
  } catch { /* imagery is best-effort */ }

  return NextResponse.json({ ok: true, id, title: res.title || (p[`title_${sourceLang}`] as string) || '', words, sourceLang, pipeline_status: 'editing', cover });
}
