// The formulaic-language lists of the editorial standard: every category fires in every language, clean prose does not, and the
// edge function's matcher agrees with the voice engine's detectors.
import { phraseSpecs, headlineSpec, phraseHits, isFormulaicHeadline, foldFor, PHRASE_LANGS, type PhraseLang } from '@/lib/journalism/phrases';
import { dataTells, titleTells, tellCompileErrors } from '@/lib/voice/tells';
import { eq, ok, report } from './_harness';

interface Sample { generic: string; connectives: [string, string]; transitions: [string, string, string]; hype: [string, string]; lead: string; closer: string; meta: string; balance: string; headline: string; cleanTitle: string; clean: string }
const S: Record<PhraseLang, Sample> = {
  en: {
    generic: 'Against this backdrop, the council approved the plan.', connectives: ['', ''],
    transitions: ['However, the fee rose.', 'Moreover, the queue grew.', 'Meanwhile, the office closed.'],
    hype: ['The shocking decision cut the grant.', 'An unprecedented number of people applied.'],
    lead: 'In recent years the village lost a third of its pupils.', closer: 'The coming weeks will show whether the deal holds.',
    meta: 'This article explores the new tax rules.', balance: 'On the one hand the fee falls to 90 euros, on the other hand the queue grows.',
    headline: 'Larnaca terminal opens: what you need to know', cleanTitle: 'Larnaca airport opens second terminal',
    clean: 'The council approved a budget of 4.2 million euros on Tuesday. Two bus lines start on 1 March.',
  },
  de: {
    generic: 'Die Regel ist von großer Bedeutung für 4.000 Mieter.', connectives: ['Im Zuge dessen verlängerte die Stadt die Frist.', 'Vor diesem Hintergrund stimmte der Rat zu.'],
    transitions: ['Jedoch stieg die Gebühr.', 'Außerdem wuchs die Schlange.', 'Zudem schloss das Amt.'],
    hype: ['Die schockierende Entscheidung kürzte den Zuschuss.', 'Ein beispielloser Andrang folgte.'],
    lead: 'In den letzten Jahren verlor das Dorf ein Drittel seiner Schüler.', closer: 'Die kommenden Wochen werden zeigen, ob die Einigung hält.',
    meta: 'In diesem Artikel werden wir die neuen Steuerregeln betrachten.', balance: 'Einerseits sinkt die Gebühr auf 90 Euro, andererseits wächst die Schlange.',
    headline: 'Neues Terminal in Larnaka: Was Sie wissen müssen', cleanTitle: 'Flughafen Larnaka eröffnet zweites Terminal',
    clean: 'Der Stadtrat billigte am Dienstag einen Haushalt von 4,2 Millionen Euro. Zwei Buslinien fahren ab dem 1. März.',
  },
  ro: {
    generic: 'Fără îndoială, taxa a crescut la 90 de euro.', connectives: ['În acest context, primăria a prelungit termenul.', 'În acest sens, consiliul a votat.'],
    transitions: ['Totuși, taxa a crescut.', 'În plus, coada s-a lungit.', 'Între timp, biroul s-a închis.'],
    hype: ['Decizia șocantă a redus subvenția.', 'Un număr fără precedent de oameni a aplicat.'],
    lead: 'În ultimii ani, satul a pierdut o treime din elevi.', closer: 'Următoarele săptămâni vor arăta dacă acordul rezistă.',
    meta: 'În acest articol vom analiza noile reguli fiscale.', balance: 'Pe de o parte taxa scade la 90 de euro, pe de altă parte coada crește.',
    headline: 'Terminal nou la Larnaca: ce trebuie să știți', cleanTitle: 'Aeroportul Larnaca deschide al doilea terminal',
    clean: 'Consiliul a aprobat marți un buget de 4,2 milioane de euro. Două linii de autobuz încep la 1 martie.',
  },
  pl: {
    generic: 'Bez wątpienia opłata wzrosła do 90 euro.', connectives: ['W tym kontekście urząd przedłużył termin.', 'W związku z tym rada zagłosowała.'],
    transitions: ['Jednak opłata wzrosła.', 'Ponadto kolejka się wydłużyła.', 'Tymczasem urząd się zamknął.'],
    hype: ['Szokująca decyzja obcięła dotację.', 'Bezprecedensowa liczba osób złożyła wniosek.'],
    lead: 'W ostatnich latach wieś straciła jedną trzecią uczniów.', closer: 'Najbliższe tygodnie pokażą, czy umowa wytrzyma.',
    meta: 'W tym artykule przeanalizujemy nowe przepisy podatkowe.', balance: 'Z jednej strony opłata spada do 90 euro, z drugiej strony kolejka rośnie.',
    headline: 'Nowy terminal w Larnace: co musisz wiedzieć', cleanTitle: 'Lotnisko w Larnace otwiera drugi terminal',
    clean: 'Rada zatwierdziła we wtorek budżet w wysokości 4,2 mln euro. Dwie linie autobusowe ruszają 1 marca.',
  },
  ru: {
    generic: 'Не вызывает сомнений, что пошлина выросла до 90 евро.', connectives: ['В данном контексте мэрия продлила срок.', 'В свете этого совет проголосовал.'],
    transitions: ['Однако пошлина выросла.', 'Кроме того, очередь удлинилась.', 'Между тем офис закрылся.'],
    hype: ['Шокирующее решение сократило субсидию.', 'Беспрецедентное число людей подало заявки.'],
    lead: 'В последние годы село потеряло треть учеников.', closer: 'Ближайшие недели покажут, выдержит ли соглашение.',
    meta: 'В этой статье мы рассмотрим новые налоговые правила.', balance: 'С одной стороны, пошлина падает до 90 евро, с другой стороны, очередь растёт.',
    headline: 'Новый терминал в Ларнаке: что нужно знать', cleanTitle: 'Аэропорт Ларнаки открывает второй терминал',
    clean: 'Городской совет утвердил во вторник бюджет в 4,2 миллиона евро. Два автобусных маршрута начнут работу с 1 марта.',
  },
  ar: {
    generic: 'تجدر الإشارة إلى أن الرسوم ارتفعت إلى 90 يورو.', connectives: ['في هذا السياق مدد المجلس المهلة.', 'وعلى صعيد آخر افتتح المتحف أبوابه.'],
    transitions: ['ومع ذلك ارتفعت الرسوم.', 'علاوة على ذلك طال الطابور.', 'في الوقت نفسه أغلق المكتب.'],
    hype: ['القرار الصادم خفض الدعم.', 'وتقدم عدد غير مسبوق من الناس بطلبات.'],
    lead: 'في السنوات الأخيرة فقدت القرية ثلث تلاميذها.', closer: 'ستكشف الأسابيع المقبلة ما إذا كان الاتفاق سيصمد.',
    meta: 'في هذا المقال سنتناول القواعد الضريبية الجديدة.', balance: 'من جهة تنخفض الرسوم إلى 90 يورو، ومن جهة أخرى يطول الطابور.',
    headline: 'محطة جديدة في لارنكا: ما تحتاج إلى معرفته', cleanTitle: 'مطار لارنكا يفتتح المحطة الثانية',
    clean: 'وافق المجلس البلدي يوم الثلاثاء على ميزانية قدرها 4.2 مليون يورو. سيبدأ خطان للحافلات العمل في الأول من آذار.',
  },
  el: {
    generic: 'Δεν υπάρχει αμφιβολία ότι το τέλος αυξήθηκε στα 90 ευρώ.', connectives: ['Σε αυτό το πλαίσιο ο δήμος παρέτεινε την προθεσμία.', 'Υπό το πρίσμα αυτό το συμβούλιο ψήφισε.'],
    transitions: ['Ωστόσο το τέλος αυξήθηκε.', 'Επιπλέον η ουρά μεγάλωσε.', 'Εν τω μεταξύ το γραφείο έκλεισε.'],
    hype: ['Η συγκλονιστική απόφαση περιέκοψε τη χορηγία.', 'Ένας άνευ προηγουμένου αριθμός ατόμων υπέβαλε αίτηση.'],
    lead: 'Τα τελευταία χρόνια το χωριό έχασε το ένα τρίτο των μαθητών του.', closer: 'Οι επόμενες εβδομάδες θα δείξουν αν η συμφωνία θα αντέξει.',
    meta: 'Σε αυτό το άρθρο θα εξετάσουμε τους νέους φορολογικούς κανόνες.', balance: 'Αφενός το τέλος πέφτει στα 90 ευρώ, αφετέρου η ουρά μεγαλώνει.',
    headline: 'Νέο τερματικό στη Λάρνακα: Όσα πρέπει να γνωρίζετε', cleanTitle: 'Το αεροδρόμιο της Λάρνακας ανοίγει δεύτερο τερματικό',
    clean: 'Το δημοτικό συμβούλιο ενέκρινε την Τρίτη προϋπολογισμό 4,2 εκατ. ευρώ. Δύο λεωφορειακές γραμμές ξεκινούν την 1η Μαρτίου.',
  },
};

