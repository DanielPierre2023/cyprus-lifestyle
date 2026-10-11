// Cyprus Lifestyle — per-language AI-tell detectors (pure, no I/O).
// ============================================================================
// WHY THIS FILE EXISTS
// lib/antiAi.ts carries the original detectors: for every edition a handful of
// calques ("plays a crucial role", "not only … but also", filler openers, dashes)
// plus language-neutral burstiness. English was the only language with a broad
// lexicon (lib/editorial/craft.ts AI_TELLS, which is also what the generation
// prompts quoted to the model in EVERY language). This module widens the other six
// editions (de, el, pl, ro, ru, ar) to roughly the same depth and adds structural
// checks that work in all seven languages:
//
//   1. LEXICAL — brochure clichés, engagement openers ("whether you are … or …"),
//      "underscores/highlights" calques, hype-adjective density, bureaucratic
//      calque density, summary-paragraph openers, "not just X but Y" contrast, and
//      model-leakage preambles ("Certainly! Here is the translation").
//   2. STRUCTURAL — repeated sentence openers, rule-of-three density, rhetorical
//      question / exclamation density, intensifier density, repeated 4-grams,
//      uniform paragraph sizes, and a no-specifics check (a long piece with no
//      digit at all).
//   3. PROMPT LISTS — the same vocabulary as human-readable phrase lists, quoted to
//      the model as NEGATIVE constraints, plus a native-register directive per
//      language (see promptTellList / nativeRegisterRules).
//
// NATIVE REVIEW: the vocabulary for de / el / pl / ro / ru / ar was written from
// linguistic knowledge, not validated by a native editor. Every list is therefore
// flagged `nativeReview: true` (see LANG_PROFILE) and the admin quality page says so.
// The detectors never block publishing; they only score and flag.
//
// Matching notes: ASCII \b does not delimit Greek, Cyrillic or Arabic, so every
// pattern is wrapped in Unicode letter lookarounds. Greek is matched accent-
// insensitively, Russian ё=е, Romanian cedilla=comma-below, Arabic without
// diacritics and with alef/yaa variants folded; patterns are folded the same way
// they fold the text (normalisation of the pattern SOURCE is safe because patterns
// only contain letters of that script plus ASCII regex syntax).
// ============================================================================
import type { Lang, AiTell } from '@/lib/antiAi';

export type Severity = 'high' | 'medium' | 'low';
export interface TellDef { key: string; label: string; severity: Severity; re: RegExp; min?: number }

export const LANG_LIST: readonly Lang[] = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];

// ── normalisation ────────────────────────────────────────────────────────────────
const AR_MARKS = /[ً-ٰٟـ]/g;
export function normalizeArabic(s: string): string {
  return s.replace(AR_MARKS, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي');
}
// Greek: drop tonos/dialytika per code point so the string keeps its length (indexes
// map 1:1 back to the original, which is what the admin sample is cut from).
function normalizeGreek(s: string): string {
  let out = '';
  for (const ch of s.normalize('NFC')) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    out += base.length === ch.length ? base : ch;
  }
  return out;
}
function foldRo(s: string): string { return s.replace(/ş/g, 'ș').replace(/ţ/g, 'ț').replace(/Ş/g, 'Ș').replace(/Ţ/g, 'Ț'); }
function foldRu(s: string): string { return s.replace(/ё/g, 'е').replace(/Ё/g, 'Е'); }

export function normalizeFor(lang: Lang, s: string): string {
  if (lang === 'ar') return normalizeArabic(s);
  if (lang === 'el') return normalizeGreek(s);
  if (lang === 'ro') return foldRo(s);
  if (lang === 'ru') return foldRu(s);
  return s;
}

// ── pattern helpers ──────────────────────────────────────────────────────────────
const L = String.raw`\p{L}\p{M}\p{N}`;
function wb(lang: Lang, alts: string[]): RegExp {
  const src = normalizeFor(lang, alts.join('|'));
  return new RegExp(String.raw`(?<![${L}])(?:${src})(?![${L}])`, 'giu');
}
// Arabic: allow the usual attached prefixes (و ف ب ل ك and the article ال).
function wa(alts: string[]): RegExp {
  const src = normalizeArabic(alts.join('|'));
  return new RegExp(String.raw`(?<![${L}])[وفبلك]{0,2}(?:ال)?(?:${src})(?![${L}])`, 'giu');
}
// Paragraph / text opener (the quality scan preserves paragraph breaks as \n\n).
function anch(lang: Lang, alts: string[]): RegExp {
  const src = normalizeFor(lang, alts.join('|'));
  return new RegExp(String.raw`(?:^|\n)\s*(?:${src})(?![${L}])`, 'giu');
}
function d(re: RegExp, key: string, label: string, severity: Severity, min?: number): TellDef {
  return { key, label, severity, re, min };
}

// ── LEXICAL DEFINITIONS per language ─────────────────────────────────────────────
function enDefs(): TellDef[] {
  const k: Lang = 'en';
  return [
    d(wb(k, ["hidden gems?", "must-(?:visit|see|try)", "look no further", "feast for the (?:senses|eyes)", "symphony of", "step(?:s|ping)? back in time", "slice of paradise", "a (?:paradise|haven) for", "oasis of"]), 'en_brochure', 'Brochure clichés (hidden gem, must-visit, feast for the senses…)', 'medium'),
    d(wb(k, ["whether you(?:'|’)re", "whether you are", "embark(?:s|ed|ing)? on", "dive into", "let(?:'|’)s explore", "unlock(?:s|ed|ing)? the", "elevate[sd]? (?:your|the)", "navigat(?:e|es|ing) the", "in today(?:'|’)s", "in an era (?:of|where|when)", "ever-(?:evolving|changing)", "evolving landscape", "a journey of discovery"]), 'en_engage', 'Engagement openers (whether you’re…, in today’s…, navigate the…)', 'medium'),
    d(wb(k, ["(?:isn(?:'|’)t|is not|aren(?:'|’)t|are not|wasn(?:'|’)t|was not) (?:just|merely|simply) [^.?!]{0,60}[,;] (?:it(?:'|’)s|it is|but|they(?:'|’)re)", "more than just"]), 'en_contrast', '“isn’t just X, it’s Y” contrast', 'medium'),
    d(wb(k, ["only time will tell", "remains to be seen", "the future (?:looks|is) bright", "one thing is (?:certain|clear)", "at the end of the day", "all things considered"]), 'en_closer', 'Stock closing line (only time will tell…)', 'medium'),
    d(wb(k, ["vibrant", "bustling", "stunning", "breathtaking", "picturesque", "unforgettable", "world-class", "renowned", "unparalleled", "rich (?:cultural )?(?:heritage|history)"]), 'en_hype', 'Hype adjectives (vibrant, stunning, breathtaking…)', 'low', 2),
    d(wb(k, ["(?:serves|stands|functions) as (?:a|an|the)"]), 'en_copula', '“serves/stands as a” in place of “is”', 'low', 2),
    d(wb(k, ["as an ai(?: language model)?", "as a language model", "i hope this helps", "here(?:'|’)s (?:the|a|your) (?:translat|rewrit|revised|polished|english)\\p{L}*", "here is (?:the|a|your) (?:translat|rewrit|revised|polished|english|article|text)\\p{L}*", "(?:certainly|sure|of course)[!,.]\\s+here", "i(?:'|’)m sorry,? but"]), 'en_leak', 'Model leakage / chatbot preamble', 'high'),
  ];
}

