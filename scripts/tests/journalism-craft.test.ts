// The craft rules as detectors (rhythm, paragraph openers, speech verbs, nominal style, lead, first person, vague words, specificity)
// in all seven languages. Every probe below is a sentence the October-2026 audit showed to slip through; the base text is neutral
// pseudo-text, so only the structure under test can make a detector fire.
import { splitSentences, rhythmFromLengths, paragraphsOf, openingWord, wordCount, SIMILAR_WITHIN, type RLang } from '@/lib/journalism/rhythm';
import { craftTells } from '@/lib/journalism/craftTells';
import { phraseHits } from '@/lib/journalism/phrases';
import { FIXTURES } from './fixtures/antiAi-langs';
import { eq, ok, report } from './_harness';

const LANGS: RLang[] = ['en', 'de', 'pl', 'ro', 'ru', 'el', 'ar'];

// ── sentence splitting ───────────────────────────────────────────────────────────────────────────────────────────────
eq('en: abbreviations, decimals and "e.g." do not split', splitSentences('Dr. Smith paid 4.2 million euros. The deal closed on 12 March, e.g. in Nicosia. It was big.', 'en').length, 3);
eq('de: an ordinal date and "z.B." do not split', splitSentences('Am 12. März stimmte der Rat zu. Die Gebühr steigt, z.B. für Boote. Das war es.', 'de'), ['Am 12. März stimmte der Rat zu.', 'Die Gebühr steigt, z.B. für Boote.', 'Das war es.']);
eq('el: the semicolon is the question mark', splitSentences('Πόσο κοστίζει; Ένα ευρώ. Και τώρα;', 'el').length, 3);
eq('other languages: a semicolon is not a stop', splitSentences('Er kam; sie ging. Fertig.', 'de').length, 2);
eq('ar: stops and the Arabic question mark', splitSentences('قال الوزير إن الرسوم سترتفع. وأضاف أن الأعمال ستبدأ؟ نعم.', 'ar').length, 3);
eq('a closing quotation mark stays with its sentence', splitSentences('“We start in June.” The harbourmaster nodded. Then he left.', 'en'), ['“We start in June.”', 'The harbourmaster nodded.', 'Then he left.']);
eq('a lower-case continuation is not a new sentence', splitSentences('He said so... and left. Done.', 'en').length, 2);
eq('initials do not split', splitSentences('J. Smith arrived. He sat down.', 'en').length, 2);
eq('ru: "т.е." does not split', splitSentences('Сбор растёт, т.е. платить придётся больше. Совет утвердил план.', 'ru').length, 2);
eq('word count treats 4.2 as one word', wordCount('The fee is 4.2 million'), 5);

// ── rhythm ───────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const r = rhythmFromLengths([14, 14, 14, 14, 14, 14, 14, 14, 14, 14], 'en');
  eq('equal sentences: SD 0, one flat run', [r.sd, r.flatRun, r.similarShare], [0, 10, 1]);
  const alt = rhythmFromLengths([5, 27, 5, 27, 5, 27, 5, 27, 5, 27, 5, 27, 5, 27, 5, 27, 5, 27], 'en');
  eq('a metronome is a pulse even though its spread is large', [alt.pulse, alt.sd > 10], [true, true]);
  const nat = rhythmFromLengths([18, 6, 27, 14, 9, 31, 12, 22, 7, 19, 5, 26, 15, 29, 8, 11, 24, 13], 'en');
  eq('natural variation is not a pulse', nat.pulse, false);
  eq('the 5-word tolerance is the owner\'s', SIMILAR_WITHIN, 5);
  eq('short and long counts follow the language thresholds', [rhythmFromLengths([7, 7, 24, 26], 'en').short, rhythmFromLengths([7, 7, 24, 26], 'en').long, rhythmFromLengths([22, 23, 24], 'de').long, rhythmFromLengths([22, 23, 24], 'en').long], [2, 1, 2, 0]);
}

