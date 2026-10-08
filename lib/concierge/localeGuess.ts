// lib/concierge/localeGuess.ts
// ============================================================================
// Pure: best-effort language of a raw chat message for channels that give no locale (WhatsApp,
// Telegram). brain.detectLocale() separates Arabic / Greek / Cyrillic by script but returns 'en'
// for EVERY Latin-script message, so a German, Polish or Romanian guest was grounded with English
// labels and facts. This adds a cheap, deterministic Latin-script guess (diacritics + very common
// function words). It returns 'en' unless the evidence is clear — a wrong guess is worse than 'en',
// because the model is also told to answer in the guest's own language.
// ============================================================================
import type { Locale } from '@/lib/locales';

const DIACRITIC: [Locale, RegExp][] = [
  ['pl', /[ąćęłńśźż]/i],
  ['ro', /[ăâîșşțţ]/i],
  ['de', /[äöüß]/i],
];
const WORDS: Record<'de' | 'pl' | 'ro', string[]> = {
  de: ['und', 'der', 'die', 'das', 'ich', 'nicht', 'mit', 'ein', 'eine', 'wo', 'wie', 'gibt', 'suche', 'brauche', 'möchte', 'moechte', 'für', 'fuer', 'bitte', 'zum', 'zur', 'wir', 'ist',
    // how people really type on a phone: no umlauts, greetings, the first words of a question
    'hallo', 'guten', 'abend', 'danke', 'dankeschön', 'dankeschoen', 'was', 'kostet', 'kosten', 'haben', 'kann', 'können', 'koennen', 'einen', 'auch', 'oder', 'aber', 'sehr', 'tipps', 'empfehlung', 'empfehlen',
    'ausflug', 'ausflüge', 'ausfluege', 'urlaub', 'mietwagen', 'flughafen', 'heute', 'morgen', 'welche', 'welcher', 'wann', 'uns', 'unser', 'kein', 'keine'],
  pl: ['jest', 'nie', 'gdzie', 'chce', 'chcę', 'na', 'się', 'sie', 'dla', 'czy', 'jak', 'szukam', 'potrzebuje', 'potrzebuję', 'proszę', 'prosze', 'polecić', 'polecic', 'możesz', 'mozesz', 'dobry', 'blisko',
    'czesc', 'dzien', 'dzieki', 'dziekuje', 'chcialbym', 'chcialabym', 'chcemy', 'wycieczki', 'wycieczka', 'plaza', 'ile', 'kosztuje', 'jakie', 'jaki', 'macie', 'mozna', 'sa', 'tak', 'oraz', 'albo', 'bardzo', 'dzisiaj', 'jutro', 'witam', 'pozdrawiam'],
  ro: ['și', 'si', 'în', 'in', 'pentru', 'unde', 'vreau', 'un', 'o', 'cu', 'la', 'este', 'caut', 'am', 'nevoie', 'mulțumesc', 'va', 'rog', 'bun', 'aproape', 'cum',
    'buna', 'ziua', 'seara', 'dimineata', 'salut', 'multumesc', 'multumim', 'mersi', 'doresc', 'dori', 'despre', 'informatii', 'cazare', 'excursie', 'excursii', 'ghid', 'ghiduri', 'plaja', 'plaje',
    'care', 'cat', 'cand', 'sunt', 'poti', 'puteti', 'aveti', 'foarte', 'sau', 'dar', 'daca', 'azi', 'maine', 'persoane', 'copii', 'familie', 'masina'],
};
// Words shared with English or each other carry no weight alone — and each counts once per message ("in … in … in" is English).
const AMBIGUOUS = new Set(['in', 'na', 'o', 'am', 'un', 'la', 'si', 'ist', 'die', 'wo', 'was', 'care', 'cat', 'dar', 'sa', 'mai', 'va']);

export function guessLatinLocale(text: string): Locale {
  const t = String(text || '').toLowerCase();
  const tokens = t.split(/[^\p{L}]+/u).filter(Boolean);
  const score: Record<'de' | 'pl' | 'ro', number> = { de: 0, pl: 0, ro: 0 };
  for (const [loc, rx] of DIACRITIC) if (rx.test(t) && (loc === 'pl' || loc === 'ro' || loc === 'de')) score[loc] += 3;
  for (const loc of ['de', 'pl', 'ro'] as const) {
    const seenAmbiguous = new Set<string>();
    for (const w of tokens) {
      if (!WORDS[loc].includes(w)) continue;
      if (AMBIGUOUS.has(w)) { if (!seenAmbiguous.has(w)) { seenAmbiguous.add(w); score[loc] += 0.5; } } else score[loc] += 1;
    }
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
