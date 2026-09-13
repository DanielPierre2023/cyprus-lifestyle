// Admin tool: draft a warm, on-brand reply to a reader comment, in the comment's
// language. Ported from TT ai-comment-reply. Returns a suggestion; the admin edits
// and posts it. Body: { content, lang }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { callClaude, CLAUDE_HAIKU } from '@/lib/ai';
import { humanizeText, type Lang } from '@/lib/antiAi';
import { LOCALE_NAME } from '@/lib/locales';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const content = String(body.content || '').trim();
  const lang: Lang = (['en', 'el', 'ro', 'ar'] as string[]).includes(body.lang) ? body.lang : 'en';
  if (!content) return NextResponse.json({ ok: false, error: 'content required' }, { status: 400 });

  const system = [
    `You are the community editor at Cyprus Lifestyle, a luxury Cyprus magazine.`,
    `Write a short, warm, professional reply in ${LOCALE_NAME[lang]} to the reader comment below.`,
    `Be gracious and specific; never defensive. 2-3 sentences. No em/en dashes, no AI filler. Return ONLY the reply text.`,
  ].join('\n');
  const { text, error } = await callClaude({ systemInstruction: system, userMessage: content, model: CLAUDE_HAIKU, temperature: 0.6, maxTokens: 300, fn: 'comment-reply' });
  if (error) return NextResponse.json({ ok: false, error }, { status: 502 });
  return NextResponse.json({ ok: true, reply: humanizeText(text.trim(), lang) });
}