// ── paragraphs ───────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const same = paragraphsOf(['Harbour fees rise sharply next spring, owners say. More follows here today.', 'Harbour owners fear costs. Another sentence goes here.', 'The council meets again. Second sentence of the paragraph.'], 'en');
  eq('consecutive paragraphs with one opening word are found', same.consecutiveSame.map((x) => x.word), ['harbour']);
  eq('articles and prepositions are not counted', paragraphsOf(['The council met on Monday. It voted.', 'The mayor spoke after it. He left.'], 'en').consecutiveSame.length, 0);
  eq('the Arabic prefix wa- is ignored', openingWord('وقال الوزير', 'ar'), 'قال');
  eq('a quotation mark in front of the word is ignored', openingWord('“Kitchen” is the name of it.', 'en'), 'kitchen');
  const six = paragraphsOf(['Fees rise now. B.', 'Fees stay put. B.', 'Berths open soon. B.', 'Fees fall again. B.', 'Boats leave early. B.', 'Fees vanish later. B.'].map((p) => p + ' Padding words here to count.'), 'en');
  eq('one opening word used by three paragraphs of six is overused', six.overused, { word: 'fees', count: 4 });
}

// ── pseudo-text, so that only the structure under test can fire ───────────────────────────────────────────────────────
const SYL: Record<RLang, { c: string[]; v: string[] }> = {
  en: { c: 'b d f g k l m n p r s t v z'.split(' '), v: 'a e i o u'.split(' ') }, de: { c: 'b d f g k l m n p r s t v z'.split(' '), v: 'a e i o u'.split(' ') },
  pl: { c: 'b d f g k l m n p r s t w z'.split(' '), v: 'a e i o u'.split(' ') }, ro: { c: 'b d f g c l m n p r s t v z'.split(' '), v: 'a e i o u'.split(' ') },
  ru: { c: 'б в г д к л м н п р с т'.split(' '), v: 'а е и о у'.split(' ') }, el: { c: 'β γ δ κ λ μ ν π ρ σ τ ζ'.split(' '), v: 'α ε ι ο υ'.split(' ') },
  ar: { c: 'ب ت د ر س ك ل م ف'.split(' '), v: 'ا و ي'.split(' ') },   // no noon: pseudo-words must not spell "I" or "we"
};
let seed = 777;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const word = (l: RLang) => { const s = SYL[l]; let w = ''; for (let i = 0; i < 2 + Math.floor(rnd() * 2); i++) w += pick(s.c) + pick(s.v); return w; };
function sentence(l: RLang, len: number, digit = false, firstWord?: string): string {
  const ws: string[] = []; for (let i = 0; i < len; i++) ws.push(word(l));
  if (firstWord) ws[0] = firstWord;
  if (digit && len > 4) ws[Math.floor(len / 2)] = String(10 + Math.floor(rnd() * 880));
  const t = ws.join(' ');
  return (l === 'ar' ? t : t.charAt(0).toUpperCase() + t.slice(1)) + '.';
}
const VARIED = [[18, 6, 27, 14], [9, 31, 12], [22, 7, 19, 5, 26], [15, 29, 8], [11, 24, 13]];
const build = (l: RLang, shape: number[][] = VARIED, o: { firstWord?: string } = {}): string[] => { seed = 777; return shape.map((p) => p.map((len, i) => sentence(l, len, i % 2 === 0, i === 0 ? o.firstWord : undefined)).join(' ')); };
const keys = (l: RLang, paragraphs: string[], extra: { allowFirstPerson?: boolean } = {}) => craftTells({ paragraphs, lang: l, ...extra }).map((t) => t.key);

for (const l of LANGS) eq(`${l}: neutral varied text raises nothing`, keys(l, build(l)), []);

// ── structure probes ─────────────────────────────────────────────────────────────────────────────────────────────────
for (const l of LANGS) {
  const eqP = build(l, [[14, 14, 14, 14], [14, 14, 14, 14], [14, 14, 14, 14], [14, 14, 14, 14], [14, 14, 14, 14]]);
  ok(`${l}: equal sentences: a flat run (and too little spread)`, keys(l, eqP).includes('c_flat_run'));
  const alt = build(l, [[5, 27, 5, 27], [5, 27, 5, 27], [5, 27, 5], [27, 5, 27], [5, 27, 5, 27]]);
  ok(`${l}: a short-long metronome is a pulse`, keys(l, alt).includes('c_pulse'));
  const noShort = build(l, [[9, 31, 12], [28, 10, 33], [14, 29, 11, 30], [13, 27, 9], [32, 12, 26]]);
  ok(`${l}: a 300-word piece without a single short sentence is reported`, keys(l, noShort).includes('c_tails'));
  const sameOpen = build(l, VARIED, { firstWord: word(l) + 'ta' });
  ok(`${l}: every paragraph opening with one word is reported`, keys(l, sameOpen).includes('c_para_opener'));
  const longLead = build(l); longLead[0] = sentence(l, 48, true) + ' ' + longLead[0];
  ok(`${l}: a 48-word opening sentence is reported`, keys(l, longLead).includes('c_lead_long'));
}

