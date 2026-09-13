// Admin/editor proof tool.
//   default: deterministic AI-tell score + a humanized version (instant, no cost)
//   { ai: true }: also run the Greek/Arabic AI proofread pass (Haiku), returning
//   the cleaned text and before/after scores.
// Body: { title, content, lang, html?, ai? }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { scoreAiTells, humanizeText, humanizeHtml, type Lang } from '@/lib/antiAi';
import { proofread } from '@/lib/desk/proofread';

export const runtime = 'nodejs';
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const lang: Lang = (['en', 'el', 'ro', 'ar'] as string[]).includes(body.lang) ? body.lang : 'en';
  const title = String(body.title || '');
  const content = String(body.content || '');
  const isHtml = body.html === true || /<[a-z][\s\S]*>/i.test(content);

  if (body.ai) {
    const pr = await proofread({ text: content, lang, isHtml, title });
    const report = scoreAiTells({ title, content: isHtml ? pr.text.replace(/<[^>]+>/g, ' ') : pr.text, lang });
    return NextResponse.json({ ok: true, ai: true, changed: pr.changed, text: pr.text, scoreBefore: pr.scoreBefore, scoreAfter: pr.scoreAfter, report });
  }

  const report = scoreAiTells({ title, content, lang });
  return NextResponse.json({
    ok: true,
    report,
    humanized: { title: humanizeText(title, lang), content: isHtml ? humanizeHtml(content, lang) : humanizeText(content, lang) },
  });
}
