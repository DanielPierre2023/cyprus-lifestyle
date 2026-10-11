// Cyprus Lifestyle — translator (Node port of TT tt-translate-html, extended to all
// seven editions: EN·EL·RO·AR·DE·PL·RU). Translates an article body between any two
// of the seven languages while preserving the EXACT HTML structure; only text
// between tags is translated. The target language is passed through to the
// deterministic anti-AI humanizer as its real Lang, so every edition (de/pl/ru
// included) is humanised — not left with em-dashes or calques.
import 'server-only';
import { callAI, budgetClock, parseAiJson } from '@/lib/ai';
import { tokensForChars } from '@/lib/journalism/models';
import { dashRule } from '@/lib/journalism/languages';
import { checkFacts, numbersIn } from '@/lib/voice/guards';
import { humanizeHtml, humanizeText, type Lang } from '@/lib/antiAi';
import { promptTellList, nativeRegisterRules } from '@/lib/antiAiLang';
import { LOCALE_NAME, type Locale } from '@/lib/locales';

function stripFences(s: string): string {
  return (s || '').trim().replace(/^```html\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
}

// The forbidden-phrase list per edition lives in lib/antiAiLang.ts (promptTellList), the same
// vocabulary the detectors score — so the prompt and the quality scan can never drift apart.
const AI_TELL_HINT = (target: Locale): string => promptTellList(target as Lang);

// Block-level tags in order of appearance: a translation keeps the same elements, so the counts per tag must match.
function blockCounts(html: string): string {
  const m = new Map<string, number>();
  for (const x of html.matchAll(/<(p|h[2-4]|ul|ol|li|blockquote|table|tr|th|td|figure|hr)\b/gi)) m.set(x[1].toLowerCase(), (m.get(x[1].toLowerCase()) || 0) + 1);
  return JSON.stringify([...m.entries()].sort());
}

// Translate a rich HTML body, preserving structure 1:1. The result is checked in code before it is returned: every figure of the source
// must still be there and no figure may be added, and the elements must be the same; a translation that fails is asked for once more
// with the problem named (at a higher reasoning effort), and one that still changes a figure is refused instead of returned.
export async function translateHtml(html: string, source: Locale, target: Locale): Promise<{ ok: boolean; html?: string; error?: string; warning?: string }> {
  const body = (html || '').trim();
  if (!body) return { ok: false, error: 'html is required' };
  if (source === target) return { ok: true, html: body };

  const rtlNote = target === 'ar'
    ? '\n- The target is Arabic (right-to-left). Produce natural Modern Standard Arabic; do NOT add dir/lang attributes or reorder elements — the site sets direction at render time.'
    : '';

  const system = (correction = '') => [
    `You are a professional translator for Cyprus Lifestyle, a luxury Cyprus newspaper-magazine.`,
    `Translate the article body below from ${LOCALE_NAME[source]} to ${LOCALE_NAME[target]}.`,
    ``,
    `Return VALID HTML whose STRUCTURE is identical to the input:`,
    `- Preserve every tag, its attributes and order EXACTLY: <p>, <br>, <strong>, <b>, <em>, <i>, <u>, <s>, <h2>, <h3>, <h4>, <blockquote>, <ul>, <ol>, <li>, <a>, <sub>, <sup>, <hr>, <figure>, <figcaption>, <img>, <table>, <thead>, <tbody>, <tr>, <th>, <td>, <caption>.`,
    `- Translate ONLY the human-readable text between tags. Do NOT add, remove, merge, split or reorder any element.`,
    `- Keep inline emphasis on the same words; translate each table cell in place.`,
    `- Keep numbers, dates, URLs and proper names intact; keep EUR figures as EUR.`,
    `- Do NOT add a title, extra headings, notes or a wrapping element.` + rtlNote,
    ``,
    `Write natural, editorial ${LOCALE_NAME[target]} — never machine-like:`,
    `- Translate faithfully and in full: preserve the exact meaning, facts, figures, names and nuance — no additions, omissions, softening or embellishment.`,
    `- Read as if originally written by a native ${LOCALE_NAME[target]} journalist for publication: idiomatic, precise and publication-grade — accurate to the source yet never a word-for-word calque.`,
    `- ${dashRule(target as Lang).charAt(0).toUpperCase()}${dashRule(target as Lang).slice(1)}; use commas, periods or parentheses.`,
    `- Headings stay sentence case, never ALL CAPS or Title Case; keep real acronyms (EU, VAT, NATO).`,
    `- Avoid AI-tell words and filler (and their inflected forms or literal renderings): ${AI_TELL_HINT(target)}. Prefer plain words.`,
    `- No summary/conclusion filler paragraph; keep it factual and direct.`,
    `Native register for ${LOCALE_NAME[target]}:`,
    nativeRegisterRules(target as Lang),
    correction,
    `Output ONLY the translated HTML — no code fences, no preamble.`,
  ].filter(Boolean).join('\n');

  const expectTokens = Math.ceil(tokensForChars(body.length, target) * 1.2) + 300;
  const problems = (out: string): string[] => {
    const f = checkFacts(body, out, { sameLanguage: false, lang: target });
    const list: string[] = [];
    if (f.invented.length) list.push(`figures that are not in the source: ${f.invented.slice(0, 6).join(', ')}`);
    if (f.droppedRatio > 0.2) list.push(`figures missing from the translation: ${f.droppedSample.join(', ')}`);
    if (blockCounts(body) !== blockCounts(out)) list.push('the HTML elements differ from the source (same number of <p>, headings, list items, quotations)');
    return list;
  };

  let last = ''; let issues: string[] = [];
  const clock = budgetClock();
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (attempt === 2 && !clock.canRetry()) break;   // a 60-second route has no time for a second full call
    const correction = attempt === 1 ? '' : `CORRECTION: your previous translation had these problems: ${issues.join('; ')}. Translate again; every figure of the source appears exactly once as it does there, and the elements are exactly those of the source.`;
    const r = await callAI({ systemInstruction: system(correction), userMessage: body, task: 'translate', complexity: attempt === 1 ? 'routine' : 'complex', expectTokens, timeoutMs: clock.callBudget(), fn: 'translate-html' });
    if (r.error) return { ok: false, error: r.error };
    const out = stripFences(r.text);
    if (!out) return { ok: false, error: 'empty translation' };
    last = out; issues = problems(out);
    if (!issues.length) return { ok: true, html: humanizeHtml(out, target as Lang) };
  }
  // Still wrong after the second attempt. A changed figure is a factual error: refuse. A differing structure is cosmetic: deliver with a warning.
  if (issues.some((x) => x.startsWith('figures'))) return { ok: false, error: `translation changed figures (${issues.join('; ')})` };
  return { ok: true, html: humanizeHtml(last, target as Lang), warning: issues.join('; ') };
}

// Translate a short plain string (title, excerpt, SEO field). Returns '' when the translation could not be made: the source text is never
// handed back as if it were the translation (that put English into the other editions).
export async function translateText(text: string, source: Locale, target: Locale, kind = 'text'): Promise<string> {
  const body = (text || '').trim();
  if (!body) return '';
  if (source === target) return body;
  const rtlNote = target === 'ar' ? ' Produce natural Modern Standard Arabic.' : '';
  const system = [
    `You are a translator for Cyprus Lifestyle, a luxury Cyprus magazine. Translate this ${kind} from ${LOCALE_NAME[source]} to ${LOCALE_NAME[target]}.`,
    `Translate faithfully but idiomatically — as a native ${LOCALE_NAME[target]} journalist would write it, accurate to the source yet natural, never a literal calque or machine-like.`,
    `Return ONLY the translation — no quotes, no notes. Sentence case (never ALL CAPS/Title Case). ${dashRule(target as Lang).charAt(0).toUpperCase()}${dashRule(target as Lang).slice(1)}. Keep EUR figures and proper names.${rtlNote}`,
    nativeRegisterRules(target as Lang),
    `Never use these stock phrases or their literal renderings: ${AI_TELL_HINT(target)}.`,
  ].join('\n');
  const r = await callAI({ systemInstruction: system, userMessage: body, task: 'translate', complexity: 'routine', expectTokens: Math.ceil(tokensForChars(body.length, target) * 1.5) + 80, fn: 'translate-text' });
  const out = r.error ? '' : stripFences(r.text);
  if (!out) return '';
  // A figure the source did not have is a wrong translation: better none than a wrong one.
  if (numbersIn(out).some((n) => !numbersIn(body).includes(n))) return '';
  return humanizeText(out, target as Lang);
}

// Translate several short fields in ONE call (title/excerpt/summary/seo). Keeps the per-article model-call count sane across the
// seven-language pipeline. Returns ONLY the fields that were translated: a field that could not be (model error, empty value, a figure the
// source does not have) is absent from the result, never filled with the source text, so a caller cannot store English as another edition.
export async function translateBundle(
  fields: Record<string, string>, source: Locale, target: Locale,
): Promise<Record<string, string>> {
  const entries = Object.entries(fields).filter(([, v]) => (v || '').trim());
  if (entries.length === 0) return {};
  if (source === target) return { ...fields };
  const rtlNote = target === 'ar' ? ' Produce natural Modern Standard Arabic.' : '';
  const system = [
    `You translate short editorial fields for Cyprus Lifestyle from ${LOCALE_NAME[source]} to ${LOCALE_NAME[target]}.`,
    `Return ONLY a JSON object with the SAME keys, each value translated.${rtlNote}`,
    `Sentence case (never ALL CAPS/Title Case). ${dashRule(target as Lang).charAt(0).toUpperCase()}${dashRule(target as Lang).slice(1)}. Keep €, numbers and proper names. No AI filler.`,
  ].join('\n');
  const total = entries.reduce((n, [, v]) => n + v.length, 0);
  const r = await callAI({
    systemInstruction: system,
    userMessage: JSON.stringify(Object.fromEntries(entries)),
    task: 'translate', complexity: 'routine', expectTokens: Math.ceil(tokensForChars(total, target) * 1.5) + 120, jsonMode: true, fn: 'translate-bundle',
  });
  if (r.error) return {};
  const parsed = parseAiJson<Record<string, string>>(r.text);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(parsed)) {
    if (typeof v !== 'string' || !v.trim() || !(k in fields)) continue;
    const src = fields[k] || '';
    if (numbersIn(v).some((n) => !numbersIn(src).includes(n))) continue;   // an invented figure: leave the field out
    out[k] = humanizeText(v, target as Lang);
  }
  return out;
}
