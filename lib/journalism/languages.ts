// lib/journalism/languages.ts — the seven language desks of the editorial standard. Pure data + small builders (no imports, no I/O).
// Shared by the Next app and, copied in by scripts/build-edge-journalism.mjs, by the Supabase edge function.
//
//   NATIVE_RULES   what a native journalist in this language does and never does (speech verbs, banned packaging words, typography)
//   TITLE_CRAFT    how a headline is made in this language
//   LANGUAGE_STANDARD   the standard's requirements for the language (register, priorities, the stock phrases to avoid)
//   TYPOGRAPHY     quotation marks, numbers, currency and dates as the press of that language writes them
//   GLOSSARY       the established forms of the places and institutions a Cyprus magazine names all the time
// languageNotes(lang) joins them into one block for a writer's prompt.
export type Lang = 'en' | 'el' | 'ro' | 'ar' | 'de' | 'pl' | 'ru';
export const LANGS: Lang[] = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
export const LANG_NAME: Record<Lang, string> = { en: 'English', el: 'Greek', ro: 'Romanian', ar: 'Arabic', de: 'German', pl: 'Polish', ru: 'Russian' };

// ── per-language native composition rules (the quality core; unchanged wording from the scraped-article desk) ──────────────
export const NATIVE_RULES: Record<Lang, string> = {
  en: `NATIVE ENGLISH — the AI tells to avoid:
- NO trailing participial closers (", ...-ing ..." tacked on a sentence end). Strongest AI fingerprint in news copy: write two sentences with real subjects and finite verbs. At most one in the whole article.
- NO summary closer ("is part of a broader effort", "represents a significant shift", "reflects a commitment to"). End on a concrete fact.
- NO booster adverbs on plain facts ("successfully completed", "significantly improved").
- BANNED VOCABULARY: delve, landscape, robust, comprehensive, leverage, harness, seamless, foster, streamline, empower, spearhead, underscore, pivotal, tapestry, beacon, nestled, vibrant, thriving, boasts, showcases, game-changer, paradigm, ecosystem, synergy, holistic. Never smuggle a variant back ("delves into", "harnessing").
- SPEECH VERBS, only for people who speak inside the story: said, confirmed, announced, added, explained, warned. Banned as ornament: emphasized, highlighted, underscored, stressed. NEVER "according to", "reported by" or "told [a publication]", and never name an outlet, agency or report: the facts are our own reporting.
- English news prose is short and direct. "The mayor blocked the permit" beats the passive. Avoid stacking prepositional phrases on the sentence tail.`,
  el: `NATIVE GREEK (γράψε ΑΠΕΥΘΕΙΑΣ στα ελληνικά, όχι μετάφραση) — think in Greek from the first word:
- No calques from English structure. Use natural Greek journalistic syntax and word order.
- Speech verbs, only for people who speak inside the story: «δήλωσε», «είπε», «ανέφερε». NEVER «σύμφωνα με», «όπως μετέδωσε/αναφέρει/γράφει» and never an outlet, agency or report as the origin of a fact. BANNED as AI tics: «τόνισε», «υπογράμμισε», «επεσήμανε» used repeatedly. Never the same verb twice in a row.
- BANNED packaging words (all inflections): «καθοριστικός/κομβικός ρόλος», «αποτελεί απόδειξη», «ένα ευρύ φάσμα», «στη σύγχρονη εποχή», «σηματοδοτεί», «ολιστικός». Replace with the concrete term or the number.
- Sentence-case headlines (only first word + proper nouns capitalised). Correct monotonic accents (τόνοι) throughout. Numerals with the euro sign (€). No Latin em/en dashes — use commas or full stops.
- Read it aloud in your head: if it sounds like English dressed in Greek words, rewrite it. Greek press has its own rhythm.`,
  ro: `NATIVE ROMANIAN (scrie DIRECT în română, nu traducere) — gândești în română de la primul cuvânt:
- Fără calchii din engleză: "stă ca un testament" → "dovedește"; "peisajul politic" → "scena politică"; "a naviga complexitățile" → "a gestiona"; "în era digitală" → "astăzi".
- Verbe de vorbire, doar pentru persoanele care vorbesc în poveste: "a declarat", "a spus", "a transmis", "a precizat". NICIODATĂ "potrivit", "conform" (ca sursă), "relatează" și niciun nume de publicație, agenție sau raport ca origine a unui fapt. INTERZIS ca tic AI: "a subliniat", "a evidențiat", "a accentuat", "a ținut să menționeze". Niciodată același verb de două ori la rând.
- Cuvinte-ambalaj INTERZISE (toate formele): crucial, esențial, vital, semnificativ, remarcabil, considerabil, rezilient, paradigmă, ecosistem, sinergie. Folosește adjectivul precis sau cifra.
- "Pe măsură ce" maximum o dată. "Acest/Această/Aceste" ca început de propoziție maximum de două ori.
- Diacritice corecte peste tot (ă, â, î, ș, ț). Numerale: "12 milioane de euro", "47 de contracte". Titluri în sentence case. Fără em/en dash — folosește virgule sau puncte.
- Citește fraza cu voce tale în minte: dacă sună a "engleză îmbrăcată în cuvinte românești", rescrie-o.`,
  ar:
    `NATIVE ARABIC — modern standard Arabic (اكتب مباشرةً بالعربية الفصحى، وليست ترجمة) for a right-to-left edition:
- Think in Arabic from the first word; do not mirror English clause order. Use natural MSA journalistic syntax.
- Speech verbs, only for people who speak inside the story: «قال»، «صرّح»، «أوضح». NEVER «وفقًا لـ»، «بحسب تقرير/صحيفة/موقع»، «نقلًا عن» and never an outlet, agency or report as the origin of a fact. Avoid the repetitive AI tic of «أكّد»/«شدّد» on every attribution. Never the same verb twice in a row.
- BANNED AI packaging: «شهادة على»، «نسيج غني من»، «حجر الزاوية»، «في عالم سريع التغير»، «تجربة سلسة»، «الغوص في». Replace with the concrete word or the figure.
- Keep proper nouns and figures exact; render numbers clearly (٪ or %, €). Correct hamza and taa marbuta. NO Latin em/en dashes — use the Arabic comma (،) or a full stop.
- Read it in your head: if it reads like English rendered word-for-word into Arabic, rewrite it into natural press Arabic.`,
  de: `NATIVE GERMAN (schreibe DIREKT auf Deutsch, keine Übersetzung) — denke von Anfang an auf Deutsch:
- Keine Anglizismus-Lehnübersetzungen, kein englischer Satzbau. Nutze natürliche deutsche Pressesprache und Wortstellung; das Verb steht, wo es hingehört.
- Sprechverben, nur für Personen, die in der Geschichte sprechen: „sagte", „erklärte", „teilte mit", „bestätigte", „kündigte an". NIE „laut …", „… zufolge", „nach Angaben", „wie … berichtet" und nie ein Medium, eine Agentur oder ein Bericht als Herkunft einer Tatsache. VERBOTEN als KI-Tick: „betonte", „unterstrich", „hob hervor" in jedem Satz. Nie zweimal dasselbe Verb hintereinander.
- VERBOTENE Verpackungswörter: „spielt eine entscheidende Rolle", „ist ein Zeugnis für", „im Herzen von", „eine breite Palette von", „nahtlos", „ganzheitlich", „wegweisend", „Ökosystem". Nimm das konkrete Wort oder die Zahl.
- Überschriften folgen normaler deutscher Groß-/Kleinschreibung (Substantive groß), aber KEIN englisches Title Case. Zahlen mit dem Euro-Zeichen (€), deutsche Anführungszeichen („…"). KEINE Geviert-/Halbgeviertstriche — Kommas oder Punkte.
- Lies es innerlich laut: klingt es wie „Englisch in deutschen Wörtern", schreib es um. Deutsche Presse hat ihren eigenen Rhythmus.`,
  pl: `NATIVE POLISH (pisz BEZPOŚREDNIO po polsku, nie tłumacz) — myśl po polsku od pierwszego słowa:
- Bez kalek z angielskiego i bez angielskiej składni. Naturalny polski szyk zdania i styl prasowy.
- Czasowniki mowy, tylko dla osób, które mówią w tekście: „powiedział", „oświadczył", „przekazał", „potwierdził", „zapowiedział". NIGDY „według …", „jak podaje …", „jak informuje …" ani żadnego medium, agencji czy raportu jako źródła faktu. ZAKAZANE jako tik AI: „podkreślił", „zaznaczył", „zwrócił uwagę" w każdym zdaniu. Nigdy tego samego czasownika dwa razy z rzędu.
- ZAKAZANE słowa-opakowania (wszystkie formy): „odgrywa kluczową rolę", „stanowi świadectwo", „w sercu", „szeroki wachlarz", „bezproblemowy", „holistyczny", „ekosystem". Użyj konkretnego słowa lub liczby.
- Tytuły zapisuj normalną polską pisownią (bez Wielkich Liter W Każdym Słowie). Liczby z symbolem euro (€), polskie cudzysłowy („…"). Bez myślników em/en — przecinki lub kropki. Poprawne znaki: ą, ć, ę, ł, ń, ó, ś, ź, ż.
- Przeczytaj w myślach na głos: jeśli brzmi jak „angielski ubrany w polskie słowa", napisz to od nowa.`,
  ru: `NATIVE RUSSIAN (пиши СРАЗУ по-русски, не перевод) — думай по-русски с первого слова:
- Без калек с английского и без английского синтаксиса. Естественный русский порядок слов и газетный стиль.
- Глаголы речи, только для людей, которые говорят внутри истории: «сказал», «заявил», «подтвердил», «объявил». НИКОГДА «по данным», «по информации», «согласно», «как сообщает» и никакого издания, агентства или отчёта как источника факта. ЗАПРЕЩЕНО как ИИ-тик: «подчеркнул», «отметил», «акцентировал» в каждом предложении. Никогда один и тот же глагол дважды подряд.
- ЗАПРЕЩЁННЫЕ слова-обёртки (во всех формах): «играет ключевую роль», «является свидетельством», «в самом сердце», «широкий спектр», «бесшовный», «холистический», «экосистема». Бери конкретное слово или цифру.
- Заголовки — обычной строчной записью (без Заглавных Букв В Каждом Слове). Числа со знаком евро (€), русские кавычки-«ёлочки». Тире используй по правилам русского языка; букву «ё» ставь там, где она нужна.
- Прочитай про себя вслух: если звучит как «английский в русских словах», перепиши. У русской прессы свой ритм.`,
};

