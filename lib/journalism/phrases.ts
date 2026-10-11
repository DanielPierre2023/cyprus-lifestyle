// lib/journalism/phrases.ts — the formulaic-language lists of the editorial standard, in all seven languages. Pure data + a tiny
// matcher (no imports), shared by the voice engine (lib/voice/tells.ts turns the specs into detectors) and, copied in by
// scripts/build-edge-journalism.mjs, by the Supabase edge function's own quality check.
//
// WHY it exists: the standard asks for specific, information-dense journalism and names the stock phrases that carry no
// information ("against this backdrop", "im Zuge dessen", "σε αυτό το πλαίσιο", "في هذا السياق" …), the weak openers, the forced
// conclusions, the writing about the article itself, the false "on the one hand / on the other" balance, the hype adjectives,
// the connectives used by reflex and the headline formulas ("what you need to know"). Phrases that mean nothing are cut; these
// lists let the machine find them in every edition, not only the English one.
//
// A spec has the same shape as lib/voice/types.ts TellSpec (key, label, severity, kind, alts, min):
//   kind "word"  the alternative must stand as a whole word/phrase;     kind "start"  at the start of a paragraph;
//   kind "raw"   the alternative carries its own boundaries (lookbehinds, gaps).
// `min` is how many hits are needed before the tell fires (1 when absent): connectives and hype words are fine once, a habit
// when repeated. Nothing here is a "humaniser": it only finds language that says nothing; it never asks for mistakes or tricks.

export type PhraseLang = 'en' | 'el' | 'ro' | 'ar' | 'de' | 'pl' | 'ru';
export interface PhraseSpec { key: string; label: string; severity: 'high' | 'medium' | 'low'; kind: 'word' | 'start' | 'raw'; alts: string[]; min?: number }
export const PHRASE_LANGS: PhraseLang[] = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];

// A sentence starts at the beginning of the text, after . ! ? … ؟ (and closing quotes/brackets) plus a space, or on a new line.
const SS = String.raw`(?<=(?:^|[.!?…؟]["'”»)]*\s+|\n\s*))`;
const NB = String.raw`(?![\p{L}\p{M}\p{N}])`;
const sentenceStart = (words: string) => `${SS}(?:${words})${NB}`;

interface Lists {
  generic: string[];       // stock phrases that say nothing (one is enough)
  connectives: string[];   // reflex connectives that are fine once and a habit twice
  transitions: string[];   // sentence-initial transition words (a habit from three on)
  hype: string[];          // hype words (two or more)
  leads: string[];         // weak openers at the start of a paragraph
  closers: string[];       // forced conclusions
  meta: string[];          // the article talking about itself
  balance: string[];       // mechanical "on the one hand / on the other"
  headlines: string[];     // formulaic headlines (matched on titles only)
  enumerations?: string[]; // "firstly / secondly" scaffolding (only where the voice data has no detector for it yet)
}

