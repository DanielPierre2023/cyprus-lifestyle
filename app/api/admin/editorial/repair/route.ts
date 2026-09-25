// POST /api/admin/editorial/repair   (admin session-gated)
// Improve ONE edition of a piece in place — the action behind the /admin/quality
// "Clean" / "Rewrite" buttons. Language-aware and cost-aware:
//   • 'clean'  (default) — for the inflected editions (el/ar/de/pl/ru): the
//                deterministic humaniser + a targeted Haiku rewrite of the flagged
//                AI-tells (proofread), keeping whichever scores cleaner. For the
//                source editions (en/ro), a full Sonnet polish, since the light
//                pass has nothing to add there.
//   • 'polish' — force the full Sonnet polish in any language.
//   • 'rewrite'/'transcreate' — re-report the edition natively from the SOURCE
//                (Sonnet), for translations that read poorly however much they're
//                cleaned.
// Re-scores before/after and saves the improved edition. Facts/quotes are preserved
// by the underlying passes; nothing is invented.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { scoreAiTells, type Lang } from '@/lib/antiAi';
import { proofread, AI_PROOFREAD_LANGS } from '@/lib/desk/proofread';
import { polishPiece, transcreatePiece } from '@/lib/editorial/generate';
import { isPieceKind, isFranchise, type PieceKind } from '@/lib/editorial/pipeline';
import { stripHtml } from '@/lib/editorial/qualityScan';
import { wordCount } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANGS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = typeof b.id === 'string' ? b.id : '';
  const locale = typeof b.locale === 'string' ? b.locale : '';
  const wanted = typeof b.mode === 'string' ? b.mode : 'clean';
  const mode = ['clean', 'polish', 'rewrite', 'transcreate'].includes(wanted) ? wanted : 'clean';
  if (!id || !LANGS.includes(locale)) {
    return NextResponse.json({ ok: false, error: 'Provide { id, locale }.' }, { status: 400 });
  }

  const sb = supabaseAdmin();
  const { data: piece, error } = await sb.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error || !piece) return NextResponse.json({ ok: false, error: 'Piece not found.' }, { status: 404 });
  const p = piece as Record<string, unknown>;

  const src = (typeof p.source_lang === 'string' && p.source_lang) || 'en';
  const body = String(p[`content_${locale}`] || '');
  const title = String(p[`title_${locale}`] || p[`title_${src}`] || '');
  const franchise = typeof p.franchise === 'string' && isFranchise(p.franchise) ? p.franchise : null;
  const kind: PieceKind = typeof p.kind === 'string' && isPieceKind(p.kind) ? p.kind : 'feature';

  const isTranscreate = mode === 'rewrite' || mode === 'transcreate';
  if (!body.trim() && !isTranscreate) {
    return NextResponse.json({ ok: false, error: 'That edition has no body to clean — translate/backfill it first.' }, { status: 400 });
  }

  const before = scoreAiTells({ title, content: stripHtml(body), lang: locale as Lang });

  let outTitle = title;
  let outBody = body;
  let changed = false;
  let used = mode;
  let note = '';

  try {
    if (isTranscreate) {
      // Re-report this edition natively from the source edition.
      const srcTitle = String(p[`title_${src}`] || title);
      const srcBody = String(p[`content_${src}`] || body);
      if (!srcBody.trim()) return NextResponse.json({ ok: false, error: 'No source edition to rewrite from.' }, { status: 400 });
      const tc = await transcreatePiece(srcTitle, srcBody, locale);
      if (tc.error || !tc.body) return NextResponse.json({ ok: false, error: tc.error || 'Rewrite came back empty.' }, { status: 502 });
      outBody = tc.body; if (tc.title) outTitle = tc.title; changed = true; used = 'rewrite';
    } else if (mode === 'polish' || locale === src || !AI_PROOFREAD_LANGS.includes(locale as Lang)) {
      // Full Sonnet polish: the source editions (en/ro) and any explicit request.
      const pol = await polishPiece(title, body, franchise, kind, locale);
      if (pol.error || !pol.bodyMd) return NextResponse.json({ ok: false, error: pol.error || 'Polish came back empty.' }, { status: 502 });
      outBody = pol.bodyMd; if (pol.title) outTitle = pol.title; changed = true; used = 'polish';
    } else {
      // Light, cost-bounded clean for the inflected editions (el/ar/de/pl/ru).
      const pr = await proofread({ text: body, lang: locale as Lang, isHtml: true, title });
      outBody = pr.text; changed = pr.changed; used = 'clean';
      if (!changed) note = 'Already clean at this level — no rewrite needed.';
    }
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }

  const after = scoreAiTells({ title: outTitle, content: stripHtml(outBody), lang: locale as Lang });

  // Persist the improved edition (only when we actually have content).
  if (outBody.trim()) {
    const upd: Record<string, unknown> = { [`content_${locale}`]: outBody };
    if (outTitle && outTitle !== title) upd[`title_${locale}`] = outTitle;
    if (locale === src) {
      const w = wordCount(outBody);
      upd.word_count = w;
      upd.reading_time_min = Math.max(1, Math.ceil(w / 200));
    }
    const { error: ue } = await sb.from('blog_posts').update(upd).eq('id', id);
    if (ue) return NextResponse.json({ ok: false, error: `Improved but could not save: ${ue.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true, id, locale, mode: used, changed,
    before: before.score, after: after.score, level: after.level, note,
  });
}