export const TITLE_CRAFT: Record<Lang, string> = {
  en:
    `TITLE (English): sentence case, never shouting; cut any "amid/as/ahead of" tail — the title is the news, not its backdrop; leave one thing for the article (the why, the consequence); kill the narrator voice (who wins, who loses, what breaks); alive verbs (cuts, blocks, defies, wins, opens, buys) not dead ones (announces, discusses, explores); no editorialising adjectives. Under 90 characters.`,
  el:
    `TITLE (Greek): sentence case, μόνο η πρώτη λέξη και τα κύρια ονόματα με κεφαλαίο· χωρίς "εν μέσω"/"καθώς" ουρά· ένα δυνατό ρήμα, όχι ουδέτερο ("ανακοινώνει")· χωρίς επίθετα γνώμης. Κάτω από 90 χαρακτήρες.`,
  ro:
    `TITLU (română): sentence case; taie coada "pe fondul/în contextul"; un verb puternic (taie, blochează, refuză), nu unul slab (anunță, discută); fără adjective de opinie; lasă un singur lucru pentru articol. Sub 90 de caractere.`,
  ar:
    `العنوان (بالعربية): جملة واضحة، دون ذيل "وسط/بينما"؛ فعل قوي لا محايد؛ دون صفات رأي؛ اترك شيئًا واحدًا للمقال. أقل من 90 حرفًا.`,
  de:
    `TITEL (Deutsch): normale deutsche Schreibung, kein englisches Title Case, kein Geschrei; schneide das „inmitten/während/vor"-Anhängsel ab — die Schlagzeile ist die Nachricht; ein starkes Verb (kürzt, blockiert, gewinnt, eröffnet), kein schwaches (kündigt an, erörtert); keine Meinungsadjektive. Unter 90 Zeichen.`,
  pl:
    `TYTUŁ (polski): normalna pisownia, bez Title Case, bez krzyku; utnij ogon „w obliczu/podczas gdy"; mocny czasownik (tnie, blokuje, wygrywa, otwiera), nie słaby (ogłasza, omawia); bez przymiotników oceniających. Poniżej 90 znaków.`,
  ru:
    `ЗАГОЛОВОК (русский): обычная запись, без Заглавных Букв В Каждом Слове, без крика; убери хвост «на фоне/в то время как»; сильный глагол (режет, блокирует, выигрывает, открывает), а не слабый (объявляет, обсуждает); без оценочных прилагательных. До 90 символов.`,
};