const L: Record<PhraseLang, Lists> = {
  en: {
    generic: [
      String.raw`(?:this|that|which) raises (?:\p{L}+ )?questions`, String.raw`raises (?:important|serious|many|further|new|fresh|fundamental|difficult) questions`,
      String.raw`against this backdrop`,
      String.raw`in an increasingly (?:\p{L}+ ){0,2}(?:world|landscape|environment|era|market|economy|society)`,
      String.raw`(?:the )?implications (?:are|remain) far-reaching`,
      String.raw`far-reaching (?:implications|consequences)`,
      String.raw`(?:a|an) (?:significant|profound|substantial|major) (?:impact|effect|influence) (?:on|upon)`,
      String.raw`there is no doubt that`,
      String.raw`at a time when`,
      String.raw`in today[’']s (?:rapidly )?(?:changing|evolving|fast-paced|digital|interconnected) (?:world|landscape|era)`,
    ],
    connectives: [],
    transitions: [sentenceStart(String.raw`however|furthermore|moreover|meanwhile|nevertheless|nonetheless|therefore|consequently|in addition|additionally|as a result`)],
    hype: [String.raw`shocking(?:ly)?|unprecedented|devastating(?:ly)?|dramatic(?:ally)?|extraordinary|remarkabl[ey]|crucial(?:ly)?|staggering(?:ly)?|stunning(?:ly)?|massive(?:ly)?`],
    leads: [
      String.raw`in a world (?:where|of|that)`, String.raw`for many people`, String.raw`in recent years`, String.raw`throughout history`,
      String.raw`at a time when`, String.raw`in today[’']s (?:world|society|age|era)`, String.raw`over the (?:past|last) (?:few )?(?:years|decades)`, String.raw`when it comes to`,
    ],
    closers: [
      String.raw`the coming (?:weeks|months|days) will (?:show|tell|reveal)`, String.raw`only time will (?:tell|show)`,
      String.raw`the road ahead (?:remains|is) (?:uncertain|long|unclear)`, String.raw`the (?:story|saga) is far from over`, String.raw`one thing is (?:certain|clear)`,
    ],
    meta: [
      String.raw`in this (?:article|piece|report|guide),? we (?:will|shall|are going to)`,
      String.raw`this (?:article|piece|report|guide|overview|analysis) (?:will )?(?:explores?|examines?|looks at|takes a (?:closer )?look|delves?|aims to)`,
      String.raw`as we(?:’|')?ve seen|as we have seen`, String.raw`as (?:mentioned|noted|discussed) (?:above|earlier|before)`,
      String.raw`to (?:better|fully) understand`, String.raw`the following (?:analysis|overview|section|paragraphs)`, String.raw`this comprehensive (?:overview|guide|look|analysis)`,
      String.raw`let(?:’|')?s (?:take|dive|look|explore|unpack)`,
    ],
    balance: [String.raw`on the one hand[\s\S]{5,400}?on the other(?: hand)?`],
    headlines: [
      String.raw`(?:what|everything) (?:you|we) (?:need|should|must) (?:to )?know`, String.raw`a new era`, String.raw`what (?:comes|happens) next`, String.raw`the bigger picture`,
      String.raw`why (?:this|it) matters`, String.raw`the real story behind`, String.raw`the (?:surprising|shocking|untold|hidden|startling) truth (?:about|behind)`, String.raw`here[’']s (?:what|why|how)`, String.raw`you won[’']t believe`,
    ],
  },
  de: {
    generic: [
      String.raw`von (?:großer|grosser|zentraler|entscheidender|enormer) Bedeutung`, String.raw`es besteht (?:kein|keinerlei) Zweifel`, String.raw`ohne (?:jeden |jeglichen )?Zweifel`,
      String.raw`in einer zunehmend (?:\p{L}+ ){0,2}Welt`, String.raw`in der heutigen (?:schnelllebigen |modernen |digitalen )?Welt`, String.raw`wirft (?:wichtige |viele |neue |weitere )?Fragen auf`,
      String.raw`(?:die )?Auswirkungen sind weitreichend`, String.raw`ein komplexes und vielschichtiges (?:Thema|Problem|Unterfangen)`, String.raw`die Frage bleibt,? ob`,
    ],
    connectives: [String.raw`im Zuge dessen`, String.raw`in diesem Zusammenhang`, String.raw`vor diesem Hintergrund`, String.raw`nicht zuletzt`, String.raw`in diesem Sinne`, String.raw`diesbezüglich`, String.raw`wie bereits erwähnt`, String.raw`an dieser Stelle`],
    transitions: [sentenceStart(String.raw`jedoch|allerdings|darüber hinaus|außerdem|ausserdem|zudem|dennoch|folglich|somit|gleichzeitig|zugleich|infolgedessen|nichtsdestotrotz|überdies`)],
    hype: [String.raw`schockierend\p{L}*|beispiellos\p{L}*|verheerend\p{L}*|dramatisch\p{L}*|außergewöhnlich\p{L}*|bemerkenswert\p{L}*|atemberaubend\p{L}*|gewaltig\p{L}*|spektakulär\p{L}*`],
    leads: [String.raw`in einer Welt,? in der`, String.raw`für viele Menschen`, String.raw`in den (?:letzten|vergangenen) Jahren`, String.raw`im Laufe der Geschichte`, String.raw`seit jeher`, String.raw`in einer Zeit,? in der`, String.raw`in der heutigen`, String.raw`wenn es um [^.\n]{3,40} geht`],
    closers: [String.raw`die kommenden (?:Wochen|Monate|Tage) werden (?:es )?zeigen`, String.raw`nur die Zeit wird (?:es )?zeigen`, String.raw`die Zukunft wird (?:es )?zeigen`, String.raw`der Weg (?:nach vorn|in die Zukunft|vor uns) (?:bleibt|ist) (?:ungewiss|offen|unklar)`, String.raw`eines ist (?:sicher|klar)`],
    meta: [
      String.raw`in diesem (?:Artikel|Beitrag|Text) (?:werden wir|wollen wir|geht es|beleuchten wir|schauen wir)`, String.raw`dieser (?:Artikel|Beitrag|Text) (?:beleuchtet|untersucht|erklärt|befasst sich)`,
      String.raw`wie wir (?:bereits )?gesehen haben`, String.raw`um (?:besser|genauer) zu verstehen`, String.raw`die folgende (?:Analyse|Übersicht)`, String.raw`dieser umfassende (?:Überblick|Leitfaden)`, String.raw`werfen wir einen (?:genaueren )?Blick`,
    ],
    balance: [String.raw`einerseits[\s\S]{5,400}?andererseits`],
    headlines: [
      String.raw`was Sie (?:[\p{L}\p{N}-]+ ){0,6}wissen (?:müssen|sollten)`, String.raw`alles,? was Sie (?:[\p{L}\p{N}-]+ ){0,6}wissen (?:müssen|sollten)`, String.raw`das müssen Sie wissen`, String.raw`eine neue Ära`, String.raw`was (?:als Nächstes|als nächstes|jetzt|danach) kommt`,
      String.raw`das große Ganze`, String.raw`warum (?:das|dies|es) (?:so )?wichtig ist`, String.raw`die (?:wahre|ganze|echte) Geschichte hinter`, String.raw`die (?:überraschende|schockierende|ungeschminkte) Wahrheit (?:über|hinter)`,
    ],
  },
  ro: {
    generic: [
      String.raw`în (?:lumea|epoca) (?:de astăzi|noastră|actuală)`, String.raw`este important de (?:menționat|reținut|subliniat)`, String.raw`trebuie (?:menționat|subliniat|remarcat) că`,
      String.raw`un subiect complex și (?:multifațetat|cu multiple fațete)`, String.raw`nu încape (?:nicio )?îndoială`, String.raw`fără (?:nicio )?îndoială`, String.raw`ridică (?:întrebări|semne de întrebare) (?:importante|serioase)`,
      String.raw`implicațiile sunt (?:de amploare|majore|profunde)`,
    ],
    connectives: [String.raw`în acest context`, String.raw`în acest sens`, String.raw`având în vedere acest lucru`, String.raw`pe acest fond`, String.raw`în contextul actual`],
    transitions: [sentenceStart(String.raw`totuși|cu toate acestea|în plus|de asemenea|mai mult decât atât|prin urmare|în consecință|între timp|pe de altă parte|în același timp|în schimb`)],
    hype: [String.raw`șocant\p{L}*|fără precedent|devastator\p{L}*|dramatic\p{L}*|extraordinar\p{L}*|remarcabil\p{L}*|crucial\p{L}*|uluitor\p{L}*|copleșitor\p{L}*`],
    leads: [String.raw`într-o lume în care`, String.raw`pentru mulți oameni`, String.raw`în ultimii ani`, String.raw`de-a lungul istoriei`, String.raw`într-o perioadă în care`, String.raw`în zilele noastre`, String.raw`în era (?:digitală|modernă)`],
    closers: [String.raw`următoarele (?:săptămâni|luni|zile) vor (?:arăta|decide)`, String.raw`doar timpul va (?:arăta|spune)`, String.raw`viitorul (?:va )?(?:arăta|spune)`, String.raw`drumul (?:care urmează|din față) rămâne (?:incert|necunoscut)`, String.raw`un lucru este (?:sigur|clar)`],
    meta: [
      String.raw`în acest articol,? vom`, String.raw`acest (?:articol|material) (?:explorează|analizează|examinează|prezintă)`, String.raw`după cum am (?:văzut|menționat)`, String.raw`pentru a înțelege (?:mai bine)?`,
      String.raw`următoarea analiză`, String.raw`această (?:prezentare|privire) (?:completă|de ansamblu)`, String.raw`să aruncăm o privire`,
    ],
    balance: [String.raw`pe de o parte[\s\S]{5,400}?pe de altă parte`],
    headlines: [
      String.raw`ce trebuie să (?:știți|știi|afli)`, String.raw`tot ce trebuie să (?:știți|știi|afli)`, String.raw`o nouă eră`, String.raw`ce urmează`, String.raw`imaginea de ansamblu`, String.raw`de ce (?:contează|este important)`,
      String.raw`adevărata poveste din spatele`, String.raw`adevărul (?:surprinzător|șocant) despre`,
    ],
  },
  pl: {
    generic: [
      String.raw`w dzisiejszym (?:szybko zmieniającym się )?świecie`, String.raw`warto (?:zauważyć|podkreślić|dodać|zwrócić uwagę)`, String.raw`należy (?:zauważyć|podkreślić),? że`,
      String.raw`złożon\p{L}+ i wielowymiarow\p{L}+`, String.raw`nie ulega (?:żadnej )?wątpliwości`, String.raw`bez (?:cienia )?wątpienia`, String.raw`rodzi (?:ważne |poważne )?pytania`,
    ],
    connectives: [String.raw`w tym kontekście`, String.raw`w związku z tym`, String.raw`w świetle (?:powyższego|tego)`, String.raw`w tym zakresie`, String.raw`na tym tle`],
    transitions: [sentenceStart(String.raw`jednak|ponadto|co więcej|tymczasem|niemniej jednak|dodatkowo|w rezultacie|natomiast|jednocześnie|z drugiej strony`)],
    hype: [String.raw`szokując\p{L}*|bezprecedensow\p{L}*|druzgoc\p{L}*|dramatyczn\p{L}*|niezwykł\p{L}*|przełomow\p{L}*|kluczow\p{L}*|spektakularn\p{L}*|imponując\p{L}*`],
    leads: [String.raw`w świecie,? w którym`, String.raw`dla wielu osób`, String.raw`w ostatnich latach`, String.raw`na przestrzeni dziejów`, String.raw`w czasach,? gdy`, String.raw`w dzisiejszych czasach`],
    closers: [String.raw`najbliższe (?:tygodnie|miesiące|dni) pokażą`, String.raw`czas pokaże`, String.raw`droga (?:przed nami|naprzód) pozostaje (?:niepewna|otwarta)`, String.raw`jedno jest (?:pewne|jasne)`],
    meta: [
      String.raw`w tym artykule`, String.raw`artykuł (?:omawia|analizuje|przybliża|bada)`, String.raw`jak (?:już )?widzieliśmy`, String.raw`aby (?:lepiej )?zrozumieć`,
      String.raw`poniższa analiza`, String.raw`ten kompleksowy przegląd`, String.raw`przyjrzyjmy się`,
    ],
    balance: [String.raw`z jednej strony[\s\S]{5,400}?z drugiej strony`],
    headlines: [
      String.raw`co musisz wiedzieć`, String.raw`wszystko,? co musisz wiedzieć`, String.raw`nowa era`, String.raw`co dalej`, String.raw`szerszy obraz`, String.raw`dlaczego to (?:ma znaczenie|jest ważne)`,
      String.raw`prawdziwa historia`, String.raw`(?:zaskakując\p{L}+|szokując\p{L}+) prawda o`,
    ],
  },
  ru: {
    generic: [
      String.raw`в современном (?:быстро меняющемся )?мире`, String.raw`необходимо (?:отметить|подчеркнуть)`, String.raw`стоит (?:отметить|подчеркнуть)`, String.raw`не вызывает сомнений`, String.raw`нет никаких сомнений`,
      String.raw`вызывает (?:важные |серьёзные |серьезные )?вопросы`, String.raw`сложн\p{L}+ и многогранн\p{L}+`,
    ],
    connectives: [String.raw`в данном контексте`, String.raw`в этом контексте`, String.raw`в свете (?:этого|вышесказанного)`, String.raw`в этой связи`, String.raw`на этом фоне`],
    transitions: [sentenceStart(String.raw`однако|кроме того|более того|между тем|тем не менее|следовательно|таким образом|помимо этого|в то же время|в свою очередь`)],
    hype: [String.raw`шокирующ\p{L}*|беспрецедентн\p{L}*|разрушительн\p{L}*|драматичн\p{L}*|драматическ\p{L}*|экстраординарн\p{L}*|выдающ\p{L}*|значительн\p{L}*|ключев\p{L}*|колоссальн\p{L}*`],
    leads: [String.raw`в мире,? где`, String.raw`для многих людей`, String.raw`в последние годы`, String.raw`на протяжении (?:всей )?истории`, String.raw`в наше время`, String.raw`в эпоху`],
    closers: [String.raw`ближайшие (?:недели|месяцы|дни) покажут`, String.raw`время покажет`, String.raw`путь впереди остаётся неопределённым`, String.raw`одно ясно`, String.raw`остаётся только ждать`],
    meta: [
      String.raw`в этой статье (?:мы )?(?:рассмотрим|расскажем|разберём|разберем)`, String.raw`эта статья (?:рассматривает|исследует|анализирует)`, String.raw`как мы (?:уже )?видели`, String.raw`чтобы (?:лучше )?понять`,
      String.raw`следующий анализ`, String.raw`этот всеобъемлющий обзор`, String.raw`давайте (?:рассмотрим|разберёмся|разберемся|взглянем)`,
    ],
    balance: [String.raw`с одной стороны[\s\S]{5,400}?с другой стороны`],
    headlines: [
      String.raw`что (?:нужно|надо) знать`, String.raw`всё,? что (?:нужно|надо) знать`, String.raw`новая эра`, String.raw`что (?:будет )?дальше`, String.raw`общая картина`, String.raw`почему это важно`,
      String.raw`настоящая история`, String.raw`(?:удивительная|шокирующая) правда о`,
    ],
  },
  ar: {
    generic: [
      String.raw`في عالم (?:سريع التغير|متغير|اليوم)`, String.raw`يثير (?:العديد من )?(?:التساؤلات|الأسئلة)`, String.raw`لا يمكن إنكار`, String.raw`ومن الجدير بالذكر|من الجدير بالذكر`, String.raw`تجدر الإشارة إلى`,
      String.raw`يلعب دور[اً]? (?:محوري[اً]?|مهم[اً]?|رئيسي[اً]?)`, String.raw`(?:موضوع|قضية) (?:معقد|معقدة) ومتعدد(?:ة)? الأبعاد`,
    ],
    connectives: [String.raw`في هذا السياق`, String.raw`على صعيد آخر`, String.raw`في ظل`, String.raw`في هذا الإطار`, String.raw`في هذا الصدد`],
    transitions: [sentenceStart(String.raw`ومع ذلك|علاوة على ذلك|بالإضافة إلى ذلك|في الوقت نفسه|وبالتالي|من ناحية أخرى|فضلا عن ذلك|إضافة إلى ذلك|لذلك`)],
    hype: [String.raw`صادم\p{L}*|غير مسبوق\p{L}*|مدمر\p{L}*|دراماتيكي\p{L}*|استثنائي\p{L}*|ملحوظ\p{L}*|حاسم\p{L}*|هائل\p{L}*`],
    leads: [String.raw`في عالم`, String.raw`بالنسبة للكثيرين`, String.raw`في السنوات الأخيرة`, String.raw`على مر التاريخ`, String.raw`في عصرنا`],
    closers: [String.raw`ستكشف (?:الأسابيع|الأشهر|الأيام) (?:المقبلة|القادمة)`, String.raw`الوقت وحده (?:كفيل|سيكشف)`, String.raw`سيكشف المستقبل`, String.raw`الطريق (?:أمامنا|المقبل) (?:لا يزال|ما زال) (?:غير واضح|غامض[اً]?)`],
    meta: [
      String.raw`في هذا (?:المقال|التقرير) (?:سنتناول|سوف نتناول|سنستعرض)`, String.raw`يتناول هذا (?:المقال|التقرير)`, String.raw`كما رأينا`, String.raw`لفهم (?:أفضل|الأمر)`,
      String.raw`التحليل التالي`, String.raw`هذا العرض الشامل`, String.raw`دعونا (?:نلقي|ننظر)`,
    ],
    balance: [String.raw`من (?:جهة|ناحية|جانب)[\s\S]{5,400}?(?:ومن|من) (?:جهة|ناحية|جانب) (?:أخرى|آخر)`],
    headlines: [
      String.raw`ما (?:تحتاج|تحتاجون) (?:إلى )?معرفته`, String.raw`كل ما (?:تحتاج|تحتاجون) (?:إلى )?معرفته`, String.raw`عهد جديد`, String.raw`ماذا بعد`, String.raw`الصورة الأكبر`,
      String.raw`لماذا (?:يهم|يهمنا|هذا مهم)`, String.raw`القصة الحقيقية وراء`, String.raw`الحقيقة (?:المدهشة|الصادمة) (?:حول|عن)`,
    ],
  },
  el: {
    generic: [
      String.raw`σε έναν κόσμο που αλλάζει (?:ραγδαία|γρήγορα)`, String.raw`δεν υπάρχει αμφιβολία ότι`, String.raw`εγείρει (?:σημαντικά |σοβαρά )?ερωτήματα`, String.raw`(?:παραμένει|μένει) να φανεί`,
      String.raw`στην εποχή μας`, String.raw`πολύπλοκο και πολυδιάστατο ζήτημα`,
    ],
    connectives: [String.raw`σε αυτό το πλαίσιο`, String.raw`στο πλαίσιο αυτό`, String.raw`υπό το πρίσμα`, String.raw`σε αυτή την κατεύθυνση`, String.raw`σε αυτό το σημείο`],
    transitions: [sentenceStart(String.raw`ωστόσο|επιπλέον|επίσης|εν τω μεταξύ|παρ[’'ʼ]? ?όλα αυτά|κατά συνέπεια|επιπρόσθετα|συνεπώς|ταυτόχρονα|από την άλλη`)],
    hype: [String.raw`συγκλονιστικ\p{L}*|άνευ προηγουμένου|καταστροφικ\p{L}*|δραματικ\p{L}*|εξαιρετικ\p{L}*|αξιοσημείωτ\p{L}*|κρίσιμ\p{L}*|εντυπωσιακ\p{L}*`],
    leads: [String.raw`σε έναν κόσμο όπου`, String.raw`για πολλούς ανθρώπους`, String.raw`τα τελευταία χρόνια`, String.raw`σε όλη την ιστορία`, String.raw`σε μια εποχή που`, String.raw`στη σημερινή εποχή`, String.raw`στις μέρες μας`],
    closers: [String.raw`οι επόμενες (?:εβδομάδες|μήνες|ημέρες) θα δείξουν`, String.raw`(?:μόνο )?ο χρόνος θα δείξει`, String.raw`ο δρόμος που ακολουθεί παραμένει αβέβαιος`, String.raw`ένα πράγμα είναι σίγουρο`],
    meta: [
      String.raw`σε αυτό το άρθρο`, String.raw`το παρόν άρθρο (?:εξετάζει|διερευνά|αναλύει)`, String.raw`όπως είδαμε`, String.raw`για να κατανοήσουμε (?:καλύτερα)?`,
      String.raw`η ακόλουθη ανάλυση`, String.raw`αυτή η ολοκληρωμένη επισκόπηση`, String.raw`ας ρίξουμε μια ματιά`,
    ],
    balance: [String.raw`αφενός[\s\S]{5,400}?αφετέρου`],
    enumerations: [sentenceStart(String.raw`πρώτον|δεύτερον|τρίτον|τέταρτον|πρώτα απ[’']? ?όλα`)],
    headlines: [
      String.raw`όσα (?:πρέπει|χρειάζεται) να (?:γνωρίζετε|ξέρετε)`, String.raw`τα πάντα (?:που )?(?:πρέπει|χρειάζεται) να (?:γνωρίζετε|ξέρετε)`, String.raw`μια νέα εποχή`, String.raw`τι (?:ακολουθεί|έρχεται μετά)`,
      String.raw`η ευρύτερη εικόνα`, String.raw`γιατί (?:έχει σημασία|είναι σημαντικό)`, String.raw`η πραγματική ιστορία πίσω από`, String.raw`η (?:εκπληκτική|συγκλονιστική) αλήθεια (?:για|πίσω από)`,
    ],
  },
};

