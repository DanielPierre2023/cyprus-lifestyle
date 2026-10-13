// lib/concierge/names.ts — finding a BUSINESS BY NAME inside a guest's sentence. Pure (no I/O), unit-tested.
//
// Three jobs, one vocabulary:
//   1. nameGrams()      — the distinctive word groups of a question ("solomou signs", "solymaris beach bar") that the database
//                         turns into index lookups (match_directory_name). Stop words and everyday category words are left out,
//                         so a question about "an Italian restaurant in Limassol" does not drag in every "… Italian Restaurant".
//   2. distinctiveTerms() — the single words worth a keyword search (same vocabulary), longest first.
//   3. askedNames()     — proper names the guest WROTE ("Xenos", "Zorba the Greek"), minus towns, nationalities, months and
//                         everyday words. Used to notice "the guest asked for a named business and we have no entry" (plan item S4).
//
// The word lists are deliberately modest: function words and meta-requests (phone, address, opening hours) in the seven editions,
// plus the everyday words that name a KIND of place rather than one place.
import { CY_LOCALITIES, DISTRICT_NAME } from '@/lib/concierge/localities';

/** Lower-case, accents and combining marks removed (Greek tonos, Arabic harakat), a few Arabic letter variants merged. */
export function fold(s: string): string {
  return String(s || '')
    .normalize('NFD').replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ς/g, 'σ');
}

const set = (...lists: string[]): Set<string> => new Set(lists.flatMap((l) => l.split(/\s+/).filter(Boolean)).map(fold));

/** Function words, question words, politeness and meta-requests ("phone", "address", "opening hours") — never part of a name search. */
export const STOP: Set<string> = set(
  // English
  `a an the and or but nor so if then than as of in on at to by for from with without into onto over under between about around near nearby close
   is are was were be been being am do does did done have has had having can could would should will shall may might must
   i me my mine we us our ours you your yours he him his she her hers it its they them their theirs this that these those
   what which who whom whose where when why how whether there here yes no not please thanks thank hello hi hey dear
   tell know any some anyone anything something want wants need needs like looking look find finding show give get got ask asking also very much many more most
   best good great nice top better worst cheap expensive open opened opening closed closing hours hour time today tomorrow tonight now late early
   phone telephone number numbers call address contact email website web site page link map location located where's whats what's
   recommend recommended suggest suggestion option options place places spot one ones thing things around really just maybe actually
   called named name names known knows knew`,
  // German
  `und oder aber der die das den dem des ein eine einen einem einer eines ist sind war waren bin bist seid habe hast hat haben hatte kann kannst können
   möchte möchten will wollen suche suchen finde finden gibt es ich du er sie wir ihr mein meine dein deine ihr ihre uns euch mir mich dir dich
   was wer wo wann wie warum welche welcher welches wohin woher mit ohne für von zu zum zur im in am an auf bei nach aus über unter vor hinter neben zwischen
   bitte danke hallo gut beste bester schön geöffnet öffnungszeiten uhr heute morgen nummer telefon adresse webseite nähe
   kennst kennen weißt wisst wissen erzähl erzähle erzählen sag sage sagen empfiehl empfehle empfehlen zeig zeige`,
  // Greek
  `και ή αλλά να το τα τη την της του των ο η οι ένα μια μία ένας σε στο στη στην στον στα στους με για από που ποιο ποια ποιος τι πώς πού πότε γιατί
   είναι έχει έχω έχετε μπορώ μπορείτε θέλω θα ψάχνω ψάχνεται παρακαλώ ευχαριστώ γεια σας καλημέρα καλησπέρα καλό καλή καλύτερο κοντά
   ώρες ωράριο ανοιχτό κλειστό τηλέφωνο αριθμός διεύθυνση σήμερα αύριο
   ξέρεις ξέρετε ξέρω γνωρίζεις γνωρίζετε υπάρχει πες πείτε πείτε μου είπες`,
  // Romanian
  `și sau dar un o niște la în pe cu de din pentru care ce cum unde când de ce este sunt am ai are avem aveți au pot putea vreau caut căutăm
   te rog vă rog mulțumesc mulțumim bună salut cel cea cei cele mai bun bună cel mai bun aproape deschis închis program telefon număr adresă astăzi mâine
   știi știți spune spuneți recomandă recomandați`,
  // Polish
  `i oraz lub albo ale w we na z ze do od dla jak co gdzie kiedy dlaczego który która które jest są czy mam mamy ma chcę szukam szukamy proszę dziękuję
   cześć dzień dobry najlepszy dobry blisko otwarte zamknięte godziny telefon numer adres dziś jutro
   znasz znacie powiedz powiedzcie polecasz polecacie`,
  // Russian
  `и или но в во на с со из для как что где когда почему какой какая какие есть это я мы вы он она они хочу ищу ищем нужен нужна подскажите
   пожалуйста спасибо привет здравствуйте лучший хороший рядом открыт закрыт часы работы телефон номер адрес сегодня завтра
   знаете знаешь расскажи расскажите подскажи подскажите посоветуйте скажите`,
  // Arabic
  `و أو في على من إلى عن مع هل ما ماذا أين متى كيف لماذا هو هي هذا هذه أريد أبحث نبحث من فضلك شكرا مرحبا أفضل جيد قريب مفتوح مغلق ساعات رقم هاتف عنوان اليوم غدا`,
);