// ── what the editorial standard asks of each language ───────────────────────────────────────────────────────────────────
export const LANGUAGE_STANDARD: Record<Lang, string> = {
  en: `STANDARD (English): contemporary professional international English. Clarity, precision, economy, natural rhythm, strong verbs, specific nouns, restrained adjectives. Active constructions where natural; no bureaucratic language, no excessive nominalisation. Broadly understandable English, not regional slang; do not automatically Americanise terminology.
STOCK PHRASES that carry no information, to be rewritten into the plain fact unless the story truly needs them: "in today's rapidly changing world", "it is important to note that", "this highlights the importance of", "a complex and multifaceted issue", "at the end of the day", "in conclusion", "it is worth mentioning", "this raises important questions", "against this backdrop", "in an increasingly … world", "the implications are far-reaching", "a crucial role", "a significant impact", "a testament to", "as we navigate …", "it remains to be seen", "there is no doubt that", "amid growing concerns", "at a time when".
USE ONLY WHEN THEY ADD MEANING: however, meanwhile, moreover, furthermore, significant, important, key, crucial.`,
  de: `STANDARD (Deutsch): zeitgemäßes, professionelles Standarddeutsch, wie in seriösem deutschsprachigem Journalismus. Präzision, Klarheit, natürliche Satzmelodie, konkrete Substantive, aktive Verben, kontrollierte Satzlänge. Kein Behördendeutsch, keine überzogene Nominalisierung, keine künstlich verschachtelten Komposita, keine unnötigen Anglizismen; englische Wendungen nicht wörtlich übertragen, wo die deutsche Presse anders formuliert. Deutsche Anführungszeichen und Zeichensetzung.
NICHT ZUR GEWOHNHEIT MACHEN (nur wenn wirklich passend): „im Zuge dessen", „in diesem Zusammenhang", „vor diesem Hintergrund", „es bleibt abzuwarten", „eine entscheidende Rolle", „von großer Bedeutung", „nicht zuletzt". Das Deutsche darf nie wie übersetztes Englisch klingen.`,
  ro: `STANDARD (română): română standard contemporană, potrivită presei profesioniste. Trebuie să sune firesc românesc, nu tradus din engleză, germană sau rusă. Sintaxă naturală, vocabular precis, registru jurnalistic potrivit, atribuire clară, ritm firesc. Fără calchieri din engleză, fără limbaj birocratic, fără formulări generice repetate, fără complicare artificială a vocabularului. Terminologie jurnalistică românească consacrată pentru politică, guvernare, economie, drept, diplomație și afaceri internaționale. Nu înlocui expresii naturale doar pentru variație lexicală. Diacritice corecte (ă, â, î, ș, ț cu virgulă) și punctuație românească.`,
  pl: `STANDARD (polski): współczesna polszczyzna standardowa, odpowiednia dla profesjonalnego dziennikarstwa. Tekst brzmi jak napisany przez polskiego dziennikarza, nie jak tłumaczenie z angielskiego. Naturalna składnia, idiomatyczność, precyzja gramatyczna, poprawna odmiana, naturalny szyk zdania, właściwy rejestr. Bez angielskich wzorców składniowych, zbędnej nominalizacji, przesadnego formalizmu i powtarzalnych łączników; bez wymuszonej wymiany synonimów. Poprawne znaki diakrytyczne; nazwiska i instytucje odmieniaj naturalnie tam, gdzie to właściwe; ustalona polska terminologia polityczna, prawna, gospodarcza i międzynarodowa.`,
  ru: `STANDARD (русский): современный литературный русский для профессиональной журналистики; текст должен звучать по-русски, а не как перевод с английского. Точная лексика, естественный синтаксис, правильные вид и время, естественный порядок слов, управляемый ритм, деловой журналистский регистр. Без канцелярита и излишне официального языка, если этого не требует источник; без советской бюрократической прозы; без искусственной «литературности». Не злоупотребляй словами «важный», «значительный», «ключевой», «следует отметить», «на сегодняшний день»: только когда они оправданы. Русская пунктуация.`,
  ar: `STANDARD (العربية): العربية الفصحى المعاصرة للصحافة المهنية. يجب أن يُقرأ النص كأنه كُتب بالعربية أصلاً، لا كجملة إنجليزية منقولة. الوضوح والدقة والمفردات الصحفية المعاصرة وبنية الجملة العربية الطبيعية واستخدام الأفعال المناسب وفقرات متماسكة. لا عربية كلاسيكية أو قديمة ما لم يُطلب ذلك، ولا زخرفة بلاغية، ولا ترجمة حرفية للتعابير الإنجليزية، ولا لهجة عامية في النص الرسمي. قلّل من «من المهم الإشارة إلى»، «في هذا السياق»، «على صعيد آخر»، «لا شك أن»، «في ظل»، «يشكل خطوة مهمة»: فقط حين تضيف معنى. علامات الترقيم العربية (، ؛ ؟) والمصطلحات العربية الراسخة في السياسة والاقتصاد والقانون والدبلوماسية.`,
  el: `STANDARD (ελληνικά): σύγχρονα κοινά ελληνικά για επαγγελματική δημοσιογραφία· το κείμενο πρέπει να ακούγεται ελληνικό, όχι μετάφραση από τα αγγλικά. Φυσική σύνταξη, σωστή μορφολογία, κατάλληλο λεξιλόγιο, φυσικός ρυθμός, σύγχρονο δημοσιογραφικό ύφος. Χωρίς κατά λέξη αγγλικές δομές, χωρίς περιττές επίσημες ή αρχαΐζουσες εκφράσεις (όχι καθαρεύουσα). Απόφυγε τα «είναι σημαντικό να σημειωθεί», «σε αυτό το πλαίσιο», «αξίζει να σημειωθεί», «διαδραματίζει σημαντικό ρόλο», «παραμένει να φανεί»: μόνο όταν είναι πράγματι απαραίτητα. Σωστοί τόνοι και στίξη (το ερωτηματικό είναι το «;»), καθιερωμένη ελληνική ορολογία για πολιτική, νομικά, οικονομικά και διεθνή θέματα.`,
};