function deDefs(): TellDef[] {
  const k: Lang = 'de';
  return [
    d(wb(k, ["(?:verborgen|versteckt)(?:e|en|er|es|em)? (?:Perlen?|Juwel(?:en)?|Schatz|Schätze[n]?)", "Fest für (?:die )?Sinne", "(?:Symphonie|Sinfonie) (?:aus|der|von)", "Reise (?:durch|in) die (?:Zeit|Vergangenheit)", "ein Muss", "lässt keine Wünsche offen", "Paradies für", "Oase (?:der|des|für)", "Kleinod"]), 'de_brochure', 'Prospekt-Floskeln (verborgene Perle, Fest für die Sinne…)', 'medium'),
    d(wb(k, ["(?:Ob|Egal ob|Gleich ob) (?:Sie|man|du|ihr)\\b[^.?!]{0,70}\\b(?:oder|ob)", "Suchen Sie nicht weiter", "Tauchen Sie ein", "Entdecken Sie", "Lassen Sie sich", "in einer Welt,? in der", "im Zeitalter (?:der|des)", "in der heutigen (?:digitalen |modernen |schnelllebigen )?(?:Zeit|Welt)", "in einer sich ständig (?:wandelnden|verändernden)"]), 'de_engage', 'Ansprache-Floskeln („Ob Sie … oder …“, „Entdecken Sie“)', 'medium'),
    d(wb(k, ["unterstreich(?:t|en)", "wirft (?:ein )?(?:neues )?Licht auf", "von (?:entscheidender|zentraler|herausragender) Bedeutung", "dient (?:somit )?als (?:Beweis|Beleg|Zeugnis|Erinnerung|Symbol)", "harmonisch(?:e|en)? (?:verbindet|vereint|Verbindung)", "verbindet (?:harmonisch|nahtlos|mühelos)"]), 'de_underscore', '„unterstreicht / wirft Licht auf / dient als Beleg“', 'medium'),
    d(wb(k, ["(?:ist|sind|war|waren) (?:weit )?mehr als (?:nur|bloß|ein)", "mehr als nur", "geht (?:es )?nicht (?:nur|allein|bloß) um"]), 'de_not_just', '„ist mehr als nur …“', 'medium'),
    d(anch(k, ["Fazit", "Alles in allem", "Unterm Strich", "Zusammenfassend lässt sich sagen", "Abschließend lässt sich sagen", "Letztlich"]), 'de_closing', 'Schlussabsatz-Opener (Fazit, Alles in allem…)', 'medium'),
    d(wb(k, ["atemberaubend\\p{L}*", "malerisch\\p{L}*", "pulsierend\\p{L}*", "unvergesslich\\p{L}*", "faszinierend\\p{L}*", "beeindruckend\\p{L}*", "facettenreich\\p{L}*", "vielfältig\\p{L}*", "einzigartig\\p{L}*", "reiche[sn]? (?:kulturelle[sn]? )?(?:Erbe|Geschichte)"]), 'de_hype', 'Hype-Adjektive (atemberaubend, malerisch, einzigartig…)', 'low', 3),
    d(wb(k, ["wahrlich", "zweifellos", "zweifelsohne", "unbestreitbar", "unbestritten", "äußerst", "überaus", "absolut", "wirklich"]), 'de_intensifier', 'Verstärker-Häufung (wahrlich, zweifellos, äußerst…)', 'low', 3),
    d(wb(k, ["im Rahmen (?:der|des|von|einer|eines)", "stellt\\s+[^.?!]{0,50}?\\s+dar", "(?:wird|werden) (?:\\p{L}+ ){0,3}(?:angeboten|bereitgestellt)"]), 'de_calque', 'Übersetzungsdeutsch (im Rahmen von, stellt … dar, wird angeboten)', 'low', 3),
    d(wb(k, ["als (?:KI|künstliche Intelligenz|Sprachmodell)(?:-Sprachmodell)?,? (?:kann|habe|bin|verfüge|besitze)", "hier ist (?:die|der|das|Ihre|Ihr|eine|ein) (?:übersetz|überarbeitet|Übersetzung|Artikel|Text|Version|deutsche)\\p{L}*", "(?:gerne|natürlich|selbstverständlich|klar)[!,.]?\\s+hier", "ich hoffe,? (?:das|dies|diese)(?: \\p{L}+){0,3} hilft"]), 'de_leak', 'KI-Antwortfloskel / Modell-Leck', 'high'),
  ];
}

