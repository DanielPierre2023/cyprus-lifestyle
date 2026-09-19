// lib/knowledge/qa.i18n.ts
// ============================================================================
// CYPRUS LIFESTYLE — knowledge-base translations (el / ro / ar / de / pl / ru)
// ----------------------------------------------------------------------------
// English is the SOURCE and lives in ./qa.ts. This file carries the other six
// languages for the guide pages and the concierge, so nothing on the localized
// site is ever mixed-language. Machine-assembled from per-language native
// translation passes; euro figures preserved verbatim. Do not hand-edit values
// piecemeal — regenerate from the source + translations if the KB changes.
// ============================================================================
import { QA_INDEX, QA_DOMAINS, type QAItem } from './qa';

export type KBLoc = 'el' | 'ro' | 'ar' | 'de' | 'pl' | 'ru';
export interface DomainTx { title: string; blurb: string; }
export interface IntentTx { q: string; a: string; }

export const DOMAIN_I18N: Record<string, Partial<Record<KBLoc, DomainTx>>> = {
 "plan": {
  "el": {
   "title": "Σχεδιασμός & Άφιξη",
   "blurb": "Τα πρώτα ερωτήματα κάθε ταξιδιού — πότε να έρθετε, πού να μείνετε και πώς να μετακινείστε."
  },
  "ro": {
   "title": "Planificare și sosire",
   "blurb": "Primele întrebări ale oricărei călătorii — când să vii, unde să te cazezi și cum să te deplasezi."
  },
  "ar": {
   "title": "التخطيط والوصول",
   "blurb": "الأسئلة الأولى في أي رحلة: متى تأتي، وأين تقيم، وكيف تتنقّل."
  },
  "de": {
   "title": "Planen & Ankommen",
   "blurb": "Die ersten Fragen jeder Reise – wann Sie kommen, wo Sie sich einquartieren und wie Sie sich fortbewegen."
  },
  "pl": {
   "title": "Planowanie i przyjazd",
   "blurb": "Pierwsze pytania każdej podróży — kiedy przyjechać, gdzie się zatrzymać i jak się poruszać."
  },
  "ru": {
   "title": "Планирование и приезд",
   "blurb": "Первые вопросы любого путешествия — когда приехать, где остановиться и как передвигаться."
  }
 },
 "sea": {
  "el": {
   "title": "Θάλασσα & Φύση",
   "blurb": "Ο λόγος που έρχονται οι περισσότεροι — παραλίες, κατάδυση με αναπνευστήρα, ο Ακάμας και το Τρόοδος."
  },
  "ro": {
   "title": "Mare și natură",
   "blurb": "Motivul pentru care vin cei mai mulți — plaje, snorkeling, Akamas și Troodos."
  },
  "ar": {
   "title": "البحر والطبيعة",
   "blurb": "السبب الذي يجذب معظم الزوّار: الشواطئ والغطس السطحي وأكاماس وترودوس."
  },
  "de": {
   "title": "Meer & Natur",
   "blurb": "Weshalb die meisten kommen – Strände, Schnorcheln, die Akamas-Halbinsel und das Troodos-Gebirge."
  },
  "pl": {
   "title": "Morze i przyroda",
   "blurb": "Powód, dla którego przyjeżdża większość — plaże, snorkeling, Akamas i Troodos."
  },
  "ru": {
   "title": "Море и природа",
   "blurb": "То, ради чего приезжает большинство, — пляжи, снорклинг, Акамас и Троодос."
  }
 },
 "do": {
  "el": {
   "title": "Δραστηριότητες & Εμπειρίες",
   "blurb": "Ό,τι κλείνουν οι επισκέπτες μόλις φτάσουν — η κατηγορία συνεργατών με τη μεγαλύτερη αξία."
  },
  "ro": {
   "title": "Activități și experiențe",
   "blurb": "Ceea ce rezervă oamenii odată ajunși — categoria de conexiuni cu cea mai mare valoare."
  },
  "ar": {
   "title": "الأنشطة والتجارب",
   "blurb": "ما يحجزه الناس فور وصولهم؛ أعلى فئات الربط قيمةً."
  },
  "de": {
   "title": "Aktivitäten & Erlebnisse",
   "blurb": "Was die Gäste nach der Ankunft buchen – die Vermittlungskategorie mit dem höchsten Wert."
  },
  "pl": {
   "title": "Atrakcje i doświadczenia",
   "blurb": "To, co ludzie rezerwują już na miejscu — kategoria łącznika o najwyższej wartości."
  },
  "ru": {
   "title": "Активности и впечатления",
   "blurb": "То, что бронируют по приезде, — самая ценная партнёрская категория."
  }
 },
 "villages": {
  "el": {
   "title": "Χωριά, Πολιτισμός & Πίστη",
   "blurb": "Η ψυχή του νησιού και το στοιχείο που μας ξεχωρίζει περισσότερο από το τυποποιημένο περιεχόμενο για παραλίες."
  },
  "ro": {
   "title": "Sate, cultură și credință",
   "blurb": "Sufletul insulei și cel mai important element care ne diferențiază de conținutul generic despre plaje."
  },
  "ar": {
   "title": "القرى والثقافة والإيمان",
   "blurb": "روح الجزيرة، وأبرز ما يميّزنا عن المحتوى الشاطئي التقليدي."
  },
  "de": {
   "title": "Dörfer, Kultur & Glaube",
   "blurb": "Die Seele der Insel und unser größtes Unterscheidungsmerkmal gegenüber generischen Strandinhalten."
  },
  "pl": {
   "title": "Wsie, kultura i wiara",
   "blurb": "Dusza wyspy i nasz największy wyróżnik na tle sztampowych treści o plażach."
  },
  "ru": {
   "title": "Деревни, культура и вера",
   "blurb": "Душа острова и наше главное отличие от типового пляжного контента."
  }
 },
 "food": {
  "el": {
   "title": "Φαγητό & Ποτό",
   "blurb": "Περιεχόμενο καθημερινής χρήσης και μια πυκνή κατηγορία συνεργατών — κάθε εστιατόριο, οινοποιείο και παραγωγός είναι δυνητικό μέλος."
  },
  "ro": {
   "title": "Mâncare și băutură",
   "blurb": "Conținut de zi cu zi și o categorie densă de conexiuni — fiecare restaurant, cramă și producător este un potențial membru."
  },
  "ar": {
   "title": "الطعام والشراب",
   "blurb": "محتوى يومي وفئة ربط كثيفة؛ فكل مطعم ومصنع نبيذ ومُنتِج عضو محتمل."
  },
  "de": {
   "title": "Essen & Trinken",
   "blurb": "Inhalte für den täglichen Gebrauch und eine dichte Vermittlungskategorie – jedes Restaurant, jedes Weingut und jeder Produzent ist ein potenzielles Mitglied."
  },
  "pl": {
   "title": "Jedzenie i napoje",
   "blurb": "Treści do codziennego użytku i gęsta kategoria łącznika — każda restauracja, winnica i producent to potencjalny członek."
  },
  "ru": {
   "title": "Еда и напитки",
   "blurb": "Контент на каждый день и насыщенная партнёрская категория — каждый ресторан, винодельня и производитель — потенциальный участник."
  }
 },
 "property": {
  "el": {
   "title": "Ακίνητα & Κατοικία",
   "blurb": "Υψηλής αξίας, υψηλής πρόθεσης, και η πύλη προς τις κατηγορίες συνεργατών του επαγγελματικού και τεχνικού κλάδου."
  },
  "ro": {
   "title": "Proprietăți și locuință",
   "blurb": "Valoare mare, intenție ridicată și poarta de acces către categoriile de conexiuni profesionale și meșteșugărești."
  },
  "ar": {
   "title": "العقارات والمنزل",
   "blurb": "قيمة عالية ونيّة شرائية واضحة، وبوابة إلى فئات الربط المهنية والحرفية."
  },
  "de": {
   "title": "Immobilien & Zuhause",
   "blurb": "Hochwertig, mit klarer Kaufabsicht und das Tor zu den Vermittlungskategorien für Fachleute und Handwerk."
  },
  "pl": {
   "title": "Nieruchomości i dom",
   "blurb": "Wysoka wartość, wysoka intencja zakupowa i brama do kategorii łączników z branży usług profesjonalnych i rzemiosła."
  },
  "ru": {
   "title": "Недвижимость и дом",
   "blurb": "Высокая ценность, высокая заинтересованность и вход в партнёрские категории специалистов и мастеров."
  }
 },
 "services": {
  "el": {
   "title": "Καθημερινές Υπηρεσίες & Οδηγοί",
   "blurb": "Η μηχανή του «βρες μου κάποιον να…» — η πιο επαναλαμβανόμενη αξία συνεργάτη. Οι τιμές ποικίλλουν, γι' αυτό η συμβουλή μας είναι πάντα: ζητήστε δύο ή τρεις προσφορές."
  },
  "ro": {
   "title": "Servicii de zi cu zi și ghiduri practice",
   "blurb": "Motorul de tip „găsește-mi pe cineva care să…” — valoarea de conexiune cea mai des repetabilă. Prețurile variază, așa că sfatul nostru este mereu același: cere două-trei oferte."
  },
  "ar": {
   "title": "الخدمات اليومية وطريقة إنجازها",
   "blurb": "محرّك «جِد لي من...»؛ قيمة الربط الأكثر تكراراً. تتفاوت الأسعار، لذا نصيحتنا دائماً: احصل على عرضَي سعر أو ثلاثة."
  },
  "de": {
   "title": "Alltägliche Dienstleistungen & Ratgeber",
   "blurb": "Der Motor für „Finden Sie mir jemanden, der …“ – der am häufigsten wiederkehrende Vermittlungswert. Die Preise schwanken, daher lautet unser Rat stets: holen Sie zwei bis drei Angebote ein."
  },
  "pl": {
   "title": "Usługi na co dzień i poradniki",
   "blurb": "Silnik „znajdź mi kogoś, kto…” — najbardziej powtarzalna wartość łącznika. Ceny bywają różne, więc nasza rada brzmi zawsze: weź dwie–trzy wyceny."
  },
  "ru": {
   "title": "Повседневные услуги и практические советы",
   "blurb": "Движок в духе «найдите мне того, кто…» — самая воспроизводимая партнёрская ценность. Цены разнятся, поэтому наш совет всегда один: возьмите два-три предложения."
  }
 },
 "living": {
  "el": {
   "title": "Μετακόμιση & Διαμονή",
   "blurb": "Η ραχοκοκαλιά της μετεγκατάστασης — άδεια διαμονής, φορολογία, υγειονομική περίθαλψη, σχολεία, τραπεζικά. Εκεί όπου οι πολύγλωσσες αγορές μας μετατρέπονται σε κατοίκους."
  },
  "ro": {
   "title": "Mutare și trai",
   "blurb": "Coloana vertebrală a relocării — rezidență, impozite, sănătate, școli, servicii bancare. Locul unde piețele noastre multilingve se transformă în rezidenți."
  },
  "ar": {
   "title": "الانتقال والإقامة",
   "blurb": "العمود الفقري للانتقال: الإقامة والضرائب والرعاية الصحية والمدارس والخدمات المصرفية. هنا تتحوّل أسواقنا متعددة اللغات إلى مقيمين."
  },
  "de": {
   "title": "Umziehen & Leben",
   "blurb": "Das Rückgrat der Umsiedlung – Aufenthalt, Steuern, Gesundheitsversorgung, Schulen, Bankwesen. Hier werden unsere mehrsprachigen Märkte zu Einwohnern."
  },
  "pl": {
   "title": "Przeprowadzka i życie",
   "blurb": "Kręgosłup relokacji — pobyt, podatki, opieka zdrowotna, szkoły, bankowość. Tu nasze wielojęzyczne rynki przeradzają się w mieszkańców."
  },
  "ru": {
   "title": "Переезд и жизнь",
   "blurb": "Основа релокации — ВНЖ, налоги, здравоохранение, школы, банки. Здесь наши многоязычные аудитории превращаются в резидентов."
  }
 },
 "business": {
  "el": {
   "title": "Επιχειρήσεις & Χρήματα",
   "blurb": "Ο συνεργάτης B2B — σύσταση εταιρειών, επαγγελματίες, επέκταση. Υψηλής αξίας αμοιβών· ο κάθετος τομέας όπου οι επιχειρήσεις θέλουν περισσότερο να βρίσκονται."
  },
  "ro": {
   "title": "Afaceri și bani",
   "blurb": "Conexiunea B2B — înființare de companii, profesioniști, expansiune. Valoare mare a comisioanelor; verticala în care afacerile își doresc cel mai mult să fie găsite."
  },
  "ar": {
   "title": "الأعمال والمال",
   "blurb": "الربط بين الشركات: تأسيس الشركات، والمهنيون، والتوسّع. قيمة أتعاب عالية؛ وهو المجال الذي تتوق الشركات أكثر من غيره إلى الظهور فيه."
  },
  "de": {
   "title": "Business & Finanzen",
   "blurb": "Die B2B-Vermittlung – Firmengründung, Fachleute, Expansion. Hoher Honorarwert; die Branche, in der Unternehmen am liebsten gefunden werden möchten."
  },
  "pl": {
   "title": "Biznes i pieniądze",
   "blurb": "Łącznik B2B — zakładanie spółek, specjaliści, ekspansja. Wysoka wartość prowizji; branża, w której firmy najbardziej chcą być znajdowane."
  },
  "ru": {
   "title": "Бизнес и финансы",
   "blurb": "B2B-направление — регистрация компаний, специалисты, расширение. Высокая доходность; вертикаль, в которой бизнес больше всего хочет быть найденным."
  }
 },
 "gifts": {
  "el": {
   "title": "Αγορές & Δώρα",
   "blurb": "Υψηλού περιθωρίου κέρδους, γεμάτο ιστορίες, και μια απευθείας γραμμή με τεχνίτες και κοσμηματοπώλες — ο συνεργάτης στην πιο premium εκδοχή του."
  },
  "ro": {
   "title": "Cumpărături și cadouri",
   "blurb": "Marjă ridicată, bogată în povești și o legătură directă cu meșteșugarii și bijutierii — conexiunea în forma ei cea mai premium."
  },
  "ar": {
   "title": "التسوّق والهدايا",
   "blurb": "هامش ربح مرتفع، وحكايات غنية، وصلة مباشرة بالحرفيين والصاغة؛ الربط في أرقى صوره."
  },
  "de": {
   "title": "Einkaufen & Geschenke",
   "blurb": "Margenstark, reich an Geschichten und eine direkte Verbindung zu Kunsthandwerkern und Juwelieren – die Vermittlung in ihrer edelsten Form."
  },
  "pl": {
   "title": "Zakupy i prezenty",
   "blurb": "Wysoka marża, bogactwo opowieści i bezpośrednia linia do rzemieślników i jubilerów — łącznik w swojej najbardziej ekskluzywnej odsłonie."
  },
  "ru": {
   "title": "Покупки и подарки",
   "blurb": "Высокая маржа, богатые истории и прямой выход на ремесленников и ювелиров — партнёрство в его самом премиальном виде."
  }
 },
 "health": {
  "el": {
   "title": "Υγεία & Οικογένεια",
   "blurb": "Ερωτήματα κρίσιμα για την εμπιστοσύνη, με υψηλή αγωνία. Η σωστή απάντηση σε αυτά χτίζει την αξιοπιστία πάνω στην οποία στηρίζεται ολόκληρη η πύλη."
  },
  "ro": {
   "title": "Sănătate și familie",
   "blurb": "Întrebări esențiale pentru încredere, care generează multă neliniște. Răspunsurile corecte construiesc credibilitatea pe care se sprijină întregul portal."
  },
  "ar": {
   "title": "الصحة والعائلة",
   "blurb": "أسئلة حسّاسة تتطلّب الثقة وتثير القلق. الإجابة الصحيحة عنها تبني المصداقية التي تقوم عليها البوابة بأكملها."
  },
  "de": {
   "title": "Gesundheit & Familie",
   "blurb": "Vertrauenskritische Fragen mit hohem Sorgenpotenzial. Werden sie richtig beantwortet, entsteht die Glaubwürdigkeit, von der das gesamte Portal lebt."
  },
  "pl": {
   "title": "Zdrowie i rodzina",
   "blurb": "Pytania krytyczne dla zaufania i budzące niepokój. Dobre odpowiedzi na nie budują wiarygodność, na której opiera się cały portal."
  },
  "ru": {
   "title": "Здоровье и семья",
   "blurb": "Вопросы, где критично доверие и высок уровень тревоги. Точные ответы здесь создают репутацию, на которой держится весь портал."
  }
 }
};