/** The dash rule of the house, per language: a dash is never a pause mark, except in Russian, whose punctuation requires the dash (тире). */
export const dashRule = (lang: Lang): string => (lang === 'ru'
  ? 'dashes only where Russian punctuation requires them (тире), never as a pause mark in place of a comma'
  : 'no em or en dashes');

export const TYPOGRAPHY: Record<Lang, string> = {
  en: 'Typography (English): curly double quotation marks “…”; numbers 1,200 and 4.5%; currency €4.2 million; dates written out, 12 September 2026; British spelling; no em or en dashes.',
  de: 'Typografie (Deutsch): Anführungszeichen „…“; Zahlen 1.200 und 4,5 %; 4,2 Millionen Euro; Datum 12. September 2026; Substantive groß; keine Geviert- oder Halbgeviertstriche.',
  ro: 'Tipografie (română): ghilimele „…”; numere 1.200 și 4,5 %; 4,2 milioane de euro; data 12 septembrie 2026; fără linii em/en.',
  pl: 'Typografia (polski): cudzysłów „…”; liczby 1200 lub 1 200 i 4,5 proc.; 4,2 mln euro; data 12 września 2026; bez pauz em/en.',
  ru: 'Типографика (русский): кавычки «…»; числа 1 200 и 4,5 %; 4,2 млн евро; дата 12 сентября 2026 года; тире по правилам русского языка, не как знак препинания вместо запятой.',
  ar: 'الطباعة (العربية): علامات اقتباس «…»؛ أرقام غربية (0–9) وعلامة اليورو €؛ الفاصلة العربية ، والفاصلة المنقوطة ؛ وعلامة الاستفهام ؟؛ التاريخ: 12 سبتمبر 2026؛ دون شرطات لاتينية.',
  el: 'Τυπογραφία (ελληνικά): εισαγωγικά «…»· αριθμοί 1.200 και 4,5%· 4,2 εκατ. ευρώ· ημερομηνία 12 Σεπτεμβρίου 2026· ερωτηματικό «;»· χωρίς λατινικές παύλες.',
};