const LABEL = {
  generic: 'Stock phrase that carries no information (“against this backdrop”, “this raises important questions”)',
  connectives: 'Connective used by reflex (“in this context”, “vor diesem Hintergrund”)',
  transitions: 'Sentences keep opening with a transition word (“however”, “moreover”)',
  hype: 'Hype words instead of the fact (“shocking”, “unprecedented”, “devastating”)',
  leads: 'Weak opening (“in recent years”, “for many people”, “in a world where”)',
  closers: 'Forced conclusion (“the coming weeks will show”, “only time will tell”)',
  meta: 'The text talks about itself (“this article explores”, “as we have seen”)',
  balance: 'Mechanical “on the one hand … on the other hand”',
  enumerations: 'Enumeration scaffolding (“firstly … secondly …”): let the logic live inside the sentences',
  headlines: 'Formulaic headline (“what you need to know”, “why this matters”)',
} as const;

/** The detectors for one language, as TellSpec-shaped data. Headlines are separate (they apply to titles only). */
export function phraseSpecs(lang: PhraseLang): PhraseSpec[] {
  const l = L[lang] || L.en;
  const out: PhraseSpec[] = [];
  const add = (key: string, label: string, severity: PhraseSpec['severity'], kind: PhraseSpec['kind'], alts: string[], min?: number) => {
    if (alts.length) out.push(min && min > 1 ? { key: `j_${lang}_${key}`, label, severity, kind, alts, min } : { key: `j_${lang}_${key}`, label, severity, kind, alts });
  };
  add('generic', LABEL.generic, 'medium', 'word', l.generic);
  add('connectives', LABEL.connectives, 'medium', 'word', l.connectives, 2);
  add('transitions', LABEL.transitions, 'low', 'raw', l.transitions, 3);
  add('hype', LABEL.hype, 'low', 'word', l.hype, 2);
  add('lead', LABEL.leads, 'medium', 'start', l.leads);
  add('closer', LABEL.closers, 'medium', 'raw', l.closers);
  add('meta', LABEL.meta, 'medium', 'word', l.meta);
  add('balance', LABEL.balance, 'low', 'raw', l.balance);
  add('enum', LABEL.enumerations, 'low', 'raw', l.enumerations || [], 2);
  return out;
}

