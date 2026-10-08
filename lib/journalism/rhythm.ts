// lib/journalism/rhythm.ts — how a text is BUILT: sentence lengths, runs and pulse, paragraph openers and sizes. Pure, no imports.
//
// Why this exists: the owner's humanisation rules (burstiness, no two similar sentences in a row, no mechanical short-long-short
// pulse, varied paragraph openers and sizes) were only sentences in a prompt. A prompt is a request; this is the measurement. The
// numbers are the owner's (SD >= 7 words; at least three sentences under 8 words and three over 25 in a piece of 250+ words;
// neighbours within 5 words are "similar"), but they are used as TESTS on the finished text, never as quotas written into the
// writer's prompt: a quota in a prompt makes a model produce the theatre it is meant to avoid.
//
// Used by lib/journalism/craftTells.ts (the detectors) and, through it, by lib/voice/score.ts and the edge function's assessment.

export type RLang = 'en' | 'de' | 'pl' | 'ro' | 'ru' | 'el' | 'ar';

// ── words and sentences ───────────────────────────────────────────────────────
const TOKEN = /\p{N}+(?:[.,:]\p{N}+)*|[\p{L}\p{M}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu;
export const tokens = (s: string): string[] => String(s || '').match(TOKEN) || [];
export const wordCount = (s: string): number => tokens(s).length;

// Abbreviations after which a full stop does not end a sentence (lower case, no final dot).
const ABBR: Record<RLang, string[]> = {
  en: ['mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'no', 'vs', 'etc', 'inc', 'ltd', 'co', 'jr', 'sr', 'gen', 'col', 'sen', 'rep', 'gov', 'fig', 'approx', 'ca', 'e.g', 'i.e', 'u.s', 'u.k', 'a.m', 'p.m', 'mt', 'ave', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'],
  de: ['z.b', 'd.h', 'u.a', 'bzw', 'ca', 'nr', 'dr', 'prof', 'usw', 'etc', 'vgl', 'ggf', 'evtl', 'inkl', 'str', 'mio', 'mrd', 'tel', 'abs', 'sog', 'o.ä', 'u.ä', 'v.a', 'z.t', 'st', 'hr', 'fr'],
  pl: ['np', 'tzn', 'tzw', 'itd', 'itp', 'ok', 'ul', 'al', 'pl', 'im', 'godz', 'tel', 'mln', 'mld', 'tys', 'dr', 'prof', 'inż', 'mgr', 'nr', 'ww', 'jw', 'wg', 'ws', 'zł', 'gen', 'płk', 'św', 'ks'],
  ro: ['dl', 'dna', 'dr', 'prof', 'str', 'nr', 'etc', 'ex', 'mil', 'mld', 'tel', 'cca', 'fig', 'bd', 'sc', 'ap', 'jud', 'sect', 'ing', 'av', 'gen', 'col'],
  ru: ['т.е', 'т.д', 'т.п', 'т.к', 'т.н', 'г', 'гг', 'ул', 'пр', 'им', 'тыс', 'млн', 'млрд', 'руб', 'коп', 'см', 'др', 'проф', 'акад', 'ст', 'стр', 'рис', 'напр', 'и.о', 'им', 'обл', 'р-н', 'д', 'кв'],
  el: ['π.χ', 'κ.λπ', 'δηλ', 'κ.ά', 'σελ', 'αρ', 'κ', 'κα', 'δρ', 'εκ', 'τ.μ', 'ευρ', 'π.μ', 'μ.μ', 'βλ', 'ο.π'],
  ar: ['د', 'أ.د', 'م', 'ص', 'ج'],
};

const END = /([.!?…؟]+|;)(["'”’»)\]]*)(\s+)/gu;
const LOWER = /^[\p{Ll}]/u;

/**
 * Split running text into sentences. A stop only ends a sentence when what follows could start one: an upper-case letter (any
 * script), a digit, a quotation mark or bracket; Arabic has no case, so any following letter counts. Decimals ("4.2"), abbreviations
 * ("Dr.", "z.B.", "т.е."), initials and German ordinal dates ("12. März") do not split. ";" ends a sentence only in Greek (its question mark).
 */
export function splitSentences(text: string, lang: RLang): string[] {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const abbr = new Set(ABBR[lang] || []);
  const out: string[] = [];
  let start = 0;
  END.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = END.exec(t))) {
    const punct = m[1];
    if (punct === ';' && lang !== 'el') continue;
    const before = t.slice(start, m.index);
    if (!before.trim()) continue;
    const after = t.slice(m.index + m[0].length);
    const nextCh = after.charAt(0);
    if (!nextCh) continue;
    if (lang !== 'ar' && LOWER.test(nextCh)) continue;                       // "etc. and", "what? he asked"
    if (punct === '.') {
      const lastTok = ((before.match(/(\S+)$/) || [''])[0]).toLowerCase().replace(/^[("„“«'‘]+/, '');
      if (abbr.has(lastTok)) continue;
      if (/^\p{Lu}$/u.test((before.match(/(\S+)$/) || [''])[0].replace(/^[("„“«'‘]+/, ''))) continue;   // initial: "J. Smith"
      if (lang === 'de' && /^\d{1,2}$/.test(lastTok)) continue;               // "am 12. März"
    }
    out.push(t.slice(start, m.index + m[1].length + m[2].length).trim());
    start = m.index + m[0].length;
    END.lastIndex = start;
  }
  const rest = t.slice(start).trim();
  if (rest) out.push(rest);
  return out.filter((s) => wordCount(s) > 0);
}

// ── statistics ────────────────────────────────────────────────────────────────
const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const sdOf = (a: number[]) => { const m = mean(a); return a.length ? Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length) : 0; };
const medianOf = (a: number[]) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const h = Math.floor(s.length / 2); return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };
function autocorr(dev: number[], lag: number): number {
  const n = dev.length;
  if (n <= lag + 2) return 0;
  let num = 0; let den = 0;
  for (let i = 0; i < n; i++) den += dev[i] * dev[i];
  if (den === 0) return 0;
  for (let i = 0; i + lag < n; i++) num += dev[i] * dev[i + lag];
  return num / den;
}

/** Word counts that make a sentence "short" or "long" in this language (the owner's 8 and 25; German compounds and Arabic clitics shift them). */
export const SHORT_BELOW: Record<RLang, number> = { en: 8, de: 7, pl: 8, ro: 8, ru: 8, el: 8, ar: 8 };
export const LONG_ABOVE: Record<RLang, number> = { en: 25, de: 22, pl: 24, ro: 26, ru: 24, el: 26, ar: 28 };
/** The owner's tolerance for "within 5 words of each other". */
export const SIMILAR_WITHIN = 5;

export interface RhythmReport {
  n: number; words: number; mean: number; sd: number; cv: number; median: number;
  short: number; long: number;
  /** Longest run of consecutive sentences whose neighbours differ by at most SIMILAR_WITHIN words. */
  flatRun: number;
  /** Share of adjacent pairs that are similar. */
  similarShare: number;
  /** Share of adjacent decided sentences (clearly short or clearly long) that flip side: ~0.5 for natural text, ~1 for a metronome. */
  alternation: number;
  decided: number;
  /** Strongest autocorrelation of the length deviations at lags 1-3 (signed so that "alternating" and "period 2-3" both show as large). */
  pulseStrength: number;
  pulse: boolean;
  lengths: number[];
}

/** Rhythm of a text given as paragraphs: sentences are split inside each paragraph, so a paragraph without a final stop never swallows the next. */
export function rhythmOfParagraphs(paragraphs: string[], lang: RLang): RhythmReport {
  return rhythmFromLengths(paragraphs.flatMap((p) => splitSentences(p, lang).map(wordCount)), lang);
}
export function rhythmOf(text: string, lang: RLang): RhythmReport {
  return rhythmFromLengths(splitSentences(text, lang).map(wordCount), lang);
}

export function rhythmFromLengths(lengths: number[], lang: RLang): RhythmReport {
  const n = lengths.length;
  const m = mean(lengths); const sd = sdOf(lengths); const med = medianOf(lengths);
  const sb = SHORT_BELOW[lang]; const la = LONG_ABOVE[lang];
  let flat = n ? 1 : 0; let run = n ? 1 : 0; let similar = 0;
  for (let i = 1; i < n; i++) {
    if (Math.abs(lengths[i] - lengths[i - 1]) <= SIMILAR_WITHIN) { run++; similar++; if (run > flat) flat = run; } else run = 1;
  }
  const decided: number[] = [];
  for (const l of lengths) { const d = l - med; if (Math.abs(d) >= 4) decided.push(d > 0 ? 1 : -1); }
  let flips = 0;
  for (let i = 1; i < decided.length; i++) if (decided[i] !== decided[i - 1]) flips++;
  const alternation = decided.length > 1 ? flips / (decided.length - 1) : 0;
  const dev = lengths.map((l) => l - m);
  const ac1 = autocorr(dev, 1); const ac2 = autocorr(dev, 2); const ac3 = autocorr(dev, 3);
  const pulseStrength = Math.max(-ac1, ac2, ac3);
  const metronome = (decided.length >= 10 && alternation >= 0.9) || (decided.length >= 14 && alternation >= 0.85);
  const periodic = n >= 16 && pulseStrength >= 0.65;
  return {
    n, words: lengths.reduce((a, b) => a + b, 0), mean: m, sd, cv: m ? sd / m : 0, median: med,
    short: lengths.filter((l) => l < sb).length, long: lengths.filter((l) => l > la).length,
    flatRun: flat, similarShare: n > 1 ? similar / (n - 1) : 0, alternation, decided: decided.length, pulseStrength,
    pulse: (metronome || periodic) && sd >= 6, lengths,
  };
}

// ── paragraphs ────────────────────────────────────────────────────────────────
const FUNCTION_WORD_MAX = 3;      // opening words of up to three letters are articles and prepositions in every one of our languages
export function openingWord(paragraph: string, lang: RLang): string {
  const t = String(paragraph || '').trim().replace(/^[\s"'“”„«»‘’(\[—–-]+/u, '');
  let w = (t.match(/^[\p{L}\p{M}\p{N}]+/u) || [''])[0].toLowerCase();
  if (lang === 'ar' && w.length > 3 && /^[وف]/.test(w)) w = w.slice(1);
  if (lang === 'ru') w = w.replace(/ё/g, 'е');
  return w;
}

export interface ParagraphReport {
  count: number;
  openers: string[];
  /** Pairs of consecutive paragraphs that open with the same (non-function) word. */
  consecutiveSame: { word: string; at: number }[];
  /** An opening word used by three or more paragraphs of a piece with six or more. */
  overused: { word: string; count: number } | null;
  sentencesPer: number[];
  shortParas: number;     // 1-2 sentences
  longParas: number;      // 5+ sentences
}

export function paragraphsOf(paragraphs: string[], lang: RLang): ParagraphReport {
  const paras = paragraphs.map((p) => String(p || '').trim()).filter((p) => wordCount(p) >= 4);
  const openers = paras.map((p) => openingWord(p, lang));
  const same: { word: string; at: number }[] = [];
  const skip = (w: string) => !w || w.length <= FUNCTION_WORD_MAX || /^\p{N}+$/u.test(w);
  for (let i = 1; i < openers.length; i++) if (!skip(openers[i]) && openers[i] === openers[i - 1]) same.push({ word: openers[i], at: i });
  const freq = new Map<string, number>();
  for (const w of openers) if (!skip(w)) freq.set(w, (freq.get(w) || 0) + 1);
  let overused: ParagraphReport['overused'] = null;
  if (paras.length >= 6) for (const [word, count] of freq) if (count >= 3 && (!overused || count > overused.count)) overused = { word, count };
  const sentencesPer = paras.map((p) => splitSentences(p, lang).length);
  return { count: paras.length, openers, consecutiveSame: same, overused, sentencesPer, shortParas: sentencesPer.filter((c) => c <= 2).length, longParas: sentencesPer.filter((c) => c >= 5).length };
}
