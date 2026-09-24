// Cyprus Lifestyle — light AI proofreading pass for the inflected editions.
// The deterministic humanizer (lib/antiAi) can't catch every inflected AI-tell in
// EL/AR/DE/PL/RU (no reliable public stemmer for these), so this pass runs ONLY
// when the deterministic result still reads "medium+" on the AI-tell score, sends
// just that text to a cheap Haiku call to neutralise the flagged phrasing
// (preserving meaning, facts and HTML structure), re-humanises the result, and
// keeps whichever version scores cleaner. Cost is bounded: clean/low text never
// triggers a call.
import 'server-only';
import { callClaude, CLAUDE_HAIKU } from '@/lib/ai';
import { humanizeHtml, humanizeText, scoreAiTells, type Lang } from '@/lib/antiAi';
import { LOCALE_NAME } from '@/lib/locales';

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
  // 2) targeted AI rewrite of only the flagged tells
  const tells = before.tells.map((t) => t.label).filter(Boolean).slice(0, 8).join('; ');
  const rtl = lang === 'ar' ? ' The text is Arabic (right-to-left); return natural Modern Standard Arabic and do not add dir/lang attributes.' : '';
  const system = [
    `You are a meticulous ${LOCALE_NAME[lang]} copy editor for Cyprus Lifestyle, a luxury Cyprus magazine.`,
    `Rewrite the ${isHtml ? 'HTML' : 'text'} below to remove machine/AI-sounding phrasing while keeping the meaning, facts, names, numbers and tone exactly.`,
    isHtml ? `Preserve the HTML structure EXACTLY — same tags, attributes and order; change only the human-readable text between tags.` : `Return plain text only.`,
    `Neutralise these tells in particular (including inflected forms): ${tells}.`,
    `No em/en dashes. Headings stay sentence case. Keep it natural, editorial ${LOCALE_NAME[lang]}; do not add or remove information.${rtl}`,
    `Return ONLY the rewritten ${isHtml ? 'HTML' : 'text'} — no code fences, no preamble, no notes.`,
  ].join('\n');

  const { text, error } = await callClaude({
    systemInstruction: system, userMessage: first, model: CLAUDE_HAIKU,
    temperature: 0.4, maxTokens: isHtml ? 6000 : 500, fn: `proofread-${lang}`,
  });
  if (error || !text) return { text: first, changed: false, scoreBefore: before.score, scoreAfter: before.score };

  const cleaned = isHtml ? humanizeHtml(stripFences(text), lang) : humanizeText(stripFences(text), lang);
  const after = scoreAiTells({ title: opts.title, content: plain(cleaned, isHtml), lang });
  // Keep the rewrite only if it actually reads cleaner (guards against a bad rewrite).
  if (cleaned && after.score <= before.score) {
    return { text: cleaned, changed: true, scoreBefore: before.score, scoreAfter: after.score };
  }
  return { text: first, changed: false, scoreBefore: before.score, scoreAfter: before.score };
}
