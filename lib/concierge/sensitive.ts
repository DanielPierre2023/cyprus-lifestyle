// lib/concierge/sensitive.ts — businesses the directory lists but the concierge does not volunteer. Pure (no I/O), unit-tested.
//
// Adult shops, betting, casinos, lotteries and gun shops are legal businesses that people do look for, so they stay in the directory and on the
// map and the concierge still finds them by name. What it does not do is offer them to a guest who asked for something else (a luxury-travel
// magazine does not answer "best shop in Nicosia" with a gun store). When the guest asks for that kind of business, the filter steps aside.
import { fold, words } from '@/lib/concierge/names';

/** Directory subtypes (English slugs from the import) that are not offered unasked. */
export const SENSITIVE_SUBTYPES: ReadonlySet<string> = new Set([
  'sex-shops', 'escort-agencies', 'betting-agencies', 'casino', 'lottery-shops',
]);

// A mixed subtype: only the businesses whose NAME says weapons are sensitive (the same subtype also holds board-game and toy shops).
const MIXED_SUBTYPES: ReadonlyMap<string, RegExp> = new Map([
  ['gaming-guns-and-equipment', /(\bguns?\b|airgun|shooting|cartridge|ammo|weapon|firearm|hunting|οπλ)/i],
]);

export function isSensitive(p: { subtype?: string | null; name?: string | null }): boolean {
  const st = p.subtype || '';
  if (!st) return false;
  if (SENSITIVE_SUBTYPES.has(st)) return true;
  const rx = MIXED_SUBTYPES.get(st);
  return !!rx && rx.test(String(p.name || ''));
}

// Short or ambiguous words are matched whole ("bet" must never match "better").
const WHOLE = new Set([
  'bet', 'bets', 'betting', 'bookie', 'bookies', 'gun', 'guns', 'ammo', 'escort', 'escorts', 'opap', 'arme', 'bron', 'wetten', 'секс', 'σεξ',
]);

// Stems that are unambiguous, folded (lower-case, accents removed); a word that STARTS with one matches (German compounds, Greek/Slavic/Arabic
// inflection). The Arabic article "ال" is removed before the test.
const PREFIX = [
  // en
  'casino', 'gambl', 'lotter', 'bookmak', 'sexshop', 'erotic', 'firearm', 'airgun', 'ammunit', 'cartridge', 'weapon',
  // de
  'wettbur', 'wettbuer', 'buchmacher', 'glucksspiel', 'gluecksspiel', 'kasino', 'spielbank', 'erotik', 'waffen', 'schusswaff',
  // el
  'καζιν', 'στοιχημ', 'λαχει', 'οπαπ', 'οπλα', 'οπλο', 'οπλω', 'κυνηγετικ', 'σεξσοπ',
  // pl
  'kasyn', 'bukmacher', 'loteri', 'erotycz', 'amunicj',
  // ro
  'cazin', 'pariuri', 'loterie', 'munitie',
  // ru
  'казино', 'ставк', 'ставок', 'букмекер', 'лотере', 'сексшоп', 'секс-шоп', 'оружи', 'эротическ',
  // ar
  'كازينو', 'مراهن', 'قمار', 'يانصيب', 'اسلح', 'سلاح',
];

// Two-word phrases that carry the meaning only together.
const PHRASES = ['sex shop', 'sex store', 'sex-shop', 'adult shop', 'adult store', 'love shop', 'erotic shop', 'sex toys', 'gun shop', 'gun store'];

const arStrip = (w: string) => w.replace(/^(?:وال|بال|لل|ال)/, '');

/** True when the guest is asking for one of these kinds of business, in any of the seven languages. */
export function asksForSensitive(question: string): boolean {
  const f = fold(question);
  if (!f.trim()) return false;
  if (PHRASES.some((p) => f.includes(p))) return true;
  return words(f).some((raw) => {
    const w = raw.replace(/['’]s$/, '');
    if (WHOLE.has(w)) return true;
    const a = arStrip(w);
    return PREFIX.some((p) => w.startsWith(p) || a.startsWith(p));
  });
}