/** Formulaic-headline detector for titles (one spec, medium). */
export function headlineSpec(lang: PhraseLang): PhraseSpec {
  return { key: `j_${lang}_headline`, label: LABEL.headlines, severity: 'medium', kind: 'word', alts: (L[lang] || L.en).headlines };
}

// ── a self-contained matcher (used by the edge function; the app compiles the specs with lib/voice/tells.ts instead) ────────
const AR_MARKS = /[ً-ٰٟـ]/g;
export function foldFor(lang: PhraseLang, s: string): string {
  if (lang === 'ar') return s.replace(AR_MARKS, '').replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي');
  if (lang === 'el') { let out = ''; for (const ch of s.normalize('NFC')) { const b = ch.normalize('NFD').replace(/[̀-ͯ]/g, ''); out += b.length === ch.length ? b : ch; } return out; }
  if (lang === 'ro') return s.replace(/ş/g, 'ș').replace(/ţ/g, 'ț').replace(/Ş/g, 'Ș').replace(/Ţ/g, 'Ț');
  if (lang === 'ru') return s.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
  return s;
}

const NOT_L = String.raw`\p{L}\p{M}\p{N}`;
export function compilePhrase(spec: PhraseSpec, lang: PhraseLang): RegExp | null {
  try {
    const alts = spec.alts.map((a) => foldFor(lang, a)).join('|');
    if (!alts) return null;
    if (spec.kind === 'raw') return new RegExp(`(?:${alts})`, 'giu');
    if (spec.kind === 'start') return new RegExp(String.raw`(?:^|\n)\s*(?:${alts})(?![${NOT_L}])`, 'giu');
    if (lang === 'ar') return new RegExp(String.raw`(?<![${NOT_L}])[وفبلك]{0,2}(?:ال)?(?:${alts})(?![${NOT_L}])`, 'giu');
    return new RegExp(String.raw`(?<![${NOT_L}])(?:${alts})(?![${NOT_L}])`, 'giu');
  } catch { return null; }
}