function elDefs(): TellDef[] {
  const k: Lang = 'el';
  return [
    d(wb(k, ["κρυμμένο[νς]? (?:θησαυρ|διαμάντ|στολίδ|κόσμημα)\\p{L}*", "κρυφ[όο][νς]? (?:θησαυρ|διαμάντ|στολίδ)\\p{L}*", "πανδαισία", "συμφωνία (?:γεύσεων|χρωμάτων|ήχων|αρωμάτων|συναισθημάτων)", "ταξίδι (?:στον|στο) (?:χρόνο|παρελθόν)", "γιορτή (?:των|για τις) αισθήσεις", "παράδεισος για", "όαση (?:ηρεμίας|γαλήνης)", "ταπισερί"]), 'el_brochure', 'Διαφημιστικά κλισέ (κρυμμένος θησαυρός, πανδαισία, ταξίδι στον χρόνο…)', 'medium'),
    d(wb(k, ["είτε (?:είστε|είσαι)[^.?!]{0,70}είτε", "δεν χρειάζεται να ψάξετε (?:πουθενά )?αλλού", "(?:βουτήξτε|βυθιστείτε|βυθίσου) (?:στην|στον|στο)", "ανακαλύψτε", "σε μια εποχή (?:που|όπου)", "σε έναν κόσμο (?:που|όπου)", "στην εποχή μας", "σε ένα διαρκώς (?:μεταβαλλόμενο|εξελισσόμενο)"]), 'el_engage', 'Εισαγωγικές ατάκες («είτε είστε… είτε», «ανακαλύψτε», «σε έναν κόσμο που»)', 'medium'),
    d(wb(k, ["υπογραμμίζει (?:τη|την|τον|το|τις|τους|τα)", "συνδυάζει αρμονικά", "αρμονικ\\p{L}* (?:συνύπαρξη|συνδυασμ\\p{L}*)", "πολυδιάστατ\\p{L}*", "πολυεπίπεδ\\p{L}*", "πλούσι\\p{L}* (?:ψηφιδωτό|υφαντό|μωσαϊκό)", "ανεκτίμητ\\p{L}* (?:αξία|κληρονομιά)"]), 'el_underscore', '«υπογραμμίζει», «συνδυάζει αρμονικά», «πολυδιάστατος»', 'medium'),
    d(wb(k, ["δεν είναι (?:απλώς|απλά|μόνο)[^.?!]{0,60}(?:αλλά|είναι)", "όχι απλώς[^.?!]{0,60}αλλά", "κάτι παραπάνω από"]), 'el_not_just', '«δεν είναι απλώς … αλλά»', 'medium'),
    d(anch(k, ["Εν τέλει", "Συνολικά", "Τελικά", "Στο τέλος της ημέρας", "Συνοψίζοντας"]), 'el_closing', 'Παράγραφος-επίλογος («Εν τέλει», «Συνολικά»…)', 'medium'),
    d(wb(k, ["μαγευτικ\\p{L}*", "γοητευτικ\\p{L}*", "αξέχαστ\\p{L}*", "εκπληκτικ\\p{L}*", "πανέμορφ\\p{L}*", "εξαιρετικ\\p{L}*", "μοναδικ\\p{L}*", "πολύχρωμ\\p{L}*", "γραφικ\\p{L}*"]), 'el_hype', 'Επίθετα-διαφήμιση (μαγευτικός, αξέχαστος, μοναδικός…)', 'low', 3),
    d(wb(k, ["αναμφίβολα", "αναμφισβήτητα", "πραγματικά", "ιδιαίτερα", "απολύτως", "ανεπιφύλακτα", "αναντίρρητα"]), 'el_intensifier', 'Συσσώρευση ενισχυτικών (αναμφίβολα, πραγματικά…)', 'low', 3),
    d(wb(k, ["αποτελ(?:εί|ούν|ούσε|ούσαν)"]), 'el_copula', 'Υπερχρήση του «αποτελεί»', 'low', 3),
    d(wb(k, ["στο πλαίσιο (?:της|του|των|αυτού|αυτής)", "σε αυτό το πλαίσιο", "πραγματοποι(?:είται|ούνται|ήθηκε|ήθηκαν)"]), 'el_calque', 'Γραφειοκρατική γλώσσα (στο πλαίσιο, πραγματοποιείται)', 'low', 3),
    d(wb(k, ["ως (?:γλωσσικό )?μοντέλο", "ως τεχνητή νοημοσύνη", "ελπίζω (?:αυτό )?να βοηθ\\p{L}*", "ορίστε (?:η|ο|το) (?:μετάφραση|άρθρο|κείμενο|αναθεωρημένη)\\p{L}*", "(?:φυσικά|βεβαίως|σίγουρα)[!,.]?\\s+ορίστε", "εδώ είναι η μετάφραση"]), 'el_leak', 'Διαρροή απάντησης μοντέλου («Φυσικά! Ορίστε…»)', 'high'),
  ];
}

function plDefs(): TellDef[] {
  const k: Lang = 'pl';
  return [
    d(wb(k, ["ukryt(?:a|ą|ej|e|ych) (?:perła|perłą|perły|perłę|skarb|skarbu|klejnot|klejnotem)", "uczta dla (?:zmysłów|oka|podniebienia)", "symfoni(?:a|ę|i|ą) (?:smaków|kolorów|dźwięków|zapachów)", "podróż (?:w czasie|do przeszłości|przez wieki)", "raj dla", "oaz(?:a|ą|y) (?:spokoju|ciszy)", "obowiązkowy punkt", "niezapomnian(?:e|ych|ym|ego|ą) (?:wrażenia|wrażeń|doświadczeni(?:e|a)|przeżyci(?:e|a))"]), 'pl_brochure', 'Folderowe kliszé (ukryta perła, uczta dla zmysłów…)', 'medium'),
    d(wb(k, ["(?:niezależnie od tego|bez względu na to),? czy (?:jesteś|jesteście)", "czy (?:jesteś|jesteście)\\b[^.?!]{0,60}\\bczy\\b", "nie szukaj dalej", "zanurz (?:się )?w", "zanurzyć się w", "odkryj\\p{L}*", "w świecie, w którym", "w erze", "w dzisiejszym (?:szybko zmieniającym się |dynamicznym |cyfrowym )?świecie", "w dynamicznie zmieniającym się świecie", "w ciągle zmieniającym się"]), 'pl_engage', 'Wstępy-zaczepki („niezależnie od tego, czy…”, „odkryj”, „w erze”)', 'medium'),
    d(wb(k, ["podkreśla (?:znaczenie|wagę|rolę)", "rzuca (?:nowe )?światło na", "stanowi (?:doskonały|świetny|wspaniały|żywy|doskonałe|dowód|świadectwo)", "jest (?:żywym |wymownym )?świadectwem", "harmonijnie łączy", "gobelin\\p{L}*", "bogat(?:y|a|e|ą|ego|ym) (?:gobelin|krajobraz|mozaik)\\p{L}*"]), 'pl_underscore', '„podkreśla znaczenie / stanowi dowód / harmonijnie łączy”', 'medium'),
    d(wb(k, ["nie jest to (?:tylko|jedynie|wyłącznie)", "(?:coś|to) więcej niż", "więcej niż (?:tylko|zwykł\\p{L}*)"]), 'pl_not_just', '„to coś więcej niż …”', 'medium'),
    d(anch(k, ["Podsumowanie", "Wnioski", "Krótko mówiąc", "Jednym słowem", "W ostatecznym rozrachunku", "Finalnie", "Warto (?:też|także|również|wspomnieć|dodać)"]), 'pl_closing', 'Akapit-zakończenie („Krótko mówiąc”, „W ostatecznym rozrachunku”)', 'medium'),
    d(wb(k, ["malownicz\\p{L}*", "urzekając\\p{L}*", "tętniąc\\p{L}*", "tętni życiem", "zachwycając\\p{L}*", "niezwykł\\p{L}*", "wyjątkow\\p{L}*", "niepowtarzaln\\p{L}*", "magiczn\\p{L}*", "fascynując\\p{L}*", "bogat(?:e|ą|y|a) dziedzictw\\p{L}*"]), 'pl_hype', 'Przymiotniki-reklama (malowniczy, niepowtarzalny, wyjątkowy…)', 'low', 3),
    d(wb(k, ["niewątpliwie", "bez wątpienia", "bezsprzecznie", "naprawdę", "niezwykle", "absolutnie", "zdecydowanie", "prawdziwie"]), 'pl_intensifier', 'Nagromadzenie wzmacniaczy (niewątpliwie, naprawdę…)', 'low', 3),
    d(wb(k, ["dokon\\p{L}+ (?:zakupu|wyboru|rezerwacji|inwestycji|otwarcia)", "w ramach \\p{L}+", "(?:jest|są) oferowan\\p{L}*"]), 'pl_calque', 'Kalki urzędowe (dokonać zakupu, w ramach, jest oferowany)', 'low', 3),
    d(wb(k, ["jako (?:model językowy|sztuczna inteligencja)", "mam nadzieję,? że (?:to |ten |ta )?(?:pomoże|się przyda)", "oto (?:przetłumaczon|poprawion|zredagowan|tłumaczeni|artykuł|tekst|wersj)\\p{L}*", "(?:oczywiście|pewnie|jasne)[!,.]?\\s+oto"]), 'pl_leak', 'Wyciek odpowiedzi modelu („Oczywiście! Oto…”)', 'high'),
  ];
}

