// lib/voice/structure.ts — what a regex cannot see: how the piece is BUILT. Pure, unit-tested.
//
// AI text is recognised less by its words than by its architecture: it closes by restating itself, opens by clearing its
// throat, hangs a stack of identical question headings on a thin piece, and dresses everything as a list. These checks work
// on the shape of the article and are language-aware through the per-language closers/openers in lib/voice/data.
import type { Lang, AiTell } from '@/lib/antiAi';
import { normalizeFor } from '@/lib/antiAiLang';
import { voiceData } from '@/lib/voice/data';
import { DESK_SPEC, type Desk } from '@/lib/voice/desks';

const WORDS = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}]+)*/gu;
export const wordCountOf = (s: string): number => (s.match(WORDS) || []).length;

const fold = (lang: Lang, s: string) => normalizeFor(lang, s).toLowerCase().replace(/\s+/g, ' ').trim();

/** Plain paragraphs of a body (HTML or markdown or text), headings and list items excluded. */
export function paragraphsOf(body: string): string[] {
  const b = String(body || '');
  const html = /<\/?(?:p|div|h[1-6]|ul|ol|li|blockquote)\b/i.test(b);
  const parts = html
    ? b.replace(/<\s*(?:h[1-6]|li)\b[^>]*>[\s\S]*?<\s*\/\s*(?:h[1-6]|li)\s*>/gi, '\n\n').replace(/<\s*\/?\s*(?:p|div|blockquote|br)\b[^>]*>/gi, '\n\n').replace(/<[^>]+>/g, '').split(/\n\s*\n+/)
    : b.split(/\n\s*\n+/).filter((p) => !/^\s*(?:#{1,6}\s|[-*+]\s|\d+[.)]\s)/.test(p));
  return parts.map((p) => p.replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()).filter((p) => wordCountOf(p) >= 4);
}

/** Headings of a body (HTML h2/h3 or markdown ##), plain. */
export function headingsOf(body: string): string[] {
  const b = String(body || '');
  const out: string[] = [];
  const re = /<\s*h([2-4])\b[^>]*>([\s\S]*?)<\s*\/\s*h\1\s*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(b))) out.push(m[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim());
  for (const line of b.split('\n')) { const h = /^\s{0,3}#{2,4}\s+(.+?)\s*#*\s*$/.exec(line); if (h) out.push(h[1].trim()); }
  return out.filter(Boolean);
}

export interface Issue { key: string; label: string; severity: 'high' | 'medium' | 'low'; detail?: string }

const startsWithAny = (para: string, starters: string[], lang: Lang): string | null => {
  const p = fold(lang, para);
  for (const s of starters) {
    const f = fold(lang, s).replace(/[.…:,;!?]+$/, '');
    if (f && (p === f || p.startsWith(f + ' ') || p.startsWith(f + ',') || p.startsWith(f + ':'))) return s;
  }
  return null;
};

/** Shape detectors, returned as AI tells (they add to the score). */
export function shapeTells(body: string, lang: Lang): AiTell[] {
  const out: AiTell[] = [];
  const data = voiceData(lang);
  const paras = paragraphsOf(body);
  if (paras.length < 3) return out;

  // 1. The closing paragraph restates or moralises ("In conclusion", "Overall", "Fazit"...).
  const last = paras[paras.length - 1];
  const lastHit = startsWithAny(last, data.closers, lang);
  if (lastHit) out.push({ key: 'summary_closer', label: `Closing paragraph is a summary or conclusion (“${lastHit}”)`, severity: 'medium', count: 1, sample: last.slice(0, 80) });

  // 2. Closer starters in the middle of the piece.
  const mid = paras.slice(0, -1).filter((p) => startsWithAny(p, data.closers, lang));
  if (mid.length) out.push({ key: 'conclusion_in_body', label: 'Paragraph opens like a conclusion', severity: 'low', count: mid.length, sample: mid[0].slice(0, 80) });

  // 3. Throat-clearing opener on the first paragraph, or several throughout.
  const firstHit = startsWithAny(paras[0], data.openers, lang);
  if (firstHit) out.push({ key: 'throat_clearing_opener', label: `Opens by clearing its throat (“${firstHit}”)`, severity: 'medium', count: 1, sample: paras[0].slice(0, 80) });
  const openers = paras.slice(1).filter((p) => startsWithAny(p, data.openers, lang));
  if (openers.length >= 2) out.push({ key: 'throat_clearing_body', label: 'Several paragraphs start with a throat-clearing phrase', severity: 'low', count: openers.length, sample: openers[0].slice(0, 80) });

  // 4. Rhythm and rhetoric that no word list sees. Language-agnostic except the English contrast frame.
  const text = paras.join(' ');
  const words = wordCountOf(text);
  const sentences = text.split(/(?<=[.!?…؟;])\s+/).filter((x) => wordCountOf(x) > 0);
  const short = sentences.filter((x) => wordCountOf(x) <= 4);
  if (short.length >= 3 && short.length / Math.max(1, words / 120) >= 1.5) out.push({ key: 'staccato_fragments', label: 'Chopped fragments used for effect', severity: 'low', count: short.length, sample: short.slice(0, 2).join(' ') });
  const colonTriplet = paras.filter((p) => /^[^.:!?]{8,140}(?:,[^.:!?]{2,50}){2,}:\s/.test(p) || /(?:^|[.!?]\s)[^.:!?]{8,140}(?:,[^.:!?]{2,50}){2,}:\s+(?:the|it|this|these|each|every|all)\b/i.test(p));
  if (colonTriplet.length) out.push({ key: 'colon_triplet', label: 'A list of three ends in a colon and a verdict', severity: 'low', count: colonTriplet.length, sample: colonTriplet[0].slice(0, 80) });
  if (lang === 'en') {
    const nb = sentences.filter((x) => /\bnot (?:simply|just|only|merely|so much)\b[^.?!]{0,90}\bbut\b/i.test(x) || /\brather than (?:just|merely|simply)\b/i.test(x));
    if (nb.length) out.push({ key: 'contrast_frame', label: '“not just X but Y” contrast frame', severity: 'medium', count: nb.length, sample: nb[0].slice(0, 80) });
  }

  return out;
}

/** Layout issues: headings and lists as templates. */
export function layoutTells(body: string, lang: Lang, words: number): AiTell[] {
  const out: AiTell[] = [];
  const heads = headingsOf(body);
  if (heads.length >= 4 && words < 700) out.push({ key: 'over_sectioned', label: 'Many headings on a short piece', severity: 'low', count: heads.length, sample: heads.slice(0, 3).join(' | ') });
  const qEnd = lang === 'el' ? /[;?]\s*$/ : /[?؟]\s*$/;                       // Greek writes its question mark as ";"
  const q = heads.filter((h) => qEnd.test(h));
  if (q.length >= 2) out.push({ key: 'question_headings', label: 'Headings phrased as questions', severity: 'low', count: q.length, sample: q[0] });
  const firstWords = heads.map((h) => fold(lang, h).split(' ')[0]).filter(Boolean);
  const freq = new Map<string, number>();
  for (const w of firstWords) freq.set(w, (freq.get(w) || 0) + 1);
  const rep = [...freq.entries()].filter(([, c]) => c >= 3).sort((a, b) => b[1] - a[1])[0];
  if (rep) out.push({ key: 'templated_headings', label: `Headings share the same opening word (“${rep[0]}” ×${rep[1]})`, severity: 'low', count: rep[1], sample: heads.slice(0, 3).join(' | ') });
  const bullets = (String(body).match(/<li\b/gi) || []).length + (String(body).match(/^\s*[-*+]\s+\S/gm) || []).length;
  if (bullets >= 6) out.push({ key: 'listicle', label: 'Bullet lists carry the article', severity: 'low', count: bullets, sample: '' });
  if (/\*\*[^*\n]{2,}\*\*/.test(String(body).replace(/<[^>]+>/g, ''))) out.push({ key: 'markdown_artifact', label: 'Markdown asterisks left in the text', severity: 'medium', count: 1, sample: '' });
  return out;
}

/** Quality issues that are not "AI tells" but would hold a piece back (thin, typography). They never add to the AI score. */
export function qualityIssues(body: string, lang: Lang, desk: Desk): Issue[] {
  const text = String(body || '').replace(/<[^>]+>/g, ' ');
  const words = wordCountOf(text);
  const spec = DESK_SPEC[desk];
  const out: Issue[] = [];
  // Length follows the facts: only an extremely short piece is mentioned, and never repaired by adding words.
  if (words < spec.minWords) out.push({ key: 'thin', label: `Very short (${words} words): fine if that is all the facts support`, severity: 'low', detail: String(words) });
  const straight = (text.match(/"/g) || []).length;
  if (straight >= 2) out.push({ key: 'straight_quotes', label: 'Straight quotation marks instead of typographic ones', severity: 'low', detail: String(straight) });
  if (lang === 'ar' && /[\u0600-\u06FF]\s?[,;?]/.test(text)) out.push({ key: 'latin_punctuation', label: 'Latin comma, semicolon or question mark in Arabic text', severity: 'low' });
  return out;
}
