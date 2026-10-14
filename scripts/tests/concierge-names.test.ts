// Finding a business by name inside a sentence — pure helpers (lib/concierge/names.ts). Offline, deterministic.
import { fold, words, nameGrams, distinctiveTerms, contentTerms, askedNames, asksAboutBusiness, nameCovers, STOP, GENERIC, PLACE_WORDS } from '@/lib/concierge/names';
import { eq, ok, report } from './_harness';

// ── fold ─────────────────────────────────────────────────────────────────────
eq('fold greek tonos + final sigma', fold('Λευκωσία'), 'λευκωσια');
eq('fold latin accents', fold('Café'), 'cafe');
eq('fold arabic alef/ta marbuta', fold('إقامة'), 'اقامه');

// ── words ────────────────────────────────────────────────────────────────────
eq('words keep inner apostrophe and hyphen', words("Mama's Ayia-Napa, please"), ["Mama's", 'Ayia-Napa', 'please']);
ok('words handle Cyrillic', words('Расскажи про Компот').length === 3);

// ── vocabulary sanity ────────────────────────────────────────────────────────
ok('restaurant is generic', GENERIC.has('restaurant'));
ok('phone is a stop word', STOP.has('phone'));
ok('Limassol is a place word', PLACE_WORDS.has('limassol'));
ok('Kato Polemidia words are place words', PLACE_WORDS.has('polemidia'));
ok('Greek Λεμεσός folds into the place words', PLACE_WORDS.has(fold('Λεμεσός')));

// ── nameGrams: the distinctive word groups of a question ─────────────────────
{
  const g = nameGrams('Do you have a phone number for A and M Solomou Signs in Kato Polemidia please?');
  ok('sentence → "solomou signs" is a gram', g.includes('solomou signs'));
  ok('sentence → no stop-word-only gram ("phone number")', !g.includes('phone number') && !g.includes('phone'));
  ok('sentence → the town alone is not a gram', !g.includes('polemidia') && !g.includes('kato polemidia'));
}
{
  const g = nameGrams('Tell me about Solymaris Beach Bar in Protaras, are they open late?');
  ok('beach bar: full name is a gram', g.includes('solymaris beach bar'));
  ok('beach bar: the name leads (longest, capitalised first)', g[0] === 'solymaris beach bar');
  ok('beach bar: "beach bar" alone (generic) is not a gram', !g.includes('beach bar') && !g.includes('bar'));
}
{
  const g = nameGrams('what is the best italian restaurant in limassol');
  eq('category question → no grams at all (the vector/keyword legs answer it)', g, []);
}
{
  const g = nameGrams('where can i find a lawyer in paphos');
  eq('"a lawyer in Paphos" → no grams', g, []);
}
ok('single distinctive word', nameGrams('zya').includes('zya'));
ok('Cyrillic name is kept', nameGrams('Расскажи про Компот в Лимассоле').includes('компот'));
ok('connector words inside a name survive ("Bank of Cyprus")', nameGrams('opening hours of the Bank of Cyprus in Larnaca').some((x) => x.startsWith('bank of')));
ok('at most 16 grams', nameGrams('alpha bravo charlie delta echo foxtrot golf hotel india juliet kilo lima mike november oscar papa quebec romeo').length <= 16);
eq('empty input → no grams', nameGrams(''), []);

// ── distinctiveTerms (keyword leg) ───────────────────────────────────────────
eq('terms drop stop, generic and place words', distinctiveTerms('Do you know a good italian restaurant called Rimini in Limassol?'), ['rimini', 'called'].filter((w) => w !== 'called'));
ok('terms are longest first', (() => { const t = distinctiveTerms('pharmacy Christoforos Kyriakides Ioannou'); return t[0].length >= t[t.length - 1].length; })());
ok('terms never contain wildcard characters', distinctiveTerms('rimini*(x),%').every((t) => !/[(),*%_]/.test(t)));
ok('terms keep 3-letter non-Latin words', distinctiveTerms('مطعم زيا').includes('زيا'));

// ── contentTerms (keyword search over a business's text): category words stay in ──
eq('pizza is a content term although it is not a name', contentTerms('best pizza in Limassol'), ['pizza']);
ok('towns and function words never count', !contentTerms('a good pharmacy near Mackenzie please').includes('mackenzie') && !contentTerms('a good pharmacy near Mackenzie please').includes('please'));
ok('3-letter non-Latin words kept', contentTerms('مطعم زيا').includes('زيا'));

// ── asksAboutBusiness ────────────────────────────────────────────────────────
ok('phone number question', asksAboutBusiness('What is the phone number of Zya Cafe?'));
ok('opening hours question (de)', asksAboutBusiness('Wie sind die Öffnungszeiten von Zya?'));
ok('opening hours question (ru)', asksAboutBusiness('Какие часы работы у Компот?'));
ok('plain chatter is not about a business', !asksAboutBusiness('Hello, how are you today?'));

// ── askedNames: proper names the guest wrote ─────────────────────────────────
eq('named business in a question', askedNames('Is Xenos open on Sunday in Paphos?'), ['Xenos']);
eq('multi-word name with a connector', askedNames('Can you tell me about Zorba the Greek in Limassol?'), ['Zorba the Greek']);
eq('towns and nationalities are not names', askedNames('I am looking for a Greek restaurant in Limassol'), []);
eq('sentence-opening question word is not a name', askedNames('Where is the best beach?'), []);
eq('months and days are not names', askedNames('Is it open on Monday in August?'), []);
eq('quoted phrase is a name', askedNames('do you know "Blue Lagoon Divers"?'), ['Blue Lagoon Divers']);
eq('Greek capitalised name', askedNames('Ξέρεις το Κυριάκος στη Λεμεσό;'), ['Κυριάκος']);
eq('all lower-case question yields nothing (no false alarm)', askedNames('is zya cafe open'), []);
eq('German capitalises every noun: no false name', askedNames('Gibt es einen guten Zahnarzt in der Nähe? Wie ist die Telefonnummer?'), []);
eq('German with a quoted name still works', askedNames('Kennen Sie das Restaurant "Zorba" und die Öffnungszeiten?'), ['Zorba']);
ok('at most 3 names', askedNames('Alpha met Bravo and Charlie with Delta').length <= 3);

// ── nameCovers ───────────────────────────────────────────────────────────────
ok('retrieved name contains the asked name', nameCovers('A and M Solomou Signs Ltd - Cyprus', 'Solomou Signs'));
ok('asked name contains the retrieved name', nameCovers('Zya', 'Zya Cafe'));
ok('every distinctive token appears', nameCovers('Solymaris Beach Bar', 'Solymaris Bar'));
ok('an unrelated name does not cover', !nameCovers('Ocean Basket', 'Xenos'));
ok('empty never covers', !nameCovers('', 'Xenos') && !nameCovers('Xenos', ''));

report('concierge.names');