function roDefs(): TellDef[] {
  const k: Lang = 'ro';
  return [
    d(wb(k, ["(?:bijuterie|comoară|perlă|comoara|perla) ascuns[ăe]", "(?:un )?festin pentru (?:simțuri|ochi|papilele)", "(?:o )?simfonie de (?:arome|culori|gusturi|sunete)", "călătorie în timp", "(?:un )?paradis pentru", "oază de (?:liniște|calm|pace)", "must-?see", "loc obligatoriu"]), 'ro_brochure', 'Clișee de broșură (comoară ascunsă, festin pentru simțuri…)', 'medium'),
    d(wb(k, ["(?:fie că|indiferent dacă) (?:ești|sunteți)[^.?!]{0,70}(?:fie că|sau)", "nu (?:mai )?căuta(?:ți)? mai departe", "(?:cufundă|scufundă)(?:-te|ți-vă|-vă)? în", "descoperă(?:ți)?", "într-o lume (?:în care|care|aflată|în continuă)", "în era (?:digitală|modernă|informației)", "în lumea de (?:astăzi|azi)", "în continuă (?:schimbare|evoluție|transformare)"]), 'ro_engage', 'Introduceri-momeală („fie că ești…”, „descoperă”, „într-o lume în care”)', 'medium'),
    d(wb(k, ["subliniază importanța", "pune accent pe", "este o mărturie a", "reprezintă o (?:mărturie|dovadă)", "se remarcă prin", "îmbină armonios", "(?:o )?tapiserie", "mozaic de"]), 'ro_underscore', '„subliniază importanța / este o mărturie a / îmbină armonios”', 'medium'),
    d(wb(k, ["nu (?:este )?(?:doar|numai|e doar)\\b[^.?!]{0,80}\\b(?:ci|dar) (?:și|ca)", "mai mult decât (?:doar|un simplu|o simplă)"]), 'ro_not_only', '„nu este doar … ci și”', 'medium'),
    d(anch(k, ["În ansamblu", "Pe scurt", "Așadar", "În final", "În definitiv", "Concluzia", "Per total", "Cu alte cuvinte"]), 'ro_closing', 'Paragraf-concluzie („Așadar”, „În ansamblu”…)', 'medium'),
    d(wb(k, ["pitoresc\\p{L}*", "vibrant\\p{L}*", "fascinant\\p{L}*", "captivant\\p{L}*", "de neuitat", "inedit\\p{L}*", "extraordinar\\p{L}*", "încântător\\p{L}*", "bogat patrimoniu", "patrimoniu cultural bogat"]), 'ro_hype', 'Adjective de reclamă (pitoresc, vibrant, de neuitat…)', 'low', 3),
    d(wb(k, ["incontestabil", "indiscutabil", "fără îndoială", "cu adevărat", "într-adevăr", "extrem de", "absolut", "deosebit de", "cu siguranță"]), 'ro_intensifier', 'Aglomerare de intensificatori (fără îndoială, cu adevărat…)', 'low', 3),
    d(wb(k, ["în cadrul", "în vederea", "este realizat[ăe]?", "sunt realizat\\p{L}*", "în ceea ce privește", "datorită faptului că"]), 'ro_calque', 'Limbaj birocratic / calc (în cadrul, în vederea, în ceea ce privește)', 'low', 3),
    d(wb(k, ["ca (?:model de limbaj|inteligență artificială)", "sper că (?:acest|aceasta)", "iată (?:traducerea|articolul|textul|versiunea)", "(?:desigur|bineînțeles|sigur)[!,.]?\\s+iată"]), 'ro_leak', 'Scurgere de răspuns al modelului („Desigur! Iată…”)', 'high'),
  ];
}

