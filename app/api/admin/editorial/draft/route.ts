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
import { packagePiece } from '@/lib/editorial/generate';
import { packageColumns, pieceToPackageInput, packageIsEmpty } from '@/lib/editorial/packageWrite';

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

  // Enrich the fresh draft (best-effort, time-boxed, CONCURRENT so neither risks the
  // 60s budget): a real matching cover photo, and the SEO + editorial package for the
  // source edition (excerpt, summary, SEO title/description, tags, FAQ). Both degrade
  // silently — a saved draft is never turned into a timeout, and anything skipped is
  // backfillable from the board's "SEO" / "Photo" buttons. Translation carries the
  // package into the other six editions later.
  const box = <T>(pr: Promise<T>, ms: number) =>
    Promise.race<T | null>([pr, new Promise<null>((r) => setTimeout(() => r(null), ms))]);
  const titleForMeta = res.title || (p[`title_${sourceLang}`] as string) || '';

  let cover: { source: string; url: string } | null = null;
  let seo: { seo: boolean; tags: number; faq: number } | null = null;
  try {
    const settings = await getEditorialSettings();
    const wantCover = settings.autoCover && !p.cover_image;
    const [c, sk] = await Promise.all([
      wantCover
        ? box(attachCover(
            id,
            coverInputFromPiece({ ...p, [`title_${sourceLang}`]: titleForMeta }, sourceLang),
            'stock',
            { existing: (p.cover_image as string) || null },
          ), 12000)
        : Promise.resolve<CoverResult | null>(null),
      box((async () => {
        try {
          const pkg = await packagePiece(pieceToPackageInput({ ...p, [`title_${sourceLang}`]: titleForMeta }, sourceLang, res.bodyMd));
          if (packageIsEmpty(pkg)) return null;
          await sb.from('blog_posts').update(packageColumns(sourceLang, pkg)).eq('id', id);
          return pkg;
        } catch { return null; }
      })(), 16000),
    ]);
    if (c) cover = { source: c.source, url: c.url };
    if (sk) seo = { seo: !!sk.seoTitle, tags: sk.tags.length, faq: sk.faq.length };
  } catch { /* enrichment is best-effort */ }

  return NextResponse.json({ ok: true, id, title: titleForMeta, words, sourceLang, pipeline_status: 'editing', cover, seo });
}