export interface PhraseHit { key: string; label: string; severity: PhraseSpec['severity']; count: number; sample: string }
const CACHE = new Map<string, { spec: PhraseSpec; re: RegExp }[]>();
/** Run the language's phrase detectors over plain text (paragraphs separated by blank lines). */
export function phraseHits(plain: string, lang: PhraseLang): PhraseHit[] {
  let list = CACHE.get(lang);
  if (!list) { list = []; for (const spec of phraseSpecs(lang)) { const re = compilePhrase(spec, lang); if (re) list.push({ spec, re }); } CACHE.set(lang, list); }
  const text = foldFor(lang, String(plain || ''));
  const out: PhraseHit[] = [];
  for (const { spec, re } of list) {
    const r = new RegExp(re.source, re.flags);
    const m = text.match(r);
    const count = m ? m.length : 0;
    if (count === 0 || count < (spec.min || 1)) continue;
    out.push({ key: spec.key, label: spec.label, severity: spec.severity, count, sample: (m && m[0] ? m[0] : '').slice(0, 80) });
  }
  return out;
}

/** True when a title is a formulaic headline ("what you need to know", "why this matters" …). */
export function isFormulaicHeadline(title: string, lang: PhraseLang): boolean {
  const re = compilePhrase(headlineSpec(lang), lang);
  return !!re && re.test(foldFor(lang, String(title || '')));
}