function ruDefs(): TellDef[] {
  const k: Lang = 'ru';
  return [
    d(wb(k, ["скрыт(?:ая|ую|ой|ые|ых|ым) (?:жемчужин\\p{L}*|сокровищ\\p{L}*|драгоценност\\p{L}*)", "жемчужин\\p{L}* (?:Средиземноморья|острова|Кипра)", "праздник для (?:глаз|души|вкуса|чувств)", "симфони\\p{L}* (?:вкусов|красок|звуков|ароматов)", "путешествие (?:во времени|в прошлое)", "рай для", "оазис (?:спокойствия|покоя|тишины)", "обязательн\\p{L}* к посещению", "незабываем\\p{L}* (?:впечатлени\\p{L}*|опыт\\p{L}*|ощущени\\p{L}*)"]), 'ru_brochure', 'Рекламные штампы (скрытая жемчужина, симфония вкусов…)', 'medium'),
    d(wb(k, ["независимо от того,? (?:являетесь ли вы|ищете ли вы|хотите ли вы)", "не ищите дальше", "погрузитесь в", "окунитесь в", "откройте для себя", "в мире,? где", "в эпоху", "в (?:современном |постоянно )?быстро меняющемся мире", "в постоянно меняющемся мире"]), 'ru_engage', 'Зазывные зачины («независимо от того…», «откройте для себя», «в мире, где»)', 'medium'),
    d(wb(k, ["подч[её]ркивает (?:важность|значение|роль)", "проливает свет на", "является (?:ярким |наглядным )?(?:свидетельством|примером|доказательством|воплощением)", "яркий пример", "служит (?:напоминанием|доказательством|свидетельством)", "гармонично (?:сочетает|объединяет|сочетаются)", "многогранн\\p{L}*", "гобелен\\p{L}*", "неотъемлем\\p{L}* (?:часть|элемент)", "оставляет неизгладимое впечатление"]), 'ru_underscore', '«подчёркивает важность», «является свидетельством», «гармонично сочетает»', 'medium'),
    d(wb(k, ["это не просто[^.?!]{0,60}(?:а|это)", "не просто[^.?!]{0,60},? а", "больше,? чем просто", "нечто большее,? чем"]), 'ru_not_just', '«это не просто …, а …»', 'medium'),
    d(anch(k, ["Подводя итог", "Резюмируя", "Подытоживая", "В целом", "Итак", "Что в итоге"]), 'ru_closing', 'Абзац-вывод («Подводя итог», «В целом», «Итак»)', 'medium'),
    d(wb(k, ["живописн\\p{L}*", "колоритн\\p{L}*", "уникальн\\p{L}*", "потрясающ\\p{L}*", "захватывающ\\p{L}*", "невероятн\\p{L}*", "великолепн\\p{L}*", "очаровательн\\p{L}*", "богатое культурное наследие"]), 'ru_hype', 'Прилагательные-реклама (живописный, уникальный, потрясающий…)', 'low', 3),
    d(wb(k, ["поистине", "по-настоящему", "безусловно", "несомненно", "исключительно", "невероятно", "абсолютно", "действительно", "бесспорно", "подлинно"]), 'ru_intensifier', 'Скопление усилителей (поистине, безусловно, несомненно…)', 'low', 3),
    d(wb(k, ["данн(?:ый|ая|ое|ые|ого|ой|ому|ым|ых|ую)", "осуществля\\p{L}*", "в рамках", "является", "являются", "представля(?:ет|ют) собой", "оказыва(?:ет|ют) (?:влияние|воздействие)", "в целях"]), 'ru_chancellery', 'Канцелярит (данный, осуществлять, в рамках, является)', 'low', 4),
    d(wb(k, ["как (?:языковая модель|ИИ|искусственный интеллект)", "надеюсь,? (?:это|что это) (?:поможет|будет полезно)", "вот (?:перевод|статья|текст|исправленн\\p{L}*|переработанн\\p{L}*)", "(?:конечно|разумеется|хорошо)[!,.]?\\s+вот"]), 'ru_leak', 'Утечка ответа модели («Конечно! Вот…»)', 'high'),
  ];
}

function arDefs(): TellDef[] {
  return [
    d(wa(["جوهرة (?:مخفية|خفية|مكنونة)", "كنز (?:مخفي|خفي|دفين)", "وليمة (?:للحواس|للعين)", "سيمفونية (?:من|ال)", "رحلة عبر (?:الزمن|التاريخ|العصور)", "رحلة (?:ساحرة|استكشافية|اكتشاف)", "جنة (?:لل|ل)", "واحة (?:من )?(?:الهدوء|السكينة)", "لوحة فنية", "وجهة (?:مثالية|مفضلة|لا مثيل لها)"]), 'ar_brochure', 'عبارات دعائية (جوهرة مخفية، وليمة للحواس، رحلة عبر الزمن…)', 'medium'),
    d(wa(["سواء كنت[^.?!؟]{0,70}(?:أو)", "لا داعي للبحث بعيد", "لا تبحث(?:وا)? بعيد", "انغمس", "اكتشف (?:سحر|جمال|عالم)", "في عصرنا", "في عالم (?:يتسم|تتسارع|يتغير)", "في ظل (?:التطورات|عالم)"]), 'ar_engage', 'مقدمات استدراجية («سواء كنت … أو»، «اكتشف سحر»، «في عالم يتغير»)', 'medium'),
    d(wa(["يؤكد (?:على )?أهمية", "تؤكد (?:على )?أهمية", "يبرز أهمية", "يعد بمثابة", "يعتبر بمثابة", "تعد بمثابة", "تعتبر بمثابة", "يعد من أبرز", "تعد من أبرز", "يزخر", "تزخر", "يعج", "تعج", "بانسجام تام", "فسيفساء (?:من|ثقافية)", "إرث (?:ثقافي )?(?:غني|عريق)", "تراث (?:ثقافي )?(?:غني|عريق)"]), 'ar_underscore', '«يؤكد أهمية»، «يعد بمثابة»، «يزخر بـ»، «إرث ثقافي غني»', 'medium'),
    d(wa(["ليس (?:مجرد|فقط)[^.?!؟]{0,70}(?:بل|وإنما|لكنه|لكنها)", "ليست (?:مجرد|فقط)[^.?!؟]{0,70}(?:بل|لكنها)", "أكثر من مجرد", "لا يقتصر[^.?!؟]{0,60}(?:بل|وإنما)", "لا تقتصر[^.?!؟]{0,60}(?:بل|وإنما)"]), 'ar_not_just', '«ليس مجرد … بل»', 'medium'),
    d(anch('ar', ["خلاصة القول", "الخلاصة", "وخلاصة", "في المجمل", "بوجه عام", "في المحصلة", "خلاصة"]), 'ar_closing', 'فقرة خلاصة («خلاصة القول»، «في المجمل»…)', 'medium'),
    d(wa(["ساحر\\p{L}*", "خلاب\\p{L}*", "آسر\\p{L}*", "لا ينسى", "فريد\\p{L}*", "استثنائي\\p{L}*", "رائع\\p{L}*", "مذهل\\p{L}*", "عريق\\p{L}*", "متميز\\p{L}*"]), 'ar_hype', 'صفات دعائية (ساحر، خلاب، فريد، استثنائي، مذهل…)', 'low', 3),
    d(wa(["حقا", "بالفعل", "بلا شك", "دون شك", "بكل تأكيد", "بلا منازع", "بشكل لافت", "للغاية", "بامتياز"]), 'ar_intensifier', 'تراكم المؤكدات (بلا شك، بالفعل، للغاية…)', 'low', 3),
    d(wa(["يعد", "تعد", "يعتبر", "تعتبر", "بمثابة", "يتميز", "تتميز", "يمثل", "تمثل", "يتم (?:ال)?\\p{L}{3,}", "قام(?:ت|وا)? ب\\p{L}+"]), 'ar_calque', 'ترجمة حرفية (يتم + مصدر، قام بـ، يعد، يتميز بـ)', 'low', 4),
    d(wa(["بصفتي (?:نموذج|ذكاء)", "كنموذج لغوي", "آمل أن (?:يكون|تكون|يساعد)", "أتمنى أن (?:يكون|تكون|يساعد)", "إليك (?:الترجمة|المقال|النص|النسخة)", "(?:بالتأكيد|بكل سرور)[!،.]? (?:إليك|هذا)", "فيما يلي (?:الترجمة|النص|المقال)", "هذه (?:هي )?الترجمة"]), 'ar_leak', 'تسرب رد النموذج («بالتأكيد! إليك…»)', 'high'),
  ];
}

