// lib/voice/parity.ts — do the seven editions of an article say the same thing? Pure, unit-tested, no I/O.
//
// Why it exists: every edition used to be written on its own, so editions drifted (one language half as long as the others,
// another missing a figure). No scorer looks at that. This module compares the editions of ONE article with each other:
//   • length: each edition's word count is normalised by how much longer or shorter its language normally runs, and compared
//     with the median of all editions. Far below = content was lost; far above = something was added.
//   • figures: a number that most editions carry but one lacks is a dropped fact; a number found in only one edition is invented.
// There is no source edition to trust here: the median and the consensus decide, so the outlier is named whichever language it is.
import { wordCountOf } from '@/lib/voice/structure';
import { numbersIn } from '@/lib/voice/guards';

export const LANGS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;
export type PLang = (typeof LANGS)[number];

/** How long each language normally runs compared with English (measured on this site's published articles). */
export const LENGTH_FACTOR: Record<PLang, number> = { en: 1, el: 0.94, ro: 1.03, ar: 0.84, de: 0.95, pl: 0.87, ru: 0.85 };

export const SHORT_BELOW = 0.75;   // an edition below 75% of the expected length lost content
export const LONG_ABOVE = 1.35;    // above 135% something was added

export type ParityStatus = 'ok' | 'missing' | 'short' | 'long' | 'untranslated';
export interface EditionParity {
  lang: PLang; words: number; expected: number; ratio: number; status: ParityStatus;
  droppedFigures: string[]; unsupportedFigures: string[];
}
export interface ParityReport { ok: boolean; medianWords: number; editions: EditionParity[]; problems: string[] }

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; };
const plain = (html: string) => String(html || '').replace(/<[^>]+>/g, ' ');
const trivial = (n: string) => n.length < 2 || /^\d$/.test(n);

export function parityOf(bodies: Partial<Record<PLang, string>>): ParityReport {
  const present = LANGS.filter((l) => plain(bodies[l] || '').trim());
  const words = Object.fromEntries(LANGS.map((l) => [l, wordCountOf(plain(bodies[l] || ''))])) as Record<PLang, number>;
  const norm = present.map((l) => words[l] / LENGTH_FACTOR[l]);
  const med = median(norm);

  // Figures: the consensus set is every number that at least half of the present editions carry.
  const figs = Object.fromEntries(present.map((l) => [l, new Set(numbersIn(plain(bodies[l] || '')).filter((n) => !trivial(n)))])) as Record<string, Set<string>>;
  const tally = new Map<string, number>();
  for (const l of present) for (const n of figs[l]) tally.set(n, (tally.get(n) || 0) + 1);
  const need = Math.max(2, Math.ceil(present.length / 2));
  const consensus = [...tally.entries()].filter(([, c]) => c >= need).map(([n]) => n);

  const enBody = plain(bodies.en || '').trim();
  const editions: EditionParity[] = LANGS.map((lang) => {
    const w = words[lang];
    const expected = Math.round(med * LENGTH_FACTOR[lang]);
    const ratio = expected ? +(w / expected).toFixed(2) : 0;
    let status: ParityStatus = 'ok';
    if (!w) status = 'missing';
    else if (lang !== 'en' && enBody && plain(bodies[lang] || '').trim() === enBody) status = 'untranslated';
    else if (ratio < SHORT_BELOW) status = 'short';
    else if (ratio > LONG_ABOVE) status = 'long';
    const mine = figs[lang] || new Set<string>();
    const droppedFigures = w ? consensus.filter((n) => !mine.has(n)) : [];
    const unsupportedFigures = w ? [...mine].filter((n) => (tally.get(n) || 0) === 1 && present.length >= 4) : [];
    return { lang, words: w, expected, ratio, status, droppedFigures, unsupportedFigures };
  });

  const problems: string[] = [];
  for (const e of editions) {
    if (e.status === 'missing') problems.push(`${e.lang}: edition is empty`);
    else if (e.status === 'untranslated') problems.push(`${e.lang}: still the English text`);
    else if (e.status === 'short') problems.push(`${e.lang}: ${e.words} words, about ${Math.round((1 - e.ratio) * 100)}% less than the other editions`);
    else if (e.status === 'long') problems.push(`${e.lang}: ${e.words} words, about ${Math.round((e.ratio - 1) * 100)}% more than the other editions`);
    if (consensus.length >= 2 && e.droppedFigures.length > Math.max(0, Math.floor(consensus.length * 0.3))) problems.push(`${e.lang}: missing figures ${e.droppedFigures.slice(0, 4).join(', ')}`);
    if (e.unsupportedFigures.length) problems.push(`${e.lang}: figures found nowhere else ${e.unsupportedFigures.slice(0, 3).join(', ')}`);
  }
  return { ok: problems.length === 0, medianWords: Math.round(med), editions, problems };
}