/** Everyday words that name a KIND of place or business, not one place: never enough on their own to identify a business. */
export const GENERIC: Set<string> = set(
  `restaurant restaurants taverna tavern tavernas cafe cafes café coffee bar bars pub pubs hotel hotels apartment apartments villa villas resort resorts beach beaches
   club clubs shop shops store stores market markets supermarket pharmacy pharmacies clinic clinics hospital dentist dentists doctor doctors lawyer lawyers bank banks
   agency agent agents estate real property car cars rental hire service services company companies group centre center studio salon spa gym gyms school schools
   bakery pizza pizzeria burger grill kebab souvlaki meze fish seafood steak sushi italian greek chinese indian thai lebanese japanese mexican turkish
   plumber electrician mechanic garage taxi transfer tour tours boat yacht charter wine winery cinema theatre museum
   ltd limited llc inc co plc cyprus cypriot lifestyle concierge`,
  `εστιατόριο εστιατόρια ταβέρνα καφέ καφετέρια μπαρ ξενοδοχείο ξενοδοχεία παραλία φαρμακείο κλινική δικηγόρος τράπεζα κατάστημα`,
  `ресторан рестораны кафе бар отель отели пляж аптека клиника юрист банк магазин`,
  `restaurant restaurante cafenea hotel hoteluri plajă farmacie clinică avocat bancă magazin`,
  `restauracja restauracje kawiarnia hotel plaża apteka klinika prawnik bank sklep`,
  `restaurant gaststätte café hotel strand apotheke klinik anwalt bank geschäft`,
  `مطعم مطاعم مقهى فندق فنادق شاطئ صيدلية عيادة محامي بنك متجر`,
);

const DEMONYMS_AND_CALENDAR = set(
  `greek cypriot russian german polish romanian british english french italian arabic turkish lebanese israeli ukrainian american dutch swedish
   monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december
   euro euros`,
);

/** Towns, villages and districts ("Limassol", "Kato Polemidia", "Lemesos"), folded: a place is not a business name. */
export const PLACE_WORDS: Set<string> = (() => {
  const s = new Set<string>();
  const add = (v: string) => { for (const t of fold(v).split(/[^\p{L}\p{N}]+/u)) if (t.length >= 3) s.add(t); };
  for (const l of CY_LOCALITIES) { add(l.name); for (const a of l.aliases || []) add(a); }
  for (const d of Object.values(DISTRICT_NAME)) add(d);
  for (const extra of ['lemesos', 'lefkosia', 'pafos', 'ammochostos', 'ammochostos', 'kyrenia', 'troodos', 'akamas', 'protaras', 'nicosia', 'cyprus',
    'λεμεσός', 'λεμεσό', 'λευκωσία', 'λάρνακα', 'πάφος', 'πάφο', 'αμμόχωστος', 'αμμόχωστο', 'лимассол', 'ларнака', 'пафос', 'никосия', 'фамагуста', 'ليماسول', 'لارنكا', 'بافوس', 'نيقوسيا']) add(extra);
  return s;
})();