export const INTENT_I18N: Record<string, Partial<Record<KBLoc, IntentTx>>> = {
 "when-to-visit": {
  "el": {
   "q": "Πότε να επισκεφθώ την Κύπρο, και μπορώ να κολυμπήσω έναν συγκεκριμένο μήνα;",
   "a": "Η Κύπρος είναι ζεστή, ξηρή και κατάλληλη για κολύμπι περίπου από τον Μάιο έως τα μέσα Νοεμβρίου· η θάλασσα φτάνει στο ζενίθ της τον Αύγουστο–Σεπτέμβριο, γύρω στους 27°C. Ο Μάιος, ο Ιούνιος, ο Οκτώβριος και οι αρχές Νοεμβρίου είναι υπέροχα κατάλληλοι για κολύμπι, με λιγότερο κόσμο και χαμηλότερες τιμές. Ο χειμώνας είναι ήπιος και καταπράσινος — φτιαγμένος για χωριά και πεζοπορία παρά για την παραλία, και τα βράδια δροσίζουν γρήγορα από τον Οκτώβριο, οπότε πάρτε μαζί σας ένα ελαφρύ μπουφάν."
  },
  "ro": {
   "q": "Când ar trebui să vizitez Ciprul și pot să înot într-o anumită lună?",
   "a": "Ciprul este cald, uscat și numai bun de înot aproximativ din mai până la mijlocul lui noiembrie; marea atinge maximul în august–septembrie, la circa 27°C. Mai, iunie, octombrie și începutul lui noiembrie sunt splendide pentru înot, cu mai puțină aglomerație și prețuri mai mici. Iarna este blândă și verde — făcută pentru sate și drumeții, nu pentru plajă, iar serile se răcoresc rapid din octombrie, așa că ia-ți o jachetă subțire."
  },
  "ar": {
   "q": "متى ينبغي أن أزور قبرص، وهل يمكنني السباحة في شهر معيّن؟",
   "a": "قبرص دافئة وجافة وصالحة للسباحة من مايو إلى منتصف نوفمبر تقريباً، ويبلغ البحر ذروته في أغسطس–سبتمبر عند نحو 27°C. وأشهر مايو ويونيو وأكتوبر ومطلع نوفمبر رائعة للسباحة، مع ازدحام أخفّ وأسعار أدنى. أما الشتاء فمعتدل وأخضر، صُنِع للقرى والمشي أكثر من الشاطئ، وتبرد الأمسيات بسرعة اعتباراً من أكتوبر، فاحرص على اصطحاب سترة خفيفة."
  },
  "de": {
   "q": "Wann sollte ich Zypern besuchen, und kann ich in einem bestimmten Monat baden?",
   "a": "Zypern ist etwa von Mai bis Mitte November warm, trocken und badetauglich; das Meer erreicht im August und September mit rund 27 °C seinen Höhepunkt. Mai, Juni, Oktober und der frühe November sind herrlich zum Baden – mit weniger Trubel und niedrigeren Preisen. Der Winter ist mild und grün, wie geschaffen für Dörfer und Wanderungen statt für den Strand; ab Oktober kühlen die Abende rasch ab, packen Sie also eine leichte Jacke ein."
  },
  "pl": {
   "q": "Kiedy najlepiej przyjechać na Cypr i czy w danym miesiącu można się kąpać?",
   "a": "Cypr jest ciepły, suchy i nadaje się do kąpieli mniej więcej od maja do połowy listopada; morze osiąga szczyt w sierpniu–wrześniu, około 27°C. Maj, czerwiec, październik i początek listopada to cudowna pora na pływanie, z mniejszym tłumem i niższymi cenami. Zima jest łagodna i zielona — stworzona raczej do zwiedzania wsi i wędrówek niż plażowania, a od października wieczory szybko chłodną, więc weź lekką kurtkę."
  },
  "ru": {
   "q": "Когда лучше приехать на Кипр и можно ли купаться в тот или иной месяц?",
   "a": "Кипр тёплый, сухой и пригодный для купания примерно с мая до середины ноября; море прогревается сильнее всего в августе–сентябре, до 27°C. Май, июнь, октябрь и начало ноября великолепно подходят для купания — меньше людей и ниже цены. Зима мягкая и зелёная — она создана для деревень и походов, а не для пляжа; с октября вечера быстро остывают, так что возьмите лёгкую куртку."
  }
 },
 "getting-around": {
  "el": {
   "q": "Χρειάζομαι αυτοκίνητο στην Κύπρο ή μπορώ να τα καταφέρω χωρίς;",
   "a": "Στην ακτή μπορείτε να βασιστείτε στα ταξί και στα πόδια σας· για τα χωριά, τα βουνά του Τροόδους και τον Ακάμα χρειάζεστε πραγματικά αυτοκίνητο ή μια οργανωμένη εκδρομή. Οι εφαρμογές μεταφοράς που λειτουργούν εδώ είναι οι Bolt, CabCY και nTaxi (η Uber και η Yandex δεν λειτουργούν στην Κύπρο). Τα υπεραστικά λεωφορεία είναι φθηνά (περίπου €1.50 εντός πόλης, €7 το ημερήσιο εισιτήριο), αλλά αραιά και αργά μεταξύ των πόλεων. Η οδήγηση γίνεται στα αριστερά."
  },
  "ro": {
   "q": "Am nevoie de mașină în Cipru sau mă descurc și fără?",
   "a": "Pe coastă te poți descurca cu taxiuri și pe jos; pentru sate, munții Troodos și Akamas ai însă neapărată nevoie de mașină sau de un tur ghidat. Aplicațiile de ride-hailing care funcționează aici sunt Bolt, CabCY și nTaxi (Uber și Yandex nu operează în Cipru). Autobuzele interurbane sunt ieftine (circa €1.50 în oraș, €7 abonamentul pe zi), dar rare și lente între orașe. Se circulă pe stânga."
  },
  "ar": {
   "q": "هل أحتاج إلى سيارة في قبرص، أم يمكنني الاستغناء عنها؟",
   "a": "على الساحل يمكنك الاعتماد على سيارات الأجرة وعلى قدميك، أما للقرى وجبال ترودوس وأكاماس فأنت بحاجة فعلية إلى سيارة أو جولة مصحوبة بمرشد. وتطبيقات طلب السيارات العاملة هنا هي Bolt وCabCY وnTaxi (أما Uber وYandex فلا تعملان في قبرص). وحافلات النقل بين المدن رخيصة (نحو €1.50 داخل المدينة، و€7 لبطاقة اليوم الكامل) لكنها متفرّقة وبطيئة بين المدن. والقيادة على الجهة اليسرى."
  },
  "de": {
   "q": "Brauche ich auf Zypern ein Auto, oder komme ich auch ohne aus?",
   "a": "An der Küste kommen Sie mit Taxis und zu Fuß gut zurecht; für die Dörfer, das Troodos-Gebirge und die Akamas-Halbinsel brauchen Sie hingegen wirklich ein Auto oder eine geführte Tour. Die hier funktionierenden Fahrdienst-Apps sind Bolt, CabCY und nTaxi (Uber und Yandex sind auf Zypern nicht aktiv). Überlandbusse sind günstig (etwa €1.50 in der Stadt, €7 für die Tageskarte), aber zwischen den Städten dünn getaktet und langsam. Es herrscht Linksverkehr."
  },
  "pl": {
   "q": "Czy na Cyprze potrzebuję samochodu, czy poradzę sobie bez niego?",
   "a": "Na wybrzeżu wystarczą taksówki i własne nogi; do wsi, w góry Troodos i na półwysep Akamas naprawdę potrzebny jest samochód lub zorganizowana wycieczka. Aplikacje do zamawiania przejazdów, które tu działają, to Bolt, CabCY i nTaxi (Uber i Yandex na Cyprze nie funkcjonują). Autobusy międzymiastowe są tanie (około €1.50 w mieście, €7 za bilet dzienny), ale kursują rzadko i wolno między miastami. Ruch jest lewostronny."
  },
  "ru": {
   "q": "Нужна ли на Кипре машина или можно обойтись без неё?",
   "a": "На побережье можно обойтись такси и прогулками пешком; но для деревень, гор Троодос и Акамаса машина или организованный тур действительно необходимы. Из приложений для вызова такси здесь работают Bolt, CabCY и nTaxi (Uber и Yandex на Кипре не работают). Междугородние автобусы дёшевы (около €1.50 по городу, €7 за дневной проездной), но ходят редко и медленно между городами. Движение левостороннее."
  }
 },
 "which-town": {
  "el": {
   "q": "Σε ποια πόλη ή περιοχή να εγκατασταθώ ως βάση;",
   "a": "Η Πάφος ταιριάζει σε οικογένειες, ξένους κατοίκους και σε πιο ήρεμους ρυθμούς, με εξαιρετική αρχαιολογία· η Αγία Νάπα και ο Πρωταράς είναι για παραλίες και νυχτερινή ζωή· η Λεμεσός είναι κοσμοπολίτικη, με κλίση προς την πολυτέλεια, με τη μαρίνα και το καζίνο· η Λάρνακα είναι κοντά στο αεροδρόμιο, αυθεντική και με την καλύτερη σχέση αξίας-τιμής· η Λευκωσία είναι η πραγματική εργαζόμενη πρωτεύουσα για πολιτισμό και αγορές."
  },
  "ro": {
   "q": "În ce oraș sau zonă ar trebui să mă cazez?",
   "a": "Paphos se potrivește familiilor, expaților și unui ritm mai lejer, cu arheologie remarcabilă; Ayia Napa și Protaras sunt pentru plaje și viață de noapte; Limassol este cosmopolit, înclinat spre lux, cu marina și cazinoul; Larnaca este aproape de aeroport, autentică și cu cel mai bun raport calitate-preț; Nicosia este adevărata capitală funcțională, pentru cultură și cumpărături."
  },
  "ar": {
   "q": "في أي مدينة أو منطقة ينبغي أن أتّخذ مقرّاً لي؟",
   "a": "بافوس تناسب العائلات والمغتربين وإيقاع الحياة الأهدأ، مع كنوز أثرية رائعة؛ وأيا نابا وبروتاراس للشواطئ والحياة الليلية؛ وليماسول عالمية الطابع تميل إلى الفخامة، بمرساها وكازينوها؛ ولارنكا قريبة من المطار وأصيلة وأفضل قيمة مقابل المال؛ ونيقوسيا هي العاصمة النابضة فعلاً للثقافة والتسوّق."
  },
  "de": {
   "q": "In welcher Stadt oder Region sollte ich mich einquartieren?",
   "a": "Paphos eignet sich für Familien, Auswanderer und ein ruhigeres Tempo, mit großartiger Archäologie; Ayia Napa und Protaras stehen für Strände und Nachtleben; Limassol ist kosmopolitisch und luxusorientiert, mit Yachthafen und Casino; Larnaka liegt flughafennah, ist authentisch und bietet das beste Preis-Leistungs-Verhältnis; Nikosia ist die eigentliche, lebendige Hauptstadt für Kultur und Shopping."
  },
  "pl": {
   "q": "W którym mieście lub regionie najlepiej się zatrzymać?",
   "a": "Pafos jest dobry dla rodzin, ekspatów i spokojniejszego tempa, ze wspaniałą archeologią; Ayia Napa i Protaras to plaże i życie nocne; Limassol jest kosmopolityczne, z zacięciem luksusowym, z mariną i kasynem; Larnaka leży blisko lotniska, jest autentyczna i najlepsza cenowo; Nikozja to prawdziwa, tętniąca życiem stolica kultury i zakupów."
  },
  "ru": {
   "q": "В каком городе или районе лучше остановиться?",
   "a": "Пафос подойдёт семьям, экспатам и любителям спокойного ритма с отличной археологией; Айя-Напа и Протарас — это пляжи и ночная жизнь; Лимасол космополитичен, тяготеет к роскоши, с мариной и казино; Ларнака близка к аэропорту, аутентична и наиболее выгодна по цене; Никосия — настоящая рабочая столица для культуры и шопинга."
  }
 },
 "airport-transfer": {
  "el": {
   "q": "Πώς φτάνω από το αεροδρόμιο Λάρνακας ή Πάφου στο θέρετρό μου;",
   "a": "Προκρατήστε μια ιδιωτική μεταφορά ή χρησιμοποιήστε μια εφαρμογή ταξί. Ενδεικτικά, με ταξί: Λάρνακα προς Αγία Νάπα περίπου €55–70, αεροδρόμιο Πάφου προς ξενοδοχεία της Πάφου περίπου €20–30, Λάρνακα προς Λεμεσό περίπου €70–85. Τα προγραμματισμένα λεωφορεία μεταφοράς (π.χ. Kapnos) είναι φθηνότερα· επιβεβαιώνετε πάντα τον ναύλο πριν ξεκινήσετε."
  },
  "ro": {
   "q": "Cum ajung de la aeroportul din Larnaca sau Paphos la stațiunea mea?",
   "a": "Rezervă din timp un transfer privat sau folosește o aplicație de taxi. Ca reper orientativ cu taxiul: din Larnaca până în Ayia Napa aproximativ €55–70, de la aeroportul Paphos până la hotelurile din Paphos circa €20–30, din Larnaca până în Limassol aproximativ €70–85. Navetele programate (de exemplu Kapnos) sunt mai ieftine; confirmă întotdeauna tariful înainte de plecare."
  },
  "ar": {
   "q": "كيف أصل من مطار لارنكا أو بافوس إلى منتجعي؟",
   "a": "احجز مسبقاً وسيلة نقل خاصة أو استخدم أحد تطبيقات سيارات الأجرة. وكدليل تقريبي بسيارة الأجرة: من لارنكا إلى أيا نابا نحو €55–70، ومن مطار بافوس إلى فنادق بافوس نحو €20–30، ومن لارنكا إلى ليماسول نحو €70–85. أما حافلات النقل المجدولة (مثل Kapnos) فأرخص؛ وتأكّد دائماً من الأجرة قبل الانطلاق."
  },
  "de": {
   "q": "Wie komme ich vom Flughafen Larnaka oder Paphos zu meinem Urlaubsort?",
   "a": "Buchen Sie einen privaten Transfer vorab oder nutzen Sie eine Taxi-App. Als grobe Orientierung per Taxi: Larnaka nach Ayia Napa etwa €55–70, vom Flughafen Paphos zu den Hotels in Paphos etwa €20–30, Larnaka nach Limassol etwa €70–85. Fahrplanmäßige Shuttles (z. B. Kapnos) sind günstiger; lassen Sie sich den Fahrpreis stets vor der Abfahrt bestätigen."
  },
  "pl": {
   "q": "Jak dostać się z lotniska w Larnace lub Pafos do mojego kurortu?",
   "a": "Zarezerwuj z wyprzedzeniem prywatny transfer lub skorzystaj z aplikacji taksówkowej. Orientacyjnie taksówką: z Larnaki do Ayia Napa około €55–70, z lotniska w Pafos do hoteli w Pafos około €20–30, z Larnaki do Limassol około €70–85. Kursowe busy (np. Kapnos) są tańsze; zawsze potwierdź cenę przed odjazdem."
  },
  "ru": {
   "q": "Как добраться из аэропорта Ларнаки или Пафоса до моего курорта?",
   "a": "Забронируйте частный трансфер заранее или воспользуйтесь приложением для вызова такси. Ориентировочно на такси: из Ларнаки в Айя-Напу примерно €55–70, из аэропорта Пафоса до отелей Пафоса около €20–30, из Ларнаки в Лимасол примерно €70–85. Регулярные шаттлы (например, Kapnos) дешевле; всегда уточняйте стоимость поездки до отправления."
  }
 },
 "daily-budget": {
  "el": {
   "q": "Τι προϋπολογισμό να υπολογίσω ανά ημέρα στην Κύπρο;",
   "a": "Πολύ χονδρικά, ανά άτομο και χωρίς τα αεροπορικά και την ενοικίαση αυτοκινήτου: οικονομικά €60–90/ημέρα, μεσαία κατηγορία €120–180, άνετα €250+. Τα δείπνα με μεζέ, το κρασί και οι προκρατημένες δραστηριότητες είναι οι παράγοντες που κάνουν τη διαφορά — τα ορεινά χωριά και οι ταβέρνες κοστίζουν πολύ λιγότερο από τη μαρίνα της Λεμεσού."
  },
  "ro": {
   "q": "Ce buget zilnic ar trebui să îmi fac în Cipru?",
   "a": "Foarte aproximativ, de persoană și fără zboruri și închiriere de mașină: la buget redus €60–90/zi, la nivel mediu €120–180, confortabil €250+. Cinele cu meze, vinul și activitățile rezervate sunt factorii care fac diferența — satele de munte și tavernele costă mult mai puțin decât marina din Limassol."
  },
  "ar": {
   "q": "كم ينبغي أن أخصّص من الميزانية يومياً في قبرص؟",
   "a": "بشكل تقريبي جداً، للفرد الواحد وباستثناء رحلات الطيران واستئجار السيارة: للميزانية المحدودة €60–90 يومياً، وللمستوى المتوسط €120–180، وللمريح €250+. وعشاء الميزة والنبيذ والأنشطة المحجوزة هي العوامل المرجّحة، فقرى الجبال ومطاعمها التقليدية أرخص بكثير من مرسى ليماسول."
  },
  "de": {
   "q": "Wie viel sollte ich pro Tag auf Zypern einplanen?",
   "a": "Ganz grob, pro Person und ohne Flüge und Mietwagen: sparsam €60–90/Tag, Mittelklasse €120–180, komfortabel €250+. Meze-Abendessen, Wein und gebuchte Aktivitäten sind die entscheidenden Faktoren – Bergdörfer und Tavernen kosten weit weniger als der Yachthafen von Limassol."
  },
  "pl": {
   "q": "Jaki dzienny budżet zaplanować na Cyprze?",
   "a": "Bardzo orientacyjnie, na osobę i bez lotów oraz wynajmu auta: budżetowo €60–90/dzień, w średnim standardzie €120–180, komfortowo €250+. O różnicy decydują kolacje meze, wino i rezerwowane atrakcje — górskie wsie i taverny kosztują znacznie mniej niż marina w Limassol."
  },
  "ru": {
   "q": "Какой бюджет закладывать на день на Кипре?",
   "a": "Очень приблизительно, на человека и без учёта перелёта и аренды авто: экономно — €60–90 в день, средний уровень — €120–180, комфортно — €250+. Ужины-мезе, вино и заранее забронированные активности сильнее всего влияют на итог — горные деревни и таверны обходятся куда дешевле, чем марина Лимасола."
  }
 },
 "safe-family": {
  "el": {
   "q": "Είναι η Κύπρος ασφαλής και φιλική προς τις οικογένειες;",
   "a": "Ναι — είναι μία από τις πιο ασφαλείς χώρες της ΕΕ, τα αγγλικά μιλιούνται σχεδόν παντού, και είναι φτιαγμένη για οικογένειες, με ρηχές παραλίες Γαλάζιας Σημαίας, υδάτινα πάρκα και σύντομες διαδρομές. Ο ενιαίος αριθμός έκτακτης ανάγκης είναι το 112."
  },
  "ro": {
   "q": "Este Ciprul sigur și potrivit pentru familii?",
   "a": "Da — este una dintre cele mai sigure țări din UE, engleza se vorbește aproape peste tot, iar insula este croită pentru familii, cu plaje puțin adânci cu Steag Albastru, parcuri acvatice și distanțe scurte de parcurs cu mașina. Numărul unic de urgență este 112."
  },
  "ar": {
   "q": "هل قبرص آمنة وملائمة للعائلات؟",
   "a": "نعم؛ فهي من أكثر دول الاتحاد الأوروبي أماناً، ويُتحدَّث بالإنجليزية في كل مكان تقريباً، وهي مهيّأة للعائلات بشواطئها الضحلة الحائزة على العَلَم الأزرق، ومدنها المائية، والمسافات القصيرة بالسيارة. ورقم الطوارئ الموحّد هو 112."
  },
  "de": {
   "q": "Ist Zypern sicher und familienfreundlich?",
   "a": "Ja – es zählt zu den sichersten Ländern der EU, fast überall wird Englisch gesprochen, und es ist wie geschaffen für Familien, mit flach abfallenden Blaue-Flagge-Stränden, Wasserparks und kurzen Fahrtwegen. Die einheitliche Notrufnummer lautet 112."
  },
  "pl": {
   "q": "Czy Cypr jest bezpieczny i przyjazny rodzinom?",
   "a": "Tak — to jeden z najbezpieczniejszych krajów w UE, po angielsku mówi się niemal wszędzie, a wyspa jest stworzona dla rodzin: płytkie plaże z Błękitną Flagą, parki wodne i krótkie dojazdy. Jeden numer alarmowy to 112."
  },
  "ru": {
   "q": "Безопасен ли Кипр и подходит ли он для семейного отдыха?",
   "a": "Да — это одна из самых безопасных стран ЕС, на английском говорят почти повсюду, и остров прекрасно приспособлен для семей: мелководные пляжи с «Голубым флагом», аквапарки и короткие переезды. Единый номер экстренных служб — 112."
  }
 },
 "best-beaches": {
  "el": {
   "q": "Ποιες είναι οι καλύτερες παραλίες κοντά στην πόλη μου;",
   "a": "Η Αγία Νάπα έχει τη Νίσσι και τον Μακρόνησο· ο Πρωταράς το Fig Tree Bay και τον Κόννο· η Πάφος το Coral Bay και την άγρια Λάρα (χελώνες)· η Λάρνακα τις Φοινικούδες και τη Μακένζι. Οι περισσότερες είναι Γαλάζιας Σημαίας, με ψιλή άμμο και ομαλή είσοδο· οι ξαπλώστρες κοστίζουν περίπου €2.50 η καθεμία."
  },
  "ro": {
   "q": "Care sunt cele mai frumoase plaje din apropierea orașului meu?",
   "a": "Ayia Napa are Nissi și Makronissos; Protaras are Fig Tree Bay și Konnos; Paphos are Coral Bay și sălbatica Lara (broaște țestoase); Larnaca are Finikoudes și Mackenzie. Cele mai multe au Steag Albastru, nisip fin și intrare lină în apă; șezlongurile costă circa €2.50 bucata."
  },
  "ar": {
   "q": "ما أفضل الشواطئ القريبة من مدينتي؟",
   "a": "في أيا نابا شاطئا نيسي وماكرونيسوس؛ وفي بروتاراس خليج فيغ تري وكونوس؛ وفي بافوس خليج كورال ولارا البرية (السلاحف)؛ وفي لارنكا فينيكوذيس وماكنزي. ومعظمها حائز على العَلَم الأزرق برمالٍ ناعمة ودخولٍ لطيف إلى الماء؛ وتُؤجَّر كراسي الاستلقاء بنحو €2.50 للكرسي."
  },
  "de": {
   "q": "Welches sind die besten Strände in der Nähe meines Ortes?",
   "a": "Ayia Napa hat Nissi und Makronissos; Protaras hat die Fig Tree Bay und Konnos; Paphos hat die Coral Bay und das ursprüngliche Lara (Schildkröten); Larnaka hat Finikoudes und Mackenzie. Die meisten tragen die Blaue Flagge, mit feinem Sand und sanftem Einstieg; eine Sonnenliege kostet etwa €2.50."
  },
  "pl": {
   "q": "Jakie są najlepsze plaże w pobliżu mojego miasta?",
   "a": "Ayia Napa ma Nissi i Makronissos; Protaras — Fig Tree Bay i Konnos; Pafos — Coral Bay i dziką Larę (żółwie); Larnaka — Finikoudes i Mackenzie. Większość ma Błękitną Flagę, drobny piasek i łagodne zejście do wody; leżaki kosztują około €2.50 za sztukę."
  },
  "ru": {
   "q": "Какие лучшие пляжи рядом с моим городом?",
   "a": "В Айя-Напе — Нисси и Макрониссос; в Протарасе — Фиг-Три-Бэй и Коннос; в Пафосе — Корал-Бэй и дикая Лара (черепахи); в Ларнаке — Финикудес и Маккензи. Большинство отмечены «Голубым флагом», с мелким песком и пологим входом; шезлонги — около €2.50 за штуку."
  }
 },
 "snorkelling": {
  "el": {
   "q": "Πού μπορώ να κάνω κατάδυση με αναπνευστήρα (snorkelling) στην Κύπρο;",
   "a": "Το Green Bay στον Πρωταρά είναι ρηχό, προστατευμένο και το καλύτερο για αρχάριους και παιδιά (βυθισμένα αγάλματα, ιππόκαμποι). Το Κάβο Γκρέκο και ο Κόννος έχουν χελώνες και ροφούς· το Γαλάζιο Λαγκόνι (Blue Lagoon) του Ακάμα είναι κρυστάλλινο, αλλά προσεγγίζεται με σκάφος· και το MUSAN, το υποβρύχιο πάρκο γλυπτών ανοιχτά της Αγίας Νάπας, είναι κατάλληλο για snorkelling στα 10 m. Η μάσκα και ο αναπνευστήρας νοικιάζονται περίπου €5–10 την ημέρα· προσέχετε την κίνηση των σκαφών και μένετε εντός της ζώνης κολύμβησης."
  },
  "ro": {
   "q": "Unde pot face snorkeling în Cipru?",
   "a": "Green Bay din Protaras este puțin adâncă, adăpostită și cea mai bună pentru începători și copii (statui scufundate, căluți de mare). Cape Greco și Konnos au broaște țestoase și grouperi; Blue Lagoon din Akamas are apă cristalină, dar se ajunge la ea cu barca; iar MUSAN, parcul de sculpturi subacvatice din largul Ayia Napa, este accesibil la snorkeling, la 10 m. Masca și tubul se închiriază cu circa €5–10 pe zi; ai grijă la traficul bărcilor și rămâi în zona de înot."
  },
  "ar": {
   "q": "أين يمكنني ممارسة الغطس السطحي في قبرص؟",
   "a": "خليج غرين باي في بروتاراس ضحل ومحميّ، وهو الأفضل للمبتدئين والأطفال (تماثيل غارقة وأحصنة بحر). وفي كيب غريكو وكونوس سلاحف وأسماك الهامور؛ أما البحيرة الزرقاء في أكاماس فمياهها صافية تماماً لكن يُوصَل إليها بالقارب؛ وMUSAN، حديقة المنحوتات تحت الماء قبالة أيا نابا، مناسبة للغطس السطحي على عمق 10 m. ويُؤجَّر القناع وأنبوب التنفّس بنحو €5–10 يومياً؛ وانتبه لحركة القوارب وابقَ داخل منطقة السباحة."
  },
  "de": {
   "q": "Wo kann ich auf Zypern schnorcheln?",
   "a": "Die Green Bay in Protaras ist flach, geschützt und am besten für Anfänger und Kinder geeignet (versunkene Statuen, Seepferdchen). Am Kap Greco und in Konnos gibt es Schildkröten und Zackenbarsche; die Blaue Lagune der Akamas ist glasklar, aber nur per Boot erreichbar; und MUSAN, der Unterwasser-Skulpturenpark vor Ayia Napa, lässt sich in 10 m Tiefe gut beschnorcheln. Maske und Schnorchel mieten Sie für etwa €5–10 pro Tag; achten Sie auf den Bootsverkehr und bleiben Sie innerhalb der Badezone."
  },
  "pl": {
   "q": "Gdzie na Cyprze można nurkować z rurką (snorkeling)?",
   "a": "Green Bay w Protaras jest płytka, osłonięta i najlepsza dla początkujących i dzieci (zatopione posągi, koniki morskie). Przy Cape Greco i Konnos spotkasz żółwie i graniki; Błękitna Laguna na Akamas jest krystalicznie czysta, ale dopływa się do niej łodzią; a MUSAN, podwodny park rzeźb u wybrzeży Ayia Napa, jest przyjazny snorkelingowi na głębokości 10 m. Maska i rurka to koszt około €5–10 dziennie; uważaj na ruch łodzi i trzymaj się strefy pływania."
  },
  "ru": {
   "q": "Где на Кипре можно заняться снорклингом?",
   "a": "Грин-Бэй в Протарасе — мелкий, укрытый от волн и лучший для новичков и детей (затонувшие статуи, морские коньки). У мыса Каво-Греко и в Конносе есть черепахи и груперы; кристально чистая Голубая лагуна Акамаса доступна только с лодки; а MUSAN, подводный парк скульптур у Айя-Напы, удобен для снорклинга на глубине 10 m. Маска с трубкой сдаются в аренду примерно за €5–10 в день; следите за движением лодок и не выплывайте за пределы зоны для купания."
  }
 },
 "hiking-troodos": {
  "el": {
   "q": "Ποιες είναι οι καλύτερες πεζοπορίες και μονοπάτια της φύσης;",
   "a": "Στο Τρόοδος, τα κυκλικά μονοπάτια της Αταλάντης και της Άρτεμης περιτριγυρίζουν τον Όλυμπο, με τους καταρράκτες Καληδονίας (Caledonia) και Μιλλομέρη (Millomeris) κοντά· στον Ακάμα, περπατήστε το Μονοπάτι της Φύσης της Αφροδίτης και το εντυπωσιακό Φαράγγι του Άβακα. Πηγαίνετε άνοιξη ή φθινόπωρο, ξεκινήστε νωρίς και έχετε μαζί σας νερό — η μεσημεριανή ζέστη του καλοκαιριού είναι ανελέητη."
  },
  "ro": {
   "q": "Care sunt cele mai frumoase drumeții și trasee naturale?",
   "a": "În Troodos, traseele circulare Atalante și Artemis ocolesc Muntele Olimp, cu cascadele Caledonia și Millomeris în apropiere; în Akamas, parcurge Traseul Natural Afrodita și spectaculosul defileu Avakas. Mergi primăvara sau toamna, pornește devreme și ia apă cu tine — arșița de la prânz din timpul verii este necruțătoare."
  },
  "ar": {
   "q": "ما أفضل مسارات المشي والطبيعة؟",
   "a": "في ترودوس، يدور مسارا أتالانتي وأرتيميس حول جبل أوليمبوس، وقربهما شلالات كاليدونيا وميلوميريس؛ وفي أكاماس، امشِ في مسار أفروديت الطبيعي ومضيق أفاكاس المهيب. اذهب في الربيع أو الخريف، وابدأ مبكراً واحمل الماء؛ فحرّ الظهيرة صيفاً قاسٍ."
  },
  "de": {
   "q": "Welches sind die besten Wanderungen und Naturpfade?",
   "a": "Im Troodos-Gebirge umrunden die Rundwege Atalante und Artemis den Olymp, ganz in der Nähe liegen die Wasserfälle von Caledonia und Millomeris; auf der Akamas-Halbinsel begehen Sie den Aphrodite-Naturpfad und die spektakuläre Avakas-Schlucht. Kommen Sie im Frühling oder Herbst, brechen Sie früh auf und nehmen Sie Wasser mit – die sommerliche Mittagshitze ist gnadenlos."
  },
  "pl": {
   "q": "Jakie są najlepsze szlaki piesze i przyrodnicze?",
   "a": "W Troodos pętle Atalante i Artemis okrążają Olimp, a w pobliżu są wodospady Caledonia i Millomeris; na Akamas przejdź szlak przyrodniczy Afrodyty i imponujący wąwóz Avakas. Wybierz się wiosną lub jesienią, ruszaj wcześnie i zabierz wodę — letni upał w południe potrafi być bezlitosny."
  },
  "ru": {
   "q": "Какие лучшие пешие маршруты и природные тропы?",
   "a": "В Троодосе кольцевые тропы Аталанте и Артемида огибают гору Олимп, а рядом — водопады Каледония и Милломерис; на Акамасе стоит пройти природную тропу Афродиты и впечатляющее ущелье Авакас. Отправляйтесь весной или осенью, выходите рано и берите воду — полуденная летняя жара беспощадна."
  }
 },
 "turtles": {
  "el": {
   "q": "Πού μπορώ να δω χελώνες στην Κύπρο;",
   "a": "Ο Κόλπος της Λάρας στον Ακάμα είναι μια προστατευόμενη παραλία ωοτοκίας για τις χελώνες καρέτα-καρέτα και τις πράσινες χελώνες — επισκεφθείτε την με σεβασμό, χωρίς φώτα και χωρίς οδήγηση στην άμμο τη νύχτα. Μπορείτε επίσης να τις δείτε κάνοντας snorkelling στο Κάβο Γκρέκο. Η περίοδος ωοτοκίας διαρκεί περίπου από τον Ιούνιο έως τον Σεπτέμβριο."
  },
  "ro": {
   "q": "Unde pot vedea broaște țestoase în Cipru?",
   "a": "Golful Lara din Akamas este o plajă protejată de cuibărit pentru broasca țestoasă Caretta și broasca țestoasă verde — vizitează cu respect, fără lumini și fără a conduce pe nisip noaptea. Le poți zări și făcând snorkeling la Cape Greco. Sezonul de cuibărit se întinde aproximativ din iunie până în septembrie."
  },
  "ar": {
   "q": "أين يمكنني رؤية السلاحف في قبرص؟",
   "a": "خليج لارا في أكاماس شاطئ محميّ لتعشيش السلاحف ضخمة الرأس والسلاحف الخضراء؛ فزُره باحترام، دون أضواء ودون قيادة على الرمال ليلاً. ويمكنك أيضاً رصدها أثناء الغطس السطحي في كيب غريكو. ويمتدّ موسم التعشيش من يونيو إلى سبتمبر تقريباً."
  },
  "de": {
   "q": "Wo kann ich auf Zypern Schildkröten sehen?",
   "a": "Die Lara-Bucht auf der Akamas-Halbinsel ist ein geschützter Nistplatz für Unechte Karettschildkröten und Grüne Meeresschildkröten – besuchen Sie ihn respektvoll, ohne Licht und ohne nachts über den Sand zu fahren. Beim Schnorcheln am Kap Greco können Sie sie ebenfalls entdecken. Die Nistzeit dauert etwa von Juni bis September."
  },
  "pl": {
   "q": "Gdzie na Cyprze można zobaczyć żółwie?",
   "a": "Zatoka Lara na Akamas to chroniona plaża lęgowa żółwi karetta i żółwi zielonych — odwiedzaj ją z szacunkiem, bez świateł i bez wjeżdżania na piasek nocą. Zobaczysz je też podczas snorkelingu przy Cape Greco. Sezon lęgowy trwa mniej więcej od czerwca do września."
  },
  "ru": {
   "q": "Где на Кипре можно увидеть черепах?",
   "a": "Залив Лара на Акамасе — охраняемый пляж, где гнездятся логгерхеды и зелёные черепахи; относитесь к нему бережно: никакого света и никакой езды по песку ночью. Их также можно заметить во время снорклинга у мыса Каво-Греко. Сезон гнездования длится примерно с июня по сентябрь."
  }
 },
 "birdwatching": {
  "el": {
   "q": "Πού και πότε μπορώ να κάνω παρατήρηση πουλιών;",
   "a": "Η Κύπρος βρίσκεται πάνω σε έναν σημαντικό μεταναστευτικό διάδρομο πτηνών. Οι καλύτερες τοποθεσίες είναι ο Ακάμας, η αλυκή και οι υγρότοποι του Ακρωτηρίου (φλαμίνγκο τον χειμώνα) και το Κάβο Γκρέκο. Η αιχμή του περάσματος είναι την άνοιξη (Μάρτιος–Μάιος) και το φθινόπωρο (Σεπτέμβριος–Οκτώβριος), όταν πραγματοποιούνται εξειδικευμένες ξεναγήσεις."
  },
  "ro": {
   "q": "Unde și când pot merge la observat păsări?",
   "a": "Ciprul se află pe un important culoar de migrație. Cele mai bune locuri sunt Akamas, lacul sărat și zonele umede de la Akrotiri (flamingo iarna) și Cape Greco. Perioadele de vârf ale pasajului sunt primăvara (martie–mai) și toamna (septembrie–octombrie), când se organizează tururi ghidate specializate."
  },
  "ar": {
   "q": "أين ومتى يمكنني مراقبة الطيور؟",
   "a": "تقع قبرص على أحد أهمّ مسارات هجرة الطيور. وأفضل المواقع هي أكاماس، وبحيرة أكروتيري المالحة وأراضيها الرطبة (طيور الفلامنغو شتاءً)، وكيب غريكو. وتبلغ الهجرة ذروتها في الربيع (مارس–مايو) والخريف (سبتمبر–أكتوبر)، حين تُنظَّم جولات متخصّصة مصحوبة بمرشدين."
  },
  "de": {
   "q": "Wo und wann kann ich Vögel beobachten?",
   "a": "Zypern liegt auf einer wichtigen Vogelzugroute. Die besten Orte sind die Akamas-Halbinsel, der Salzsee und die Feuchtgebiete von Akrotiri (im Winter Flamingos) sowie das Kap Greco. Der Höhepunkt des Vogelzugs liegt im Frühling (März–Mai) und Herbst (September–Oktober), wenn spezialisierte geführte Touren angeboten werden."
  },
  "pl": {
   "q": "Gdzie i kiedy można obserwować ptaki?",
   "a": "Cypr leży na ważnym szlaku migracji ptaków. Najlepsze miejsca to Akamas, słone jezioro i mokradła Akrotiri (zimą flamingi) oraz Cape Greco. Szczyt przelotów przypada na wiosnę (marzec–maj) i jesień (wrzesień–październik), kiedy organizowane są specjalistyczne wycieczki z przewodnikiem."
  },
  "ru": {
   "q": "Где и когда можно наблюдать за птицами?",
   "a": "Кипр расположен на одном из главных миграционных путей. Лучшие места — Акамас, солёное озеро и водно-болотные угодья Акротири (зимой здесь фламинго) и мыс Каво-Греко. Пик пролёта приходится на весну (март–май) и осень (сентябрь–октябрь), когда проводятся специальные экскурсии с гидом."
  }
 },
 "scuba-diving": {
  "el": {
   "q": "Αξίζει το ναυάγιο της Ζηνοβίας, και μπορεί ένας αρχάριος να καταδυθεί σε αυτό; Πού μπορώ να δοκιμάσω κατάδυση;",
   "a": "Η Ζηνοβία, ανοιχτά της Λάρνακας, είναι ένα γνήσιο ναυάγιο από τα πέντε κορυφαία του κόσμου — ένα οχηματαγωγό 172 m ξαπλωμένο στο πλάι του, με το πάνω μέρος του κύτους στα 16–18 m και τα καταστρώματα να κατεβαίνουν κλιμακωτά έως τα 42 m. Προορίζεται μόνο για πιστοποιημένους δύτες· οι αρχάριοι καλό είναι να κάνουν πρώτα ένα μάθημα Discover Scuba στο προστατευμένο Green Bay (περίπου €75–100, ηλικίες 10+) και να επιστρέψουν με πιστοποίηση Advanced. Μια εκδρομή δύο καταδύσεων στη Ζηνοβία ξεκινά από περίπου €185. Καταδυθείτε με ένα κέντρο PADI 5 αστέρων, να έχετε ασφάλεια καταδυτικού ατυχήματος (η DAN Europe είναι το στάνταρ, καθώς τα ταξιδιωτικά συμβόλαια συχνά εξαιρούν τις καταδύσεις) και αφήστε 18–24 ώρες ανάμεσα στην τελευταία σας κατάδυση και την πτήση."
  },
  "ro": {
   "q": "Merită epava Zenobia și poate un începător să se scufunde la ea? Unde pot încerca scufundările?",
   "a": "Zenobia, în largul Larnacăi, este cu adevărat una dintre primele cinci epave din lume — un feribot de 172 m culcat pe o parte, cu partea superioară a cocăi la 16–18 m și punți care coboară în trepte până la 42 m. Este numai pentru scafandri certificați; începătorii ar trebui să facă mai întâi o sesiune Discover Scuba în golful adăpostit Green Bay (circa €75–100, de la 10 ani), apoi să revină cu certificarea Advanced. O ieșire cu două scufundări la Zenobia pornește de la aproximativ €185. Scufundă-te cu un centru PADI 5-star, ai asupra ta o asigurare pentru accidente de scufundare (DAN Europe este standardul, pentru că polițele de călătorie exclud adesea scufundările) și lasă 18–24 de ore între ultima scufundare și zbor."
  },
  "ar": {
   "q": "هل يستحقّ حطام زينوبيا الزيارة، وهل يمكن للمبتدئ الغوص إليه؟ وأين يمكنني تجربة الغوص؟",
   "a": "حطام زينوبيا قبالة لارنكا من بين أفضل خمسة حطام سفن في العالم بحقّ؛ عبّارة طولها 172 m مستلقية على جنبها، هيكلها العلوي على عمق 16–18 m، وطوابقها تتدرّج نزولاً حتى 42 m. وهو للغوّاصين المعتمدين فقط؛ وعلى المبتدئين أن يخوضوا أولاً جلسة Discover Scuba في خليج غرين باي المحميّ (بنحو €75–100، للأعمار 10+)، ثم يعودوا بعد الحصول على شهادة Advanced. وتبدأ رحلة الغوص المزدوج إلى زينوبيا من نحو €185. اغطس مع مركز PADI حائز على خمس نجوم، واحمل تأميناً ضد حوادث الغوص (DAN Europe هو المعيار المعتمد، إذ كثيراً ما تستثني وثائق تأمين السفر الغوص)، واترك 18–24 ساعة بين غوصتك الأخيرة والطيران."
  },
  "de": {
   "q": "Lohnt sich das Wrack der Zenobia, und kann ein Anfänger dort tauchen? Wo kann ich das Tauchen ausprobieren?",
   "a": "Die Zenobia vor Larnaka ist ein echtes Wrack von Weltrang – eines der fünf besten weltweit: eine 172 m lange Fähre auf der Seite liegend, der obere Rumpf in 16–18 m, die Decks stufenweise hinab bis auf 42 m. Sie ist ausschließlich zertifizierten Tauchern vorbehalten; Anfänger sollten zunächst einen Discover-Scuba-Kurs in der geschützten Green Bay absolvieren (etwa €75–100, ab 10 Jahren) und dann mit Advanced-Zertifizierung wiederkommen. Ein Zenobia-Ausflug mit zwei Tauchgängen kostet ab etwa €185. Tauchen Sie mit einem PADI-5-Sterne-Center, sichern Sie sich eine Tauchunfallversicherung (DAN Europe ist der Standard, da Reiseversicherungen das Tauchen oft ausschließen), und lassen Sie zwischen dem letzten Tauchgang und dem Fliegen 18–24 Stunden vergehen."
  },
  "pl": {
   "q": "Czy wrak Zenobii jest wart nurkowania i czy początkujący może na nim zanurkować? Gdzie spróbować nurkowania?",
   "a": "Zenobia u wybrzeży Larnaki to prawdziwy wrak ze światowej piątki — 172-metrowy prom leżący na burcie, górna część kadłuba na 16–18 m, a pokłady schodzące aż do 42 m. Jest przeznaczony wyłącznie dla nurków z certyfikatem; początkujący powinni najpierw odbyć sesję Discover Scuba w osłoniętej Green Bay (około €75–100, od 10 lat), a potem wrócić z certyfikatem Advanced. Wyprawa na Zenobię z dwoma nurkowaniami zaczyna się od około €185. Nurkuj z centrum PADI 5-star, miej ubezpieczenie od wypadków nurkowych (standardem jest DAN Europe, bo polisy turystyczne często wyłączają nurkowanie) i zachowaj 18–24 godziny przerwy między ostatnim nurkowaniem a lotem."
  },
  "ru": {
   "q": "Стоит ли нырять к «Зенобии» и по силам ли это новичку? Где можно попробовать дайвинг?",
   "a": "Затонувшее судно «Зенобия» у Ларнаки — по-настоящему одно из пяти лучших в мире: паром длиной 172 m, лежащий на боку, верхняя часть корпуса на 16–18 m, палубы уходят вниз до 42 m. Погружаться к нему могут только сертифицированные дайверы; новичкам стоит сначала пройти пробное погружение Discover Scuba в укрытом Грин-Бэй (около €75–100, 10+), а затем вернуться уже с сертификатом Advanced. Поездка к «Зенобии» с двумя погружениями обойдётся примерно от €185. Ныряйте с центром категории PADI 5 звёзд, оформите страховку от дайвинг-происшествий (стандарт — DAN Europe, поскольку обычные туристические полисы часто исключают дайвинг) и выдерживайте 18–24 часа между последним погружением и перелётом."
  }
 },
 "watersports-prices": {
  "el": {
   "q": "Πόσο κοστίζει το banana boat, το jet ski ή το parasailing;",
   "a": "Μια βόλτα με banana ή ringo κοστίζει περίπου €10–15· το jet ski περίπου €40–50 για 15 λεπτά ή €90 για 30 (18+, χωρίς δίπλωμα για ενοικίαση στην παραλία)· το parasailing περίπου €40–60. Οι καλύτερα οργανωμένες επιχειρήσεις βρίσκονται στη Νίσσι (Αγία Νάπα) και στον Κόννο (Πρωταράς). Συμφωνήστε πρώτα τιμή και διάρκεια, και ελέγξτε ότι η ταξιδιωτική σας ασφάλεια καλύπτει τα μηχανοκίνητα θαλάσσια σπορ — πολλές εξαιρούν το jet ski και το flyboard."
  },
  "ro": {
   "q": "Cât costă o plimbare cu banana gonflabilă, jet ski sau parasailing?",
   "a": "O plimbare cu banana sau cu ringo costă circa €10–15; un jet ski costă aproximativ €40–50 pentru 15 minute sau €90 pentru 30 (18+, fără permis la închirierea de pe plajă); parasailingul costă circa €40–60. Cele mai bine organizate locuri sunt la Nissi (Ayia Napa) și Konnos (Protaras). Stabilește întâi prețul și durata și verifică dacă asigurarea ta de călătorie acoperă sporturile nautice cu motor — multe exclud jet ski-ul și flyboard-ul."
  },
  "ar": {
   "q": "كم تبلغ تكلفة قارب الموز أو الدرّاجة المائية أو الطيران الشراعي بالمظلّة؟",
   "a": "جولة قارب الموز أو الرِّينغو نحو €10–15؛ والدرّاجة المائية نحو €40–50 لخمس عشرة دقيقة أو €90 لثلاثين دقيقة (18+، دون رخصة عند الاستئجار على الشاطئ)؛ والطيران الشراعي بالمظلّة نحو €40–60. وأفضل المنشآت إدارةً في نيسي (أيا نابا) وكونوس (بروتاراس). واتّفق على السعر والمدة أولاً، وتأكّد من أن تأمين سفرك يغطّي الرياضات المائية بمحرّك؛ فكثير منها يستثني الدرّاجة المائية واللوح الطائر (flyboard)."
  },
  "de": {
   "q": "Was kosten Bananenboot, Jetski oder Parasailing?",
   "a": "Eine Fahrt mit dem Bananen- oder Ringo-Boot kostet etwa €10–15; ein Jetski etwa €40–50 für 15 Minuten oder €90 für 30 (18+, kein Führerschein bei der Anmietung am Strand); Parasailing etwa €40–60. Die am besten geführten Anbieter finden Sie am Nissi (Ayia Napa) und in Konnos (Protaras). Vereinbaren Sie zuerst Preis und Dauer, und prüfen Sie, ob Ihre Reiseversicherung motorisierten Wassersport abdeckt – viele schließen Jetski und Flyboard aus."
  },
  "pl": {
   "q": "Ile kosztuje banan, skuter wodny albo parasailing?",
   "a": "Przejażdżka na bananie lub ringo to około €10–15; skuter wodny około €40–50 za 15 minut lub €90 za 30 (18+, przy wypożyczeniu na plaży bez licencji); parasailing około €40–60. Najlepiej prowadzone wypożyczalnie są przy Nissi (Ayia Napa) i Konnos (Protaras). Najpierw ustal cenę i czas trwania oraz sprawdź, czy twoje ubezpieczenie turystyczne obejmuje motorowe sporty wodne — wiele wyłącza skutery wodne i flyboard."
  },
  "ru": {
   "q": "Сколько стоят «банан», гидроцикл или парасейлинг?",
   "a": "Прокатиться на «банане» или «ринго» стоит около €10–15; гидроцикл — примерно €40–50 за 15 минут или €90 за 30 (18+, при аренде на пляже права не нужны); парасейлинг — около €40–60. Лучше всего организованы точки на Нисси (Айя-Напа) и в Конносе (Протарас). Сначала договоритесь о цене и длительности и проверьте, покрывает ли ваша туристическая страховка моторные водные виды спорта — многие исключают гидроциклы и флайборд."
  }
 },
 "boat-trips": {
  "el": {
   "q": "Ποια είναι η καλύτερη βαρκάδα στο Γαλάζιο Λαγκόνι (Blue Lagoon) και πόσο κοστίζει;",
   "a": "Οι κρουαζιέρες από το Λατσί και την Πάφο προς το Γαλάζιο Λαγκόνι του Ακάμα είναι αυτή που δεν πρέπει να χάσετε: από €15 για μια μίνι κρουαζιέρα, περίπου €20 για ηλιοβασίλεμα με BBQ, €29–39 για ημερήσιες εκδρομές με παραλαβή από το ξενοδοχείο, και ιδιωτικές ναυλώσεις από €460. Πηγαίνετε το πρωί για ήρεμα νερά. Στην Αγία Νάπα, οι οικογενειακές πειρατικές κρουαζιέρες κοστίζουν περίπου €45 ο ενήλικας και τα καταμαράν πάρτι περίπου €60."
  },
  "ro": {
   "q": "Care este cea mai bună excursie cu barca la Blue Lagoon și cât costă?",
   "a": "Croazierele din Latchi și Paphos până la Blue Lagoon din Akamas sunt cele de neratat: de la €15 pentru o mini-croazieră, circa €20 pentru apus cu grătar, €29–39 pentru excursii de o zi cu preluare de la hotel și charter privat de la €460. Mergi dimineața, când apa este liniștită. În Ayia Napa, croazierele-pirat pentru familii costă circa €45 de adult, iar catamaranele de petrecere aproximativ €60."
  },
  "ar": {
   "q": "ما أفضل رحلة بحرية إلى البحيرة الزرقاء وكم تكلّف؟",
   "a": "رحلات لاتشي وبافوس البحرية إلى البحيرة الزرقاء في أكاماس هي التي لا ينبغي تفويتها: من €15 للرحلة القصيرة، ونحو €20 لرحلة الغروب مع شواء، و€29–39 لرحلات اليوم الكامل مع الاصطحاب من الفندق، والرحلات الخاصة من €460. اذهب صباحاً حيث تهدأ المياه. وفي أيا نابا، تبلغ رحلات القراصنة العائلية نحو €45 للبالغ، وقوارب الكاتاماران الاحتفالية نحو €60."
  },
  "de": {
   "q": "Welche ist die beste Bootstour zur Blauen Lagune und was kostet sie?",
   "a": "Die Bootstouren ab Latchi und Paphos zur Blauen Lagune der Akamas sind ein absolutes Muss: ab €15 für eine Mini-Kreuzfahrt, etwa €20 für den Sonnenuntergang mit Grillen, €29–39 für Tagesausflüge mit Hotelabholung und private Charter ab €460. Fahren Sie morgens, wenn das Wasser ruhig ist. In Ayia Napa kosten familienfreundliche Piratentouren etwa €45 für Erwachsene und Party-Katamarane etwa €60."
  },
  "pl": {
   "q": "Która wycieczka łodzią do Błękitnej Laguny jest najlepsza i ile kosztuje?",
   "a": "Rejsy z Latchi i Pafos do Błękitnej Laguny na Akamas to pozycja obowiązkowa: od €15 za minirejs, około €20 za zachód słońca z grillem, €29–39 za wycieczki całodniowe z odbiorem z hotelu i czartery prywatne od €460. Płyń rano, gdy woda jest spokojna. W Ayia Napa rodzinne rejsy piratów kosztują około €45 za osobę dorosłą, a katamarany imprezowe około €60."
  },
  "ru": {
   "q": "Какая лодочная экскурсия к Голубой лагуне лучшая и сколько она стоит?",
   "a": "Круизы из Латчи и Пафоса к Голубой лагуне Акамаса — то, что нельзя пропустить: от €15 за мини-круиз, около €20 за закатный круиз с барбекю, €29–39 за дневные поездки с трансфером от отеля и частные чартеры от €460. Отправляйтесь утром, когда вода спокойна. В Айя-Напе семейные пиратские круизы стоят около €45 за взрослого, а вечеринки-катамараны — около €60."
  }
 },
 "quad-jeep-safari": {
  "el": {
   "q": "Πού μπορώ να κάνω σαφάρι με γουρούνα (quad) ή τζιπ στον Ακάμα;",
   "a": "Υπολογίστε περίπου €77–82 το άτομο για 3–6 ώρες· ο συνδυασμός του Κόλπου της Λάρας, του Φαραγγιού του Άβακα και του Γαλάζιου Λαγκονιού σε μία ημέρα είναι η περιπέτεια με την καλύτερη σχέση αξίας-τιμής στο νησί. Οι αξιόπιστοι διοργανωτές βαθμολογούνται με 4.6–4.8 στις ιστοσελίδες κριτικών — κλείστε νωρίς στο ταξίδι σας."
  },
  "ro": {
   "q": "Unde pot face un safari cu ATV sau cu jeep-ul în Akamas?",
   "a": "Așteaptă-te la circa €77–82 de persoană pentru 3–6 ore; combinarea golfului Lara, a defileului Avakas și a Blue Lagoon într-o singură zi este aventura cu cel mai bun raport calitate-preț de pe insulă. Operatorii de încredere au note de 4.6–4.8 pe site-urile de recenzii — rezervă la începutul sejurului."
  },
  "ar": {
   "q": "أين يمكنني القيام برحلة سفاري بالدرّاجة الرباعية أو سيارة الجيب في أكاماس؟",
   "a": "توقّع نحو €77–82 للشخص لمدة 3–6 ساعات؛ والجمع بين خليج لارا ومضيق أفاكاس والبحيرة الزرقاء في يوم واحد هو المغامرة الأفضل قيمةً في الجزيرة. ويحصل المشغّلون الموثوقون على تقييم 4.6–4.8 على مواقع المراجعات؛ فاحجز في وقت مبكّر من رحلتك."
  },
  "de": {
   "q": "Wo kann ich auf der Akamas-Halbinsel eine Quad- oder Jeep-Safari machen?",
   "a": "Rechnen Sie mit etwa €77–82 pro Person für 3–6 Stunden; Lara-Bucht, Avakas-Schlucht und die Blaue Lagune an einem Tag zu verbinden, ist das preiswerteste Abenteuer der Insel. Seriöse Anbieter erreichen auf Bewertungsportalen 4.6–4.8 – buchen Sie früh in Ihrem Urlaub."
  },
  "pl": {
   "q": "Gdzie na Akamas wybrać się na safari quadem lub jeepem?",
   "a": "Licz się z kosztem około €77–82 od osoby za 3–6 godzin; połączenie zatoki Lara, wąwozu Avakas i Błękitnej Laguny w jeden dzień to najlepsza cenowo przygoda na wyspie. Renomowani organizatorzy mają oceny 4.6–4.8 na portalach z recenzjami — rezerwuj na początku pobytu."
  },
  "ru": {
   "q": "Где на Акамасе можно устроить сафари на квадроциклах или джипах?",
   "a": "Рассчитывайте примерно на €77–82 с человека за 3–6 часов; объединить залив Лара, ущелье Авакас и Голубую лагуну в один день — самое выгодное приключение на острове. У надёжных операторов рейтинг 4.6–4.8 на сайтах отзывов — бронируйте в начале поездки."
  }
 },
 "waterparks": {
  "el": {
   "q": "Ποιο είναι το καλύτερο υδάτινο πάρκο και ποιες είναι οι τιμές των εισιτηρίων;",
   "a": "Το WaterWorld στην Αγία Νάπα έχει θέμα την ελληνική μυθολογία και είναι ένα από τα μεγαλύτερα της Ευρώπης, με περίπου €49 ο ενήλικας και €32 το παιδί· το Aphrodite στην Πάφο κοστίζει €36 και €20· το Fasouri Watermania στη Λεμεσό περίπου €35. Η σεζόν διαρκεί χοντρικά από τον Μάιο έως τον Οκτώβριο — μην διασχίσετε όλο το νησί για ένα από αυτά."
  },
  "ro": {
   "q": "Care este cel mai bun parc acvatic și cât costă biletele?",
   "a": "WaterWorld din Ayia Napa are tema mitologiei grecești și este unul dintre cele mai mari din Europa, la circa €49 adult și €32 copil; Aphrodite din Paphos costă €36 și €20; Fasouri Watermania din Limassol este circa €35. Sezonul ține aproximativ din mai până în octombrie — nu traversa insula cu mașina doar pentru unul dintre ele."
  },
  "ar": {
   "q": "ما أفضل مدينة مائية وكم تبلغ أسعار التذاكر؟",
   "a": "مدينة WaterWorld المائية في أيا نابا مستوحاة من الأساطير اليونانية وهي من أكبر مدن أوروبا المائية، بنحو €49 للبالغ و€32 للطفل؛ وAphrodite في بافوس €36 و€20؛ وFasouri Watermania في ليماسول نحو €35. ويمتدّ الموسم من مايو إلى أكتوبر تقريباً؛ ولا تقطع الجزيرة بالسيارة من أجل واحدة فقط."
  },
  "de": {
   "q": "Welcher ist der beste Wasserpark und was kosten die Tickets?",
   "a": "WaterWorld in Ayia Napa steht ganz im Zeichen der griechischen Mythologie und zählt zu den größten Europas, bei etwa €49 für Erwachsene und €32 für Kinder; Aphrodite in Paphos kostet €36 und €20; Fasouri Watermania in Limassol etwa €35. Die Saison dauert ungefähr von Mai bis Oktober – fahren Sie dafür nicht quer über die Insel."
  },
  "pl": {
   "q": "Który park wodny jest najlepszy i ile kosztują bilety?",
   "a": "WaterWorld w Ayia Napa jest utrzymany w klimacie mitologii greckiej i należy do największych w Europie — około €49 za osobę dorosłą i €32 za dziecko; Aphrodite w Pafos to €36 i €20; Fasouri Watermania w Limassol około €35. Sezon trwa mniej więcej od maja do października — nie warto jechać przez pół wyspy dla jednego."
  },
  "ru": {
   "q": "Какой аквапарк лучший и сколько стоят билеты?",
   "a": "WaterWorld в Айя-Напе оформлен в стиле греческой мифологии и входит в число крупнейших в Европе: около €49 за взрослого и €32 за ребёнка; Aphrodite в Пафосе — €36 и €20; Fasouri Watermania в Лимасоле — около €35. Сезон длится примерно с мая по октябрь — не стоит ради него ехать через весь остров."
  }
 },
 "wine-halloumi-day": {
  "el": {
   "q": "Μπορώ να κάνω μια οινική περιήγηση ή μια ημέρα παρασκευής χαλουμιού από το θέρετρό μου;",
   "a": "Ναι — οι εκδρομές μικρών γκρουπ κοστίζουν περίπου €116–139 από πόρτα σε πόρτα, μέσα από τα Κρασοχώρια και τη διαδρομή της Κομανδαρίας, ή ως μια πρακτική ημέρα παρασκευής χαλουμιού και αναρής. Κλείστε μία με παραλαβή από το ξενοδοχείο ώστε να μπορούν όλοι να δοκιμάσουν· είναι η κατεξοχήν πιο κυπριακή ήπια εμπειρία."
  },
  "ro": {
   "q": "Pot face un tur al vinurilor sau o zi de preparare a halloumiului plecând din stațiune?",
   "a": "Da — tururile în grupuri mici costă circa €116–139 din poartă în poartă, prin satele viticole Krasochoria și pe ruta Commandaria, sau ca o zi practică de preparat halloumi și anari. Rezervă unul cu preluare de la hotel, ca toată lumea să poată degusta; este cea mai cipriotă experiență relaxată."
  },
  "ar": {
   "q": "هل يمكنني القيام بجولة نبيذ أو يوم لصناعة الحلوم انطلاقاً من منتجعي؟",
   "a": "نعم؛ تُنظَّم جولات لمجموعات صغيرة بنحو €116–139 من الباب إلى الباب عبر قرى النبيذ في كراسوخوريا وطريق Commandaria، أو كيوم عملي لصناعة الحلوم والأناري. احجز جولة تتضمّن الاصطحاب من الفندق كي يتمكّن الجميع من التذوّق؛ فهي أكثر التجارب القبرصية الهادئة أصالةً."
  },
  "de": {
   "q": "Kann ich von meinem Urlaubsort aus eine Weintour oder einen Tag zur Halloumi-Herstellung unternehmen?",
   "a": "Ja – Touren in kleinen Gruppen kosten etwa €116–139 von Tür zu Tür durch die Weindörfer der Krasochoria und entlang der Commandaria-Route oder als praxisnaher Tag rund um Halloumi und Anari. Buchen Sie eine mit Hotelabholung, damit alle verkosten können; es ist das zypriotischste aller sanften Erlebnisse."
  },
  "pl": {
   "q": "Czy z mojego kurortu można wybrać się na wycieczkę winiarską albo dzień z wyrobem halloumi?",
   "a": "Tak — wycieczki w małych grupach kosztują około €116–139 z dojazdem od drzwi do drzwi, wiodąc przez winiarskie wsie Krasochoria i szlak Commandarii, albo jako praktyczny dzień z halloumi i anari. Wybierz opcję z odbiorem z hotelu, żeby każdy mógł degustować; to najbardziej cypryjskie z łagodnych doświadczeń."
  },
  "ru": {
   "q": "Можно ли съездить на винный тур или на день приготовления халуми прямо с курорта?",
   "a": "Да — туры в мини-группах стоят около €116–139 «от двери до двери» по винным деревням Красохория и маршруту Коммандарии либо как день собственноручного приготовления халуми и анари. Выбирайте тур с трансфером от отеля, чтобы все могли продегустировать; это самое «кипрское» неспешное впечатление из возможных."
  }
 },
 "paragliding": {
  "el": {
   "q": "Πού μπορώ να κάνω tandem parapente (αλεξίπτωτο πλαγιάς) και πόσο κοστίζει;",
   "a": "Η σκηνή εδώ είναι μικρότερη: οι διπλές πτήσεις γίνονται κοντά στους γκρεμούς της Επισκοπής και του Κουρίου και στο Τρόοδος, περίπου €90–150 (επιβεβαιώστε κατά την κράτηση), με 15–20 λεπτά πτήσης, για ηλικίες περίπου 12–70 και με όρια βάρους. Εξαρτάται απόλυτα από τον καιρό, γι' αυτό κλείστε νωρίς στη διαμονή σας ώστε να έχετε περιθώριο για επαναπρογραμματισμό, και ελέγξτε ότι η ασφάλειά σας καλύπτει το tandem parapente."
  },
  "ro": {
   "q": "Unde pot face parapantă în tandem și cât costă?",
   "a": "Este o nișă mai restrânsă: zborurile în tandem se fac lângă falezele Episkopi și Kourion și în Troodos, aproximativ €90–150 (confirmă la rezervare), cu 15–20 de minute de zbor, vârste între circa 12 și 70 de ani și limite de greutate. Depinde în totalitate de vreme, așa că rezervă la începutul sejurului ca să ai zile de rezervă pentru reprogramare și verifică dacă asigurarea ta acoperă parapanta în tandem."
  },
  "ar": {
   "q": "أين يمكنني ممارسة الطيران المظلي الثنائي وكم يكلّف؟",
   "a": "هذا المجال أصغر حجماً: تنطلق الرحلات الثنائية قرب منحدرات إبيسكوبي وكوريون وترودوس، بنحو €90–150 (يُؤكَّد عند الحجز)، بمدة تحليق 15–20 دقيقة، للأعمار من 12–70 تقريباً مع حدود للوزن. وهو معتمد كلياً على الطقس، فاحجز في وقت مبكّر من إقامتك لتبقى لديك أيام لإعادة الحجز، وتأكّد من أن تأمينك يغطّي الطيران المظلي الثنائي."
  },
  "de": {
   "q": "Wo kann ich Tandem-Gleitschirmfliegen und was kostet es?",
   "a": "Es ist eine kleinere Szene: Tandemflüge werden nahe den Klippen von Episkopi und Kourion sowie im Troodos-Gebirge angeboten, für rund €90–150 (bei der Buchung bestätigen lassen), mit 15–20 Minuten Flugzeit, für ein Alter von etwa 12–70 Jahren und mit Gewichtsgrenzen. Es hängt vollständig vom Wetter ab, buchen Sie also früh in Ihrem Aufenthalt, um Ausweichtage für eine Neubuchung zu haben, und prüfen Sie, ob Ihre Versicherung Tandem-Gleitschirmfliegen abdeckt."
  },
  "pl": {
   "q": "Gdzie można polecieć na paralotni w tandemie i ile to kosztuje?",
   "a": "To niszowa scena: loty w tandemie odbywają się w pobliżu klifów Episkopi i Kourion oraz w Troodos, orientacyjnie €90–150 (potwierdź przy rezerwacji), z 15–20 minutami w powietrzu, dla osób w wieku mniej więcej 12–70 lat i z limitami wagowymi. Wszystko zależy od pogody, więc rezerwuj na początku pobytu, żeby mieć zapas dni na ewentualną zmianę terminu, i sprawdź, czy twoje ubezpieczenie obejmuje paralotniarstwo w tandemie."
  },
  "ru": {
   "q": "Где можно полетать на параплане в тандеме и сколько это стоит?",
   "a": "Это направление скромнее: тандемные полёты проходят у скал Эпископи и Куриона и в Троодосе, примерно €90–150 (уточняйте при бронировании), с 15–20 минутами в воздухе, для возраста примерно 12–70 лет и с ограничениями по весу. Всё полностью зависит от погоды, поэтому бронируйте в начале поездки, чтобы оставить запас дней на перенос, и проверьте, покрывает ли ваша страховка тандемный парапланеризм."
  }
 },
 "golf": {
  "el": {
   "q": "Πού μπορώ να παίξω γκολφ στην Κύπρο;",
   "a": "Τα κύρια γήπεδα είναι τα Aphrodite Hills (PGA National), Elea (Nick Faldo), Minthis και Secret Valley, με τέλη εισόδου (green fees) περίπου €60–180 και το αμαξίδιο (buggy) συνήθως επιπλέον. Η καλύτερη σεζόν για γκολφ είναι από το φθινόπωρο έως την άνοιξη — παίξτε στην ενδιάμεση περίοδο για τις τιμές και τον καιρό."
  },
  "ro": {
   "q": "Unde pot juca golf în Cipru?",
   "a": "Principalele terenuri sunt Aphrodite Hills (PGA National), Elea (Nick Faldo), Minthis și Secret Valley, cu green fees de circa €60–180 și, de regulă, cu voiturette (buggy) plătit separat. Cel mai bun sezon de golf este de toamna până primăvara — joacă în extrasezon, pentru tarife și vreme."
  },
  "ar": {
   "q": "أين يمكنني لعب الغولف في قبرص؟",
   "a": "الملاعب الرئيسية هي Aphrodite Hills (PGA National) وElea (تصميم Nick Faldo) وMinthis وSecret Valley، برسوم لعب تبلغ نحو €60–180، وعادةً ما تُحتسَب عربة الغولف إضافةً. وأفضل مواسم الغولف من الخريف إلى الربيع؛ فالعب في موسم الذروة الجانبي للحصول على أسعار أفضل وطقس ألطف."
  },
  "de": {
   "q": "Wo kann ich auf Zypern Golf spielen?",
   "a": "Die wichtigsten Plätze sind Aphrodite Hills (PGA National), Elea (Nick Faldo), Minthis und Secret Valley, mit Greenfees von etwa €60–180 und einem meist zusätzlichen Buggy. Die beste Golfsaison reicht vom Herbst bis zum Frühling – spielen Sie in der Nebensaison, der Preise und des Wetters wegen."
  },
  "pl": {
   "q": "Gdzie na Cyprze można zagrać w golfa?",
   "a": "Główne pola to Aphrodite Hills (PGA National), Elea (projekt Nicka Faldo), Minthis i Secret Valley, z green fee około €60–180 i zwykle dodatkowo płatnym wózkiem. Najlepszy sezon golfowy trwa od jesieni do wiosny — graj poza szczytem sezonu, dla lepszych cen i pogody."
  },
  "ru": {
   "q": "Где на Кипре можно поиграть в гольф?",
   "a": "Основные поля — Aphrodite Hills (PGA National), Elea (Ник Фалдо), Minthis и Secret Valley; грин-фи составляет около €60–180, а гольф-кар обычно оплачивается отдельно. Лучший гольф-сезон — с осени до весны; играйте в межсезонье ради выгодных тарифов и приятной погоды."
  }
 },
 "villages-day-trip": {
  "el": {
   "q": "Ποιο χωριό του Τροόδους είναι το καλύτερο για μια ημερήσια εκδρομή από την πόλη μου;",
   "a": "Ο Όμοδος είναι ένα καλντεριμένιο κρασοχώρι με μοναστήρι· η Κακοπετριά έχει μεσαιωνικό παλιό πυρήνα και ταβέρνες με πέστροφα· ο Καλοπαναγιώτης έχει ιαματικές πηγές και έχει αναδειχθεί ένα από τα «Καλύτερα Χωριά» του ΟΗΕ· το Λόφου και η Λάνια είναι υπέροχα αναστηλωμένα πέτρινα χωριά· τα Πεδουλά φημίζονται για τα κεράσια τους· ο Φικάρδου είναι ένα σχεδόν εγκαταλελειμμένο προστατευόμενο μνημείο. Επιλέξτε με βάση το θέμα — κρασί, χειροτεχνία, πεζοπορία ή δροσιά το καλοκαίρι — και με βάση την πόλη από την οποία ξεκινάτε."
  },
  "ro": {
   "q": "Care sat din Troodos este cel mai potrivit pentru o excursie de o zi din orașul meu?",
   "a": "Omodos este un sat viticol cu străzi pietruite și o mănăstire; Kakopetria are un centru vechi medieval și taverne cu păstrăv; Kalopanayiotis are izvoare termale și este desemnat de ONU drept „cel mai bun sat”; Lofou și Lania sunt sate de piatră frumos restaurate; Pedoulas este renumit pentru cireșe; Fikardou este un monument protejat aproape părăsit. Alege în funcție de temă — vin, meșteșuguri, drumeții sau răcoare vara — și de orașul din care pleci cu mașina."
  },
  "ar": {
   "q": "أي قرية في ترودوس هي الأفضل لرحلة يوم واحد من مدينتي؟",
   "a": "أوموذوس قرية نبيذ مرصوفة بالحصى وفيها دير؛ وكاكوبيتريا فيها بلدة قديمة من العصور الوسطى ومطاعم تقليدية لسمك السلمون المرقّط؛ وكالوباناييوتيس فيها ينابيع حارّة وقد صُنّفت ضمن أفضل قرى العالم لدى الأمم المتحدة؛ ولوفو ولانيا قريتان حجريتان مُرمَّمتان بجمال؛ وبيذولاس تشتهر بالكرز؛ وفيكاردو نصب محميّ شبه مهجور. اختر حسب الطابع — النبيذ أو الحِرَف أو المشي أو الاعتدال صيفاً — وحسب المدينة التي تنطلق منها بالسيارة."
  },
  "de": {
   "q": "Welches Troodos-Dorf eignet sich am besten für einen Tagesausflug von meinem Ort aus?",
   "a": "Omodos ist ein kopfsteingepflastertes Weindorf mit Kloster; Kakopetria hat eine mittelalterliche Altstadt und Forellentavernen; Kalopanayiotis verfügt über Thermalquellen und ist ein „UN Best Village“; Lofou und Lania sind wunderschön restaurierte Steindörfer; Pedoulas ist für seine Kirschen bekannt; Fikardou ist ein nahezu verlassenes, denkmalgeschütztes Dorf. Wählen Sie nach Thema – Wein, Kunsthandwerk, Wandern oder Kühle im Sommer – und danach, von welchem Ort aus Sie anreisen."
  },
  "pl": {
   "q": "Która wieś w Troodos najlepiej nadaje się na jednodniową wycieczkę z mojego miasta?",
   "a": "Omodos to brukowana winiarska wieś z klasztorem; Kakopetria ma średniowieczną starówkę i taverny z pstrągiem; Kalopanayiotis ma źródła termalne i tytuł Najlepszej Wsi wg ONZ; Lofou i Lania to pięknie odrestaurowane kamienne wsie; Pedoulas słynie z czereśni; Fikardou to niemal opuszczony, objęty ochroną zabytek. Wybieraj według motywu — wino, rękodzieło, wędrówki czy chłód latem — oraz według tego, z którego miasta jedziesz."
  },
  "ru": {
   "q": "Какая деревня Троодоса лучше всего подходит для однодневной поездки из моего города?",
   "a": "Омодос — винная деревня с мощёными улочками и монастырём; в Какопетрии есть средневековый старый город и таверны с форелью; Калопанайиотис славится термальными источниками и признан ООН одной из лучших деревень; Лофу и Лания — прекрасно отреставрированные каменные деревни; Педулас известен черешней; Фикарду — почти заброшенный памятник под охраной. Выбирайте по теме — вино, ремёсла, походы или прохлада летом — и по тому, из какого города вы едете."
  }
 },
 "painted-churches": {
  "el": {
   "q": "Πώς μπορώ πραγματικά να μπω στις αγιογραφημένες εκκλησίες της UNESCO;",
   "a": "Υπάρχουν δέκα αγιογραφημένες βυζαντινές εκκλησίες στο Τρόοδος με τοιχογραφίες παγκόσμιας κλάσης του 11ου–16ου αιώνα. Η παγίδα που συναντούν οι τουρίστες είναι ότι πολλές παραμένουν κλειδωμένες και ανοίγουν από τον κλειδοκράτορα του χωριού — ντυθείτε σεμνά, να περιμένετε κανόνες περί μη χρήσης φλας ή απαγόρευσης φωτογραφιών, και αφήστε μια μικρή δωρεά. Σχεδιάστε μια διαδρομή με δικό σας αυτοκίνητο μέσα από τη Σολέα, τη Μαραθάσα και την Πιτσιλιά και ρωτήστε στο χωριό για τον κλειδοκράτορα."
  },
  "ro": {
   "q": "Cum ajung, de fapt, în interiorul bisericilor pictate din patrimoniul UNESCO?",
   "a": "În Troodos există zece biserici bizantine pictate, cu fresce de clasă mondială din secolele XI–XVI. Piedica de care se lovesc turiștii este că multe sunt ținute încuiate și deschise de un păstrător al cheii din sat — îmbracă-te modest, așteaptă-te la reguli de tipul fără bliț sau fără fotografiat și lasă o mică donație. Planifică un traseu circular cu mașina prin Solea, Marathasa și Pitsilia și întreabă în sat de păstrătorul cheii."
  },
  "ar": {
   "q": "كيف أدخل فعلياً إلى الكنائس المزخرفة المدرجة في قائمة اليونسكو؟",
   "a": "توجد عشر كنائس بيزنطية مزخرفة في ترودوس بجدارياتٍ عالمية المستوى تعود إلى القرون من الحادي عشر إلى السادس عشر. والمأزق الذي يواجهه السيّاح أن كثيراً منها يبقى مغلقاً ويفتحه حامل المفتاح في القرية؛ فارتدِ ملابس محتشمة، وتوقّع قواعد تمنع التصوير بالفلاش أو التصوير مطلقاً، واترك تبرّعاً بسيطاً. خطّط لجولة بسيارتك عبر سوليا ومراثاسا وبيتسيليا، واسأل في القرية عن حامل المفتاح."
  },
  "de": {
   "q": "Wie komme ich tatsächlich in die bemalten UNESCO-Kirchen hinein?",
   "a": "Im Troodos-Gebirge gibt es zehn bemalte byzantinische Kirchen mit Fresken von Weltrang aus dem 11. bis 16. Jahrhundert. Der Haken, auf den Touristen stoßen: Viele sind verschlossen und werden von einem Schlüsselverwalter im Dorf geöffnet – kleiden Sie sich dezent, rechnen Sie mit Blitz- oder Fotografierverboten und hinterlassen Sie eine kleine Spende. Planen Sie eine Rundfahrt auf eigene Faust durch Solea, Marathasa und Pitsilia und fragen Sie im Dorf nach dem Schlüsselverwalter."
  },
  "pl": {
   "q": "Jak właściwie dostać się do wnętrza malowanych cerkwi z listy UNESCO?",
   "a": "W Troodos znajduje się dziesięć malowanych cerkwi bizantyjskich ze światowej klasy freskami z XI–XVI wieku. Haczyk, na który natrafiają turyści, polega na tym, że wiele z nich jest zamkniętych i otwiera je wiejski opiekun z kluczem — ubierz się skromnie, licz się z zakazem fotografowania lub używania flesza i zostaw drobny datek. Zaplanuj własną trasę samochodem przez Solea, Marathasa i Pitsilia, a we wsi zapytaj o osobę z kluczem."
  },
  "ru": {
   "q": "Как на самом деле попасть внутрь расписных церквей из списка ЮНЕСКО?",
   "a": "В Троодосе десять расписных византийских церквей с фресками мирового уровня XI–XVI веков. Загвоздка, с которой сталкиваются туристы, в том, что многие из них закрыты и их открывает деревенский хранитель ключей — одевайтесь скромно, будьте готовы к запрету на вспышку или на съёмку и оставьте небольшое пожертвование. Спланируйте самостоятельный автомаршрут через Солеа, Марафасу и Пицилию и спросите в деревне, где найти хранителя ключей."
  }
 },
 "monastery-etiquette": {
  "el": {
   "q": "Μπορούν οι γυναίκες να επισκεφθούν το Σταυροβούνι; Ποιος είναι ο ενδυματολογικός κώδικας των μοναστηριών;",
   "a": "Το Σταυροβούνι δέχεται μόνο άνδρες (κατά τον αγιορείτικο κανόνα) και δεν επιτρέπει φωτογράφιση. Αλλού ο κανόνας είναι σεμνό ντύσιμο — καλυμμένοι ώμοι και γόνατα, ενώ συχνά παρέχονται καλύμματα — καθώς και ησυχία, χωρίς φλας, και πολλά μοναστήρια κλείνουν 12:00–13:00 και το απόγευμα. Το να τα γνωρίζετε αυτά εκ των προτέρων σας γλιτώνει μια άσκοπη διαδρομή."
  },
  "ro": {
   "q": "Pot femeile să viziteze Stavrovouni? Care este ținuta obligatorie la mănăstire?",
   "a": "Stavrovouni primește doar bărbați (regula athonită) și nu permite fotografierea. În rest, regula este ținuta modestă — umeri și genunchi acoperiți, adesea se pun la dispoziție eșarfe — plus liniște, fără bliț, iar multe mănăstiri se închid între 12:00–13:00 și după-amiaza. Dacă știi asta dinainte, eviți un drum făcut degeaba."
  },
  "ar": {
   "q": "هل يمكن للنساء زيارة ستافروفوني؟ وما قواعد اللباس في الأديرة؟",
   "a": "دير ستافروفوني يسمح بدخول الرجال فقط (وفق القاعدة الآثوسية) ولا يسمح بالتصوير. وفي المواضع الأخرى القاعدة هي اللباس المحتشم — تغطية الكتفين والركبتين، وغالباً ما تُوفَّر أردية للفّها — إلى جانب الهدوء، ومنع الفلاش، كما يُغلق كثير من الأديرة أبوابه بين 12:00–13:00 وبعد الظهر. ومعرفة ذلك مسبقاً توفّر عليك رحلة بلا طائل."
  },
  "de": {
   "q": "Dürfen Frauen Stavrovouni besuchen? Wie lautet die Kleiderordnung im Kloster?",
   "a": "Stavrovouni lässt ausschließlich Männer ein (nach der Regel vom Berg Athos) und erlaubt kein Fotografieren. Andernorts gilt dezente Kleidung – Schultern und Knie bedeckt, Tücher werden häufig gestellt – dazu Ruhe, kein Blitz, und viele Klöster schließen von 12:00 bis 13:00 Uhr und am Nachmittag. Wer das im Voraus weiß, erspart sich eine vergebliche Fahrt."
  },
  "pl": {
   "q": "Czy kobiety mogą odwiedzać Stavrovouni? Jaki strój obowiązuje w klasztorach?",
   "a": "Stavrovouni wpuszcza wyłącznie mężczyzn (reguła atoska) i nie zezwala na fotografowanie. Gdzie indziej obowiązuje skromny strój — zakryte ramiona i kolana, chusty często są udostępniane na miejscu — a do tego cisza, zakaz flesza, a wiele klasztorów jest zamkniętych w godzinach 12:00–13:00 i po południu. Wiedza o tym z wyprzedzeniem oszczędza niepotrzebnego dojazdu."
  },
  "ru": {
   "q": "Могут ли женщины посещать Ставровуни? Какой в монастырях дресс-код?",
   "a": "Ставровуни пускает только мужчин (по афонскому уставу) и запрещает фотосъёмку. В остальных монастырях правило — скромная одежда: прикрытые плечи и колени, накидки часто выдают на месте — плюс тишина, без вспышки; многие монастыри закрыты с 12:00 до 13:00 и во второй половине дня. Знание этого заранее избавит от напрасной поездки."
  }
 },
 "orthodox-liturgy": {
  "el": {
   "q": "Πού μπορούν οι ορθόδοξοι επισκέπτες να παρακολουθήσουν λειτουργία και να προσκυνήσουν;",
   "a": "Οι μεγάλοι τόποι προσκυνήματος είναι ο Κύκκος (το πλουσιότερο μοναστήρι, με μια εικόνα που αποδίδεται στον Άγιο Λουκά και τον τάφο του Μακαρίου κοντά), το Μαχαιράς και το Σταυροβούνι (με τεμάχιο του Τιμίου Σταυρού). Υπάρχει μια ρωσική εκκλησία του Αγίου Νικολάου στη Λεμεσό και μια ρουμανική ορθόδοξη κοινότητα στη Λευκωσία — μια φυσική διαδρομή για το ρωσικό, ρουμανικό και ελληνικό κοινό μας."
  },
  "ro": {
   "q": "Unde pot vizitatorii ortodocși să participe la liturghie și să meargă în pelerinaj?",
   "a": "Marile locuri de pelerinaj sunt Kykkos (cea mai bogată mănăstire, cu o icoană atribuită Sfântului Luca și cu mormântul lui Makarios în apropiere), Machairas și Stavrovouni (o relicvă din Sfânta Cruce). Există o biserică rusească a Sfântului Nicolae în Limassol și o comunitate ortodoxă românească în Nicosia — un traseu firesc pentru publicul nostru rus, român și grec."
  },
  "ar": {
   "q": "أين يمكن للزوّار الأرثوذكس حضور القدّاس والذهاب للحجّ؟",
   "a": "أعظم مواقع الحجّ هي كيكوس (أغنى الأديرة، وفيه أيقونة تُنسَب إلى القديس لوقا، وقربه ضريح مكاريوس)، وماخيراس، وستافروفوني (وفيه ذخيرة من الصليب المقدّس). وهناك كنيسة روسية للقديس نيقولاوس في ليماسول، وجالية أرثوذكسية رومانية في نيقوسيا؛ وهو مسار طبيعي لجمهورنا الروسي والروماني واليوناني."
  },
  "de": {
   "q": "Wo können orthodoxe Besucher die Liturgie besuchen und auf Pilgerfahrt gehen?",
   "a": "Die großen Pilgerstätten sind Kykkos (das reichste Kloster, mit einer dem heiligen Lukas zugeschriebenen Ikone und dem nahe gelegenen Grab von Makarios), Machairas und Stavrovouni (eine Reliquie des Heiligen Kreuzes). In Limassol gibt es eine russische Nikolaus-Kirche und in Nikosia eine rumänisch-orthodoxe Gemeinde – eine naheliegende Route für unser russisches, rumänisches und griechisches Publikum."
  },
  "pl": {
   "q": "Gdzie prawosławni goście mogą uczestniczyć w liturgii i udać się na pielgrzymkę?",
   "a": "Wielkie miejsca pielgrzymkowe to Kykkos (najbogatszy klasztor, z ikoną przypisywaną św. Łukaszowi i grobem Makariosa w pobliżu), Machairas i Stavrovouni (relikwia Krzyża Świętego). W Limassol jest rosyjska cerkiew św. Mikołaja, a w Nikozji rumuńska wspólnota prawosławna — naturalny szlak dla naszej rosyjsko-, rumuńsko- i greckojęzycznej publiczności."
  },
  "ru": {
   "q": "Где православные гости могут побывать на литургии и совершить паломничество?",
   "a": "Главные места паломничества — Киккос (самый богатый монастырь, с иконой, приписываемой апостолу Луке, и гробницей Макария неподалёку), Махерас и Ставровуни (частица Животворящего Креста). В Лимасоле есть русская церковь Святителя Николая, а в Никосии — румынская православная община; это естественный маршрут для нашей русской, румынской и греческой аудитории."
  }
 },
 "stay-stone-house": {
  "el": {
   "q": "Μπορώ να μείνω σε ένα παραδοσιακό πέτρινο σπίτι (αγροτουρισμός);",
   "a": "Ναι — το επίσημο δίκτυο Αγροτουρισμού Κύπρου διαθέτει 150+ αναπαλαιωμένα πέτρινα σπίτια με σύγχρονες ανέσεις. Υπολογίστε περίπου €60–150 τη βραδιά για ένα τυπικό σπίτι, ή €150–400+ για boutique καταλύματα όπως το Casale Panayiotis στον Καλοπαναγιώτη. Είναι αυθεντικό, διαθέσιμο όλο τον χρόνο, και κατανέμει τις δαπάνες στα χωριά — ο φυσικός εμπορικός πυρήνας της πύλης."
  },
  "ro": {
   "q": "Pot să mă cazez într-o casă tradițională de piatră (agroturism)?",
   "a": "Da — rețeaua oficială Cyprus Agrotourism are peste 150 de case de piatră restaurate, cu confort modern. Pune la socoteală circa €60–150 pe noapte pentru o casă standard sau €150–400+ pentru locuri boutique precum Casale Panayiotis din Kalopanayiotis. Este autentic, disponibil tot anul și îndreaptă cheltuielile spre sate — nucleul comercial firesc al portalului."
  },
  "ar": {
   "q": "هل يمكنني الإقامة في بيت حجري تقليدي (السياحة الريفية)؟",
   "a": "نعم؛ تضمّ شبكة السياحة الريفية القبرصية الرسمية أكثر من 150 بيتاً حجرياً مُرمَّماً بوسائل الراحة الحديثة. خصّص نحو €60–150 لليلة للبيت العادي، أو €150–400+ للأماكن البوتيكية مثل Casale Panayiotis في كالوباناييوتيس. إنها تجربة أصيلة على مدار العام، وتوزّع الإنفاق على القرى؛ وهي القلب التجاري الطبيعي للبوابة."
  },
  "de": {
   "q": "Kann ich in einem traditionellen Steinhaus übernachten (Agrotourismus)?",
   "a": "Ja – das offizielle zypriotische Agrotourismus-Netzwerk umfasst über 150 restaurierte Steinhäuser mit modernem Komfort. Rechnen Sie mit etwa €60–150 pro Nacht für ein Standardhaus oder €150–400+ für Boutique-Unterkünfte wie das Casale Panayiotis in Kalopanayiotis. Es ist authentisch, ganzjährig verfügbar und verteilt die Ausgaben in die Dörfer – der natürliche kommerzielle Kern des Portals."
  },
  "pl": {
   "q": "Czy mogę zatrzymać się w tradycyjnym kamiennym domu (agroturystyka)?",
   "a": "Tak — oficjalna cypryjska sieć agroturystyki obejmuje ponad 150 odrestaurowanych kamiennych domów z nowoczesnymi wygodami. Zaplanuj około €60–150 za noc za dom standardowy lub €150–400+ za miejsca butikowe, takie jak Casale Panayiotis w Kalopanayiotis. To autentyczne, dostępne przez cały rok i rozprowadza wydatki po wsiach — naturalne komercyjne serce portalu."
  },
  "ru": {
   "q": "Можно ли остановиться в традиционном каменном доме (агротуризм)?",
   "a": "Да — в официальной сети Cyprus Agrotourism 150+ отреставрированных каменных домов с современным комфортом. Заложите около €60–150 за ночь за стандартный дом или €150–400+ за бутик-варианты вроде Casale Panayiotis в Калопанайиотисе. Это аутентично, круглый год и оставляет деньги в деревнях — естественная коммерческая основа портала."
  }
 },
 "festivals": {
  "el": {
   "q": "Ποιες γιορτές και φεστιβάλ γίνονται στις ημερομηνίες μου;",
   "a": "Οι κορυφαίες είναι το Φεστιβάλ Κρασιού της Λεμεσού (τέλη Σεπτεμβρίου με αρχές Οκτωβρίου), ο Κατακλυσμός (η μοναδικά κυπριακή γιορτή, τον Ιούνιο), το Φεστιβάλ Τριανταφύλλου του Αγρού (Μάιος), το Καρναβάλι της Λεμεσού (Φεβρουάριος–Μάρτιος) και το ορθόδοξο Πάσχα, καθώς και τα πανηγύρια των χωριών όλο το καλοκαίρι. Τα παρουσιάζουμε σε ένα ημερολόγιο εκδηλώσεων ανά περιοχή και ενδιαφέρον."
  },
  "ro": {
   "q": "Ce festivaluri au loc în perioada șederii mele?",
   "a": "Cele emblematice sunt Festivalul Vinului de la Limassol (de la sfârșitul lui septembrie până la începutul lui octombrie), Kataklysmos (festivalul potopului, unic în Cipru, în iunie), Festivalul Trandafirilor de la Agros (mai), Carnavalul de la Limassol (februarie–martie) și Paștele Ortodox, plus panigyria din sate pe tot parcursul verii. Le prezentăm sub forma unui calendar de evenimente, pe regiuni și interese."
  },
  "ar": {
   "q": "ما المهرجانات القائمة خلال تواريخ زيارتي؟",
   "a": "أبرزها مهرجان النبيذ في ليماسول (من أواخر سبتمبر إلى مطلع أكتوبر)، وكاتاكليسموس (مهرجان الطوفان القبرصي الفريد، في يونيو)، ومهرجان الورد في أغروس (مايو)، وكرنفال ليماسول (فبراير–مارس)، وعيد الفصح الأرثوذكسي، إضافةً إلى احتفالات القرى (البانِيغيريا) طوال الصيف. ونعرض هذه المناسبات في تقويم فعاليات مرتّب حسب المنطقة والاهتمام."
  },
  "de": {
   "q": "Welche Feste finden während meines Reisezeitraums statt?",
   "a": "Die Höhepunkte sind das Weinfest von Limassol (Ende September bis Anfang Oktober), Kataklysmos (das einzigartig zypriotische Flutfest, im Juni), das Rosenfest von Agros (Mai), der Karneval von Limassol (Februar–März) und das orthodoxe Osterfest, dazu den ganzen Sommer über die Dorf-Panigyria. Wir bündeln diese in einem Veranstaltungskalender nach Region und Interesse."
  },
  "pl": {
   "q": "Jakie festiwale odbywają się w terminie mojego pobytu?",
   "a": "Sztandarowe wydarzenia to Festiwal Wina w Limassol (od końca września do początku października), Kataklysmos (wyjątkowo cypryjskie święto potopu, w czerwcu), Festiwal Róż w Agros (maj), Karnawał w Limassol (luty–marzec) i prawosławna Wielkanoc, a do tego wiejskie panigyria przez całe lato. Prezentujemy je jako kalendarz wydarzeń według regionu i zainteresowań."
  },
  "ru": {
   "q": "Какие фестивали проходят в мои даты?",
   "a": "Главные из них — Лимасольский винный фестиваль (с конца сентября до начала октября), Катаклизмос (уникальный кипрский «праздник потопа», в июне), Фестиваль розы в Агросе (май), Лимасольский карнавал (февраль–март) и православная Пасха, а также деревенские панигирии всё лето. Мы собираем их в афишу событий по регионам и интересам."
  }
 },
 "mountain-taverna": {
  "el": {
   "q": "Πού βρίσκεται η καλύτερη αυθεντική ταβέρνα στα βουνά;",
   "a": "Ο χωριάτικος μεζές και το κλέφτικο (αρνί σιγοψημένο) υπερτερούν κάθε παραθαλάσσιας τουριστικής παγίδας — σκεφτείτε το Λόφου, την Κακοπετριά και τον Όμοδο, και το Ψηλό Δέντρο στους Πλάτρες για πέστροφα. Πηγαίνετε εκεί όπου το πάρκινγκ έχει αυτοκίνητα με ντόπιες πινακίδες παρά πούλμαν."
  },
  "ro": {
   "q": "Unde se află cea mai autentică tavernă din munți?",
   "a": "Mezeurile de la sat și kleftiko (miel copt îndelung, la cuptor) întrec orice capcană turistică de pe coastă — gândește-te la Lofou, Kakopetria și Omodos, iar pentru păstrăv la Psilo Dendro din Platres. Mergi acolo unde parcarea are mașini cu numere locale, nu autocare."
  },
  "ar": {
   "q": "أين أفضل مطعم تقليدي أصيل في الجبال؟",
   "a": "ميزة القرى والكليفتيكو (لحم الضأن المطهوّ ببطء) يتفوّقان على أي مصيدة سياحية ساحلية؛ فكّر في لوفو وكاكوبيتريا وأوموذوس، وPsilo Dendro في بلاتريس لسمك السلمون المرقّط. اذهب حيث تحمل السيارات في الموقف لوحات محلية لا حافلات سياحية."
  },
  "de": {
   "q": "Wo ist die beste authentische Taverne in den Bergen?",
   "a": "Dorf-Meze und Kleftiko (langsam gegartes Lamm) schlagen jede Touristenfalle an der Küste – denken Sie an Lofou, Kakopetria und Omodos sowie an Psilo Dendro in Platres für Forelle. Fahren Sie dorthin, wo auf dem Parkplatz einheimische Kennzeichen statt Reisebusse stehen."
  },
  "pl": {
   "q": "Gdzie w górach znaleźć najlepszą, autentyczną tavernę?",
   "a": "Wiejskie meze i kleftiko (długo pieczona jagnięcina) biją na głowę każdą nadmorską pułapkę na turystów — pomyśl o Lofou, Kakopetrii i Omodos, a po pstrąga wybierz się do Psilo Dendro w Platres. Jedź tam, gdzie na parkingu stoją auta na lokalnych tablicach, a nie autokary."
  },
  "ru": {
   "q": "Где в горах лучшая аутентичная таверна?",
   "a": "Деревенское мезе и клефтико (томлёная ягнятина) дадут фору любой прибрежной туристической ловушке — вспомните Лофу, Какопетрию и Омодос, а за форелью — Psilo Dendro в Платресе. Идите туда, где на парковке местные номера, а не туристические автобусы."
  }
 },
 "what-is-meze": {
  "el": {
   "q": "Τι είναι ο μεζές, και τι να παραγγείλω;",
   "a": "Ο μεζές είναι μια μακρά παρέλαση μικρών πιάτων — δεν παραγγέλνετε κυρίως πιάτο. Περιμένετε χαλούμι, ελιές, ταχίνι και ντιπ, σεφταλιά και σούβλα στα κάρβουνα, κλέφτικο και φρέσκο ψάρι. Ζητήστε ψαρομεζέ ή κρεατομεζέ, ελάτε πεινασμένοι και κρατήστε ρυθμό: 15–30 πιάτα είναι το φυσιολογικό, με περίπου €20–30 το άτομο."
  },
  "ro": {
   "q": "Ce este mezeul și ce ar trebui să comand?",
   "a": "Mezeul este o defilare lungă de feluri mici — nu comanzi feluri principale. Așteaptă-te la halloumi, măsline, tahini și diverse creme, sheftalia și souvla la grătar, kleftiko și pește proaspăt. Cere fish-meze (de pește) sau meat-meze (de carne), vino flămând și dozează-te: 15–30 de feluri este normal, la circa €20–30 de persoană."
  },
  "ar": {
   "q": "ما هي الميزة، وماذا ينبغي أن أطلب؟",
   "a": "الميزة موكب طويل من الأطباق الصغيرة؛ فأنت لا تطلب أطباقاً رئيسية. توقّع الحلوم والزيتون والطحينة والغموس، والشِفتاليا والسوفلا المشويّة، والكليفتيكو والسمك الطازج. اطلب ميزة السمك أو ميزة اللحم، واحضر جائعاً ووازِن بين الأطباق: 15–30 طبقاً أمر معتاد، بنحو €20–30 للشخص."
  },
  "de": {
   "q": "Was ist Meze, und was sollte ich bestellen?",
   "a": "Meze ist eine lange Parade kleiner Gerichte – Hauptgänge bestellen Sie nicht. Erwarten Sie Halloumi, Oliven, Tahini und Dips, gegrillte Sheftalia und Souvla, Kleftiko und frischen Fisch. Bitten Sie um Fisch-Meze oder Fleisch-Meze, kommen Sie hungrig und teilen Sie sich Ihre Kräfte ein: 15–30 Gerichte sind normal, für etwa €20–30 pro Person."
  },
  "pl": {
   "q": "Czym jest meze i co zamówić?",
   "a": "Meze to długa parada małych dań — nie zamawia się dań głównych. Spodziewaj się halloumi, oliwek, tahini i dipów, grillowanej sheftalii i souvli, kleftiko oraz świeżych ryb. Poproś o meze rybne lub mięsne, przyjdź głodny i miarkuj siły: 15–30 dań to norma, w cenie około €20–30 od osoby."
  },
  "ru": {
   "q": "Что такое мезе и что стоит заказать?",
   "a": "Мезе — это долгая череда маленьких блюд; основные блюда отдельно не заказывают. Ждите халуми, оливки, тахини и соусы-дипы, шефталью и сувлу на гриле, клефтико и свежую рыбу. Просите рыбное или мясное мезе, приходите голодными и распределяйте силы: 15–30 блюд — это норма, примерно по €20–30 с человека."
  }
 },
 "best-restaurants": {
  "el": {
   "q": "Ποια είναι τα καλύτερα εστιατόρια κοντά μου;",
   "a": "Επιμελούμαστε με κριτήρια πέρα από τα αστέρια: ψαρομεζέ στην ακτή, κρεατομεζέ στα βουνά, και τις κυπριακές κουζίνες νέας γενιάς της Λεμεσού και της Λευκωσίας. Φιλτράρετε τον κατάλογο ανά περιοχή, τιμή και περίσταση."
  },
  "ro": {
   "q": "Care sunt cele mai bune restaurante din apropierea mea?",
   "a": "Le selectăm după mai mult decât numărul de stele: fish meze pe coastă, meat meze la deal și bucătăriile cipriote de nouă generație din Limassol și Nicosia. Filtrează directorul după cartier, preț și ocazie."
  },
  "ar": {
   "q": "ما أفضل المطاعم القريبة مني؟",
   "a": "نختار بعناية بما يتجاوز تقييم النجوم: ميزة السمك على الساحل، وميزة اللحم في الجبال، والمطابخ القبرصية الحديثة في ليماسول ونيقوسيا. صفِّ الدليل حسب المنطقة والسعر والمناسبة."
  },
  "de": {
   "q": "Welches sind die besten Restaurants in meiner Nähe?",
   "a": "Wir kuratieren nach mehr als nur der Sterne-Bewertung: Fisch-Meze an der Küste, Fleisch-Meze in den Bergen und die neue Welle der zypriotischen Küche in Limassol und Nikosia. Filtern Sie das Verzeichnis nach Stadtteil, Preis und Anlass."
  },
  "pl": {
   "q": "Jakie są najlepsze restauracje w mojej okolicy?",
   "a": "Dobieramy je nie tylko według liczby gwiazdek: rybne meze na wybrzeżu, mięsne meze w górach oraz kuchnie nowej fali z Limassol i Nikozji. Filtruj katalog według dzielnicy, ceny i okazji."
  },
  "ru": {
   "q": "Какие лучшие рестораны рядом со мной?",
   "a": "Мы отбираем не только по звёздам: рыбное мезе на побережье, мясное мезе в горах и кухни новой кипрской волны в Лимасоле и Никосии. Фильтруйте каталог по району, цене и поводу."
  }
 },
 "taste-wine": {
  "el": {
   "q": "Πού μπορώ να δοκιμάσω κυπριακό κρασί;",
   "a": "Κατευθυνθείτε στα Κρασοχώρια (τα οινοχώρια της Λεμεσού) και στη διαδρομή της Κομανδαρίας. Boutique ονόματα που αξίζουν τη διαδρομή είναι τα Zambartas, Tsiakkas, Vlassides, Kyperounda, Vouni Panayia και Vasilikon· οι εμβληματικές ποικιλίες είναι το Ξυνιστέρι (λευκό) και το Μαραθεύτικο (κόκκινο), καθώς και η αρχαία γλυκιά Κομανδαρία. Οι γευσιγνωσίες κοστίζουν €8–42, οι πλήρεις περιηγήσεις €116–139."
  },
  "ro": {
   "q": "Unde pot degusta vinuri cipriote?",
   "a": "Îndreaptă-te spre Krasochoria (satele viticole din jurul Limassolului) și pe ruta Commandaria. Printre numele boutique care merită drumul se numără Zambartas, Tsiakkas, Vlassides, Kyperounda, Vouni Panayia și Vasilikon; soiurile emblematice sunt Xynisteri (alb) și Maratheftiko (roșu), plus vechiul vin dulce Commandaria. Degustările costă €8–42, tururile complete €116–139."
  },
  "ar": {
   "q": "أين يمكنني تذوّق النبيذ القبرصي؟",
   "a": "توجّه إلى كراسوخوريا (قرى النبيذ في ليماسول) وطريق Commandaria. ومن المصانع البوتيكية التي تستحقّ عناء الرحلة: Zambartas وTsiakkas وVlassides وKyperounda وVouni Panayia وVasilikon؛ والعنب المميّز هو Xynisteri (الأبيض) وMaratheftiko (الأحمر)، إضافةً إلى Commandaria الحلو العريق. وتتراوح جلسات التذوّق بين €8–42، والجولات الكاملة €116–139."
  },
  "de": {
   "q": "Wo kann ich zypriotischen Wein verkosten?",
   "a": "Fahren Sie in die Krasochoria (die Weindörfer von Limassol) und auf die Commandaria-Route. Zu den Boutique-Weingütern, für die sich die Fahrt lohnt, zählen Zambartas, Tsiakkas, Vlassides, Kyperounda, Vouni Panayia und Vasilikon; die charakteristischen Rebsorten sind Xynisteri (weiß) und Maratheftiko (rot), dazu der uralte süße Commandaria. Verkostungen kosten €8–42, komplette Touren €116–139."
  },
  "pl": {
   "q": "Gdzie skosztować cypryjskiego wina?",
   "a": "Udaj się do Krasochorii (winiarskich wsi wokół Limassol) i na szlak Commandarii. Butikowe nazwy warte przejażdżki to Zambartas, Tsiakkas, Vlassides, Kyperounda, Vouni Panayia i Vasilikon; sztandarowe szczepy to Xynisteri (białe) i Maratheftiko (czerwone), a do tego starożytna słodka Commandaria. Degustacje kosztują €8–42, pełne wycieczki €116–139."
  },
  "ru": {
   "q": "Где можно продегустировать кипрское вино?",
   "a": "Отправляйтесь в Красохорию (винные деревни Лимасола) и на маршрут Коммандарии. Бутиковые винодельни, ради которых стоит проехаться, — Zambartas, Tsiakkas, Vlassides, Kyperounda, Vouni Panayia и Vasilikon; фирменные сорта винограда — Ксинистери (белый) и Марафтико (красный), а также древняя сладкая Коммандария. Дегустации стоят €8–42, полноценные туры — €116–139."
  }
 },
 "diets": {
  "el": {
   "q": "Υπάρχουν χορτοφαγικές, halal ή kosher επιλογές;",
   "a": "Ο μεζές είναι από τη φύση του φιλικός προς τους χορτοφάγους (ζητήστε τον χορτοφαγικό μεζέ). Τα εστιατόρια και τα ξενοδοχεία με halal φαγητό συγκεντρώνονται στη Λεμεσό και τη Λευκωσία, ενώ η προσφορά kosher αυξάνεται με την ισραηλινή αγορά. Επισημαίνουμε τις διατροφικές επιλογές στις καταχωρίσεις."
  },
  "ro": {
   "q": "Există opțiuni vegetariene, halal sau cușer?",
   "a": "Mezeul este în mod natural prietenos cu vegetarienii (cere mezeul vegetarian). Restaurantele și hotelurile halal sunt concentrate în Limassol și Nicosia, iar oferta cușer crește odată cu piața israeliană. Marcăm opțiunile alimentare în listări."
  },
  "ar": {
   "q": "هل تتوفّر خيارات نباتية أو حلال أو كوشر؟",
   "a": "الميزة ملائمة للنباتيين بطبيعتها (اطلب الميزة النباتية). وتتركّز مطاعم وفنادق الحلال في ليماسول ونيقوسيا، وتتنامى خيارات الكوشر مع السوق الإسرائيلية. ونشير إلى الخيارات الغذائية في القوائم."
  },
  "de": {
   "q": "Gibt es vegetarische, halal oder koschere Optionen?",
   "a": "Meze ist von Natur aus vegetarierfreundlich (bitten Sie um das vegetarische Meze). Halal-Restaurants und -Hotels konzentrieren sich in Limassol und Nikosia, und das koschere Angebot wächst mit dem israelischen Markt. Wir kennzeichnen Ernährungsoptionen in den Einträgen."
  },
  "pl": {
   "q": "Czy są opcje wegetariańskie, halal lub koszerne?",
   "a": "Meze jest z natury przyjazne wegetarianom (poproś o meze wegetariańskie). Restauracje i hotele halal skupiają się w Limassol i Nikozji, a oferta koszerna rośnie wraz z rynkiem izraelskim. Oznaczamy opcje dietetyczne przy wpisach."
  },
  "ru": {
   "q": "Есть ли вегетарианские, халяльные или кошерные варианты?",
   "a": "Мезе само по себе дружелюбно к вегетарианцам (просите вегетарианское мезе). Халяльные заведения и отели сосредоточены в Лимасоле и Никосии, а кошерных предложений становится больше вместе с ростом израильского рынка. Мы отмечаем диетические опции в карточках заведений."
  }
 },
 "buy-property": {
  "el": {
   "q": "Να αγοράσω ακίνητο στην Κύπρο, και τι ισχύει με τους τίτλους ιδιοκτησίας;",
   "a": "Χρησιμοποιήστε έναν ανεξάρτητο δικηγόρο (όχι του κατασκευαστή) και επιβεβαιώστε ότι ο τίτλος ιδιοκτησίας είναι καθαρός και μεταβιβάσιμος πριν πληρώσετε — ιστορικά η υπ' αριθμόν ένα παγίδα. Από την 1η Ιανουαρίου 2026 τα τέλη χαρτοσήμανσης επί των ακινήτων καταργούνται, και μειωμένος ΦΠΑ 5% ισχύει για μια πρώτη κατοικία που πληροί τις προϋποθέσεις (με ανώτατο όριο βάσει μεγέθους και αξίας). Οι αγοραστές εκτός ΕΕ χρειάζονται τη συνήθη άδεια του Υπουργικού Συμβουλίου."
  },
  "ro": {
   "q": "Ar trebui să cumpăr o proprietate în Cipru și cum stă treaba cu actele de proprietate?",
   "a": "Apelează la un avocat independent (nu la cel al dezvoltatorului) și confirmă că actul de proprietate (title deed) este curat și transferabil înainte să plătești — din punct de vedere istoric, capcana numărul unu. De la 1 ianuarie 2026, taxa de timbru pe proprietate este eliminată, iar la o primă locuință care îndeplinește condițiile se aplică o TVA redusă de 5% (plafonată în funcție de suprafață și valoare). Cumpărătorii din afara UE au nevoie de o permisiune de rutină din partea Consiliului de Miniștri."
  },
  "ar": {
   "q": "هل ينبغي أن أشتري عقاراً في قبرص، وماذا عن سندات الملكية؟",
   "a": "استعن بمحامٍ مستقلّ (لا محامي المطوّر) وتأكّد من أن سند الملكية نظيف وقابل للنقل قبل أن تدفع؛ فهذا تاريخياً هو الفخّ الأول. واعتباراً من 1 يناير 2026 أُلغِيت رسوم الدمغة على العقارات، وتُطبَّق ضريبة قيمة مضافة مخفّضة قدرها 5% على المسكن الأول المؤهَّل (بحدٍّ أقصى من حيث المساحة والقيمة). ويحتاج المشترون من خارج الاتحاد الأوروبي إلى إذن روتيني من مجلس الوزراء."
  },
  "de": {
   "q": "Sollte ich auf Zypern eine Immobilie kaufen, und wie steht es um die Eigentumsurkunden?",
   "a": "Beauftragen Sie einen unabhängigen Anwalt (nicht den des Bauträgers) und stellen Sie vor der Zahlung sicher, dass die Eigentumsurkunde lastenfrei und übertragbar ist – historisch die Fehlerquelle Nummer eins. Ab dem 1. Januar 2026 entfällt die Stempelsteuer auf Immobilien, und für eine förderfähige Erstwohnung gilt ein ermäßigter MwSt.-Satz von 5% (nach Größe und Wert gedeckelt). Käufer von außerhalb der EU benötigen die routinemäßige Genehmigung des Ministerrats."
  },
  "pl": {
   "q": "Czy warto kupić nieruchomość na Cyprze i jak to jest z tytułami własności?",
   "a": "Skorzystaj z niezależnego prawnika (nie tego od dewelopera) i przed zapłatą upewnij się, że tytuł własności jest czysty i możliwy do przeniesienia — historycznie to pułapka numer jeden. Od 1 stycznia 2026 zniesiono opłatę skarbową od nieruchomości, a do kwalifikującego się pierwszego domu stosuje się obniżony VAT 5% (z limitem powierzchni i wartości). Kupujący spoza UE potrzebują rutynowej zgody Rady Ministrów."
  },
  "ru": {
   "q": "Стоит ли покупать недвижимость на Кипре и как быть с титулами собственности?",
   "a": "Обращайтесь к независимому юристу (не к юристу застройщика) и до оплаты убедитесь, что титул собственности чист и может быть передан, — исторически это ловушка номер один. С 1 января 2026 года гербовый сбор на недвижимость отменён, а к соответствующему условиям первому жилью применяется сниженный НДС 5% (с ограничением по площади и стоимости). Покупателям не из ЕС нужно стандартное разрешение Совета министров."
  }
 },
 "build-house": {
  "el": {
   "q": "Πόσο κοστίζει να χτίσω ένα σπίτι στην Κύπρο;",
   "a": "Χοντρικά €1,200–2,000+ ανά m² ανάλογα με τις προδιαγραφές και τα φινιρίσματα, συν το οικόπεδο, τον αρχιτέκτονα (περίπου 8–12% του κόστους κατασκευής), τις άδειες και τις συνδέσεις κοινής ωφέλειας· υπολογίστε 12–18 μήνες. Κλείστε ένα συμβόλαιο σταθερής τιμής με τμηματικές πληρωμές συνδεδεμένες με ορόσημα."
  },
  "ro": {
   "q": "Cât costă construcția unei case în Cipru?",
   "a": "Aproximativ €1,200–2,000+ pe m², în funcție de specificații și finisaje, la care se adaugă terenul, arhitectul (circa 8–12% din valoarea construcției), autorizațiile și racordurile la utilități; prevede 12–18 luni. Încheie un contract cu preț fix, cu plăți eșalonate legate de etapele lucrării."
  },
  "ar": {
   "q": "كم تكلّف بناء منزل في قبرص؟",
   "a": "تقديرياً €1,200–2,000+ لكل متر مربّع بحسب المواصفات والتشطيب، إضافةً إلى الأرض، والمهندس المعماري (نحو 8–12% من قيمة البناء)، والتراخيص وتوصيلات المرافق؛ واحسب مدة 12–18 شهراً. واحصل على عقد بسعر ثابت مع دفعات مرحلية مرتبطة بإنجاز المراحل."
  },
  "de": {
   "q": "Wie viel kostet es, auf Zypern ein Haus zu bauen?",
   "a": "Grob €1,200–2,000+ pro m² je nach Ausstattung und Ausbaustandard, hinzu kommen Grundstück, Architekt (etwa 8–12% der Bausumme), Genehmigungen und Versorgungsanschlüsse; planen Sie 12–18 Monate ein. Schließen Sie einen Festpreisvertrag mit an Meilensteine geknüpften Teilzahlungen ab."
  },
  "pl": {
   "q": "Ile kosztuje budowa domu na Cyprze?",
   "a": "Z grubsza €1,200–2,000+ za m² w zależności od standardu i wykończenia, plus działka, architekt (około 8–12% wartości budowy), pozwolenia i przyłącza; przewidź 12–18 miesięcy. Zawrzyj umowę z ceną stałą i płatnościami etapowymi powiązanymi z kamieniami milowymi."
  },
  "ru": {
   "q": "Сколько стоит построить дом на Кипре?",
   "a": "Ориентировочно €1,200–2,000+ за m² в зависимости от спецификации и отделки, плюс земля, архитектор (около 8–12% от стоимости строительства), разрешения и подключение коммуникаций; закладывайте 12–18 месяцев. Заключайте договор с фиксированной ценой и поэтапной оплатой, привязанной к контрольным точкам."
  }
 },
 "renting": {
  "el": {
   "q": "Τι ισχύει συνήθως για μια μακροχρόνια ενοικίαση;",
   "a": "Ενδεικτικά μηνιαία εύρη για ένα διαμέρισμα δύο υπνοδωματίων: Πάφος και Λάρνακα €800–1,300, Λεμεσός €1,300–2,200+, Λευκωσία €900–1,400 — η Λεμεσός είναι μακράν η ακριβότερη. Περιμένετε προκαταβολή ενός μήνα, γραπτό συμβόλαιο και υποχρέωση δήλωσής του. Το Bazaraki είναι η κύρια ιστοσελίδα αγγελιών."
  },
  "ro": {
   "q": "Ce este obișnuit pentru o închiriere pe termen lung?",
   "a": "Intervale lunare orientative pentru un apartament cu două dormitoare: Paphos și Larnaca €800–1,300, Limassol €1,300–2,200+, Nicosia €900–1,400 — Limassol este de departe cel mai scump. Așteaptă-te la o garanție de o lună, la un contract scris și la înregistrarea acestuia. Bazaraki este principalul site de anunțuri."
  },
  "ar": {
   "q": "ما المعتاد في الإيجار طويل الأجل؟",
   "a": "نطاقات شهرية تقريبية لشقة بغرفتَي نوم: بافوس ولارنكا €800–1,300، وليماسول €1,300–2,200+، ونيقوسيا €900–1,400؛ وليماسول هي الأغلى بفارق كبير. توقّع دفع تأمين بقيمة إيجار شهر واحد، وعقداً مكتوباً، وتسجيله. وBazaraki هو الموقع الرئيسي للإعلانات."
  },
  "de": {
   "q": "Was ist bei einer langfristigen Miete üblich?",
   "a": "Grobe monatliche Spannen für eine Wohnung mit zwei Schlafzimmern: Paphos und Larnaka €800–1,300, Limassol €1,300–2,200+, Nikosia €900–1,400 – Limassol ist mit Abstand am teuersten. Rechnen Sie mit einer Monatskaution, einem schriftlichen Vertrag und dessen Registrierung. Bazaraki ist die wichtigste Anzeigenplattform."
  },
  "pl": {
   "q": "Jak wygląda typowy najem długoterminowy?",
   "a": "Orientacyjne miesięczne widełki za mieszkanie z dwiema sypialniami: Pafos i Larnaka €800–1,300, Limassol €1,300–2,200+, Nikozja €900–1,400 — Limassol jest zdecydowanie najdroższe. Licz się z kaucją w wysokości jednego czynszu, pisemną umową i koniecznością jej rejestracji. Bazaraki to główny serwis ogłoszeniowy."
  },
  "ru": {
   "q": "Что типично для долгосрочной аренды?",
   "a": "Ориентировочные месячные диапазоны для квартиры с двумя спальнями: Пафос и Ларнака — €800–1,300, Лимасол — €1,300–2,200+, Никосия — €900–1,400; Лимасол безусловно самый дорогой. Готовьтесь к депозиту в размере одной месячной платы, письменному договору и его регистрации. Bazaraki — главный сайт объявлений."
  }
 },
 "furnish": {
  "el": {
   "q": "Πώς επιπλώνω ένα σπίτι — πού αγοράζω έπιπλα και οικιακές συσκευές;",
   "a": "Η IKEA (Λευκωσία και Λεμεσός, με παράδοση σε όλο το νησί), η JYSK, το Superhome Center και τα τοπικά εκθετήρια καλύπτουν τα καινούργια· το Bazaraki είναι τεράστιο για ποιοτικά μεταχειρισμένα. Προγραμματίστε τις μεγάλες αγορές γύρω από τις εκπτώσεις και συνυπολογίστε την παράδοση και τη συναρμολόγηση."
  },
  "ro": {
   "q": "Cum îmi mobilez locuința — de unde cumpăr mobilă și electrocasnice?",
   "a": "IKEA (Nicosia și Limassol, cu livrare în toată insula), JYSK, Superhome Center și showroom-urile locale acoperă produsele noi; Bazaraki este uriaș pentru second-hand de calitate. Programează-ți achizițiile mari în perioada reducerilor și ia în calcul livrarea și montajul."
  },
  "ar": {
   "q": "كيف أؤثّث مسكناً — أين أشتري الأثاث والأجهزة؟",
   "a": "IKEA (في نيقوسيا وليماسول، مع توصيل يشمل الجزيرة كلها) وJYSK وSuperhome Center وصالات العرض المحلية تغطّي الجديد؛ وBazaraki ضخم للمستعمل الجيّد. وقّت مشترياتك الكبيرة مع فترات التخفيضات، واحسب حساب التوصيل والتركيب."
  },
  "de": {
   "q": "Wie richte ich eine Wohnung ein – wo kaufe ich Möbel und Haushaltsgeräte?",
   "a": "IKEA (Nikosia und Limassol, mit inselweiter Lieferung), JYSK, Superhome Center und lokale Ausstellungsräume decken den Neukauf ab; Bazaraki ist riesig für gebrauchte Qualitätsware. Legen Sie größere Anschaffungen in die Schlussverkaufszeiten und kalkulieren Sie Lieferung und Aufbau ein."
  },
  "pl": {
   "q": "Jak umeblować mieszkanie — gdzie kupić meble i sprzęt AGD?",
   "a": "IKEA (Nikozja i Limassol, z dostawą na całą wyspę), JYSK, Superhome Center i lokalne salony pokrywają nowe rzeczy; Bazaraki to potęga, jeśli chodzi o dobrej jakości rzeczy używane. Duże zakupy planuj wokół wyprzedaży i uwzględnij dostawę oraz montaż."
  },
  "ru": {
   "q": "Как обставить жильё — где купить мебель и бытовую технику?",
   "a": "За новым — IKEA (Никосия и Лимасол, с доставкой по всему острову), JYSK, Superhome Center и местные шоурумы; за качественными б/у вещами — огромный Bazaraki. Крупные покупки подгадывайте под распродажи и учитывайте доставку и сборку."
  }
 },
 "solar-panels": {
  "el": {
   "q": "Να εγκαταστήσω ηλιακά πάνελ — αξίζει;",
   "a": "Συνήθως ναι, δεδομένης της ηλιοφάνειας, αλλά προσέξτε τη μετάβαση του 2026 από το net-metering στο net-billing — πιστώνεστε με χονδρική τιμή για την ενέργεια που εξάγετε — οπότε διαστασιολογήστε το σύστημα σε ό,τι καταναλώνετε την ημέρα και σκεφτείτε μια μπαταρία. Οι κρατικές επιχορηγήσεις επαναλαμβάνονται, γι' αυτό ελέγξτε τον τρέχοντα κύκλο, και ζητήστε δύο ή τρεις προσφορές από εγκαταστάτες."
  },
  "ro": {
   "q": "Ar trebui să instalez panouri solare — merită?",
   "a": "De regulă da, dat fiind soarele, dar reține trecerea din 2026 de la net-metering la net-billing — pentru energia exportată ești creditat la un preț en-gros — așa că dimensionează sistemul în funcție de ce consumi ziua și ia în calcul o baterie. Granturile guvernamentale se reiau periodic, așa că verifică runda curentă și cere două-trei oferte de la instalatori."
  },
  "ar": {
   "q": "هل ينبغي أن أركّب ألواحاً شمسية — هل يستحقّ الأمر؟",
   "a": "غالباً نعم بالنظر إلى وفرة الشمس، لكن انتبه إلى التحوّل في 2026 من القياس الصافي (net-metering) إلى الفوترة الصافية (net-billing) — إذ يُحتسَب لك رصيد بسعر الجملة مقابل ما تصدّره — فحدّد حجم النظام بحسب ما تستهلكه نهاراً وفكّر في بطارية. وتتكرّر المنح الحكومية، فتحقّق من الجولة الحالية، واحصل على عرضَي سعر أو ثلاثة من شركات التركيب."
  },
  "de": {
   "q": "Sollte ich eine Solaranlage installieren – lohnt sich das?",
   "a": "In der Regel ja, angesichts der Sonne, aber beachten Sie den Wechsel von Net-Metering zu Net-Billing im Jahr 2026 – eingespeister Strom wird Ihnen zum Großhandelspreis gutgeschrieben –, dimensionieren Sie die Anlage also nach Ihrem Tagesverbrauch und ziehen Sie einen Speicher in Betracht. Staatliche Förderungen werden immer wieder aufgelegt, prüfen Sie daher die aktuelle Runde, und holen Sie zwei bis drei Angebote von Installateuren ein."
  },
  "pl": {
   "q": "Czy zainstalować panele słoneczne — czy to się opłaca?",
   "a": "Zwykle tak, biorąc pod uwagę nasłonecznienie, ale zwróć uwagę na zmianę w 2026 z net-meteringu na net-billing — za oddaną energię otrzymujesz kredyt po cenie hurtowej — więc dobierz moc instalacji do tego, co zużywasz w ciągu dnia, i rozważ magazyn energii. Dotacje rządowe wracają cyklicznie, więc sprawdź aktualną edycję i weź dwie–trzy wyceny od instalatorów."
  },
  "ru": {
   "q": "Стоит ли устанавливать солнечные панели — окупается ли это?",
   "a": "Обычно да, учитывая солнце, но обратите внимание на переход в 2026 году с net-metering на net-billing — за отданную в сеть энергию вам начисляют по оптовому тарифу, — поэтому подбирайте мощность системы под дневное потребление и подумайте об аккумуляторе. Государственные субсидии выделяются регулярно, так что проверьте текущий раунд и возьмите два-три предложения от установщиков."
  }
 },
 "pool": {
  "el": {
   "q": "Πόσο κοστίζει να χτίσω μια πισίνα ή να τη διατηρώ καθαρή;",
   "a": "Μια χτιστή πισίνα ξεκινά χοντρικά από €25,000–45,000+. Η τακτική συντήρηση είναι περίπου €115–145 τον μήνα για μια τυπική πισίνα 8×4 m (δύο επισκέψεις την εβδομάδα το καλοκαίρι), από περίπου €190 τον μήνα για premium υπηρεσία βίλας, συν €25–40 τον μήνα για χημικά. Η αποκατάσταση μιας παραμελημένης «πράσινης» πισίνας ξεκινά γύρω στα €200."
  },
  "ro": {
   "q": "Cât costă construirea unei piscine sau întreținerea ei?",
   "a": "O piscină construită pornește de la aproximativ €25,000–45,000+. Întreținerea curentă costă circa €115–145 pe lună pentru o piscină standard de 8×4 m (vizite de două ori pe săptămână vara), de la circa €190 pe lună pentru serviciul premium de vilă, plus €25–40 pe lună pentru substanțe chimice. Readucerea la normal a unei piscine verzi, neglijate, pornește de la circa €200."
  },
  "ar": {
   "q": "كم تكلّف إنشاء مسبح، أو الحفاظ على نظافته؟",
   "a": "يبدأ المسبح المبنيّ من نحو €25,000–45,000+. وتبلغ الصيانة الدورية نحو €115–145 شهرياً لمسبح قياسي مقاس 8×4 m (زيارتان أسبوعياً صيفاً)، ومن نحو €190 شهرياً لخدمة الفلل المتميّزة، إضافةً إلى €25–40 شهرياً للمواد الكيميائية. أما إصلاح مسبح مُهمَل تحوّل لونه إلى الأخضر فيبدأ من نحو €200."
  },
  "de": {
   "q": "Was kostet der Bau eines Pools oder seine Reinhaltung?",
   "a": "Ein gebauter Pool kostet ab ungefähr €25,000–45,000+. Die laufende Pflege liegt bei etwa €115–145 im Monat für einen Standardpool von 8×4 m (im Sommer zwei Besuche pro Woche), ab etwa €190 im Monat für einen Premium-Villenservice, dazu €25–40 im Monat für Chemikalien. Die Sanierung eines vernachlässigten, veralgten Pools beginnt bei rund €200."
  },
  "pl": {
   "q": "Ile kosztuje budowa basenu i jego utrzymanie w czystości?",
   "a": "Wybudowany basen to koszt mniej więcej €25,000–45,000+. Bieżące utrzymanie to około €115–145 miesięcznie za standardowy basen 8×4 m (latem wizyty dwa razy w tygodniu), od około €190 miesięcznie za usługę premium dla willi, plus €25–40 miesięcznie na chemię. Przywrócenie do stanu używalności zaniedbanego, zielonego basenu zaczyna się od około €200."
  },
  "ru": {
   "q": "Сколько стоит построить бассейн или поддерживать его в чистоте?",
   "a": "Строительство бассейна обойдётся примерно от €25,000–45,000+. Текущее обслуживание — около €115–145 в месяц для стандартного бассейна 8×4 m (визиты дважды в неделю летом), от €190 в месяц за премиальный уход на вилле, плюс €25–40 в месяц на химию. Восстановление запущенного «зелёного» бассейна начинается примерно от €200."
  }
 },
 "renovate-village-house": {
  "el": {
   "q": "Μπορώ να ανακαινίσω ένα παλιό χωριάτικο σπίτι;",
   "a": "Ναι, και μάλιστα ενθαρρύνεται — υπάρχουν επιχορηγήσεις αγροτουριστικής αποκατάστασης για παραδοσιακά πέτρινα σπίτια σε καθορισμένα χωριά. Χρησιμοποιήστε έναν οικοδόμο με εμπειρία σε εργασίες πολιτιστικής κληρονομιάς (παραδοσιακές στέγες, πέτρα, ασβέστη)· έτσι ένα ερείπιο γίνεται ένα κατάλυμα προς ενοικίαση."
  },
  "ro": {
   "q": "Pot renova o casă veche de la țară?",
   "a": "Da, ba chiar este încurajat — există granturi de restaurare pentru agroturism, destinate caselor tradiționale de piatră din satele desemnate. Apelează la un constructor cu experiență în lucrări de patrimoniu (acoperișuri tradiționale, piatră, var); așa se transformă o ruină într-o cazare care se poate rezerva."
  },
  "ar": {
   "q": "هل يمكنني ترميم بيت قديم في القرية؟",
   "a": "نعم، وهو أمر مُشجَّع؛ إذ توجد منح لترميم بيوت السياحة الريفية الحجرية التقليدية في القرى المعتمدة. استعن ببنّاء خبير في أعمال التراث (الأسقف التقليدية والحجر والجير)؛ فبهذا يتحوّل بيت متهدّم إلى مكان إقامة قابل للحجز."
  },
  "de": {
   "q": "Kann ich ein altes Dorfhaus renovieren?",
   "a": "Ja, und es wird sogar gefördert – für traditionelle Steinhäuser in ausgewiesenen Dörfern gibt es Agrotourismus-Sanierungszuschüsse. Beauftragen Sie einen Bauunternehmer mit Erfahrung im Denkmalbereich (traditionelle Dächer, Naturstein, Kalk); so wird aus einer Ruine eine buchbare Unterkunft."
  },
  "pl": {
   "q": "Czy mogę wyremontować stary wiejski dom?",
   "a": "Tak, a wręcz jest to zachęcane — istnieją agroturystyczne dotacje na renowację tradycyjnych kamiennych domów w wyznaczonych wsiach. Zatrudnij wykonawcę doświadczonego w pracy przy zabytkach (tradycyjne dachy, kamień, wapno); tak właśnie ruina staje się miejscem, które można zarezerwować."
  },
  "ru": {
   "q": "Можно ли отремонтировать старый деревенский дом?",
   "a": "Да, и это даже поощряется — существуют агротуристические гранты на реставрацию традиционных каменных домов в определённых деревнях. Нанимайте строителя с опытом работы с наследием (традиционные крыши, камень, известь); именно так руина превращается в жильё, которое можно сдавать."
  }
 },
 "find-tradesperson": {
  "el": {
   "q": "Πώς βρίσκω έναν αξιόπιστο υδραυλικό, ηλεκτρολόγο ή μαστορά για μικροεπισκευές;",
   "a": "Η αναζήτηση στην Κύπρο γίνεται μέσω Bazaraki, Anymaster, FIX.CY, τοπικών ομάδων στο Facebook και ομάδων ξένων κατοίκων, καθώς και από στόμα σε στόμα. Περιμένετε μια χρέωση μετάβασης συν ωριαία αμοιβή· ζητάτε πάντα δύο ή τρεις προσφορές και ζητήστε φωτογραφίες από προηγούμενες δουλειές. Ο ελεγμένος κατάλογός μας είναι η αξιόπιστη εναλλακτική στο χάος του Facebook."
  },
  "ro": {
   "q": "Cum găsesc un instalator, un electrician sau un meșter de încredere?",
   "a": "În Cipru, găsirea lor se face prin Bazaraki, Anymaster, FIX.CY, grupurile locale de Facebook și cele de expați și prin recomandări. Așteaptă-te la o taxă de deplasare plus un tarif orar; cere întotdeauna două-trei oferte și fotografii ale lucrărilor anterioare. Directorul nostru verificat este alternativa de încredere la vânzoleala de pe Facebook."
  },
  "ar": {
   "q": "كيف أجد سبّاكاً أو كهربائياً أو عامل صيانة موثوقاً؟",
   "a": "يجري البحث في قبرص عبر Bazaraki وAnymaster وFIX.CY ومجموعات Facebook المحلية ومجموعات المغتربين، والتوصية الشفهية. توقّع رسم استدعاء إضافةً إلى أجر بالساعة؛ واحصل دائماً على عرضَي سعر أو ثلاثة، واطلب صوراً لأعمال سابقة. ودليلنا المُدقَّق هو البديل الموثوق عن فوضى Facebook."
  },
  "de": {
   "q": "Wie finde ich einen zuverlässigen Klempner, Elektriker oder Handwerker?",
   "a": "Auf Zypern findet man Handwerker über Bazaraki, Anymaster, FIX.CY, lokale Facebook- und Auswanderergruppen sowie Mundpropaganda. Rechnen Sie mit einer Anfahrtspauschale plus Stundensatz; holen Sie stets zwei bis drei Angebote ein und lassen Sie sich Fotos früherer Arbeiten zeigen. Unser geprüftes Verzeichnis ist die vertrauenswürdige Alternative zum Facebook-Gewühl."
  },
  "pl": {
   "q": "Jak znaleźć rzetelnego hydraulika, elektryka lub złotą rączkę?",
   "a": "Na Cyprze szuka się fachowców przez Bazaraki, Anymaster, FIX.CY, lokalne grupy na Facebooku i grupy ekspatów oraz z polecenia. Licz się z opłatą za dojazd plus stawką godzinową; zawsze weź dwie–trzy wyceny i poproś o zdjęcia wcześniejszych realizacji. Nasz zweryfikowany katalog to godna zaufania alternatywa dla facebookowego chaosu."
  },
  "ru": {
   "q": "Как найти надёжного сантехника, электрика или мастера на все руки?",
   "a": "Поиск на Кипре идёт через Bazaraki, Anymaster, FIX.CY, местные группы в Facebook и сообщества экспатов, а также по сарафанному радио. Ждите плату за выезд плюс почасовую ставку; всегда берите два-три предложения и просите фотографии прошлых работ. Наш проверенный каталог — надёжная альтернатива хаосу в Facebook."
  }
 },
 "pool-cleaning": {
  "el": {
   "q": "Ποιος καθαρίζει την πισίνα μου, και πόσο κοστίζει;",
   "a": "Μια υπηρεσία πισίνας κοστίζει περίπου €115–145 τον μήνα για μια τυπική πισίνα (δύο φορές την εβδομάδα το καλοκαίρι, μία φορά τον χειμώνα), από περίπου €190 τον μήνα για premium φροντίδα βίλας, συν €25–40 τον μήνα για χημικά. Μια εφάπαξ αποκατάσταση «πράσινης» πισίνας ξεκινά γύρω στα €200. Πολλοί διαφημίζονται στην ενότητα συντήρησης ακινήτων του Bazaraki — εμείς επιλέγουμε τους αξιόπιστους."
  },
  "ro": {
   "q": "Cine îmi curăță piscina și cât costă?",
   "a": "Un serviciu de întreținere a piscinei costă circa €115–145 pe lună pentru o piscină standard (de două ori pe săptămână vara, o dată pe săptămână iarna), de la circa €190 pe lună pentru îngrijirea premium de vilă, plus €25–40 pe lună pentru substanțe chimice. O readucere la normal a unei piscine verzi, ca intervenție unică, pornește de la circa €200. Mulți își fac reclamă la secțiunea de întreținere a proprietăților de pe Bazaraki — noi îi selectăm pe cei de încredere."
  },
  "ar": {
   "q": "من ينظّف مسبحي، وكم يكلّف ذلك؟",
   "a": "تبلغ خدمة المسبح نحو €115–145 شهرياً لمسبح قياسي (زيارتان أسبوعياً صيفاً، وواحدة أسبوعياً شتاءً)، ومن نحو €190 شهرياً للعناية بفلل الفئة المتميّزة، إضافةً إلى €25–40 شهرياً للمواد الكيميائية. أما إصلاح مسبح أخضر لمرة واحدة فيبدأ من نحو €200. ويعلن كثيرون في قسم صيانة العقارات على Bazaraki؛ ونحن نختار الموثوقين منهم."
  },
  "de": {
   "q": "Wer reinigt meinen Pool, und was kostet das?",
   "a": "Ein Poolservice kostet etwa €115–145 im Monat für einen Standardpool (im Sommer zweimal, im Winter einmal pro Woche), ab etwa €190 im Monat für eine Premium-Villenpflege, dazu €25–40 im Monat für Chemikalien. Eine einmalige Sanierung eines veralgten Pools beginnt bei rund €200. Viele werben in Bazarakis Rubrik für Immobilienpflege – wir kuratieren die zuverlässigen Anbieter."
  },
  "pl": {
   "q": "Kto wyczyści mój basen i ile to kosztuje?",
   "a": "Serwis basenowy to około €115–145 miesięcznie za standardowy basen (latem dwa razy w tygodniu, zimą raz w tygodniu), od około €190 miesięcznie za opiekę premium dla willi, plus €25–40 miesięcznie na chemię. Jednorazowe przywrócenie zielonego basenu zaczyna się od około €200. Wielu z nich ogłasza się w sekcji utrzymania nieruchomości na Bazaraki — my wybieramy tych rzetelnych."
  },
  "ru": {
   "q": "Кто будет чистить мой бассейн и сколько это стоит?",
   "a": "Обслуживание бассейна стоит около €115–145 в месяц для стандартного бассейна (дважды в неделю летом, раз в неделю зимой), от €190 в месяц за премиальный уход на вилле, плюс €25–40 в месяц на химию. Разовое восстановление «зелёного» бассейна начинается примерно от €200. Многие размещают объявления в разделе обслуживания недвижимости на Bazaraki — мы отбираем надёжных."
  }
 },
 "appliance-repair": {
  "el": {
   "q": "Ποιος μπορεί να επισκευάσει το πλυντήριο, το ψυγείο ή μια οικιακή συσκευή μου;",
   "a": "Λειτουργούν τόσο ανεξάρτητοι τεχνικοί επισκευών όσο και εξουσιοδοτημένα σέρβις των κατασκευαστών· περιμένετε μια χρέωση μετάβασης ή διάγνωσης συν τα ανταλλακτικά. Για μια συσκευή εκτός εγγύησης, συγκρίνετε την προσφορά με το κόστος αντικατάστασης πριν αποφασίσετε. Βρείτε τους μέσω Bazaraki, Anymaster και τοπικών ομάδων."
  },
  "ro": {
   "q": "Cine îmi poate repara mașina de spălat, frigiderul sau alt electrocasnic?",
   "a": "Există atât tehnicieni independenți, cât și service-uri autorizate ale mărcilor; așteaptă-te la o taxă de deplasare sau de diagnosticare, plus piese. Pentru un aparat ieșit din garanție, compară oferta cu prețul unuia nou înainte de a te decide. Îi găsești pe Bazaraki, Anymaster și în grupurile locale."
  },
  "ar": {
   "q": "من يمكنه إصلاح غسالتي أو ثلّاجتي أو أجهزتي؟",
   "a": "يعمل هنا فنّيو الإصلاح المستقلّون ووكلاء خدمة العلامات التجارية على حدٍّ سواء؛ فتوقّع رسم استدعاء أو تشخيص إضافةً إلى قطع الغيار. وبالنسبة إلى جهاز خارج فترة الضمان، قارِن عرض السعر بتكلفة الاستبدال قبل أن تلتزم. وتجدهم عبر Bazaraki وAnymaster والمجموعات المحلية."
  },
  "de": {
   "q": "Wer kann meine Waschmaschine, meinen Kühlschrank oder ein anderes Gerät reparieren?",
   "a": "Es gibt sowohl unabhängige Reparaturtechniker als auch markengebundene Servicepartner; rechnen Sie mit einer Anfahrts- oder Diagnosepauschale plus Ersatzteilen. Bei einem Gerät ohne Garantie vergleichen Sie den Kostenvoranschlag mit einer Neuanschaffung, bevor Sie sich entscheiden. Sie finden sie über Bazaraki, Anymaster und lokale Gruppen."
  },
  "pl": {
   "q": "Kto naprawi moją pralkę, lodówkę lub inny sprzęt AGD?",
   "a": "Działają zarówno niezależni serwisanci, jak i autoryzowane serwisy marek; licz się z opłatą za dojazd lub diagnostykę plus koszt części. Przy sprzęcie po gwarancji porównaj wycenę z ceną nowego, zanim się zdecydujesz. Znajdziesz ich przez Bazaraki, Anymaster i lokalne grupy."
  },
  "ru": {
   "q": "Кто может починить мою стиральную машину, холодильник или другую технику?",
   "a": "Работают и независимые мастера по ремонту, и сервисные центры брендов; ждите плату за выезд или диагностику плюс стоимость запчастей. Для техники с истёкшей гарантией сравните цену ремонта со стоимостью замены, прежде чем решаться. Ищите их через Bazaraki, Anymaster и местные группы."
  }
 },
 "ac-service": {
  "el": {
   "q": "Ποιος συντηρεί ή εγκαθιστά το κλιματιστικό μου, και πόσο κοστίζει;",
   "a": "Η βασική εγκατάσταση μιας μονάδας split κοστίζει περίπου €150–300 σε εργατικά (η ίδια η μονάδα €400–1,100), με επιπλέον χρεώσεις για καροταρίσματα και σωληνώσεις. Κλείστε μια ετήσια συντήρηση και καθαρισμό πριν το καλοκαίρι για να παραμείνει αποδοτικό· η λειτουργία μιας μονάδας που δουλεύει πολύ κοστίζει περίπου €40–55 τον μήνα."
  },
  "ro": {
   "q": "Cine îmi montează sau întreține aerul condiționat și cât costă?",
   "a": "Montajul de bază al unei unități split costă circa €150–300 manopera (aparatul în sine este €400–1,100), cu costuri suplimentare pentru carotare și trasee de conducte. Programează o revizie și o curățare anuală înainte de vară, ca să rămână eficient; funcționarea intensă a unei unități costă aproximativ €40–55 pe lună."
  },
  "ar": {
   "q": "من يصون أو يركّب مكيّف الهواء لديّ، وكم يكلّف ذلك؟",
   "a": "يبلغ تركيب وحدة سبليت أساسية نحو €150–300 أجرة عمل (أما الوحدة نفسها فتكلّف €400–1,100)، مع تكاليف إضافية للحفر الأساسي والتمديدات. احجز صيانة وتنظيفاً سنوياً قبل الصيف للحفاظ على كفاءته؛ ويكلّف تشغيل وحدة واحدة تعمل بجهد كبير نحو €40–55 شهرياً."
  },
  "de": {
   "q": "Wer wartet oder installiert meine Klimaanlage, und was kostet das?",
   "a": "Die Installation eines einfachen Split-Geräts kostet etwa €150–300 an Arbeitslohn (das Gerät selbst €400–1,100), mit Aufpreisen für Kernbohrungen und Verrohrung. Buchen Sie vor dem Sommer eine jährliche Wartung und Reinigung, damit die Anlage effizient bleibt; der Betrieb eines stark beanspruchten Geräts kostet rund €40–55 im Monat."
  },
  "pl": {
   "q": "Kto zaserwisuje lub zamontuje moją klimatyzację i ile to kosztuje?",
   "a": "Montaż podstawowej jednostki typu split to około €150–300 za robociznę (samo urządzenie kosztuje €400–1,100), z dopłatami za przewierty i orurowanie. Zamów coroczny przegląd i czyszczenie przed latem, by utrzymać sprawność; intensywna praca jednego urządzenia to koszt mniej więcej €40–55 miesięcznie."
  },
  "ru": {
   "q": "Кто обслуживает или устанавливает кондиционер и сколько это стоит?",
   "a": "Базовая установка сплит-системы стоит около €150–300 за работу (сам блок — €400–1,100), с доплатой за алмазное бурение и прокладку трасс. Заказывайте ежегодное обслуживание и чистку перед летом, чтобы кондиционер работал эффективно; один интенсивно используемый блок обходится примерно в €40–55 в месяц."
  }
 },
 "house-cleaning": {
  "el": {
   "q": "Ποιες είναι οι χρεώσεις για καθαρισμό σπιτιού;",
   "a": "Οι ανεξάρτητες καθαρίστριες χρεώνουν περίπου €7–12 την ώρα (η Πάφος στο χαμηλότερο άκρο, η Λεμεσός υψηλότερα)· τα πρακτορεία χρεώνουν €12–18. Οι περισσότεροι ορίζουν ελάχιστη διάρκεια 3–4 ωρών ανά επίσκεψη, ενώ το σιδέρωμα, οι φούρνοι και τα ψηλά παράθυρα συνήθως χρεώνονται επιπλέον. Βρείτε τους μέσω Bazaraki, Anymaster και ομάδων ξένων κατοίκων."
  },
  "ro": {
   "q": "Care sunt tarifele pentru curățenia în casă?",
   "a": "Persoanele care fac curățenie pe cont propriu cer circa €7–12 pe oră (Paphos spre limita de jos, Limassol mai sus); agențiile cer €12–18. Cele mai multe impun un minim de 3–4 ore pe vizită, iar călcatul, cuptoarele și geamurile înalte se plătesc de regulă separat. Le găsești pe Bazaraki, Anymaster și în grupurile de expați."
  },
  "ar": {
   "q": "ما أسعار تنظيف المنازل؟",
   "a": "يتقاضى عمّال التنظيف المستقلّون نحو €7–12 للساعة (بافوس في الحدّ الأدنى، وليماسول أعلى)؛ وتتقاضى الوكالات €12–18. ويشترط معظمهم حدّاً أدنى 3–4 ساعات لكل زيارة، وعادةً ما تُحتسَب الكيّ والأفران والنوافذ العالية إضافةً. وتجدهم عبر Bazaraki وAnymaster ومجموعات المغتربين."
  },
  "de": {
   "q": "Wie hoch sind die Preise für die Hausreinigung?",
   "a": "Selbstständige Reinigungskräfte verlangen etwa €7–12 pro Stunde (Paphos am unteren Ende, Limassol höher); Agenturen berechnen €12–18. Die meisten setzen ein Minimum von 3–4 Stunden pro Einsatz an, und Bügeln, Backöfen und hohe Fenster kosten in der Regel extra. Sie finden sie über Bazaraki, Anymaster und Auswanderergruppen."
  },
  "pl": {
   "q": "Jakie są stawki za sprzątanie domu?",
   "a": "Niezależne osoby sprzątające biorą około €7–12 za godzinę (Pafos w dolnych widełkach, Limassol wyżej); agencje liczą €12–18. Większość ustala minimum 3–4 godziny na wizytę, a prasowanie, piekarniki i wysokie okna są zwykle dodatkowo płatne. Znajdziesz je przez Bazaraki, Anymaster i grupy ekspatów."
  },
  "ru": {
   "q": "Каковы расценки на уборку дома?",
   "a": "Независимые уборщицы берут около €7–12 в час (в Пафосе — по нижней границе, в Лимасоле — выше); агентства — €12–18. Большинство устанавливает минимум 3–4 часа за визит, а глажка, духовки и высоко расположенные окна обычно оплачиваются отдельно. Ищите их через Bazaraki, Anymaster и группы экспатов."
  }
 },
 "pest-control": {
  "el": {
   "q": "Ποιος αναλαμβάνει την απεντόμωση — κουνούπια, μυρμήγκια, φίδια;",
   "a": "Αδειοδοτημένες εταιρείες αναλαμβάνουν την εκνέφωση για κουνούπια, τις κατσαρίδες, τα μυρμήγκια και τις περιστασιακές κλήσεις για φίδια, συνήθως με χρέωση ανά επέμβαση, ενώ διατίθενται και εποχικά συμβόλαια. Ζητήστε προσφορά για το μέγεθος του ακινήτου σας· η καλοκαιρινή αντιμετώπιση κουνουπιών είναι το πιο συνηθισμένο αίτημα."
  },
  "ro": {
   "q": "Cine se ocupă de combaterea dăunătorilor — țânțari, furnici, șerpi?",
   "a": "Firmele autorizate se ocupă de nebulizarea împotriva țânțarilor, de gândaci, furnici și, ocazional, de câte un apel pentru șerpi, de obicei cu o taxă pe tratament și cu posibilitatea unor contracte sezoniere. Cere o ofertă în funcție de dimensiunea proprietății; tratamentul de vară împotriva țânțarilor este solicitarea cea mai frecventă."
  },
  "ar": {
   "q": "من يقوم بمكافحة الآفات — البعوض والنمل والثعابين؟",
   "a": "تتولّى شركات مرخّصة تضبيب البعوض، والصراصير، والنمل، وأحياناً استدعاءات الثعابين، عادةً برسم لكل معالجة مع إمكانية إبرام عقود موسمية. احصل على عرض سعر يناسب مساحة عقارك؛ ومعالجة البعوض صيفاً هي الطلب الأكثر شيوعاً."
  },
  "de": {
   "q": "Wer übernimmt die Schädlingsbekämpfung – Mücken, Ameisen, Schlangen?",
   "a": "Lizenzierte Firmen übernehmen Mückenvernebelung, Kakerlaken, Ameisen und gelegentlich einen Schlangen-Einsatz, üblicherweise gegen eine Gebühr pro Behandlung, wobei auch Saisonverträge möglich sind. Holen Sie ein Angebot für Ihre Grundstücksgröße ein; die sommerliche Mückenbehandlung ist die häufigste Anfrage."
  },
  "pl": {
   "q": "Kto zajmuje się zwalczaniem szkodników — komarów, mrówek, węży?",
   "a": "Licencjonowane firmy zajmują się zamgławianiem przeciw komarom, karaluchami, mrówkami i sporadycznymi wezwaniami do węży, zwykle jako opłata za zabieg, z możliwością umów sezonowych. Weź wycenę dopasowaną do wielkości twojej nieruchomości; letni zabieg przeciw komarom to najczęstsze zlecenie."
  },
  "ru": {
   "q": "Кто занимается борьбой с вредителями — комарами, муравьями, змеями?",
   "a": "Лицензированные компании занимаются обработкой от комаров (фоггингом), тараканами, муравьями и время от времени вызовами по поводу змей — обычно оплата берётся за обработку, доступны и сезонные контракты. Запросите цену под размер вашего участка; летняя обработка от комаров — самый частый запрос."
  }
 },
 "movers": {
  "el": {
   "q": "Πού βρίσκω μεταφορική ή κάποιον με βανάκι για μετακόμιση;",
   "a": "Οι επιλογές κυμαίνονται από έναν μεμονωμένο μεταφορέα με βανάκι για λίγα κιβώτια μέχρι πλήρεις μετακομίσεις σπιτιού με πακετάρισμα. Η τιμή εξαρτάται από την απόσταση, τον όγκο και τους ορόφους — ζητήστε προσφορά από κοντά ή μέσω βίντεο. Οι μετακομίσεις εντός της ίδιας πόλης είναι φθηνές· η συναρμολόγηση επίπλων είναι συχνά επιπλέον υπηρεσία."
  },
  "ro": {
   "q": "De unde găsesc o firmă de mutări sau un transportator cu dubă?",
   "a": "Opțiunile merg de la un singur om cu o dubă pentru câteva cutii până la mutări complete ale locuinței, cu împachetare. Prețul depinde de distanță, volum și etaje — cere o ofertă la fața locului sau pe video. Mutările în interiorul aceluiași oraș sunt ieftine; montarea mobilei este deseori un serviciu suplimentar."
  },
  "ar": {
   "q": "أين أجد شركة نقل أثاث أو شخصاً بشاحنة صغيرة؟",
   "a": "تتراوح الخيارات بين شخص واحد بشاحنة صغيرة لنقل بضعة صناديق، ونقل منزل كامل مع التغليف. ويعتمد السعر على المسافة والحجم وعدد الطوابق؛ فاحصل على عرض سعر حضورياً أو عبر الفيديو. والنقل داخل المدينة رخيص؛ وغالباً ما يكون تركيب الأثاث خدمة إضافية."
  },
  "de": {
   "q": "Wo finde ich ein Umzugsunternehmen oder einen Transporter mit Fahrer?",
   "a": "Das Angebot reicht vom einzelnen Transporter mit Fahrer für ein paar Kartons bis zum kompletten Umzug samt Verpackung. Der Preis hängt von Entfernung, Volumen und Stockwerken ab – lassen Sie sich vor Ort oder per Video ein Angebot machen. Umzüge innerhalb der Stadt sind günstig; der Möbelaufbau ist oft ein Zusatz."
  },
  "pl": {
   "q": "Gdzie znaleźć firmę przeprowadzkową lub kierowcę z furgonetką?",
   "a": "Opcje sięgają od pojedynczego kierowcy z furgonetką do kilku pudeł po pełne przeprowadzki domu z pakowaniem. Cena zależy od odległości, objętości i liczby pięter — poproś o wycenę na miejscu lub przez wideo. Przeprowadzki w obrębie miasta są tanie; montaż mebli to często dodatkowa usługa."
  },
  "ru": {
   "q": "Где найти грузчиков или «человека с фургоном»?",
   "a": "Варианты — от одного «человека с фургоном» для пары коробок до полного переезда с упаковкой. Цена зависит от расстояния, объёма и этажей — получите оценку при личном осмотре или по видео. Переезды по городу дёшевы; сборка мебели часто оплачивается дополнительно."
  }
 },
 "gardening": {
  "el": {
   "q": "Ποιος αναλαμβάνει κηπουρική και διαμόρφωση κήπων;",
   "a": "Μπορείτε να κανονίσετε τακτική συντήρηση κήπου (κούρεμα, πότισμα, κλάδεμα) με μηνιαίο πρόγραμμα, ή εφάπαξ διαμόρφωση κήπου και φύτευση ανθεκτικών στην ξηρασία φυτών. Η τεχνογνωσία στην άρδευση μετράει στο κυπριακό καλοκαίρι — ρωτήστε για έξυπνους προγραμματιστές ποτίσματος και για αξιοποίηση γκρίζων νερών (greywater)."
  },
  "ro": {
   "q": "Cine se ocupă de grădinărit și amenajări peisagistice?",
   "a": "Poți aranja întreținerea regulată a grădinii (tuns, irigare, tăieri) într-un abonament lunar sau amenajări peisagistice și plantări rezistente la secetă, ca intervenție unică. Priceperea la irigații contează în vara cipriotă — întreabă despre programatoare inteligente și reutilizarea apei menajere (greywater)."
  },
  "ar": {
   "q": "من يقوم بأعمال البستنة وتنسيق الحدائق؟",
   "a": "يمكنك ترتيب صيانة منتظمة للحديقة (جزّ العشب والريّ والتقليم) ضمن خطة شهرية، أو تنسيقاً للحدائق وزراعةً مقاوِمة للجفاف لمرة واحدة. وتُعدّ الخبرة في الريّ مهمّة في صيف قبرص؛ فاسأل عن أجهزة التوقيت الذكية والمياه الرمادية."
  },
  "de": {
   "q": "Wer übernimmt Gartenpflege und Landschaftsgestaltung?",
   "a": "Sie können regelmäßige Gartenpflege (Mähen, Bewässerung, Rückschnitt) im Monatsabo vereinbaren oder eine einmalige Gartengestaltung und trockenheitsresistente Bepflanzung. Bewässerungs-Know-how ist im zypriotischen Sommer entscheidend – fragen Sie nach intelligenten Zeitschaltuhren und Grauwasser."
  },
  "pl": {
   "q": "Kto zajmuje się ogrodnictwem i kształtowaniem ogrodów?",
   "a": "Możesz zamówić regularną pielęgnację ogrodu (koszenie, nawadnianie, przycinanie) w planie miesięcznym albo jednorazowe urządzanie ogrodu i nasadzenia odporne na suszę. W cypryjskie lato wiedza o nawadnianiu ma znaczenie — pytaj o inteligentne sterowniki i wodę szarą."
  },
  "ru": {
   "q": "Кто занимается садом и ландшафтом?",
   "a": "Можно организовать регулярный уход за садом (стрижка газона, полив, обрезка) по месячному плану или разовое озеленение и посадку засухоустойчивых растений. Умение настроить полив важно в кипрское лето — спросите про умные таймеры и использование серой воды."
  }
 },
 "car-mot": {
  "el": {
   "q": "Πόσο κοστίζει ο τεχνικός έλεγχος (MOT) του αυτοκινήτου και κάθε πότε χρειάζεται;",
   "a": "Ο τεχνικός έλεγχος (MOT) κοστίζει περίπου €35–40, ίδιος σε όλο το νησί, και απαιτείται κάθε δύο χρόνια από τη στιγμή που το αυτοκίνητο συμπληρώσει τέσσερα χρόνια (τα καινούργια αυτοκίνητα εξαιρούνται για τέσσερα χρόνια). Κλείστε τον πριν λήξει — η οδήγηση χωρίς ισχύον MOT σημαίνει πρόστιμα."
  },
  "ro": {
   "q": "Cât costă ITP-ul auto și cât de des este necesar?",
   "a": "ITP-ul (inspecția tehnică periodică) costă circa €35–40, la fel în toată insula, și este obligatoriu o dată la doi ani, după ce mașina împlinește patru ani (mașinile noi sunt scutite timp de patru ani). Programează-l înainte să expire — a conduce fără un ITP valabil înseamnă amenzi."
  },
  "ar": {
   "q": "كم يكلّف فحص السيارة الدوري (MOT) وكم مرة يلزم؟",
   "a": "يبلغ فحص MOT (اختبار الصلاحية للسير) نحو €35–40، وهو موحّد في الجزيرة كلها، ويُطلَب كل سنتين بمجرّد بلوغ السيارة أربع سنوات (السيارات الجديدة معفاة لمدة أربع سنوات). احجزه قبل انتهاء صلاحيته؛ فالقيادة دون فحص MOT ساري المفعول تعني غرامات."
  },
  "de": {
   "q": "Was kostet die MOT-Fahrzeugprüfung und wie oft ist sie erforderlich?",
   "a": "Die MOT (die Prüfung der Verkehrstauglichkeit) kostet etwa €35–40, inselweit gleich, und ist alle zwei Jahre erforderlich, sobald ein Auto vier Jahre alt ist (Neuwagen sind vier Jahre lang befreit). Buchen Sie sie, bevor sie abläuft – Fahren ohne gültige MOT bedeutet Bußgelder."
  },
  "pl": {
   "q": "Ile kosztuje przegląd techniczny auta (MOT) i jak często jest wymagany?",
   "a": "Przegląd techniczny (MOT) kosztuje około €35–40, tyle samo na całej wyspie, i jest wymagany co dwa lata, gdy auto ma cztery lata (nowe samochody są zwolnione przez cztery lata). Umów go przed upływem ważności — jazda bez ważnego MOT oznacza mandaty."
  },
  "ru": {
   "q": "Сколько стоит техосмотр автомобиля и как часто он нужен?",
   "a": "Техосмотр (проверка на пригодность к эксплуатации) стоит около €35–40, одинаково по всему острову, и требуется раз в два года после того, как машине исполнится четыре года (новые автомобили освобождены на четыре года). Записывайтесь до истечения срока — езда без действующего техосмотра грозит штрафами."
  }
 },
 "childcare-eldercare": {
  "el": {
   "q": "Πού βρίσκω φύλαξη παιδιών, νταντά ή φροντίδα ηλικιωμένων;",
   "a": "Διατίθενται παιδικοί σταθμοί, εγγεγραμμένες φροντίστριες παιδιών και εσωτερικοί ή κατ' οίκον φροντιστές· η εσωτερική φροντίδα είναι συνηθισμένη και συχνά κανονίζεται ιδιωτικά ή μέσω πρακτορείων. Ελέγξτε την εγγραφή, τις συστάσεις και το συμβόλαιο. Χτίζουμε έναν ελεγμένο κατάλογο φροντίδας αντί να αφήνουμε τις οικογένειες στο Facebook."
  },
  "ro": {
   "q": "De unde găsesc servicii de îngrijire a copiilor, o bonă sau îngrijire pentru vârstnici?",
   "a": "Sunt disponibile creșe, dădace înregistrate și îngrijitori interni sau care vin la program; îngrijirea internă este frecventă și adesea aranjată privat sau prin agenții. Verifică autorizarea, recomandările și contractul. Noi construim un director de îngrijire verificat, în loc să lăsăm familiile pradă Facebookului."
  },
  "ar": {
   "q": "أين أجد رعاية للأطفال، أو مربّية، أو رعاية للمسنّين؟",
   "a": "تتوفّر دور الحضانة، ومقدّمو رعاية الأطفال المسجّلون، ومقدّمو الرعاية المقيمون أو الزائرون؛ والرعاية المقيمة شائعة، وغالباً ما تُرتَّب بشكل خاص أو عبر الوكالات. تحقّق من التسجيل والمراجع والعقد. ونحن نبني دليل رعاية مُدقَّقاً بدلاً من ترك العائلات لـ Facebook."
  },
  "de": {
   "q": "Wo finde ich Kinderbetreuung, ein Kindermädchen oder Altenpflege?",
   "a": "Kindertagesstätten, registrierte Tagesmütter sowie im Haushalt lebende oder ambulante Pflegekräfte stehen alle zur Verfügung; die Pflege im Haushalt ist verbreitet und wird oft privat oder über Agenturen organisiert. Prüfen Sie Registrierung, Referenzen und den Vertrag. Wir bauen ein geprüftes Betreuungsverzeichnis auf, statt Familien Facebook zu überlassen."
  },
  "pl": {
   "q": "Gdzie znaleźć opiekę nad dzieckiem, nianię lub opiekę nad osobą starszą?",
   "a": "Dostępne są żłobki, zarejestrowani opiekunowie oraz opiekunowie z zamieszkaniem lub dochodzący; opieka z zamieszkaniem jest powszechna i często organizowana prywatnie lub przez agencje. Sprawdź rejestrację, referencje i umowę. Budujemy zweryfikowany katalog opieki, zamiast zostawiać rodziny z Facebookiem."
  },
  "ru": {
   "q": "Где найти услуги по уходу за детьми, няню или уход за пожилыми?",
   "a": "Доступны детские сады, зарегистрированные воспитатели и сиделки — как с проживанием, так и приходящие; уход с проживанием распространён и часто организуется частным образом или через агентства. Проверяйте регистрацию, рекомендации и договор. Мы создаём проверенный каталог услуг по уходу, чтобы не оставлять семьи наедине с Facebook."
  }
 },
 "get-residency": {
  "el": {
   "q": "Πώς αποκτώ άδεια διαμονής στην Κύπρο (ΕΕ έναντι εκτός ΕΕ);",
   "a": "Οι πολίτες της ΕΕ εγγράφονται για το MEU1, το «Κίτρινο Χαρτί» (Yellow Slip) — απλή διαδικασία. Οι διαδρομές για τους εκτός ΕΕ είναι η Μόνιμη Άδεια Διαμονής μέσω επένδυσης (η «διαδρομή των €300,000»), η Κατηγορία F (σταθερό εισόδημα από το εξωτερικό) ή η βίζα ψηφιακού νομάδα. Σημειώστε ότι το «χρυσό διαβατήριο» μέσω απόκτησης υπηκοότητας με επένδυση καταργήθηκε οριστικά το 2020 — μην βασίζεστε σε αυτό."
  },
  "ro": {
   "q": "Cum obțin rezidența în Cipru (cetățeni UE vs. non-UE)?",
   "a": "Cetățenii UE se înregistrează pentru MEU1, „Yellow Slip” (fișa galbenă) — simplu. Rutele pentru non-UE sunt Rezidența Permanentă prin investiție („ruta de €300,000”), Categoria F (venituri constante din străinătate) sau viza de nomad digital. Reține că „pașaportul de aur”, cetățenia prin investiție, a fost desființat definitiv în 2020 — nu te baza pe el."
  },
  "ar": {
   "q": "كيف أحصل على الإقامة في قبرص (لمواطني الاتحاد الأوروبي مقابل غيرهم)؟",
   "a": "يسجّل مواطنو الاتحاد الأوروبي للحصول على MEU1، «الورقة الصفراء»، وهو إجراء بسيط. أما مسارات غير مواطني الاتحاد فهي الإقامة الدائمة عبر الاستثمار («مسار €300,000»)، أو الفئة F (دخل خارجي ثابت)، أو تأشيرة الرحّالة الرقمي. وانتبه إلى أن «جواز السفر الذهبي» بالجنسية عبر الاستثمار قد أُلغِي نهائياً في 2020؛ فلا تعوّل عليه."
  },
  "de": {
   "q": "Wie erhalte ich einen Aufenthaltstitel auf Zypern (EU vs. Nicht-EU)?",
   "a": "EU-Bürger beantragen den MEU1 – den „Yellow Slip“ –, was unkompliziert ist. Für Nicht-EU-Bürger gibt es die Daueraufenthaltsgenehmigung per Investition (die „€300,000-Route“), die Kategorie F (regelmäßiges Auslandseinkommen) oder das Visum für digitale Nomaden. Beachten Sie: der „goldene Pass“ – die Staatsbürgerschaft per Investition – wurde 2020 endgültig abgeschafft, verlassen Sie sich also nicht darauf."
  },
  "pl": {
   "q": "Jak uzyskać pobyt na Cyprze (obywatele UE a spoza UE)?",
   "a": "Obywatele UE rejestrują się po MEU1, tzw. „żółty papier” (Yellow Slip) — to proste. Ścieżki dla osób spoza UE to stały pobyt za inwestycję (tzw. „ścieżka €300,000”), Kategoria F (stały dochód z zagranicy) lub wiza dla cyfrowych nomadów. Uwaga: obywatelstwo za inwestycję, czyli „złoty paszport”, zostało trwale zniesione w 2020 — nie licz na nie."
  },
  "ru": {
   "q": "Как получить ВНЖ на Кипре (для граждан ЕС и не-ЕС)?",
   "a": "Граждане ЕС оформляют MEU1 — «жёлтую справку» (Yellow Slip), это несложно. Для граждан не из ЕС пути такие: постоянный ВНЖ за инвестиции («маршрут €300,000»), Категория F (стабильный зарубежный доход) или виза цифрового кочевника. Учтите: «золотой паспорт» — гражданство за инвестиции — был окончательно отменён в 2020 году, не рассчитывайте на него."
  }
 },
 "non-dom": {
  "el": {
   "q": "Τι είναι το καθεστώς non-dom, και γιατί η φορολογία είναι τόσο χαμηλή;",
   "a": "Το καθεστώς non-dom προσφέρει 17 χρόνια με 0% φόρο σε μερίσματα και τόκους (μόνο μια εισφορά υγείας με ανώτατο όριο 2.65%) και καμία φορολογία στο μεγαλύτερο μέρος του εισοδήματος από το εξωτερικό — έναν πραγματικό συντελεστή περίπου 5% ή και λιγότερο για πολλούς. Είναι το μεγαλύτερο δέλεαρ για ιδρυτές και επενδυτές που μετεγκαθίστανται· συνδυάστε το με μια κυπριακή εταιρεία για τη συνολική εικόνα."
  },
  "ro": {
   "q": "Ce este statutul non-dom și de ce sunt impozitele atât de mici?",
   "a": "Regimul non-dom oferă 17 ani cu impozit de 0% pe dividende și dobânzi (doar o contribuție de sănătate plafonată la 2.65%) și fără impozit pe majoritatea veniturilor din străinătate — o rată efectivă de circa 5% sau chiar mai puțin pentru mulți. Este cel mai puternic magnet pentru fondatorii și investitorii care se relochează; combină-l cu o companie cipriotă pentru tabloul complet."
  },
  "ar": {
   "q": "ما هو نظام غير المقيم ضريبياً (non-dom)، ولماذا الضريبة منخفضة إلى هذا الحدّ؟",
   "a": "يمنح نظام non-dom مدة 17 عاماً من ضريبة 0% على أرباح الأسهم والفوائد (باستثناء رسم صحي محدود قدره 2.65% فقط) ولا ضريبة على معظم الدخل الأجنبي — أي معدّل فعلي يبلغ نحو 5% أو أقل لكثيرين. وهو أكبر عامل جذب منفرد للمؤسّسين والمستثمرين المنتقلين؛ اقرِنه بشركة قبرصية لتكتمل الصورة."
  },
  "de": {
   "q": "Was ist der Non-Dom-Status, und warum sind die Steuern so niedrig?",
   "a": "Die Non-Dom-Regelung gewährt 17 Jahre lang 0% Steuer auf Dividenden und Zinsen (lediglich eine gedeckelte Gesundheitsabgabe von 2.65%) und keine Steuer auf die meisten ausländischen Einkünfte – für viele ein effektiver Satz von etwa 5% oder weniger. Sie ist der mit Abstand größte Anreiz für zuziehende Gründer und Investoren; kombinieren Sie sie mit einer zypriotischen Gesellschaft, um das volle Bild zu erhalten."
  },
  "pl": {
   "q": "Czym jest non-dom i dlaczego podatki są tak niskie?",
   "a": "Reżim non-dom daje 17 lat 0% podatku od dywidend i odsetek (jedynie ograniczona do limitu składka zdrowotna 2.65%) oraz brak podatku od większości dochodów zagranicznych — efektywna stawka dla wielu wynosi około 5% lub mniej. To największy pojedynczy magnes dla przenoszących się założycieli firm i inwestorów; połącz go z cypryjską spółką, by uzyskać pełen obraz."
  },
  "ru": {
   "q": "Что такое non-dom и почему налог такой низкий?",
   "a": "Режим non-dom даёт 17 лет с нулевым (0%) налогом на дивиденды и проценты (только ограниченный взнос на здравоохранение в 2.65%) и отсутствие налога на большую часть зарубежного дохода — эффективная ставка для многих составляет около 5% или меньше. Это главный магнит для переезжающих основателей и инвесторов; для полной картины сочетайте его с кипрской компанией."
  }
 },
 "healthcare": {
  "el": {
   "q": "Υγειονομική περίθαλψη — GESY ή ιδιωτική;",
   "a": "Το GESY (ΓεΣΥ) είναι το εθνικό σύστημα υγείας (βασισμένο σε εισφορές, που καλύπτει τους κατοίκους, συμπεριλαμβανομένων πολλών ξένων κατοίκων). Οι περισσότεροι χρησιμοποιούν επίσης ιδιωτικές κλινικές και νοσοκομεία για ταχύτητα και επιλογή· τα αγγλικά είναι καθολικά στην ιδιωτική περίθαλψη και οι ρωσόφωνοι γιατροί είναι συνηθισμένοι στη Λεμεσό. Καταγράφουμε τα ιατρεία με αγγλικά και ρωσικά και την κατάστασή τους ως προς το GESY ή την ιδιωτική περίθαλψη."
  },
  "ro": {
   "q": "Sănătate — GESY sau privat?",
   "a": "GESY este sistemul național de sănătate (bazat pe contribuții, care acoperă rezidenții, inclusiv mulți expați). Cei mai mulți apelează și la clinici și spitale private, pentru rapiditate și opțiuni; în sistemul privat engleza este universală, iar medicii vorbitori de rusă sunt frecvenți în Limassol. Listăm cabinetele vorbitoare de engleză și de rusă și statutul lor GESY sau privat."
  },
  "ar": {
   "q": "الرعاية الصحية — نظام GESY أم القطاع الخاص؟",
   "a": "GESY هو نظام الصحة الوطني (قائم على الاشتراكات، ويغطّي المقيمين بمن فيهم كثير من المغتربين). ويلجأ معظم الناس أيضاً إلى العيادات والمستشفيات الخاصة طلباً للسرعة وسعة الخيار؛ والإنجليزية سائدة في الرعاية الخاصة، والأطباء الناطقون بالروسية شائعون في ليماسول. ونحن ندرج العيادات الناطقة بالإنجليزية والروسية وحالتها ضمن GESY أو القطاع الخاص."
  },
  "de": {
   "q": "Gesundheitsversorgung – GESY oder privat?",
   "a": "GESY ist das nationale Gesundheitssystem (beitragsfinanziert, für Einwohner einschließlich vieler Ausländer). Die meisten nutzen zusätzlich private Kliniken und Krankenhäuser wegen Tempo und Auswahl; in der Privatversorgung ist Englisch selbstverständlich, und russischsprachige Ärzte sind in Limassol häufig. Wir führen englisch- und russischsprachige Praxen auf, samt ihrem GESY- oder Privatstatus."
  },
  "pl": {
   "q": "Opieka zdrowotna — GESY czy prywatna?",
   "a": "GESY to krajowy system opieki zdrowotnej (oparty na składkach, obejmujący rezydentów, w tym wielu ekspatów). Większość osób korzysta też z prywatnych klinik i szpitali dla szybkości i wyboru; w prywatnej opiece angielski jest powszechny, a w Limassol łatwo o lekarzy mówiących po rosyjsku. Podajemy praktyki anglo- i rosyjskojęzyczne oraz ich status w GESY lub prywatny."
  },
  "ru": {
   "q": "Здравоохранение — GESY или частное?",
   "a": "GESY — это национальная система здравоохранения (на основе взносов, охватывает резидентов, включая многих экспатов). Большинство также пользуется частными клиниками и больницами ради скорости и выбора; в частной медицине английский повсеместен, а в Лимасоле часто встречаются русскоговорящие врачи. Мы указываем практики с английским и русским языком и их статус — GESY или частная."
  }
 },
 "schools": {
  "el": {
   "q": "Ποιες είναι οι επιλογές σχολείων — διεθνή, ρωσικά, ρουμανικά;",
   "a": "Υπάρχουν αξιόλογα αγγλόφωνα διεθνή σχολεία σε κάθε πόλη, ρωσικά σχολεία στη Λεμεσό (LITC, MORFOSIS), ένα ρουμανικό σχολείο στην Πάφο, και το ελληνικό δημόσιο σύστημα. Τα δίδακτρα και οι λίστες αναμονής ποικίλλουν, γι' αυτό κάντε αίτηση νωρίς — η εκπαίδευση είναι καθοριστικός παράγοντας για τις οικογένειες που μετεγκαθίστανται."
  },
  "ro": {
   "q": "Ce opțiuni de școli există — internaționale, rusești, românești?",
   "a": "Există școli internaționale puternice cu predare în engleză în fiecare oraș, școli rusești în Limassol (LITC, MORFOSIS), o școală românească în Paphos și sistemul de stat grecesc. Taxele și listele de așteptare variază, așa că înscrie-te din timp — școlarizarea este un factor decisiv pentru familiile care se relochează."
  },
  "ar": {
   "q": "ما خيارات المدارس — الدولية والروسية والرومانية؟",
   "a": "توجد مدارس دولية قوية تعتمد الإنجليزية لغةً للتدريس في كل مدينة، ومدارس روسية في ليماسول (LITC وMORFOSIS)، ومدرسة رومانية في بافوس، والنظام الحكومي اليوناني. وتتفاوت الرسوم وقوائم الانتظار، فقدّم طلبك مبكراً؛ فالتعليم عامل حاسم للعائلات المنتقلة."
  },
  "de": {
   "q": "Welche Schulmöglichkeiten gibt es – international, russisch, rumänisch?",
   "a": "In jeder Stadt gibt es starke internationale Schulen mit Englisch als Unterrichtssprache, russische Schulen in Limassol (LITC, MORFOSIS), eine rumänische Schule in Paphos und das griechische staatliche System. Gebühren und Wartelisten schwanken, bewerben Sie sich also früh – die Schulbildung ist für umziehende Familien ein entscheidender Faktor."
  },
  "pl": {
   "q": "Jakie są możliwości szkolne — międzynarodowe, rosyjskie, rumuńskie?",
   "a": "W każdym mieście działają silne szkoły międzynarodowe z angielskim językiem wykładowym, w Limassol są szkoły rosyjskie (LITC, MORFOSIS), w Pafos szkoła rumuńska, a do tego grecki system państwowy. Czesne i listy oczekujących bywają różne, więc składaj podania wcześnie — edukacja to czynnik decydujący dla przenoszących się rodzin."
  },
  "ru": {
   "q": "Какие есть варианты школ — международные, русские, румынские?",
   "a": "В каждом городе есть сильные международные школы с обучением на английском, русские школы в Лимасоле (LITC, MORFOSIS), румынская школа в Пафосе и греческая государственная система. Стоимость и списки ожидания разнятся, поэтому подавайте документы заранее — школа часто становится решающим фактором для переезжающих семей."
  }
 },
 "banking": {
  "el": {
   "q": "Μπορώ να ανοίξω τραπεζικό λογαριασμό στην Κύπρο;",
   "a": "Ναι, αλλά περιμένετε ελέγχους συμμόρφωσης και KYC (αποδεικτικό διεύθυνσης, προέλευση κεφαλαίων) — η διαδικασία είναι πιο απαιτητική απ' ό,τι πριν το 2018. Οι τοπικές τράπεζες (Bank of Cyprus, Hellenic) καλύπτουν την ουσία· οι fintech (Revolut, Wise) καλύπτουν την καθημερινότητα. Ένας τοπικός δικηγόρος ή λογιστής διευκολύνει το άνοιγμα εταιρικού λογαριασμού ή λογαριασμού μη κατοίκου."
  },
  "ro": {
   "q": "Pot să îmi deschid un cont bancar în Cipru?",
   "a": "Da, dar așteaptă-te la verificări de conformitate și KYC (dovada adresei, sursa fondurilor) — este mai anevoios decât înainte de 2018. Băncile locale (Bank of Cyprus, Hellenic) acoperă partea de fond; fintech-urile (Revolut, Wise) acoperă nevoile zilnice. Un avocat sau un contabil local ușurează deschiderea unui cont de firmă sau de nerezident."
  },
  "ar": {
   "q": "هل يمكنني فتح حساب مصرفي في قبرص؟",
   "a": "نعم، لكن توقّع إجراءات الامتثال ومعرفة العميل KYC (إثبات العنوان، ومصدر الأموال) — وهي أكثر تعقيداً مما كانت عليه قبل 2018. وتغطّي البنوك المحلية (Bank of Cyprus وHellenic) الأعمال الجوهرية؛ وتغطّي شركات التقنية المالية (Revolut وWise) المعاملات اليومية. ويسهّل محامٍ أو محاسب محلي فتح حساب لشركة أو لغير المقيم."
  },
  "de": {
   "q": "Kann ich auf Zypern ein Bankkonto eröffnen?",
   "a": "Ja, aber rechnen Sie mit Compliance und KYC (Adressnachweis, Herkunft der Mittel) – es ist aufwendiger als vor 2018. Lokale Banken (Bank of Cyprus, Hellenic) sorgen für Substanz; Fintechs (Revolut, Wise) für den Alltag. Ein einheimischer Anwalt oder Buchhalter erleichtert ein Firmen- oder Gebietsfremdenkonto."
  },
  "pl": {
   "q": "Czy mogę otworzyć konto bankowe na Cyprze?",
   "a": "Tak, ale przygotuj się na procedury zgodności i KYC (potwierdzenie adresu, źródło środków) — jest to bardziej wymagające niż przed 2018. Lokalne banki (Bank of Cyprus, Hellenic) obsługują poważniejsze potrzeby; fintechy (Revolut, Wise) sprawdzają się na co dzień. Lokalny prawnik lub księgowy ułatwi założenie konta firmowego lub dla nierezydenta."
  },
  "ru": {
   "q": "Можно ли открыть банковский счёт на Кипре?",
   "a": "Да, но будьте готовы к комплаенсу и KYC (подтверждение адреса, источник средств) — это сложнее, чем до 2018 года. Местные банки (Bank of Cyprus, Hellenic) подходят для серьёзных операций; финтех-сервисы (Revolut, Wise) — для повседневных. Местный юрист или бухгалтер упростит открытие корпоративного счёта или счёта нерезидента."
  }
 },
 "cost-of-living": {
  "el": {
   "q": "Ποιο είναι το κόστος ζωής στην Κύπρο;",
   "a": "Είναι χαμηλότερο από τις δυτικοευρωπαϊκές πρωτεύουσες αλλά ανεβαίνει, και η Λεμεσός είναι αισθητά ακριβότερη από την Πάφο, τη Λάρνακα ή τη Λευκωσία — το ενοίκιο είναι ο παράγοντας που κάνει τη διαφορά και οι λογαριασμοί κοινής ωφέλειας εκτοξεύονται με το κλιματιστικό το καλοκαίρι. Ένα ζευγάρι ζει άνετα με πολύ λιγότερα απ' ό,τι στο Λονδίνο ή το Μόναχο, ειδικά στην ενδοχώρα."
  },
  "ro": {
   "q": "Care este costul vieții în Cipru?",
   "a": "Este sub nivelul capitalelor vest-europene, dar în creștere, iar Limassol este vizibil mai scump decât Paphos, Larnaca sau Nicosia — chiria este factorul care face diferența, iar utilitățile cresc brusc din cauza aerului condiționat vara. Un cuplu trăiește confortabil cu mult mai puțin decât la Londra sau München, mai ales în interiorul insulei."
  },
  "ar": {
   "q": "ما تكلفة المعيشة في قبرص؟",
   "a": "هي أدنى من عواصم أوروبا الغربية لكنها في ارتفاع، وليماسول أغلى بوضوح من بافوس أو لارنكا أو نيقوسيا؛ والإيجار هو العامل المرجّح، وترتفع فواتير المرافق مع تشغيل التكييف صيفاً. ويعيش الزوجان بأريحية بأقل بكثير مما يلزم في لندن أو ميونخ، خصوصاً في الداخل."
  },
  "de": {
   "q": "Wie hoch sind die Lebenshaltungskosten auf Zypern?",
   "a": "Sie liegen unter denen westeuropäischer Hauptstädte, steigen aber, und Limassol ist deutlich teurer als Paphos, Larnaka oder Nikosia – die Miete ist der ausschlaggebende Faktor, und die Nebenkosten schnellen mit der sommerlichen Klimaanlage in die Höhe. Ein Paar lebt bequem für weit weniger als in London oder München, besonders im Landesinneren."
  },
  "pl": {
   "q": "Jakie są koszty życia na Cyprze?",
   "a": "Są niższe niż w stolicach Europy Zachodniej, ale rosną, a Limassol jest wyraźnie droższe niż Pafos, Larnaka czy Nikozja — o różnicy decyduje czynsz, a rachunki skaczą latem przez klimatyzację. Para żyje komfortowo za znacznie mniej niż w Londynie czy Monachium, zwłaszcza w głębi wyspy."
  },
  "ru": {
   "q": "Каков уровень стоимости жизни на Кипре?",
   "a": "Она ниже, чем в столицах Западной Европы, но растёт, и Лимасол заметно дороже Пафоса, Ларнаки или Никосии — определяющий фактор аренда, а счета за коммунальные услуги подскакивают из-за летнего кондиционирования. Пара живёт комфортно, тратя куда меньше, чем в Лондоне или Мюнхене, особенно вдали от побережья."
  }
 },
 "import-pet-car": {
  "el": {
   "q": "Πώς εισάγω το κατοικίδιο ή το αυτοκίνητό μου;",
   "a": "Τα κατοικίδια ακολουθούν τους κανόνες του ευρωπαϊκού διαβατηρίου κατοικιδίων — το μικροτσίπ και ο εμβολιασμός κατά της λύσσας το κάνουν απλό από την ΕΕ. Τα αυτοκίνητα μπορούν να εισαχθούν, αλλά υπολογίστε κόστος για την εγγραφή, τον τεχνικό έλεγχο και τους φόρους, και θυμηθείτε ότι στην Κύπρο η οδήγηση γίνεται στα αριστερά (τα αυτοκίνητα με δεξί τιμόνι ταιριάζουν απόλυτα) — συχνά είναι απλούστερο να αγοράσετε επιτόπου."
  },
  "ro": {
   "q": "Cum îmi aduc animalul de companie sau mașina?",
   "a": "Animalele de companie respectă regulile UE privind pașaportul pentru animale — microcipul și vaccinarea antirabică fac lucrurile simple dacă vii din UE. Mașinile pot fi importate, dar prevede bani pentru înmatriculare, inspecție tehnică și taxe și nu uita că în Cipru se circulă pe stânga (mașinile cu volan pe dreapta se potrivesc perfect) — de multe ori este mai simplu să cumperi local."
  },
  "ar": {
   "q": "كيف أستورد حيواني الأليف أو سيارتي؟",
   "a": "تخضع الحيوانات الأليفة لقواعد جواز سفر الحيوانات في الاتحاد الأوروبي؛ فالشريحة الإلكترونية والتطعيم ضد داء الكَلَب يجعلان الأمر ميسّراً من داخل الاتحاد. ويمكن استيراد السيارات، لكن خصّص ميزانية للتسجيل واختبار الصلاحية للسير والضرائب، وتذكّر أن القيادة في قبرص على الجهة اليسرى (السيارات ذات المقود الأيمن مناسبة تماماً)؛ وغالباً ما يكون الشراء محلياً أبسط."
  },
  "de": {
   "q": "Wie importiere ich mein Haustier oder mein Auto?",
   "a": "Für Haustiere gelten die EU-Regeln zum Heimtierausweis – mit Mikrochip und Tollwutimpfung ist es aus der EU unkompliziert. Autos lassen sich importieren, kalkulieren Sie aber Zulassung, Verkehrstauglichkeitsprüfung und Steuern ein, und denken Sie daran, dass auf Zypern Linksverkehr herrscht (Rechtslenker passen bestens) – oft ist es einfacher, vor Ort zu kaufen."
  },
  "pl": {
   "q": "Jak sprowadzić zwierzę lub samochód?",
   "a": "Zwierzęta podlegają unijnym zasadom paszportu dla zwierząt — mikroczip i szczepienie przeciw wściekliźnie sprawiają, że z terenu UE jest to proste. Samochody można sprowadzać, ale zaplanuj koszty rejestracji, przeglądu i podatków oraz pamiętaj, że na Cyprze obowiązuje ruch lewostronny (auta z kierownicą po prawej pasują idealnie) — często prościej jest kupić na miejscu."
  },
  "ru": {
   "q": "Как ввезти питомца или автомобиль?",
   "a": "Питомцы подчиняются правилам европейского ветеринарного паспорта — чип и прививка от бешенства делают ввоз из ЕС простым. Автомобиль ввезти можно, но заложите расходы на регистрацию, техосмотр и налоги и помните, что на Кипре левостороннее движение (машины с правым рулём здесь как раз к месту) — часто проще купить машину на месте."
  }
 },
 "form-company": {
  "el": {
   "q": "Πώς συστήνω εταιρεία στην Κύπρο, και πόσο κοστίζει;",
   "a": "Μια κυπριακή Ltd είναι το τυπικό σχήμα — η σύσταση κοστίζει χοντρικά €1,000–2,500 μέσω δικηγόρου ή λογιστή, συν την ετήσια λογιστική παρακολούθηση και τον έλεγχο. Από το 2026 ο εταιρικός φόρος είναι 15% (από 12.5%) και το ετήσιο τέλος εταιρείας των €350 καταργείται. Συνδυάστε τη με το καθεστώς non-dom για τον εντυπωσιακά χαμηλό πραγματικό συντελεστή."
  },
  "ro": {
   "q": "Cum înființez o companie în Cipru și cât costă?",
   "a": "O societate cipriotă de tip Ltd este vehiculul standard — înființarea costă aproximativ €1,000–2,500 prin intermediul unui avocat sau contabil, plus contabilitatea și auditul anual. Din 2026, impozitul pe profit este de 15% (în creștere de la 12.5%), iar taxa anuală de companie de €350 este eliminată. Combină-o cu regimul non-dom pentru rata efectivă redusă de care se vorbește peste tot."
  },
  "ar": {
   "q": "كيف أؤسّس شركة في قبرص، وكم يكلّف ذلك؟",
   "a": "شركة Cyprus Ltd هي الكيان القياسي؛ ويتراوح التأسيس بنحو €1,000–2,500 عبر محامٍ أو محاسب، إضافةً إلى المحاسبة والتدقيق السنويين. واعتباراً من 2026 تبلغ ضريبة الشركات 15% (بعد أن كانت 12.5%)، وأُلغِي رسم الشركة السنوي البالغ €350. اقرِنها بنظام non-dom للحصول على المعدّل الفعلي المنخفض المُعلَن."
  },
  "de": {
   "q": "Wie gründe ich auf Zypern eine Gesellschaft, und was kostet das?",
   "a": "Eine Cyprus Ltd ist das Standardvehikel – die Gründung kostet über einen Anwalt oder Buchhalter etwa €1,000–2,500, hinzu kommen jährliche Buchhaltung und Prüfung. Ab 2026 beträgt die Körperschaftsteuer 15% (zuvor 12.5%) und die jährliche Gesellschaftsabgabe von €350 entfällt. Kombinieren Sie sie mit der Non-Dom-Regelung für den werbewirksam niedrigen effektiven Satz."
  },
  "pl": {
   "q": "Jak założyć spółkę na Cyprze i ile to kosztuje?",
   "a": "Cypryjska spółka Ltd to standardowe rozwiązanie — założenie kosztuje mniej więcej €1,000–2,500 przez prawnika lub księgowego, plus coroczna księgowość i audyt. Od 2026 podatek dochodowy od spółek wynosi 15% (wzrost z 12.5%), a roczna opłata firmowa €350 została zniesiona. Połącz to z reżimem non-dom, by uzyskać nagłówkowo niską efektywną stawkę."
  },
  "ru": {
   "q": "Как зарегистрировать компанию на Кипре и сколько это стоит?",
   "a": "Кипрская Ltd — стандартный инструмент; регистрация обходится примерно в €1,000–2,500 через юриста или бухгалтера, плюс ежегодная бухгалтерия и аудит. С 2026 года корпоративный налог составляет 15% (повышен с 12.5%), а ежегодный корпоративный сбор в €350 отменён. Сочетайте её с режимом non-dom ради той самой низкой эффективной ставки."
  }
 },
 "find-accountant": {
  "el": {
   "q": "Πώς βρίσκω έναν καλό λογιστή ή δικηγόρο, και ποιες είναι οι συνήθεις αμοιβές;",
   "a": "Ο επαγγελματικός κλάδος είναι βαθύς και αγγλόφωνος. Ζητήστε εκ των προτέρων σταθερές αμοιβές ή ξεκάθαρες ωριαίες χρεώσεις, συστάσεις στον τομέα σας, και αντιστοιχία γλώσσας (ρωσικά, ελληνικά, αγγλικά). Χτίζουμε έναν ελεγμένο κατάλογο επαγγελματιών ώστε ο κόσμος να σταματήσει να βασίζεται στο «ποιον χρησιμοποιούν όλοι;»."
  },
  "ro": {
   "q": "Cum găsesc un contabil sau un avocat bun și care sunt onorariile obișnuite?",
   "a": "Stratul de profesioniști este consistent și vorbitor de engleză. Cere din start onorarii fixe sau tarife orare clare, referințe din domeniul tău și potrivire de limbă (rusă, greacă, engleză). Construim un director profesional verificat, ca oamenii să nu mai depindă de întrebarea „cu cine lucrează toată lumea?”."
  },
  "ar": {
   "q": "كيف أجد محاسباً أو محامياً جيّداً، وما الأتعاب المعتادة؟",
   "a": "الطبقة المهنية عميقة وناطقة بالإنجليزية. اطلب مقدّماً أتعاباً ثابتة أو أسعاراً واضحة بالساعة، ومراجع في قطاعك، وتطابقاً في اللغة (الروسية أو اليونانية أو الإنجليزية). ونحن نبني دليلاً مهنياً مُدقَّقاً كي يتوقّف الناس عن الاعتماد على سؤال «من يتعامل معه الجميع؟»."
  },
  "de": {
   "q": "Wie finde ich einen guten Buchhalter oder Anwalt, und wie hoch sind die üblichen Honorare?",
   "a": "Die Dienstleisterlandschaft ist breit und englischsprachig. Bitten Sie vorab um Festhonorare oder klare Stundensätze, um Referenzen aus Ihrer Branche und um eine passende Sprache (Russisch, Griechisch, Englisch). Wir bauen ein geprüftes Fachverzeichnis auf, damit sich niemand mehr auf „Wen nehmen eigentlich alle?“ verlassen muss."
  },
  "pl": {
   "q": "Jak znaleźć dobrego księgowego lub prawnika i jakie są typowe honoraria?",
   "a": "Warstwa profesjonalistów jest liczna i anglojęzyczna. Od razu pytaj o stałe honoraria lub jasne stawki godzinowe, referencje w twojej branży oraz dopasowanie językowe (rosyjski, grecki, angielski). Budujemy zweryfikowany katalog profesjonalistów, by ludzie przestali polegać na „a kto obsługuje wszystkich?”."
  },
  "ru": {
   "q": "Как найти хорошего бухгалтера или юриста и каковы обычные гонорары?",
   "a": "Слой специалистов здесь глубокий и англоязычный. Заранее просите фиксированные гонорары или чёткие почасовые ставки, рекомендации в вашей сфере и совпадение по языку (русский, греческий, английский). Мы создаём проверенный каталог специалистов, чтобы люди перестали полагаться на вопрос «а к кому все обращаются?»."
  }
 },
 "expand-business": {
  "el": {
   "q": "Πώς επεκτείνω την επιχείρησή μου ή βρίσκω τοπικούς συνεργάτες;",
   "a": "Η Κύπρος υπεραποδίδει σε σχέση με το μέγεθός της στη ναυτιλία, το fintech, την πληροφορική και τις υπηρεσίες — η Λεμεσός έχει μια πυκνή τεχνολογική σκηνή. Οι δρόμοι εισόδου είναι τα εμπορικά επιμελητήρια, η δικτύωση ανά κλάδο και ο κατάλογός μας B2B. Η σύνδεση προμηθευτών, συνεργατών και πελατών είναι η βασική υπόσχεση της πλατφόρμας."
  },
  "ro": {
   "q": "Cum îmi extind afacerea sau cum găsesc parteneri locali?",
   "a": "Ciprul contează mai mult decât ar sugera dimensiunea sa în transport maritim, fintech, IT și servicii — Limassol are o scenă tech densă. Căile de intrare sunt camerele de comerț, networkingul pe sectoare și directorul nostru B2B. Conectarea furnizorilor, partenerilor și clienților este promisiunea centrală a platformei."
  },
  "ar": {
   "q": "كيف أوسّع نشاطي التجاري أو أجد شركاء محليين؟",
   "a": "تتفوّق قبرص على حجمها في الشحن البحري والتقنية المالية وتقنية المعلومات والخدمات؛ ولليماسول مشهد تقني كثيف. ومنافذ الدخول هي الغرف التجارية، والتشبيك القطاعي، ودليلنا للأعمال بين الشركات. وربط المورّدين والشركاء والعملاء هو الوعد الجوهري للمنصّة."
  },
  "de": {
   "q": "Wie erweitere ich mein Unternehmen oder finde lokale Partner?",
   "a": "Zypern spielt in Schifffahrt, Fintech, IT und Dienstleistungen eine größere Rolle, als seine Größe vermuten lässt – Limassol hat eine dichte Tech-Szene. Die Wege hinein führen über die Handelskammern, Branchen-Networking und unser B2B-Verzeichnis. Anbieter, Partner und Kunden zu vernetzen, ist das Kernversprechen der Plattform."
  },
  "pl": {
   "q": "Jak rozwinąć biznes lub znaleźć lokalnych partnerów?",
   "a": "Cypr gra powyżej swojej wagi w żegludze, fintechu, IT i usługach — Limassol ma gęstą scenę technologiczną. Drogi wejścia to izby handlowe, networking branżowy i nasz katalog B2B. Łączenie dostawców, partnerów i klientów to główna obietnica platformy."
  },
  "ru": {
   "q": "Как расширить бизнес или найти местных партнёров?",
   "a": "Кипр играет выше своего веса в судоходстве, финтехе, ИТ и услугах — в Лимасоле плотная технологическая среда. Пути входа — торговые палаты, отраслевой нетворкинг и наш B2B-каталог. Соединять поставщиков, партнёров и клиентов — ключевое обещание платформы."
  }
 },
 "business-banking": {
  "el": {
   "q": "Ποιες είναι οι τραπεζικές επιλογές και οι επιλογές πληρωμών για μια επιχείρηση;",
   "a": "Χρησιμοποιήστε τοπικές τράπεζες για την ουσία και ιδρύματα ηλεκτρονικού χρήματος (EMI) ή fintech (Revolut Business, Wise) για γρήγορες συναλλαγές σε πολλά νομίσματα. Περιμένετε μια ενδελεχή διαδικασία εγγραφής (onboarding) — μια καθαρή εταιρική δομή και ένας τοπικός λογιστής την κάνουν πολύ πιο ομαλή."
  },
  "ro": {
   "q": "Care sunt opțiunile bancare și de plată pentru o afacere?",
   "a": "Folosește băncile locale pentru partea de fond și instituțiile de monedă electronică (EMI) sau fintech-urile (Revolut Business, Wise) pentru operațiuni rapide în mai multe valute. Așteaptă-te la un proces de onboarding riguros — o structură corporativă curată și un contabil local îl fac mult mai lin."
  },
  "ar": {
   "q": "ما خيارات الخدمات المصرفية والمدفوعات للشركات؟",
   "a": "استخدم البنوك المحلية للأعمال الجوهرية، ومؤسّسات النقود الإلكترونية (EMIs) أو شركات التقنية المالية (Revolut Business وWise) للمعاملات السريعة متعددة العملات. وتوقّع إجراءات تسجيل دقيقة؛ فهيكل مؤسّسي نظيف ومحاسب محلي يجعلان الأمر أكثر سلاسةً بكثير."
  },
  "de": {
   "q": "Welche Banking- und Zahlungsoptionen gibt es für ein Unternehmen?",
   "a": "Nutzen Sie lokale Banken für Substanz und E-Geld-Institute oder Fintechs (Revolut Business, Wise) für schnelle Mehrwährungslösungen. Rechnen Sie mit einem gründlichen Onboarding – eine saubere Unternehmensstruktur und ein einheimischer Buchhalter machen es deutlich reibungsloser."
  },
  "pl": {
   "q": "Jakie są opcje bankowe i płatnicze dla firmy?",
   "a": "Korzystaj z lokalnych banków do poważniejszych operacji, a z instytucji pieniądza elektronicznego (EMI) lub fintechów (Revolut Business, Wise) do szybkich operacji wielowalutowych. Przygotuj się na dokładny proces onboardingu — czysta struktura korporacyjna i lokalny księgowy znacznie go usprawnią."
  },
  "ru": {
   "q": "Какие банковские и платёжные варианты есть для бизнеса?",
   "a": "Для серьёзных операций используйте местные банки, а для быстрых мультивалютных — EMI или финтех-сервисы (Revolut Business, Wise). Будьте готовы к тщательному онбордингу — прозрачная корпоративная структура и местный бухгалтер сильно его упрощают."
  }
 },
 "vat-employer": {
  "el": {
   "q": "Ποιες είναι οι υποχρεώσεις ΦΠΑ και εργοδότη;",
   "a": "Ο ΦΠΑ είναι 19% ο κανονικός συντελεστής, με μειωμένους συντελεστές 9%, 5% και 0% για συγκεκριμένα αγαθά και υπηρεσίες. Οι εργοδότες εγγράφονται στις κοινωνικές ασφαλίσεις και στο GESY και εφαρμόζουν παρακράτηση φόρου μισθωτών (PAYE)· ένας λογιστής αναλαμβάνει τις δηλώσεις, οπότε συνυπολογίστε το σε κάθε σχέδιο προσλήψεων."
  },
  "ro": {
   "q": "Care sunt obligațiile de TVA și cele de angajator?",
   "a": "TVA este de 19% cota standard, cu cote reduse de 9%, 5% și 0% pentru anumite bunuri și servicii. Angajatorii se înregistrează pentru asigurările sociale și GESY și rețin impozitul pe salarii la sursă (PAYE); un contabil se ocupă de declarații, așa că ia asta în calcul în orice plan de angajare."
  },
  "ar": {
   "q": "ما التزامات ضريبة القيمة المضافة وصاحب العمل؟",
   "a": "ضريبة القيمة المضافة القياسية 19%، مع شرائح مخفّضة بنسب 9% و5% و0% لسلع وخدمات محدّدة. ويسجّل أصحاب العمل في التأمين الاجتماعي وGESY ويطبّقون نظام الاستقطاع من المنبع (PAYE)؛ ويتولّى المحاسب الإقرارات، فضع ذلك في حسبانك في أي خطة توظيف."
  },
  "de": {
   "q": "Welche MwSt.- und Arbeitgeberpflichten gibt es?",
   "a": "Die MwSt. beträgt regulär 19%, mit ermäßigten Sätzen von 9%, 5% und 0% für bestimmte Waren und Dienstleistungen. Arbeitgeber melden sich bei der Sozialversicherung und bei GESY an und führen die Lohnsteuer im Quellenabzug ab; ein Buchhalter übernimmt die Meldungen, kalkulieren Sie dies also bei jeder Einstellungsplanung ein."
  },
  "pl": {
   "q": "Jakie są obowiązki w zakresie VAT i obowiązki pracodawcy?",
   "a": "Standardowa stawka VAT to 19%, z obniżonymi progami 9%, 5% i 0% dla określonych towarów i usług. Pracodawcy rejestrują się w ubezpieczeniach społecznych i GESY oraz prowadzą rozliczenia PAYE; deklaracjami zajmuje się księgowy, więc uwzględnij to w każdym planie zatrudnienia."
  },
  "ru": {
   "q": "Каковы обязательства по НДС и обязанности работодателя?",
   "a": "Стандартный НДС — 19%, со сниженными ставками 9%, 5% и 0% для отдельных товаров и услуг. Работодатели регистрируются в системе социального страхования и GESY и удерживают налог с зарплат (PAYE); отчётность ведёт бухгалтер, так что закладывайте это в любой план найма."
  }
 },
 "engagement-ring": {
  "el": {
   "q": "Πού αγοράζω ένα δαχτυλίδι αρραβώνων — και μπορώ να πάρω πίσω τον ΦΠΑ;",
   "a": "Οι περιοχές κοσμηματοπωλείων της Λεμεσού και της Λευκωσίας φιλοξενούν τους ειδικούς σε διαμάντια και τους χρυσοχόους που φτιάχνουν κατά παραγγελία δεσίματα 18k. Επιμείνετε στη σφραγίδα του Γραφείου Ελέγχου Πολυτίμων Μετάλλων (Assay Office) (750 = 18k, 585 = 14k, 925 ασήμι) και σε πιστοποιητικό GIA ή IGI για την πέτρα. Ο ΦΠΑ είναι 19%, και οι επισκέπτες εκτός ΕΕ μπορούν να τον πάρουν πίσω στο αεροδρόμιο."
  },
  "ro": {
   "q": "De unde cumpăr un inel de logodnă — și pot recupera TVA-ul?",
   "a": "Cartierele de bijuterii din Limassol și Nicosia găzduiesc specialiștii în diamante și bijutierii-artizani care realizează montaje personalizate din aur de 18k. Insistă pe marcajul Oficiului de Marcare — Assay Office — (750 = 18k, 585 = 14k, 925 argint) și pe un certificat GIA sau IGI pentru piatră. TVA este de 19%, iar vizitatorii din afara UE îl pot recupera la aeroport."
  },
  "ar": {
   "q": "أين أشتري خاتم خطوبة — وهل يمكنني استرداد ضريبة القيمة المضافة؟",
   "a": "تضمّ أحياء المجوهرات في ليماسول ونيقوسيا خبراء الألماس والصاغة المهرة الذين يصنعون تركيبات مخصّصة من عيار 18k. أصرّ على ختم دار الفحص (750 = 18k، و585 = 14k، و925 للفضة) وعلى شهادة GIA أو IGI للحجر. وضريبة القيمة المضافة 19%، ويمكن للزوّار من خارج الاتحاد الأوروبي استردادها في المطار."
  },
  "de": {
   "q": "Wo kaufe ich einen Verlobungsring – und kann ich die MwSt. zurückfordern?",
   "a": "In den Juweliervierteln von Limassol und Nikosia sitzen die Diamantspezialisten und Goldschmiede, die individuelle 18-karätige Fassungen anfertigen. Bestehen Sie auf dem Feingehaltsstempel des Punzierungsamts (750 = 18 kt, 585 = 14 kt, 925 Silber) und auf einem GIA- oder IGI-Zertifikat für den Stein. Die MwSt. beträgt 19%, und Besucher von außerhalb der EU können sie am Flughafen zurückfordern."
  },
  "pl": {
   "q": "Gdzie kupić pierścionek zaręczynowy — i czy mogę odzyskać VAT?",
   "a": "Dzielnice jubilerskie Limassol i Nikozji skupiają specjalistów od diamentów i jubilerów wykonujących na zamówienie oprawy z 18-karatowego złota. Domagaj się cechy probierczej urzędu probierczego (750 = 18k, 585 = 14k, 925 srebro) oraz certyfikatu GIA lub IGI dla kamienia. VAT wynosi 19%, a odwiedzający spoza UE mogą go odzyskać na lotnisku."
  },
  "ru": {
   "q": "Где купить помолвочное кольцо и можно ли вернуть НДС?",
   "a": "В ювелирных кварталах Лимасола и Никосии работают специалисты по бриллиантам и мастера-ювелиры, изготавливающие оправы из 18-каратного золота на заказ. Требуйте клеймо Пробирной палаты (750 = 18 карат, 585 = 14 карат, 925 — серебро) и сертификат GIA или IGI на камень. НДС — 19%, и гости не из ЕС могут вернуть его в аэропорту."
  }
 },
 "authentic-gifts": {
  "el": {
   "q": "Ποια αυθεντικά κυπριακά δώρα να πάρω μαζί μου στο σπίτι;",
   "a": "Τα τέσσερα που φωνάζουν «Κύπρος» και ταξιδεύουν καλά: το λουκούμι Γεροσκήπου, ένα μισό μπουκάλι Κομανδαρίας, ασημένια συρματερή (φιλιγκράν) ή δαντέλα Λευκάρων με σφραγίδα γνησιότητας, και χαλούμι σε συσκευασία κενού. Επίσης ζιβανία, προϊόντα χαρουπιού, κεραμικά Κόρνου και χάλκινα είδη. Αγοράστε στα χωριά απευθείας από τον παραγωγό — και ελέγξτε ότι η πίσω πλευρά της δαντέλας Λευκάρων είναι τόσο περιποιημένη όσο και η μπροστινή."
  },
  "ro": {
   "q": "Ce cadouri cipriote autentice ar trebui să duc acasă?",
   "a": "Cele patru care spun „Cipru” și rezistă la drum: loukoumi de Geroskipou (rahatul cipriot), o jumătate de sticlă de Commandaria, argint filigranat sau dantelă de Lefkara cu marcaj, și halloumi ambalat în vid. De asemenea, zivania, produse din roșcove, ceramică de Kornos și obiecte din aramă. Cumpără din sate, direct de la producător — și verifică dacă dosul dantelei de Lefkara este la fel de îngrijit ca fața."
  },
  "ar": {
   "q": "ما الهدايا القبرصية الأصيلة التي ينبغي أن آخذها معي إلى الوطن؟",
   "a": "أربع هدايا تنطق باسم قبرص وتتحمّل السفر جيداً: لوكوم يروسكيبو (راحة قبرص)، ونصف زجاجة من Commandaria، وفضّة ليفكارا المُطعَّمة المختومة أو دانتيلها، والحلوم المعبّأ تفريغياً. وكذلك الزيفانيا، ومنتجات الخرّوب، وفخّار كورنوس، والمشغولات النحاسية. اشترِ في القرى من الصانع نفسه — وتأكّد من أن ظهر تطريز ليفكارا أنيق كواجهته."
  },
  "de": {
   "q": "Welche authentischen zypriotischen Geschenke sollte ich mit nach Hause nehmen?",
   "a": "Die vier, die für Zypern stehen und den Transport gut überstehen: Loukoumi aus Geroskipou (zypriotische Süßigkeit), eine halbe Flasche Commandaria, punziertes Filigransilber oder Spitze aus Lefkara und vakuumverpackter Halloumi. Außerdem Zivania, Johannisbrot-Produkte, Töpferwaren aus Kornos und Kupferwaren. Kaufen Sie in den Dörfern direkt beim Hersteller – und prüfen Sie, ob die Rückseite der Lefkara-Spitze so sauber ist wie die Vorderseite."
  },
  "pl": {
   "q": "Jakie autentyczne cypryjskie prezenty zabrać do domu?",
   "a": "Cztery, które mówią „Cypr” i dobrze znoszą podróż: loukoumi z Geroskipou (cypryjski rachatłukum), półbutelka Commandarii, srebro filigranowe lub koronka z Lefkary z cechą probierczą oraz halloumi pakowane próżniowo. A także zivania, produkty z chleba świętojańskiego, ceramika z Kornos i wyroby z miedzi. Kupuj we wsiach bezpośrednio od wytwórcy — i sprawdź, czy spód koronki z Lefkary jest równie schludny jak wierzch."
  },
  "ru": {
   "q": "Какие аутентичные кипрские подарки стоит привезти домой?",
   "a": "Четвёрка, которая говорит «Кипр» и хорошо переносит дорогу: лукумы из Героскипу (кипрский рахат-лукум), полбутылки Коммандарии, серебряная филигрань или кружево из Лефкары с клеймом и халуми в вакуумной упаковке. Также зивания, продукты из рожкового дерева, керамика из Корноса и изделия из меди. Покупайте в деревнях у самого мастера — и проверьте, чтобы изнанка лефкарского кружева была такой же аккуратной, как и лицевая сторона."
  }
 },
 "where-to-shop": {
  "el": {
   "q": "Πού αγοράζω έπιπλα, ηλεκτρονικά ή τρόφιμα;",
   "a": "Εμπορικά κέντρα και μεγάλα καταστήματα περιβάλλουν κάθε πόλη (η Λευκωσία και η Λεμεσός έχουν τα μεγαλύτερα)· το Bazaraki κυριαρχεί στα μεταχειρισμένα, για τα πάντα από καναπέδες μέχρι αυτοκίνητα. Για γκουρμέ κυπριακά καλάθια δώρων, τα τοπικά ντελικατέσεν και οι παραγωγοί αποστέλλουν σε όλο το νησί."
  },
  "ro": {
   "q": "De unde cumpăr mobilă, electronice sau alimente?",
   "a": "Mall-urile și magazinele mari înconjoară fiecare oraș (Nicosia și Limassol le au pe cele mai mari); Bazaraki domină piața second-hand pentru orice, de la canapele la mașini. Pentru coșuri gourmet cipriote, delicatesele și producătorii locali livrează în toată insula."
  },
  "ar": {
   "q": "أين أشتري الأثاث أو الإلكترونيات أو البقالة؟",
   "a": "تحيط المولات والمتاجر الكبرى بكل مدينة (وأكبرها في نيقوسيا وليماسول)؛ ويهيمن Bazaraki على سوق المستعمل لكل شيء من الأرائك إلى السيارات. وللسلال القبرصية الفاخرة، تشحن المتاجر المتخصّصة والمنتِجون المحليون إلى الجزيرة كلها."
  },
  "de": {
   "q": "Wo kaufe ich Möbel, Elektronik oder Lebensmittel?",
   "a": "Einkaufszentren und großflächige Fachmärkte umgeben jede Stadt (Nikosia und Limassol haben die größten); bei Gebrauchtwaren dominiert Bazaraki alles vom Sofa bis zum Auto. Für zypriotische Gourmet-Geschenkkörbe liefern lokale Feinkostläden und Produzenten inselweit."
  },
  "pl": {
   "q": "Gdzie kupić meble, elektronikę lub artykuły spożywcze?",
   "a": "Centra handlowe i wielkopowierzchniowe sklepy otaczają każde miasto (największe są w Nikozji i Limassol); Bazaraki dominuje na rynku używanych, od kanap po samochody. Po gurmandzkie cypryjskie kosze prezentowe sięgnij do lokalnych delikatesów i producentów, którzy wysyłają na całą wyspę."
  },
  "ru": {
   "q": "Где покупать мебель, электронику или продукты?",
   "a": "Вокруг каждого города — торговые центры и большие гипермаркеты (крупнейшие в Никосии и Лимасоле); на рынке б/у всё, от диванов до автомобилей, царит Bazaraki. За гурманскими кипрскими наборами обращайтесь к местным гастрономам и производителям — они доставляют по всему острову."
  }
 },
 "flowers-gifts": {
  "el": {
   "q": "Πώς στέλνω λουλούδια ή ένα δώρο;",
   "a": "Απευθυνθείτε απευθείας σε ένα κυπριακό ανθοπωλείο για αυθημερόν παράδοση εντός πόλης (μπουκέτα περίπου €25–60), αντί για έναν παγκόσμιο μεσάζοντα που απλώς προωθεί την παραγγελία. Τα γκουρμέ καλάθια δώρων κοστίζουν περίπου €30–100."
  },
  "ro": {
   "q": "Cum trimit flori sau un cadou?",
   "a": "Apelează direct la o florărie din Cipru pentru livrare în aceeași zi în oraș (buchete de circa €25–60), în loc de un intermediar global care doar retransmite comanda. Coșurile gourmet costă circa €30–100."
  },
  "ar": {
   "q": "كيف أرسل الزهور أو هدية؟",
   "a": "استعن بمحل زهور قبرصي مباشرةً للتوصيل داخل المدينة في اليوم نفسه (باقات بنحو €25–60) بدلاً من وسيط عالمي يكتفي بإعادة تمرير الطلب. وتبلغ السلال الفاخرة نحو €30–100."
  },
  "de": {
   "q": "Wie verschicke ich Blumen oder ein Geschenk?",
   "a": "Nutzen Sie direkt einen zypriotischen Floristen für die taggleiche Lieferung in der Stadt (Sträuße etwa €25–60) statt eines globalen Zwischenhändlers, der die Bestellung nur weitervermittelt. Gourmet-Geschenkkörbe kosten etwa €30–100."
  },
  "pl": {
   "q": "Jak wysłać kwiaty lub prezent?",
   "a": "Skorzystaj bezpośrednio z cypryjskiej kwiaciarni, by zamówić dostawę tego samego dnia w mieście (bukiety około €25–60), zamiast globalnego pośrednika, który tylko przekazuje zamówienie dalej. Gurmandzkie kosze prezentowe kosztują około €30–100."
  },
  "ru": {
   "q": "Как отправить цветы или подарок?",
   "a": "Обращайтесь напрямую к кипрскому флористу для доставки по городу в тот же день (букеты примерно €25–60), а не к глобальному посреднику, который просто перепродаёт заказ. Гурманские наборы стоят около €30–100."
  }
 },
 "emergencies": {
  "el": {
   "q": "Ποιοι είναι οι αριθμοί έκτακτης ανάγκης και πού βρίσκονται τα νοσοκομεία;",
   "a": "Το 112 καλεί αστυνομία, ασθενοφόρο και πυροσβεστική. Κάθε πόλη διαθέτει Τμήμα Επειγόντων Περιστατικών, και τα φαρμακεία λειτουργούν με εναλλασσόμενο πρόγραμμα ολονύκτιας εφημερίας. Αποθηκεύστε το πλησιέστερο νοσοκομείο και ένα 24ωρο φαρμακείο πριν τα χρειαστείτε — τα καταγράφουμε και τα δύο ανά πόλη."
  },
  "ro": {
   "q": "Care sunt numerele de urgență și unde se află spitalele?",
   "a": "112 te pune în legătură cu poliția, ambulanța și pompierii. Fiecare oraș are o unitate de primiri urgențe, iar farmaciile funcționează după un program rotativ de gardă pe timp de noapte. Salvează-ți în telefon cel mai apropiat spital și o farmacie non-stop înainte să ai nevoie de ele — noi le listăm pe amândouă, pe orașe."
  },
  "ar": {
   "q": "ما أرقام الطوارئ وأين تقع المستشفيات؟",
   "a": "يصلك الرقم 112 بالشرطة والإسعاف والإطفاء. وفي كل مدينة قسم للطوارئ، وتعمل الصيدليات وفق جدول مناوبات ليلية بالتناوب. احفظ أقرب مستشفى وصيدلية تعمل على مدار 24 ساعة قبل أن تحتاج إليهما — ونحن ندرج الاثنين حسب المدينة."
  },
  "de": {
   "q": "Wie lauten die Notrufnummern und wo sind die Krankenhäuser?",
   "a": "Über 112 erreichen Sie Polizei, Rettungsdienst und Feuerwehr. Jede Stadt hat eine Notaufnahme, und die Apotheken betreiben einen rotierenden Nachtdienstplan. Speichern Sie das nächstgelegene Krankenhaus und eine 24-Stunden-Apotheke, bevor Sie sie brauchen – wir führen beide nach Ort auf."
  },
  "pl": {
   "q": "Jakie są numery alarmowe i gdzie znajdują się szpitale?",
   "a": "Numer 112 łączy z policją, pogotowiem i strażą pożarną. Każde miasto ma ostry dyżur (SOR), a apteki pełnią rotacyjne całonocne dyżury. Zapisz sobie najbliższy szpital i całodobową aptekę, zanim będą potrzebne — podajemy jedno i drugie według miasta."
  },
  "ru": {
   "q": "Какие номера экстренных служб и где находятся больницы?",
   "a": "112 соединяет с полицией, скорой помощью и пожарными. В каждом городе есть отделение неотложной помощи, а аптеки работают по скользящему графику круглосуточных дежурств. Сохраните контакты ближайшей больницы и круглосуточной аптеки заранее — мы приводим и то, и другое по городам."
  }
 },
 "english-doctor": {
  "el": {
   "q": "Πού βρίσκω έναν αγγλόφωνο ή ρωσόφωνο γιατρό ή οδοντίατρο;",
   "a": "Είναι ευρέως διαθέσιμοι, ιδίως αγγλόφωνοι στην Πάφο και ρωσόφωνοι στη Λεμεσό. Οι ιδιωτικές επισκέψεις είναι γρήγορες και σε λογικές τιμές, και οι περισσότεροι παθολόγοι, οδοντίατροι και ειδικοί αναφέρουν τις γλώσσες που μιλούν. Προβάλλουμε τη γλώσσα και την κατάσταση GESY/ιδιωτικής σε κάθε καταχώριση."
  },
  "ro": {
   "q": "Unde găsesc un medic sau un dentist vorbitor de engleză sau de rusă?",
   "a": "Sunt disponibili din belșug, mai ales engleza în Paphos și rusa în Limassol. Consultațiile private sunt rapide și rezonabile ca preț, iar majoritatea medicilor de familie, dentiștilor și specialiștilor își menționează limbile vorbite. Evidențiem limba și statutul GESY/privat la fiecare listare."
  },
  "ar": {
   "q": "أين أجد طبيباً أو طبيب أسنان يتحدّث الإنجليزية أو الروسية؟",
   "a": "هم متوفّرون على نطاق واسع، خصوصاً الإنجليزية في بافوس والروسية في ليماسول. والاستشارات الخاصة سريعة وأسعارها معقولة، ويذكر معظم أطباء العائلة وأطباء الأسنان والأخصائيين اللغات التي يتحدّثونها. ونحن نُبرِز اللغة والحالة ضمن GESY أو القطاع الخاص في كل قائمة."
  },
  "de": {
   "q": "Wo finde ich einen englisch- oder russischsprachigen Arzt oder Zahnarzt?",
   "a": "Sie sind weit verbreitet, besonders Englisch in Paphos und Russisch in Limassol. Private Sprechstunden sind schnell und preislich angemessen, und die meisten Hausärzte, Zahnärzte und Fachärzte geben ihre Sprachen an. Wir weisen bei jedem Eintrag die Sprache und den GESY-/Privatstatus aus."
  },
  "pl": {
   "q": "Gdzie znaleźć lekarza lub dentystę mówiącego po angielsku lub rosyjsku?",
   "a": "Jest ich wielu, zwłaszcza mówiących po angielsku w Pafos i po rosyjsku w Limassol. Prywatne konsultacje są szybkie i rozsądnie wycenione, a większość lekarzy rodzinnych, dentystów i specjalistów podaje, jakimi językami się posługuje. Przy każdym wpisie pokazujemy język oraz status GESY/prywatny."
  },
  "ru": {
   "q": "Где найти англо- или русскоговорящего врача или стоматолога?",
   "a": "Их много, особенно с английским в Пафосе и с русским в Лимасоле. Частные консультации проходят быстро и стоят разумно, а большинство терапевтов, стоматологов и узких специалистов указывают, на каких языках говорят. Мы показываем язык и статус GESY/частная в каждой карточке."
  }
 },
 "pharmacies": {
  "el": {
   "q": "Πώς λειτουργούν τα φαρμακεία και οι συνταγές;",
   "a": "Οι φαρμακοποιοί είναι άρτια καταρτισμένοι και μπορούν να σας συμβουλέψουν για μικροενοχλήσεις, ενώ πολλά φάρμακα που αλλού πωλούνται χωρίς συνταγή διατίθενται και εδώ. Φέρτε μια βεβαίωση γιατρού για τα ελεγχόμενα φάρμακα· τα εφημερεύοντα φαρμακεία καλύπτουν τις νύχτες και τις αργίες."
  },
  "ro": {
   "q": "Cum funcționează farmaciile și rețetele?",
   "a": "Farmaciștii sunt foarte bine pregătiți și pot da sfaturi pentru afecțiuni minore, iar multe medicamente vândute fără rețetă în alte părți se găsesc și aici. Adu o adeverință de la medic pentru medicamentele cu regim special; farmaciile de gardă acoperă nopțile și sărbătorile."
  },
  "ar": {
   "q": "كيف تعمل الصيدليات والوصفات الطبية؟",
   "a": "الصيادلة مدرّبون تدريباً عالياً ويمكنهم إسداء النصح في الأمراض البسيطة، وكثير من الأدوية التي تُباع دون وصفة في أماكن أخرى متوفّرة هنا أيضاً. أحضِر مذكّرة من الطبيب للأدوية الخاضعة للرقابة؛ وتغطّي صيدليات المناوبة الليالي والعطلات."
  },
  "de": {
   "q": "Wie funktionieren Apotheken und Rezepte?",
   "a": "Apotheker sind bestens ausgebildet und können bei leichten Beschwerden beraten, und viele Medikamente, die andernorts rezeptfrei erhältlich sind, gibt es auch hier. Bringen Sie für kontrollierte Arzneimittel eine ärztliche Bescheinigung mit; Notdienstapotheken decken Nächte und Feiertage ab."
  },
  "pl": {
   "q": "Jak działają apteki i recepty?",
   "a": "Farmaceuci są dobrze wykształceni i mogą doradzić przy drobnych dolegliwościach, a wiele leków sprzedawanych gdzie indziej bez recepty jest dostępnych także tutaj. Na leki objęte kontrolą przynieś zaświadczenie od lekarza; apteki dyżurne działają nocami i w święta."
  },
  "ru": {
   "q": "Как устроены аптеки и рецепты?",
   "a": "Фармацевты хорошо подготовлены и могут проконсультировать при лёгких недомоганиях, а многие лекарства, которые в других странах продаются без рецепта, доступны и здесь. Для препаратов строгой отчётности берите с собой справку от врача; дежурные аптеки работают по ночам и в праздники."
  }
 },
 "family-beaches": {
  "el": {
   "q": "Τι μπορούμε να κάνουμε με τα παιδιά;",
   "a": "Πέρα από τις παραλίες: υδάτινα πάρκα (WaterWorld, Aphrodite, Fasouri), η ημέρα με βαρκάδα στο Γαλάζιο Λαγκόνι, πάρκα με γαϊδουράκια και φάρμες, ο Ζωολογικός Κήπος της Πάφου, και ήρεμα πικνίκ στο Τρόοδος. Οι περισσότερες παραλίες είναι ρηχές και Γαλάζιας Σημαίας — ιδανικές για οικογένειες με μικρά παιδιά."
  },
  "ro": {
   "q": "Ce putem face cu copiii?",
   "a": "Dincolo de plaje: parcuri acvatice (WaterWorld, Aphrodite, Fasouri), o zi cu barca la Blue Lagoon, ferme și parcuri cu măgăruși, Grădina Zoologică din Paphos și picnicuri lejere în Troodos. Cele mai multe plaje sunt puțin adânci și cu Steag Albastru — ideale pentru familiile cu copii mici."
  },
  "ar": {
   "q": "ماذا يمكننا أن نفعل مع الأطفال؟",
   "a": "إلى جانب الشواطئ: المدن المائية (WaterWorld وAphrodite وFasouri)، ويوم القارب في البحيرة الزرقاء، وحدائق الحمير والمزارع، وحديقة حيوان بافوس، ونزهات ترودوس الهادئة. ومعظم الشواطئ ضحلة وحائزة على العَلَم الأزرق — مثالية للعائلات ذات الأطفال الصغار."
  },
  "de": {
   "q": "Was können wir mit den Kindern unternehmen?",
   "a": "Über die Strände hinaus: Wasserparks (WaterWorld, Aphrodite, Fasouri), der Bootstag zur Blauen Lagune, Esel- und Bauernhofparks, der Zoo von Paphos und gemütliche Picknicks im Troodos-Gebirge. Die meisten Strände sind flach und tragen die Blaue Flagge – ideal für junge Familien."
  },
  "pl": {
   "q": "Co możemy robić z dziećmi?",
   "a": "Poza plażami: parki wodne (WaterWorld, Aphrodite, Fasouri), całodniowy rejs do Błękitnej Laguny, parki z osiołkami i gospodarstwa edukacyjne, zoo w Pafos oraz spokojne pikniki w Troodos. Większość plaż jest płytka i ma Błękitną Flagę — idealne dla rodzin z małymi dziećmi."
  },
  "ru": {
   "q": "Чем заняться с детьми?",
   "a": "Помимо пляжей: аквапарки (WaterWorld, Aphrodite, Fasouri), день на лодке к Голубой лагуне, ослиные и фермерские парки, зоопарк Пафоса и спокойные пикники в Троодосе. Большинство пляжей мелководные и с «Голубым флагом» — идеально для семей с маленькими детьми."
  }
 }
};

// --- localized accessors (fall back to the English source in qa.ts) ---------
function isTx(loc: string): loc is KBLoc {
  return loc === 'el' || loc === 'ro' || loc === 'ar' || loc === 'de' || loc === 'pl' || loc === 'ru';
}

/** Localized {q,a} for an intent id; English (from qa.ts) for en or any gap. */
export function localizedIntent(id: string, locale: string): IntentTx {
  const en = QA_INDEX[id]?.item as QAItem | undefined;
  const fallback: IntentTx = { q: en?.q ?? id, a: en?.a ?? '' };
  if (!isTx(locale)) return fallback;
  const tx = INTENT_I18N[id]?.[locale];
  return tx && tx.q && tx.a ? tx : fallback;
}

/** Localized {title,blurb} for a domain id; English for en or any gap. */
export function localizedDomain(id: string, locale: string): DomainTx {
  const d = QA_DOMAINS.find((x) => x.id === id);
  const fallback: DomainTx = { title: d?.title ?? id, blurb: d?.blurb ?? '' };
  if (!isTx(locale)) return fallback;
  const tx = DOMAIN_I18N[id]?.[locale];
  return tx && tx.title && tx.blurb ? tx : fallback;
}