const DEFS_CACHE = new Map<Lang, TellDef[]>();
export function extraTellDefs(lang: Lang): TellDef[] {
  let v = DEFS_CACHE.get(lang);
  if (!v) {
    v = lang === 'de' ? deDefs() : lang === 'el' ? elDefs() : lang === 'pl' ? plDefs()
      : lang === 'ro' ? roDefs() : lang === 'ru' ? ruDefs() : lang === 'ar' ? arDefs() : enDefs();
    DEFS_CACHE.set(lang, v);
  }
  return v;
}

// ── STRUCTURAL CHECKS (all seven languages) ──────────────────────────────────────
const WORD = /[\p{L}\p{M}\p{N}]+(?:['’-][\p{L}\p{M}]+)*/gu;
const words = (s: string): string[] => s.match(WORD) || [];

// Coordinating conjunction per language, used by the rule-of-three detector.
function andWords(lang: Lang): string {
  switch (lang) {
    case 'de': return 'und|oder';
    case 'el': return 'και|ή';
    case 'ro': return 'și|sau';
    case 'pl': return 'i|oraz|lub';
    case 'ru': return 'и|или';
    case 'ar': return '';
    default: return 'and|or';
  }
}
// English intensifier pile-up; the other languages carry theirs in the lexical defs.
const INTENS_EN = ['truly', 'incredibly', 'absolutely', 'undoubtedly', 'unquestionably', 'remarkably', 'profoundly', 'genuinely', 'exceptionally', 'undeniably'];

function sampleAt(view: string, idx: number, len: number): string {
  const i = Math.max(0, idx - 24);
  const j = Math.min(view.length, idx + len + 24);
  return (i > 0 ? '…' : '') + view.slice(i, j).replace(/\s+/g, ' ').trim() + (j < view.length ? '…' : '');
}

function sentencesOf(text: string): string[] {
  return text.split(/[.!?;؟··…\n]+/u).map((s) => s.trim()).filter((s) => words(s).length >= 3);
}

function firstWord(sentence: string, lang: Lang): string {
  let w = (words(sentence)[0] || '').toLowerCase();
  if (lang === 'ar' && w.length > 3 && w.startsWith('و')) w = w.slice(1);
  return w;
}

/**
 * The measured paragraph sizes as a short line, for the editor model and the admin page: "words per paragraph: 58·62·60 (shortest
 * neighbours: 58 + 62 words)". The pair is a candidate to join, found by size so that it holds whatever the numbering of headings is.
 */
export function paragraphSizesSample(sizes: number[]): string {
  const shown = sizes.slice(0, 16).join('·') + (sizes.length > 16 ? '…' : '');
  let best = -1; let bestSum = Infinity;
  for (let i = 0; i + 1 < sizes.length; i++) { const s = sizes[i] + sizes[i + 1]; if (s < bestSum) { bestSum = s; best = i; } }
  return `words per paragraph: ${shown}${best >= 0 ? ` (shortest neighbours: ${sizes[best]} + ${sizes[best + 1]} words)` : ''}`;
}

export function structuralTells(text: string, lang: Lang, view: string = text): AiTell[] {
  const out: AiTell[] = [];
  const all = words(text);
  const n = all.length;
  if (n < 40) return out;

  // 1. repeated sentence openers — three or more consecutive sentences begin alike.
  const sents = sentencesOf(text);
  let run = 1, maxRun = 1, runs = 0, runWord = '', bestWord = '';
  for (let i = 1; i < sents.length; i++) {
    const a = firstWord(sents[i - 1], lang), b = firstWord(sents[i], lang);
    if (a && a === b && !/^\p{N}+$/u.test(a)) { run++; runWord = a; if (run === 3) runs++; if (run > maxRun) { maxRun = run; bestWord = a; } }
    else run = 1;
  }
  if (maxRun >= 3) {
    out.push({ key: 'repeated_openers', label: `Consecutive sentences open with the same word (“${bestWord || runWord}” ×${maxRun})`, severity: maxRun >= 4 ? 'medium' : 'low', count: runs, sample: bestWord || runWord });
  }

  // 2. rule of three — "A, B and C" lists at high density.
  const conj = andWords(lang);
  const tri = lang === 'ar'
    ? new RegExp(String.raw`[${L}]+\s*[،,]\s*[${L}]+\s*[،,]?\s*و[${L}]+`, 'gu')
    : new RegExp(String.raw`(?<![${L}])[${L}]+(?: [${L}]+)?, [${L}]+(?: [${L}]+)?,? (?:${conj}) [${L}]+`, 'giu');
  const triCount = (text.match(tri) || []).length;
  if (triCount >= 3 && triCount * 90 >= n) {
    const m = tri.exec(view);
    out.push({ key: 'rule_of_three', label: 'Rule-of-three lists at high density', severity: 'low', count: triCount, sample: m ? sampleAt(view, m.index, m[0].length) : '' });
  }

  // 3. rhetorical questions / exclamations in running prose.
  const q = (text.match(/[?؟]/g) || []).length;
  if (q >= 3) out.push({ key: 'question_density', label: 'Rhetorical questions in running prose', severity: 'low', count: q, sample: '' });
  const ex = (text.match(/!/g) || []).length;
  if (ex >= 3) out.push({ key: 'exclaim_density', label: 'Exclamation marks in running prose', severity: 'low', count: ex, sample: '' });

  // 4. English intensifier pile-up (other languages carry theirs in the lexical defs).
  if (lang === 'en') {
    const re = wb(lang, INTENS_EN);
    const c = (text.match(re) || []).length;
    if (c >= 3) out.push({ key: 'intensifier_density', label: 'Intensifier pile-up (truly, incredibly, absolutely…)', severity: 'low', count: c, sample: '' });
  }

  // 5. repeated 4-grams (templated phrasing). Skips grams containing a digit.
  if (n >= 80) {
    const low = all.map((w) => w.toLowerCase());
    const seen = new Map<string, number>();
    for (let i = 0; i + 4 <= low.length; i++) {
      const g = low.slice(i, i + 4);
      if (g.some((w) => /\p{N}/u.test(w))) continue;
      const key = g.join(' ');
      seen.set(key, (seen.get(key) || 0) + 1);
    }
    let best = '', bestN = 0;
    for (const [g, c] of seen) if (c > bestN) { best = g; bestN = c; }
    if (bestN >= 3) out.push({ key: 'repeated_phrase', label: `Phrase repeated ${bestN}× (“${best}”)`, severity: 'medium', count: bestN, sample: best });
  }

  // 6. uniform paragraph sizes (needs paragraph breaks in the input).
  const paras = text.split(/\n\s*\n+|\n/).map((p) => words(p).length).filter((c) => c >= 8);
  if (paras.length >= 4) {
    const mean = paras.reduce((a, b) => a + b, 0) / paras.length;
    const cv = Math.sqrt(paras.reduce((a, b) => a + (b - mean) * (b - mean), 0) / paras.length) / mean;
    // The sample is what the editor model and the admin page are shown: the measured sizes and the shortest neighbouring pair (a
    // candidate to join), not a statistic nobody can act on.
    if (cv < 0.2) out.push({ key: 'uniform_paragraphs', label: 'Paragraphs are all about the same length', severity: 'low', count: paras.length, sample: paragraphSizesSample(paras) });
  }

  // 7. no specifics — a long piece without a single digit.
  if (n >= 150 && !/\p{N}/u.test(text)) out.push({ key: 'no_specifics', label: 'No figures, dates or counts anywhere in a long piece', severity: 'low', count: 1, sample: '' });

  return out;
}

// ── scoring hook used by lib/antiAi.ts ───────────────────────────────────────────
export interface PreparedText { text: string; view: string }
export function prepare(content: string, lang: Lang): PreparedText {
  const text = normalizeFor(lang, content);
  // Greek/Romanian/Russian fold per character, so the original is a valid display view.
  const view = lang === 'ar' ? text : lang === 'el' ? content.normalize('NFC') : content;
  return { text, view };
}

export function lexicalTells(content: string, lang: Lang): AiTell[] {
  const { text, view } = prepare(content, lang);
  const out: AiTell[] = [];
  for (const def of extraTellDefs(lang)) {
    const re = new RegExp(def.re.source, def.re.flags);
    const matches = text.match(re);
    const count = matches ? matches.length : 0;
    if (count === 0 || count < (def.min || 1)) continue;
    const m = new RegExp(def.re.source, def.re.flags).exec(text);
    out.push({ key: def.key, label: def.label, severity: def.severity, count, sample: m ? sampleAt(view.length === text.length ? view : text, m.index, m[0].length) : '' });
  }
  return out;
}

// ── PROMPT LISTS — negative constraints quoted to the model ──────────────────────
// Human-readable (not regex) so the model can generalise to inflected forms.
export function promptTells(lang: Lang): string[] {
  switch (lang) {
    case 'en': return ['delve into', 'nestled in the heart of', 'a testament to', 'rich tapestry', 'plays a crucial role', 'it’s worth noting', 'in today’s fast-paced world', 'whether you’re … or …', 'look no further', 'hidden gem', 'a feast for the senses', 'not just X, but Y', 'In conclusion', 'Moreover / Furthermore', 'vibrant, bustling, stunning, breathtaking'];
    case 'de': return ['es ist wichtig zu beachten', 'spielt eine entscheidende Rolle', 'ein Zeugnis für', 'eine breite Palette von', 'im Herzen von', 'wirft ein Licht auf', 'unterstreicht die Bedeutung', 'in der heutigen schnelllebigen Welt', 'Ob Sie … oder …', 'Entdecken Sie / Tauchen Sie ein', 'verborgene Perle', 'ein Fest für die Sinne', 'ist mehr als nur …', 'nicht nur … sondern auch', 'Darüber hinaus / Zudem / Außerdem am Satzanfang', 'Fazit / Zusammenfassend lässt sich sagen', 'atemberaubend, malerisch, einzigartig, unvergesslich'];
    case 'el': return ['αξίζει να σημειωθεί', 'διαδραματίζει καθοριστικό ρόλο', 'αποτελεί απόδειξη / μαρτυρία', 'ένα ευρύ φάσμα / μια πληθώρα', 'στην καρδιά της', 'ρίχνει φως σε', 'υπογραμμίζει τη σημασία', 'συνδυάζει αρμονικά', 'σε έναν κόσμο που…', 'είτε είστε … είτε …', 'ανακαλύψτε', 'κρυμμένος θησαυρός', 'πανδαισία γεύσεων / χρωμάτων', 'ταξίδι στον χρόνο', 'δεν είναι απλώς … αλλά', 'όχι μόνο … αλλά και', 'Επιπλέον / Επιπροσθέτως στην αρχή πρότασης', 'Εν κατακλείδι / Συνολικά', 'μαγευτικός, αξέχαστος, μοναδικός'];
    case 'ro': return ['merită menționat că', 'joacă un rol crucial', 'este o mărturie a', 'o gamă largă de', 'în inima…', 'pune în lumină / subliniază importanța', 'într-o lume în continuă schimbare', 'în era digitală', 'fie că ești … fie că …', 'descoperă / scufundă-te în', 'comoară ascunsă', 'festin pentru simțuri', 'tapiserie bogată', 'nu este doar … ci și', 'În plus / Totodată la începutul frazei', 'În concluzie / Așadar', 'pitoresc, vibrant, de neuitat'];
    case 'pl': return ['warto zauważyć, że', 'odgrywa kluczową rolę', 'stanowi dowód / świadectwo', 'szeroka gama / szeroki wachlarz', 'w sercu', 'rzuca światło na', 'podkreśla znaczenie', 'w dzisiejszym szybko zmieniającym się świecie', 'niezależnie od tego, czy … czy …', 'odkryj / zanurz się w', 'ukryta perła', 'uczta dla zmysłów', 'symfonia smaków', 'to coś więcej niż …', 'nie tylko … ale także', 'Ponadto / Co więcej na początku zdania', 'Podsumowując / Krótko mówiąc', 'malowniczy, niepowtarzalny, wyjątkowy'];
    case 'ru': return ['стоит отметить, что', 'играет ключевую роль', 'является свидетельством / ярким примером', 'широкий спектр', 'в самом сердце', 'проливает свет на', 'подчёркивает важность', 'гармонично сочетает', 'в современном быстро меняющемся мире', 'независимо от того, являетесь ли вы …', 'откройте для себя / погрузитесь в', 'скрытая жемчужина', 'симфония вкусов', 'это не просто …, а …', 'не только … но и', 'Более того / Кроме того в начале предложения', 'Подводя итог / Таким образом / В целом', 'живописный, уникальный, потрясающий; канцелярит: данный, осуществлять, в рамках'];
    case 'ar': return ['تجدر الإشارة إلى أن', 'من الجدير بالذكر', 'يلعب دورا محوريا', 'يشكل دليلا على', 'يسلط الضوء على', 'يؤكد أهمية', 'مجموعة واسعة من', 'في قلب', 'في عالم اليوم / في عالم سريع التغير', 'سواء كنت … أو …', 'اكتشف سحر', 'جوهرة مخفية', 'وليمة للحواس', 'رحلة عبر الزمن', 'يزخر بـ / يعد بمثابة', 'ليس فقط … بل أيضا', 'ليس مجرد … بل', 'علاوة على ذلك / بالإضافة إلى ذلك في بداية الجملة', 'في الختام / خلاصة القول', 'ساحر، خلاب، فريد، استثنائي'];
    default: return [];
  }
}

export function promptTellList(lang: Lang): string {
  return promptTells(lang).join('; ');
}

// Resolve a language name ("German", "German (Deutsch)", "de") to a Lang.
export function langFromName(name: string | null | undefined): Lang | null {
  const s = String(name || '').trim().toLowerCase();
  if (!s) return null;
  if ((LANG_LIST as readonly string[]).includes(s)) return s as Lang;
  if (/^english|^british/.test(s)) return 'en';
  if (/^german|^deutsch/.test(s)) return 'de';
  if (/^greek|^ελλην/.test(s)) return 'el';
  if (/^romanian|^rom[aâ]n/.test(s)) return 'ro';
  if (/^polish|^polski/.test(s)) return 'pl';
  if (/^russian|^русск/.test(s)) return 'ru';
  if (/^arabic|^العرب/.test(s)) return 'ar';
  return null;
}

// ── NATIVE-REGISTER DIRECTIVES ───────────────────────────────────────────────────
// Appended to every translation / transcreation / polish prompt so the model writes
// the way a local journalist does instead of carrying English syntax across.
const NATIVE_COMMON = [
  'Write the way a working newspaper journalist in this language writes: native register, local idiom, no calques of English constructions or word order.',
  'Do NOT follow the English sentence order. Re-order, split or merge sentences where this language would; keep the facts, not the syntax.',
  'Vary rhythm on purpose: short blunt sentences beside long ones; paragraphs of uneven length; no sentence pattern repeated three times running.',
  'Prefer a concrete verb to an abstract noun, and a plain word to an inflated one. Use local names for places and institutions.',
  'No translator’s note, no preamble such as “Here is the translation”, no closing summary that restates the piece.',
];
function nativeRules(lang: Lang): string[] {
  switch (lang) {
    case 'en': return ['British English spelling and Cyprus usage; contractions where the register allows.'];
    case 'de': return [
    'Standard German (Hochdeutsch) in a newsroom register, not Swiss or Austrian; address the reader with “Sie” only where the text addresses the reader at all.',
    'Avoid Nominalstil and stacked genitives: say “Er eröffnete das Lokal”, not “Die Eröffnung des Lokals wurde von ihm vorgenommen”. Avoid “im Rahmen von”, “stellt … dar”, “wird angeboten”.',
    'Use „deutsche Anführungszeichen“, dates like 12. September 2026, Nikosia / Larnaka / Paphos / Limassol in their German spellings, Konjunktiv I for reported speech where a German paper would use it.',
    'No anglicisms where a German word exists (“Event” → “Veranstaltung”), no English-style title case in headings.',
    ];
    case 'el': return [
    'Modern demotic Greek in a newspaper register: no katharevousa, no bureaucratic “πραγματοποιείται / στο πλαίσιο”; use active verbs.',
    'Prefer the genitive and the natural word order of a Greek paragraph over English subject-first sentences; do not chain “ο οποίος / η οποία” clauses.',
    'Use «guillemets» for quotes and Greek place names (Λευκωσία, Λεμεσός, Λάρνακα, Πάφος, Αμμόχωστος); use the Cypriot context (ΑΗΚ, ΡΙΚ, Βουλή) where the source implies it.',
    'Do not overuse “αποτελεί”; “είναι” is usually the better verb.',
    ];
    case 'ro': return [
    'Standard journalistic Romanian with correct diacritics (ș ț comma-below, ă â î), „ghilimele românești”, and Romanian names for places (Cipru, Nicosia, Larnaca, Limassol, Paphos).',
    'Avoid English-style gerund chains and passive “a fi realizat”; avoid “în cadrul”, “în vederea”, “în ceea ce privește”, “datorită faptului că”.',
    'Keep sentences direct; a Romanian reader expects subject-verb agreement carried by the verb, not heavy noun phrases.',
    ];
    case 'pl': return [
    'Natural Polish press style: verbs over nominalisations (“otworzył” not “dokonał otwarcia”), active voice over “jest oferowany”, and correct case endings on foreign names.',
    'Use „polskie cudzysłowy”, Polish exonyms (Cypr, Nikozja, Larnaka, Pafos, Limassol, Famagusta), and avoid “w ramach”, “w celu”, “warto zauważyć” as padding.',
    'Do not open consecutive sentences with “Ponadto / Co więcej / Dodatkowo”.',
    ];
    case 'ru': return [
    'Живой газетный русский, не канцелярский: избегайте «данный», «осуществлять», «в рамках», «является», «представляет собой»; выбирайте глагол вместо отглагольного существительного.',
    'Используйте «ёлочки», русские названия (Кипр, Никосия, Лимасол, Ларнака, Пафос), обычный порядок слов газетной заметки, а не английский.',
    'Не превращайте каждое предложение в «не только … но и» и «это не просто …, а …».',
    ];
    case 'ar': return [
    'Modern Standard Arabic in the register of an Arab newspaper feature: verb-first sentences where natural; avoid the “يتم + مصدر” passive and “قام بـ + مصدر” calques (say افتتح, not قام بافتتاح).',
    'Avoid stacking “يعد / يعتبر / بمثابة / يتميز بـ”; use Arabic place names (قبرص، نيقوسيا، ليماسول، لارنكا، بافوس) and Arabic punctuation (، ؟ ؛).',
    'Keep figures and Latin brand names as given; do not add dir/lang attributes; write fluent prose, not word-for-word renderings.',
    ];
    default: return [];
  }
}

export function nativeRegisterRules(lang: Lang): string {
  return [...NATIVE_COMMON, ...nativeRules(lang)].map((s) => '• ' + s).join('\n');
}

// ── coverage / review metadata for the admin page and the audit report ───────────
export interface LangProfile { lang: Lang; lexicalDefs: number; structural: number; promptPhrases: number; nativeReview: boolean }
const STRUCTURAL_COUNT = 7;
export function langProfile(lang: Lang): LangProfile {
  return {
    lang,
    lexicalDefs: extraTellDefs(lang).length,
    structural: STRUCTURAL_COUNT,
    promptPhrases: promptTells(lang).length,
    // English was authored in-house; the other six are flagged for a native editor.
    nativeReview: lang !== 'en',
  };
}