// ── phrase probes (the sentences the audit found undetected) ────────────────────────────────────────────────────────
const P: Record<string, Record<RLang, string[]>> = {
  ornamental: {
    en: ['The harbourmaster emphasized that works start in June.', 'The mayor stressed that the budget is fixed.', 'A spokesman highlighted that nobody loses a berth.'],
    de: ['Der Hafenmeister betonte, dass die Arbeiten im Juni beginnen.', 'Der Bürgermeister hob hervor, dass das Budget steht.', 'Ein Sprecher unterstrich, dass niemand einen Liegeplatz verliert.'],
    pl: ['Kapitan portu podkreślił, że prace ruszą w czerwcu.', 'Burmistrz zaznaczył, że budżet jest zamknięty.', 'Rzecznik zwrócił uwagę, że nikt nie straci miejsca.'],
    ro: ['Căpitanul portului a subliniat că lucrările încep în iunie.', 'Primarul a evidențiat că bugetul este stabilit.', 'Un purtător de cuvânt a accentuat că nimeni nu pierde un loc.'],
    ru: ['Начальник порта подчеркнул, что работы начнутся в июне.', 'Мэр акцентировал, что бюджет утверждён.', 'Представитель обратил внимание, что никто не потеряет место.'],
    el: ['Ο λιμενάρχης τόνισε ότι τα έργα ξεκινούν τον Ιούνιο.', 'Ο δήμαρχος υπογράμμισε ότι ο προϋπολογισμός έχει κλειδώσει.', 'Ένας εκπρόσωπος επισήμανε ότι κανείς δεν χάνει θέση.'],
    ar: ['أكد مدير الميناء أن الأعمال تبدأ في يونيو.', 'شدد رئيس البلدية على أن الميزانية محسومة.', 'نوه متحدث بأن أحدا لن يفقد مرساه.'],
  },
  repeat: {
    en: ['“We start in June,” the harbourmaster said. “The budget is fixed,” the harbourmaster said. “Works take a year,” the harbourmaster said. “Nobody loses a berth,” the harbourmaster said.'],
    de: ['„Wir beginnen im Juni“, sagte der Hafenmeister. „Das Budget steht“, sagte der Hafenmeister. „Die Arbeiten dauern ein Jahr“, sagte der Hafenmeister. „Niemand verliert einen Liegeplatz“, sagte der Hafenmeister.'],
    pl: ['„Zaczynamy w czerwcu”, powiedział kapitan portu. „Budżet jest zamknięty”, powiedział kapitan portu. „Prace potrwają rok”, powiedział kapitan portu. „Nikt nie straci miejsca”, powiedział kapitan portu.'],
    ro: ['„Începem în iunie”, a spus căpitanul portului. „Bugetul este stabilit”, a spus căpitanul portului. „Lucrările durează un an”, a spus căpitanul portului. „Nimeni nu pierde un loc”, a spus căpitanul portului.'],
    ru: ['«Начинаем в июне», сказал начальник порта. «Бюджет утверждён», сказал начальник порта. «Работы займут год», сказал начальник порта. «Никто не потеряет место», сказал начальник порта.'],
    el: ['«Ξεκινάμε τον Ιούνιο», είπε ο λιμενάρχης. «Ο προϋπολογισμός έχει κλειδώσει», είπε ο λιμενάρχης. «Τα έργα θα διαρκέσουν έναν χρόνο», είπε ο λιμενάρχης. «Κανείς δεν χάνει θέση», είπε ο λιμενάρχης.'],
    ar: ['«نبدأ في يونيو»، قال مدير الميناء. «الميزانية محسومة»، قال مدير الميناء. «ستستغرق الأعمال عاما»، قال مدير الميناء. «لن يفقد أحد مرساه»، قال مدير الميناء.'],
  },
  mono: {
    en: ['The harbourmaster said works start in June.', 'Berth holders said the fee is too high.', 'The mayor said the budget is fixed.', 'A spokesman said nobody loses a berth.'],
    de: ['Der Hafenmeister sagte, die Arbeiten begännen im Juni.', 'Die Liegeplatzinhaber sagten, die Gebühr sei zu hoch.', 'Der Bürgermeister sagte, das Budget stehe.', 'Ein Sprecher sagte, niemand verliere einen Liegeplatz.'],
    pl: ['Kapitan portu powiedział, że prace ruszą w czerwcu.', 'Posiadacze miejsc powiedzieli, że opłata jest za wysoka.', 'Burmistrz powiedział, że budżet jest zamknięty.', 'Rzecznik powiedział, że nikt nie straci miejsca.'],
    ro: ['Căpitanul portului a spus că lucrările încep în iunie.', 'Deținătorii de locuri au spus că taxa este prea mare.', 'Primarul a spus că bugetul este stabilit.', 'Un purtător de cuvânt a spus că nimeni nu pierde un loc.'],
    ru: ['Начальник порта сказал, что работы начнутся в июне.', 'Владельцы мест сказали, что сбор слишком высок.', 'Мэр сказал, что бюджет утверждён.', 'Представитель сказал, что никто не потеряет место.'],
    el: ['Ο λιμενάρχης είπε ότι τα έργα ξεκινούν τον Ιούνιο.', 'Οι κάτοχοι θέσεων είπαν ότι το τέλος είναι υψηλό.', 'Ο δήμαρχος είπε ότι ο προϋπολογισμός έχει κλειδώσει.', 'Ένας εκπρόσωπος είπε ότι κανείς δεν χάνει θέση.'],
    ar: ['قال مدير الميناء إن الأعمال تبدأ في يونيو.', 'قال أصحاب المراسي إن الرسوم مرتفعة.', 'قال رئيس البلدية إن الميزانية محسومة.', 'قال متحدث إن أحدا لن يفقد مرساه.'],
  },
  nominal: {
    en: ['The council made the decision to approve the plan.', 'The firm carried out an examination of the berths.', 'The minister gave an explanation of the new rules.'],
    de: ['Der Rat traf die Entscheidung, den Plan zu genehmigen.', 'Die Firma führte eine Prüfung der Liegeplätze durch.', 'Der Minister gab eine Erklärung zu den neuen Regeln ab.'],
    pl: ['Rada podjęła decyzję o zatwierdzeniu planu.', 'Firma dokonała kontroli miejsc cumowniczych.', 'Minister złożył wyjaśnienia dotyczące nowych przepisów.'],
    ro: ['Consiliul a luat decizia de a aproba planul.', 'Firma a efectuat o verificare a locurilor.', 'Consiliul a fost în măsură să finalizeze lucrarea.'],
    ru: ['Совет принял решение утвердить план.', 'Компания провела проверку мест.', 'Министр дал объяснение новых правил.'],
    el: ['Το συμβούλιο πήρε την απόφαση να εγκρίνει το σχέδιο.', 'Η εταιρεία πραγματοποίησε έλεγχο των θέσεων.', 'Ο υπουργός έδωσε εξήγηση για τους νέους κανόνες.'],
    ar: ['اتخذ المجلس قرارا بالموافقة على الخطة.', 'أجرت الشركة فحصا للمراسي.', 'قدم الوزير شرحا للقواعد الجديدة.'],
  },
  vague: {
    en: ['Many berth holders raised various concerns, and several officials noted numerous issues.'],
    de: ['Viele Liegeplatzinhaber äußerten verschiedene Bedenken, und mehrere Beamte nannten zahlreiche Probleme.'],
    pl: ['Wielu posiadaczy miejsc zgłosiło różne obawy, a kilku urzędników wskazało liczne problemy.'],
    ro: ['Mulți deținători de locuri au ridicat diverse îngrijorări, iar câțiva oficiali au indicat numeroase probleme.'],
    ru: ['Многие владельцы мест высказали различные опасения, а несколько чиновников указали на многочисленные проблемы.'],
    el: ['Πολλοί κάτοχοι θέσεων εξέφρασαν διάφορες ανησυχίες και αρκετοί αξιωματούχοι επεσήμαναν πολλά προβλήματα.'],
    ar: ['أثار كثير من أصحاب المراسي مخاوف متعددة، وأشار عدة مسؤولين إلى مشكلات عديدة.'],
  },
  firstPerson: {
    en: ['In my view, we should welcome the plan, and our readers deserve clarity.'],
    de: ['Meiner Ansicht nach sollten wir den Plan begrüßen, und unsere Leser verdienen Klarheit.'],
    pl: ['Moim zdaniem powinniśmy powitać plan, a nasi czytelnicy zasługują na jasność.'],
    ro: ['În opinia mea, ar trebui să salutăm planul, iar cititorii noștri merită claritate.'],
    ru: ['На мой взгляд, нам следует приветствовать план, а наши читатели заслуживают ясности.'],
    el: ['Κατά τη γνώμη μου, πρέπει να χαιρετίσουμε το σχέδιο, και οι αναγνώστες μας αξίζουν σαφήνεια.'],
    ar: ['في رأيي، يجب أن نرحب بالخطة، ويستحق قراؤنا الوضوح.'],
  },
};
const dateLeads: Record<RLang, string> = {
  en: 'On 12 March 2027, the council approved the new fee for berth holders.',
  de: 'Am 12. März 2027 hat der Rat die neue Gebühr für Liegeplatzinhaber beschlossen.',
  pl: '12 marca 2027 roku rada zatwierdziła nową opłatę dla posiadaczy miejsc cumowniczych.',
  ro: 'Pe 12 martie 2027, consiliul a aprobat noua taxă pentru deținătorii de locuri.',
  ru: '12 марта 2027 года совет утвердил новый сбор для владельцев мест.',
  el: 'Στις 12 Μαρτίου 2027, το συμβούλιο ενέκρινε το νέο τέλος για τους κατόχους θέσεων.',
  ar: 'في 12 مارس 2027، وافق المجلس على الرسوم الجديدة لأصحاب المراسي.',
};
const spread = (l: RLang, sentences: string[], at = 1): string[] => { const p = build(l); sentences.forEach((s, i) => { p[(at + i) % p.length] += ' ' + s; }); return p; };
for (const l of LANGS) {
  ok(`${l}: ornamental verbs of speech`, keys(l, spread(l, P.ornamental[l])).includes('c_speech_ornament'));
  ok(`${l}: the same verb back to back`, keys(l, spread(l, P.repeat[l], 2)).includes('c_speech_repeat'));
  ok(`${l}: one verb does every attribution`, keys(l, spread(l, P.mono[l])).includes('c_speech_mono'));
  ok(`${l}: verb + noun instead of a live verb`, keys(l, spread(l, P.nominal[l])).includes('c_nominal'));
  ok(`${l}: vague quantity words`, keys(l, spread(l, P.vague[l])).includes('c_vague'));
  ok(`${l}: first person in news`, keys(l, spread(l, P.firstPerson[l])).includes('c_first_person'));
  ok(`${l}: ... but not where first person is allowed`, !keys(l, spread(l, P.firstPerson[l]), { allowFirstPerson: true }).includes('c_first_person'));
  const dl = build(l); dl[0] = dateLeads[l] + ' ' + dl[0];
  ok(`${l}: an opening date`, keys(l, dl).includes('c_date_lead'));
}

