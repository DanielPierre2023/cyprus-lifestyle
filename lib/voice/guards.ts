// lib/voice/guards.ts — the two promises a rewrite must keep: it never invents facts, and it never copies its source.
// Pure (no I/O), unit-tested. Used by the revise loop on every candidate and by the scraped-article gate.
//
//   originality  how much of the candidate is the source's own wording (shared 5-word runs). A rewrite must share almost
//                nothing with the article it re-reports: plagiarism zero.
//   facts        every figure the candidate states must exist in the source; every quotation must be verbatim from the
//                source; the rewrite must not drop most of the source's figures; it must not introduce new proper names.

import { stripHtml } from '@/lib/editorial/craft';

const ARABIC_INDIC = /[\u0660-\u0669\u06F0-\u06F9]/g;
const toAsciiDigits = (s: string) => s.replace(ARABIC_INDIC, (d) => String(d.charCodeAt(0) & 0xf));

/** Lower-cased, unaccented-quotes, punctuation-free text used for every overlap comparison. */
export function normalizeForCompare(input: string): string {
  return toAsciiDigits(stripHtml(String(input || '')))
    .toLowerCase()
    .normalize('NFKC')
    .replace(/[\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u00AB\u00BB\u2039\u203A"'`]/g, ' ')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const wordsOf = (s: string) => (s ? s.split(' ') : []);

export function shingleSet(text: string, n = 5): Set<string> {
  const w = wordsOf(normalizeForCompare(text));
  const out = new Set<string>();
  for (let i = 0; i + n <= w.length; i++) out.add(w.slice(i, i + n).join(' '));
  return out;
}

export interface OverlapReport { ratio: number; longestRun: number; shared: number; total: number }

/** Share of the candidate's 5-word runs that also occur in the source, and the longest verbatim run (in words). */
export function overlap(source: string, candidate: string, n = 5): OverlapReport {
  const src = shingleSet(source, n);
  const w = wordsOf(normalizeForCompare(candidate));
  const total = Math.max(0, w.length - n + 1);
  if (!total || !src.size) return { ratio: 0, longestRun: 0, shared: 0, total };
  let shared = 0, run = 0, best = 0;
  for (let i = 0; i < total; i++) {
    if (src.has(w.slice(i, i + n).join(' '))) { shared++; run++; best = Math.max(best, run); } else run = 0;
  }
  return { ratio: shared / total, longestRun: best ? best + n - 1 : 0, shared, total };
}

// ── figures ─────────────────────────────────────────────────────────────────────────
/** Canonical numeric tokens of a text: digits only, thousands separators removed, "." as decimal mark. */
export function numbersIn(input: string): string[] {
  const t = toAsciiDigits(stripHtml(String(input || '')));
  const found = t.match(/\d+(?:[.,\u00A0\u202F' ]\d{3})*(?:[.,]\d+)?/g) || [];
  const out: string[] = [];
  for (const raw of found) {
    let s = raw.replace(/[\u00A0\u202F' ]/g, '');
    if (s.includes('.') && s.includes(',')) {
      // Both marks present: the last one is the decimal mark, the other groups thousands ("1.200,50" and "1,200.50").
      const dec = s.lastIndexOf('.') > s.lastIndexOf(',') ? '.' : ',';
      s = s.split(dec === '.' ? ',' : '.').join('').replace(dec, '.');
    } else if (/^\d{1,3}([.,]\d{3})+$/.test(s)) s = s.replace(/[.,]/g, '');   // "1.200" / "1,200" / "1.200.500": thousands
    else s = s.replace(',', '.');                                                // a lone decimal comma
    s = s.replace(/^0+(?=\d)/, '');
    out.push(s);
  }
  return out;
}

/** Figures too small to count as facts: list numbers and counts of one to ten ("3 steps"). */
const trivial = (n: string) => /^\d$/.test(n) || n === '10';

// ── quotations ───────────────────────────────────────────────────────────────────────
const QUOTE_PAIRS: [string, string][] = [['“', '”'], ['„', '“'], ['„', '”'], ['«', '»'], ['"', '"'], ['‘', '’']];
/** Quoted passages of 25+ characters (shorter ones are scare-quotes or titles). */
export function quotesIn(input: string): string[] {
  const t = stripHtml(String(input || ''));
  const out: string[] = [];
  for (const [o, c] of QUOTE_PAIRS) {
    const re = new RegExp(`${o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^${c.replace(/[\]\\^-]/g, '\\$&')}\\n]{25,400}?)${c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gu');
    let m: RegExpExecArray | null;
    while ((m = re.exec(t))) out.push(m[1]);
  }
  return out;
}

// ── names ────────────────────────────────────────────────────────────────────────────
/** Capitalised words that are not the first word of a sentence: the proper nouns of a text, lower-cased. */
export function namesIn(input: string): Set<string> {
  const t = stripHtml(String(input || ''));
  const names = new Set<string>();
  const re = /(?<!(?:^|[.!?؟…:]\s+|\n\s*|["“„«‘']\s*))(?<![\p{L}\p{N}])\p{Lu}[\p{Ll}\p{M}]{2,}/gu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(t))) names.add(m[0].toLowerCase());
  return names;
}

export interface FactsReport {
  ok: boolean;
  invented: string[];        // figures in the candidate that the source does not contain
  droppedRatio: number;      // share of the source's non-trivial figures missing from the candidate
  droppedSample: string[];
  changedQuotes: string[];   // candidate quotations not found verbatim in the source
  newNames: string[];        // proper nouns in the candidate that the source never mentions
  reasons: string[];
}

/**
 * Compare a candidate against the text it was derived from (the previous version or the scraped source).
 * Same-language rewrites only: a translation changes words, so quotation and name checks do not apply there.
 */
export function checkFacts(source: string, candidate: string, opts: { sameLanguage?: boolean; lang?: string } = {}): FactsReport {
  const same = opts.sameLanguage !== false;
  // German capitalises every noun, so "capitalised mid-sentence word" is not a name signal there: figures and quotes are still checked.
  const namesApply = opts.lang !== 'de';
  const srcNums = new Set(numbersIn(source));
  const candNums = [...new Set(numbersIn(candidate))];
  const invented = candNums.filter((n) => !trivial(n) && !srcNums.has(n));
  const srcImportant = [...srcNums].filter((n) => !trivial(n));
  const candSet = new Set(candNums);
  const dropped = srcImportant.filter((n) => !candSet.has(n));
  const droppedRatio = srcImportant.length ? dropped.length / srcImportant.length : 0;

  let changedQuotes: string[] = [];
  let newNames: string[] = [];
  if (same) {
    const hay = normalizeForCompare(source);
    changedQuotes = quotesIn(candidate).filter((q) => !hay.includes(normalizeForCompare(q)));
    const srcNames = namesIn(source);
    const srcLow = hay;
    if (namesApply) newNames = [...namesIn(candidate)].filter((nm) => !srcNames.has(nm) && !srcLow.includes(nm));
  }
  const reasons: string[] = [];
  if (invented.length) reasons.push(`new figures not in the source: ${invented.slice(0, 5).join(', ')}`);
  if (droppedRatio > 0.3) reasons.push(`drops ${Math.round(droppedRatio * 100)}% of the source's figures`);
  if (changedQuotes.length) reasons.push(`${changedQuotes.length} quotation(s) not verbatim from the source`);
  if (newNames.length >= 4) reasons.push(`new proper names not in the source: ${newNames.slice(0, 5).join(', ')}`);
  return { ok: reasons.length === 0, invented, droppedRatio, droppedSample: dropped.slice(0, 6), changedQuotes, newNames, reasons };
}

/**
 * Originality check that treats quotation honestly: a short quotation inside quotation marks is allowed (attributed, verbatim),
 * so quoted spans are removed from BOTH texts before shingles are compared. The words that were quoted are counted separately.
 * Use this for scraped articles; a quotation of more than `maxQuotedWords` words in total is reported by the caller.
 */
export function overlapProse(source: string, candidate: string): OverlapReport & { quotedWords: number } {
  // A quotation here is a passage of eight or more words inside quotation marks; shorter ones are titles and names.
  const re = /[“"„«]([^”"“»]{1,500})[”"“»]/g;
  const isQuote = (m: string) => m.replace(/^[“"„«]|[”"“»]$/g, '').trim().split(/\s+/).length >= 8;
  const cut = (t: string) => String(t || '').replace(re, (m) => (isQuote(m) ? ' ' : m));
  const quoted = (String(candidate || '').match(re) || []).filter(isQuote).join(' ').split(/\s+/).filter(Boolean).length;
  return { ...overlap(cut(source), cut(candidate)), quotedWords: quoted };
}
