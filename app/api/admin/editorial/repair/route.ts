// POST /api/admin/editorial/repair   (admin session-gated)
// Improve ONE edition of a piece in place: the action behind the /admin/quality "Clean" / "Rewrite" buttons.
// One standard for everything (lib/voice), the same scorer the Quality tab shows:
//   • 'clean' / 'polish' (default) — the editor: deterministic clean, then up to two model passes in the edition's own language.
//                A result is saved ONLY if it scores better, keeps every figure, quote and name, and (for scraped pieces)
//                does not copy the source. Otherwise nothing changes and the answer says why.
//   • 'rewrite' / 'transcreate' — re-report the edition natively from the SOURCE edition (under the house rule "no sources named"),
//                then judged by the same rules; saved only when it is a real improvement (lib/voice/accept.ts).
// Every save writes admin_audit_log (action 'voice.repair') with the previous title and body, so any edition can be restored.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { transcreatePiece } from '@/lib/editorial/generate';
import { auditAdminRequest } from '@/lib/auditRequest';
import { auditLog } from '@/lib/audit';
import { wordCount } from '@/lib/util';
import { runVoiceOnce, deskOfRow } from '@/lib/voice/runner';
import { scoreVoice, asLang } from '@/lib/voice/score';
import { checkFacts } from '@/lib/voice/guards';
import { mechanicalClean } from '@/lib/voice/revise';
import { judgeRewrite } from '@/lib/voice/accept';
import { parityOf, LANGS as PARITY_LANGS, type PLang } from '@/lib/voice/parity';

export const runtime = 'nodejs';
export const maxDuration = 60;

const LANGS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  auditAdminRequest(req, 'editorial.repair');
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const id = typeof b.id === 'string' ? b.id : '';
  const locale = typeof b.locale === 'string' ? b.locale : '';
  const wanted = typeof b.mode === 'string' ? b.mode : 'clean';
  const mode = ['clean', 'polish', 'rewrite', 'transcreate'].includes(wanted) ? wanted : 'clean';
  if (!id || !LANGS.includes(locale)) return NextResponse.json({ ok: false, error: 'Provide { id, locale }.' }, { status: 400 });

  const sb = supabaseAdmin();
  const isTranscreate = mode === 'rewrite' || mode === 'transcreate';

  if (!isTranscreate) {
    try {
      const r = await runVoiceOnce(sb, { id, lang: locale });
      if (!r.ran) return NextResponse.json({ ok: false, error: r.reason || 'Nothing to clean here (the edition is empty or was not found).' }, { status: 400 });
      const after = r.after ?? r.before ?? 0;
      return NextResponse.json({
        ok: true, id, locale, mode: 'clean', changed: !!r.saved, before: r.before, after, ok_standard: !!r.ok,
        note: r.saved ? '' : (r.log && r.log[r.log.length - 1]) || 'No safe improvement found; the text was left as it was.',
      });
    } catch (e) {
      return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
    }
  }

  // ── rewrite: re-report natively from the source edition ──
  const { data: piece, error } = await sb.from('blog_posts').select('*').eq('id', id).maybeSingle();
  if (error || !piece) return NextResponse.json({ ok: false, error: 'Piece not found.' }, { status: 404 });
  const p = piece as Record<string, unknown>;
  const src = (typeof p.source_lang === 'string' && p.source_lang) || 'en';
  const lang = asLang(locale);
  const desk = deskOfRow(p);
  const body = String(p[`content_${locale}`] || '');
  const title = String(p[`title_${locale}`] || p[`title_${src}`] || '');
  const srcTitle = String(p[`title_${src}`] || title);
  const srcBody = String(p[`content_${src}`] || '');
  if (!srcBody.trim()) return NextResponse.json({ ok: false, error: 'No source edition to rewrite from.' }, { status: 400 });

  try {
    const before = scoreVoice({ title, body, lang, desk });
    const tc = await transcreatePiece(srcTitle, srcBody, locale);
    if (tc.error || !tc.body) return NextResponse.json({ ok: false, error: tc.error || 'Rewrite came back empty.' }, { status: 502 });
    const outBody = mechanicalClean(tc.body, lang);
    const outTitle = tc.title || title;
    const after = scoreVoice({ title: outTitle, body: outBody, lang, desk });
    const facts = checkFacts(srcBody, outBody, { sameLanguage: false });
    const hadNothing = !body.trim();
    // Is this edition out of line with its siblings (far too short or too long, figures missing), and does the rewrite put it back?
    const bodies = Object.fromEntries(PARITY_LANGS.map((l) => [l, String(p[`content_${l}`] || '')])) as Partial<Record<PLang, string>>;
    const statusOf = (r: ReturnType<typeof parityOf>) => r.editions.find((e) => e.lang === locale)?.status;
    const parityFixed = statusOf(parityOf(bodies)) !== 'ok' && statusOf(parityOf({ ...bodies, [locale]: outBody })) === 'ok';
    // Saved only when it is a real improvement (lib/voice/accept.ts): equal is not better, and the ceiling of 100 hides nothing.
    const verdict = judgeRewrite({ hadNothing, factsOk: facts.ok, factReasons: facts.reasons, before, after, parityFixed });
    if (!verdict.save) return NextResponse.json({ ok: true, id, locale, mode: 'rewrite', changed: false, before: before.score, after: after.score, note: verdict.note });
    const upd: Record<string, unknown> = { [`content_${locale}`]: outBody, updated_at: new Date().toISOString() };
    if (outTitle && outTitle !== title) upd[`title_${locale}`] = outTitle;
    if (locale === src) { const w = wordCount(outBody); upd.word_count = w; upd.reading_time_min = Math.max(1, Math.ceil(w / 200)); }
    const { error: ue } = await sb.from('blog_posts').update(upd).eq('id', id);
    if (ue) return NextResponse.json({ ok: false, error: `Improved but could not save: ${ue.message}` }, { status: 500 });
    await auditLog(sb, { action: 'voice.repair', table: 'blog_posts', rowId: id, summary: `${String(p.slug)} [${locale}] rewrite ${before.score} → ${after.score}`, changes: { lang: locale, before: { title, body }, after: { title: outTitle }, scoreBefore: before.score, scoreAfter: after.score } });
    return NextResponse.json({ ok: true, id, locale, mode: 'rewrite', changed: true, before: before.score, after: after.score, note: '' });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
