// POST /api/editorial/draft?id=<pieceId>&key=<ENRICH_SECRET>
// Draft the source edition of a piece in house voice, grounded in its dossier,
// questions and angle (plus any transcript/notes posted in the body: { notes }).
// The model returns markdown; we convert it to HTML for blog_posts.content_<lang>
// (the reader renders raw HTML), set word_count / reading_time, and advance
// pipeline_status to 'drafting'. Key-gated like the concierge routes.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { wordCount } from '@/lib/util';
import { denyReason, subjectFromListing } from '@/lib/editorial/gate';
import { draftPiece } from '@/lib/editorial/generate';
import { mdToHtml, isPieceKind, isFranchise, type PipelineSubject, type PieceKind } from '@/lib/editorial/pipeline';
import { getEditorialSettings } from '@/lib/editorial/settings';
import { attachCover, coverInputFromPiece, type CoverResult } from '@/lib/editorial/cover';
import { packagePiece } from '@/lib/editorial/generate';
import { packageColumns, pieceToPackageInput, packageIsEmpty } from '@/lib/editorial/packageWrite';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function run(req: NextRequest): Promise<Record<string, unknown>> {
  const id = req.nextUrl.searchParams.get('id') || '';
  if (!id) return { ok: false, error: 'Missing ?id= (the piece id).' };
  const sb = supabaseAdmin();

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* optional body */ }
  const extraNotes = typeof body.notes === 'string' ? body.notes.trim() : '';

  const { data: piece, error } = await sb.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error) return { ok: false, error: `Could not load the piece: ${error.message}` };
  if (!piece) return { ok: false, error: 'No piece with that id.' };
  const p = piece as Record<string, unknown>;

  const sourceLang = (typeof p.source_lang === 'string' && p.source_lang) || 'en';
  const kind: PieceKind = typeof p.kind === 'string' && isPieceKind(p.kind) ? p.kind : 'feature';
  const franchise = typeof p.franchise === 'string' && isFranchise(p.franchise) ? p.franchise : 'behind-the-business';

  // Subject: linked listing if any, else the piece's own working title + angle.
  let subject: PipelineSubject | null = null;
  if (p.subject_listing_id) {
    const { data: listing } = await sb.from('directory_listings').select('*').eq('id', p.subject_listing_id).maybeSingle();
    subject = subjectFromListing(listing as Record<string, unknown> | null);
  }
  if (!subject) {
    const title = (p[`title_${sourceLang}`] as string) || (p.title_en as string) || '';
    if (!title) return { ok: false, error: 'The piece has no subject listing and no working title to write from.' };
    subject = { name: title, summary: (p.angle as string) || null };
  }

  // Assemble grounding notes: dossier briefing + questions + angle + posted notes.
  const dossier = (p.dossier && typeof p.dossier === 'object') ? p.dossier as Record<string, unknown> : {};
  const questions = Array.isArray(p.questions) ? (p.questions as unknown[]).map(String) : [];
  const notes = [
    p.angle ? `ANGLE: ${p.angle}` : '',
    typeof dossier.briefing === 'string' && dossier.briefing ? `DOSSIER:\n${dossier.briefing}` : '',
    questions.length ? `INTERVIEW QUESTIONS:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : '',
    extraNotes ? `EDITOR / TRANSCRIPT NOTES:\n${extraNotes}` : '',
  ].filter(Boolean).join('\n\n');

  const res = await draftPiece({ kind, franchise, notes, subject });
  if (res.error) return { ok: false, error: res.error };

  const html = mdToHtml(res.bodyMd);
  const words = wordCount(html);
  const upd: Record<string, unknown> = {
    [`content_${sourceLang}`]: html,
    word_count: words,
    reading_time_min: Math.max(1, Math.ceil(words / 200)),
    pipeline_status: 'drafting',
  };
  if (res.title) upd[`title_${sourceLang}`] = res.title;

  const { error: ue } = await sb.from('blog_posts').update(upd).eq('id', id);
  if (ue) return { ok: false, error: `Drafted the piece but could not save it: ${ue.message}` };

  // Enrich the fresh draft (best-effort, time-boxed, CONCURRENT) — same policy as the
  // admin draft route: a real cover photo + the source-edition SEO/editorial package
  // (excerpt, summary, SEO title/description, tags, FAQ). Never risks the 60s budget;
  // translation carries the package into the other six editions.
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

  return {
    ok: true,
    id,
    title: titleForMeta,
    words,
    sourceLang,
    pipeline_status: 'drafting',
    cover,
    seo,
    note: `Draft written (${words} words). Next: edit, then POST /api/editorial/translate?id=${id}`,
  };
}

export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req));
}
