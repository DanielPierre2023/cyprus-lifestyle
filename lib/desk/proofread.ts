// Cyprus Lifestyle — light AI proofreading pass for the inflected editions.
// The deterministic humanizer (lib/antiAi) can't catch every inflected AI-tell in
// EL/AR/DE/PL/RU (no reliable public stemmer for these), so this pass runs ONLY
// when the deterministic result still reads "medium+" on the AI-tell score. It sends
// that text to the sub-editor with the concrete findings (each tell with the passage
// where it sits), re-humanises the result, and keeps it only if it reads cleaner AND
// every figure and quotation of the original is still there. Cost is bounded: clean/low
// text never triggers a call.
import 'server-only';
import { callAI, parseAiJson } from '@/lib/ai';
import { editorialSystem, editorialFixes, editorialUser } from '@/lib/journalism/editorial';
import { tokensForChars } from '@/lib/journalism/models';
import { checkFacts } from '@/lib/voice/guards';
import { humanizeHtml, humanizeText, scoreAiTells, type Lang } from '@/lib/antiAi';

// The inflected editions where the deterministic net alone leaves residual AI-tells
// and a targeted model pass earns its keep. EN/RO have full deterministic coverage
// and are excluded (no model call). Shared by the desk pipeline and the editor's
// "AI clean" action, so both humanise de/pl/ru the same way.
export const AI_PROOFREAD_LANGS: Lang[] = ['el', 'ar', 'de', 'pl', 'ru'];
const THRESHOLD = 16; // 'medium' or worse after the deterministic pass

function stripFences(s: string): string {
  return (s || '').trim().replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}
function plain(s: string, isHtml: boolean): string {
  return isHtml ? s.replace(/<[^>]+>/g, ' ') : s;
}

export interface ProofResult { text: string; changed: boolean; scoreBefore: number; scoreAfter: number }

export async function proofread(opts: { text: string; lang: Lang; isHtml: boolean; title?: string }): Promise<ProofResult> {
  const { lang, isHtml } = opts;
  // 1) deterministic pass first (free)
  const first = isHtml ? humanizeHtml(opts.text, lang) : humanizeText(opts.text, lang);
  const before = scoreAiTells({ title: opts.title, content: plain(first, isHtml), lang });
  if (before.score < THRESHOLD || !AI_PROOFREAD_LANGS.includes(lang)) {
    return { text: first, changed: false, scoreBefore: before.score, scoreAfter: before.score };
  }
  // 2) the sub-editor works from the findings (the tell, how often, the passage), not from a list of forbidden words
  const system = editorialSystem(lang, editorialFixes(before.tells.slice(0, 16))).replace('article (HTML)', isHtml ? 'article (HTML)' : 'text (plain text, no HTML)');
  const r = await callAI({
    systemInstruction: system, userMessage: editorialUser(lang, first), task: 'edit', complexity: 'complex', jsonMode: true,
    expectTokens: Math.ceil(tokensForChars(first.length, lang) * 1.2) + 300, fn: `proofread-${lang}`,
  });
  if (r.error || !r.text) return { text: first, changed: false, scoreBefore: before.score, scoreAfter: before.score };
  const j = parseAiJson<{ content_html?: string; content?: string }>(r.text);
  const raw = stripFences(String(j.content_html ?? j.content ?? ''));
  if (!raw) return { text: first, changed: false, scoreBefore: before.score, scoreAfter: before.score };

  const cleaned = isHtml ? humanizeHtml(raw, lang) : humanizeText(raw, lang);
  const ratio = cleaned.length / Math.max(1, first.length);
  // An edit keeps the length and the facts: a rewrite that is much shorter or longer, or moved a figure or a quotation, is thrown away.
  if (ratio < 0.7 || ratio > 1.35 || !checkFacts(plain(first, isHtml), plain(cleaned, isHtml), { sameLanguage: true, lang }).ok) {
    return { text: first, changed: false, scoreBefore: before.score, scoreAfter: before.score };
  }
  const after = scoreAiTells({ title: opts.title, content: plain(cleaned, isHtml), lang });
  // Keep the rewrite only if it actually reads cleaner (guards against a bad rewrite).
  if (cleaned && after.score <= before.score) {
    return { text: cleaned, changed: true, scoreBefore: before.score, scoreAfter: after.score };
  }
  return { text: first, changed: false, scoreBefore: before.score, scoreAfter: before.score };
}