// ── what must NOT fire ──────────────────────────────────────────────────────────────────────────────────────────────
{
  const en = build('en');
  const varied = spread('en', ['The harbourmaster said works start in June.', 'Berth holders added that the fee is too high.', 'The mayor explained the budget.', 'A spokesman confirmed that nobody loses a berth.']);
  ok('varied verbs of speech are fine', !keys('en', varied).some((k) => k.startsWith('c_speech')));
  ok('first person inside a quotation is fine', !keys('en', spread('en', ['“We start in June,” the harbourmaster said.'])).includes('c_first_person'));
  const noDate = en.slice(); noDate[0] = 'In Limassol the council approved the new fee for berth holders on Monday. ' + noDate[0];
  ok('a place first is not a date lead', !keys('en', noDate).includes('c_date_lead'));
  const num = en.slice(); num[0] = '1500 homes were sold in Larnaca last year, the register shows. ' + num[0];
  ok('a number first is not a date lead', !keys('en', num).includes('c_date_lead'));
  const monday = en.slice(); monday[0] = 'On Monday the council approved the new fee. ' + monday[0];
  ok('a weekday first is a date lead', keys('en', monday).includes('c_date_lead'));
  const dateLow = craftTells({ paragraphs: monday, lang: 'en', dateLeadLow: true }).find((t) => t.key === 'c_date_lead');
  eq('event listings: an opening date is only a low remark', dateLow?.severity, 'low');
  const yr = en.slice(); yr[0] = 'In 2027 the fee rises to 90 euros. ' + yr[0];
  ok('"In <year>" first is a date lead', keys('en', yr).includes('c_date_lead'));
  const lead35 = en.slice(); lead35[0] = sentence('en', 35, true) + ' ' + lead35[0];
  ok('a 35-word opening sentence is within the limit', !keys('en', lead35).includes('c_lead_long'));
  const noted = spread('en', ['The noted architect designed the pier.']);
  ok('"noted" as an adjective is not an ornamental verb', !keys('en', noted).includes('c_speech_ornament'));
  ok('"noted that" is', keys('en', spread('en', ['The mayor noted that the budget is fixed.'])).includes('c_speech_ornament'));
  ok('three vague words in a long piece are tolerated', !keys('en', spread('en', ['Many people came.', 'Several left.'])).includes('c_vague'));
  const short = ['The mayor said the fee rises to 90 euros on 1 March.', 'Berth holders said they will appeal.'];
  eq('a very short text is not judged', craftTells({ paragraphs: short, lang: 'en' }), []);
}
// the existing human reporting fixtures: no medium tells when the writer may use "I"; the diary-style ones are flagged as news
for (const l of LANGS) {
  const fx = (FIXTURES as Record<string, { human: string[] }>)[l].human;
  for (let i = 0; i < fx.length; i++) {
    const paras = fx[i].split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    eq(`${l}: human fixture ${i} raises no medium tell where "I" is allowed`, craftTells({ paragraphs: paras, lang: l, allowFirstPerson: true }).filter((t) => t.severity !== 'low').map((t) => t.key), []);
  }
}
ok('en: the diary-style human fixture IS first person (house rule: not in news)', craftTells({ paragraphs: (FIXTURES as Record<string, { human: string[] }>).en.human[1].split(/\n\s*\n/), lang: 'en' }).some((t) => t.key === 'c_first_person'));