for (const lang of PHRASE_LANGS) {
  const s = S[lang];
  const mine = (text: string) => dataTells(text, lang).filter((t) => t.key.startsWith('j_')).map((t) => t.key);
  const has = (text: string, cat: string) => mine(text).includes(`j_${lang}_${cat}`);
  const para = (...x: string[]) => x.join('\n\n');

  eq(`${lang}: every phrase detector compiles`, tellCompileErrors(lang), []);
  eq(`${lang}: the phrase categories exist as detectors`, phraseSpecs(lang).map((p) => p.key.replace(`j_${lang}_`, '')).sort(), ['balance', 'closer', 'generic', 'hype', 'lead', 'meta', 'transitions', ...(lang === 'en' ? [] : ['connectives']), ...(lang === 'el' ? ['enum'] : [])].sort());

  ok(`${lang}: stock phrase is found`, has(s.generic, 'generic'));
  if (lang !== 'en') {
    ok(`${lang}: one reflex connective is fine`, !has(s.connectives[0], 'connectives'));
    ok(`${lang}: two are a habit`, has(`${s.connectives[0]} ${s.connectives[1]}`, 'connectives'));
  }
  ok(`${lang}: two transition openers are fine`, !has(`${s.transitions[0]} ${s.transitions[1]}`, 'transitions'));
  ok(`${lang}: three are a habit`, has(s.transitions.join(' '), 'transitions'));
  ok(`${lang}: one hype word is fine`, !has(s.hype[0], 'hype'));
  ok(`${lang}: two hype words are not`, has(`${s.hype[0]} ${s.hype[1]}`, 'hype'));
  ok(`${lang}: weak opener at the start of a paragraph`, has(para(s.lead, s.clean), 'lead'));
  ok(`${lang}: the same words inside a paragraph are not an opener`, !has(`${s.clean} ${s.lead}`, 'lead'));
  ok(`${lang}: forced conclusion`, has(para(s.clean, s.closer), 'closer'));
  ok(`${lang}: text about itself`, has(s.meta, 'meta'));
  ok(`${lang}: mechanical balance`, has(s.balance, 'balance'));
  eq(`${lang}: clean prose triggers none`, mine(para(s.clean, s.clean)), []);

  ok(`${lang}: formulaic headline (voice engine)`, titleTells(s.headline, lang).length === 1);
  ok(`${lang}: formulaic headline (edge matcher)`, isFormulaicHeadline(s.headline, lang));
  ok(`${lang}: a plain headline is fine`, titleTells(s.cleanTitle, lang).length === 0 && !isFormulaicHeadline(s.cleanTitle, lang));

  // The edge function uses phraseHits; it must agree with the voice engine on the same text.
  const texts = [s.generic, `${s.connectives[0]} ${s.connectives[1]}`, s.transitions.join(' '), `${s.hype[0]} ${s.hype[1]}`, para(s.lead, s.clean), para(s.clean, s.closer), s.meta, s.balance, para(s.clean, s.clean)];
  const same = texts.every((t) => JSON.stringify(phraseHits(t, lang).map((h) => h.key).sort()) === JSON.stringify(mine(t).sort()));
  ok(`${lang}: edge matcher and voice engine agree`, same);
}

