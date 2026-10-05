// lib/concierge/localeGuess.ts
// ============================================================================
// Pure: best-effort language of a raw chat message for channels that give no locale (WhatsApp,
// Telegram). brain.detectLocale() separates Arabic / Greek / Cyrillic by script but returns 'en'
// for EVERY Latin-script message, so a German, Polish or Romanian guest was grounded with English
// labels and facts. This adds a cheap, deterministic Latin-script guess (diacritics + very common
// function words). It returns 'en' unless the evidence is clear — a wrong guess is worse than 'en',
// because the model is also told to answer in the guest's own language. Not wired into brain.ts yet
// (that edit is proposed, not made); see the 2.1 report.
// ============================================================================
import type { Locale } from '@/lib/locales';

const DIACRITIC: [Locale, RegExp][] = [
  ['pl', /[ąćęłńśźż]/i],
  ['ro', /[ăâîșşțţ]/i],
  ['de', /[äöüß]/i],
];
const WORDS: Record<'de' | 'pl' | 'ro', string[]> = {
  de: ['und', 'der', 'die', 'das', 'ich', 'nicht', 'mit', 'ein', 'eine', 'wo', 'wie', 'gibt', 'suche', 'brauche', 'möchte', 'moechte', 'für', 'fuer', 'bitte', 'zum', 'zur', 'wir', 'ist'],
  pl: ['jest', 'nie', 'gdzie', 'chce', 'chcę', 'na', 'się', 'sie', 'dla', 'czy', 'jak', 'szukam', 'potrzebuje', 'potrzebuję', 'proszę', 'prosze', 'polecić', 'polecic', 'możesz', 'mozesz', 'dobry', 'blisko'],
  ro: ['și', 'si', 'în', 'in', 'pentru', 'unde', 'vreau', 'un', 'o', 'cu', 'la', 'este', 'caut', 'am', 'nevoie', 'mulțumesc', 'va', 'rog', 'bun', 'aproape', 'cum'],
};
// Words shared with English or each other carry no weight alone.
const AMBIGUOUS = new Set(['in', 'na', 'o', 'am', 'un', 'la', 'si', 'ist', 'die', 'wo']);

export function guessLatinLocale(text: string): Locale {
  const t = String(text || '').toLowerCase();
  const tokens = t.split(/[^\p{L}]+/u).filter(Boolean);
  const score: Record<'de' | 'pl' | 'ro', number> = { de: 0, pl: 0, ro: 0 };
  for (const [loc, rx] of DIACRITIC) if (rx.test(t) && (loc === 'pl' || loc === 'ro' || loc === 'de')) score[loc] += 3;
  for (const loc of ['de', 'pl', 'ro'] as const) {
    for (const w of tokens) if (WORDS[loc].includes(w)) score[loc] += AMBIGUOUS.has(w) ? 0.5 : 1;
  }
  const best = (Object.entries(score) as ['de' | 'pl' | 'ro', number][]).sort((a, b) => b[1] - a[1]);
  const [loc, s] = best[0]; const second = best[1][1];
  return s >= 2 && s - second >= 1 ? loc : 'en';
}

/** Script first (as brain.detectLocale does), then the Latin-script guess. */
export function detectLocaleFull(text: string): Locale {
  if (/[؀-ۿ]/.test(text)) return 'ar';
  if (/[Ͱ-Ͽ]/.test(text)) return 'el';
  if (/[Ѐ-ӿ]/.test(text)) return 'ru';
  return guessLatinLocale(text);
}
