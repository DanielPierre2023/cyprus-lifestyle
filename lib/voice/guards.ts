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

// ── figures in any notation ───────────────────────────────────────────────────────────
/**
 * One figure of a text together with every way it may be written. A rewrite or a translation changes notation, not substance:
 * "18:30" becomes "18.30" or "6:30 pm", "19:00" becomes "19.00" or "19 Uhr", "19.00" is "19", "1.200,50" is "1,200.50". Reading those
 * as different numbers made the guard reject a faithful text ("new figures not in the source: 18.30, 19.00; drops 50% of the figures").
 * Two figures are the same when their `keys` meet; `id` is the one key used when figures are counted or compared across editions.
 */
export interface Figure {
  shown: string; id: string; trivial: boolean;
  /** Spellings of exactly this value: figures that share one are the same figure, on whichever side they stand. */
  keys: string[];
  /** Looser spellings, used only for a figure of the SOURCE ("19:00" may come back as "ora 19", but a bare "19" never vouches for a time). */
  also: string[];
}

const pad2 = (n: number) => String(n).padStart(2, '0');

/** A time of day. Written with a colon, with a dot, with am/pm or as a bare hour on the hour; the 12-hour forms of an afternoon time too. */
function timeFigure(h: number, m: number): Figure {
  const hh = String(h), mm = pad2(m);
  const id = `t${hh}:${mm}`;
  const keys = [id, `${hh}.${mm}`];
  const also: string[] = [];
  if (m === 0) also.push(hh);                                                     // "19:00" is also "ora 19", "19 Uhr"
  if (h >= 13) { const h12 = String(h - 12); keys.push(`t${h12}:${mm}`, `${h12}.${mm}`); if (m === 0) also.push(h12); }
  return { shown: `${hh}:${mm}`, id, keys, also, trivial: false };
}

/** A number as numbersIn spells it (digits, "." as the decimal mark): "19.00" is "19", "18.30" may also be a time written with a dot. */
function numberFigure(canon: string): Figure {
  const keys = [canon];
  let id = canon;
  if (canon.includes('.')) {
    const stripped = canon.replace(/0+$/, '').replace(/\.$/, '');
    if (stripped !== canon) keys.push(stripped);
    const t = /^([01]?\d|2[0-3])\.([0-5]\d)$/.exec(canon);
    if (t) { id = `t${Number(t[1])}:${t[2]}`; keys.push(id); } else id = stripped;
  }
  return { shown: canon, id, keys, also: [], trivial: trivial(canon) };
}

// 12-hour clock ("6:30 pm", "6.30pm", "7 p.m.") and 24-hour clock with a colon ("18:30"): read first, so their digits are not counted as two numbers.
const CLOCK_12 = /(?<![\d.,:])(\d{1,2})(?:[:.]([0-5]\d))?\s?([ap])\.?\s?m\b\.?/gi;
const CLOCK_24 = /(?<![\d.,:])([01]?\d|2[0-3]):([0-5]\d)(?![\d:])/g;

/** Every figure of a text, times of day as one figure each. */
export function figuresIn(input: string): Figure[] {
  let t = toAsciiDigits(stripHtml(String(input || '')));
  const out: Figure[] = [];
  t = t.replace(CLOCK_12, (m, hh: string, mm: string | undefined, ap: string) => {
    const h12 = Number(hh);
    if (h12 < 1 || h12 > 12) return m;
    out.push(timeFigure((h12 % 12) + (/p/i.test(ap) ? 12 : 0), mm ? Number(mm) : 0));
    return ' ';
  });
  t = t.replace(CLOCK_24, (_m, hh: string, mm: string) => { out.push(timeFigure(Number(hh), Number(mm))); return ' '; });
  for (const n of numbersIn(t)) out.push(numberFigure(n));
  return out;
}

const uniqueFigures = (figs: Figure[]): Figure[] => { const seen = new Set<string>(); return figs.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true))); };
const keySet = (figs: Figure[], withAlso = false): Set<string> => {
  const s = new Set<string>();
  for (const f of figs) { for (const k of f.keys) s.add(k); if (withAlso) for (const k of f.also) s.add(k); }
  return s;
};

/**
 * The figures of `text` that occur nowhere in `allowed` (nor in `attested`, text known to be true to the article, such as its title).
 * Single digits and ten are not counted unless `strict` (short fields such as a title: "4 films" must not become "5 films").
 */
export function unknownFigures(allowed: string, text: string, opts: { attested?: string; strict?: boolean } = {}): string[] {
  const known = keySet([...figuresIn(allowed), ...figuresIn(opts.attested || '')], true);
  return uniqueFigures(figuresIn(text)).filter((f) => (opts.strict || !f.trivial) && !f.keys.some((k) => known.has(k))).map((f) => f.shown);
}

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
export function checkFacts(
  source: string, candidate: string,
  opts: { sameLanguage?: boolean; lang?: string; attested?: string; candidateTitle?: string } = {},
): FactsReport {
  const same = opts.sameLanguage !== false;
  // German capitalises every noun, so "capitalised mid-sentence word" is not a name signal there: figures and quotes are still checked.
  const namesApply = opts.lang !== 'de';
  // Figures are compared as figures, not as strings (times, decimals): see Figure. `attested` is further text known to be true to the
  // article (its title, its other editions): a figure found there is not invented, but it is not required of the candidate either.
  const srcFigs = uniqueFigures(figuresIn(source));
  const known = keySet([...srcFigs, ...figuresIn(opts.attested || '')], true);
  const candFigs = uniqueFigures([...figuresIn(candidate), ...figuresIn(opts.candidateTitle || '')]);
  const invented = candFigs.filter((f) => !f.trivial && !f.keys.some((k) => known.has(k))).map((f) => f.shown);
  const srcImportant = srcFigs.filter((f) => !f.trivial);
  const have = keySet(candFigs);
  const droppedFigs = srcImportant.filter((f) => !f.keys.some((k) => have.has(k)) && !f.also.some((k) => have.has(k)));
  const dropped = droppedFigs.map((f) => f.shown);
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

/**
 * The runs of words the candidate still shares with the source (five words or more, adjacent hits joined), longest first, as normalised
 * text. Quotations of eight words or more are left out on both sides, as in overlapProse. It tells a rewriter exactly what to change.
 */
export function overlapRuns(source: string, candidate: string, max = 8, n = 5): string[] {
  const re = /[“"„«]([^”"“»]{1,500})[”"“»]/g;
  const isQuote = (m: string) => m.replace(/^[“"„«]|[”"“»]$/g, '').trim().split(/\s+/).length >= 8;
  const cut = (t: string) => String(t || '').replace(re, (m) => (isQuote(m) ? ' ' : m));
  const src = shingleSet(cut(source), n);
  const w = wordsOf(normalizeForCompare(cut(candidate)));
  const runs: string[] = [];
  let start = -1; let end = -1;
  for (let i = 0; i + n <= w.length; i++) {
    if (src.has(w.slice(i, i + n).join(' '))) { if (start < 0) start = i; end = i + n; }
    else if (start >= 0) { runs.push(w.slice(start, end).join(' ')); start = -1; }
  }
  if (start >= 0) runs.push(w.slice(start, end).join(' '));
  return [...new Set(runs)].sort((a, b) => b.length - a.length).slice(0, max);
}