// folding keeps the accents-insensitive match for Greek and the diacritics-insensitive match for Arabic
ok('Greek accents do not matter', phraseHits('Σε αυτο το πλαισιο ο δήμος αποφάσισε. Σε αυτό το πλαίσιο ψήφισε το συμβούλιο.', 'el').some((h) => h.key === 'j_el_connectives'));
ok('Arabic diacritics and alef variants do not matter', phraseHits('فِي هَذَا السِّيَاق قرر المجلس. في هذا السياق صوّت الأعضاء.', 'ar').some((h) => h.key === 'j_ar_connectives'));
eq('fold removes Greek tonos', foldFor('el', 'Ωστόσο'), 'Ωστοσο');
eq('headline spec exists for every language', PHRASE_LANGS.every((l) => headlineSpec(l).alts.length >= 7), true);

// the English single words the discussion lists as "overused" are not flagged when they stand alone in honest news
eq('one "However" in a news text is not a tell', dataTells('The fee rose. However, the queue shrank. The office reopened on 3 March.', 'en').filter((t) => t.key.startsWith('j_')).length, 0);
eq('"visit Cyprus in spring" is not a lead formula', dataTells('Visit Cyprus in spring for the almond blossom.', 'en').filter((t) => t.key.startsWith('j_')).length, 0);
report('journalism-phrases');