// A letter-run with inner apostrophes / hyphens ("Mama's", "Ayia-Napa"); combining marks stay inside (Arabic, Greek).
const WORD_RE = /[\p{L}\p{M}\p{N}]+(?:['’\-][\p{L}\p{M}\p{N}]+)*/gu;
/** The words of a text, original case kept. */
export function words(q: string): string[] {
  return String(q || '').match(WORD_RE) || [];
}

const isLatin = (w: string) => !/[^\u0000-ɏ]/.test(w);
const isContent = (w: string): boolean => {
  const f = fold(w);
  if (STOP.has(f)) return false;
  return isLatin(w) ? f.replace(/[^\p{L}\p{N}]/gu, '').length >= 3 : f.length >= 2;
};

const PLACE_LIST = [...PLACE_WORDS];
/** A town, village or district — also in an inflected form ("Λεμεσό", "лимассоле"): one folded word is the start of the other. */
export function isPlaceWord(folded: string): boolean {
  if (PLACE_WORDS.has(folded)) return true;
  if (folded.length < 5) return false;
  return PLACE_LIST.some((p) => p.length >= 5 && (p.startsWith(folded) || folded.startsWith(p)));
}
const isWeak = (w: string): boolean => { const f = fold(w); return !isContent(w) || GENERIC.has(f) || isPlaceWord(f); };
const isConnector = (w: string): boolean => CONNECTOR_WORDS.has(fold(w));
const CONNECTOR_WORDS = new Set(['of', 'the', 'and', '&', 'de', 'la', 'le', 'el', 'al', 'tou', 'tis', 'ton', 'του', 'της', 'των', 'και', 'din', 'von', 'van', 'di', 'da']);

/**
 * Word groups (1–4 words) of the question that could be (part of) a business name: the first and last word are content words,
 * the middle may hold a function word ("Bank of Cyprus"), and not every word is a town or an everyday word. Longest and most
 * capitalised first, at most `max`, lower-cased. The database finds the names that CONTAIN these groups.
 */
export function nameGrams(q: string, max = 16): string[] {
  const ws = words(q);
  const out = new Map<string, number>();
  for (let i = 0; i < ws.length; i++) {
    if (!isContent(ws[i])) continue;
    for (let len = 1; len <= 4 && i + len <= ws.length; len++) {
      const win = ws.slice(i, i + len);
      if (!isContent(win[win.length - 1])) continue;
      const caps = win.filter((w) => /^\p{Lu}/u.test(w)).length;
      // a window made only of towns / everyday words is not a name ("beach bar", "italian restaurant") — unless a connector stands
      // inside it, which is how names are written ("Bank of Cyprus", "Taste of Paphos")
      if (win.every(isWeak) && !(len >= 3 && win.slice(1, -1).some(isConnector))) continue;
      // a lone 3-letter word is a name only when the guest wrote almost nothing else ("Zya")
      if (len === 1 && fold(win[0]).length < (isLatin(win[0]) ? (ws.length <= 3 ? 3 : 4) : 3)) continue;
      const key = win.join(' ').toLowerCase();
      const score = len * 2 + caps * 1.5 + Math.min(key.length, 30) / 10;
      if (!out.has(key) || (out.get(key) as number) < score) out.set(key, score);
    }
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]).slice(0, max).map(([k]) => k);
}

/** Single words worth a keyword search: not function words, not everyday category words, not towns; longest first, at most `max`. */
export function distinctiveTerms(q: string, max = 5): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of words(q)) {
    const f = fold(w);
    if (!isContent(w) || GENERIC.has(f) || PLACE_WORDS.has(f) || seen.has(f)) continue;
    if (fold(w).length < (isLatin(w) ? 4 : 3)) continue;
    seen.add(f);
    out.push(w.toLowerCase().replace(/[(),*%_]/g, ''));
  }
  return out.sort((a, b) => b.length - a.length).slice(0, max);
}