// ── the phrase additions ────────────────────────────────────────────────────────────────────────────────────────────
const hit = (l: RLang, text: string, key: string) => phraseHits(text, l).some((h) => h.key === key);
ok('ar: “من ناحية … ومن ناحية أخرى” is the false balance', hit('ar', 'من ناحية، يرحب الملاك بالوضوح. ومن ناحية أخرى، يخشى المستأجرون ارتفاع التكاليف.', 'j_ar_balance'));
ok('ar: “من جانب … من جانب آخر” too', hit('ar', 'من جانب تدعم الحكومة الخطة وتعتبرها ضرورية للقطاع. ومن جانب آخر يرفضها المعارضون بشدة.', 'j_ar_balance'));
ok('el: “Πρώτον … Δεύτερον …” is enumeration scaffolding', hit('el', 'Πρώτον, το τέλος αυξάνεται. Δεύτερον, οι θέσεις μειώνονται. Τέλος, αλλάζουν οι κανόνες.', 'j_el_enum'));
ok('el: one “Πρώτον” alone is tolerated', !hit('el', 'Πρώτον, το τέλος αυξάνεται και κανείς δεν διαμαρτυρήθηκε για αυτό.', 'j_el_enum'));

// ── Romanian gerund tails ───────────────────────────────────────────────────────────────────────────────────────────
{
  const ro = spread('ro', ['Taxa crește la 90 de euro, subliniind presiunea asupra deținătorilor de locuri.', 'Lucrările încep în iunie, evidențiind urgența planului.', 'Bugetul ajunge la patru milioane de euro, reflectând amploarea proiectului.']);
  ok('ro: trailing gerund clauses', keys('ro', ro).includes('c_ro_gerund'));
  ok('ro: one is tolerated', !keys('ro', spread('ro', ['Taxa crește la 90 de euro, subliniind presiunea asupra deținătorilor de locuri.'])).includes('c_ro_gerund'));
}
// ── specificity ─────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const bare = Array.from({ length: 6 }, () => 'the council talked about the plan for a long time and then the people there agreed that it was a good thing for everybody who lives near the harbour and uses it every day of the week');
  ok('paragraphs without a name, figure or quotation are reported', craftTells({ paragraphs: bare, lang: 'en' }).some((t) => t.key === 'c_specificity'));
  const named = bare.map((p, i) => (i % 3 ? p + ' while Maria Ioannou kept the books' : p));
  ok('...unless most of them carry one', !craftTells({ paragraphs: named, lang: 'en' }).some((t) => t.key === 'c_specificity'));
}
report('journalism-craft');