// ── established forms of what a Cyprus magazine names all the time ──────────────────────────────────────────────────────
// [en, de, ro, pl, ru, ar, el]. Only forms that are standard in the press of that language; a missing entry means "keep the official name".
const GLOSSARY_ROWS: [string, string, string, string, string, string, string][] = [
  ['Cyprus', 'Zypern', 'Cipru', 'Cypr', 'Кипр', 'قبرص', 'Κύπρος'],
  ['Republic of Cyprus', 'Republik Zypern', 'Republica Cipru', 'Republika Cypryjska', 'Республика Кипр', 'جمهورية قبرص', 'Κυπριακή Δημοκρατία'],
  ['Nicosia', 'Nikosia', 'Nicosia', 'Nikozja', 'Никосия', 'نيقوسيا', 'Λευκωσία'],
  ['Limassol', 'Limassol', 'Limassol', 'Limassol', 'Лимасол', 'ليماسول', 'Λεμεσός'],
  ['Larnaca', 'Larnaka', 'Larnaca', 'Larnaka', 'Ларнака', 'لارنكا', 'Λάρνακα'],
  ['Paphos', 'Paphos', 'Paphos', 'Pafos', 'Пафос', 'بافوس', 'Πάφος'],
  ['Famagusta', 'Famagusta', 'Famagusta', 'Famagusta', 'Фамагуста', 'فاماغوستا', 'Αμμόχωστος'],
  ['Kyrenia', 'Kyrenia', 'Kyrenia', 'Kyrenia', 'Кирения', 'كيرينيا', 'Κερύνεια'],
  ['Ayia Napa', 'Ayia Napa', 'Ayia Napa', 'Ajia Napa', 'Айя-Напа', 'آيا نابا', 'Αγία Νάπα'],
  ['Protaras', 'Protaras', 'Protaras', 'Protaras', 'Протарас', 'بروتاراس', 'Πρωταράς'],
  ['Troodos', 'Troodos', 'Troodos', 'Troodos', 'Троодос', 'تروودوس', 'Τρόοδος'],
  ['Akamas', 'Akamas', 'Akamas', 'Akamas', 'Акамас', 'أكاماس', 'Ακάμας'],
  ['Kourion', 'Kourion', 'Kourion', 'Kurion', 'Курион', 'كوريون', 'Κούριο'],
  ['Kykkos Monastery', 'Kloster Kykkos', 'Mănăstirea Kykkos', 'Klasztor Kykkos', 'монастырь Киккос', 'دير كيكو', 'Μονή Κύκκου'],
  ["Aphrodite's Rock (Petra tou Romiou)", 'Aphroditefelsen (Petra tou Romiou)', 'Stânca Afroditei (Petra tou Romiou)', 'Skała Afrodyty (Petra tou Romiou)', 'Скала Афродиты (Петра-ту-Ромиу)', 'صخرة أفروديت (بيترا تو روميو)', 'Πέτρα του Ρωμιού'],
  ['House of Representatives', 'Repräsentantenhaus', 'Camera Reprezentanților', 'Izba Reprezentantów', 'Палата представителей', 'مجلس النواب', 'Βουλή των Αντιπροσώπων'],
  ['Council of Ministers', 'Ministerrat', 'Consiliul de Miniștri', 'Rada Ministrów', 'Совет министров', 'مجلس الوزراء', 'Υπουργικό Συμβούλιο'],
  ['Central Bank of Cyprus', 'Zentralbank von Zypern', 'Banca Centrală a Ciprului', 'Centralny Bank Cypru', 'Центральный банк Кипра', 'البنك المركزي القبرصي', 'Κεντρική Τράπεζα της Κύπρου'],
  ['Cyprus Stock Exchange (CSE)', 'Zyprische Börse (CSE)', 'Bursa de Valori din Cipru (CSE)', 'Giełda Papierów Wartościowych na Cyprze (CSE)', 'Кипрская фондовая биржа (CSE)', 'بورصة قبرص (CSE)', 'Χρηματιστήριο Αξιών Κύπρου (ΧΑΚ)'],
  ['Ministry of Finance', 'Finanzministerium', 'Ministerul Finanțelor', 'Ministerstwo Finansów', 'Министерство финансов', 'وزارة المالية', 'Υπουργείο Οικονομικών'],
  ['Attorney General', 'Generalstaatsanwalt', 'Procurorul General', 'Prokurator Generalny', 'Генеральный прокурор', 'النائب العام', 'Γενικός Εισαγγελέας'],
  ['General Healthcare System (GESY)', 'Allgemeines Gesundheitssystem (GESY)', 'Sistemul General de Sănătate (GESY)', 'Powszechny System Opieki Zdrowotnej (GESY)', 'Общая система здравоохранения (ГЕСИ)', 'نظام الرعاية الصحية العام (غيسي)', 'Γενικό Σύστημα Υγείας (ΓεΣΥ)'],
];
const GLOSSARY_COL: Record<Lang, number> = { en: 0, de: 1, ro: 2, pl: 3, ru: 4, ar: 5, el: 6 };
export const GLOSSARY: Record<Lang, Record<string, string>> = Object.fromEntries(
  LANGS.map((l) => [l, Object.fromEntries(GLOSSARY_ROWS.map((r) => [r[0], r[GLOSSARY_COL[l]]]))]),
) as Record<Lang, Record<string, string>>;

/** "ESTABLISHED FORMS" lines for one language (English entries are the reference and need no list). */
export function glossaryBlock(lang: Lang): string {
  if (lang === 'en') return '';
  const col = GLOSSARY_COL[lang];
  const lines = GLOSSARY_ROWS.map((r) => `${r[0]} = ${r[col]}`);
  return `ESTABLISHED FORMS in ${LANG_NAME[lang]} (use these, do not invent others; an unlisted name keeps its official or transliterated form):\n${lines.join('; ')}.`;
}

/** Everything a writer needs to know about one language, in one block. */
export function languageNotes(lang: Lang): string {
  return [NATIVE_RULES[lang], LANGUAGE_STANDARD[lang], TYPOGRAPHY[lang], glossaryBlock(lang)].filter(Boolean).join('\n\n');
}
