// lib/journalism/sanitize.ts — the deterministic clean-up every model text passes through before it is measured and stored.
// Pure (imports lib/antiAi only). Shared by the Supabase edge function (generated copy) and the app.
//
// It repairs FORM: markup the page may not carry, Markdown left over in HTML, doubled words, stray spaces, tag slugs. It does not
// rewrite CONTENT: the only vocabulary clean-up is the app's reviewed one (lib/antiAi: dash rule per language, plain-word swaps for
// stock phrases, filler openers), so a fact cannot be lost or changed here and the fact check that follows sees the final text.
//
// Replaces the edge function's own older copy, which also swapped single words in English ("landscape" → "field", "essential" →
// "necessary", "serves as the" → "is athe"), deleted whole sentences that mentioned an unnamed spokesperson, dropped the capital at
// the start of a sentence, and lost every Cyrillic letter in tags (so Russian articles carried no tags).
import { humanizeHtml, humanizeText, deShoutTitle, type Lang } from '@/lib/antiAi';

export function coerceToString(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((x) => coerceToString(x).trim()).filter(Boolean).join(' ');
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['text', 'content', 'value']) if (typeof o[k] === 'string') return o[k] as string;
    try { return JSON.stringify(v); } catch { return ''; }
  }
  return String(v);
}

export const stripTags = (html: string): string => String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
export const countWords = (html: string): number => (html ? stripTags(html).split(/\s+/).filter(Boolean).length : 0);

/** Markdown the model sometimes leaves in HTML: heading hashes at a line start, **bold**, code fences. */
export function stripMarkdown(s: string): string {
  return String(s || '')
    .replace(/^```[a-z]*\s*$/gim, '')
    .replace(/^#{1,6}\s+(.+)$/gm, '$1')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1');
}

/** Wrap a text without block tags into paragraphs (blank-line separated). */
export function toHtml(text: string): string {
  const t = String(text || '').trim();
  if (!t) return '';
  if (/<(p|h2|h3|ul|ol|blockquote)[\s>]/i.test(t)) return t;
  return t.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean).map((p) => `<p>${p.replace(/\n+/g, ' ')}</p>`).join('\n');
}

const KEEP_TAGS = new Set(['p', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'strong', 'em', 'br']);
const RENAME: Record<string, string> = { h1: 'h2', h4: 'h3', h5: 'h3', h6: 'h3', b: 'strong', i: 'em' };
/**
 * The article HTML the page may carry: paragraphs, h2/h3, quotations, lists, bold/italic, line breaks. No attributes at all, no
 * images, links, scripts, styles or frames (the source text is untrusted and may try to smuggle markup through the model). An unknown
 * tag is dropped and its text kept; script, style and frame blocks go with their content.
 */
export function allowlistHtml(html: string): string {
  let r = String(html || '');
  r = r.replace(/<!--[\s\S]*?-->/g, '');
  r = r.replace(/<(script|style|iframe|object|embed|svg|math|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, '');
  return r.replace(/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g, (_m, slash: string, tag: string) => {
    const t0 = tag.toLowerCase();
    const t = RENAME[t0] || t0;
    if (!KEEP_TAGS.has(t)) return '';
    if (t === 'br') return slash ? '' : '<br>';
    return slash ? `</${t}>` : `<${t}>`;
  });
}

const L = String.raw`\p{L}\p{M}`;
const DUP = new RegExp(String.raw`(?<![${L}])([${L}]{4,})(\s+)\1(?![${L}])`, 'giu');
// English function words that are never legitimately doubled ("had had" and "that that" are, so they are not listed).
const EN_DUP = /(?<![\p{L}\p{M}])(the|a|an|of|to|and|in|for|with|at|by|on)(\s+)\1(?![\p{L}\p{M}])/giu;
/** An accidental immediate repetition ("shows shows"): words of four letters or more in any script, plus the English function words "the the", "of of" … */
export function dedupeAdjacentWords(s: string, lang?: string): string {
  if (!s) return s;
  const r = s.replace(DUP, (m: string, w: string) => (lang === 'en' && /^that$/i.test(w) ? m : w));   // "He said that that was fine" is English
  return lang === 'en' ? r.replace(EN_DUP, '$1') : r;
}

const tidy = (s: string): string => s.replace(/<p>\s*<\/p>/gi, '').replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').replace(/\s+([,.;:!?])/g, '$1').trim();

/** Raw model HTML (or plain text) → the article HTML that is measured and stored. */
export function cleanHtml(raw: unknown, lang: Lang): string {
  const s0 = coerceToString(raw);
  if (!s0.trim()) return '';
  let s = allowlistHtml(toHtml(stripMarkdown(s0)));
  s = humanizeHtml(s, lang);
  s = dedupeAdjacentWords(s, lang);
  return tidy(s);
}

/** A short field (excerpt, summary, SEO description): plain text, no markup, no Markdown. */
export function cleanField(raw: unknown, lang: Lang): string {
  const s0 = coerceToString(raw);
  if (!s0.trim()) return '';
  let s = stripTags(stripMarkdown(s0)).replace(/[*_`#]+/g, '').replace(/&nbsp;/g, ' ');
  s = dedupeAdjacentWords(humanizeText(s, lang), lang);
  return s.replace(/\s+/g, ' ').trim();
}

/** A headline: a field, without Markdown characters or a trailing full stop, and not in capitals. */
export function cleanTitle(raw: unknown, lang: Lang): string {
  const s = cleanField(raw, lang);
  if (!s) return '';
  return deShoutTitle(s.replace(/[.,;:،]+$/, '').trim());
}

/** Tag slugs: lower case, no accents on Latin or Greek letters, letters and digits of any script kept (Cyrillic and Arabic too), hyphens for spaces. */
export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    if (typeof t !== 'string' || !t) continue;
    const slug = t.toLowerCase().normalize('NFD')
      .replace(/(\p{Script=Latin}|\p{Script=Greek})[̀-ͯ]+/gu, '$1')
      .normalize('NFC')
      .replace(/\s+/g, '-').replace(/[^\p{L}\p{N}-]/gu, '').replace(/-{2,}/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    if (slug.length < 2 || seen.has(slug)) continue;
    seen.add(slug); out.push(slug);
    if (out.length >= 8) break;
  }
  return out;
}

export function generateSlug(title: string, rnd: () => number = Math.random): string {
  const base = (title || 'article').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+$/, '').substring(0, 60);
  return `${base || 'article'}-${rnd().toString(36).substring(2, 10)}`;
}