// Does the question look like it is ABOUT one particular business (contact details, hours, booking, "tell me about …")?
const ABOUT_RX = new RegExp([
  'phone|telephone|call|number|address|where is|located|location|opening|open on|open at|hours|closed|website|menu|book|reserve|reservation|contact|email|tell me about|do you know|know of|know about|reviews?|rating',
  'τηλέφων|διεύθυνση|ωράριο|ώρες|πού βρίσκεται|κράτηση|ιστοσελίδα',
  'telefon|număr|adres|program|deschis|rezerv|unde se află|spune-mi despre|știi',
  'telefon|numer|adres|godziny|otwart|rezerw|gdzie jest|powiedz mi o|znasz',
  'телефон|номер|адрес|часы работы|график|открыт|брон|где находится|расскажи про|расскажите о|знаете',
  'telefonnummer|nummer|adresse|öffnungszeiten|geöffnet|reservier|wo ist|erzähl mir|kennst du|kennen sie',
  'هاتف|رقم|عنوان|ساعات|مفتوح|حجز|أين يقع|أخبرني عن',
].join('|'), 'iu');
export function asksAboutBusiness(q: string): boolean {
  return ABOUT_RX.test(String(q || ''));
}

/** Does the question mention a KIND of place ("restaurant", "pharmacy", "hotel") — i.e. is a capitalised word likely a business name? */
export function hasVenueWord(q: string): boolean {
  return words(q).some((w) => GENERIC.has(fold(w)));
}


/**
 * Proper names the guest wrote: runs of capitalised words (and quoted phrases), minus towns, nationalities, months and everyday
 * words, and minus a sentence-opening function word ("Where …", "Do …"). Scripts without capitals (Arabic) only yield quoted phrases.
 * Heuristic — it feeds a log and a hint, never a decision on its own.
 */
export function askedNames(q: string, max = 3): string[] {
  const text = String(q || '');
  const found: string[] = [];
  const push = (s: string) => {
    const clean = s.replace(/\s+/g, ' ').trim();
    if (clean.length >= 3 && clean.length <= 60 && !found.some((f) => fold(f) === fold(clean))) found.push(clean);
  };
  for (const m of text.matchAll(/["“«„]([^"”»“]{3,60})["”»“]/gu)) push(m[1]);

  const ws = words(text);
  let run: string[] = [];
  const flush = () => {
    while (run.length && (CONNECTOR_WORDS.has(fold(run[0])) || CONNECTOR_WORDS.has(fold(run[run.length - 1])))) {
      if (CONNECTOR_WORDS.has(fold(run[0]))) run.shift(); else run.pop();
    }
    const real = run.filter((w) => !CONNECTOR_WORDS.has(fold(w)));
    if (real.some((w) => fold(w).length >= 3)) push(run.join(' '));
    run = [];
  };
  ws.forEach((w) => {
    const f = fold(w);
    const cap = /^\p{Lu}/u.test(w);
    const weak = STOP.has(f) || GENERIC.has(f) || isPlaceWord(f) || DEMONYMS_AND_CALENDAR.has(f);
    const afterConnector = run.length > 0 && CONNECTOR_WORDS.has(fold(run[run.length - 1]));
    if (cap && (!weak || afterConnector)) run.push(w);      // "Zorba the Greek", "Bank of Cyprus": a weak word may close a name
    else if (run.length && CONNECTOR_WORDS.has(f)) run.push(w);
    else flush();
  });
  flush();
  return found.slice(0, max);
}

/** True when a retrieved name contains the (folded) phrase the guest wrote or the other way round. */
export function nameCovers(retrievedName: string, asked: string): boolean {
  const a = fold(retrievedName).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  const b = fold(asked).replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  // every distinctive token of the asked phrase appears in the name
  const toks = b.split(' ').filter((t) => t.length >= 3 && !STOP.has(t) && !GENERIC.has(t));
  return toks.length > 0 && toks.every((t) => a.includes(t));
}
