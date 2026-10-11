// lib/journalism/sentences.ts — a sentence splitter good enough to measure with (not to typeset with). Pure, no imports.
// Used by the guards that look at single sentences: the Cyprus-link guard (cyprusGround.ts) and the meaning-based comparison with the
// source (semantic.ts). It splits after . ! ? … ؟ 。 when a new sentence visibly starts (capital letter, digit, quotation mark, or any
// letter of a script without capitals), keeps closing quotation marks with their sentence, and does not split after initials
// ("A. Charalambous"), common abbreviations or decimals.

const ABBREV_LIST = [
  // English
  'mr', 'mrs', 'ms', 'dr', 'prof', 'st', 'no', 'vs', 'etc', 'approx', 'ca', 'inc', 'ltd', 'co', 'jr', 'sr', 'gen', 'col', 'sgt', 'lt', 'capt', 'rev', 'hon', 'fig', 'vol', 'pp',
  'a\\.m', 'p\\.m', 'u\\.s', 'u\\.k', 'e\\.g', 'i\\.e',
  // German, Polish, Romanian
  'z\\.b', 'd\\.h', 'u\\.a', 'bzw', 'ggf', 'evtl', 'usw', 'vgl', 'nr', 'str', 'ul', 'np', 'tzw', 'tys', 'mln', 'mld', 'inż', 'św', 'ok', 'bd', 'dl',
  // Russian, Greek
  'т\\.е', 'т\\.д', 'напр', 'стр', 'руб', 'тыс', 'млн', 'млрд', 'κ', 'κα', 'π\\.χ', 'δρ', 'αρ', 'οδ',
];
const ABBREV = new RegExp(`(?:^|[\\s(„"“«'‘])(?:${ABBREV_LIST.join('|')})\\.$`, 'iu');
// The lookbehind makes a run of full stops start the match only once: without it a text of 100,000 dots is scanned from every position and takes
// 43 seconds (quadratic). A match from inside a run could never succeed where the one from its start failed (same end, same lookahead).
const BOUNDARY = /(?<![.!?…؟。])[.!?…؟。]+["”»'’)\]]*(?=\s+["“«„'‘(\[]?[\p{Lu}\p{N}\p{Lo}])/gu;

/** Sentences of a plain text (tags already removed), trimmed, in order. */
export function splitSentences(text: string): string[] {
  const t = String(text || '').replace(/\s+/g, ' ').trim();
  if (!t) return [];
  const raw: string[] = [];
  let last = 0;
  for (const m of t.matchAll(BOUNDARY)) {
    const end = (m.index ?? 0) + m[0].length;
    raw.push(t.slice(last, end));
    last = end;
  }
  raw.push(t.slice(last));
  const out: string[] = [];
  for (const part of raw.map((p) => p.trim()).filter(Boolean)) {
    const prev = out[out.length - 1];
    if (prev && (/(?:^|\s)\p{Lu}\.$/u.test(prev) || ABBREV.test(prev))) out[out.length - 1] = `${prev} ${part}`;
    else out.push(part);
  }
  return out;
}

export const wordsIn = (s: string): number => String(s || '').split(/\s+/).filter(Boolean).length;

/** Sentences worth comparing: four words or more (headings, bylines and one-word lines carry no structure). */
export const substantive = (sentences: string[]): string[] => sentences.filter((s) => wordsIn(s) >= 4);
