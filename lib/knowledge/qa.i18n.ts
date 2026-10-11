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
 },
 "doing-business": {
  "el": {
   "title": "Επιχειρείν & Συμμόρφωση",
   "blurb": "Ίδρυση και λειτουργία εταιρείας στην Κύπρο με τον επίσημο τρόπο — εγγραφή, φόροι και ΦΠΑ, άδειες, κοινωνικές ασφαλίσεις, χρηματοδότηση και έξοδος — με πηγή το κυβερνητικό Ενιαίο Κέντρο Εξυπηρέτησης."
  },
  "ro": {
   "title": "Afaceri și conformitate",
   "blurb": "Înființarea și conducerea unei companii în Cipru pe cale oficială — înregistrare, impozite și TVA, autorizații, asigurări sociale, finanțare și ieșire — cu informații din Punctul Unic de Contact guvernamental."
  },
  "ar": {
   "title": "ممارسة الأعمال والامتثال",
   "blurb": "تأسيس شركة وإدارتها في قبرص بالطريقة الرسمية — التسجيل والضرائب وضريبة القيمة المضافة والتراخيص والتأمينات الاجتماعية والتمويل والخروج من السوق — بالاعتماد على نقطة الاتصال الواحدة الحكومية."
  },
  "de": {
   "title": "Geschäftstätigkeit & Compliance",
   "blurb": "Ein Unternehmen in Zypern auf dem offiziellen Weg gründen und führen — Registrierung, Steuern und Mehrwertsteuer, Genehmigungen, Sozialversicherung, Finanzierung und Ausstieg — nach Angaben der staatlichen Einheitlichen Anlaufstelle."
  },
  "pl": {
   "title": "Prowadzenie działalności i zgodność z przepisami",
   "blurb": "Zakładanie i prowadzenie firmy na Cyprze oficjalną drogą — rejestracja, podatki i VAT, zezwolenia, ubezpieczenia społeczne, finansowanie i wyjście z biznesu — na podstawie rządowego Punktu Kontaktowego."
  },
  "ru": {
   "title": "Ведение бизнеса и соблюдение требований",
   "blurb": "Создание и ведение компании на Кипре официальным путём — регистрация, налоги и НДС, разрешения, социальное страхование, финансирование и выход из бизнеса — по данным государственного Единого контактного пункта."
  }
 },
 "licensing": {
  "el": {
   "title": "Άδειες & Ρυθμιζόμενα Επαγγέλματα",
   "blurb": "Ποια επαγγέλματα και δραστηριότητες απαιτούν άδεια στην Κυπριακή Δημοκρατία, ποια είναι η αρμόδια αρχή και τι χρειάζεται — από το επίσημο μητρώο ρυθμιζόμενων τομέων."
  },
  "ro": {
   "title": "Licențe și profesii reglementate",
   "blurb": "Ce profesii și activități necesită licență în Republica Cipru, autoritatea competentă și ce presupune obținerea ei — din registrul oficial al sectoarelor reglementate."
  },
  "ar": {
   "title": "التراخيص والمهن المنظَّمة",
   "blurb": "أي المهن والأنشطة تتطلب ترخيصًا في جمهورية قبرص، والجهة المختصة، وما الذي يلزم للحصول عليه — من السجل الرسمي للقطاعات المنظَّمة."
  },
  "de": {
   "title": "Lizenzen & reglementierte Berufe",
   "blurb": "Welche Berufe und Tätigkeiten in der Republik Zypern eine Lizenz erfordern, welche Behörde zuständig ist und was dafür nötig ist — nach dem offiziellen Register der reglementierten Sektoren."
  },
  "pl": {
   "title": "Licencje i zawody regulowane",
   "blurb": "Które zawody i rodzaje działalności wymagają licencji w Republice Cypryjskiej, jaki organ jest właściwy i co jest potrzebne — na podstawie oficjalnego rejestru sektorów regulowanych."
  },
  "ru": {
   "title": "Лицензии и регулируемые профессии",
   "blurb": "Какие профессии и виды деятельности требуют лицензии в Республике Кипр, какой орган компетентен и что для этого нужно — по официальному реестру регулируемых секторов."
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
 },
 "nightlife": {
  "el": {
   "q": "Πού βρίσκεται η καλύτερη νυχτερινή ζωή στην Κύπρο — μπαρ, κλαμπ και περιοχές διασκέδασης;",
   "a": "Το νησί χωρίζεται ανάλογα με τη διάθεση. Η Αγία Νάπα είναι η πρωτεύουσα του κεφιού — η πλατεία έχει τα μεγάλα κλαμπ και μπαρ και κορυφώνεται Ιούνιο–Σεπτέμβριο, ενώ το λιμάνι είναι πιο κομψό για κοκτέιλ· το γειτονικό Πρωταράς είναι πιο ήρεμο. Η Λεμεσός προσφέρει όλο τον χρόνο μια πιο ώριμη σκηνή: η συνοικία με τα μπαρ στην παλιά πόλη, η μαρίνα και η παραλιακή ζώνη, με beach clubs το καλοκαίρι. Η Πάφος επικεντρώνεται στην Bar Street στην Κάτω Πάφο, και η Λευκωσία έχει μια γνήσια τοπική σκηνή γύρω από τη Λήδρας και την παλιά πόλη. Υπολογίστε περίπου €6–12 το ποτό σε μπαρ, περισσότερα σε κλαμπ. Πείτε στον κονσιέρζ την πόλη και τη διάθεσή σας — μεγάλη βραδιά, κοκτέιλ με θέα ή εκεί όπου πηγαίνουν πραγματικά οι ντόπιοι — και θα σας κατευθύνουμε στη σωστή περιοχή και, όπου γίνεται, σε τραπέζι."
  },
  "ro": {
   "q": "Unde este cea mai bună viață de noapte din Cipru — baruri, cluburi și zone de petrecere?",
   "a": "Insula se împarte după dispoziție. Ayia Napa este capitala petrecerilor — în Piață se înghesuie marile cluburi și baruri, iar sezonul de vârf este iunie–septembrie, în timp ce portul e mai șic pentru cocktailuri; vecina Protaras este mai liniștită. Limassol oferă tot anul o scenă mai matură: cartierul barurilor din orașul vechi, marina și faleza, cu beach cluburi vara. Paphos se concentrează în jurul străzii Bar Street din Kato Paphos, iar Nicosia are o scenă autentic locală în jurul străzii Ledra și al orașului vechi. Socotiți aproximativ 6–12 € pe băutură într-un bar, mai mult într-un club. Spuneți concierge-ului orașul și atmosfera dorită — o seară mare, cocktailuri cu priveliște sau locul unde merg de fapt localnicii — și vă îndrumăm spre zona potrivită și, unde se poate, spre o masă."
  },
  "ar": {
   "q": "أين أفضل حياة ليلية في قبرص — الحانات والنوادي ومناطق السهر؟",
   "a": "تنقسم الجزيرة بحسب المزاج. آيا نابا عاصمة السهر — تعجّ ساحتها بالنوادي والحانات الكبرى وتبلغ ذروتها من يونيو إلى سبتمبر، بينما يتميّز الميناء بأجواء أنيقة للكوكتيلات؛ أما بروتاراس المجاورة فأهدأ. وتقدّم ليماسول مشهدًا ناضجًا على مدار العام: حي الحانات في البلدة القديمة والمارينا والشريط الساحلي، مع نوادي الشاطئ في الصيف. وتتمحور بافوس حول شارع Bar Street في كاتو بافوس، وفي نيقوسيا مشهد محلي أصيل حول شارع ليدرا والبلدة القديمة. احسب نحو 6–12 يورو للمشروب في الحانة، وأكثر في النوادي. أخبر الكونسيرج بمدينتك والأجواء التي تريدها — سهرة كبيرة أو كوكتيلات مع إطلالة أو المكان الذي يقصده أهل البلد فعلًا — وسنرشدك إلى المنطقة المناسبة، وإلى طاولة حيثما أمكن."
  },
  "de": {
   "q": "Wo gibt es das beste Nachtleben auf Zypern — Bars, Clubs und Partyviertel?",
   "a": "Die Insel teilt sich nach Stimmung. Ayia Napa ist die Partyhauptstadt — am Platz drängen sich die großen Clubs und Bars, die Hochsaison ist Juni bis September, während der Hafen glamouröser für Cocktails ist; das benachbarte Protaras ist ruhiger. Limassol bietet ganzjährig eine erwachsenere Szene: das Barviertel der Altstadt, die Marina und den Küstenstreifen, im Sommer mit Beach Clubs. Paphos konzentriert sich auf die Bar Street in Kato Paphos, und Nikosia hat eine echt lokale Szene rund um die Ledra-Straße und die Altstadt. Rechnen Sie mit etwa 6–12 € pro Drink in einer Bar, im Club mehr. Sagen Sie dem Concierge Ihre Stadt und die gewünschte Stimmung — große Partynacht, Cocktails mit Aussicht oder dort, wo die Einheimischen wirklich hingehen — und wir weisen Ihnen die passende Gegend und, wo möglich, einen Tisch."
  },
  "pl": {
   "q": "Gdzie jest najlepsze nocne życie na Cyprze — bary, kluby i strefy imprezowe?",
   "a": "Wyspa dzieli się według nastroju. Ayia Napa to stolica imprez — na placu gromadzą się największe kluby i bary, a szczyt przypada na czerwiec–wrzesień, podczas gdy port jest bardziej elegancki na koktajle; sąsiednie Protaras jest spokojniejsze. Limassol oferuje przez cały rok dojrzalszą scenę: dzielnica barów w starym mieście, marina i nadmorski pas, latem z beach clubami. Pafos koncentruje się wokół Bar Street w Kato Pafos, a Nikozja ma autentycznie lokalną scenę wokół ulicy Ledra i starego miasta. Licz się z około 6–12 € za drinka w barze, więcej w klubie. Powiedz konsjerżowi, w jakim jesteś mieście i jakiego klimatu szukasz — wielka noc, koktajle z widokiem czy miejsce, do którego naprawdę chodzą miejscowi — a wskażemy odpowiednią okolicę i, jeśli się da, stolik."
  },
  "ru": {
   "q": "Где на Кипре лучшая ночная жизнь — бары, клубы и места для вечеринок?",
   "a": "Остров делится по настроению. Айя-Напа — столица вечеринок: на площади теснятся крупные клубы и бары, пик сезона — с июня по сентябрь, а гавань более гламурна для коктейлей; соседний Протарас спокойнее. Лимассол — круглогодичная, более взрослая сцена: квартал баров в старом городе, марина и прибрежная полоса, летом с бич-клубами. Пафос сосредоточен вокруг Bar Street в Като-Пафосе, а в Никосии есть по-настоящему местная сцена вокруг улицы Ледра и старого города. Рассчитывайте примерно на 6–12 € за напиток в баре, в клубе дороже. Скажите консьержу свой город и желаемую атмосферу — большая ночь, коктейли с видом или место, куда на самом деле ходят местные, — и мы подскажем нужный район и, если получится, столик."
  }
 },
 "cypriot-culture": {
  "el": {
   "q": "Πώς είναι ο κυπριακός πολιτισμός — οι παραδόσεις, τα έθιμα και ο τρόπος ζωής;",
   "a": "Ο κυπριακός πολιτισμός είναι στον πυρήνα του ελληνόφωνος και ελληνορθόδοξος — ζεστός, οικογενειοκεντρικός και χωρίς βιασύνη («σιγά σιγά»). Το βασικό χαρακτηριστικό είναι η φιλοξενία: περιμένετε να σας κεράσουν πλούσια και να νιώσετε ευπρόσδεκτοι. Η καθημερινότητα κυλά με καφέ — τον πηχτό κυπριακό καφέ στο χωριάτικο καφενείο — και με μεγάλα κοινά γεύματα μεζέδων· οι γιορτές των ονομάτων συχνά μετρούν περισσότερο από τα γενέθλια· και το Ορθόδοξο Πάσχα είναι το μεγαλύτερο γεγονός της χρονιάς, πριν από τα Χριστούγεννα. Αξίζει να προλάβετε τα καλοκαιρινά πανηγύρια των χωριών, τον Κατακλυσμό (η μοναδικά κυπριακή γιορτή του Κατακλυσμού την Πεντηκοστή) και χειροτεχνίες όπως τα λευκαρίτικα, το ασημένιο φιλιγκράν και η κεραμική του Κόρνου. Τα αγγλικά μιλιούνται ευρέως, οπότε οι επισκέπτες προσαρμόζονται εύκολα — λίγος σεβασμός στους κανόνες της εκκλησίας και η διάθεση να καθίσετε και να φάτε βοηθούν πολύ."
  },
  "ro": {
   "q": "Cum este cultura cipriotă — tradițiile, obiceiurile și stilul de viață?",
   "a": "Cultura cipriotă este în esență vorbitoare de greacă și ortodoxă — caldă, centrată pe familie și fără grabă („siga siga”, încet-încet). Trăsătura definitorie este philoxenia, ospitalitatea: vă puteți aștepta să fiți ospătați generos și să vă simțiți bine-venit. Viața de zi cu zi se învârte în jurul cafelei — cafeaua groasă cipriotă dintr-un kafeneio de sat — și al meselor lungi cu meze; zilele onomastice contează adesea mai mult decât zilele de naștere; iar Paștele ortodox este cel mai mare eveniment al anului, înaintea Crăciunului. Merită prinse panigyria de vară ale satelor (serbările zilei hramului), Kataklysmos (Sărbătoarea Potopului, unic cipriotă, de Rusalii) și meșteșugurile precum dantela din Lefkara, argintăria filigranată și ceramica din Kornos. Engleza este foarte răspândită, așa că vizitatorii se integrează ușor — un pic de respect față de eticheta bisericească și bunăvoința de a vă așeza la masă contează foarte mult."
  },
  "ar": {
   "q": "كيف هي الثقافة القبرصية — التقاليد والعادات وأسلوب الحياة؟",
   "a": "الثقافة القبرصية ناطقة باليونانية وأرثوذكسية يونانية في جوهرها — دافئة تتمحور حول الأسرة وبلا استعجال («سيغا سيغا» أي ببطء). وسمتها الأبرز هي «فيلوكسينيا»، أي كرم الضيافة: توقّع أن تُطعَم بسخاء وأن تشعر بالترحيب. تقوم الحياة اليومية على القهوة — القهوة القبرصية الكثيفة في مقهى القرية — وعلى وجبات المزّة الطويلة المشتركة؛ وغالبًا ما يفوق عيد الاسم أهميةً عيد الميلاد؛ ويُعدّ عيد الفصح الأرثوذكسي أكبر مناسبات العام قبل عيد الميلاد. ومن التقاليد التي يستحق حضورها «البانيغيريا» الصيفية في القرى (احتفالات أعياد القديسين) و«كاتاكليسموس» (عيد الطوفان القبرصي الفريد في العنصرة)، وكذلك الحرف مثل دانتيل ليفكارا والفضة المخرَّمة وفخار كورنوس. اللغة الإنجليزية منتشرة جدًا فيسهل على الزائرين الاندماج، وقليل من احترام آداب الكنائس والاستعداد للجلوس إلى المائدة يقطعان شوطًا بعيدًا."
  },
  "de": {
   "q": "Wie ist die zypriotische Kultur — Traditionen, Bräuche und Lebensart?",
   "a": "Die zypriotische Kultur ist im Kern griechischsprachig und griechisch-orthodox — herzlich, familienzentriert und unaufgeregt („siga siga“, langsam-langsam). Das prägende Merkmal ist die Philoxenia, die Gastfreundschaft: Erwarten Sie, großzügig bewirtet zu werden und sich willkommen zu fühlen. Der Alltag läuft über Kaffee — den dickflüssigen zypriotischen Kaffee im Dorf-Kafeneio — und lange gemeinsame Meze-Mahlzeiten; Namenstage zählen oft mehr als Geburtstage; und das orthodoxe Osterfest ist das größte Ereignis des Jahres, noch vor Weihnachten. Sehenswerte Traditionen sind die sommerlichen Dorf-Panigyria (Kirchweihfeste), Kataklysmos (das einzigartig zypriotische Sintflutfest an Pfingsten) sowie Handwerk wie Lefkara-Spitze, Silberfiligran und Kornos-Keramik. Englisch wird sehr weit verstanden, sodass sich Besucher leicht zurechtfinden — ein wenig Respekt vor der Kirchenetikette und die Bereitschaft, sich zum Essen zu setzen, helfen sehr."
  },
  "pl": {
   "q": "Jaka jest kultura cypryjska — tradycje, zwyczaje i styl życia?",
   "a": "Kultura cypryjska jest w swoim rdzeniu greckojęzyczna i greckoprawosławna — ciepła, skupiona na rodzinie i niespieszna („siga siga”, powoli-powoli). Cechą wyróżniającą jest filoksenia, czyli gościnność: możesz liczyć na hojne poczęstunki i serdeczne przyjęcie. Codzienne życie toczy się wokół kawy — gęstej kawy po cypryjsku w wiejskim kafeneio — i długich, wspólnych posiłków meze; imieniny często znaczą więcej niż urodziny; a prawosławna Wielkanoc jest największym wydarzeniem roku, przed Bożym Narodzeniem. Warto zobaczyć letnie wiejskie panigyria (odpusty), Kataklysmos (wyjątkowo cypryjskie Święto Potopu przy Zesłaniu Ducha Świętego) oraz rzemiosło, takie jak koronka z Lefkary, srebrna filigranowa biżuteria i ceramika z Kornos. Angielski jest bardzo powszechny, więc odwiedzający łatwo się odnajdują — odrobina szacunku dla kościelnej etykiety i gotowość, by usiąść do stołu, bardzo pomagają."
  },
  "ru": {
   "q": "Какова кипрская культура — традиции, обычаи и образ жизни?",
   "a": "Кипрская культура по своей сути греко-язычная и греко-православная — тёплая, ориентированная на семью и неторопливая («сига-сига», медленно-медленно). Определяющая черта — филоксения, гостеприимство: ожидайте щедрого угощения и тёплого приёма. Повседневная жизнь строится вокруг кофе — густого кипрского кофе в деревенском кафенио — и долгих совместных застолий с мезе; именины нередко важнее дней рождения; а православная Пасха — главное событие года, значимее Рождества. Стоит застать летние деревенские панигирия (праздники в честь святых), Катаклисмос (уникальный кипрский Праздник потопа на Троицу) и ремёсла вроде кружева лефкара, серебряной филиграни и керамики Корноса. Английский очень распространён, так что приезжим легко освоиться, а немного уважения к церковному этикету и готовность сесть за стол очень помогают."
  }
 },
 "museums": {
  "el": {
   "q": "Ποια μουσεία αξίζει να επισκεφθώ στην Κύπρο;",
   "a": "Η Λευκωσία φιλοξενεί τα βαριά ονόματα: το Κυπριακό Μουσείο (η μεγάλη αρχαιολογική συλλογή του νησιού, από νεολιθικά ειδώλια ως ρωμαϊκά αγάλματα), η Πινακοθήκη Α.Γ. Λεβέντη (ευρωπαϊκή και κυπριακή τέχνη) και το Δημοτικό Μουσείο Λεβέντη (η ιστορία της ίδιας της πόλης). Η Λάρνακα έχει το Μουσείο Πιερίδη, μία από τις παλαιότερες ιδιωτικές συλλογές αρχαιοτήτων, καθώς και το επαρχιακό αρχαιολογικό μουσείο της· η Λεμεσός έχει αρχαιολογικό μουσείο και το μουσείο του μεσαιωνικού κάστρου· και το μουσείο Thalassa στην Αγία Νάπα αφηγείται την ιστορία της θάλασσας. Τα περισσότερα έχουν είσοδο λίγων ευρώ και κλείνουν συγκεκριμένες ημέρες ή αργίες, γι' αυτό ελέγξτε τα ωράρια πριν πάτε. Πείτε στον κονσιέρζ την πόλη και το ενδιαφέρον σας — αρχαιότητες, καλές τέχνες ή ναυτική ιστορία — και θα σας καθοδηγήσουμε."
  },
  "ro": {
   "q": "Ce muzee merită vizitate în Cipru?",
   "a": "Nicosia găzduiește greii: Muzeul Ciprului (marea colecție arheologică a insulei, de la figurine neolitice la statuaria romană), Galeria A.G. Leventis (artă europeană și cipriotă) și Muzeul Municipal Leventis (povestea orașului însuși). Larnaca are Muzeul Pierides, una dintre cele mai vechi colecții private de antichități, plus muzeul arheologic districtual; Limassol are un muzeu arheologic și muzeul castelului medieval; iar muzeul Thalassa din Ayia Napa spune povestea mării. Majoritatea cer doar câțiva euro la intrare și sunt închise în anumite zile sau de sărbători legale, așa că verificați programul înainte de a pleca. Spuneți concierge-ului orașul și interesul dumneavoastră — antichități, artă plastică sau maritim — și vă îndrumăm."
  },
  "ar": {
   "q": "ما المتاحف التي تستحق الزيارة في قبرص؟",
   "a": "تضم نيقوسيا أبرز المتاحف: المتحف القبرصي (المجموعة الأثرية الكبرى في الجزيرة، من التماثيل الصغيرة النيوليتية إلى المنحوتات الرومانية)، ومعرض أ. ج. ليفينتيس (الفن الأوروبي والقبرصي)، ومتحف ليفينتيس البلدي (قصة المدينة نفسها). وفي لارنكا متحف بيرييدس، من أقدم المجموعات الخاصة للآثار، إضافة إلى المتحف الأثري للمقاطعة؛ وفي ليماسول متحف أثري ومتحف القلعة الوسيطة؛ ويروي متحف «ثالاسا» في آيا نابا قصة البحر. تتقاضى معظمها بضعة يوروهات فقط وتُغلق في أيام معينة أو في العطل الرسمية، فتحقّق من المواعيد قبل الذهاب. أخبر الكونسيرج بمدينتك واهتمامك — آثار أو فنون جميلة أو تراث بحري — وسنرشدك."
  },
  "de": {
   "q": "Welche Museen sind auf Zypern einen Besuch wert?",
   "a": "Nikosia beherbergt die Schwergewichte: das Zypern-Museum (die große archäologische Sammlung der Insel, von neolithischen Figuren bis zu römischer Statuenkunst), die A.-G.-Leventis-Galerie (europäische und zypriotische Kunst) und das Leventis-Stadtmuseum (die Geschichte der Stadt selbst). Larnaka hat das Pierides-Museum, eine der ältesten privaten Antikensammlungen, sowie sein Bezirks-Archäologiemuseum; Limassol hat ein Archäologisches Museum und das Museum der mittelalterlichen Burg; und das Thalassa-Museum in Ayia Napa erzählt die Geschichte des Meeres. Die meisten verlangen nur wenige Euro Eintritt und sind an bestimmten Tagen oder Feiertagen geschlossen, prüfen Sie also vorher die Öffnungszeiten. Sagen Sie dem Concierge Ihre Stadt und Ihr Interesse — Antiken, bildende Kunst oder Schifffahrt — und wir beraten Sie."
  },
  "pl": {
   "q": "Jakie muzea warto odwiedzić na Cyprze?",
   "a": "W Nikozji znajdują się te najważniejsze: Muzeum Cypru (wielka kolekcja archeologiczna wyspy, od neolitycznych figurek po rzymskie rzeźby), Galeria A.G. Leventisa (sztuka europejska i cypryjska) oraz Muzeum Miejskie Leventisa (historia samego miasta). Larnaka ma Muzeum Pierides, jedną z najstarszych prywatnych kolekcji starożytności, oraz muzeum archeologiczne dystryktu; Limassol ma muzeum archeologiczne i muzeum średniowiecznego zamku; a muzeum Thalassa w Ayia Napie opowiada historię morza. Większość pobiera tylko kilka euro i jest zamknięta w określone dni lub święta, więc sprawdź godziny przed wyjściem. Powiedz konsjerżowi, w jakim jesteś mieście i co Cię interesuje — starożytności, sztuka czy morskie dziedzictwo — a pokierujemy Cię."
  },
  "ru": {
   "q": "Какие музеи стоит посетить на Кипре?",
   "a": "В Никосии находятся главные: Кипрский музей (великая археологическая коллекция острова — от неолитических статуэток до римской скульптуры), галерея А. Г. Левентиса (европейское и кипрское искусство) и Муниципальный музей Левентиса (история самого города). В Ларнаке есть музей Пиеридиса — одна из старейших частных коллекций древностей — и окружной археологический музей; в Лимассоле — археологический музей и музей средневекового замка; а музей «Таласса» в Айя-Напе рассказывает историю моря. Большинство берёт лишь несколько евро и закрыто в определённые дни или праздники, поэтому проверьте часы работы заранее. Скажите консьержу свой город и интерес — древности, изобразительное искусство или морская тема — и мы направим вас."
  }
 },
 "archaeological-sites": {
  "el": {
   "q": "Ποιους αρχαιολογικούς και αρχαίους χώρους πρέπει να δω στην Κύπρο;",
   "a": "Η Κύπρος έχει τρεις χώρους Παγκόσμιας Κληρονομιάς της UNESCO: το Αρχαιολογικό Πάρκο Πάφου (τα ρωμαϊκά ψηφιδωτά της Οικίας του Διονύσου, με τους Τάφους των Βασιλέων κοντά), τον νεολιθικό οικισμό της Χοιροκοιτίας ανάμεσα στη Λάρνακα και τη Λεμεσό (κυκλικές πέτρινες κατοικίες της 7ης χιλιετίας π.Χ.) και τις δέκα Ζωγραφισμένες Εκκλησίες του Τροόδους. Πέρα από αυτούς, μην χάσετε το Κούριο κοντά στη Λεμεσό — μια θεαματική ελληνορωμαϊκή πόλη με θέατρο στην άκρη του γκρεμού που χρησιμοποιείται ακόμη για καλοκαιρινές παραστάσεις — καθώς και την αρχαία Αμαθούντα, τα ερείπια του Κιτίου στη Λάρνακα και τον ευρύτερο χώρο της Νέας Πάφου. Φορέστε καπέλο και πάρτε νερό· οι χώροι ανοίγουν νωρίς και μερικοί κλείνουν μέσα στο απόγευμα το καλοκαίρι. Ένας αδειοδοτημένος ξεναγός τούς δίνει ζωή — πείτε στον κονσιέρζ σε ποια περιοχή βρίσκεστε και θα κανονίσουμε έναν."
  },
  "ro": {
   "q": "Ce situri arheologice și antice ar trebui să văd în Cipru?",
   "a": "Cipru are trei situri din Patrimoniul Mondial UNESCO: Parcul Arheologic Paphos (mozaicurile vilei romane Casa lui Dionysos, cu Mormintele Regilor în apropiere), așezarea neolitică Choirokoitia dintre Larnaca și Limassol (locuințe circulare din piatră din mileniul al VII-lea î.Hr.) și cele zece Biserici Pictate din Troodos. Dincolo de acestea, nu ratați Kourion, lângă Limassol — un oraș greco-roman spectaculos, cu un teatru pe marginea stâncii folosit și acum pentru spectacole de vară — precum și anticul Amathus, ruinele Kition din Larnaca și întregul sit Nea Paphos. Purtați pălărie și luați apă; siturile se deschid devreme, iar unele se închid în miez de după-amiază vara. Un ghid autorizat le dă viață — spuneți concierge-ului în ce zonă vă aflați și vă aranjăm unul."
  },
  "ar": {
   "q": "ما المواقع الأثرية والقديمة التي ينبغي أن أزورها في قبرص؟",
   "a": "في قبرص ثلاثة مواقع مدرجة في قائمة التراث العالمي لليونسكو: الحديقة الأثرية في بافوس (فسيفساء الفيلا الرومانية «بيت ديونيسوس»، وبالقرب منها مقابر الملوك)، ومستوطنة خيروكويتيا النيوليتية بين لارنكا وليماسول (مساكن حجرية دائرية تعود إلى الألفية السابعة قبل الميلاد)، والكنائس العشر المزخرفة في جبال ترودوس. وإلى جانبها لا تفوّت كوريون قرب ليماسول — مدينة إغريقية رومانية خلابة بمسرح على حافة الجرف ما زال يستضيف عروضًا صيفية — إضافة إلى أماثوس القديمة وآثار كيتيون في لارنكا وموقع نيا بافوس الأوسع. ارتدِ قبعة واحمل الماء؛ فالمواقع تفتح مبكرًا وبعضها يغلق في منتصف العصر صيفًا. ويبثّ المرشد المرخَّص الحياة فيها — أخبر الكونسيرج بالمنطقة التي أنت فيها وسنرتّب لك واحدًا."
  },
  "de": {
   "q": "Welche archäologischen und antiken Stätten sollte ich auf Zypern sehen?",
   "a": "Zypern hat drei UNESCO-Welterbestätten: den Archäologischen Park von Paphos (die römischen Villenmosaike des Hauses des Dionysos, mit den Königsgräbern in der Nähe), die neolithische Siedlung Choirokoitia zwischen Larnaka und Limassol (runde Steinhäuser aus dem 7. Jahrtausend v. Chr.) und die zehn bemalten Kirchen des Troodos. Darüber hinaus sollten Sie Kourion bei Limassol nicht verpassen — eine spektakuläre griechisch-römische Stadt mit einem Theater am Klippenrand, das im Sommer noch für Aufführungen genutzt wird — sowie das antike Amathus, die Ruinen von Kition in Larnaka und das weitläufige Gelände von Nea Paphos. Tragen Sie einen Hut und nehmen Sie Wasser mit; die Stätten öffnen früh, und einige schließen im Sommer am Nachmittag. Ein lizenzierter Guide erweckt sie zum Leben — sagen Sie dem Concierge, in welcher Gegend Sie sind, und wir arrangieren einen."
  },
  "pl": {
   "q": "Jakie stanowiska archeologiczne i antyczne warto zobaczyć na Cyprze?",
   "a": "Cypr ma trzy obiekty z listy światowego dziedzictwa UNESCO: Park Archeologiczny w Pafos (rzymskie mozaiki willi Dom Dionizosa, a w pobliżu Grobowce Królewskie), neolityczną osadę Choirokoitia między Larnaką a Limassol (okrągłe kamienne domostwa z VII tysiąclecia p.n.e.) oraz dziesięć Malowanych Kościołów w górach Troodos. Poza nimi nie przegap Kurionu koło Limassol — spektakularnego greckorzymskiego miasta z teatrem na skraju klifu, w którym wciąż odbywają się letnie przedstawienia — a także starożytnego Amathus, ruin Kition w Larnace i szerokiego stanowiska Nea Pafos. Zabierz kapelusz i wodę; stanowiska otwierają się wcześnie, a niektóre latem zamykają się w środku popołudnia. Licencjonowany przewodnik tchnie w nie życie — powiedz konsjerżowi, w jakim regionie jesteś, a zorganizujemy go."
  },
  "ru": {
   "q": "Какие археологические и древние места стоит увидеть на Кипре?",
   "a": "На Кипре три объекта Всемирного наследия ЮНЕСКО: Археологический парк Пафоса (мозаики римской виллы — Дом Диониса, неподалёку Царские гробницы), неолитическое поселение Хирокития между Ларнакой и Лимассолом (круглые каменные жилища VII тысячелетия до н. э.) и десять расписных церквей Троодоса. Помимо них не пропустите Курион близ Лимассола — впечатляющий греко-римский город с театром на краю обрыва, где до сих пор проходят летние спектакли, — а также древний Амафунт, руины Китиона в Ларнаке и обширный комплекс Неа-Пафос. Возьмите шляпу и воду; объекты открываются рано, а некоторые летом закрываются в середине дня. Лицензированный гид оживляет их — скажите консьержу, в каком районе вы находитесь, и мы организуем его."
  }
 },
 "theatre-arts": {
  "el": {
   "q": "Πώς είναι η σκηνή του θεάτρου, των ζωντανών παραστάσεων και των τεχνών στην Κύπρο;",
   "a": "Η Κύπρος έχει ένα ζωντανό ημερολόγιο παραστατικών τεχνών. Το Θέατρο Ριάλτο και το Παττίχειο στη Λεμεσό είναι οι κύριες σκηνές όλο τον χρόνο για δράμα, συναυλίες και χορό· η Λευκωσία έχει το εθνικό θέατρο (ΘΟΚ) και δημοτικούς χώρους· και η Πάφος το Μαρκίδειο. Η μαγεία είναι το καλοκαίρι, όταν ζωντανεύουν αρχαίοι χώροι: το Φεστιβάλ Αφροδίτη Πάφου ανεβάζει μεγάλη όπερα μπροστά στο μεσαιωνικό κάστρο κάθε Σεπτέμβριο, και το ελληνορωμαϊκό θέατρο του Κουρίου στην άκρη του βράχου φιλοξενεί Σαίξπηρ και κλασικό δράμα κάτω από τα άστρα. Μεγάλο μέρος του έντεχνου θεάτρου είναι στα ελληνικά, όμως η όπερα, ο χορός, η μουσική και τα φεστιβάλ ξεπερνούν κάθε γλώσσα. Πείτε στον κονσιέρζ τις ημερομηνίες σας και θα βρούμε τι παίζεται — δείτε και την ατζέντα εκδηλώσεων."
  },
  "ro": {
   "q": "Cum este scena de teatru, spectacole live și arte din Cipru?",
   "a": "Cipru are un calendar viu al artelor spectacolului. Teatrul Rialto și Pattihio din Limassol sunt principalele scene pe tot parcursul anului pentru teatru, concerte și dans; Nicosia are teatrul național (THOC) și săli municipale; iar Paphos are Markideio. Magia vine vara, când locurile antice prind viață: Festivalul Aphrodite de la Paphos pune în scenă mari opere în fața castelului medieval în fiecare septembrie, iar teatrul greco-roman de pe stâncă de la Kourion găzduiește Shakespeare și teatru clasic sub cerul liber. O mare parte din teatrul vorbit este în greacă, dar opera, dansul, muzica și festivalurile trec de orice limbă. Spuneți concierge-ului datele dumneavoastră și vă arătăm ce se joacă — vedeți și agenda noastră de evenimente."
  },
  "ar": {
   "q": "كيف هو المشهد المسرحي والعروض الحية والفنون في قبرص؟",
   "a": "لقبرص روزنامة نابضة للفنون الأدائية. يُعدّ مسرح ريالتو ومسرح باتيكيو في ليماسول المنصتين الرئيسيتين على مدار العام للدراما والحفلات والرقص؛ وفي نيقوسيا المسرح الوطني (THOC) وقاعات بلدية؛ وفي بافوس مسرح ماركيديو. أما السحر الحقيقي ففي الصيف حين تُبعث الأماكن الأثرية إلى الحياة: يقدّم مهرجان أفروديت في بافوس أوبرا كبرى أمام القلعة الوسيطة كل سبتمبر، ويستضيف المسرح الإغريقي الروماني في كوريون على حافة الجرف مسرحيات شكسبير والدراما الكلاسيكية تحت النجوم. معظم المسرح الناطق باليونانية، لكن الأوبرا والرقص والموسيقى والمهرجانات تتجاوز أي لغة. أخبر الكونسيرج بتواريخك وسنُظهر لك ما يُعرض — وانظر أيضًا جدول فعالياتنا."
  },
  "de": {
   "q": "Wie ist die Theater-, Live-Performance- und Kunstszene auf Zypern?",
   "a": "Zypern hat einen lebendigen Kalender der darstellenden Künste. Das Rialto-Theater und das Pattihio in Limassol sind die wichtigsten ganzjährigen Bühnen für Schauspiel, Konzerte und Tanz; Nikosia hat das Nationaltheater (THOC) und städtische Spielstätten; und Paphos das Markideio. Der Zauber liegt im Sommer, wenn antike Spielstätten zum Leben erwachen: Das Paphos Aphrodite Festival bringt jeden September große Oper vor die mittelalterliche Burg, und das griechisch-römische Theater von Kourion am Klippenrand zeigt Shakespeare und klassisches Drama unter den Sternen. Ein Großteil des Sprechtheaters ist auf Griechisch, doch Oper, Tanz, Musik und die Festivals überwinden jede Sprachgrenze. Nennen Sie dem Concierge Ihre Reisedaten, und wir zeigen Ihnen, was gespielt wird — siehe auch unseren Veranstaltungskalender."
  },
  "pl": {
   "q": "Jaka jest scena teatralna, występy na żywo i sztuka na Cyprze?",
   "a": "Cypr ma żywy kalendarz sztuk scenicznych. Teatr Rialto i Pattihio w Limassol to główne całoroczne sceny dramatu, koncertów i tańca; Nikozja ma teatr narodowy (THOC) i miejskie sale; a Pafos – Markideio. Magia dzieje się latem, gdy ożywają antyczne miejsca: Festiwal Afrodyty w Pafos wystawia co roku we wrześniu wielką operę na tle średniowiecznego zamku, a greckorzymski teatr w Kurionie na skraju klifu gości Szekspira i dramat klasyczny pod gwiazdami. Duża część teatru mówionego jest po grecku, ale opera, taniec, muzyka i festiwale przekraczają każdą barierę językową. Podaj konsjerżowi swoje daty, a pokażemy, co jest grane — zajrzyj też do naszego kalendarza wydarzeń."
  },
  "ru": {
   "q": "Что представляет собой театральная, концертная и художественная жизнь Кипра?",
   "a": "На Кипре насыщенный календарь исполнительских искусств. Театр «Риальто» и Паттихио в Лимассоле — главные круглогодичные сцены для драмы, концертов и танца; в Никосии есть национальный театр (THOC) и муниципальные площадки; в Пафосе — Маркидейо. Волшебство приходит летом, когда оживают древние площадки: Пафосский фестиваль Афродиты каждый сентябрь ставит большую оперу на фоне средневекового замка, а греко-римский театр в Курионе на краю обрыва принимает Шекспира и классическую драму под звёздами. Значительная часть драматического театра идёт по-гречески, но опера, танец, музыка и фестивали понятны на любом языке. Сообщите консьержу свои даты, и мы подскажем, что идёт, — смотрите также нашу афишу событий."
  }
 },
 "fine-dining": {
  "el": {
   "q": "Πού θα βρω υψηλή γαστρονομία ή δείπνο για ξεχωριστή περίσταση στην Κύπρο;",
   "a": "Η Κύπρος έχει μια αυθεντική σκηνή υψηλής γαστρονομίας, ισχυρότερη στη Λεμεσό — η μαρίνα, τα πολυτελή παραθαλάσσια ξενοδοχεία και ένα κύμα σύγχρονων κυπριακών κουζινών — με προσεγμένα τραπέζια στη Λευκωσία και λίγα στην Πάφο και στην Αγία Νάπα. Περιμένετε εκλεπτυσμένες προσεγγίσεις στα ντόπια υλικά του νησιού (φρέσκο λαβράκι και ψάρι, άγρια χόρτα, παλαιωμένο χαλλούμι, η γλυκιά Κουμανδαρία) δίπλα σε δυνατές μεσογειακές και διεθνείς αίθουσες. Ένα μενού γευσιγνωσίας με κρασί κοστίζει περίπου €70–150 το άτομο· το καλοκαίρι κλείστε νωρίς και ζητήστε βεράντα ή τραπέζι με θέα στη θάλασσα. Πείτε στον κονσιέρζ την περίσταση — επέτειο, επαγγελματικό δείπνο, θέα — και την περιοχή, και θα σας ταιριάξουμε με ένα επαληθευμένο εστιατόριο και, αν θέλετε, θα κανονίσουμε την κράτηση."
  },
  "ro": {
   "q": "Unde găsesc gastronomie rafinată sau o cină pentru o ocazie specială în Cipru?",
   "a": "Cipru are o scenă gastronomică autentică, mai puternică în Limassol — marina, hotelurile de lux de pe faleză și un val de bucătării cipriote moderne — cu mese rafinate în Nicosia și câteva în Paphos și Ayia Napa. Vă puteți aștepta la interpretări rafinate ale ingredientelor insulei (lup de mare și pește proaspăt, verdețuri sălbatice, halloumi maturat, dulcele Commandaria) alături de săli mediteraneene și internaționale de nivel înalt. Un meniu degustare cu vin costă aproximativ 70–150 € de persoană; vara rezervați din timp și cereți o terasă sau o masă cu vedere la mare. Spuneți concierge-ului ocazia — o aniversare, o cină de afaceri, o priveliște — și districtul, și vă potrivim cu un restaurant verificat și, dacă doriți, facem rezervarea."
  },
  "ar": {
   "q": "أين أجد مطعمًا راقيًا أو عشاءً لمناسبة خاصة في قبرص؟",
   "a": "في قبرص مشهد حقيقي للمطاعم الراقية، هو الأقوى في ليماسول — المارينا والفنادق الفاخرة على الواجهة البحرية وموجة من المطابخ القبرصية الحديثة — مع طاولات أنيقة في نيقوسيا وعدد قليل في بافوس وآيا نابا. توقّع معالجات راقية لمكونات الجزيرة نفسها (القاروس والسمك الطازج والأعشاب البرية والحلوم المعتّق ونبيذ كومانداريا الحلو) إلى جانب قاعات متوسطية ودولية قوية. تتراوح قائمة التذوق مع النبيذ تقريبًا بين 70 و150 يورو للفرد؛ وفي الصيف احجز مسبقًا واطلب شرفة أو طاولة تطل على البحر. أخبر الكونسيرج بالمناسبة — ذكرى سنوية أو عشاء عمل أو إطلالة — وبالمنطقة، وسنوفّق بينك وبين مطعم موثَّق ونرتّب الحجز إن رغبت."
  },
  "de": {
   "q": "Wo finde ich gehobene Gastronomie oder ein Dinner für einen besonderen Anlass auf Zypern?",
   "a": "Zypern hat eine echte Spitzengastronomie-Szene, am stärksten in Limassol — Marina, Luxushotels am Meer und eine Welle moderner zypriotischer Küchen — mit stilvollen Tischen in Nikosia und einigen in Paphos und Ayia Napa. Erwarten Sie verfeinerte Interpretationen der Zutaten der Insel (frischer Wolfsbarsch und Fisch, wilde Kräuter, gereifter Halloumi, der süße Commandaria) neben starken mediterranen und internationalen Restaurants. Ein Degustationsmenü mit Wein kostet etwa 70–150 € pro Person; im Sommer rechtzeitig reservieren und um eine Terrasse oder einen Tisch mit Meerblick bitten. Sagen Sie dem Concierge den Anlass — Jahrestag, Geschäftsessen, Aussicht — und den Bezirk, und wir vermitteln Ihnen ein geprüftes Restaurant und übernehmen auf Wunsch die Reservierung."
  },
  "pl": {
   "q": "Gdzie znaleźć wykwintną kuchnię lub kolację na specjalną okazję na Cyprze?",
   "a": "Cypr ma prawdziwą scenę fine diningu, najsilniejszą w Limassol — marina, luksusowe hotele nad morzem i fala nowoczesnych kuchni cypryjskich — z eleganckimi stolikami w Nikozji i kilkoma w Pafos i Ayia Napie. Spodziewaj się wyrafinowanych ujęć lokalnych składników (świeży labraks i ryby, dzikie zielenie, dojrzewający halloumi, słodka Commandaria) obok mocnych restauracji śródziemnomorskich i międzynarodowych. Menu degustacyjne z winem to mniej więcej 70–150 € na osobę; latem rezerwuj z wyprzedzeniem i poproś o taras lub stolik z widokiem na morze. Powiedz konsjerżowi, jaka to okazja — rocznica, kolacja biznesowa, widok — i w jakim dystrykcie jesteś, a dopasujemy sprawdzoną restaurację i, jeśli chcesz, zajmiemy się rezerwacją."
  },
  "ru": {
   "q": "Где найти изысканную кухню или ужин по особому случаю на Кипре?",
   "a": "На Кипре есть настоящая сцена высокой кухни, сильнейшая в Лимассоле — марина, роскошные отели на берегу и волна современных кипрских кухонь — с утончёнными столами в Никосии и несколькими в Пафосе и Айя-Напе. Ждите изысканных прочтений местных продуктов острова (свежий сибас и рыба, дикая зелень, выдержанный халуми, сладкая «Коммандария») рядом с сильными средиземноморскими и международными залами. Дегустационное меню с вином обходится примерно в 70–150 € на человека; летом бронируйте заранее и просите террасу или столик с видом на море. Скажите консьержу повод — годовщина, деловой ужин, вид — и район, и мы подберём проверенный ресторан и при желании организуем бронь."
  }
 },
 "state-of-cyprus": {
  "el": {
   "q": "Ποια είναι η τρέχουσα κατάσταση στην Κύπρο — οικονομία, ασφάλεια και γενικό κλίμα — και είναι καλή στιγμή να βρίσκομαι εδώ;",
   "a": "Η Κύπρος (η Δημοκρατία, στον νότο) είναι σταθερό μέλος της ΕΕ και της ευρωζώνης και μία από τις ασφαλέστερες χώρες της ΕΕ — ο ενιαίος αριθμός έκτακτης ανάγκης είναι το 112. Από το 2026 είναι μία από τις ισχυρότερες οικονομίες της ΕΕ, με ανάπτυξη περίπου τριπλάσια από τον μέσο όρο της ΕΕ (περίπου 3% τον χρόνο), ανεργία κοντά στο 4% και επενδυτική βαθμίδα από όλους τους μεγάλους οίκους (S&P και Fitch A-, Moody's A3, DBRS A). Ο πληθωρισμός είναι μέτριος αλλά το κόστος ζωής αυξάνεται, και η Λεμεσός είναι αισθητά ακριβότερη από την Πάφο, τη Λάρνακα ή τη Λευκωσία. Το κλίμα είναι αισιόδοξο και εξωστρεφές — ο τουρισμός, η ναυτιλία, η τεχνολογία και οι χρηματοοικονομικές υπηρεσίες πάνε καλά — και στην καθημερινότητα νιώθεις χαλαρά, φιλόξενα και εύκολα αν μιλάς αγγλικά. Πρόκειται για στοιχεία του 2026 που αλλάζουν, γι' αυτό για οτιδήποτε κρίσιμο για αποφάσεις ελέγξτε τα τελευταία από την Κεντρική Τράπεζα της Κύπρου ή μια τρέχουσα πηγή ειδήσεων."
  },
  "ro": {
   "q": "Care este situația actuală din Cipru — economia, siguranța și atmosfera generală — și este un moment bun să fiu aici?",
   "a": "Cipru (Republica, din sud) este un membru stabil al UE și al zonei euro și una dintre cele mai sigure țări din UE — numărul unic de urgență este 112. În 2026 este una dintre cele mai puternice economii ale UE, cu o creștere de aproximativ trei ori peste media UE (circa 3% pe an), un șomaj de aproape 4% și rating de grad investițional de la toate agențiile majore (S&P și Fitch A-, Moody’s A3, DBRS A). Inflația este moderată, dar costul vieții crește, iar Limassol este vizibil mai scump decât Paphos, Larnaca sau Nicosia. Atmosfera este încrezătoare și deschisă spre exterior — turismul, transporturile maritime, tehnologia și serviciile financiare merg bine — iar în viața de zi cu zi este relaxat, primitor și ușor pentru vorbitorii de engleză. Sunt cifre din 2026 și se schimbă, așa că pentru orice este decisiv verificați cele mai recente date de la Banca Centrală a Ciprului sau o sursă de știri actuală."
  },
  "ar": {
   "q": "ما الوضع الراهن في قبرص — الاقتصاد والأمان والأجواء العامة — وهل هو وقت مناسب لوجودي هنا؟",
   "a": "قبرص (الجمهورية في الجنوب) عضو مستقر في الاتحاد الأوروبي ومنطقة اليورو، وهي من أكثر دول الاتحاد أمانًا — ورقم الطوارئ الموحّد هو 112. ويُعدّ اقتصادها اعتبارًا من 2026 من أقوى اقتصادات الاتحاد الأوروبي، إذ ينمو بنحو ثلاثة أضعاف متوسط الاتحاد (نحو 3% سنويًا)، مع بطالة قرب 4% وتصنيف استثماري من كل الوكالات الكبرى (S&P وFitch عند A-، وMoody’s عند A3، وDBRS عند A). التضخم معتدل لكن كلفة المعيشة في ارتفاع، وليماسول أغلى بوضوح من بافوس أو لارنكا أو نيقوسيا. الأجواء واثقة ومنفتحة — فالسياحة والشحن والتكنولوجيا والخدمات المالية كلها قوية — وفي الحياة اليومية تبدو هادئة ومرحِّبة وسهلة للناطقين بالإنجليزية. هذه أرقام 2026 وهي تتغيّر، لذا ففي كل ما يتعلق بقرار حاسم راجع أحدث ما يصدر عن البنك المركزي القبرصي أو مصدر أخبار حديث."
  },
  "de": {
   "q": "Wie ist die aktuelle Lage auf Zypern — Wirtschaft, Sicherheit und Stimmung — und ist jetzt ein guter Zeitpunkt, hier zu sein?",
   "a": "Zypern (die Republik im Süden) ist ein stabiles Mitglied von EU und Eurozone und eines der sichersten Länder der EU — die einheitliche Notrufnummer ist die 112. Im Jahr 2026 gehört es zu den stärksten Volkswirtschaften der EU, wächst etwa dreimal so schnell wie der EU-Durchschnitt (rund 3 % pro Jahr), hat eine Arbeitslosigkeit von nahe 4 % und wird von allen großen Agenturen mit Investment-Grade bewertet (S&P und Fitch A-, Moody’s A3, DBRS A). Die Inflation ist moderat, doch die Lebenshaltungskosten steigen, und Limassol ist deutlich teurer als Paphos, Larnaka oder Nikosia. Die Stimmung ist zuversichtlich und weltoffen — Tourismus, Schifffahrt, Technologie und Finanzdienstleistungen laufen gut — und im Alltag wirkt es entspannt, einladend und für Englischsprachige unkompliziert. Das sind Zahlen von 2026 und sie ändern sich; für alles Entscheidungsrelevante prüfen Sie daher die neuesten Angaben der Zentralbank von Zypern oder eine aktuelle Nachrichtenquelle."
  },
  "pl": {
   "q": "Jaka jest obecna sytuacja na Cyprze — gospodarka, bezpieczeństwo i ogólny nastrój — i czy to dobry moment, by tu być?",
   "a": "Cypr (Republika, na południu) to stabilny członek UE i strefy euro oraz jeden z najbezpieczniejszych krajów UE — jedyny numer alarmowy to 112. W 2026 roku jest jedną z najsilniejszych gospodarek UE, rosnącą mniej więcej trzy razy szybciej niż średnia unijna (około 3% rocznie), z bezrobociem bliskim 4% i oceną inwestycyjną wszystkich głównych agencji (S&P i Fitch A-, Moody’s A3, DBRS A). Inflacja jest umiarkowana, ale koszty życia rosną, a Limassol jest wyraźnie droższe niż Pafos, Larnaka czy Nikozja. Nastrój jest pewny siebie i otwarty na świat — turystyka, żegluga, technologie i usługi finansowe mają się dobrze — a na co dzień jest tu swobodnie, gościnnie i łatwo dla osób mówiących po angielsku. To dane z 2026 roku i ulegają zmianom, więc w sprawach kluczowych dla decyzji sprawdź najnowsze informacje w Banku Centralnym Cypru lub w aktualnym źródle wiadomości."
  },
  "ru": {
   "q": "Какова нынешняя ситуация на Кипре — экономика, безопасность и общее настроение — и подходящее ли сейчас время быть здесь?",
   "a": "Кипр (Республика, на юге) — стабильный член ЕС и еврозоны и одна из самых безопасных стран ЕС; единый номер экстренных служб — 112. По состоянию на 2026 год это одна из сильнейших экономик ЕС: рост примерно втрое выше среднего по ЕС (около 3 % в год), безработица около 4 %, и все крупные агентства присвоили инвестиционный рейтинг (S&P и Fitch A-, Moody’s A3, DBRS A). Инфляция умеренная, но стоимость жизни растёт, а Лимассол заметно дороже Пафоса, Ларнаки и Никосии. Настроение уверенное и открытое миру — туризм, судоходство, технологии и финансовые услуги чувствуют себя хорошо — а в повседневной жизни здесь спокойно, радушно и легко для англоговорящих. Это данные 2026 года, и они меняются, поэтому для важных решений проверяйте свежие сведения Центрального банка Кипра или актуальный новостной источник."
  }
 },
 "investing-in-cyprus": {
  "el": {
   "q": "Είναι η Κύπρος καλός προορισμός για επενδύσεις και πώς ξεκινούν οι ξένοι;",
   "a": "Η Κύπρος είναι πραγματικός επενδυτικός κόμβος, όχι απλώς νησί διακοπών — τα δυνατά της σημεία είναι η διαχείριση πλοίων (ένας από τους μεγαλύτερους στόλους της ΕΕ), οι χρηματοοικονομικές και επαγγελματικές υπηρεσίες, η ταχέως αναπτυσσόμενη τεχνολογική σκηνή της Λεμεσού, ο τουρισμός και η φιλοξενία, τα ακίνητα και η ενέργεια (υπεράκτιο φυσικό αέριο και ηλιακή). Οι ξένοι έρχονται συνήθως με έναν από τέσσερις τρόπους: αγορά ακινήτου (συχνά σε συνδυασμό με τη διαδρομή Μόνιμης Διαμονής των €300.000)· ίδρυση κυπριακής εταιρείας σε συνδυασμό με το καθεστώς non-dom· επένδυση μέσω ρυθμιζόμενων κυπριακών αμοιβαίων κεφαλαίων (AIFs)· ή άμεση ανάπτυξη ακινήτων. Το φορολογικό πλαίσιο είναι το πραγματικό κίνητρο — ο εταιρικός φόρος είναι 15% από το 2026, οι non-dom πληρώνουν 0% σε μερίσματα και τόκους (μόνο μια πλαφονάρισμένη εισφορά υγείας), συν ένα IP box 2,5% και πάνω από 60 συμβάσεις αποφυγής διπλής φορολογίας. Χρησιμοποιείτε πάντα ανεξάρτητο κύπριο δικηγόρο και αδειοδοτημένο σύμβουλο, κάντε προσεκτικό έλεγχο σε κάθε έργο ή κεφάλαιο, και σημειώστε ότι το «χρυσό διαβατήριο» της πολιτογράφησης μέσω επένδυσης καταργήθηκε το 2020 — η επένδυση αγοράζει διαμονή, όχι διαβατήριο."
  },
  "ro": {
   "q": "Este Cipru un loc bun pentru investiții și cum încep străinii?",
   "a": "Cipru este un adevărat hub investițional, nu doar o insulă de vacanță — punctele sale forte sunt managementul navelor (una dintre cele mai mari flote din UE), serviciile financiare și profesionale, scena tech în plină expansiune din Limassol, turismul și ospitalitatea, imobiliarele și energia (gaze offshore și solară). Străinii vin de obicei pe una din patru căi: cumpărarea unei proprietăți (adesea îmbinată cu ruta Reședinței Permanente de 300.000 €); înființarea unei companii cipriote și asocierea ei cu regimul non-dom; investiția prin fonduri cipriote reglementate (AIF); sau dezvoltarea imobiliară directă. Cadrul fiscal este adevărata atracție — impozitul pe profit este 15% din 2026, non-domiciliații plătesc 0% pe dividende și dobânzi (doar o contribuție de sănătate plafonată), plus un IP box de 2,5% și peste 60 de convenții de evitare a dublei impuneri. Folosiți întotdeauna un avocat cipriot independent și un consilier autorizat, faceți o verificare riguroasă a oricărui proiect sau fond și rețineți că „pașaportul de aur” al cetățeniei prin investiții a fost abolit în 2020 — investiția cumpără reședință, nu pașaport."
  },
  "ar": {
   "q": "هل قبرص مكان جيد للاستثمار، وكيف يبدأ الأجانب؟",
   "a": "قبرص مركز استثماري حقيقي وليست مجرد جزيرة عطلات — فمن نقاط قوتها إدارة السفن (أحد أكبر الأساطيل في الاتحاد الأوروبي) والخدمات المالية والمهنية ومشهد التكنولوجيا المتنامي بسرعة في ليماسول والسياحة والضيافة والعقارات والطاقة (الغاز البحري والطاقة الشمسية). يأتي الأجانب عادةً بإحدى أربع طرق: شراء عقار (غالبًا مع مسار الإقامة الدائمة بمبلغ 300,000 يورو)؛ أو تأسيس شركة قبرصية وربطها بنظام «غير المقيم الضريبي» (non-dom)؛ أو الاستثمار عبر صناديق قبرصية منظَّمة (AIF)؛ أو التطوير العقاري المباشر. والإطار الضريبي هو الجاذب الحقيقي — إذ تبلغ ضريبة الشركات 15% اعتبارًا من 2026، ويدفع غير المقيمين ضريبيًا 0% على الأرباح الموزعة والفوائد (مع اشتراك صحي محدّد السقف فقط)، إضافة إلى صندوق الملكية الفكرية بنسبة 2.5% وأكثر من 60 اتفاقية لتجنب الازدواج الضريبي. استعن دائمًا بمحامٍ قبرصي مستقل ومستشار مرخَّص، وأجرِ العناية الواجبة الكاملة لأي مشروع أو صندوق، وتذكّر أن «الجواز الذهبي» للجنسية مقابل الاستثمار أُلغي عام 2020 — فالاستثمار يمنح إقامة لا جوازًا."
  },
  "de": {
   "q": "Ist Zypern ein guter Ort zum Investieren, und wie fangen Ausländer an?",
   "a": "Zypern ist ein echter Investitionsstandort, nicht nur eine Urlaubsinsel — seine Stärken sind das Schiffsmanagement (eine der größten Flotten der EU), Finanz- und Fachdienstleistungen, eine schnell wachsende Tech-Szene in Limassol, Tourismus und Gastgewerbe, Immobilien und Energie (Offshore-Gas und Solar). Ausländer kommen meist auf einem von vier Wegen: Immobilienkauf (oft kombiniert mit dem Weg zur Daueraufenthaltsgenehmigung ab 300.000 €); Gründung einer zypriotischen Gesellschaft in Verbindung mit dem Non-Dom-Regime; Investition über regulierte zypriotische Fonds (AIFs); oder direkte Immobilienentwicklung. Der steuerliche Rahmen ist der eigentliche Anreiz — die Körperschaftsteuer beträgt ab 2026 15 %, Non-Doms zahlen 0 % auf Dividenden und Zinsen (nur ein gedeckelter Gesundheitsbeitrag), dazu eine 2,5-%-IP-Box und über 60 Doppelbesteuerungsabkommen. Ziehen Sie stets einen unabhängigen zypriotischen Anwalt und einen lizenzierten Berater hinzu, führen Sie bei jedem Projekt oder Fonds eine sorgfältige Prüfung durch und beachten Sie, dass der „Goldene Pass“ der Einbürgerung durch Investition 2020 abgeschafft wurde — Investition verschafft Aufenthalt, keinen Pass."
  },
  "pl": {
   "q": "Czy Cypr to dobre miejsce do inwestowania i jak zaczynają cudzoziemcy?",
   "a": "Cypr jest prawdziwym ośrodkiem inwestycyjnym, a nie tylko wyspą wakacyjną — jego atuty to zarządzanie statkami (jedna z największych flot w UE), usługi finansowe i profesjonalne, szybko rosnąca scena technologiczna w Limassol, turystyka i gościnność, nieruchomości oraz energetyka (gaz morski i słoneczna). Cudzoziemcy przychodzą zwykle czterema drogami: kupnem nieruchomości (często w parze ze ścieżką stałego pobytu za 300 000 €); założeniem cypryjskiej spółki i połączeniem jej z reżimem non-dom; inwestycją przez regulowane cypryjskie fundusze (AIF); lub bezpośrednią działalnością deweloperską. Prawdziwą zachętą jest otoczenie podatkowe — podatek dochodowy od osób prawnych wynosi 15% od 2026 roku, osoby non-dom płacą 0% od dywidend i odsetek (tylko limitowana składka zdrowotna), do tego 2,5% IP box i ponad 60 umów o unikaniu podwójnego opodatkowania. Zawsze korzystaj z niezależnego cypryjskiego prawnika i licencjonowanego doradcy, przeprowadź rzetelne badanie due diligence każdego projektu lub funduszu i pamiętaj, że „złoty paszport” — obywatelstwo za inwestycję — zniesiono w 2020 roku; inwestycja daje pobyt, nie paszport."
  },
  "ru": {
   "q": "Хорошее ли место Кипр для инвестиций и как начинают иностранцы?",
   "a": "Кипр — настоящий инвестиционный хаб, а не только остров для отдыха: его сильные стороны — управление судами (один из крупнейших флотов ЕС), финансовые и профессиональные услуги, быстрорастущая технологическая сцена Лимассола, туризм и гостеприимство, недвижимость и энергетика (морской газ и солнечная энергия). Иностранцы обычно приходят одним из четырёх путей: покупка недвижимости (часто в сочетании с путём постоянного вида на жительство за 300 000 €); создание кипрской компании в связке с режимом нон-дом; вложения через регулируемые кипрские фонды (AIF); или прямая застройка. Настоящая привлекательность — налоговый фон: налог на прибыль компаний с 2026 года составляет 15 %, нон-домы платят 0 % с дивидендов и процентов (лишь ограниченный по размеру взнос на здравоохранение), плюс IP-бокс 2,5 % и более 60 соглашений об избежании двойного налогообложения. Всегда привлекайте независимого кипрского юриста и лицензированного консультанта, проводите тщательную проверку любого проекта или фонда и помните, что «золотой паспорт» — гражданство за инвестиции — отменён в 2020 году: инвестиции дают вид на жительство, а не паспорт."
  }
 },
 "fashion-shopping": {
  "el": {
   "q": "Πού βρίσκονται τα καλύτερα καταστήματα μόδας και τα μπουτίκ σχεδιαστών στην Κύπρο;",
   "a": "Για designer μόδα, η οδός Στασικράτους στη Λευκωσία είναι η πολυτελής λεωφόρος του νησιού — διεθνείς οίκοι και Κύπριοι σχεδιαστές δίπλα δίπλα — με περισσότερα κατά μήκος της Λεωφόρου Μακαρίου. Η Λεμεσός είναι το άλλο κέντρο μόδας, με μπουτίκ γύρω από τη μαρίνα και τα μεγάλα εμπορικά κέντρα· κάθε πόλη έχει ένα σύγχρονο mall για μάρκες της μαζικής αγοράς (Nicosia Mall και Mall of Cyprus, MyMall Λεμεσού, Kings Avenue στην Πάφο). Οι επισκέπτες από χώρες εκτός ΕΕ μπορούν να ανακτήσουν τον ΦΠΑ σε επιλέξιμες αγορές στο αεροδρόμιο. Για κάτι τοπικό, αναζητήστε Κύπριους σχεδιαστές και χειροποίητα λευκαρίτικα και ασημένιο φιλιγκράν. Πείτε στον κονσιέρζ το στυλ και τον προϋπολογισμό σας και θα σας κατευθύνουμε στον σωστό δρόμο ή μπουτίκ."
  },
  "ro": {
   "q": "Unde sunt cele mai bune magazine de modă și buticurile de designer din Cipru?",
   "a": "Pentru modă de designer, strada Stasikratous din Nicosia este artera de lux a insulei — mărci internaționale și designeri ciprioți unii lângă alții — cu și mai multe pe Bulevardul Makariou. Limassol este celălalt centru al modei, cu buticuri în jurul marinei și al marilor mall-uri; fiecare oraș are un mall modern pentru mărci de masă (Nicosia Mall și Mall of Cyprus, MyMall Limassol, Kings Avenue din Paphos). Vizitatorii din afara UE pot recupera TVA-ul la achizițiile eligibile în aeroport. Pentru ceva local, căutați designeri ciprioți și dantelă Lefkara lucrată manual și argintărie filigranată. Spuneți concierge-ului stilul și bugetul dumneavoastră și vă îndrumăm spre strada sau butiqul potrivit."
  },
  "ar": {
   "q": "أين أفضل تسوق للأزياء ومتاجر المصممين في قبرص؟",
   "a": "للأزياء الراقية، يُعدّ شارع ستاسيكراتوس في نيقوسيا صف الفخامة في الجزيرة — علامات عالمية ومصممون قبارصة جنبًا إلى جنب — ويزيد عليه المزيد على طول جادة ماكاريوس. وليماسول هي مركز الموضة الآخر، بمتاجر بوتيك حول المارينا والمراكز التجارية الكبرى؛ ولكل مدينة مركز تجاري حديث للعلامات التجارية الجماهيرية (نيقوسيا مول وMall of Cyprus، وMyMall ليماسول، وكينغز أفينيو في بافوس). ويمكن للزوار من خارج الاتحاد الأوروبي استرداد ضريبة القيمة المضافة على المشتريات المؤهلة في المطار. وللحصول على شيء محلي، ابحث عن مصممين قبارصة ودانتيل ليفكارا المصنوع يدويًا والفضة المخرَّمة. أخبر الكونسيرج بأسلوبك وميزانيتك وسنرشدك إلى الشارع أو البوتيك المناسب."
  },
  "de": {
   "q": "Wo gibt es das beste Modeshopping und die Designer-Boutiquen auf Zypern?",
   "a": "Für Designermode ist die Stasikratous-Straße in Nikosia die Luxusmeile der Insel — internationale Labels und zypriotische Designer Seite an Seite — mit weiteren Geschäften entlang der Makariou-Avenue. Limassol ist das zweite Modezentrum, mit Boutiquen rund um die Marina und die großen Einkaufszentren; jede Stadt hat ein modernes Einkaufszentrum für Marken der Mittelklasse (Nicosia Mall und Mall of Cyprus, MyMall Limassol, Kings Avenue in Paphos). Besucher von außerhalb der EU können sich die Mehrwertsteuer auf berechtigte Einkäufe am Flughafen erstatten lassen. Für etwas Lokales suchen Sie zypriotische Designer sowie handgemachte Lefkara-Spitze und Silberfiligran. Nennen Sie dem Concierge Ihren Stil und Ihr Budget, und wir weisen Ihnen die passende Straße oder Boutique."
  },
  "pl": {
   "q": "Gdzie są najlepsze sklepy z modą i butiki projektantów na Cyprze?",
   "a": "Dla mody projektanckiej ulica Stasikratous w Nikozji to luksusowa aleja wyspy — międzynarodowe marki i cypryjscy projektanci obok siebie — a więcej sklepów jest przy alei Makariou. Limassol to drugie centrum mody, z butikami wokół mariny i dużymi centrami handlowymi; każde miasto ma nowoczesną galerię z markami popularnymi (Nicosia Mall i Mall of Cyprus, MyMall Limassol, Kings Avenue w Pafos). Odwiedzający spoza UE mogą odzyskać VAT od kwalifikujących się zakupów na lotnisku. Po coś lokalnego szukaj cypryjskich projektantów oraz ręcznie robionej koronki z Lefkary i srebrnej filigranowej biżuterii. Powiedz konsjerżowi swój styl i budżet, a wskażemy odpowiednią ulicę lub butik."
  },
  "ru": {
   "q": "Где лучший шопинг моды и дизайнерские бутики на Кипре?",
   "a": "Для дизайнерской моды улица Стасикратус в Никосии — роскошный ряд острова: международные бренды и кипрские дизайнеры бок о бок, а ещё больше магазинов на проспекте Макариу. Лимассол — второй центр моды, с бутиками вокруг марины и в крупных торговых центрах; в каждом городе есть современный молл с масс-маркет брендами (Nicosia Mall и Mall of Cyprus, MyMall Limassol, Kings Avenue в Пафосе). Посетители из-за пределов ЕС могут вернуть НДС с подходящих покупок в аэропорту. За чем-то местным ищите кипрских дизайнеров и ручное кружево лефкара и серебряную филигрань. Скажите консьержу свой стиль и бюджет, и мы направим вас на нужную улицу или в нужный бутик."
  }
 },
 "night-pharmacy": {
  "el": {
   "q": "Πώς βρίσκω φαρμακείο ανοιχτό τώρα — τη νύχτα ή σε αργία;",
   "a": "Κάπου υπάρχει πάντα ανοιχτό φαρμακείο: λειτουργούν με εκ περιτροπής πρόγραμμα νυχτερινής και εορταστικής εφημερίας. Βρείτε το τρέχον εφημερεύον φαρμακείο στο cypruspharmacy.com ή τηλεφωνικά — 11892 (πληροφορίες), ή στην εφημερεύουσα γραμμή της επαρχίας σας (χρέωση premium): Λευκωσία 90 901 412, Λεμεσός 90 901 415, Λάρνακα 90 901 414, Πάφος 90 901 416, Αμμόχωστος 90 901 413. Πείτε μου την περιοχή σας και θα σας απαριθμήσω και τα πλησιέστερα φαρμακεία από τον κατάλογο."
  },
  "ro": {
   "q": "Cum găsesc o farmacie deschisă acum — noaptea sau într-o zi de sărbătoare?",
   "a": "Undeva este mereu o farmacie deschisă: funcționează cu un program rotativ de gardă pe timp de noapte și în zilele de sărbătoare. Găsiți farmacia de gardă actuală pe cypruspharmacy.com sau telefonic — 11892 (informații), ori la linia de gardă a districtului dumneavoastră (tarif special): Nicosia 90 901 412, Limassol 90 901 415, Larnaca 90 901 414, Paphos 90 901 416, Famagusta 90 901 413. Spuneți-mi zona dumneavoastră și vă listez și cele mai apropiate farmacii din director."
  },
  "ar": {
   "q": "كيف أجد صيدلية مفتوحة الآن — ليلًا أو في عطلة رسمية؟",
   "a": "هناك دائمًا صيدلية مفتوحة في مكان ما: فهي تعمل وفق جدول مناوبة دوّار ليليًا وفي العطل. اعثر على الصيدلية المناوبة حاليًا على cypruspharmacy.com أو هاتفيًا — 11892 (الاستعلامات)، أو على خط المناوبة في مقاطعتك (بتعرفة مرتفعة): نيقوسيا 90 901 412، ليماسول 90 901 415، لارنكا 90 901 414، بافوس 90 901 416، فاماغوستا 90 901 413. أخبرني بمنطقتك وسأعرض لك أيضًا أقرب الصيدليات من الدليل."
  },
  "de": {
   "q": "Wie finde ich eine jetzt geöffnete Apotheke — nachts oder an einem Feiertag?",
   "a": "Irgendwo hat immer eine Apotheke geöffnet: Sie arbeiten mit einem rotierenden Nacht- und Feiertagsdienstplan. Die aktuell diensthabende Apotheke finden Sie unter cypruspharmacy.com oder telefonisch — 11892 (Auskunft) bzw. über die Dienstnummer Ihres Bezirks (kostenpflichtige Mehrwertnummer): Nikosia 90 901 412, Limassol 90 901 415, Larnaka 90 901 414, Paphos 90 901 416, Famagusta 90 901 413. Nennen Sie mir Ihre Gegend, dann liste ich auch die nächstgelegenen Apotheken aus dem Verzeichnis auf."
  },
  "pl": {
   "q": "Jak znaleźć otwartą teraz aptekę — w nocy lub w święto?",
   "a": "Gdzieś zawsze jest czynna apteka: działają według rotacyjnego grafiku dyżurów nocnych i świątecznych. Aktualnie dyżurującą aptekę znajdziesz na cypruspharmacy.com lub telefonicznie — 11892 (informacja) albo na dyżurnej linii swojego dystryktu (połączenie o podwyższonej opłacie): Nikozja 90 901 412, Limassol 90 901 415, Larnaka 90 901 414, Pafos 90 901 416, Famagusta 90 901 413. Podaj mi swoją okolicę, a wypiszę też najbliższe apteki z katalogu."
  },
  "ru": {
   "q": "Как найти аптеку, открытую прямо сейчас — ночью или в праздник?",
   "a": "Где-нибудь всегда открыта аптека: они работают по скользящему графику ночных и праздничных дежурств. Текущую дежурную аптеку можно найти на cypruspharmacy.com или по телефону — 11892 (справочная) либо по дежурной линии вашего округа (платный номер): Никосия 90 901 412, Лимассол 90 901 415, Ларнака 90 901 414, Пафос 90 901 416, Фамагуста 90 901 413. Назовите мне свой район, и я также перечислю ближайшие аптеки из справочника."
  }
 },
 "urgent-help": {
  "el": {
   "q": "Υπάρχει γραμμή εφημερεύοντος γιατρού ή επείγουσα ιατρική βοήθεια εκτός ωραρίου;",
   "a": "Για γιατρό το Σαββατοκύριακο ή τις αργίες καλέστε το 17000 (ή +357 22017000). Για οτιδήποτε απειλεί τη ζωή καλέστε πρώτα πάντα το 112 — στέλνει ασθενοφόρο και συνδέει αστυνομία και πυροσβεστική. Ζητήστε μου το πλησιέστερο 24ωρο τμήμα επειγόντων και ένα εφημερεύον φαρμακείο και θα τα φέρω για την περιοχή σας, ώστε να τα έχετε αποθηκευμένα πριν τα χρειαστείτε."
  },
  "ro": {
   "q": "Există o linie de medic de gardă sau ajutor medical urgent în afara programului?",
   "a": "Pentru un medic în weekend sau de sărbători legale, sunați la 17000 (sau +357 22017000). Pentru orice situație care pune viața în pericol, formați mereu întâi 112 — trimite o ambulanță și conectează poliția și pompierii. Cereți-mi cea mai apropiată unitate de urgențe deschisă non-stop și o farmacie de gardă și vi le caut pentru zona dumneavoastră, ca să le aveți salvate înainte să aveți nevoie de ele."
  },
  "ar": {
   "q": "هل يوجد خط طبيب مناوب أو مساعدة طبية عاجلة خارج أوقات الدوام؟",
   "a": "للحصول على طبيب في عطلات نهاية الأسبوع أو العطل الرسمية، اتصل بالرقم 17000 (أو +357 22017000). وفي أي حالة تهدد الحياة، اتصل دائمًا بالرقم 112 أولًا — فهو يرسل سيارة إسعاف ويصلك بالشرطة والإطفاء. اطلب مني أقرب قسم طوارئ يعمل على مدار الساعة وصيدلية مناوبة وسأجلبهما لمنطقتك لتحفظهما قبل أن تحتاج إليهما."
  },
  "de": {
   "q": "Gibt es eine ärztliche Bereitschaftsnummer oder dringende medizinische Hilfe außerhalb der Sprechzeiten?",
   "a": "Für einen Arzt am Wochenende oder an Feiertagen rufen Sie 17000 an (oder +357 22017000). Bei allem Lebensbedrohlichen wählen Sie immer zuerst die 112 — sie schickt einen Krankenwagen und verbindet mit Polizei und Feuerwehr. Fragen Sie mich nach der nächstgelegenen rund um die Uhr geöffneten Notaufnahme und einer Bereitschaftsapotheke, dann hole ich sie für Ihre Gegend heraus, damit Sie sie gespeichert haben, bevor Sie sie brauchen."
  },
  "pl": {
   "q": "Czy istnieje dyżurna linia lekarska lub pilna pomoc medyczna poza godzinami pracy?",
   "a": "Po lekarza w weekendy lub święta zadzwoń pod numer 17000 (lub +357 22017000). W sytuacji zagrożenia życia zawsze najpierw wybierz 112 — wysyła karetkę i łączy z policją i strażą pożarną. Poproś mnie o najbliższy czynny całą dobę oddział ratunkowy i aptekę dyżurną, a wyszukam je dla Twojej okolicy, żebyś miał je zapisane, zanim będą potrzebne."
  },
  "ru": {
   "q": "Есть ли линия дежурного врача или срочная медицинская помощь вне рабочего времени?",
   "a": "Для вызова врача в выходные или праздничные дни звоните по номеру 17000 (или +357 22017000). При угрозе жизни всегда сначала набирайте 112 — он направит скорую помощь и свяжет с полицией и пожарными. Попросите меня подобрать ближайшее круглосуточное отделение неотложной помощи и дежурную аптеку, и я найду их для вашего района, чтобы они были у вас сохранены до того, как понадобятся."
  }
 },
 "biz-plan-your-business": {
  "el": {
   "q": "Πώς σχεδιάζω και προετοιμάζομαι για να ξεκινήσω επιχείρηση στην Κύπρο;",
   "a": "Πριν ξεκινήσετε, πρέπει να καταρτίσετε ένα επιχειρηματικό σχέδιο που λειτουργεί ταυτόχρονα ως εγχειρίδιο της εταιρείας και ως εργαλείο πρόσβασης σε χρηματοδότηση, υποστηριζόμενο από έρευνα αγοράς για τον εντοπισμό των αναγκών των καταναλωτών και από χρηματοοικονομικά μοντέλα που καλύπτουν πηγές εσόδων, κόστη και ταμειακές ροές. Πρέπει επίσης να ετοιμάσετε στρατηγική μάρκετινγκ πριν από οποιαδήποτε προωθητική ενέργεια. Βοηθούν διάφοροι φορείς, μεταξύ των οποίων το Κυπριακό Εμπορικό και Βιομηχανικό Επιμελητήριο και τα επαρχιακά επιμελητήρια (Λευκωσίας, Λεμεσού, Πάφου, Αμμοχώστου, Λάρνακας), η Στατιστική Υπηρεσία για επίσημα στοιχεία αγοράς και ο Κυπριακός Οργανισμός Προώθησης Επενδύσεων (CIPA) για υποστήριξη ξένων επενδύσεων. Αν συλλέγετε προσωπικά δεδομένα πελατών, πρέπει να συμμορφώνεστε με τους κανόνες προστασίας της ιδιωτικότητας που εποπτεύει το Γραφείο του Επιτρόπου Προστασίας Δεδομένων Προσωπικού Χαρακτήρα, και ο GDPR ισχύει αν η επιχείρησή σας είναι εγκατεστημένη σε κράτος μέλος της ΕΕ, προσφέρει αγαθά ή υπηρεσίες σε οποιαδήποτε αγορά της ΕΕ ή έχει ιστότοπο που στοχεύει πελάτες της ΕΕ. Για τις τρέχουσες απαιτήσεις, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Cum îmi planific și pregătesc pornirea unei afaceri în Cipru?",
   "a": "Înainte de a începe, ar trebui să elaborați un plan de afaceri care să funcționeze atât ca manual al companiei, cât și ca instrument de acces la finanțare, susținut de o cercetare de piață pentru identificarea nevoilor consumatorilor și de modele financiare care să acopere sursele de venit, costurile și fluxurile de numerar. Trebuie să pregătiți și o strategie de marketing înainte de orice activitate promoțională. Vă pot ajuta mai multe organisme, printre care Camera de Comerț și Industrie a Ciprului și camerele sale regionale (Nicosia, Limassol, Paphos, Famagusta, Larnaca), Serviciul de Statistică pentru date oficiale de piață și Agenția Cipriotă pentru Promovarea Investițiilor (CIPA) pentru sprijin în investițiile străine. Dacă colectați date personale ale clienților, trebuie să respectați regulile de confidențialitate supravegheate de Oficiul Comisarului pentru Protecția Datelor cu Caracter Personal, iar GDPR se aplică dacă afacerea dumneavoastră este stabilită într-un stat membru UE, oferă bunuri sau servicii pe orice piață a UE sau are un site care vizează clienți din UE. Pentru cerințele actuale, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "كيف أخطّط وأستعد لبدء عمل تجاري في قبرص؟",
   "a": "قبل البدء ينبغي أن تضع خطة عمل تؤدي دور دليل الشركة وأداة للحصول على التمويل في آن واحد، مدعومة ببحث سوقي لتحديد احتياجات المستهلكين ونماذج مالية تغطي مصادر الإيرادات والتكاليف والتدفقات النقدية. وعليك أيضًا إعداد استراتيجية تسويق قبل أي نشاط ترويجي. وتساعد جهات عدة، منها غرفة التجارة والصناعة القبرصية وغرفها الإقليمية (نيقوسيا وليماسول وبافوس وفاماغوستا ولارنكا)، والدائرة الإحصائية للبيانات الرسمية عن السوق، ووكالة قبرص لتشجيع الاستثمار (CIPA) لدعم الاستثمار الأجنبي. وإذا كنت تجمع بيانات شخصية للعملاء فعليك الالتزام بقواعد الخصوصية التي يشرف عليها مكتب مفوّض حماية البيانات الشخصية، وينطبق النظام الأوروبي العام لحماية البيانات (GDPR) إذا كان عملك مؤسَّسًا في دولة عضو بالاتحاد الأوروبي أو يقدّم سلعًا أو خدمات في أي سوق أوروبية أو لديه موقع إلكتروني يستهدف عملاء الاتحاد. وللاطلاع على المتطلبات الحالية تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Wie plane und bereite ich die Gründung eines Unternehmens auf Zypern vor?",
   "a": "Vor dem Start sollten Sie einen Businessplan erstellen, der zugleich als Firmenhandbuch und als Instrument für den Zugang zu Finanzierung dient, gestützt auf Marktforschung zur Ermittlung der Kundenbedürfnisse und auf Finanzmodelle zu Einnahmequellen, Kosten und Cashflows. Außerdem sollten Sie eine Marketingstrategie vorbereiten, bevor Sie Werbemaßnahmen durchführen. Hilfe bieten mehrere Stellen, darunter die Zyprische Industrie- und Handelskammer und ihre regionalen Kammern (Nikosia, Limassol, Paphos, Famagusta, Larnaka), der Statistische Dienst für offizielle Marktdaten und die Zyprische Investitionsförderagentur (CIPA) für Unterstützung bei ausländischen Investitionen. Wenn Sie personenbezogene Daten von Kunden erheben, müssen Sie die Datenschutzvorschriften einhalten, die vom Büro des Beauftragten für den Schutz personenbezogener Daten überwacht werden; die DSGVO gilt, wenn Ihr Unternehmen in einem EU-Mitgliedstaat niedergelassen ist, auf einem EU-Markt Waren oder Dienstleistungen anbietet oder eine Website betreibt, die sich an EU-Kunden richtet. Für die aktuellen Anforderungen ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Jak zaplanować i przygotować założenie firmy na Cyprze?",
   "a": "Przed startem należy opracować biznesplan, który działa zarówno jako podręcznik firmy, jak i narzędzie dostępu do finansowania, poparty badaniem rynku w celu rozpoznania potrzeb konsumentów oraz modelami finansowymi obejmującymi źródła przychodów, koszty i przepływy pieniężne. Przed jakimikolwiek działaniami promocyjnymi trzeba też przygotować strategię marketingową. Pomagają różne instytucje, w tym Cypryjska Izba Handlowo-Przemysłowa i jej izby regionalne (Nikozja, Limassol, Pafos, Famagusta, Larnaka), Urząd Statystyczny w zakresie oficjalnych danych rynkowych oraz Cypryjska Agencja Promocji Inwestycji (CIPA) w zakresie wsparcia inwestycji zagranicznych. Jeśli zbierasz dane osobowe klientów, musisz przestrzegać przepisów o prywatności nadzorowanych przez Biuro Komisarza ds. Ochrony Danych Osobowych, a RODO ma zastosowanie, jeśli Twoja firma ma siedzibę w państwie członkowskim UE, oferuje towary lub usługi na jakimkolwiek rynku UE albo ma stronę internetową skierowaną do klientów z UE. Aktualne wymogi opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Как спланировать и подготовить открытие бизнеса на Кипре?",
   "a": "Перед стартом следует разработать бизнес-план, который служит и руководством компании, и инструментом получения финансирования, подкреплённый исследованием рынка для выявления потребностей потребителей и финансовыми моделями, охватывающими источники дохода, расходы и денежные потоки. Также нужно подготовить маркетинговую стратегию до любых рекламных действий. Помочь могут несколько организаций, среди них Торгово-промышленная палата Кипра и её региональные палаты (Никосия, Лимассол, Пафос, Фамагуста, Ларнака), Статистическая служба — для официальных рыночных данных, и Кипрское агентство по привлечению инвестиций (CIPA) — для поддержки иностранных инвестиций. Если вы собираете персональные данные клиентов, необходимо соблюдать правила о конфиденциальности, за которыми следит Управление уполномоченного по защите персональных данных; GDPR применяется, если ваш бизнес учреждён в государстве — члене ЕС, предлагает товары или услуги на любом рынке ЕС или имеет сайт, ориентированный на клиентов из ЕС. Актуальные требования авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-start-your-business": {
  "el": {
   "q": "Ποια είναι τα βήματα για να ξεκινήσω επιχείρηση στην Κύπρο;",
   "a": "Τα βασικά βήματα είναι να αποφασίσετε τον στόχο και τη νομική δομή, να καταρτίσετε επιχειρηματικό μοντέλο, οικονομικό σχέδιο και στρατηγική μάρκετινγκ, να επιλέξετε χώρο και επωνυμία και να συσταθείτε ως νομική οντότητα μέσω του Τμήματος Εφόρου Εταιρειών και Διανοητικής Ιδιοκτησίας. Στη συνέχεια εγγράφεστε στο Τμήμα Φορολογίας, στον ΦΠΑ, στο VIES (για εμπόριο με ΦΠΑ εντός ΕΕ) και στις Υπηρεσίες Κοινωνικών Ασφαλίσεων, και μπορείτε να καταχωρίσετε δικαιώματα διανοητικής ιδιοκτησίας. Το καταστατικό και οι εσωτερικοί κανονισμοί της εταιρείας πρέπει να συνταχθούν από νομικό που ασκεί το επάγγελμα στην Κυπριακή Δημοκρατία με το έντυπο ΗΕ1, και μπορείτε να ελέγξετε επωνυμίες εταιρειών στο www.companies.gov.cy, εμπορικά σήματα στο intellectualproperty.gov.cy και ονόματα τομέα .cy στο registry.nic.cy. Οι αυτοαπασχολούμενοι πρέπει να εγγραφούν στον ΦΠΑ αν ο κύκλος εργασιών υπερβαίνει τις €15.600 σε οποιαδήποτε περίοδο 12 μηνών, καταβάλλουν κοινωνικές ασφαλίσεις 16,6% των εκτιμώμενων αποδοχών, ο κανονικός συντελεστής ΦΠΑ είναι 19% (με μειωμένους 9%, 5% ή 0%), ενώ οι νεοφυείς επιχειρήσεις διατηρούν τα οφέλη για τα πρώτα πέντε έτη. Επειδή τα όρια και οι διαδικασίες αλλάζουν, θεωρήστε αυθεντική την επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Care sunt pașii pentru a porni o afacere în Cipru?",
   "a": "Pașii principali sunt: să decideți scopul și structura juridică, să construiți un model de afaceri, un plan financiar și o strategie de marketing, să alegeți sediul și denumirea entității și să vă constituiți ca persoană juridică prin Departamentul Registrului Comerțului și al Proprietății Intelectuale. Apoi vă înregistrați la Departamentul Fiscal, la TVA, la VIES (pentru comerț cu TVA în UE) și la Serviciile de Asigurări Sociale, și puteți înregistra drepturi de proprietate intelectuală. Actul constitutiv și statutul companiei trebuie redactate de un jurist care profesează în Republica Cipru, folosind formularul ΗΕ1, iar denumirile de companii pot fi verificate pe www.companies.gov.cy, mărcile pe intellectualproperty.gov.cy și domeniile .cy pe registry.nic.cy. Persoanele care desfășoară activitate independentă trebuie să se înregistreze la TVA dacă cifra de afaceri depășește 15.600 € în orice perioadă de 12 luni, plătesc asigurări sociale de 16,6% din veniturile estimate, cota standard de TVA este 19% (cu cote reduse de 9%, 5% sau 0%), iar start-up-urile păstrează avantajele pentru primii cinci ani. Deoarece pragurile și procedurile se schimbă, considerați pagina oficială businessincyprus.gov.cy drept autoritate de referință."
  },
  "ar": {
   "q": "ما خطوات بدء عمل تجاري في قبرص؟",
   "a": "الخطوات الرئيسية هي تحديد هدفك وشكلك القانوني، ووضع نموذج عمل وخطة مالية واستراتيجية تسويق، واختيار المقر واسم الكيان، ثم التأسيس ككيان قانوني عبر دائرة مسجّل الشركات والملكية الفكرية. بعد ذلك تسجّل لدى دائرة الضريبة، وفي ضريبة القيمة المضافة، وفي نظام VIES (للتجارة الخاضعة للضريبة داخل الاتحاد الأوروبي)، ولدى دائرة التأمينات الاجتماعية، ويمكنك تسجيل حقوق الملكية الفكرية. يجب أن يصوغ عقد التأسيس والنظام الأساسي للشركة محامٍ يمارس المهنة في جمهورية قبرص باستخدام النموذج ΗΕ1، ويمكنك التحقق من أسماء الشركات على www.companies.gov.cy والعلامات التجارية على intellectualproperty.gov.cy والنطاقات .cy على registry.nic.cy. ويجب على العاملين لحسابهم الخاص التسجيل في ضريبة القيمة المضافة إذا تجاوز دورانهم 15,600 يورو في أي فترة 12 شهرًا، ويدفعون تأمينًا اجتماعيًا بنسبة 16.6% من الدخل المقدَّر، والنسبة القياسية لضريبة القيمة المضافة 19% (مع نسب مخفضة 9% أو 5% أو 0%)، بينما تحتفظ الشركات الناشئة بمزايا البدء لسنواتها الخمس الأولى. ولأن الحدود والإجراءات تتغيّر، اعتبر صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Welche Schritte sind nötig, um auf Zypern ein Unternehmen zu gründen?",
   "a": "Die wichtigsten Schritte sind: Ziel und Rechtsform festlegen, ein Geschäftsmodell, einen Finanzplan und eine Marketingstrategie erarbeiten, Standort und Firmennamen wählen und sich über das Amt des Handelsregisters und des geistigen Eigentums als juristische Person eintragen lassen. Anschließend melden Sie sich beim Steueramt an, registrieren sich für die Mehrwertsteuer und für VIES (für den EU-Handel mit Mehrwertsteuer) sowie bei den Sozialversicherungsdiensten, und Sie können Rechte des geistigen Eigentums eintragen lassen. Gesellschaftsvertrag und Satzung müssen von einem in der Republik Zypern tätigen Juristen mit dem Formular ΗΕ1 aufgesetzt werden; Firmennamen prüfen Sie unter www.companies.gov.cy, Marken unter intellectualproperty.gov.cy und .cy-Domains unter registry.nic.cy. Selbstständige müssen sich für die Mehrwertsteuer registrieren, wenn der Umsatz in einem beliebigen Zeitraum von 12 Monaten 15.600 € übersteigt, zahlen Sozialversicherung in Höhe von 16,6 % des geschätzten Einkommens, der Regelsatz der Mehrwertsteuer beträgt 19 % (mit ermäßigten Sätzen von 9 %, 5 % oder 0 %), und Start-ups behalten ihre Startvorteile in den ersten fünf Jahren. Da sich Schwellenwerte und Verfahren ändern, gilt die offizielle Seite businessincyprus.gov.cy als maßgeblich."
  },
  "pl": {
   "q": "Jakie są kroki, aby założyć firmę na Cyprze?",
   "a": "Główne kroki to ustalenie celu i formy prawnej, opracowanie modelu biznesowego, planu finansowego i strategii marketingowej, wybór lokalu i nazwy podmiotu oraz zarejestrowanie jako osoba prawna w Departamencie Rejestru Spółek i Własności Intelektualnej. Następnie rejestrujesz się w Urzędzie Skarbowym, w VAT, w VIES (dla handlu z VAT w UE) oraz w Służbach Ubezpieczeń Społecznych i możesz zarejestrować prawa własności intelektualnej. Umowę spółki i statut musi sporządzić prawnik wykonujący zawód w Republice Cypryjskiej na formularzu ΗΕ1, a nazwy spółek sprawdzisz na www.companies.gov.cy, znaki towarowe na intellectualproperty.gov.cy, a domeny .cy na registry.nic.cy. Osoby prowadzące działalność na własny rachunek muszą zarejestrować się w VAT, jeśli obrót przekroczy 15 600 € w dowolnym okresie 12 miesięcy, płacą składki na ubezpieczenie społeczne w wysokości 16,6% szacowanych dochodów, standardowa stawka VAT wynosi 19% (ze stawkami obniżonymi 9%, 5% lub 0%), a start-upy zachowują ulgi startowe przez pierwsze pięć lat. Ponieważ progi i procedury się zmieniają, autorytatywną jest oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Каковы шаги для открытия бизнеса на Кипре?",
   "a": "Основные шаги: определить цель и правовую форму, выстроить бизнес-модель, финансовый план и маркетинговую стратегию, выбрать помещение и наименование и зарегистрироваться как юридическое лицо через Департамент регистратора компаний и интеллектуальной собственности. Затем вы регистрируетесь в налоговом департаменте, по НДС, в VIES (для торговли с НДС внутри ЕС) и в Службах социального страхования, а также можете зарегистрировать права интеллектуальной собственности. Учредительный договор и устав компании должен составить юрист, практикующий в Республике Кипр, по форме ΗΕ1; наименования компаний проверяются на www.companies.gov.cy, товарные знаки — на intellectualproperty.gov.cy, домены .cy — на registry.nic.cy. Самозанятые обязаны зарегистрироваться по НДС, если оборот превышает 15 600 € за любой 12-месячный период, платят социальные взносы в размере 16,6 % расчётного дохода, стандартная ставка НДС — 19 % (с пониженными 9 %, 5 % или 0 %), а стартапы сохраняют стартовые льготы первые пять лет. Поскольку пороги и процедуры меняются, авторитетной считайте официальную страницу businessincyprus.gov.cy."
  }
 },
 "biz-business-premises": {
  "el": {
   "q": "Χρειάζομαι άδεια για τις εγκαταστάσεις της επιχείρησής μου στην Κύπρο και πώς την παίρνω;",
   "a": "Για να χρησιμοποιήσετε χώρο για επιχειρηματική δραστηριότητα πρέπει να λάβετε άδεια από το τοπικό δημοτικό ή κοινοτικό συμβούλιο, υποβάλλοντας αίτηση απευθείας σε αυτό δυνάμει του Νόμου περί Δήμων του 1985 (111/1985), άρθρο 103, ή του Νόμου περί Κοινοτήτων του 1999 (86(I)/1999), άρθρο 85. Η αίτησή σας πρέπει να περιλαμβάνει την άδεια οικοδομής, το πιστοποιητικό έγκρισης και αντίγραφο των τίτλων ιδιοκτησίας, και οι εγκαταστάσεις ίσως χρειάζονται πιστοποίηση από την Πυροσβεστική Υπηρεσία Κύπρου και τις Ηλεκτρομηχανολογικές Υπηρεσίες, ενώ για καταστήματα εστίασης και ψυχαγωγίας εμπλέκεται το Υφυπουργείο Τουρισμού. Η αρχή αποφασίζει εντός τεσσάρων μηνών από την υποβολή της αίτησης και η άδεια ισχύει για έξι μήνες ή ένα έτος, ανανεώνεται δε επαναλαμβάνοντας την αρχική διαδικασία. Τα τέλη δεν καθορίζονται στη σελίδα και εξαρτώνται από τον τύπο των εγκαταστάσεων, ενώ πρέπει να ελέγξετε τις ισχύουσες νομικές απαιτήσεις τουλάχιστον ένα μήνα πριν από την υποβολή. Για τα τρέχοντα τέλη και κανόνες, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Am nevoie de licență pentru sediul afacerii mele în Cipru și cum o obțin?",
   "a": "Pentru a folosi un spațiu în scop comercial trebuie să obțineți o licență de la consiliul municipal sau comunal local, depunând cererea direct la acel consiliu în temeiul Legii municipalităților din 1985 (111/1985), articolul 103, sau al Legii comunităților din 1999 (86(I)/1999), articolul 85. Cererea trebuie să includă autorizația de construire, certificatul de aprobare și o copie a titlului de proprietate, iar spațiul poate necesita certificare din partea Serviciului Pompierilor din Cipru și al Serviciilor Electrice și Mecanice, în timp ce unitățile de alimentație publică și de divertisment implică Subsecretariatul pentru Turism. Autoritatea decide în termen de patru luni de la depunerea cererii, iar licența este valabilă șase luni sau un an și se reînnoiește repetând procedura inițială. Taxele nu sunt fixate pe pagină și depind de tipul spațiului, iar cerințele legale aplicabile trebuie verificate cu cel puțin o lună înainte de depunere. Pentru taxele și regulile actuale, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "هل أحتاج إلى ترخيص لمقر عملي في قبرص، وكيف أحصل عليه؟",
   "a": "لاستخدام مقر لنشاط تجاري يجب الحصول على ترخيص من المجلس البلدي أو المجلس المجتمعي المحلي، بتقديم الطلب مباشرة إلى ذلك المجلس بموجب قانون البلديات لعام 1985 (111/1985)، المادة 103، أو قانون المجتمعات المحلية لعام 1999 (86(I)/1999)، المادة 85. ينبغي أن يتضمن طلبك رخصة البناء وشهادة الموافقة ونسخة من سندات الملكية، وقد يحتاج المقر إلى اعتماد من دائرة الإطفاء القبرصية وخدمات الكهرباء والميكانيك، بينما تشارك وزارة السياحة المساعدة في المنشآت الغذائية والترفيهية. تبتّ الجهة في الطلب خلال أربعة أشهر من تقديمه، والترخيص صالح لستة أشهر أو سنة ويُجدَّد بتكرار الإجراء الأولي. الرسوم غير محددة في الصفحة وتتوقف على نوع المقر، وينبغي التحقق من المتطلبات القانونية المطبَّقة قبل شهر على الأقل من التقديم. وللاطلاع على الرسوم والقواعد الحالية تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Brauche ich für meine Geschäftsräume auf Zypern eine Genehmigung, und wie bekomme ich sie?",
   "a": "Um Räume für eine gewerbliche Tätigkeit zu nutzen, benötigen Sie eine Genehmigung des örtlichen Stadt- oder Gemeinderats; der Antrag ist direkt bei diesem Rat nach dem Städtegesetz von 1985 (111/1985), Artikel 103, oder dem Gemeindegesetz von 1999 (86(I)/1999), Artikel 85, zu stellen. Der Antrag sollte die Baugenehmigung, die Abnahmebescheinigung und eine Kopie der Eigentumsurkunde enthalten; die Räume benötigen unter Umständen eine Bescheinigung der Zyprischen Feuerwehr und der Elektro- und Maschinendienste, bei Gastronomie- und Unterhaltungsbetrieben ist zudem das Stellvertretende Ministerium für Tourismus beteiligt. Die Behörde entscheidet innerhalb von vier Monaten nach Antragstellung, die Genehmigung gilt sechs Monate oder ein Jahr und wird durch Wiederholung des ursprünglichen Verfahrens verlängert. Die Gebühren sind auf der Seite nicht festgelegt und hängen von der Art der Räume ab; die geltenden rechtlichen Anforderungen sollten Sie mindestens einen Monat vor der Antragstellung prüfen. Für aktuelle Gebühren und Regeln ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Czy potrzebuję licencji na lokal firmy na Cyprze i jak ją uzyskać?",
   "a": "Aby używać lokalu do działalności gospodarczej, musisz uzyskać licencję od lokalnej rady miejskiej lub gminnej, składając wniosek bezpośrednio do tej rady na podstawie Ustawy o gminach miejskich z 1985 r. (111/1985), art. 103, lub Ustawy o wspólnotach z 1999 r. (86(I)/1999), art. 85. Wniosek powinien zawierać pozwolenie na budowę, świadectwo odbioru oraz kopię aktu własności, a lokal może wymagać certyfikacji Cypryjskiej Straży Pożarnej i Służb Elektrycznych i Mechanicznych, natomiast w przypadku lokali gastronomicznych i rozrywkowych zaangażowane jest Wiceministerstwo Turystyki. Organ decyduje w ciągu czterech miesięcy od złożenia wniosku, a licencja jest ważna sześć miesięcy lub rok i jest odnawiana przez powtórzenie pierwotnej procedury. Opłaty nie są podane na stronie i zależą od rodzaju lokalu, a obowiązujące wymogi prawne należy sprawdzić co najmniej miesiąc przed złożeniem wniosku. Aktualne opłaty i zasady opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Нужна ли лицензия на помещение для бизнеса на Кипре и как её получить?",
   "a": "Чтобы использовать помещение для коммерческой деятельности, необходимо получить лицензию местного муниципального или общинного совета, подав заявление непосредственно в этот совет в соответствии с Законом о муниципалитетах 1985 года (111/1985), статья 103, или Законом об общинах 1999 года (86(I)/1999), статья 85. К заявлению следует приложить разрешение на строительство, свидетельство о приёмке и копию правоустанавливающих документов; помещению могут потребоваться сертификаты Кипрской пожарной службы и Электромеханической службы, а для заведений общепита и развлечений привлекается Заместитель министра по туризму. Орган принимает решение в течение четырёх месяцев с момента подачи заявления, лицензия действует шесть месяцев или год и продлевается повторением первоначальной процедуры. Сборы на странице не указаны и зависят от типа помещения, а применимые правовые требования следует проверить не менее чем за месяц до подачи. Актуальные сборы и правила авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-planning-permission": {
  "el": {
   "q": "Πώς παίρνω πολεοδομική άδεια για ανάπτυξη στην Κύπρο;",
   "a": "Πρέπει να λάβετε πολεοδομική άδεια πριν από οποιαδήποτε ανάπτυξη, δηλαδή οικοδομικές, τεχνικές ή εξορυκτικές εργασίες ή ουσιώδη αλλαγή χρήσης κτιρίου, υποβάλλοντας ηλεκτρονικά αίτηση μέσω του συστήματος ΙΠΠΟΔΑΜΟΣ στην Πολεοδομική Αρχή, σε συνεργασία με το Τμήμα Πολεοδομίας και Οικήσεως. Οι αιτήσεις χρησιμοποιούν έντυπα όπως το ΕΑ9 για καθορισμό, το ΕΑ8 για προκαταρκτικές γνωμοδοτήσεις, το ΕΑ15 για οικοδομική ανάπτυξη, το ΕΑ2 για διαχωρισμό γης, το ΕΑ3 για εξόρυξη, το ΕΑ10 για άδεια εξαίρεσης και το ΕΑ11 για παράταση ισχύος, και υποβάλλετε αρχιτεκτονικά σχέδια και σχέδια χώρου μαζί με υποστηρικτικά πιστοποιητικά, ενώ ενίοτε απαιτούνται εξειδικευμένες μελέτες, όπως Εκτίμηση Περιβαλλοντικών Επιπτώσεων ή Μελέτη Κυκλοφορίας. Η Πολεοδομική Αρχή έχει τρεις μήνες για να αποφασίσει, με πιθανή παράταση, οι πολεοδομικές άδειες ισχύουν για τριετή περίοδο από την έκδοσή τους, ενώ οι Προκαταρκτικές Γνωμοδοτήσεις (ΕΑ8) είναι δεσμευτικές για ένα έτος. Η ανάπτυξη πρέπει να συμμορφώνεται με το ισχύον Τοπικό Σχέδιο, και προτάσεις που δεν συμμορφώνονται χρειάζονται αίτηση εξαίρεσης ΕΑ10. Για τις τρέχουσες απαιτήσεις, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Cum obțin certificatul de urbanism pentru o dezvoltare în Cipru?",
   "a": "Trebuie să obțineți autorizația de urbanism înainte de orice dezvoltare, adică lucrări de construcții, inginerie, exploatare minieră sau o schimbare substanțială a destinației unei clădiri, depunând cererea electronic prin sistemul IPPODAMOS la Autoritatea de Urbanism, în colaborare cu Departamentul de Urbanism și Locuințe. Cererile folosesc formulare precum EA9 pentru o determinare, EA8 pentru avize preliminare, EA15 pentru dezvoltare constructivă, EA2 pentru parcelare, EA3 pentru exploatare minieră, EA10 pentru autorizație de excepție și EA11 pentru prelungirea valabilității, și depuneți planuri arhitecturale și de amplasament plus certificate justificative, uneori fiind necesare studii specializate, precum o Evaluare a Impactului asupra Mediului sau un Studiu de Trafic. Autoritatea de Urbanism are trei luni pentru a decide, cu o posibilă prelungire, autorizațiile de urbanism sunt valabile trei ani de la emitere, iar Avizele Preliminare (EA8) sunt obligatorii timp de un an. Dezvoltarea trebuie să respecte Planul de Dezvoltare în vigoare, iar propunerile neconforme necesită o cerere de excepție EA10. Pentru cerințele actuale, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "كيف أحصل على إذن التخطيط العمراني لمشروع تطوير في قبرص؟",
   "a": "يجب الحصول على إذن التخطيط العمراني قبل أي تطوير، أي أعمال البناء أو الهندسة أو التعدين أو التغيير الجوهري في استخدام مبنى، بالتقديم إلكترونيًا عبر نظام IPPODAMOS إلى سلطة التخطيط العمراني بالتعاون مع دائرة التخطيط العمراني والإسكان. تستخدم الطلبات نماذج مثل EA9 للتحديد، وEA8 للآراء الأولية، وEA15 للتطوير الإنشائي، وEA2 لتقسيم الأراضي، وEA3 للتعدين، وEA10 لتصريح الاستثناء، وEA11 لتمديد الصلاحية، وتقدّم مخططات معمارية ومخططات الموقع مع الشهادات الداعمة، وقد تُطلب أحيانًا دراسات متخصصة مثل تقييم الأثر البيئي أو دراسة مرورية. أمام سلطة التخطيط ثلاثة أشهر لاتخاذ القرار مع إمكانية التمديد، وتبقى تصاريح التخطيط سارية ثلاث سنوات من تاريخ صدورها، أما الآراء الأولية (EA8) فملزِمة لمدة سنة. ويجب أن يتوافق التطوير مع خطة التطوير السارية، وتحتاج المقترحات غير المتوافقة إلى طلب استثناء EA10. وللاطلاع على المتطلبات الحالية تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Wie erhalte ich eine Planungsgenehmigung für ein Bauvorhaben auf Zypern?",
   "a": "Vor jeder Entwicklung — also Bau-, Ingenieur- oder Bergbauarbeiten oder einer wesentlichen Nutzungsänderung eines Gebäudes — benötigen Sie eine Planungsgenehmigung; der Antrag wird elektronisch über das System IPPODAMOS bei der Planungsbehörde gestellt, die mit dem Amt für Raumplanung und Wohnungswesen zusammenarbeitet. Die Anträge verwenden Formulare wie EA9 für eine Feststellung, EA8 für Vorabstellungnahmen, EA15 für bauliche Entwicklung, EA2 für Grundstücksteilung, EA3 für Bergbau, EA10 für eine Ausnahmegenehmigung und EA11 für eine Gültigkeitsverlängerung; einzureichen sind Architektur- und Lagepläne samt Nachweisen, mitunter sind Spezialgutachten wie eine Umweltverträglichkeitsprüfung oder eine Verkehrsstudie nötig. Die Planungsbehörde hat drei Monate für ihre Entscheidung, mit möglicher Verlängerung; Planungsgenehmigungen gelten drei Jahre ab Erteilung, Vorabstellungnahmen (EA8) sind ein Jahr lang bindend. Die Entwicklung muss dem geltenden Entwicklungsplan entsprechen; nicht konforme Vorhaben erfordern einen Ausnahmeantrag EA10. Für die aktuellen Anforderungen ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Jak uzyskać pozwolenie planistyczne na inwestycję na Cyprze?",
   "a": "Pozwolenie planistyczne trzeba uzyskać przed rozpoczęciem jakiejkolwiek inwestycji, czyli robót budowlanych, inżynieryjnych, górniczych lub istotnej zmiany sposobu użytkowania budynku, składając wniosek elektronicznie przez system IPPODAMOS do Organu Planowania Przestrzennego, we współpracy z Departamentem Planowania Miejskiego i Mieszkalnictwa. Wnioski korzystają z formularzy takich jak EA9 do ustalenia, EA8 do opinii wstępnych, EA15 do zabudowy, EA2 do podziału gruntu, EA3 do górnictwa, EA10 do pozwolenia na odstępstwo i EA11 do przedłużenia ważności; składa się plany architektoniczne i sytuacyjne oraz zaświadczenia, a czasem wymagane są specjalistyczne opracowania, takie jak ocena oddziaływania na środowisko czy studium ruchu. Organ planowania ma trzy miesiące na decyzję, z możliwością przedłużenia, pozwolenia planistyczne są ważne trzy lata od wydania, a opinie wstępne (EA8) wiążą przez rok. Inwestycja musi być zgodna z obowiązującym Planem Zagospodarowania, a propozycje niezgodne wymagają wniosku o odstępstwo EA10. Aktualne wymogi opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Как получить градостроительное разрешение на застройку на Кипре?",
   "a": "Градостроительное разрешение необходимо получить до начала любой застройки — строительных, инженерных, горных работ или существенного изменения назначения здания — подав заявку в электронном виде через систему IPPODAMOS в Градостроительный орган во взаимодействии с Департаментом градостроительства и жилья. Заявки используют формы вроде EA9 для определения, EA8 для предварительных заключений, EA15 для строительной застройки, EA2 для раздела земли, EA3 для горных работ, EA10 для разрешения на исключение и EA11 для продления срока; подаются архитектурные и ситуационные планы с подтверждающими справками, а иногда требуются специальные исследования, например оценка воздействия на окружающую среду или транспортное исследование. У Градостроительного органа три месяца на решение с возможным продлением, разрешения действуют три года с момента выдачи, а предварительные заключения (EA8) обязательны в течение года. Застройка должна соответствовать действующему плану развития, а несоответствующие предложения требуют заявки на исключение EA10. Актуальные требования авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-building-permission": {
  "el": {
   "q": "Πώς λαμβάνω οικοδομική άδεια στην Κύπρο;",
   "a": "Αφού εξασφαλίσει πολεοδομική άδεια, ο ιδιοκτήτης του ακινήτου υποβάλλει αίτηση για οικοδομική άδεια μέσω εξουσιοδοτημένου μελετητή του έργου, ηλεκτρονικά μέσω του πληροφοριακού συστήματος ΙΠΠΟΔΑΜΟΣ (https://hippodamus.tph.moi.gov.cy) ή της υπηρεσίας οικοδομικών αδειών του gov.cy. Η άδεια εκδίδεται από τον Οργανισμό Τοπικής Αυτοδιοίκησης Επαρχίας (ΟΤΑ Επαρχίας) της επαρχίας όπου βρίσκεται το κτίριο, ο οποίος μπορεί να ζητήσει πρόσθετα έγγραφα και να διαβουλευθεί με άλλους φορείς, όπως το Τμήμα Περιβάλλοντος, το Τμήμα Αναπτύξεως Υδάτων ή το Τμήμα Επιθεώρησης Εργασίας. Η οικοδομική άδεια καλύπτει την ανέγερση, κατεδάφιση, επέκταση, μετατροπή ή μεταβολή, επισκευή ή αλλαγή χρήσης κτιρίου, και τα απαιτούμενα έγγραφα, μεταξύ των οποίων αρχιτεκτονικές, στατικές, ηλεκτρολογικές και μηχανολογικές, γεωλογικές μελέτες και μελέτες ενεργειακής απόδοσης, διαφέρουν ανάλογα με τον τύπο και το μέγεθος της ανάπτυξης, με το σύστημα ΙΠΠΟΔΑΜΟΣ να καθορίζει ποια είναι υποχρεωτικά. Η σελίδα δεν αναφέρει συγκεκριμένα τέλη. Για τις τρέχουσες απαιτήσεις, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Cum obțin o autorizație de construire în Cipru?",
   "a": "După obținerea autorizației de urbanism, proprietarul depune cererea de autorizație de construire printr-un proiectant autorizat al lucrării, electronic prin sistemul informatic IPPODAMOS (https://hippodamus.tph.moi.gov.cy) sau prin serviciul de autorizații de construire de pe gov.cy. Autorizația este emisă de Organizația Districtuală a Administrației Locale (DLGO) din districtul în care se află clădirea, care poate solicita documente suplimentare și poate consulta alte organisme, precum Departamentul de Mediu, Departamentul de Dezvoltare a Apelor sau Departamentul de Inspecție a Muncii. Autorizația de construire acoperă construcția, demolarea, extinderea, modificarea sau transformarea, repararea ori schimbarea destinației unei clădiri, iar documentele necesare, inclusiv studii arhitecturale, structurale, electrice și mecanice, geologice și de eficiență energetică, variază în funcție de tipul și dimensiunea dezvoltării, sistemul IPPODAMOS stabilind care sunt obligatorii. Pagina nu menționează taxe specifice. Pentru cerințele actuale, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "كيف أحصل على رخصة بناء في قبرص؟",
   "a": "بعد الحصول على إذن التخطيط العمراني، يتقدّم مالك العقار بطلب رخصة البناء عبر مصمّم مشروع معتمَد، إلكترونيًا من خلال نظام المعلومات IPPODAMOS (https://hippodamus.tph.moi.gov.cy) أو خدمة رخص البناء في gov.cy. تصدر الرخصة عن المنظمة المحلية للحكم المحلي في المقاطعة (DLGO) التي يقع فيها المبنى، وقد تطلب مستندات إضافية وتستشير جهات أخرى مثل دائرة البيئة أو دائرة تطوير المياه أو دائرة تفتيش العمل. وتشمل رخصة البناء الإنشاء والهدم والتوسعة والتعديل أو التحويل والإصلاح أو تغيير استخدام المبنى، وتختلف المستندات المطلوبة — ومنها الدراسات المعمارية والإنشائية والكهربائية والميكانيكية والجيولوجية ودراسات كفاءة الطاقة — بحسب نوع التطوير وحجمه، ويحدّد نظام IPPODAMOS أيها إلزامي. ولا تذكر الصفحة رسومًا محددة. وللاطلاع على المتطلبات الحالية تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Wie erhalte ich eine Baugenehmigung auf Zypern?",
   "a": "Nach der Planungsgenehmigung beantragt der Eigentümer die Baugenehmigung über einen zugelassenen Projektplaner, elektronisch über das Informationssystem IPPODAMOS (https://hippodamus.tph.moi.gov.cy) oder den Baugenehmigungsdienst von gov.cy. Die Genehmigung wird von der Bezirksorganisation der Kommunalverwaltung (DLGO) des Bezirks erteilt, in dem das Gebäude liegt; sie kann zusätzliche Unterlagen verlangen und andere Stellen wie das Umweltamt, das Amt für Wasserentwicklung oder das Amt für Arbeitsinspektion konsultieren. Die Baugenehmigung umfasst Errichtung, Abriss, Erweiterung, Umbau oder Umnutzung, Reparatur oder eine Nutzungsänderung eines Gebäudes; die erforderlichen Unterlagen — darunter Architektur-, Statik-, Elektro- und Maschinen-, geologische und Energieeffizienz-Gutachten — hängen von Art und Größe des Vorhabens ab, wobei IPPODAMOS festlegt, welche verpflichtend sind. Die Seite nennt keine konkreten Gebühren. Für die aktuellen Anforderungen ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Jak uzyskać pozwolenie na budowę na Cyprze?",
   "a": "Po uzyskaniu pozwolenia planistycznego właściciel nieruchomości składa wniosek o pozwolenie na budowę za pośrednictwem upoważnionego projektanta, elektronicznie przez system informacyjny IPPODAMOS (https://hippodamus.tph.moi.gov.cy) lub usługę pozwoleń budowlanych na gov.cy. Pozwolenie wydaje Dystryktowa Organizacja Samorządu Lokalnego (DLGO) dystryktu, w którym znajduje się budynek; może ona zażądać dodatkowych dokumentów i konsultować się z innymi organami, takimi jak Departament Środowiska, Departament Rozwoju Wód lub Departament Inspekcji Pracy. Pozwolenie na budowę obejmuje wznoszenie, rozbiórkę, rozbudowę, przebudowę lub adaptację, remont albo zmianę sposobu użytkowania budynku, a wymagane dokumenty — w tym opracowania architektoniczne, konstrukcyjne, elektryczne i mechaniczne, geologiczne oraz dotyczące efektywności energetycznej — zależą od rodzaju i wielkości inwestycji, przy czym system IPPODAMOS określa, które są obowiązkowe. Strona nie podaje konkretnych opłat. Aktualne wymogi opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Как получить разрешение на строительство на Кипре?",
   "a": "После получения градостроительного разрешения владелец недвижимости подаёт заявку на разрешение на строительство через уполномоченного проектировщика, в электронном виде через информационную систему IPPODAMOS (https://hippodamus.tph.moi.gov.cy) или сервис разрешений на строительство на gov.cy. Разрешение выдаёт Окружная организация местного самоуправления (DLGO) округа, где находится здание; она может запросить дополнительные документы и консультироваться с другими органами, такими как Департамент окружающей среды, Департамент развития водных ресурсов или Департамент трудовой инспекции. Разрешение на строительство охватывает возведение, снос, расширение, изменение или перепланировку, ремонт либо смену назначения здания, а необходимые документы — в том числе архитектурные, конструктивные, электрические и механические, геологические исследования и исследования энергоэффективности — зависят от типа и масштаба застройки, при этом система IPPODAMOS определяет, какие обязательны. Конкретных сборов страница не указывает. Актуальные требования авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-register-income-tax": {
  "el": {
   "q": "Πώς και πότε εγγράφομαι για φόρο εισοδήματος στην Κύπρο;",
   "a": "Ο φόρος εισοδήματος διαχειρίζεται από το Τμήμα Φορολογίας της Κύπρου και η εγγραφή και η υποβολή γίνονται μέσω της πύλης TAX FOR ALL (TFA) στο taxforall.mof.gov.cy. Για το 2025, φυσικά πρόσωπα με ακαθάριστο εισόδημα άνω των €19.500 πρέπει να εγγραφούν, ενώ από το 2026 η εγγραφή αφορά φυσικά πρόσωπα με εισόδημα βάσει του άρθρου 5 του Νόμου περί Φορολογίας του Εισοδήματος, φορολογικούς κατοίκους ηλικίας 25 έως 70 ετών ανεξαρτήτως εισοδήματος και νομικά πρόσωπα εγγεγραμμένα στην Κύπρο. Για το φορολογικό έτος 2026 οι κλίμακες φόρου εισοδήματος είναι 0% στα €0 έως €22.000, 20% στα €22.001 έως €32.000, 25% στα €32.001 έως €42.000, 30% στα €42.001 έως €72.000 και 35% από €72.001 και άνω. Οι δηλώσεις φορολογίας εισοδήματος υποβάλλονται εντός 15 μηνών από το τέλος του φορολογικού έτους, με αυτοεκτιμήσεις έως την 1η Αυγούστου για εταιρείες και αυτοαπασχολούμενους με υψηλό κύκλο εργασιών ή έως τις 30 Ιουνίου για τους υπόλοιπους, δηλώσεις εργαζομένων έως τις 31 Ιουλίου και δηλώσεις εργοδοτών έως τις 30 Απριλίου. Επειδή οι φορολογικοί κανόνες και τα έτη εφαρμογής αλλάζουν, θεωρήστε αυθεντική την επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Cum și când mă înregistrez pentru impozitul pe venit în Cipru?",
   "a": "Impozitul pe venit este administrat de Departamentul Fiscal al Ciprului, iar înregistrarea și depunerea declarațiilor se fac prin portalul TAX FOR ALL (TFA) de la taxforall.mof.gov.cy. Pentru 2025, persoanele fizice cu venit brut care depășește 19.500 € trebuie să se înregistreze, iar din 2026 înregistrarea se aplică persoanelor fizice cu venituri conform articolului 5 din Legea impozitului pe venit, rezidenților fiscali cu vârsta între 25 și 70 de ani indiferent de venit și persoanelor juridice înregistrate în Cipru. Pentru anul fiscal 2026, tranșele de impozit pe venit sunt 0% între 0 și 22.000 €, 20% între 22.001 și 32.000 €, 25% între 32.001 și 42.000 €, 30% între 42.001 și 72.000 € și 35% de la 72.001 € în sus. Declarațiile de impozit pe venit se depun la 15 luni după sfârșitul anului fiscal, cu autoevaluări până la 1 august pentru companii și pentru persoanele independente cu cifră de afaceri mare sau până la 30 iunie pentru ceilalți, declarațiile angajaților până la 31 iulie și declarațiile angajatorilor până la 30 aprilie. Deoarece regulile fiscale și anii aplicabili se schimbă, considerați pagina oficială businessincyprus.gov.cy drept autoritate de referință."
  },
  "ar": {
   "q": "كيف ومتى أسجّل لضريبة الدخل في قبرص؟",
   "a": "تتولى دائرة الضريبة القبرصية إدارة ضريبة الدخل، ويجري التسجيل وتقديم الإقرارات عبر بوابة TAX FOR ALL (TFA) على taxforall.mof.gov.cy. بالنسبة لعام 2025 يجب على الأفراد الذين يتجاوز دخلهم الإجمالي 19,500 يورو التسجيل، واعتبارًا من 2026 ينطبق التسجيل على الأفراد ذوي الدخل وفق المادة 5 من قانون ضريبة الدخل، والمقيمين ضريبيًا بين 25 و70 عامًا بغض النظر عن الدخل، والكيانات القانونية المسجَّلة في قبرص. وللسنة الضريبية 2026 شرائح ضريبة الدخل هي 0% من 0 إلى 22,000 يورو، و20% من 22,001 إلى 32,000، و25% من 32,001 إلى 42,000، و30% من 42,001 إلى 72,000، و35% من 72,001 فما فوق. تُقدَّم إقرارات ضريبة الدخل بعد 15 شهرًا من نهاية السنة الضريبية، مع التقدير الذاتي حتى 1 أغسطس للشركات والعاملين لحسابهم الخاص ذوي الدوران المرتفع أو حتى 30 يونيو لغيرهم، وإقرارات الموظفين حتى 31 يوليو وإقرارات أصحاب العمل حتى 30 أبريل. ولأن القواعد الضريبية والسنوات المطبَّقة تتغيّر، اعتبر صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Wie und wann melde ich mich auf Zypern für die Einkommensteuer an?",
   "a": "Die Einkommensteuer wird vom Zyprischen Steueramt verwaltet; Anmeldung und Erklärung erfolgen über das Portal TAX FOR ALL (TFA) unter taxforall.mof.gov.cy. Für 2025 müssen sich Privatpersonen mit einem Bruttoeinkommen über 19.500 € anmelden; ab 2026 gilt die Anmeldepflicht für Personen mit Einkünften nach Artikel 5 des Einkommensteuergesetzes, für steuerlich ansässige Personen zwischen 25 und 70 Jahren unabhängig vom Einkommen und für in Zypern eingetragene juristische Personen. Für das Steuerjahr 2026 gelten folgende Stufen: 0 % auf 0 bis 22.000 €, 20 % auf 22.001 bis 32.000 €, 25 % auf 32.001 bis 42.000 €, 30 % auf 42.001 bis 72.000 € und 35 % ab 72.001 €. Einkommensteuererklärungen sind 15 Monate nach Ende des Steuerjahres fällig, Selbstveranlagungen bis 1. August für Unternehmen und Selbstständige mit hohem Umsatz bzw. bis 30. Juni für alle übrigen, Arbeitnehmererklärungen bis 31. Juli und Arbeitgebererklärungen bis 30. April. Da sich Steuerregeln und anwendbare Jahre ändern, gilt die offizielle Seite businessincyprus.gov.cy als maßgeblich."
  },
  "pl": {
   "q": "Jak i kiedy zarejestrować się do podatku dochodowego na Cyprze?",
   "a": "Podatkiem dochodowym zarządza Cypryjski Urząd Skarbowy, a rejestracja i składanie deklaracji odbywa się przez portal TAX FOR ALL (TFA) pod adresem taxforall.mof.gov.cy. Za 2025 rok zarejestrować się muszą osoby fizyczne z dochodem brutto powyżej 19 500 €, a od 2026 roku obowiązek dotyczy osób fizycznych z dochodami według art. 5 Ustawy o podatku dochodowym, rezydentów podatkowych w wieku 25–70 lat niezależnie od dochodu oraz osób prawnych zarejestrowanych na Cyprze. W roku podatkowym 2026 progi podatku dochodowego wynoszą 0% od 0 do 22 000 €, 20% od 22 001 do 32 000 €, 25% od 32 001 do 42 000 €, 30% od 42 001 do 72 000 € i 35% od 72 001 € wzwyż. Deklaracje podatkowe składa się 15 miesięcy po końcu roku podatkowego, z samooceną do 1 sierpnia dla spółek i samozatrudnionych o wysokim obrocie lub do 30 czerwca dla pozostałych, deklaracjami pracowników do 31 lipca i deklaracjami pracodawców do 30 kwietnia. Ponieważ przepisy podatkowe i obowiązujące lata się zmieniają, autorytatywną jest oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Как и когда регистрироваться по подоходному налогу на Кипре?",
   "a": "Подоходным налогом ведает Налоговый департамент Кипра, а регистрация и подача деклараций осуществляются через портал TAX FOR ALL (TFA) по адресу taxforall.mof.gov.cy. За 2025 год зарегистрироваться должны физические лица с валовым доходом свыше 19 500 €, а с 2026 года регистрация распространяется на физических лиц с доходом по статье 5 Закона о подоходном налоге, налоговых резидентов в возрасте от 25 до 70 лет независимо от дохода и юридических лиц, зарегистрированных на Кипре. Для налогового 2026 года ставки подоходного налога: 0 % с 0 до 22 000 €, 20 % с 22 001 до 32 000 €, 25 % с 32 001 до 42 000 €, 30 % с 42 001 до 72 000 € и 35 % с 72 001 € и выше. Декларации по подоходному налогу подаются через 15 месяцев после окончания налогового года, самооценка — до 1 августа для компаний и самозанятых с высоким оборотом или до 30 июня для остальных, декларации работников — до 31 июля, декларации работодателей — до 30 апреля. Поскольку налоговые правила и применимые годы меняются, авторитетной считайте официальную страницу businessincyprus.gov.cy."
  }
 },
 "biz-register-vat": {
  "el": {
   "q": "Πότε πρέπει να εγγραφώ στον ΦΠΑ στην Κύπρο;",
   "a": "Πρέπει να εγγραφείτε στον ΦΠΑ στο Τμήμα Φορολογίας της Κύπρου αν οι φορολογητέες συναλλαγές σας υπερβαίνουν ή πρόκειται να υπερβούν τις €15.600 σε διάστημα 12 μηνών που προηγείται ή τις επόμενες 30 ημέρες, ενώ για αποκτήσεις από άλλα κράτη μέλη της ΕΕ ισχύει χωριστό όριο €10.251,61. Η εγγραφή στον ΦΠΑ γίνεται με το έντυπο Τ.Δ. 1101 μαζί με αποδεικτικά φορολογητέων δραστηριοτήτων, που υποβάλλονται σε Επαρχιακό Φορολογικό Γραφείο ή μέσω του PSC Κύπρου, και πραγματοποιείται ηλεκτρονικά μέσω της πύλης TAX FOR ALL (TFA) στο taxforall.mof.gov.cy. Οι δηλώσεις ΦΠΑ πρέπει να υποβάλλονται έως τη 10η ημέρα του δεύτερου μήνα μετά από κάθε περίοδο δήλωσης. Οι επιχειρήσεις που συναλλάσσονται με άλλες χώρες της ΕΕ εγγράφονται και στο VIES. Για τα τρέχοντα όρια και προθεσμίες, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Când trebuie să mă înregistrez la TVA în Cipru?",
   "a": "Trebuie să vă înregistrați la TVA la Departamentul Fiscal al Ciprului dacă tranzacțiile dumneavoastră impozabile depășesc sau vor depăși 15.600 € în ultimele 12 luni sau în următoarele 30 de zile, iar pentru achizițiile din alte state membre UE se aplică un prag separat de 10.251,61 €. Înregistrarea la TVA folosește formularul T.D. 1101 împreună cu dovada activităților impozabile, depus la un Birou Fiscal Districtual sau prin PSC Cyprus, și se face online prin portalul TAX FOR ALL (TFA) de la taxforall.mof.gov.cy. Declarațiile de TVA trebuie depuse până în ziua a 10-a a celei de-a doua luni după fiecare perioadă de declarare. Afacerile care comercializează cu alte țări UE se înregistrează și în VIES. Pentru pragurile și termenele actuale, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "متى يجب أن أسجّل في ضريبة القيمة المضافة في قبرص؟",
   "a": "يجب التسجيل في ضريبة القيمة المضافة لدى دائرة الضريبة القبرصية إذا تجاوزت معاملاتك الخاضعة للضريبة أو ستتجاوز 15,600 يورو خلال الأشهر الـ12 السابقة أو الأيام الـ30 القادمة، ويُطبَّق حد منفصل قدره 10,251.61 يورو على المشتريات من دول أخرى في الاتحاد الأوروبي. يستخدم التسجيل النموذج T.D. 1101 مع إثبات الأنشطة الخاضعة للضريبة، ويُقدَّم إلى مكتب ضريبة المقاطعة أو عبر PSC Cyprus، ويُنجَز إلكترونيًا عبر بوابة TAX FOR ALL (TFA) على taxforall.mof.gov.cy. ويجب تقديم إقرارات ضريبة القيمة المضافة بحلول اليوم العاشر من الشهر الثاني بعد كل فترة إقرار. وتسجّل الشركات التي تتاجر مع دول أخرى في الاتحاد الأوروبي في نظام VIES أيضًا. وللاطلاع على الحدود والمواعيد الحالية تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Wann muss ich mich auf Zypern für die Mehrwertsteuer registrieren?",
   "a": "Sie müssen sich beim Zyprischen Steueramt für die Mehrwertsteuer registrieren, wenn Ihre steuerpflichtigen Umsätze in den vorangegangenen 12 Monaten oder in den nächsten 30 Tagen 15.600 € übersteigen oder voraussichtlich übersteigen werden; für Erwerbe aus anderen EU-Mitgliedstaaten gilt eine gesonderte Schwelle von 10.251,61 €. Die Registrierung erfolgt mit dem Formular T.D. 1101 samt Nachweis der steuerpflichtigen Tätigkeiten, eingereicht bei einem Bezirkssteueramt oder über PSC Cyprus, und wird online über das Portal TAX FOR ALL (TFA) unter taxforall.mof.gov.cy durchgeführt. Mehrwertsteuererklärungen sind bis zum 10. Tag des zweiten Monats nach jedem Erklärungszeitraum einzureichen. Unternehmen, die mit anderen EU-Ländern handeln, registrieren sich außerdem für VIES. Für aktuelle Schwellen und Fristen ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Kiedy muszę zarejestrować się w VAT na Cyprze?",
   "a": "Musisz zarejestrować się w VAT w Cypryjskim Urzędzie Skarbowym, jeśli Twoje transakcje podlegające opodatkowaniu przekraczają lub przekroczą 15 600 € w ciągu poprzednich 12 miesięcy lub następnych 30 dni; dla nabyć z innych państw członkowskich UE obowiązuje osobny próg 10 251,61 €. Rejestracja w VAT odbywa się na formularzu T.D. 1101 wraz z dowodem działalności opodatkowanej, składanym w Dystryktowym Urzędzie Skarbowym lub przez PSC Cyprus, i jest wykonywana online przez portal TAX FOR ALL (TFA) na taxforall.mof.gov.cy. Deklaracje VAT należy składać do 10. dnia drugiego miesiąca po każdym okresie rozliczeniowym. Firmy handlujące z innymi krajami UE rejestrują się też w VIES. Aktualne progi i terminy opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Когда нужно регистрироваться по НДС на Кипре?",
   "a": "Зарегистрироваться по НДС в Налоговом департаменте Кипра необходимо, если ваши облагаемые операции превышают или будут превышать 15 600 € за предыдущие 12 месяцев либо за следующие 30 дней; для приобретений из других государств ЕС действует отдельный порог 10 251,61 €. Регистрация по НДС производится по форме T.D. 1101 вместе с доказательствами облагаемой деятельности, подаваемой в окружное налоговое управление или через PSC Cyprus, и выполняется онлайн через портал TAX FOR ALL (TFA) на taxforall.mof.gov.cy. Декларации по НДС необходимо подавать до 10-го числа второго месяца после каждого отчётного периода. Компании, торгующие с другими странами ЕС, также регистрируются в VIES. Актуальные пороги и сроки авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-running-obligations": {
  "el": {
   "q": "Ποιες είναι οι διαρκείς φορολογικές και λογιστικές υποχρεώσεις μιας κυπριακής εταιρείας;",
   "a": "Μια κυπριακή εταιρεία πρέπει να τηρεί λογιστικά αρχεία για 7 έτη και να διορίζει εγκεκριμένο ελεγκτή για τα λογιστικά της βιβλία και τις ετήσιες οικονομικές καταστάσεις που καλύπτουν τον Ιανουάριο έως τον Δεκέμβριο, με το επάγγελμα να εποπτεύεται από το Σώμα Ορκωτών Λογιστών Κύπρου (ICPAC). Οι εταιρείες πρέπει να έχουν κάτοικο Κύπρου ως διευθυντή, να πραγματοποιούν ετήσια συνεδρίαση του διοικητικού συμβουλίου και να υποβάλλουν ελεγμένες οικονομικές καταστάσεις εντός 2 εβδομάδων με το έντυπο ΗΕ32. Ο φόρος εταιρικού εισοδήματος είναι 12,5% στα καθαρά κέρδη της εταιρείας, υποβάλλεται με το έντυπο IR4 έως το τέλος του επόμενου έτους, το ετήσιο τέλος εταιρείας είναι €350 με προθεσμία την 30ή Ιουνίου, ενώ η έκτακτη εισφορά για την άμυνα 20% x 87,5% των καθαρών κερδών ισχύει για κατοίκους. Ο ΦΠΑ υποβάλλεται κάθε 3 μήνες ηλεκτρονικά με πληρωμή εντός 40 ημερών. Επειδή οι συντελεστές και οι προθεσμίες αλλάζουν, θεωρήστε αυθεντική την επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Care sunt obligațiile fiscale și contabile continue ale unei companii cipriote?",
   "a": "O companie cipriotă trebuie să păstreze evidențe contabile timp de 7 ani și să numească un auditor aprobat pentru contabilitate și situațiile financiare anuale care acoperă perioada ianuarie–decembrie, profesia fiind supravegheată de Institutul Contabililor Publici Autorizați din Cipru (ICPAC). Companiile trebuie să aibă un rezident cipriot ca director, să țină o ședință anuală a consiliului și să depună situațiile financiare auditate în 2 săptămâni, folosind formularul HE32. Impozitul pe profit este de 12,5% din profitul net al companiei, declarat pe formularul IR4 până la sfârșitul anului următor, taxa anuală a companiei este de 350 €, scadentă la 30 iunie, iar taxa de apărare de 20% x 87,5% din profitul net se aplică rezidenților. TVA se declară la fiecare 3 luni online, cu plata în 40 de zile. Deoarece cotele și termenele se schimbă, considerați pagina oficială businessincyprus.gov.cy drept autoritate de referință."
  },
  "ar": {
   "q": "ما الالتزامات الضريبية والمحاسبية المستمرة للشركة القبرصية؟",
   "a": "يجب على الشركة القبرصية الاحتفاظ بالسجلات المحاسبية 7 سنوات وتعيين مدقق حسابات معتمد لدفاترها وقوائمها المالية السنوية التي تغطي يناير إلى ديسمبر، وتشرف على المهنة هيئة المحاسبين القانونيين القبرصيين (ICPAC). ويجب أن يكون لدى الشركات مدير مقيم في قبرص، وأن تعقد اجتماعًا سنويًا لمجلس الإدارة، وأن تقدّم القوائم المالية المدققة خلال أسبوعين باستخدام النموذج HE32. وضريبة دخل الشركات 12.5% من صافي ربح الشركة، تُقدَّم بالنموذج IR4 بنهاية السنة التالية، ورسم الشركة السنوي 350 يورو يُستحق بحلول 30 يونيو، بينما تُطبَّق ضريبة الدفاع بنسبة 20% × 87.5% من صافي الربح على المقيمين. وتُقدَّم ضريبة القيمة المضافة كل 3 أشهر إلكترونيًا مع السداد خلال 40 يومًا. ولأن النسب والمواعيد تتغيّر، اعتبر صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Welche laufenden Steuer- und Buchführungspflichten hat eine zypriotische Gesellschaft?",
   "a": "Eine zypriotische Gesellschaft muss ihre Buchführungsunterlagen 7 Jahre aufbewahren und einen zugelassenen Abschlussprüfer für ihre Buchhaltung und den Jahresabschluss (Januar bis Dezember) bestellen; der Berufsstand wird vom Institut der Zyprischen Wirtschaftsprüfer (ICPAC) beaufsichtigt. Gesellschaften müssen einen in Zypern ansässigen Direktor haben, jährlich eine Vorstandssitzung abhalten und den geprüften Jahresabschluss innerhalb von 2 Wochen mit dem Formular HE32 einreichen. Die Körperschaftsteuer beträgt 12,5 % des Nettogewinns der Gesellschaft, einzureichen mit dem Formular IR4 bis Ende des Folgejahres; die jährliche Gesellschaftsabgabe von 350 € ist bis zum 30. Juni fällig, während für Ansässige eine Verteidigungsabgabe von 20 % x 87,5 % des Nettogewinns gilt. Die Mehrwertsteuer wird alle 3 Monate online erklärt, die Zahlung erfolgt innerhalb von 40 Tagen. Da sich Sätze und Fristen ändern, gilt die offizielle Seite businessincyprus.gov.cy als maßgeblich."
  },
  "pl": {
   "q": "Jakie są bieżące obowiązki podatkowe i księgowe cypryjskiej spółki?",
   "a": "Cypryjska spółka musi przechowywać dokumentację księgową przez 7 lat i wyznaczyć zatwierdzonego biegłego rewidenta do ksiąg i rocznego sprawozdania finansowego obejmującego okres od stycznia do grudnia; zawód nadzoruje Instytut Biegłych Rewidentów Cypru (ICPAC). Spółki muszą mieć dyrektora będącego rezydentem Cypru, odbywać coroczne posiedzenie zarządu i składać zbadane sprawozdanie finansowe w ciągu 2 tygodni na formularzu HE32. Podatek dochodowy od osób prawnych wynosi 12,5% zysku netto spółki, składany na formularzu IR4 do końca następnego roku, roczna opłata spółki wynosi 350 € i jest płatna do 30 czerwca, a dla rezydentów obowiązuje podatek obronny w wysokości 20% x 87,5% zysku netto. VAT rozlicza się co 3 miesiące online z płatnością w ciągu 40 dni. Ponieważ stawki i terminy się zmieniają, autorytatywną jest oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Каковы постоянные налоговые и бухгалтерские обязанности кипрской компании?",
   "a": "Кипрская компания обязана хранить бухгалтерские записи 7 лет и назначить утверждённого аудитора для бухгалтерского учёта и годовой финансовой отчётности за период с января по декабрь; профессию курирует Институт сертифицированных публичных бухгалтеров Кипра (ICPAC). У компаний должен быть директор — резидент Кипра, они обязаны проводить ежегодное заседание совета директоров и подавать аудированную финансовую отчётность в течение 2 недель по форме HE32. Налог на прибыль компаний составляет 12,5 % чистой прибыли компании, подаётся по форме IR4 до конца следующего года, ежегодный сбор компании — 350 €, срок — 30 июня, а для резидентов действует оборонный налог 20 % x 87,5 % чистой прибыли. НДС подаётся каждые 3 месяца онлайн с оплатой в течение 40 дней. Поскольку ставки и сроки меняются, авторитетной считайте официальную страницу businessincyprus.gov.cy."
  }
 },
 "biz-hiring-employees": {
  "el": {
   "q": "Τι πρέπει να κάνω για να προσλάβω εργαζόμενους στην Κύπρο;",
   "a": "Πριν από την πρόσληψη, ο εργοδότης πρέπει να εγγραφεί στο Μητρώο Εργοδοτών των Υπηρεσιών Κοινωνικών Ασφαλίσεων με το έντυπο ΥΚΑ 01-001 στο τοπικό Επαρχιακό Γραφείο Κοινωνικών Ασφαλίσεων, και να δηλώνει κάθε πρόσληψη το αργότερο μία ημέρα πριν από την έναρξή της, ηλεκτρονικά μέσω του συστήματος ΕΡΓΑΝΗ. Από την 1η Ιανουαρίου 2024 ο εθνικός κατώτατος μισθός είναι €1000 μικτά για εργαζόμενους πλήρους απασχόλησης και €900 μικτά για εργαζόμενους με λιγότερο από 6 μήνες υπηρεσίας. Οι εργαζόμενοι πρέπει να λαμβάνουν γραπτούς όρους απασχόλησης, η δοκιμαστική περίοδος είναι οι πρώτοι έξι μήνες (παρατείνεται έως δύο χρόνια με συμφωνία), τα επιδόματα απόλυσης ισχύουν μετά από 104 συνεχόμενες εβδομάδες και η προστασία από άδικη απόλυση μετά από 26 συνεχόμενες εβδομάδες. Για την πρόσληψη πολίτη της ΕΕ χρησιμοποιείται το έντυπο MEU1A με τέλος €20 ανά άτομο και €20 για κάθε μέλος της οικογένειας που είναι επίσης πολίτης της ΕΕ, ενώ το βασικό προσωπικό εκτός ΕΕ σε εταιρείες ξένων συμφερόντων χρειάζεται ελάχιστο μικτό μισθό €2.500 τον μήνα και σύμβαση τουλάχιστον δύο ετών και έως 3 ετών. Για τα τρέχοντα ποσά, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Ce trebuie să fac pentru a angaja personal în Cipru?",
   "a": "Înainte de recrutare, angajatorul trebuie să se înregistreze în Registrul Angajatorilor al Serviciilor de Asigurări Sociale folosind formularul YKA 01-001 la Biroul Districtual de Asigurări Sociale local și trebuie să notifice fiecare angajare cel târziu cu o zi înainte de începerea ei, electronic prin sistemul ERGANI. Începând cu 1 ianuarie 2024, salariul minim național este de 1000 € brut pentru angajații cu normă întreagă și de 900 € brut pentru angajații cu mai puțin de 6 luni de vechime. Angajații trebuie să primească în scris condițiile de angajare, perioada de probă este de primele șase luni (prelungibilă până la doi ani prin acord), indemnizațiile de concediere se aplică după 104 săptămâni consecutive, iar protecția împotriva concedierii nejustificate după 26 de săptămâni consecutive. Pentru angajarea unui cetățean UE se folosește formularul MEU1A, cu o taxă de 20 € pe persoană și 20 € pentru fiecare membru de familie care este de asemenea cetățean UE, în timp ce personalul-cheie din afara UE din companiile cu interese străine are nevoie de un salariu brut minim de 2.500 € pe lună și de un contract de cel puțin doi ani și de până la 3 ani. Pentru cifrele actuale, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "ماذا عليّ أن أفعل لتوظيف موظفين في قبرص؟",
   "a": "قبل التوظيف يجب على صاحب العمل التسجيل في سجل أصحاب العمل لدى دائرة التأمينات الاجتماعية باستخدام النموذج YKA 01-001 في مكتب التأمينات الاجتماعية المحلي، وإبلاغ كل تعيين قبل بدئه بيوم واحد على الأكثر إلكترونيًا عبر نظام ERGANI. اعتبارًا من 1 يناير 2024 بلغ الحد الأدنى الوطني للأجور 1000 يورو إجمالي للموظفين بدوام كامل و900 يورو إجمالي للموظفين الذين لديهم أقل من 6 أشهر خدمة. ويجب أن يتلقى الموظفون شروط العمل كتابةً، وفترة التجربة هي الأشهر الستة الأولى (تُمدَّد إلى سنتين بالاتفاق)، وتُطبَّق مستحقات التسريح بعد 104 أسابيع متتالية والحماية من الفصل التعسفي بعد 26 أسبوعًا متتاليًا. ولتوظيف مواطن من الاتحاد الأوروبي يُستخدم النموذج MEU1A برسم 20 يورو للشخص و20 يورو عن كل فرد من الأسرة هو أيضًا مواطن أوروبي، بينما يحتاج الموظفون الرئيسيون من خارج الاتحاد في الشركات ذات المصالح الأجنبية إلى حد أدنى للراتب الإجمالي قدره 2,500 يورو شهريًا وعقد لا تقل مدته عن سنتين وحتى 3 سنوات. وللاطلاع على الأرقام الحالية تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Was muss ich tun, um auf Zypern Mitarbeiter einzustellen?",
   "a": "Vor der Einstellung muss sich der Arbeitgeber mit dem Formular YKA 01-001 beim örtlichen Bezirksbüro der Sozialversicherung im Arbeitgeberregister der Sozialversicherungsdienste eintragen und jede Einstellung spätestens einen Tag vor Beginn elektronisch über das System ERGANI melden. Seit dem 1. Januar 2024 beträgt der nationale Mindestlohn 1000 € brutto für Vollzeitbeschäftigte und 900 € brutto für Beschäftigte mit weniger als 6 Monaten Betriebszugehörigkeit. Arbeitnehmer müssen die Arbeitsbedingungen schriftlich erhalten, die Probezeit umfasst die ersten sechs Monate (durch Vereinbarung auf bis zu zwei Jahre verlängerbar), Abfindungsansprüche bestehen nach 104 aufeinanderfolgenden Wochen und Kündigungsschutz gegen ungerechtfertigte Entlassung nach 26 aufeinanderfolgenden Wochen. Für die Einstellung eines EU-Bürgers wird das Formular MEU1A verwendet, mit einer Gebühr von 20 € pro Person und 20 € für jedes Familienmitglied, das ebenfalls EU-Bürger ist; Schlüsselpersonal aus Nicht-EU-Staaten in Unternehmen mit ausländischer Beteiligung benötigt ein Mindestbruttogehalt von 2.500 € pro Monat und einen Vertrag von mindestens zwei und bis zu 3 Jahren. Für aktuelle Zahlen ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Co muszę zrobić, aby zatrudnić pracowników na Cyprze?",
   "a": "Przed rekrutacją pracodawca musi zarejestrować się w Rejestrze Pracodawców Służb Ubezpieczeń Społecznych na formularzu YKA 01-001 w lokalnym dystryktowym biurze ubezpieczeń społecznych i zgłaszać każde zatrudnienie najpóźniej na dzień przed jego rozpoczęciem, elektronicznie przez system ERGANI. Od 1 stycznia 2024 r. krajowa płaca minimalna wynosi 1000 € brutto dla pracowników pełnoetatowych i 900 € brutto dla pracowników z mniej niż 6-miesięcznym stażem. Pracownicy muszą otrzymać pisemne warunki zatrudnienia, okres próbny to pierwsze sześć miesięcy (przedłużalny za porozumieniem do dwóch lat), odprawy przysługują po 104 kolejnych tygodniach, a ochrona przed bezpodstawnym zwolnieniem po 26 kolejnych tygodniach. Do zatrudnienia obywatela UE stosuje się formularz MEU1A z opłatą 20 € za osobę i 20 € za każdego członka rodziny, który również jest obywatelem UE, natomiast kluczowy personel spoza UE w spółkach z udziałem kapitału zagranicznego potrzebuje minimalnego wynagrodzenia brutto 2500 € miesięcznie i umowy na co najmniej dwa lata i do 3 lat. Aktualne kwoty opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Что нужно сделать, чтобы нанять сотрудников на Кипре?",
   "a": "Перед наймом работодатель должен зарегистрироваться в Реестре работодателей Служб социального страхования по форме YKA 01-001 в местном окружном отделении социального страхования и уведомлять о каждом найме не позднее чем за один день до его начала, в электронном виде через систему ERGANI. С 1 января 2024 года национальный минимальный размер оплаты труда составляет 1000 € брутто для работников с полной занятостью и 900 € брутто для работников со стажем менее 6 месяцев. Работники должны получать условия трудоустройства в письменном виде, испытательный срок — первые шесть месяцев (по соглашению может быть продлён до двух лет), выходное пособие полагается после 104 последовательных недель, а защита от необоснованного увольнения — после 26 последовательных недель. Для найма гражданина ЕС используется форма MEU1A со сбором 20 € с человека и 20 € за каждого члена семьи, также являющегося гражданином ЕС, а ключевому персоналу из стран вне ЕС в компаниях с иностранными интересами нужна минимальная зарплата брутто 2500 € в месяц и контракт не менее двух лет и до 3 лет. Актуальные цифры авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-social-insurance": {
  "el": {
   "q": "Ποια είναι τα βήματα εγγραφής στις κοινωνικές ασφαλίσεις και τα ποσοστά εισφορών στην Κύπρο;",
   "a": "Οι εργοδότες εγγράφονται στο Μητρώο Εργοδοτών των Υπηρεσιών Κοινωνικών Ασφαλίσεων (ΥΚΑ) με το έντυπο ΥΚΑ 01-001 και δηλώνουν τις προσλήψεις μέσω του συστήματος ΕΡΓΑΝΗ (https://ergani.mlsi.gov.cy) το αργότερο μία ημέρα πριν από την πρόσληψη, ενώ οι αυτοαπασχολούμενοι υποβάλλουν αίτηση με το έντυπο ΥΚΑ 1-008 και συνήθως λαμβάνουν αριθμό κοινωνικής ασφάλισης εντός 1–2 εβδομάδων. Για τους εργαζομένους η εισφορά είναι 22,8% των ασφαλιστέων αποδοχών, κατανεμημένη σε 8,8% εργοδότης, 8,8% εργαζόμενος και 5,2% κράτος· οι αυτοαπασχολούμενοι πληρώνουν συνολικά 21,8%, από τα οποία 16,6% καταβάλλονται από τον αυτοαπασχολούμενο και 5,2% από το κράτος· και οι εθελοντικά ασφαλισμένοι πληρώνουν 19,7%, από τα οποία 15% καταβάλλονται από τον ασφαλισμένο και 4,7% από το κράτος. Οι εργοδότες καταβάλλουν επίσης 1,2% στο Ταμείο Πλεονασμού, 0,5% στο Ταμείο Ανάπτυξης Ανθρώπινου Δυναμικού και 2% στο Ταμείο Κοινωνικής Συνοχής. Οι εισφορές πρέπει να καταβάλλονται έως το τέλος του ημερολογιακού μήνα που ακολουθεί τον μήνα για τον οποίο οφείλονται, και οι κοινωνικές ασφαλίσεις των αυτοαπασχολουμένων καταβάλλονται ανά τρεις μήνες. Για τα τρέχοντα ποσοστά, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Care sunt pașii de înregistrare la asigurările sociale și cotele de contribuție în Cipru?",
   "a": "Angajatorii se înregistrează în Registrul Angajatorilor al Serviciilor de Asigurări Sociale (SIS) folosind formularul YKA 01-001 și notifică angajările prin sistemul ERGANI (https://ergani.mlsi.gov.cy) cel târziu cu o zi înainte de angajare, în timp ce persoanele care desfășoară activitate independentă depun cererea pe formularul YKA 1-008 și primesc de obicei un număr de asigurări sociale în 1–2 săptămâni. Pentru angajați, contribuția este de 22,8% din veniturile asigurabile, împărțită astfel: 8,8% angajator, 8,8% angajat și 5,2% stat; persoanele independente plătesc în total 21,8%, din care 16,6% de către persoana independentă și 5,2% de stat; iar contribuabilii voluntari plătesc 19,7%, din care 15% de către contribuabil și 4,7% de stat. Angajatorii plătesc de asemenea 1,2% către Fondul de Disponibilizări, 0,5% către Fondul de Dezvoltare a Resurselor Umane și 2% către Fondul de Coeziune Socială. Contribuțiile trebuie plătite până la sfârșitul lunii calendaristice următoare lunii pentru care sunt datorate, iar asigurările sociale ale persoanelor independente se plătesc trimestrial. Pentru cotele actuale, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "ما خطوات التسجيل في التأمينات الاجتماعية ونسب الاشتراكات في قبرص؟",
   "a": "يسجّل أصحاب العمل في سجل أصحاب العمل لدى دائرة التأمينات الاجتماعية (SIS) باستخدام النموذج YKA 01-001 ويبلّغون عن التعيينات عبر نظام ERGANI (https://ergani.mlsi.gov.cy) قبل التعيين بيوم واحد على الأكثر، بينما يتقدّم العاملون لحسابهم الخاص بالنموذج YKA 1-008 ويحصلون عادةً على رقم التأمين الاجتماعي خلال 1–2 أسبوع. بالنسبة للموظفين الاشتراك 22.8% من الدخل الخاضع للتأمين، موزعة 8.8% على صاحب العمل و8.8% على الموظف و5.2% على الدولة؛ ويدفع العاملون لحسابهم الخاص 21.8% في المجموع، منها 16.6% يتحملها العامل لحسابه الخاص و5.2% الدولة؛ ويدفع المشتركون الطوعيون 19.7%، منها 15% على المشترك و4.7% على الدولة. كما يدفع أصحاب العمل 1.2% لصندوق التسريح و0.5% لصندوق تنمية الموارد البشرية و2% لصندوق التماسك الاجتماعي. يجب سداد الاشتراكات بحلول نهاية الشهر التقويمي التالي للشهر المستحق عنه، ويُدفع تأمين العاملين لحسابهم الخاص كل ثلاثة أشهر. وللاطلاع على النسب الحالية تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Wie läuft die Anmeldung zur Sozialversicherung ab, und wie hoch sind die Beitragssätze auf Zypern?",
   "a": "Arbeitgeber tragen sich mit dem Formular YKA 01-001 im Arbeitgeberregister der Sozialversicherungsdienste (SIS) ein und melden Einstellungen über das System ERGANI (https://ergani.mlsi.gov.cy) spätestens einen Tag vor der Einstellung, während Selbstständige den Antrag auf Formular YKA 1-008 stellen und in der Regel innerhalb von 1–2 Wochen eine Sozialversicherungsnummer erhalten. Für Arbeitnehmer beträgt der Beitrag 22,8 % des versicherungspflichtigen Einkommens, aufgeteilt in 8,8 % Arbeitgeber, 8,8 % Arbeitnehmer und 5,2 % Staat; Selbstständige zahlen insgesamt 21,8 %, davon 16,6 % durch den Selbstständigen und 5,2 % durch den Staat; freiwillig Versicherte zahlen 19,7 %, davon 15 % durch den Beitragszahler und 4,7 % durch den Staat. Arbeitgeber zahlen zudem 1,2 % an den Entlassungsfonds, 0,5 % an den Fonds für Personalentwicklung und 2 % an den Fonds für sozialen Zusammenhalt. Die Beiträge sind bis zum Ende des Kalendermonats zu zahlen, der auf den Monat folgt, für den sie geschuldet werden; die Sozialversicherung der Selbstständigen ist vierteljährlich fällig. Für aktuelle Sätze ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Jakie są kroki rejestracji w ubezpieczeniach społecznych i stawki składek na Cyprze?",
   "a": "Pracodawcy rejestrują się w Rejestrze Pracodawców Służb Ubezpieczeń Społecznych (SIS) na formularzu YKA 01-001 i zgłaszają zatrudnienia przez system ERGANI (https://ergani.mlsi.gov.cy) najpóźniej na dzień przed zatrudnieniem, natomiast osoby samozatrudnione składają wniosek na formularzu YKA 1-008 i zwykle otrzymują numer ubezpieczenia społecznego w ciągu 1–2 tygodni. Dla pracowników składka wynosi 22,8% podstawy ubezpieczeniowej, w podziale 8,8% pracodawca, 8,8% pracownik i 5,2% państwo; osoby samozatrudnione płacą łącznie 21,8%, z czego 16,6% płaci samozatrudniony, a 5,2% państwo; a ubezpieczeni dobrowolnie płacą 19,7%, z czego 15% płaci składkujący, a 4,7% państwo. Pracodawcy płacą też 1,2% do Funduszu Odpraw, 0,5% do Funduszu Rozwoju Zasobów Ludzkich i 2% do Funduszu Spójności Społecznej. Składki należy opłacić do końca miesiąca kalendarzowego następującego po miesiącu, za który są należne, a składki samozatrudnionych płaci się co trzy miesiące. Aktualne stawki opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Каковы шаги регистрации в социальном страховании и ставки взносов на Кипре?",
   "a": "Работодатели регистрируются в Реестре работодателей Служб социального страхования (SIS) по форме YKA 01-001 и сообщают о наймах через систему ERGANI (https://ergani.mlsi.gov.cy) не позднее чем за один день до найма, тогда как самозанятые подают заявление по форме YKA 1-008 и обычно получают номер социального страхования в течение 1–2 недель. Для работников взнос составляет 22,8 % застрахованного заработка и распределяется так: 8,8 % работодатель, 8,8 % работник и 5,2 % государство; самозанятые платят в сумме 21,8 %, из которых 16,6 % вносит самозанятый и 5,2 % государство; добровольные плательщики вносят 19,7 %, из которых 15 % платит сам плательщик и 4,7 % государство. Работодатели также платят 1,2 % в Фонд увольнений, 0,5 % в Фонд развития человеческих ресурсов и 2 % в Фонд социальной сплочённости. Взносы необходимо уплатить до конца календарного месяца, следующего за месяцем, за который они причитаются, а страховые взносы самозанятых уплачиваются раз в три месяца. Актуальные ставки авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-funding": {
  "el": {
   "q": "Πώς μπορώ να εξασφαλίσω χρηματοδότηση για την επιχείρησή μου στην Κύπρο;",
   "a": "Για να αναζητήσετε χρηματοδότηση πρέπει να ετοιμάσετε ένα πλήρως αναλυτικό επιχειρηματικό σχέδιο που δείχνει το στρατηγικό δυναμικό και τις προοπτικές ανάπτυξης και τα προβλεπόμενα έσοδα, να μπορείτε να χρηματοδοτήσετε εν μέρει την πρωτοβουλία μόνοι σας και να παρέχετε εξασφαλίσεις σε ρευστά ή μη ρευστά περιουσιακά στοιχεία για τραπεζικά δάνεια. Το Ίδρυμα Έρευνας και Καινοτομίας (ΙΕΚ) είναι ο κύριος φορέας χρηματοδότησης επιχειρηματικής έρευνας και οι επιχορηγήσεις του καλύπτουν έως και 85% του επενδυμένου κεφαλαίου, με βάση κριτήρια επιλεξιμότητας και ποιότητας, με προγράμματα στο research.org.cy. Άλλη στήριξη προέρχεται από την Υπηρεσία Βιομηχανίας και Τεχνολογίας του Υπουργείου Ενέργειας, Εμπορίου και Βιομηχανίας, το Υπουργείο Γεωργίας και τον Κυπριακό Οργανισμό Αγροτικών Πληρωμών για τον πρωτογενή τομέα, και από τις κυπριακές τράπεζες για δανειακή χρηματοδότηση. Σχετικά κίνητρα είναι ο εταιρικός φόρος 12,5% και απαλλαγή 50% στο ετήσιο εισόδημα από απασχόληση άνω των €55.000 για αλλοδαπούς, υπό προϋποθέσεις, ενώ το Υφυπουργείο Έρευνας, Καινοτομίας και Ψηφιακής Πολιτικής εγκρίνει τις Πιστοποιημένες Καινοτόμες Επιχειρήσεις. Επειδή τα σχήματα και τα κριτήρια αλλάζουν, θεωρήστε αυθεντική την επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Cum pot obține finanțare pentru afacerea mea în Cipru?",
   "a": "Pentru a solicita finanțare, ar trebui să pregătiți un plan de afaceri complet detaliat, care să arate potențialul strategic și de dezvoltare și veniturile estimate, să puteți finanța parțial inițiativa din resurse proprii și să oferiți garanții în active lichide sau nelichide pentru creditele bancare. Fundația pentru Cercetare și Inovare (RIF) este principalul organism care finanțează cercetarea în afaceri, iar granturile sale acoperă până la 85% din capitalul investit, acordate pe baza unor criterii de eligibilitate și calitative, cu programe pe research.org.cy. Alt sprijin vine de la Serviciul pentru Industrie și Tehnologie al Ministerului Energiei, Comerțului și Industriei, de la Ministerul Agriculturii și Organismul Cipriot de Plăți în Agricultură pentru sectorul primar și de la băncile cipriote pentru finanțare prin datorie. Stimulentele relevante includ impozitul pe profit de 12,5% și o scutire de 50% pentru venitul anual din muncă de 55.000 € și peste pentru cetățenii străini, în anumite condiții, iar Subsecretariatul pentru Cercetare, Inovare și Politică Digitală aprobă Întreprinderile Inovatoare Certificate. Deoarece schemele și criteriile se schimbă, considerați pagina oficială businessincyprus.gov.cy drept autoritate de referință."
  },
  "ar": {
   "q": "كيف أحصل على تمويل لعملي التجاري في قبرص؟",
   "a": "للسعي إلى التمويل ينبغي إعداد خطة عمل مفصّلة بالكامل تُظهر الإمكانات الاستراتيجية والتطويرية والإيرادات المتوقعة، وأن تكون قادرًا على تمويل المبادرة جزئيًا بنفسك، وأن تقدّم ضمانات من أصول سائلة أو غير سائلة للقروض المصرفية. مؤسسة البحث والابتكار (RIF) هي الجهة الرئيسية لتمويل البحوث التجارية وتغطي منحها حتى 85% من رأس المال المستثمَر، وتُمنح وفق معايير الأهلية والجودة، مع برامج على research.org.cy. ويأتي دعم آخر من دائرة الصناعة والتكنولوجيا في وزارة الطاقة والتجارة والصناعة، ووزارة الزراعة ووكالة المدفوعات الزراعية القبرصية للقطاع الأولي، والبنوك القبرصية للتمويل بالدين. ومن الحوافز ذات الصلة ضريبة الشركات 12.5% وإعفاء بنسبة 50% على دخل العمل السنوي البالغ 55,000 يورو فأكثر للأجانب، بشروط، وتوافق وزارة الدولة للبحوث والابتكار والسياسة الرقمية على «الشركات المبتكرة المعتمدة». ولأن البرامج والمعايير تتغيّر، اعتبر صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Wie erhalte ich Finanzierung für mein Unternehmen auf Zypern?",
   "a": "Um Finanzierung zu beantragen, sollten Sie einen vollständig ausgearbeiteten Businessplan vorlegen, der strategisches und Entwicklungspotenzial sowie die erwarteten Erträge zeigt, das Vorhaben teilweise selbst finanzieren können und für Bankkredite Sicherheiten in liquiden oder nicht liquiden Vermögenswerten stellen. Die Stiftung für Forschung und Innovation (RIF) ist die wichtigste Stelle zur Finanzierung betrieblicher Forschung; ihre Zuschüsse decken bis zu 85 % des investierten Kapitals und werden nach Förder- und Qualitätskriterien vergeben, Programme unter research.org.cy. Weitere Unterstützung kommt vom Industrie- und Technologiedienst des Ministeriums für Energie, Handel und Industrie, vom Landwirtschaftsministerium und der Zyprischen Landwirtschaftlichen Zahlstelle für den Primärsektor sowie von zypriotischen Banken für Fremdfinanzierung. Relevante Anreize sind der Körperschaftsteuersatz von 12,5 % und eine 50-%-Befreiung für jährliche Beschäftigungseinkünfte ab 55.000 € für Ausländer, unter Bedingungen; das Stellvertretende Ministerium für Forschung, Innovation und Digitalpolitik genehmigt zertifizierte innovative Unternehmen. Da sich Programme und Kriterien ändern, gilt die offizielle Seite businessincyprus.gov.cy als maßgeblich."
  },
  "pl": {
   "q": "Jak mogę uzyskać finansowanie dla firmy na Cyprze?",
   "a": "Aby ubiegać się o finansowanie, należy przygotować w pełni szczegółowy biznesplan pokazujący potencjał strategiczny i rozwojowy oraz przewidywane przychody, móc częściowo sfinansować przedsięwzięcie samodzielnie i zapewnić zabezpieczenie w aktywach płynnych lub niepłynnych na kredyty bankowe. Fundacja Badań i Innowacji (RIF) jest głównym podmiotem finansującym badania biznesowe, a jej dotacje pokrywają do 85% zainwestowanego kapitału, przyznawane na podstawie kryteriów kwalifikowalności i jakościowych, z programami na research.org.cy. Inne wsparcie pochodzi od Służby ds. Przemysłu i Technologii Ministerstwa Energii, Handlu i Przemysłu, Ministerstwa Rolnictwa i Cypryjskiej Agencji Płatności Rolnych dla sektora pierwotnego oraz od cypryjskich banków w zakresie finansowania dłużnego. Istotne zachęty to stawka podatku od osób prawnych 12,5% oraz 50% zwolnienia rocznego dochodu z pracy od 55 000 € wzwyż dla cudzoziemców, pod warunkami; Wiceministerstwo Badań, Innowacji i Polityki Cyfrowej zatwierdza Certyfikowane Przedsiębiorstwa Innowacyjne. Ponieważ programy i kryteria się zmieniają, autorytatywną jest oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Как получить финансирование для бизнеса на Кипре?",
   "a": "Чтобы добиваться финансирования, следует подготовить полностью детальный бизнес-план, показывающий стратегический потенциал и потенциал развития и прогнозируемый доход, быть способным частично профинансировать инициативу самостоятельно и предоставить обеспечение в ликвидных или неликвидных активах для банковских кредитов. Фонд исследований и инноваций (RIF) — основной орган, финансирующий бизнес-исследования; его гранты покрывают до 85 % инвестированного капитала и присуждаются по критериям допустимости и качества, программы — на research.org.cy. Другая поддержка исходит от Службы промышленности и технологий Министерства энергетики, торговли и промышленности, Министерства сельского хозяйства и Кипрского агентства сельскохозяйственных выплат для первичного сектора, а также от кипрских банков для долгового финансирования. Среди значимых стимулов — ставка налога на прибыль 12,5 % и 50-процентное освобождение годового дохода от трудовой деятельности от 55 000 € для иностранцев при соблюдении условий; Заместитель министра по исследованиям, инновациям и цифровой политике утверждает сертифицированные инновационные компании. Поскольку программы и критерии меняются, авторитетной считайте официальную страницу businessincyprus.gov.cy."
  }
 },
 "biz-exit": {
  "el": {
   "q": "Πώς πουλάω, κλείνω ή αποχωρώ από μια επιχείρηση στην Κύπρο;",
   "a": "Μπορείτε να αποχωρήσετε μεταβιβάζοντας την ιδιοκτησία ή διαλύοντας την επιχείρηση. Οι αλλαγές ιδιοκτησίας χρησιμοποιούν έντυπα που κατατίθενται στον Έφορο Εταιρειών και Διανοητικής Ιδιοκτησίας, μεταξύ των οποίων το ΗΕ57 για μεταβίβαση μετοχών, το ΗΕ12 για κατανομή μετοχών, το ΗΕ14 για αύξηση μετοχικού κεφαλαίου, το ΗΕ15 για αύξηση μετόχων και το ΗΕ16 για αλλαγή μετοχικού κεφαλαίου. Οι επιλογές διάλυσης περιλαμβάνουν εκούσια ή ακούσια διαγραφή, εκκαθάριση, διασυνοριακή συγχώνευση ή μεταφορά της έδρας εκτός της Δημοκρατίας, με τη χρεοκοπία και την εκκαθάριση να χειρίζεται το Τμήμα Αφερεγγυότητας, όπου η αναγκαστική χρεοκοπία απαιτεί χρέος άνω των €854 και η εκούσια ποσό άνω των €8.600. Ο Επίσημος Παραλήπτης συγκαλεί συνέλευση πιστωτών εντός 14 ημερών και ο οφειλέτης πρέπει να παρέχει στον διαχειριστή τα στοιχεία των χρεών εντός επτά ημερών, ή τριών ημερών αν ο οφειλέτης υπέβαλε την αίτηση· για εταιρείες με ετήσιο κύκλο εργασιών άνω των €500.000 ή αξία εξαγοράς άνω των €2 εκατ. συνιστάται η πρόσληψη επαγγελματιών συμβούλων, και η υπηρεσία ελεγκτικού οίκου είναι η μόνη υποχρεωτική επαγγελματική υπηρεσία. Για τις τρέχουσες διαδικασίες, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Cum vând, închid sau ies dintr-o afacere în Cipru?",
   "a": "Puteți ieși fie prin transferul proprietății, fie prin dizolvarea afacerii. Schimbările de proprietate folosesc formulare depuse la Registrul Comerțului și al Proprietății Intelectuale, printre care HE57 pentru transferul de acțiuni, HE12 pentru alocarea de acțiuni, HE14 pentru majorarea capitalului social, HE15 pentru creșterea numărului de acționari și HE16 pentru modificarea capitalului social. Opțiunile de dizolvare includ radierea voluntară sau involuntară, lichidarea, fuziunea transfrontalieră sau mutarea sediului în afara Republicii, falimentul și lichidarea fiind gestionate de Departamentul de Insolvență, unde falimentul obligatoriu necesită o datorie de peste 854 €, iar cel voluntar o sumă de peste 8.600 €. Lichidatorul oficial convoacă o adunare a creditorilor în 14 zile, iar debitorul trebuie să furnizeze administratorului detaliile datoriilor în șapte zile, sau în trei zile dacă debitorul a depus cererea; companiilor cu cifră de afaceri anuală de peste 500.000 € sau cu valoare de preluare de peste 2 milioane € li se recomandă să angajeze consultanți profesioniști, iar serviciul unei firme de audit este singurul serviciu profesional obligatoriu. Pentru procedurile actuale, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "كيف أبيع عملاً تجاريًا أو أغلقه أو أخرج منه في قبرص؟",
   "a": "يمكنك الخروج إما بنقل الملكية أو بحلّ العمل. تستخدم تغييرات الملكية نماذج تُقدَّم إلى مسجّل الشركات والملكية الفكرية، منها HE57 لنقل الأسهم وHE12 لتخصيص الأسهم وHE14 لزيادة رأس المال وHE15 لزيادة المساهمين وHE16 لتغيير رأس المال. وتشمل خيارات الحلّ الشطب الطوعي أو غير الطوعي والتصفية والاندماج العابر للحدود أو نقل المقر خارج الجمهورية، وتتولى دائرة الإعسار الإفلاس والتصفية، حيث يتطلب الإفلاس الإجباري دينًا يتجاوز 854 يورو والإفلاس الطوعي مبلغًا يتجاوز 8,600 يورو. يعقد المصفّي الرسمي اجتماعًا للدائنين خلال 14 يومًا، وعلى المدين تزويد الوصي بتفاصيل الديون خلال سبعة أيام، أو ثلاثة أيام إذا كان المدين هو مقدّم الطلب؛ وتُنصح الشركات التي يتجاوز دورانها السنوي 500,000 يورو أو قيمة الاستحواذ عليها مليوني يورو بالاستعانة بمستشارين محترفين، وخدمة شركة التدقيق هي الخدمة المهنية الإلزامية الوحيدة. وللاطلاع على الإجراءات الحالية تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Wie verkaufe, schließe oder verlasse ich ein Unternehmen auf Zypern?",
   "a": "Sie können durch Übertragung der Inhaberschaft oder durch Auflösung des Unternehmens aussteigen. Inhaberwechsel erfolgen über Formulare, die beim Handelsregister und Amt für geistiges Eigentum einzureichen sind, darunter HE57 für die Übertragung von Anteilen, HE12 für die Zuteilung von Anteilen, HE14 für die Erhöhung des Stammkapitals, HE15 für die Erhöhung der Gesellschafterzahl und HE16 für die Änderung des Stammkapitals. Zu den Auflösungsoptionen zählen freiwillige oder unfreiwillige Löschung, Liquidation, grenzüberschreitende Verschmelzung oder Sitzverlegung außerhalb der Republik; Insolvenz und Liquidation werden vom Insolvenzamt abgewickelt, wobei die Zwangsinsolvenz Schulden über 854 € und die freiwillige Insolvenz einen Betrag über 8.600 € voraussetzt. Der Amtliche Konkursverwalter beruft innerhalb von 14 Tagen eine Gläubigerversammlung ein, und der Schuldner muss dem Treuhänder die Schuldeneinzelheiten innerhalb von sieben Tagen mitteilen, bei eigenem Antrag innerhalb von drei Tagen; Unternehmen mit einem Jahresumsatz über 500.000 € oder einem Übernahmewert über 2 Mio. € wird die Hinzuziehung professioneller Berater empfohlen, wobei die Leistung einer Prüfungsgesellschaft die einzige zwingende Fachdienstleistung ist. Für aktuelle Verfahren ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Jak sprzedać, zamknąć lub wyjść z firmy na Cyprze?",
   "a": "Możesz wyjść, przenosząc własność lub likwidując działalność. Zmiany własności wymagają formularzy składanych do Rejestru Spółek i Własności Intelektualnej, w tym HE57 do przeniesienia udziałów, HE12 do przydziału udziałów, HE14 do podwyższenia kapitału zakładowego, HE15 do zwiększenia liczby wspólników i HE16 do zmiany kapitału zakładowego. Opcje likwidacji obejmują dobrowolne lub przymusowe wykreślenie, likwidację, transgraniczne połączenie lub przeniesienie siedziby poza Republikę; upadłością i likwidacją zajmuje się Departament Niewypłacalności, przy czym upadłość przymusowa wymaga długu powyżej 854 €, a dobrowolna kwoty powyżej 8600 €. Syndyk urzędowy zwołuje zgromadzenie wierzycieli w ciągu 14 dni, a dłużnik musi przekazać powiernikowi szczegóły zadłużenia w ciągu siedmiu dni, lub trzech dni, jeśli to dłużnik złożył wniosek; firmom z rocznym obrotem powyżej 500 000 € lub wartością przejęcia powyżej 2 mln € zaleca się zatrudnienie doradców zawodowych, a usługa firmy audytorskiej jest jedyną obowiązkową usługą profesjonalną. Aktualne procedury opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Как продать, закрыть или выйти из бизнеса на Кипре?",
   "a": "Выйти можно либо передачей права собственности, либо ликвидацией бизнеса. Смена собственника оформляется формами, подаваемыми регистратору компаний и интеллектуальной собственности, среди них HE57 — для передачи акций, HE12 — для распределения акций, HE14 — для увеличения уставного капитала, HE15 — для увеличения числа акционеров и HE16 — для изменения уставного капитала. Варианты прекращения включают добровольное или принудительное исключение из реестра, ликвидацию, трансграничное слияние или перемещение места нахождения за пределы Республики; банкротством и ликвидацией занимается Департамент несостоятельности, где для принудительного банкротства требуется долг свыше 854 €, а для добровольного — сумма свыше 8 600 €. Официальный получатель созывает собрание кредиторов в течение 14 дней, а должник обязан предоставить попечителю сведения о долгах в течение семи дней, или трёх дней, если заявление подал сам должник; компаниям с годовым оборотом свыше 500 000 € или выкупной стоимостью свыше 2 млн € рекомендуется нанять профессиональных консультантов, а услуга аудиторской фирмы — единственная обязательная профессиональная услуга. Актуальные процедуры авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-operating-permits": {
  "el": {
   "q": "Ποιες επιχειρηματικές δραστηριότητες χρειάζονται άδειες λειτουργίας στην Κύπρο και πού τις βρίσκω;",
   "a": "Πολλές ρυθμιζόμενες δραστηριότητες απαιτούν εγγραφές, άδειες, αδειοδοτήσεις και εγκρίσεις πριν ξεκινήσετε, και μπορείτε να αναζητήσετε όσες ισχύουν μέσω του Ενιαίου Κέντρου Εξυπηρέτησης (PSC) Κύπρου στην πύλη businessincyprus.gov.cy, υπό το Υπουργείο Ενέργειας, Εμπορίου και Βιομηχανίας. Οι τομείς που απαιτούν άδειες περιλαμβάνουν Γεωργία και Κτηνιατρικές Υπηρεσίες, Κατασκευές και Μηχανική, Εκπαίδευση, Πυροβόλα Όπλα και Εκρηκτικά, Υγεία, Πρόνοια και Ομορφιά, Μέσα Μαζικής Επικοινωνίας, Μετρολογία, Επαγγελματικές Υπηρεσίες, Υπηρεσίες Ραδιοεπικοινωνιών, Τουρισμό και Ψυχαγωγία, Μεταφορές και Εφοδιαστική, Χονδρικό και Λιανικό Εμπόριο και Διασυνοριακή Παροχή Υπηρεσιών. Η σελίδα απαριθμεί αυτές τις κατηγορίες και σας κατευθύνει στην αρμόδια αρχή, αντί να περιγράφει κάθε διαδικασία ή τέλος. Για τις συγκεκριμένες άδειες, αρχές και τυχόν τέλη, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Ce activități comerciale necesită autorizații sau licențe de funcționare în Cipru și unde le găsesc?",
   "a": "Multe activități reglementate necesită înregistrări, licențe, autorizații și aprobări înainte de a putea funcționa, iar pe cele aplicabile le puteți căuta prin Punctul Unic de Contact (PSC) Cyprus de pe portalul businessincyprus.gov.cy, aflat sub Ministerul Energiei, Comerțului și Industriei. Sectoarele care necesită autorizații includ Agricultură și Servicii Veterinare, Construcții și Inginerie, Educație, Arme de foc și Explozivi, Sănătate, Bunăstare și Înfrumusețare, Mass-media, Metrologie, Servicii Profesionale, Servicii de Radiocomunicații, Turism și Agrement, Transport și Logistică, Comerț cu ridicata și cu amănuntul și Prestarea transfrontalieră de servicii. Pagina enumeră aceste categorii și vă îndrumă către autoritatea competentă, fără a detalia fiecare procedură sau taxă. Pentru autorizațiile concrete, autorități și eventuale taxe, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "أي الأنشطة التجارية تحتاج إلى تصاريح أو تراخيص تشغيل في قبرص، وأين أجدها؟",
   "a": "تتطلب أنشطة منظَّمة كثيرة تسجيلات وتراخيص وتصاريح وموافقات قبل أن تتمكن من العمل، ويمكنك البحث عن المنطبق منها عبر نقطة الاتصال الواحدة (PSC) قبرص على بوابة businessincyprus.gov.cy التابعة لوزارة الطاقة والتجارة والصناعة. وتشمل القطاعات التي تتطلب تصاريح الزراعة والخدمات البيطرية، والإنشاءات والهندسة، والتعليم، والأسلحة النارية والمتفجرات، والصحة والرعاية والتجميل، ووسائل الإعلام الجماهيرية، والمعايرة والقياس، والخدمات المهنية، وخدمات الاتصالات الراديوية، والسياحة والترفيه، والنقل والخدمات اللوجستية، والتجارة بالجملة والتجزئة، وتقديم الخدمات عبر الحدود. وتسرد الصفحة هذه الفئات وتوجّهك إلى الجهة المختصة بدلًا من تفصيل كل إجراء أو رسم. وللاطلاع على التصاريح والجهات والرسوم المحددة تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Welche Geschäftstätigkeiten brauchen auf Zypern Betriebsgenehmigungen oder Lizenzen, und wo finde ich sie?",
   "a": "Viele reglementierte Tätigkeiten erfordern vor dem Betrieb Registrierungen, Lizenzen, Genehmigungen und Zulassungen; die zutreffenden können Sie über die Einheitliche Anlaufstelle (PSC) Zypern auf dem Portal businessincyprus.gov.cy suchen, das dem Ministerium für Energie, Handel und Industrie untersteht. Zu den genehmigungspflichtigen Sektoren zählen Landwirtschaft und Veterinärwesen, Bau und Ingenieurwesen, Bildung, Schusswaffen und Sprengstoffe, Gesundheit, Wohlfahrt und Schönheit, Massenmedien, Metrologie, freiberufliche Dienstleistungen, Funkdienste, Tourismus und Freizeit, Verkehr und Logistik, Groß- und Einzelhandel sowie grenzüberschreitende Dienstleistungserbringung. Die Seite listet diese Kategorien auf und verweist auf die zuständige Behörde, statt jedes Verfahren oder jede Gebühr zu beschreiben. Für die konkreten Genehmigungen, Behörden und etwaige Gebühren ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Jakie rodzaje działalności wymagają zezwoleń lub licencji na Cyprze i gdzie je znaleźć?",
   "a": "Wiele regulowanych rodzajów działalności wymaga rejestracji, licencji, zezwoleń i autoryzacji przed rozpoczęciem, a odpowiednie można wyszukać przez Punkt Kontaktowy (PSC) Cypr na portalu businessincyprus.gov.cy, podlegającym Ministerstwu Energii, Handlu i Przemysłu. Sektory wymagające zezwoleń to m.in. rolnictwo i usługi weterynaryjne, budownictwo i inżynieria, edukacja, broń palna i materiały wybuchowe, zdrowie, opieka społeczna i uroda, media masowe, metrologia, usługi profesjonalne, usługi radiokomunikacyjne, turystyka i rekreacja, transport i logistyka, handel hurtowy i detaliczny oraz transgraniczne świadczenie usług. Strona wymienia te kategorie i kieruje do właściwego organu, zamiast opisywać każdą procedurę czy opłatę. Konkretne zezwolenia, organy i ewentualne opłaty opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Какие виды деятельности требуют разрешений или лицензий на Кипре и где их найти?",
   "a": "Многие регулируемые виды деятельности требуют регистраций, лицензий, разрешений и авторизаций до начала работы, а подходящие можно найти через Единый контактный пункт (PSC) Кипра на портале businessincyprus.gov.cy, подчинённом Министерству энергетики, торговли и промышленности. К секторам, требующим разрешений, относятся сельское хозяйство и ветеринарные услуги, строительство и инженерия, образование, огнестрельное оружие и взрывчатые вещества, здравоохранение, социальное обеспечение и красота, средства массовой информации, метрология, профессиональные услуги, услуги радиосвязи, туризм и досуг, транспорт и логистика, оптовая и розничная торговля и трансграничное оказание услуг. Страница перечисляет эти категории и направляет к компетентному органу, не описывая каждую процедуру или сбор. Конкретные разрешения, органы и возможные сборы авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-recognition-qualifications": {
  "el": {
   "q": "Πώς αναγνωρίζονται τα επαγγελματικά προσόντα στην Κύπρο και στην ΕΕ;",
   "a": "Αν θέλετε να ασκήσετε ρυθμιζόμενο επάγγελμα, υποβάλλετε αίτηση για αναγνώριση του επαγγελματικού σας προσόντος στη χώρα της ΕΕ όπου σκοπεύετε να εργαστείτε και πρέπει πρώτα να ελέγξετε τη βάση δεδομένων ρυθμιζόμενων επαγγελμάτων στο ec.europa.eu/growth/tools-databases/regprof για να δείτε αν το επάγγελμά σας ρυθμίζεται εκεί. Ένα επάγγελμα είναι ρυθμιζόμενο αν για την πρόσβαση σε αυτό πρέπει να κατέχετε συγκεκριμένο πτυχίο, να δώσετε ειδικές εξετάσεις και/ή να εγγραφείτε σε επαγγελματικό φορέα. Επτά τομεακά επαγγέλματα επωφελούνται από αυτόματη αναγνώριση: νοσηλευτές, μαίες, ιατροί, οδοντίατροι, φαρμακοποιοί, αρχιτέκτονες και κτηνίατροι. Το γενικό πλαίσιο είναι η Οδηγία 2005/36/ΕΚ, με ειδική νομοθεσία για ναυτικούς, ελεγκτές εναέριας κυκλοφορίας, δικηγόρους και εμπορικούς αντιπροσώπους, ενώ το Ενιαίο Κέντρο Εξυπηρέτησης (PSC) Κύπρου είναι διαθέσιμο για γενική επικοινωνία. Για την αρμόδια αρχή του επαγγέλματός σας, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Cum sunt recunoscute calificările profesionale în Cipru și în UE?",
   "a": "Dacă doriți să exercitați o profesie reglementată, solicitați recunoașterea calificării profesionale în țara UE unde intenționați să lucrați și ar trebui să consultați mai întâi baza de date a profesiilor reglementate de la ec.europa.eu/growth/tools-databases/regprof pentru a vedea dacă profesia dumneavoastră este reglementată acolo. O profesie este reglementată dacă pentru a o exercita trebuie să dețineți o diplomă specifică, să susțineți examene speciale și/sau să vă înregistrați la un organism profesional. Șapte profesii sectoriale beneficiază de recunoaștere automată: asistenții medicali, moașele, medicii, medicii dentiști, farmaciștii, arhitecții și medicii veterinari. Cadrul general este Directiva 2005/36/CE, cu legislație specifică pentru marinari, controlori de trafic aerian, avocați și agenți comerciali, iar Punctul Unic de Contact (PSC) Cyprus este disponibil pentru contact general. Pentru autoritatea competentă în profesia dumneavoastră, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "كيف يُعترف بالمؤهلات المهنية في قبرص والاتحاد الأوروبي؟",
   "a": "إذا أردت ممارسة مهنة منظَّمة، فتتقدّم بطلب للاعتراف بمؤهلك المهني في الدولة الأوروبية التي تنوي العمل فيها، وينبغي أن تتحقق أولًا من قاعدة بيانات المهن المنظَّمة على ec.europa.eu/growth/tools-databases/regprof لمعرفة ما إذا كانت مهنتك منظَّمة هناك. تكون المهنة منظَّمة إذا وجب أن تحمل شهادة محددة أو تجتاز امتحانات خاصة و/أو تسجّل لدى هيئة مهنية للوصول إليها. وتستفيد سبع مهن قطاعية من الاعتراف التلقائي: الممرضون والقابلات والأطباء وأطباء الأسنان والصيادلة والمهندسون المعماريون والأطباء البيطريون. والإطار العام هو التوجيه 2005/36/EC، مع تشريعات خاصة بالبحارة ومراقبي الملاحة الجوية والمحامين والوكلاء التجاريين، وتتوفر نقطة الاتصال الواحدة (PSC) قبرص للتواصل العام. وللاطلاع على الجهة المختصة بمهنتك تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Wie werden Berufsqualifikationen auf Zypern und in der EU anerkannt?",
   "a": "Wenn Sie einen reglementierten Beruf ausüben möchten, beantragen Sie die Anerkennung Ihrer Berufsqualifikation in dem EU-Land, in dem Sie arbeiten wollen; prüfen Sie zunächst in der Datenbank der reglementierten Berufe unter ec.europa.eu/growth/tools-databases/regprof, ob Ihr Beruf dort reglementiert ist. Ein Beruf ist reglementiert, wenn für den Zugang ein bestimmter Abschluss, besondere Prüfungen und/oder die Eintragung bei einer Berufsorganisation erforderlich sind. Sieben sektorale Berufe profitieren von der automatischen Anerkennung: Krankenpfleger, Hebammen, Ärzte, Zahnärzte, Apotheker, Architekten und Tierärzte. Der allgemeine Rahmen ist die Richtlinie 2005/36/EG, mit besonderen Rechtsvorschriften für Seeleute, Fluglotsen, Rechtsanwälte und Handelsvertreter; die Einheitliche Anlaufstelle (PSC) Zypern steht für allgemeine Kontakte zur Verfügung. Die zuständige Behörde für Ihren Beruf entnehmen Sie der offiziellen Seite businessincyprus.gov.cy, die maßgeblich ist."
  },
  "pl": {
   "q": "Jak uznawane są kwalifikacje zawodowe na Cyprze i w UE?",
   "a": "Jeśli chcesz wykonywać zawód regulowany, składasz wniosek o uznanie kwalifikacji zawodowych w kraju UE, w którym zamierzasz pracować, a najpierw powinieneś sprawdzić bazę danych zawodów regulowanych na ec.europa.eu/growth/tools-databases/regprof, czy Twój zawód jest tam regulowany. Zawód jest regulowany, jeśli dostęp do niego wymaga określonego dyplomu, specjalnych egzaminów i/lub wpisu do organizacji zawodowej. Siedem zawodów sektorowych korzysta z automatycznego uznawania: pielęgniarki, położne, lekarze, lekarze dentyści, farmaceuci, architekci i lekarze weterynarii. Ogólne ramy wyznacza dyrektywa 2005/36/WE, ze szczególnymi przepisami dla marynarzy, kontrolerów ruchu lotniczego, prawników i agentów handlowych, a Punkt Kontaktowy (PSC) Cypr jest dostępny do ogólnego kontaktu. Właściwy organ dla Twojego zawodu wskazuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Как признаются профессиональные квалификации на Кипре и в ЕС?",
   "a": "Если вы хотите заниматься регулируемой профессией, вы подаёте заявление о признании своей профессиональной квалификации в стране ЕС, где намерены работать, и сначала следует проверить базу данных регулируемых профессий на ec.europa.eu/growth/tools-databases/regprof, регулируется ли ваша профессия там. Профессия считается регулируемой, если для доступа к ней нужно иметь определённый диплом, сдать специальные экзамены и/или зарегистрироваться в профессиональной организации. Семь секторальных профессий пользуются автоматическим признанием: медсёстры, акушерки, врачи, стоматологи, фармацевты, архитекторы и ветеринарные врачи. Общая рамка — Директива 2005/36/EC, со специальным законодательством для моряков, авиадиспетчеров, юристов и коммерческих агентов, а Единый контактный пункт (PSC) Кипра доступен для общих обращений. Компетентный орган для вашей профессии авторитетно указан на официальной странице businessincyprus.gov.cy."
  }
 },
 "biz-european-professional-card": {
  "el": {
   "q": "Τι είναι η Ευρωπαϊκή Επαγγελματική Κάρτα (EPC) και πώς κάνω αίτηση στην Κύπρο;",
   "a": "Η Ευρωπαϊκή Επαγγελματική Κάρτα (EPC) είναι μια ηλεκτρονική διαδικασία για την αναγνώριση των προσόντων σας σε άλλη χώρα της ΕΕ, είτε για προσωρινή παροχή υπηρεσιών είτε για μόνιμη εγκατάσταση. Για να κάνετε αίτηση συνδέεστε με EU Login μέσω της Υπηρεσίας Ταυτοποίησης της Ευρωπαϊκής Επιτροπής (ECAS), συμπληρώνετε το προφίλ EPC, δημιουργείτε αίτηση, σαρώνετε και ανεβάζετε τα σχετικά έγγραφα ως χωριστά αρχεία και τα υποβάλλετε στην αρχή της χώρας καταγωγής σας, χρησιμοποιώντας τον Προσομοιωτή για να ελέγξετε τα απαιτούμενα έγγραφα και τέλη. Τόσο οι αρχές της χώρας καταγωγής όσο και της χώρας υποδοχής μπορεί να σας χρεώσουν τέλη για την εξέταση του φακέλου σας, αν και δεν αναφέρονται συγκεκριμένα ποσά. Η EPC ισχύει επ' αόριστον αν εγκαθίστασθε μακροπρόθεσμα (εγκατάσταση), ενώ για προσωρινές υπηρεσίες διαρκεί 18 μήνες στις περισσότερες περιπτώσεις ή 12 μήνες για επαγγέλματα με επίδραση στη δημόσια υγεία ή ασφάλεια. Η EPC ισχύει επί του παρόντος για νοσηλευτή γενικής φροντίδας, φαρμακοποιό, φυσικοθεραπευτή, οδηγό βουνού (δεν εφαρμόζεται στην Κυπριακή Δημοκρατία) και μεσίτη ακινήτων. Για τρέχουσες λεπτομέρειες, κύρος έχει η επίσημη σελίδα businessincyprus.gov.cy."
  },
  "ro": {
   "q": "Ce este Cardul Profesional European (EPC) și cum îl solicit în Cipru?",
   "a": "Cardul Profesional European (EPC) este o procedură electronică pentru recunoașterea calificărilor dumneavoastră într-o altă țară UE, fie pentru prestare temporară de servicii, fie pentru stabilire permanentă. Pentru a-l solicita, vă autentificați cu EU Login prin Serviciul de Autentificare al Comisiei Europene (ECAS), completați profilul EPC, creați o cerere, scanați și încărcați documentele relevante ca fișiere separate și le trimiteți autorității din țara dumneavoastră de origine, folosind Simulatorul pentru a verifica documentele și taxele necesare. Atât autoritățile țării de origine, cât și cele ale țării gazdă vă pot percepe taxe pentru examinarea dosarului, deși nu sunt precizate sume concrete. EPC este valabil pe termen nelimitat dacă vă stabiliți pe termen lung (stabilire), iar pentru servicii temporare durează 18 luni în majoritatea cazurilor sau 12 luni pentru profesiile cu impact asupra sănătății sau siguranței publice. EPC se aplică în prezent pentru asistent medical responsabil de îngrijiri generale, farmacist, fizioterapeut, ghid montan (nu se aplică în Republica Cipru) și agent imobiliar. Pentru detalii actuale, pagina oficială businessincyprus.gov.cy este autoritatea de referință."
  },
  "ar": {
   "q": "ما هي البطاقة المهنية الأوروبية (EPC) وكيف أتقدم بطلبها في قبرص؟",
   "a": "البطاقة المهنية الأوروبية (EPC) إجراء إلكتروني للاعتراف بمؤهلاتك في دولة أوروبية أخرى، سواء لتقديم خدمة مؤقتة أو للاستقرار الدائم. للتقديم تسجّل الدخول عبر EU Login من خلال خدمة المصادقة التابعة للمفوضية الأوروبية (ECAS)، وتكمل ملفك في EPC، وتنشئ طلبًا، وتمسح المستندات ذات الصلة وترفعها كملفات منفصلة، ثم تقدّمها إلى سلطة بلدك الأم، مستعينًا بأداة المحاكاة (Simulator) للتحقق من المستندات والرسوم المطلوبة. قد تفرض سلطات بلدك الأم والبلد المضيف رسومًا لفحص ملفك، وإن لم تُذكر مبالغ محددة. وتبقى EPC سارية إلى أجل غير مسمّى إذا كنت تستقر على المدى الطويل (الاستقرار)، أما للخدمات المؤقتة فتدوم 18 شهرًا في معظم الحالات أو 12 شهرًا للمهن ذات الأثر على الصحة أو السلامة العامة. وتنطبق EPC حاليًا على الممرض المسؤول عن الرعاية العامة والصيدلي ومعالج العلاج الطبيعي ودليل الجبال (لا ينطبق في جمهورية قبرص) والوسيط العقاري. وللاطلاع على التفاصيل الحالية تُعدّ صفحة businessincyprus.gov.cy الرسمية المرجع المعتمد."
  },
  "de": {
   "q": "Was ist der Europäische Berufsausweis (EPC), und wie beantrage ich ihn auf Zypern?",
   "a": "Der Europäische Berufsausweis (EPC) ist ein elektronisches Verfahren zur Anerkennung Ihrer Qualifikationen in einem anderen EU-Land, entweder für vorübergehende Dienstleistungen oder für die dauerhafte Niederlassung. Zur Antragstellung melden Sie sich über den Authentifizierungsdienst der Europäischen Kommission (ECAS) mit EU Login an, vervollständigen Ihr EPC-Profil, erstellen einen Antrag, scannen die relevanten Unterlagen, laden sie als einzelne Dateien hoch und reichen sie bei der Behörde Ihres Herkunftslandes ein; mit dem Simulator prüfen Sie, welche Unterlagen und Gebühren erforderlich sind. Sowohl die Behörden des Herkunfts- als auch des Aufnahmelandes können Gebühren für die Prüfung Ihres Antrags erheben, konkrete Beträge werden nicht genannt. Ein EPC gilt unbefristet, wenn Sie sich langfristig niederlassen (Niederlassung); für vorübergehende Dienstleistungen gilt er in den meisten Fällen 18 Monate, bei Berufen mit Auswirkungen auf die öffentliche Gesundheit oder Sicherheit 12 Monate. Der EPC gilt derzeit für Krankenpfleger für allgemeine Pflege, Apotheker, Physiotherapeuten, Bergführer (in der Republik Zypern nicht anwendbar) und Immobilienmakler. Für aktuelle Einzelheiten ist die offizielle Seite businessincyprus.gov.cy maßgeblich."
  },
  "pl": {
   "q": "Czym jest Europejska Legitymacja Zawodowa (EPC) i jak ją uzyskać na Cyprze?",
   "a": "Europejska Legitymacja Zawodowa (EPC) to elektroniczna procedura uznania kwalifikacji w innym kraju UE, zarówno do czasowego świadczenia usług, jak i do stałego osiedlenia. Aby złożyć wniosek, logujesz się przez EU Login za pośrednictwem Usługi Uwierzytelniania Komisji Europejskiej (ECAS), uzupełniasz profil EPC, tworzysz wniosek, skanujesz i przesyłasz odpowiednie dokumenty jako osobne pliki i składasz je do organu w kraju pochodzenia, korzystając z Symulatora do sprawdzenia wymaganych dokumentów i opłat. Zarówno organy kraju pochodzenia, jak i kraju przyjmującego mogą pobierać opłaty za rozpatrzenie wniosku, choć konkretne kwoty nie są podane. EPC jest ważna bezterminowo, jeśli osiedlasz się na stałe (osiedlenie), natomiast przy usługach czasowych trwa w większości przypadków 18 miesięcy, a dla zawodów mających wpływ na zdrowie lub bezpieczeństwo publiczne 12 miesięcy. EPC obowiązuje obecnie dla pielęgniarki odpowiedzialnej za opiekę ogólną, farmaceuty, fizjoterapeuty, przewodnika górskiego (nie dotyczy Republiki Cypryjskiej) i pośrednika w obrocie nieruchomościami. Aktualne szczegóły opisuje autorytatywnie oficjalna strona businessincyprus.gov.cy."
  },
  "ru": {
   "q": "Что такое Европейская профессиональная карта (EPC) и как её получить на Кипре?",
   "a": "Европейская профессиональная карта (EPC) — электронная процедура признания ваших квалификаций в другой стране ЕС, как для временного оказания услуг, так и для постоянного обустройства. Чтобы подать заявку, вы входите через EU Login с помощью Службы аутентификации Европейской комиссии (ECAS), заполняете профиль EPC, создаёте заявку, сканируете и загружаете нужные документы отдельными файлами и подаёте их в орган вашей страны происхождения, используя Симулятор для проверки необходимых документов и сборов. И органы страны происхождения, и органы принимающей страны могут взимать сборы за рассмотрение вашего дела, хотя конкретные суммы не указаны. EPC действует бессрочно, если вы обосновываетесь надолго (обустройство), а для временных услуг — в большинстве случаев 18 месяцев или 12 месяцев для профессий, влияющих на общественное здоровье или безопасность. В настоящее время EPC применяется для медсестры общего профиля, фармацевта, физиотерапевта, горного гида (не применяется в Республике Кипр) и агента по недвижимости. Актуальные подробности авторитетно изложены на официальной странице businessincyprus.gov.cy."
  }
 },
 "lic-real-estate-agent": {
  "el": {
   "q": "Ποια άδεια χρειάζομαι για να εργαστώ ως μεσίτης ακινήτων στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Συμβούλιο Εγγραφής Μεσιτών Ακινήτων, με έδρα στον Στρόβολο, Λευκωσία. Οι απαιτήσεις περιλαμβάνουν ιθαγένεια της ΕΕ (ή ιδιότητα συζύγου ή τέκνου πολίτη της ΕΕ με συνήθη διαμονή στην Κύπρο), καμία πτώχευση ή νομική ανικανότητα, καμία καταδίκη για αναξιοπρεπή ή ανήθικη πράξη, σχετικό δίπλωμα ή πτυχίο τουλάχιστον τριετούς φοίτησης συν 12 μήνες επαγγελματικής πείρας ως βοηθός μεσίτη (ή σχετικό μεταπτυχιακό), και επιτυχία σε γραπτή εξέταση στη νομοθεσία ακινήτων και πολεοδομίας. Τα τέλη είναι 100 ευρώ για την αίτηση εγγραφής, 350 ευρώ για το πιστοποιητικό εγγραφής, 250 ευρώ για την ετήσια άδεια και 20 ευρώ για την ταυτότητα μεσίτη ακινήτων, με ανανέωση 250 ευρώ συν 20 ευρώ. Ο αιτών ενημερώνεται για την απόφαση εγγραφής εντός τριών μηνών από την ημερομηνία που το έντυπο αίτησης και τα δικαιολογητικά υποβλήθηκαν δεόντως. Οι αιτήσεις υποβάλλονται ηλεκτρονικά μέσω της ιστοσελίδας του Συμβουλίου ή με το χέρι ή ταχυδρομικά."
  },
  "ro": {
   "q": "Ce licență îmi trebuie pentru a lucra ca agent imobiliar în Cipru?",
   "a": "Autoritatea competentă este Consiliul de Înregistrare a Agenților Imobiliari, cu sediul în Strovolos, Nicosia. Cerințele includ cetățenia UE (sau calitatea de soț/soție ori copil al unui cetățean UE cu reședința obișnuită în Cipru), lipsa falimentului sau a unei incapacități legale, lipsa unei condamnări pentru necinste sau imoralitate, o diplomă sau o licență relevantă dintr-un curs de cel puțin trei ani plus 12 luni de experiență profesională ca agent adjunct (sau un master relevant) și promovarea unui examen scris la legislația imobiliară și de urbanism. Taxele sunt de 100 euro pentru cererea de înregistrare, 350 euro pentru certificatul de înregistrare, 250 euro pentru licența anuală și 20 euro pentru legitimația de agent imobiliar, reînnoirea costând 250 euro plus 20 euro. Solicitantul este informat despre decizia de înregistrare în termen de trei luni de la data la care formularul de cerere și documentele justificative au fost depuse corespunzător. Cererile se depun electronic prin site-ul Consiliului sau personal ori prin poștă."
  },
  "ar": {
   "q": "ما الترخيص الذي أحتاجه للعمل وسيطًا عقاريًا في قبرص؟",
   "a": "الجهة المختصة هي مجلس تسجيل الوسطاء العقاريين، ومقرّه في ستروفولوس بنيقوسيا. تشمل الشروط الجنسية الأوروبية (أو أن يكون زوجًا أو ابنًا لمواطن أوروبي مقيم إقامة معتادة في قبرص)، وعدم الإفلاس أو العجز القانوني، وعدم الإدانة بجريمة مخلّة بالأمانة أو الأخلاق، ودبلومًا أو شهادة ذات صلة من دورة لا تقل عن ثلاث سنوات مع 12 شهرًا من الخبرة المهنية بصفة وسيط مساعد (أو ماجستيرًا ذا صلة)، واجتياز امتحان كتابي في تشريعات العقارات والتخطيط العمراني. الرسوم 100 يورو لطلب التسجيل، و350 يورو لشهادة التسجيل، و250 يورو للترخيص السنوي، و20 يورو لبطاقة هوية الوسيط العقاري، ويبلغ التجديد 250 يورو زائد 20 يورو. يُبلَّغ المتقدّم بقرار التسجيل خلال ثلاثة أشهر من تاريخ استيفاء نموذج الطلب والمستندات الداعمة. تُقدَّم الطلبات إلكترونيًا عبر موقع المجلس أو باليد أو بالبريد."
  },
  "de": {
   "q": "Welche Lizenz brauche ich, um auf Zypern als Immobilienmakler zu arbeiten?",
   "a": "Zuständig ist der Registrierungsrat für Immobilienmakler mit Sitz in Strovolos, Nikosia. Voraussetzungen sind die EU-Staatsangehörigkeit (oder Ehegatte bzw. Kind eines EU-Bürgers mit gewöhnlichem Aufenthalt auf Zypern), keine Insolvenz oder rechtliche Handlungsunfähigkeit, keine Verurteilung wegen Unredlichkeit oder Sittenwidrigkeit, ein einschlägiges Diplom oder ein Abschluss aus einem mindestens dreijährigen Studiengang plus 12 Monate Berufserfahrung als stellvertretender Makler (oder ein einschlägiger Master) sowie das Bestehen einer schriftlichen Prüfung in Immobilien- und Raumplanungsrecht. Die Gebühren betragen 100 Euro für den Registrierungsantrag, 350 Euro für die Registrierungsbescheinigung, 250 Euro für die Jahreslizenz und 20 Euro für den Maklerausweis, die Verlängerung kostet 250 Euro plus 20 Euro. Der Antragsteller wird innerhalb von drei Monaten ab dem Zeitpunkt, zu dem Antragsformular und Nachweise ordnungsgemäß eingereicht wurden, über die Entscheidung informiert. Anträge werden elektronisch über die Website des Rates oder persönlich bzw. per Post gestellt."
  },
  "pl": {
   "q": "Jakiej licencji potrzebuję, aby pracować jako pośrednik w obrocie nieruchomościami na Cyprze?",
   "a": "Właściwym organem jest Rada Rejestracji Pośredników w Obrocie Nieruchomościami z siedzibą w Strovolos, Nikozja. Wymagania obejmują obywatelstwo UE (lub bycie małżonkiem albo dzieckiem obywatela UE z miejscem stałego pobytu na Cyprze), brak upadłości lub ograniczenia zdolności prawnej, brak skazania za nieuczciwość lub niemoralność, odpowiedni dyplom lub stopień z kursu trwającego co najmniej trzy lata plus 12 miesięcy doświadczenia zawodowego jako zastępca pośrednika (lub odpowiedni dyplom magisterski) oraz zdanie pisemnego egzaminu z prawa nieruchomości i planowania przestrzennego. Opłaty wynoszą 100 euro za wniosek o rejestrację, 350 euro za świadectwo rejestracji, 250 euro za roczną licencję i 20 euro za legitymację pośrednika, a odnowienie kosztuje 250 euro plus 20 euro. Wnioskodawca jest informowany o decyzji o rejestracji w ciągu trzech miesięcy od dnia należytego złożenia formularza wniosku i dokumentów. Wnioski składa się elektronicznie przez stronę Rady lub osobiście albo pocztą."
  },
  "ru": {
   "q": "Какая лицензия нужна, чтобы работать агентом по недвижимости на Кипре?",
   "a": "Компетентный орган — Совет по регистрации агентов по недвижимости, расположенный в Строволосе, Никосия. Требования включают гражданство ЕС (или статус супруга или ребёнка гражданина ЕС с постоянным местожительством на Кипре), отсутствие банкротства или правовой недееспособности, отсутствие судимости за нечестность или аморальность, соответствующий диплом или степень по программе не менее трёх лет плюс 12 месяцев профессионального опыта в качестве помощника агента (или соответствующая степень магистра) и успешную сдачу письменного экзамена по законодательству о недвижимости и градостроительству. Сборы составляют 100 евро за заявление на регистрацию, 350 евро за свидетельство о регистрации, 250 евро за ежегодную лицензию и 20 евро за удостоверение агента по недвижимости, продление — 250 евро плюс 20 евро. Заявитель информируется о решении о регистрации в течение трёх месяцев с даты надлежащей подачи формы заявления и подтверждающих документов. Заявления подаются в электронном виде через сайт Совета либо лично или по почте."
  }
 },
 "lic-accountant-auditor": {
  "el": {
   "q": "Πώς γίνομαι αδειοδοτημένος λογιστής ή ελεγκτής στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Σώμα Ορκωτών Λογιστών Κύπρου (ICPAC). Οι αιτούντες πρέπει να είναι μέλη αναγνωρισμένου Σώματος Επαγγελματιών Λογιστών, να έχουν ολοκληρώσει τρία έτη πρακτικής εμπειρίας ως εργαζόμενοι ή υπεργολάβοι, από τα οποία τουλάχιστον δύο μετά την ένταξή τους ως μέλη, και να έχουν περάσει τις εξετάσεις LW Cyprus Corporate and Business Law και TX Cyprus Taxation· για τους νόμιμους ελεγκτές, τουλάχιστον ένα από τα δύο έτη πρακτικής εμπειρίας πρέπει να αφορά ελεγκτικό έργο. Τα τέλη περιλαμβάνουν εγγραφή μέλους 60 ευρώ, ετήσια συνδρομή 200 ευρώ, πιστοποιητικό άσκησης επαγγέλματος 300 ευρώ, ετήσιο τέλος νόμιμου ελεγκτή 100 ευρώ, πιστοποιητικό υπηρεσιών διοικητικού χαρακτήρα 150 ευρώ και αρχικό τέλος επαγγελματία αφερεγγυότητας 350 ευρώ. Ο αιτών ενημερώνεται για την απόφαση εγγραφής ή αδειοδότησης εντός δύο μηνών από την ημερομηνία που η αίτηση υποβλήθηκε δεόντως, και η άδεια ισχύει έως τις 31 Δεκεμβρίου του έτους έκδοσης. Οι αιτήσεις υποβάλλονται μέσω του PSC Κύπρου, επικοινωνώντας απευθείας με το ICPAC ή ηλεκτρονικά μέσω της ιστοσελίδας του ICPAC."
  },
  "ro": {
   "q": "Cum devin contabil sau auditor autorizat în Cipru?",
   "a": "Autoritatea competentă este Institutul Contabililor Publici Autorizați din Cipru (ICPAC). Solicitanții trebuie să fie membri ai unui organism profesional de contabili recunoscut, să fi finalizat trei ani de experiență practică ca angajat sau subcontractant, dintre care cel puțin doi după admiterea ca membru, și să fi promovat examenele LW Cyprus Corporate and Business Law și TX Cyprus Taxation; pentru auditorii statutari, cel puțin unul din cei doi ani de experiență practică trebuie să fie în activitate de audit. Taxele includ înregistrarea ca membru 60 euro, cotizația anuală 200 euro, certificatul de practică 300 euro, taxa anuală de auditor statutar 100 euro, certificatul de servicii administrative 150 euro și taxa inițială de practician în insolvență 350 euro. Solicitantul este informat despre decizia de înregistrare sau autorizare în termen de două luni de la data la care cererea a fost depusă corespunzător, iar licența este valabilă până la 31 decembrie a anului emiterii. Cererile se depun prin PSC Cyprus, contactând direct ICPAC sau electronic prin site-ul ICPAC."
  },
  "ar": {
   "q": "كيف أصبح محاسبًا أو مدقق حسابات مرخَّصًا في قبرص؟",
   "a": "الجهة المختصة هي هيئة المحاسبين القانونيين القبرصيين (ICPAC). يجب أن يكون المتقدّم عضوًا في هيئة محاسبين مهنيين معترف بها، وأن يكون قد أتمّ ثلاث سنوات من الخبرة العملية بصفة موظف أو متعاقد من الباطن، منها سنتان على الأقل بعد قبوله عضوًا، وأن يكون قد اجتاز امتحاني LW Cyprus Corporate and Business Law وTX Cyprus Taxation؛ وبالنسبة لمدققي الحسابات القانونيين يجب أن تكون سنة واحدة على الأقل من سنتي الخبرة العملية في أعمال التدقيق. تشمل الرسوم تسجيل العضو 60 يورو، والاشتراك السنوي 200 يورو، وشهادة مزاولة المهنة 300 يورو، ورسم مدقق الحسابات القانوني السنوي 100 يورو، وشهادة الخدمات الإدارية 150 يورو، والرسم الأولي لممارس الإعسار 350 يورو. يُبلَّغ المتقدّم بقرار التسجيل أو الترخيص خلال شهرين من تاريخ تقديم الطلب على الوجه الصحيح، والترخيص صالح حتى 31 ديسمبر من سنة الإصدار. تُقدَّم الطلبات عبر PSC Cyprus أو بالتواصل المباشر مع ICPAC أو إلكترونيًا عبر موقع ICPAC."
  },
  "de": {
   "q": "Wie werde ich auf Zypern zugelassener Buchhalter oder Wirtschaftsprüfer?",
   "a": "Zuständig ist das Institut der Zyprischen Wirtschaftsprüfer (ICPAC). Antragsteller müssen Mitglied einer anerkannten Berufsorganisation von Buchhaltern sein, drei Jahre praktische Erfahrung als Angestellter oder Subunternehmer nachweisen, davon mindestens zwei Jahre nach der Aufnahme als Mitglied, und die Prüfungen LW Cyprus Corporate and Business Law sowie TX Cyprus Taxation bestanden haben; bei gesetzlichen Abschlussprüfern muss mindestens eines der beiden Jahre praktischer Erfahrung auf Prüfungstätigkeit entfallen. Die Gebühren umfassen die Mitgliedsregistrierung 60 Euro, den Jahresbeitrag 200 Euro, die Berufsausübungsbescheinigung 300 Euro, die jährliche Gebühr für gesetzliche Abschlussprüfer 100 Euro, die Bescheinigung für Verwaltungsdienstleistungen 150 Euro und die Erstgebühr für Insolvenzverwalter 350 Euro. Der Antragsteller wird innerhalb von zwei Monaten ab ordnungsgemäßer Antragstellung über die Registrierungs- oder Zulassungsentscheidung informiert; die Lizenz gilt bis zum 31. Dezember des Ausstellungsjahres. Anträge werden über PSC Cyprus, durch direkte Kontaktaufnahme mit dem ICPAC oder elektronisch über die ICPAC-Website gestellt."
  },
  "pl": {
   "q": "Jak zostać licencjonowanym księgowym lub biegłym rewidentem na Cyprze?",
   "a": "Właściwym organem jest Instytut Biegłych Rewidentów Cypru (ICPAC). Wnioskodawcy muszą być członkami uznanego organu zawodowego księgowych, mieć za sobą trzy lata praktyki jako pracownik lub podwykonawca, z czego co najmniej dwa lata po przyjęciu w poczet członków, oraz zdać egzaminy LW Cyprus Corporate and Business Law i TX Cyprus Taxation; w przypadku ustawowych biegłych rewidentów co najmniej jeden z dwóch lat praktyki musi dotyczyć pracy w audycie. Opłaty obejmują rejestrację członka 60 euro, roczną składkę 200 euro, świadectwo wykonywania zawodu 300 euro, roczną opłatę ustawowego biegłego rewidenta 100 euro, świadectwo usług administracyjnych 150 euro i początkową opłatę praktyka niewypłacalności 350 euro. Wnioskodawca jest informowany o decyzji o rejestracji lub autoryzacji w ciągu dwóch miesięcy od dnia należytego złożenia wniosku, a licencja jest ważna do 31 grudnia roku wydania. Wnioski składa się przez PSC Cyprus, kontaktując się bezpośrednio z ICPAC lub elektronicznie przez stronę ICPAC."
  },
  "ru": {
   "q": "Как стать лицензированным бухгалтером или аудитором на Кипре?",
   "a": "Компетентный орган — Институт сертифицированных публичных бухгалтеров Кипра (ICPAC). Заявитель должен быть членом признанной организации профессиональных бухгалтеров, иметь три года практического опыта работы в качестве сотрудника или субподрядчика, из которых не менее двух лет — после принятия в члены, и сдать экзамены LW Cyprus Corporate and Business Law и TX Cyprus Taxation; для обязательных аудиторов не менее одного из двух лет практического опыта должно приходиться на аудиторскую работу. Сборы включают регистрацию члена 60 евро, ежегодный взнос 200 евро, практикующее свидетельство 300 евро, ежегодный сбор обязательного аудитора 100 евро, свидетельство об административных услугах 150 евро и первоначальный сбор практикующего специалиста по несостоятельности 350 евро. Заявитель информируется о решении о регистрации или авторизации в течение двух месяцев с даты надлежащей подачи заявления, лицензия действует до 31 декабря года выдачи. Заявления подаются через PSC Cyprus, обращением непосредственно в ICPAC или в электронном виде через сайт ICPAC."
  }
 },
 "lic-tax-consultant": {
  "el": {
   "q": "Χρειάζομαι άδεια για να εργαστώ ως φοροτεχνικός σύμβουλος στην Κύπρο;",
   "a": "Σύμφωνα με την επίσημη σελίδα, η φορολογική συμβουλευτική δεν ρυθμίζεται στην Κυπριακή Δημοκρατία, επομένως δεν υπάρχει συγκεκριμένη άδεια, αρμόδια αρχή, τέλος ή διαδικασία αίτησης για το επάγγελμα. Η σελίδα σημειώνει ότι εγγεγραμμένα μέλη του ICPAC μπορούν να παρέχουν φορολογικές συμβουλευτικές υπηρεσίες στο πλαίσιο της λογιστικής τους πρακτικής. Αναφέρει επίσης ότι δεν παρέχονται πληροφορίες διαδικασίας μέσω του PSC Κύπρου, ούτε για την εγκατάσταση επιχείρησης ούτε για την περιστασιακή και προσωρινή διασυνοριακή παροχή υπηρεσιών. Η επίσημη σελίδα έχει κύρος για την επιβεβαίωση του μη ρυθμιζόμενου καθεστώτος του επαγγέλματος."
  },
  "ro": {
   "q": "Am nevoie de licență pentru a lucra ca consultant fiscal în Cipru?",
   "a": "Potrivit paginii oficiale, consultanța fiscală nu este reglementată în Republica Cipru, deci nu există o licență specifică, o autoritate competentă, o taxă sau o procedură de cerere pentru această profesie. Pagina menționează că membrii înregistrați ai ICPAC pot oferi servicii de consultanță fiscală în cadrul activității lor contabile. Precizează de asemenea că nu sunt furnizate informații despre proceduri prin PSC Cyprus, nici pentru stabilirea unei afaceri, nici pentru prestarea transfrontalieră ocazională și temporară de servicii. Pagina oficială este autoritatea de referință pentru confirmarea statutului nereglementat al profesiei."
  },
  "ar": {
   "q": "هل أحتاج إلى ترخيص للعمل مستشارًا ضريبيًا في قبرص؟",
   "a": "وفق الصفحة الرسمية، الاستشارات الضريبية غير منظَّمة في جمهورية قبرص، ولذلك لا يوجد ترخيص محدد أو جهة مختصة أو رسوم أو إجراء تقديم للمهنة. وتشير الصفحة إلى أن أعضاء ICPAC المسجّلين يمكنهم تقديم خدمات استشارية ضريبية ضمن ممارستهم المحاسبية. كما تذكر أنه لا تُقدَّم معلومات إجرائية عبر PSC Cyprus، لا لتأسيس عمل ولا للتقديم العابر للحدود العرضي والمؤقت للخدمات. والصفحة الرسمية هي المرجع المعتمد لتأكيد أن المهنة غير منظَّمة."
  },
  "de": {
   "q": "Brauche ich auf Zypern eine Lizenz als Steuerberater?",
   "a": "Laut der offiziellen Seite ist die Steuerberatung in der Republik Zypern nicht reglementiert; es gibt daher keine spezielle Lizenz, keine zuständige Behörde, keine Gebühr und kein Antragsverfahren für den Beruf. Die Seite weist darauf hin, dass eingetragene ICPAC-Mitglieder im Rahmen ihrer Buchhaltungspraxis steuerliche Beratungsleistungen erbringen können. Sie stellt zudem fest, dass über PSC Cyprus keine Verfahrensinformationen bereitgestellt werden, weder für die Niederlassung noch für die gelegentliche und vorübergehende grenzüberschreitende Dienstleistungserbringung. Die offizielle Seite ist maßgeblich, um den nicht reglementierten Status des Berufs zu bestätigen."
  },
  "pl": {
   "q": "Czy potrzebuję licencji, aby pracować jako doradca podatkowy na Cyprze?",
   "a": "Według oficjalnej strony doradztwo podatkowe nie jest regulowane w Republice Cypryjskiej, więc nie ma specjalnej licencji, właściwego organu, opłaty ani procedury wnioskowej dla tego zawodu. Strona zaznacza, że zarejestrowani członkowie ICPAC mogą świadczyć usługi doradztwa podatkowego w ramach swojej praktyki księgowej. Podaje też, że przez PSC Cyprus nie są udostępniane informacje o procedurach, ani w zakresie założenia działalności, ani okazjonalnego i czasowego transgranicznego świadczenia usług. Oficjalna strona jest autorytatywna w potwierdzeniu, że zawód nie jest regulowany."
  },
  "ru": {
   "q": "Нужна ли лицензия, чтобы работать налоговым консультантом на Кипре?",
   "a": "Согласно официальной странице, налоговое консультирование в Республике Кипр не регулируется, поэтому для этой профессии нет специальной лицензии, компетентного органа, сбора или процедуры подачи заявления. Страница отмечает, что зарегистрированные члены ICPAC могут оказывать услуги налогового консультирования в рамках своей бухгалтерской практики. Там также говорится, что через PSC Cyprus информация о процедурах не предоставляется — ни для создания бизнеса, ни для разового и временного трансграничного оказания услуг. Официальная страница авторитетна для подтверждения нерегулируемого статуса профессии."
  }
 },
 "lic-lawyer": {
  "el": {
   "q": "Τι χρειάζεται για να γίνω αδειοδοτημένος δικηγόρος στην Κύπρο;",
   "a": "Την εγγραφή στο Μητρώο Δικηγόρων χειρίζεται το Ανώτατο Δικαστήριο, την ετήσια άδεια ασκήσεως επαγγέλματος το Συμβούλιο του Παγκύπριου Δικηγορικού Συλλόγου και το αρχικό πιστοποιητικό έγκρισης το Νομικό Συμβούλιο. Οι απαιτήσεις περιλαμβάνουν ηλικία τουλάχιστον 21 ετών, καλό χαρακτήρα, ιθαγένεια της ΕΕ ή ιδιότητα συζύγου ή τέκνου πολίτη της ΕΕ, πτυχίο νομικής από αναγνωρισμένο πανεπιστήμιο, περίοδο πρακτικής άσκησης τουλάχιστον δώδεκα μηνών σε δικηγορικό γραφείο ή στη Νομική Υπηρεσία της Δημοκρατίας και επιτυχία σε εξέταση που ικανοποιεί το Νομικό Συμβούλιο. Τα τέλη περιλαμβάνουν 100,00 ευρώ για το Μητρώο Δικηγόρων, τέλη άσκησης 68 ευρώ (0 έως 10 έτη) ή 171 ευρώ (10+ έτη), εγγραφή στο Ταμείο Συντάξεων Δικηγόρων 50,00 ευρώ με ετήσια ανανέωση 480,00 ευρώ και συνδρομή στο μητρώο του Παγκύπριου Δικηγορικού Συλλόγου 100 ευρώ ετησίως. Η διαδρομή είναι να υποβάλετε την Επιστολή Έγκρισης του Νομικού Συμβουλίου στον Πρωτοκολλητή του Ανωτάτου Δικαστηρίου και στη συνέχεια να υποβάλετε αίτηση στο Συμβούλιο του Δικηγορικού Συλλόγου για την ετήσια άδεια ασκήσεως επαγγέλματος με Πιστοποιητικό Εγγραφής, ασφάλιση επαγγελματικής ευθύνης και εγγραφή στο ταμείο συντάξεων. Οι χρόνοι επεξεργασίας δεν αναφέρονται στη σελίδα."
  },
  "ro": {
   "q": "Ce îmi trebuie pentru a deveni avocat autorizat în Cipru?",
   "a": "Înscrierea în Registrul Avocaților este gestionată de Curtea Supremă, licența anuală de practică de Consiliul Baroului Asociației Baroului din Cipru, iar certificatul inițial de aprobare de Consiliul Juridic. Cerințele includ o vârstă de cel puțin 21 de ani, bună reputație, cetățenia UE sau calitatea de soț/soție ori copil al unui cetățean UE, o diplomă în drept de la o universitate recunoscută, un stagiu de cel puțin douăsprezece luni într-un cabinet de avocatură sau la Oficiul Procurorului General și promovarea unui examen care să satisfacă Consiliul Juridic. Taxele includ 100,00 euro pentru Registrul Avocaților, taxe de practică de 68 euro (0–10 ani) sau 171 euro (peste 10 ani), înscrierea în Fondul de Pensii al Avocaților 50,00 euro cu reînnoire anuală de 480,00 euro și cotizație de 100 euro anual pentru registrul Asociației Baroului din Cipru. Traseul este depunerea Scrisorii de Aprobare a Consiliului Juridic la Grefierul-șef al Curții Supreme, apoi solicitarea licenței anuale de practică de la Consiliul Baroului, cu Certificat de Înscriere, asigurare de răspundere profesională și înscriere la fondul de pensii. Termenele de procesare nu sunt precizate pe pagină."
  },
  "ar": {
   "q": "ما الذي أحتاجه لأصبح محاميًا مرخَّصًا في قبرص؟",
   "a": "يتولى القيد في سجل المحامين المحكمة العليا، ويتولى الترخيص السنوي لمزاولة المهنة مجلس نقابة المحامين القبرصية، وشهادة الموافقة الأولية المجلس القانوني. تشمل الشروط بلوغ 21 عامًا على الأقل وحسن السيرة والجنسية الأوروبية أو أن يكون زوجًا أو ابنًا لمواطن أوروبي، وشهادة في القانون من جامعة معترف بها، وفترة تدريب لا تقل عن اثني عشر شهرًا في مكتب محامٍ أو مكتب النائب العام، واجتياز امتحان يرضي المجلس القانوني. تشمل الرسوم 100.00 يورو لسجل المحامين، ورسوم مزاولة 68 يورو (0 إلى 10 سنوات) أو 171 يورو (أكثر من 10 سنوات)، وتسجيل صندوق معاشات المحامين 50.00 يورو مع تجديد سنوي 480.00 يورو، واشتراك سجل نقابة المحامين القبرصية 100 يورو سنويًا. المسار هو تقديم خطاب الموافقة من المجلس القانوني إلى كبير مسجّلي المحكمة العليا، ثم التقدّم إلى مجلس النقابة بطلب الترخيص السنوي لمزاولة المهنة مع شهادة القيد وتأمين المسؤولية المهنية وتسجيل صندوق المعاشات. ولا تذكر الصفحة مواعيد المعالجة."
  },
  "de": {
   "q": "Was brauche ich, um auf Zypern zugelassener Rechtsanwalt zu werden?",
   "a": "Die Eintragung in das Anwaltsregister erfolgt beim Obersten Gerichtshof, die jährliche Zulassung zur Berufsausübung beim Rat der Zyprischen Rechtsanwaltskammer und die erste Genehmigungsbescheinigung beim Rechtsrat. Voraussetzungen sind ein Mindestalter von 21 Jahren, guter Leumund, die EU-Staatsangehörigkeit oder die Eigenschaft als Ehegatte bzw. Kind eines EU-Bürgers, ein Jurastudium an einer anerkannten Universität, eine Ausbildungszeit von mindestens zwölf Monaten in einer Anwaltskanzlei oder im Büro des Generalstaatsanwalts und das Bestehen einer Prüfung, die den Rechtsrat zufriedenstellt. Zu den Gebühren zählen 100,00 Euro für das Anwaltsregister, Zulassungsgebühren von 68 Euro (0 bis 10 Jahre) oder 171 Euro (10+ Jahre), die Registrierung im Versorgungswerk der Anwälte mit 50,00 Euro bei jährlicher Verlängerung von 480,00 Euro sowie ein Jahresbeitrag von 100 Euro für das Register der Zyprischen Rechtsanwaltskammer. Der Weg: das Genehmigungsschreiben des Rechtsrats beim Obersten Urkundsbeamten des Obersten Gerichtshofs einreichen, dann beim Anwaltsrat die jährliche Zulassung mit Eintragungsbescheinigung, Berufshaftpflichtversicherung und Anmeldung beim Versorgungswerk beantragen. Bearbeitungszeiten nennt die Seite nicht."
  },
  "pl": {
   "q": "Czego potrzebuję, aby zostać licencjonowanym adwokatem (prawnikiem) na Cyprze?",
   "a": "Wpis do Rejestru Adwokatów prowadzi Sąd Najwyższy, roczną licencję na wykonywanie zawodu wydaje Rada Cypryjskiej Izby Adwokackiej, a wstępne zaświadczenie o zatwierdzeniu — Rada Prawnicza. Wymagania obejmują ukończone 21 lat, dobrą reputację, obywatelstwo UE lub bycie małżonkiem albo dzieckiem obywatela UE, dyplom z prawa uznanego uniwersytetu, odbycie szkolenia trwającego co najmniej dwanaście miesięcy w kancelarii adwokackiej lub w Biurze Prokuratora Generalnego oraz zdanie egzaminu zadowalającego Radę Prawniczą. Opłaty obejmują 100,00 euro za Rejestr Adwokatów, opłaty za wykonywanie zawodu w wysokości 68 euro (0–10 lat) lub 171 euro (10+ lat), rejestrację w Funduszu Emerytalnym Adwokatów 50,00 euro z roczną opłatą odnowienia 480,00 euro oraz składkę 100 euro rocznie za rejestr Cypryjskiej Izby Adwokackiej. Ścieżka to złożenie Listu Zatwierdzającego Rady Prawniczej u Głównego Protokolanta Sądu Najwyższego, a następnie wniosek do Rady Izby o roczną licencję na wykonywanie zawodu wraz z Zaświadczeniem o Wpisie, ubezpieczeniem odpowiedzialności zawodowej i rejestracją w funduszu emerytalnym. Terminów rozpatrywania strona nie podaje."
  },
  "ru": {
   "q": "Что нужно, чтобы стать лицензированным адвокатом (юристом) на Кипре?",
   "a": "Внесение в Реестр адвокатов осуществляет Верховный суд, ежегодную лицензию на практику выдаёт Совет Кипрской коллегии адвокатов, а первоначальное свидетельство об одобрении — Юридический совет. Требования включают возраст не менее 21 года, хорошую репутацию, гражданство ЕС либо статус супруга или ребёнка гражданина ЕС, диплом юриста признанного университета, стажировку не менее двенадцати месяцев в адвокатской конторе или в Офисе генерального прокурора и успешную сдачу экзамена, удовлетворяющего Юридический совет. Сборы включают 100,00 евро за Реестр адвокатов, сборы за практику 68 евро (0–10 лет) или 171 евро (10+ лет), регистрацию в Пенсионном фонде адвокатов 50,00 евро с ежегодным продлением 480,00 евро и членский взнос в реестр Кипрской коллегии адвокатов 100 евро в год. Порядок: подать письмо об одобрении Юридического совета главному секретарю Верховного суда, затем обратиться в Совет коллегии за ежегодной лицензией на практику, представив свидетельство о внесении в реестр, страхование профессиональной ответственности и регистрацию в пенсионном фонде. Сроки рассмотрения на странице не указаны."
  }
 },
 "lic-doctor": {
  "el": {
   "q": "Πώς εγγράφομαι για να ασκήσω το επάγγελμα του γιατρού στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Ιατρικό Συμβούλιο Κύπρου, που βρίσκεται στο Υπουργείο Υγείας στη Λευκωσία. Οι απαιτήσεις περιλαμβάνουν ηλικία τουλάχιστον 21 ετών, κατάλληλη ιθαγένεια (πολίτης της Δημοκρατίας, σύζυγος ή τέκνο, ή πολίτης της ΕΕ), ιατρικό δίπλωμα αναγνωρισμένο βάσει του Τρίτου και Τέταρτου Παραρτήματος του Νόμου περί Εγγραφής Ιατρών, τουλάχιστον 12 μήνες κλινικής υπηρεσίας, εκ των οποίων έξι μήνες στην παθολογία και έξι στη χειρουργική, καλό χαρακτήρα, μη αποκλεισμό από την άσκηση της ιατρικής για παράπτωμα και γνώση της ελληνικής γλώσσας σε επίπεδο C1. Τα τέλη είναι 300,00 ευρώ για την εγγραφή στο Ιατρικό Μητρώο Κύπρου και 200,00 ευρώ για την αναγνώριση τίτλου ειδίκευσης. Οι αιτήσεις επιβεβαιώνονται εντός ενός μηνός και η απόφαση εκδίδεται το πολύ εντός τριών μηνών από την ημερομηνία που το έντυπο αίτησης και τα δικαιολογητικά υποβλήθηκαν δεόντως. Οι αιτήσεις υποβάλλονται απευθείας στο Ιατρικό Συμβούλιο Κύπρου με έγγραφα που περιλαμβάνουν πιστοποιητικό γέννησης, επικυρωμένο αντίγραφο διπλώματος με πιστοποιητικό ισοτιμίας ΚΥ.Σ.Α.Τ.Σ., πιστοποιητικό καλής υπόληψης και βιογραφικό σημείωμα."
  },
  "ro": {
   "q": "Cum mă înregistrez pentru a practica medicina în Cipru?",
   "a": "Autoritatea competentă este Consiliul Medical din Cipru, aflat la Ministerul Sănătății din Nicosia. Cerințele includ o vârstă de cel puțin 21 de ani, cetățenie corespunzătoare (cetățean al Republicii, soț/soție sau copil, ori cetățean UE), o diplomă medicală recunoscută conform Anexelor a Treia și a Patra ale Legii privind înregistrarea medicilor, cel puțin 12 luni de serviciu clinic, inclusiv șase luni în patologie și șase în chirurgie, bună reputație, să nu fi fost interzis de la practica medicală pentru abateri și cunoașterea limbii grecești la nivel C1. Taxele sunt de 300,00 euro pentru înscrierea în Registrul Medical din Cipru și 200,00 euro pentru recunoașterea unui titlu de specializare. Cererile sunt confirmate în decurs de o lună, iar decizia se emite în cel mult trei luni de la data la care formularul de cerere și documentele justificative au fost depuse corespunzător. Cererile se depun direct la Consiliul Medical din Cipru, cu documente care includ certificat de naștere, o copie certificată a diplomei cu certificatul de echivalență KY.S.A.T.S., un certificat de bună purtare și un CV."
  },
  "ar": {
   "q": "كيف أسجّل لممارسة الطب في قبرص؟",
   "a": "الجهة المختصة هي المجلس الطبي القبرصي، ومقرّه في وزارة الصحة بنيقوسيا. تشمل الشروط بلوغ 21 عامًا على الأقل، والجنسية المناسبة (مواطن الجمهورية أو الزوج أو الابن أو مواطن أوروبي)، وشهادة طبية معترف بها بموجب الملحقين الثالث والرابع من قانون تسجيل الأطباء، و12 شهرًا على الأقل من الخدمة السريرية منها ستة أشهر في الأمراض الباطنية وستة في الجراحة، وحسن السيرة، وعدم المنع من ممارسة الطب بسبب سوء سلوك، وإتقان اللغة اليونانية بمستوى C1. الرسوم 300.00 يورو للتسجيل في السجل الطبي القبرصي و200.00 يورو للاعتراف بلقب التخصص. يُقرّ باستلام الطلبات خلال شهر ويصدر القرار في موعد أقصاه ثلاثة أشهر من تاريخ استيفاء نموذج الطلب والمستندات الداعمة. تُقدَّم الطلبات مباشرة إلى المجلس الطبي القبرصي مع مستندات تشمل شهادة الميلاد ونسخة موثَّقة من الشهادة مع شهادة المعادلة من KY.S.A.T.S. وشهادة حسن السيرة وسيرة ذاتية."
  },
  "de": {
   "q": "Wie lasse ich mich als Arzt auf Zypern registrieren?",
   "a": "Zuständig ist der Zyprische Ärzterat, der im Gesundheitsministerium in Nikosia angesiedelt ist. Voraussetzungen sind ein Mindestalter von 21 Jahren, die passende Staatsangehörigkeit (Bürger der Republik, Ehegatte oder Kind, oder EU-Bürger), ein medizinisches Diplom, das nach dem Dritten und Vierten Anhang des Ärzteregistrierungsgesetzes anerkannt ist, mindestens 12 Monate klinische Tätigkeit, davon sechs Monate in der Pathologie und sechs in der Chirurgie, guter Leumund, keine Sperre von der ärztlichen Tätigkeit wegen Fehlverhaltens sowie Griechischkenntnisse auf Niveau C1. Die Gebühren betragen 300,00 Euro für die Eintragung in das Zyprische Ärzteregister und 200,00 Euro für die Anerkennung einer Facharztbezeichnung. Anträge werden innerhalb eines Monats bestätigt, die Entscheidung ergeht spätestens innerhalb von drei Monaten ab ordnungsgemäßer Einreichung von Antragsformular und Nachweisen. Anträge werden direkt beim Zyprischen Ärzterat gestellt, mit Unterlagen wie Geburtsurkunde, beglaubigter Diplomkopie mit KY.S.A.T.S.-Gleichwertigkeitsbescheinigung, Führungszeugnis bzw. Bescheinigung über guten Leumund und Lebenslauf."
  },
  "pl": {
   "q": "Jak zarejestrować się, aby wykonywać zawód lekarza na Cyprze?",
   "a": "Właściwym organem jest Cypryjska Rada Lekarska, mieszcząca się w Ministerstwie Zdrowia w Nikozji. Wymagania obejmują ukończone 21 lat, odpowiednie obywatelstwo (obywatel Republiki, małżonek lub dziecko albo obywatel UE), dyplom lekarski uznany na mocy Trzeciego i Czwartego Załącznika do Ustawy o rejestracji lekarzy, co najmniej 12 miesięcy służby klinicznej, w tym sześć miesięcy w patologii i sześć w chirurgii, dobrą reputację, brak zakazu wykonywania zawodu lekarza za wykroczenie oraz znajomość języka greckiego na poziomie C1. Opłaty wynoszą 300,00 euro za wpis do Cypryjskiego Rejestru Lekarzy i 200,00 euro za uznanie tytułu specjalisty. Wnioski są potwierdzane w ciągu miesiąca, a decyzja zapada najpóźniej w ciągu trzech miesięcy od dnia należytego złożenia formularza i dokumentów. Wnioski składa się bezpośrednio do Cypryjskiej Rady Lekarskiej z dokumentami obejmującymi akt urodzenia, poświadczoną kopię dyplomu z zaświadczeniem o równoważności KY.S.A.T.S., zaświadczenie o dobrej reputacji i CV."
  },
  "ru": {
   "q": "Как зарегистрироваться для врачебной практики на Кипре?",
   "a": "Компетентный орган — Медицинский совет Кипра, расположенный при Министерстве здравоохранения в Никосии. Требования включают возраст не менее 21 года, соответствующее гражданство (гражданин Республики, супруг или ребёнок либо гражданин ЕС), медицинский диплом, признанный в соответствии с Третьим и Четвёртым приложениями к Закону о регистрации врачей, не менее 12 месяцев клинической службы, включая шесть месяцев по патологии и шесть по хирургии, хорошую репутацию, отсутствие отстранения от медицинской практики за проступки и владение греческим языком на уровне C1. Сборы — 300,00 евро за внесение в Медицинский реестр Кипра и 200,00 евро за признание звания специалиста. Получение заявлений подтверждается в течение месяца, а решение выносится не позднее трёх месяцев с даты надлежащей подачи формы заявления и подтверждающих документов. Заявления подаются непосредственно в Медицинский совет Кипра с документами, включающими свидетельство о рождении, заверенную копию диплома со свидетельством эквивалентности KY.S.A.T.S., справку о добропорядочности и резюме."
  }
 },
 "lic-pharmacy": {
  "el": {
   "q": "Πώς αδειοδοτούμαι για να ανοίξω φαρμακείο στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Συμβούλιο Φαρμακευτικής, που λειτουργεί βάσει του Νόμου περί Φαρμακευτικής και Δηλητηρίων (Κεφ. 254), με τις αιτήσεις να υποβάλλονται στον Έφορο του Συμβουλίου Φαρμακευτικής εντός των Φαρμακευτικών Υπηρεσιών. Ο αιτών πρέπει να είναι εγγεγραμμένος φαρμακοποιός στην Κυπριακή Δημοκρατία ή εταιρεία υπό τη διοίκηση και τον έλεγχο εγγεγραμμένου φαρμακοποιού που κατέχει τουλάχιστον το 51% των μετοχών της εταιρείας· το φαρμακείο πρέπει να καταλαμβάνει ανεξάρτητο κατάστημα που συμμορφώνεται με τον Νόμο περί Δρόμων και Οικοδομών και να παρέχει τις απαραίτητες εγκαταστάσεις και ρυθμίσεις για εύκολη πρόσβαση ατόμων με αναπηρία. Δεν εφαρμόζονται τέλη. Ο αιτών ενημερώνεται για την απόφαση αδειοδότησης εντός τριών μηνών από την ημερομηνία που η αίτηση υποβλήθηκε δεόντως, και πραγματοποιούνται τρεις επιτόπιες επιθεωρήσεις πριν από την έγκριση. Οι αιτήσεις μπορούν να υποβληθούν μέσω του PSC Κύπρου ή επικοινωνώντας απευθείας με την αρμόδια αρχή, με δικαιολογητικά που περιλαμβάνουν πιστοποιητικά εγγραφής, μισθωτήρια ή συμφωνίες ιδιοκτησίας, αρχιτεκτονικά σχέδια και οικοδομικές άδειες."
  },
  "ro": {
   "q": "Cum obțin licența pentru a deschide o farmacie în Cipru?",
   "a": "Autoritatea competentă este Consiliul Farmaciei, care funcționează în temeiul Legii privind farmacia și substanțele toxice (Cap. 254), cererile depunându-se la Registratorul Consiliului Farmaciei din cadrul Serviciilor Farmaceutice. Solicitantul trebuie să fie farmacist înregistrat în Republica Cipru sau o companie aflată sub conducerea și controlul unui farmacist înregistrat care deține cel puțin 51% din acțiunile companiei; farmacia trebuie să ocupe un magazin independent, conform Legii privind străzile și clădirile, și să ofere facilitățile și amenajările necesare pentru accesul ușor al persoanelor cu dizabilități. Nu se aplică taxe. Solicitantul este informat despre decizia de autorizare în termen de trei luni de la data la care cererea a fost depusă corespunzător și se efectuează trei inspecții la fața locului înainte de aprobare. Cererile pot fi depuse prin PSC Cyprus sau contactând direct autoritatea competentă, cu documente justificative care includ certificate de înregistrare, contracte de închiriere sau de proprietate, planuri arhitecturale și autorizații de construire."
  },
  "ar": {
   "q": "كيف أحصل على ترخيص لفتح صيدلية في قبرص؟",
   "a": "الجهة المختصة هي مجلس الصيدلة الذي يعمل بموجب قانون الصيدلة والسموم (الفصل 254)، وتُقدَّم الطلبات إلى مسجّل مجلس الصيدلة ضمن الخدمات الصيدلانية. يجب أن يكون المتقدّم صيدليًا مسجّلًا في جمهورية قبرص، أو شركة تحت إدارة صيدلي مسجّل ورقابته يملك 51% على الأقل من أسهمها؛ ويجب أن تشغل الصيدلية متجرًا مستقلًا يتوافق مع قانون الشوارع والمباني وأن توفّر التسهيلات والترتيبات اللازمة لسهولة وصول ذوي الإعاقة. لا تُطبَّق رسوم. يُبلَّغ المتقدّم بقرار الترخيص خلال ثلاثة أشهر من تاريخ تقديم الطلب على الوجه الصحيح، وتُجرى ثلاث عمليات تفتيش ميدانية قبل الموافقة. يمكن تقديم الطلبات عبر PSC Cyprus أو بالتواصل المباشر مع الجهة المختصة، مع مستندات داعمة تشمل شهادات التسجيل وعقود الإيجار أو الملكية والمخططات المعمارية ورخص البناء."
  },
  "de": {
   "q": "Wie erhalte ich die Lizenz zur Eröffnung einer Apotheke auf Zypern?",
   "a": "Zuständig ist der Apothekerrat, der nach dem Apotheken- und Giftgesetz (Kap. 254) tätig ist; Anträge werden beim Registrar des Apothekerrats innerhalb der Pharmazeutischen Dienste eingereicht. Der Antragsteller muss ein in der Republik Zypern registrierter Apotheker sein oder eine Gesellschaft unter der Leitung und Kontrolle eines registrierten Apothekers, der mindestens 51 % der Gesellschaftsanteile hält; die Apotheke muss ein eigenständiges Ladengeschäft nach dem Straßen- und Gebäudegesetz belegen und die erforderlichen Einrichtungen für einen leichten Zugang von Menschen mit Behinderungen bieten. Es fallen keine Gebühren an. Der Antragsteller wird innerhalb von drei Monaten ab ordnungsgemäßer Antragstellung über die Zulassungsentscheidung informiert; vor der Genehmigung finden drei Vor-Ort-Prüfungen statt. Anträge können über PSC Cyprus oder durch direkte Kontaktaufnahme mit der zuständigen Behörde gestellt werden, mit Nachweisen wie Registrierungsbescheinigungen, Miet- oder Eigentumsverträgen, Bauplänen und Baugenehmigungen."
  },
  "pl": {
   "q": "Jak uzyskać licencję na otwarcie apteki na Cyprze?",
   "a": "Właściwym organem jest Rada ds. Aptek, działająca na podstawie Ustawy o aptekach i truciznach (rozdz. 254); wnioski składa się do Rejestratora Rady ds. Aptek w ramach Służb Farmaceutycznych. Wnioskodawca musi być zarejestrowanym farmaceutą w Republice Cypryjskiej lub spółką zarządzaną i kontrolowaną przez zarejestrowanego farmaceutę, który posiada co najmniej 51% udziałów spółki; apteka musi zajmować samodzielny lokal handlowy zgodny z Ustawą o ulicach i budynkach oraz zapewniać niezbędne udogodnienia ułatwiające dostęp osobom niepełnosprawnym. Nie pobiera się opłat. Wnioskodawca jest informowany o decyzji o udzieleniu zezwolenia w ciągu trzech miesięcy od dnia należytego złożenia wniosku, a przed zatwierdzeniem przeprowadza się trzy kontrole na miejscu. Wnioski można składać przez PSC Cyprus lub kontaktując się bezpośrednio z właściwym organem, z dokumentami obejmującymi świadectwa rejestracji, umowy najmu lub własności, plany architektoniczne i pozwolenia budowlane."
  },
  "ru": {
   "q": "Как получить лицензию на открытие аптеки на Кипре?",
   "a": "Компетентный орган — Фармацевтический совет, действующий в соответствии с Законом об аптеках и ядах (гл. 254); заявления подаются регистратору Фармацевтического совета в составе Фармацевтических служб. Заявитель должен быть зарегистрированным фармацевтом в Республике Кипр либо компанией под управлением и контролем зарегистрированного фармацевта, владеющего не менее чем 51 % акций компании; аптека должна занимать отдельное торговое помещение, соответствующее Закону об улицах и зданиях, и обеспечивать необходимые условия для лёгкого доступа лиц с ограниченными возможностями. Сборы не взимаются. Заявитель информируется о решении о выдаче разрешения в течение трёх месяцев с даты надлежащей подачи заявления, а перед одобрением проводятся три выездные проверки. Заявления можно подавать через PSC Cyprus или обратившись непосредственно в компетентный орган, с подтверждающими документами, включающими свидетельства о регистрации, договоры аренды или собственности, архитектурные планы и разрешения на строительство."
  }
 },
 "lic-hotel": {
  "el": {
   "q": "Ποια άδεια απαιτείται για τη λειτουργία ξενοδοχείου ή τουριστικού καταλύματος στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Υφυπουργείο Τουρισμού. Ο αιτών πρέπει να είναι φυσικό ή νομικό πρόσωπο με κατοικία/έδρα στην Κυπριακή Δημοκρατία ή πολίτης άλλου κράτους μέλους της ΕΕ ή νομικό πρόσωπο εγγεγραμμένο σε άλλο κράτος μέλος, και πρέπει να υποβάλει έγγραφα που περιλαμβάνουν ισχύον Πιστοποιητικό Υγείας, Πιστοποιητικό Υγείας Πισίνας, εκθέσεις Μηχανικού Ανελκυστήρων, Άδεια Αποθήκευσης Πετρελαίου, εκθέσεις επιθεώρησης υγραερίου, έκθεση της Πυροσβεστικής, επιβεβαίωση του Τμήματος Επιθεώρησης Εργασίας για την Εκτίμηση Επικινδυνότητας, πολεοδομική συγκατάθεση και έντυπο Διευθυντή Ξενοδοχείου. Οι αιτούντες ενημερώνονται για την απόφαση αδειοδότησης εντός δύο μηνών από την ημερομηνία παραλαβής της αίτησης και των δικαιολογητικών δεόντως, και τα ξενοδοχεία λαμβάνουν την τελική κατάταξή τους εντός δύο εβδομάδων από την έκδοση της άδειας λειτουργίας. Η Αίτηση για Άδεια Λειτουργίας Ξενοδοχείου υποβάλλεται απευθείας σε Επαρχιακό Γραφείο του Υφυπουργείου Τουρισμού, όπου λειτουργός ελέγχει την πληρότητα παρουσία του αιτούντος, και οι άδειες λειτουργίας ισχύουν για τρία έτη από την έκδοση και ανανεώνονται αυτόματα. Συγκεκριμένα τέλη σε ευρώ δεν αναφέρονται στη σελίδα, η οποία παραπέμπει σε έγγραφο Τελών Αδειών και Κατάταξης 2021· κύρος για τα ποσά των τελών έχει η επίσημη σελίδα."
  },
  "ro": {
   "q": "Ce licență este necesară pentru a opera un hotel sau o unitate turistică în Cipru?",
   "a": "Autoritatea competentă este Subsecretariatul pentru Turism. Solicitantul trebuie să fie o persoană fizică sau juridică cu reședința/sediul în Republica Cipru ori cetățean al altui stat membru UE sau persoană juridică înregistrată într-un alt stat membru și trebuie să depună documente printre care un Certificat Sanitar valabil, Certificatul Sanitar al Piscinei, rapoartele inginerului de lifturi, Licența de depozitare a păcurii, rapoartele de inspecție GPL, un raport al Pompierilor, confirmarea Inspecției Muncii privind Evaluarea Riscurilor, acordul de urbanism și un formular de Director de hotel. Solicitanții sunt informați despre decizia de licențiere în termen de două luni de la data la care cererea și documentele justificative au fost primite în regulă, iar hotelurile primesc clasificarea finală în două săptămâni de la emiterea licenței de funcționare. Cererea pentru Licența de funcționare a hotelului se depune direct la un Birou Districtual al Subsecretariatului pentru Turism, unde un funcționar districtual verifică completitudinea în prezența solicitantului, iar licențele de funcționare sunt valabile trei ani de la emitere și se reînnoiesc automat. Taxe specifice în EUR nu sunt menționate pe pagină, care face trimitere la un document Taxe de licență și clasificare 2021; pentru sumele taxelor, pagina oficială este autoritatea de referință."
  },
  "ar": {
   "q": "ما الترخيص المطلوب لتشغيل فندق أو منشأة سياحية في قبرص؟",
   "a": "الجهة المختصة هي وزارة السياحة المساعدة. يجب أن يكون المتقدّم فردًا أو كيانًا قانونيًا مقيمًا في جمهورية قبرص أو مواطنًا في دولة عضو أخرى في الاتحاد الأوروبي أو كيانًا قانونيًا مسجّلًا في دولة عضو أخرى، وأن يقدّم مستندات تشمل شهادة صحية سارية، وشهادة صحة المسبح، وتقارير مهندس المصاعد، وترخيص تخزين الوقود، وتقارير فحص الغاز المسال، وتقرير دائرة الإطفاء، وتأكيد تفتيش العمل لتقييم المخاطر، وموافقة التخطيط العمراني، ونموذج مدير الفندق. يُبلَّغ المتقدّمون بقرار الترخيص خلال شهرين من تاريخ استلام الطلب والمستندات الداعمة مستوفاة، وتحصل الفنادق على تصنيفها النهائي خلال أسبوعين من إصدار رخصة التشغيل. يُقدَّم طلب رخصة تشغيل الفندق مباشرة إلى مكتب مقاطعة تابع لوزارة السياحة المساعدة، حيث يتحقق موظف المقاطعة من الاكتمال بحضور المتقدّم، وتكون رخص التشغيل صالحة ثلاث سنوات من تاريخ الإصدار وتُجدَّد تلقائيًا. ولا تذكر الصفحة رسومًا محددة باليورو، بل تشير إلى وثيقة «رسوم الترخيص والتصنيف 2021»؛ والصفحة الرسمية هي المرجع المعتمد لمبالغ الرسوم."
  },
  "de": {
   "q": "Welche Lizenz ist für den Betrieb eines Hotels oder touristischen Betriebs auf Zypern erforderlich?",
   "a": "Zuständig ist das Stellvertretende Ministerium für Tourismus. Der Antragsteller muss eine in der Republik Zypern ansässige natürliche oder juristische Person oder ein Bürger eines anderen EU-Mitgliedstaats bzw. eine in einem anderen Mitgliedstaat eingetragene juristische Person sein und Unterlagen einreichen, darunter ein gültiges Gesundheitszeugnis, ein Gesundheitszeugnis für das Schwimmbad, Berichte des Aufzugsingenieurs, die Genehmigung zur Öltanklagerung, Prüfberichte zur Flüssiggasanlage, einen Bericht der Feuerwehr, die Bestätigung der Arbeitsinspektion zur Gefährdungsbeurteilung, die Baugenehmigung sowie ein Formular für den Hoteldirektor. Antragsteller werden innerhalb von zwei Monaten ab Eingang von Antrag und Nachweisen in ordnungsgemäßer Form über die Lizenzentscheidung informiert; Hotels erhalten ihre endgültige Klassifizierung innerhalb von zwei Wochen nach Erteilung der Betriebslizenz. Der Antrag auf Hotelbetriebslizenz wird direkt bei einem Bezirksbüro des Stellvertretenden Ministeriums für Tourismus gestellt, wo ein Bezirksbeamter die Vollständigkeit im Beisein des Antragstellers prüft; Betriebslizenzen gelten drei Jahre ab Ausstellung und verlängern sich automatisch. Konkrete Gebühren in Euro nennt die Seite nicht, sie verweist auf ein Dokument „Lizenz- und Klassifizierungsgebühren 2021“; für die Gebührenhöhe ist die offizielle Seite maßgeblich."
  },
  "pl": {
   "q": "Jakiej licencji wymaga prowadzenie hotelu lub obiektu turystycznego na Cyprze?",
   "a": "Właściwym organem jest Wiceministerstwo Turystyki. Wnioskodawca musi być osobą fizyczną lub prawną zamieszkałą/mającą siedzibę w Republice Cypryjskiej albo obywatelem innego państwa członkowskiego UE lub osobą prawną zarejestrowaną w innym państwie członkowskim, i musi złożyć dokumenty obejmujące aktualne Świadectwo Zdrowia, Świadectwo Zdrowia Basenu, raporty inżyniera dźwigów, Zezwolenie na Magazynowanie Oleju, raporty z kontroli instalacji LPG, raport Straży Pożarnej, potwierdzenie Inspekcji Pracy dotyczące Oceny Ryzyka, zgodę planistyczną oraz formularz Kierownika Hotelu. Wnioskodawcy są informowani o decyzji licencyjnej w ciągu dwóch miesięcy od dnia otrzymania wniosku i dokumentów w należytej formie, a hotele otrzymują ostateczną klasyfikację w ciągu dwóch tygodni od wydania licencji operacyjnej. Wniosek o Licencję Operacyjną Hotelu składa się bezpośrednio w Biurze Dystryktowym Wiceministerstwa Turystyki, gdzie urzędnik dystryktowy sprawdza kompletność w obecności wnioskodawcy, a licencje operacyjne są ważne trzy lata od wydania i odnawiają się automatycznie. Konkretne opłaty w euro nie są podane na stronie, która odwołuje się do dokumentu Opłaty za Licencję i Klasyfikację 2021; kwoty opłat opisuje autorytatywnie oficjalna strona."
  },
  "ru": {
   "q": "Какая лицензия требуется для эксплуатации отеля или туристического объекта на Кипре?",
   "a": "Компетентный орган — Заместитель министра по туризму. Заявитель должен быть физическим или юридическим лицом, проживающим/находящимся в Республике Кипр, либо гражданином другого государства — члена ЕС или юридическим лицом, зарегистрированным в другом государстве-члене, и обязан представить документы, включающие действующее санитарное свидетельство, санитарное свидетельство на бассейн, заключения инженера по лифтам, лицензию на хранение мазута, заключения по проверке газового оборудования (СУГ), заключение пожарной службы, подтверждение Трудовой инспекции об оценке рисков, градостроительное согласие и форму управляющего отелем. Заявители информируются о лицензионном решении в течение двух месяцев с даты получения заявления и подтверждающих документов в надлежащем виде, а отели получают окончательную классификацию в течение двух недель после выдачи эксплуатационной лицензии. Заявление на эксплуатационную лицензию отеля подаётся непосредственно в окружное отделение Заместителя министра по туризму, где окружной сотрудник проверяет комплектность в присутствии заявителя, а эксплуатационные лицензии действуют три года с даты выдачи и продлеваются автоматически. Конкретные суммы сборов в евро на странице не приводятся — она ссылается на документ «Сборы за лицензии и классификацию 2021»; размеры сборов авторитетно указаны на официальной странице."
  }
 },
 "lic-travel-agency": {
  "el": {
   "q": "Πώς παίρνω άδεια για να ανοίξω ταξιδιωτικό γραφείο στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Υφυπουργείο Τουρισμού. Οι αιτούντες πρέπει να είναι φυσικά πρόσωπα που διαμένουν στην Κύπρο ή σε κράτος μέλος της ΕΕ, ή νομικά πρόσωπα εγκατεστημένα εκεί· ο διευθυντής πρέπει να κατέχει πανεπιστημιακό δίπλωμα ή δίπλωμα αναγνωρισμένου ιδρύματος ανώτατης εκπαίδευσης στον τουρισμό και να μην του έχει απαγορευθεί με δικαστικό διάταγμα ο χειρισμός περιουσίας ούτε να έχει καταδικαστεί για αδίκημα που περιλαμβάνει δολιότητα ή ηθική αισχρότητα. Οι εγκαταστάσεις πρέπει να έχουν τουλάχιστον 20 τ.μ. με ιδιωτική τουαλέτα και νιπτήρα, και πρέπει να υπάρχουν τουλάχιστον δύο άτομα, συμπεριλαμβανομένου του διευθυντή. Τα τέλη είναι τέλος άδειας εγκατάστασης 400,00 ευρώ, εγγύηση 15.000,00 ευρώ και τέλος ανανέωσης 300,00 ευρώ. Η απόφαση εκδίδεται εντός 3 μηνών από την ημερομηνία που η αίτηση υποβλήθηκε δεόντως, η άδεια ισχύει για δύο έτη και λήγει στις 31 Δεκεμβρίου, και η Αίτηση για την Εγκατάσταση Τουριστικού και Ταξιδιωτικού Γραφείου μπορεί να υποβληθεί μέσω του PSC Κύπρου ή ταχυδρομικά ή με το χέρι."
  },
  "ro": {
   "q": "Cum obțin licența pentru a deschide o agenție de turism în Cipru?",
   "a": "Autoritatea competentă este Subsecretariatul pentru Turism. Solicitanții trebuie să fie persoane fizice cu reședința în Cipru sau într-un stat membru UE ori persoane juridice stabilite acolo; managerul trebuie să dețină o diplomă universitară sau o diplomă de la o instituție de învățământ superior recunoscută în turism și să nu-i fi fost interzisă printr-o hotărâre judecătorească gestionarea bunurilor și să nu fi fost condamnat pentru o infracțiune care implică necinste sau imoralitate. Spațiul trebuie să aibă cel puțin 20 m² cu toaletă și lavoar proprii și trebuie să existe minimum două persoane, inclusiv managerul. Taxele sunt o taxă de licență de înființare de 400,00 euro, un depozit de garanție de 15.000,00 euro și o taxă de reînnoire de 300,00 euro. Decizia se emite în 3 luni de la data la care cererea a fost depusă corespunzător, licența este valabilă doi ani și expiră la 31 decembrie, iar Cererea pentru înființarea unei agenții de turism și călătorii se poate depune prin PSC Cyprus, prin poștă sau personal."
  },
  "ar": {
   "q": "كيف أحصل على ترخيص لفتح وكالة سفر في قبرص؟",
   "a": "الجهة المختصة هي وزارة السياحة المساعدة. يجب أن يكون المتقدّمون أشخاصًا طبيعيين مقيمين في قبرص أو في دولة عضو بالاتحاد الأوروبي، أو كيانات قانونية مؤسَّسة هناك؛ ويجب أن يحمل المدير شهادة جامعية أو شهادة من مؤسسة تعليم عالٍ معترف بها في السياحة، وألا يكون ممنوعًا بأمر قضائي من التصرف في الأموال ولا مدانًا بجريمة تنطوي على خيانة أو انحطاط أخلاقي. ويجب ألا تقل مساحة المقر عن 20 مترًا مربعًا مع مرحاض خاص وحوض غسيل، وأن يعمل فيه شخصان على الأقل بمن فيهم المدير. الرسوم: رسم ترخيص التأسيس 400.00 يورو، ووديعة ضمان 15,000.00 يورو، ورسم تجديد 300.00 يورو. يصدر القرار خلال 3 أشهر من تاريخ تقديم الطلب على الوجه الصحيح، والترخيص صالح لسنتين وينتهي في 31 ديسمبر، ويمكن تقديم طلب تأسيس وكالة سياحة وسفر عبر PSC Cyprus أو بالبريد أو باليد."
  },
  "de": {
   "q": "Wie erhalte ich eine Lizenz zur Eröffnung eines Reisebüros auf Zypern?",
   "a": "Zuständig ist das Stellvertretende Ministerium für Tourismus. Antragsteller müssen natürliche Personen mit Wohnsitz in Zypern oder einem EU-Mitgliedstaat oder dort niedergelassene juristische Personen sein; der Geschäftsführer muss ein Universitätsdiplom oder das Diplom einer anerkannten Hochschuleinrichtung im Bereich Tourismus besitzen und darf weder gerichtlich an der Verfügung über Vermögen gehindert noch wegen einer Straftat mit Unredlichkeit oder sittlicher Verwerflichkeit verurteilt sein. Die Räume müssen mindestens 20 m² groß sein, mit eigener Toilette und Waschbecken, und es müssen mindestens zwei Personen einschließlich des Geschäftsführers tätig sein. Die Gebühren betragen 400,00 Euro für die Niederlassungslizenz, 15.000,00 Euro Kaution und 300,00 Euro für die Verlängerung. Die Entscheidung ergeht innerhalb von 3 Monaten ab ordnungsgemäßer Antragstellung, die Lizenz gilt zwei Jahre und läuft am 31. Dezember ab; der Antrag auf Errichtung eines Touristik- und Reisebüros kann über PSC Cyprus, per Post oder persönlich eingereicht werden."
  },
  "pl": {
   "q": "Jak uzyskać licencję na otwarcie biura podróży na Cyprze?",
   "a": "Właściwym organem jest Wiceministerstwo Turystyki. Wnioskodawcy muszą być osobami fizycznymi mieszkającymi na Cyprze lub w państwie członkowskim UE albo osobami prawnymi tam ustanowionymi; kierownik musi posiadać dyplom uniwersytecki lub dyplom uznanej instytucji szkolnictwa wyższego w zakresie turystyki oraz nie może mieć sądowego zakazu dysponowania majątkiem ani być skazany za przestępstwo związane z nieuczciwością lub niemoralnością. Lokal musi mieć co najmniej 20 m² z własną toaletą i umywalką, a zatrudnione muszą być co najmniej dwie osoby, w tym kierownik. Opłaty to opłata licencyjna za założenie 400,00 euro, kaucja gwarancyjna 15 000,00 euro i opłata za odnowienie 300,00 euro. Decyzja zapada w ciągu 3 miesięcy od dnia należytego złożenia wniosku, licencja jest ważna dwa lata i wygasa 31 grudnia, a Wniosek o założenie biura turystyczno-podróżniczego można złożyć przez PSC Cyprus, pocztą lub osobiście."
  },
  "ru": {
   "q": "Как получить лицензию на открытие туристического агентства на Кипре?",
   "a": "Компетентный орган — Заместитель министра по туризму. Заявители должны быть физическими лицами, проживающими на Кипре или в государстве — члене ЕС, либо юридическими лицами, учреждёнными там; руководитель должен иметь университетский диплом или диплом признанного высшего учебного заведения по туризму, не быть лишённым судебным решением права распоряжаться имуществом и не быть осуждённым за преступление, связанное с нечестностью или моральной низостью. Помещение должно быть не менее 20 кв. м с отдельным туалетом и умывальником, а работать должны не менее двух человек, включая руководителя. Сборы — лицензионный сбор за учреждение 400,00 евро, гарантийный депозит 15 000,00 евро и сбор за продление 300,00 евро. Решение выносится в течение 3 месяцев с даты надлежащей подачи заявления, лицензия действует два года и истекает 31 декабря, а заявление на учреждение туристического и туроператорского агентства можно подать через PSC Cyprus, по почте или лично."
  }
 },
 "lic-restaurant": {
  "el": {
   "q": "Ποια άδεια χρειάζομαι για να είμαι διευθυντής καταστήματος εστίασης (εστιατορίου) στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Υφυπουργείο Τουρισμού, με τις αιτήσεις να υποβάλλονται μέσω του PSC Κύπρου ή στα Επαρχιακά Γραφεία των Επιθεωρητών. Τα απαιτούμενα έγγραφα περιλαμβάνουν αντίγραφα πιστοποιητικών ακαδημαϊκών προσόντων, πρωτότυπα πιστοποιητικά εργασιακής πείρας που αποκτήθηκε στον κλάδο και πρωτότυπο πρόσφατο Πιστοποιητικό Λευκού Ποινικού Μητρώου που εκδόθηκε εντός των τελευταίων 365 ημερών. Δεν εφαρμόζονται τέλη. Ο αιτών ενημερώνεται για την απόφαση αδειοδότησης εντός 3 μηνών από την ημερομηνία που το έντυπο αίτησης και τα δικαιολογητικά υποβλήθηκαν δεόντως. Η αίτηση μπορεί να υποβληθεί μέσω του PSC Κύπρου ή ταχυδρομικά ή με παράδοση στα Επαρχιακά Γραφεία ή στα Κεντρικά Γραφεία του Υφυπουργείου Τουρισμού, με δικαιολογητικά στα ελληνικά ή στα αγγλικά."
  },
  "ro": {
   "q": "Ce licență îmi trebuie pentru a fi manager al unei unități de alimentație publică (restaurant) în Cipru?",
   "a": "Autoritatea competentă este Subsecretariatul pentru Turism, cererile depunându-se prin PSC Cyprus sau la Birourile Districtuale ale Inspectorilor. Documentele necesare includ copii ale certificatelor de calificări academice, certificate originale de experiență profesională dobândită în domeniu și un certificat original și recent de cazier judiciar eliberat în ultimele 365 de zile. Nu se aplică taxe. Solicitantul este informat despre decizia de autorizare în 3 luni de la data la care formularul de cerere și documentele justificative au fost depuse corespunzător. Cererea se poate depune prin PSC Cyprus sau prin poștă ori personal la Birourile Districtuale sau la Sediul Central al Subsecretariatului pentru Turism, cu documente justificative în limba greacă sau engleză."
  },
  "ar": {
   "q": "ما الترخيص الذي أحتاجه لأكون مديرًا لمنشأة تقديم طعام (مطعم) في قبرص؟",
   "a": "الجهة المختصة هي وزارة السياحة المساعدة، وتُقدَّم الطلبات عبر PSC Cyprus أو إلى مكاتب المفتشين في المقاطعات. تشمل المستندات المطلوبة نسخًا من شهادات المؤهلات الأكاديمية، وشهادات أصلية للخبرة العملية المكتسبة في القطاع، وشهادة أصلية حديثة بخلو السجل الجنائي صادرة خلال الـ365 يومًا الأخيرة. لا تُطبَّق رسوم. يُبلَّغ المتقدّم بقرار الترخيص خلال 3 أشهر من تاريخ استيفاء نموذج الطلب والمستندات الداعمة. يمكن تقديم الطلب عبر PSC Cyprus أو بالبريد أو التسليم باليد إلى مكاتب المقاطعات أو المكاتب الرئيسية لوزارة السياحة المساعدة، مع مستندات داعمة باليونانية أو الإنجليزية."
  },
  "de": {
   "q": "Welche Lizenz brauche ich als Leiter eines gastronomischen Betriebs (Restaurant) auf Zypern?",
   "a": "Zuständig ist das Stellvertretende Ministerium für Tourismus; Anträge werden über PSC Cyprus oder bei den Bezirksbüros der Inspektoren eingereicht. Erforderliche Unterlagen sind Kopien der Zeugnisse über akademische Qualifikationen, Originalbescheinigungen über in der Branche erworbene Berufserfahrung und ein aktuelles Original-Führungszeugnis, das innerhalb der letzten 365 Tage ausgestellt wurde. Es fallen keine Gebühren an. Der Antragsteller wird innerhalb von 3 Monaten ab ordnungsgemäßer Einreichung von Antragsformular und Nachweisen über die Zulassungsentscheidung informiert. Der Antrag kann über PSC Cyprus oder per Post bzw. persönlich bei den Bezirksbüros oder der Zentrale des Stellvertretenden Ministeriums für Tourismus gestellt werden, mit Nachweisen auf Griechisch oder Englisch."
  },
  "pl": {
   "q": "Jakiej licencji potrzebuję, aby być kierownikiem lokalu gastronomicznego (restauracji) na Cyprze?",
   "a": "Właściwym organem jest Wiceministerstwo Turystyki; wnioski składa się przez PSC Cyprus lub w Biurach Dystryktowych Inspektorów. Wymagane dokumenty obejmują kopie świadectw kwalifikacji akademickich, oryginały świadectw doświadczenia zawodowego zdobytego w branży oraz oryginał aktualnego zaświadczenia o niekaralności wydanego w ciągu ostatnich 365 dni. Nie pobiera się opłat. Wnioskodawca jest informowany o decyzji o udzieleniu zezwolenia w ciągu 3 miesięcy od dnia należytego złożenia formularza wniosku i dokumentów. Wniosek można złożyć przez PSC Cyprus albo pocztą lub osobiście w Biurach Dystryktowych lub w Centrali Wiceministerstwa Turystyki, z dokumentami w języku greckim lub angielskim."
  },
  "ru": {
   "q": "Какая лицензия нужна, чтобы быть руководителем заведения общественного питания (ресторана) на Кипре?",
   "a": "Компетентный орган — Заместитель министра по туризму; заявления подаются через PSC Cyprus или в окружные отделения инспекторов. Необходимые документы включают копии свидетельств об академических квалификациях, оригиналы свидетельств о стаже работы в отрасли и оригинал свежей справки об отсутствии судимости, выданной в течение последних 365 дней. Сборы не взимаются. Заявитель информируется о решении о выдаче разрешения в течение 3 месяцев с даты надлежащей подачи формы заявления и подтверждающих документов. Заявление можно подать через PSC Cyprus либо по почте или лично в окружные отделения или в головной офис Заместителя министра по туризму, с подтверждающими документами на греческом или английском языке."
  }
 },
 "lic-engineer": {
  "el": {
   "q": "Πώς εγγράφομαι ως μηχανικός στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Επιστημονικό και Τεχνικό Επιμελητήριο Κύπρου (ΕΤΕΚ). Οι απαιτήσεις περιλαμβάνουν κατοχή διπλώματος ή πανεπιστημιακού πτυχίου ή άλλου συγκρίσιμου προσόντος σε οποιονδήποτε τομέα της Επιστήμης του Μηχανικού, ιδιότητα πολίτη της Κύπρου, πολίτη της ΕΕ εγκατεστημένου στην Κύπρο ή συζύγου πολίτη της Κύπρου, ηλικία άνω των 21 ετών, μη προηγούμενη καταδίκη για έγκλημα και επαρκή γνώση της ελληνικής γλώσσας (για πολίτες της ΕΕ)· για Αρχιτεκτονική και Πολιτική Μηχανική απαιτείται ένας χρόνος πρακτικής εργασίας. Τα τέλη είναι τέλος εγγραφής 55 ευρώ ανά τομέα, ετήσια επαγγελματική άδεια 30 ευρώ και ετήσια συνδρομή 35 ευρώ (κάτω των 30) ή 90 ευρώ (άνω των 30). Η απόφαση εκδίδεται το πολύ εντός τριών μηνών από την ημερομηνία που το έντυπο αίτησης και τα δικαιολογητικά υποβλήθηκαν δεόντως. Η αίτηση εγγραφής στο Μητρώο Μελών του ΕΤΕΚ μπορεί να υποβληθεί ηλεκτρονικά, με έγγραφα ταυτότητας, πανεπιστημιακό πτυχίο, αναλυτική βαθμολογία, πιστοποιητικό γλωσσομάθειας και πιστοποιητικό πρακτικής άσκησης όπου εφαρμόζεται."
  },
  "ro": {
   "q": "Cum mă înregistrez ca inginer în Cipru?",
   "a": "Autoritatea competentă este Camera Științifică și Tehnică din Cipru (ETEK). Cerințele includ o diplomă sau o licență universitară ori altă calificare comparabilă în orice domeniu al științei ingineriei, cetățenia cipriotă, cetățenia UE cu stabilire în Cipru sau calitatea de soț/soție al unui cetățean cipriot, vârsta de peste 21 de ani, lipsa unei condamnări penale anterioare și cunoștințe adecvate de limbă greacă (pentru cetățenii UE); pentru Arhitectură și Inginerie Civilă este necesar un an de practică. Taxele sunt o taxă de înregistrare de 55 euro pe domeniu, o licență profesională anuală de 30 euro și o cotizație anuală de 35 euro (sub 30 de ani) sau 90 euro (peste 30 de ani). Decizia se emite în cel mult trei luni de la data la care formularul de cerere și documentele justificative au fost depuse corespunzător. Cererea de înscriere în Registrul Membrilor ETEK se poate depune electronic, cu acte de identitate, diploma universitară, foaia matricolă, certificatul de competență lingvistică și certificatul de practică acolo unde este cazul."
  },
  "ar": {
   "q": "كيف أسجّل مهندسًا في قبرص؟",
   "a": "الجهة المختصة هي الغرفة العلمية والفنية القبرصية (ETEK). تشمل الشروط حمل شهادة أو درجة جامعية أو مؤهل مماثل في أي مجال من علوم الهندسة، وأن يكون المتقدّم مواطنًا قبرصيًا أو مواطنًا أوروبيًا مقيمًا في قبرص أو زوجًا لمواطن قبرصي، وفوق 21 عامًا، وغير مدان سابقًا بجريمة، وذا معرفة كافية باللغة اليونانية (للمواطنين الأوروبيين)؛ ويلزم عام واحد من العمل العملي للعمارة والهندسة المدنية. الرسوم: رسم تسجيل 55 يورو لكل مجال، وترخيص مهني سنوي 30 يورو، واشتراك سنوي 35 يورو (دون 30 عامًا) أو 90 يورو (فوق 30). يصدر القرار في موعد أقصاه ثلاثة أشهر من تاريخ استيفاء نموذج الطلب والمستندات الداعمة. يمكن تقديم طلب القيد في سجل أعضاء ETEK إلكترونيًا، مع وثائق الهوية والشهادة الجامعية وكشف الدرجات وشهادة إتقان اللغة وشهادة التدريب العملي عند الاقتضاء."
  },
  "de": {
   "q": "Wie lasse ich mich auf Zypern als Ingenieur registrieren?",
   "a": "Zuständig ist die Zyprische Wissenschaftlich-Technische Kammer (ETEK). Voraussetzungen sind ein Diplom, Hochschulabschluss oder eine vergleichbare Qualifikation in einem beliebigen Bereich der Ingenieurwissenschaften, die zypriotische Staatsangehörigkeit, ein in Zypern niedergelassener EU-Bürger oder der Ehegatte eines zypriotischen Staatsbürgers zu sein, ein Alter über 21 Jahre, keine frühere Verurteilung wegen einer Straftat und ausreichende Griechischkenntnisse (für EU-Bürger); für Architektur und Bauingenieurwesen ist ein Jahr praktische Tätigkeit erforderlich. Die Gebühren betragen 55 Euro Registrierungsgebühr pro Fachgebiet, 30 Euro für die jährliche Berufslizenz und 35 Euro (unter 30) bzw. 90 Euro (über 30) Jahresbeitrag. Die Entscheidung ergeht spätestens innerhalb von drei Monaten ab ordnungsgemäßer Einreichung von Antragsformular und Nachweisen. Der Antrag auf Eintragung in das Mitgliederregister der ETEK kann elektronisch gestellt werden, mit Ausweisdokumenten, Hochschulabschluss, Notenspiegel, Sprachnachweis und gegebenenfalls Praktikumsbescheinigung."
  },
  "pl": {
   "q": "Jak zarejestrować się jako inżynier na Cyprze?",
   "a": "Właściwym organem jest Cypryjska Izba Naukowo-Techniczna (ETEK). Wymagania obejmują dyplom, tytuł uniwersytecki lub inną porównywalną kwalifikację w dowolnej dziedzinie nauk inżynierskich, obywatelstwo cypryjskie, bycie obywatelem UE mieszkającym na Cyprze lub małżonkiem obywatela Cypru, wiek powyżej 21 lat, brak wcześniejszego skazania za przestępstwo oraz odpowiednią znajomość języka greckiego (dla obywateli UE); dla architektury i inżynierii lądowej wymagany jest rok pracy praktycznej. Opłaty to opłata rejestracyjna 55 euro za dziedzinę, roczna licencja zawodowa 30 euro i roczna składka 35 euro (poniżej 30 lat) lub 90 euro (powyżej 30 lat). Decyzja zapada najpóźniej w ciągu trzech miesięcy od dnia należytego złożenia formularza i dokumentów. Wniosek o wpis do Rejestru Członków ETEK można złożyć elektronicznie, z dokumentami tożsamości, dyplomem uniwersyteckim, wykazem ocen, certyfikatem znajomości języka i zaświadczeniem o praktyce, jeśli dotyczy."
  },
  "ru": {
   "q": "Как зарегистрироваться инженером на Кипре?",
   "a": "Компетентный орган — Кипрская научно-техническая палата (ETEK). Требования включают диплом или университетскую степень либо иную сопоставимую квалификацию в любой области инженерных наук, гражданство Кипра, статус гражданина ЕС, проживающего на Кипре, или супруга гражданина Кипра, возраст старше 21 года, отсутствие прежней судимости и достаточное знание греческого языка (для граждан ЕС); для архитектуры и гражданского строительства требуется один год практической работы. Сборы — регистрационный сбор 55 евро за направление, ежегодная профессиональная лицензия 30 евро и ежегодный взнос 35 евро (до 30 лет) или 90 евро (старше 30 лет). Решение выносится не позднее трёх месяцев с даты надлежащей подачи формы заявления и подтверждающих документов. Заявление о внесении в Реестр членов ETEK можно подать в электронном виде, с документами, удостоверяющими личность, университетским дипломом, академической справкой, сертификатом владения языком и свидетельством о практической подготовке, где это применимо."
  }
 },
 "lic-contractor": {
  "el": {
   "q": "Πώς αδειοδοτούμαι ως εργολάβος οικοδομικών έργων στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Συμβούλιο Εγγραφής και Ελέγχου Εργοληπτών Οικοδομικών και Τεχνικών Έργων. Οι απαιτήσεις περιλαμβάνουν ιθαγένεια της ΕΕ ή ιδιότητα συζύγου ή τέκνου πολίτη της ΕΕ που διαμένει στην Κύπρο, σωματική και πνευματική ικανότητα για εγγραφή, μη νομική ανικανότητα από δικαστική απόφαση, τεκμηριωμένη ακαδημαϊκή και πρακτική εμπειρία ανά τάξη, εγγραφή στο Επιστημονικό και Τεχνικό Επιμελητήριο Κύπρου για ορισμένα επαγγέλματα, τον απαραίτητο μηχανολογικό εξοπλισμό για την τάξη και μόνιμο τεχνικό και γραμματειακό προσωπικό. Τα τέλη αίτησης είναι 600 ευρώ (Τάξη Α), 450 ευρώ (Τάξη Β), 340 ευρώ (Τάξη Γ), 225 ευρώ (Τάξη Δ) και 180 ευρώ (Τάξη Ε)· το τέλος εγγραφής είναι 200 ευρώ για όλες τις τάξεις· και τα τέλη άδειας και ανανέωσης είναι 490 ευρώ (Α), 330 ευρώ (Β), 245 ευρώ (Γ), 165 ευρώ (Δ) και 80 ευρώ (Ε). Ο αιτών ενημερώνεται για την απόφαση αδειοδότησης εντός τριών μηνών από την ημερομηνία που η αίτηση υποβλήθηκε δεόντως, και η άδεια ισχύει έως τις 31 Δεκεμβρίου του έτους για το οποίο εκδόθηκε. Η αίτηση μπορεί να υποβληθεί μέσω του PSC Κύπρου ή επικοινωνώντας απευθείας με την αρμόδια αρχή στη Λευκωσία."
  },
  "ro": {
   "q": "Cum obțin licența de constructor în Cipru?",
   "a": "Autoritatea competentă este Consiliul pentru Înregistrarea și Controlul Constructorilor de Clădiri și Lucrări de Inginerie Civilă. Cerințele includ cetățenia UE sau calitatea de soț/soție ori copil al unui cetățean UE rezident în Cipru, capacitatea fizică și mentală de a se înregistra, lipsa unei incapacități legale rezultate dintr-o hotărâre judecătorească, experiență academică și practică documentată pe clase, înscrierea în Camera Științifică și Tehnică din Cipru pentru anumite profesii, echipamentul mecanic necesar clasei și personal tehnic și administrativ permanent. Taxele de cerere sunt 600 euro (Clasa A), 450 euro (Clasa B), 340 euro (Clasa C), 225 euro (Clasa D) și 180 euro (Clasa E); taxa de înregistrare este 200 euro pentru toate clasele; iar taxele de licență și reînnoire sunt 490 euro (A), 330 euro (B), 245 euro (C), 165 euro (D) și 80 euro (E). Solicitantul este informat despre decizia de autorizare în termen de trei luni de la data la care cererea a fost depusă corespunzător, iar licența este valabilă până la 31 decembrie a anului pentru care a fost emisă. Cererea se poate depune prin PSC Cyprus sau contactând direct autoritatea competentă din Nicosia."
  },
  "ar": {
   "q": "كيف أحصل على ترخيص مقاول بناء في قبرص؟",
   "a": "الجهة المختصة هي مجلس تسجيل ومراقبة مقاولي المباني والهندسة المدنية. تشمل الشروط الجنسية الأوروبية أو أن يكون زوجًا أو ابنًا لمواطن أوروبي مقيم في قبرص، والقدرة البدنية والعقلية على التسجيل، وعدم وجود عجز قانوني بحكم قضائي، وخبرة أكاديمية وعملية موثَّقة لكل فئة، والتسجيل في الغرفة العلمية والفنية القبرصية لبعض المهن، والمعدات الميكانيكية اللازمة للفئة، وطاقم فني وكتابي دائم. رسوم الطلب 600 يورو (الفئة A) و450 يورو (الفئة B) و340 يورو (الفئة C) و225 يورو (الفئة D) و180 يورو (الفئة E)؛ ورسم التسجيل 200 يورو لجميع الفئات؛ ورسوم الترخيص والتجديد 490 يورو (A) و330 يورو (B) و245 يورو (C) و165 يورو (D) و80 يورو (E). يُبلَّغ المتقدّم بقرار الترخيص خلال ثلاثة أشهر من تاريخ تقديم الطلب على الوجه الصحيح، والترخيص صالح حتى 31 ديسمبر من السنة التي صدر لها. يمكن تقديم الطلب عبر PSC Cyprus أو بالتواصل المباشر مع الجهة المختصة في نيقوسيا."
  },
  "de": {
   "q": "Wie erhalte ich auf Zypern die Lizenz als Bauunternehmer?",
   "a": "Zuständig ist der Rat für die Registrierung und Kontrolle von Hoch- und Tiefbauunternehmern. Voraussetzungen sind die EU-Staatsangehörigkeit oder die Eigenschaft als Ehegatte bzw. Kind eines in Zypern wohnhaften EU-Bürgers, körperliche und geistige Eignung zur Registrierung, keine rechtliche Handlungsunfähigkeit aufgrund einer gerichtlichen Entscheidung, nachgewiesene akademische und praktische Erfahrung je Klasse, die Eintragung in der Zyprischen Wissenschaftlich-Technischen Kammer für bestimmte Berufe, die für die Klasse nötige maschinelle Ausstattung und ständiges technisches Büropersonal. Die Antragsgebühren betragen 600 Euro (Klasse A), 450 Euro (Klasse B), 340 Euro (Klasse C), 225 Euro (Klasse D) und 180 Euro (Klasse E); die Registrierungsgebühr beträgt für alle Klassen 200 Euro; Lizenz- und Verlängerungsgebühren liegen bei 490 Euro (A), 330 Euro (B), 245 Euro (C), 165 Euro (D) und 80 Euro (E). Der Antragsteller wird innerhalb von drei Monaten ab ordnungsgemäßer Antragstellung über die Zulassungsentscheidung informiert; die Lizenz gilt bis zum 31. Dezember des Jahres, für das sie ausgestellt wurde. Der Antrag kann über PSC Cyprus oder durch direkte Kontaktaufnahme mit der zuständigen Behörde in Nikosia gestellt werden."
  },
  "pl": {
   "q": "Jak uzyskać licencję wykonawcy budowlanego na Cyprze?",
   "a": "Właściwym organem jest Rada ds. Rejestracji i Kontroli Wykonawców Budownictwa Ogólnego i Inżynieryjnego. Wymagania obejmują obywatelstwo UE lub bycie małżonkiem albo dzieckiem obywatela UE mieszkającego na Cyprze, sprawność fizyczną i psychiczną do rejestracji, brak niezdolności prawnej wynikającej z orzeczenia sądu, udokumentowane doświadczenie akademickie i praktyczne dla danej klasy, wpis do Cypryjskiej Izby Naukowo-Technicznej dla niektórych zawodów, niezbędny sprzęt mechaniczny dla klasy oraz stały personel techniczny i biurowy. Opłaty za wniosek wynoszą 600 euro (klasa A), 450 euro (klasa B), 340 euro (klasa C), 225 euro (klasa D) i 180 euro (klasa E); opłata rejestracyjna to 200 euro dla wszystkich klas; a opłaty za licencję i odnowienie to 490 euro (A), 330 euro (B), 245 euro (C), 165 euro (D) i 80 euro (E). Wnioskodawca jest informowany o decyzji o udzieleniu zezwolenia w ciągu trzech miesięcy od dnia należytego złożenia wniosku, a licencja jest ważna do 31 grudnia roku, na który została wydana. Wniosek można złożyć przez PSC Cyprus lub kontaktując się bezpośrednio z właściwym organem w Nikozji."
  },
  "ru": {
   "q": "Как получить лицензию строительного подрядчика на Кипре?",
   "a": "Компетентный орган — Совет по регистрации и контролю подрядчиков по строительству зданий и гражданскому строительству. Требования включают гражданство ЕС либо статус супруга или ребёнка гражданина ЕС, проживающего на Кипре, физическую и психическую способность к регистрации, отсутствие правовой недееспособности по судебному решению, документально подтверждённые академический и практический опыт по классам, регистрацию в Кипрской научно-технической палате для некоторых профессий, необходимое механическое оборудование для класса и постоянный технический и канцелярский персонал. Сборы за заявление составляют 600 евро (класс A), 450 евро (класс B), 340 евро (класс C), 225 евро (класс D) и 180 евро (класс E); регистрационный сбор — 200 евро для всех классов; сборы за лицензию и продление — 490 евро (A), 330 евро (B), 245 евро (C), 165 евро (D) и 80 евро (E). Заявитель информируется о решении о выдаче разрешения в течение трёх месяцев с даты надлежащей подачи заявления, а лицензия действует до 31 декабря года, на который она выдана. Заявление можно подать через PSC Cyprus или обратившись непосредственно в компетентный орган в Никосии."
  }
 },
 "lic-electrician": {
  "el": {
   "q": "Ποια άδεια χρειάζομαι για να παρέχω ηλεκτρολογικές υπηρεσίες στην Κύπρο;",
   "a": "Αρμόδια αρχή είναι το Τμήμα Ηλεκτρομηχανολογικών Υπηρεσιών (ΤΗΜΥ) στο Καϊμακλί, Λευκωσία. Οι αιτούντες πρέπει να έχουν τα κατάλληλα εκπαιδευτικά προσόντα και την εμπειρία για τον συγκεκριμένο ηλεκτρολογικό τομέα, να είναι εγγεγραμμένα μέλη του Επιστημονικού και Τεχνικού Επιμελητηρίου Κύπρου (μόνο Ηλεκτρολόγοι Μηχανικοί), να περάσουν τις εξετάσεις του ΤΗΜΥ (μόνο Εργολήπτες και Συντηρητές), να πληρούν τις ελάχιστες απαιτήσεις ηλικίας 21 ετών (Εργολήπτες), 19 (Συντηρητές) ή 18 (Καλωδιωτές), και να έχουν καλή γνώση της ελληνικής γλώσσας. Τα τέλη είναι 30,50 ευρώ για Ηλεκτρολόγους Μηχανικούς, 20,50 ευρώ για Ανώτερους Τεχνολόγους Ηλεκτρολόγους Μηχανικούς, 20,50 ευρώ για Εργολήπτες Ηλεκτρικών Εγκαταστάσεων, 18,50 ευρώ για Συντηρητές Ηλεκτρικού Εξοπλισμού και Συσκευών, 6,50 ευρώ για Καλωδιωτές (Ηλεκτρολόγους) και 8,50 ευρώ για το ετήσιο Πιστοποιητικό Εγγραφής. Η απόφαση κοινοποιείται εντός τριών μηνών από την ημερομηνία που η αίτηση υποβλήθηκε δεόντως, το Πιστοποιητικό Εγγραφής εκδίδεται σε περίπου 15 ημέρες και το Πιστοποιητικό Επάρκειας ισχύει για απεριόριστο χρονικό διάστημα. Οι αιτήσεις μπορούν να υποβληθούν μέσω του PSC Κύπρου ή απευθείας στο Τμήμα ΗΜΥ."
  },
  "ro": {
   "q": "Ce licență îmi trebuie pentru a presta servicii electrice în Cipru?",
   "a": "Autoritatea competentă este Departamentul Serviciilor Electrice și Mecanice (EMS) din Kaimakli, Nicosia. Solicitanții trebuie să aibă pregătirea și experiența corespunzătoare domeniului electric specific, să fie membri înregistrați ai Camerei Științifice și Tehnice din Cipru (doar inginerii electricieni), să promoveze examenele EMS (doar constructorii și întreținătorii), să îndeplinească vârsta minimă de 21 de ani (constructori), 19 (întreținători) sau 18 (cablatori) și să aibă bune cunoștințe de limbă greacă. Taxele sunt 30,50 euro pentru inginerii electricieni, 20,50 euro pentru inginerii tehnicieni electricieni superiori, 20,50 euro pentru constructorii de instalații electrice, 18,50 euro pentru întreținătorii de echipamente și aparate electrice, 6,50 euro pentru cablatori (electricieni) și 8,50 euro pentru Certificatul anual de înregistrare. Decizia este comunicată în trei luni de la data la care cererea a fost depusă corespunzător, Certificatul de înregistrare se eliberează în aproximativ 15 zile, iar Certificatul de competență este valabil pe o perioadă nelimitată. Cererile se pot depune prin PSC Cyprus sau direct la Departamentul EMS."
  },
  "ar": {
   "q": "ما الترخيص الذي أحتاجه لتقديم خدمات كهربائية في قبرص؟",
   "a": "الجهة المختصة هي دائرة الخدمات الكهربائية والميكانيكية (EMS) في كايماكلي بنيقوسيا. يجب أن يكون لدى المتقدّمين الخلفية التعليمية والخبرة المناسبتان للمجال الكهربائي المحدد، وأن يكونوا أعضاء مسجّلين في الغرفة العلمية والفنية القبرصية (للمهندسين الكهربائيين فقط)، وأن يجتازوا امتحانات EMS (للمقاولين وفنيي الصيانة فقط)، وأن يستوفوا الحد الأدنى للعمر: 21 (المقاولون) أو 19 (فنيو الصيانة) أو 18 (فنيو التمديدات)، وأن يتقنوا اللغة اليونانية جيدًا. الرسوم: 30.50 يورو للمهندسين الكهربائيين، و20.50 يورو للمهندسين الفنيين الكهربائيين الأقدم، و20.50 يورو لمقاولي التركيبات الكهربائية، و18.50 يورو لفنيي صيانة المعدات والأجهزة الكهربائية، و6.50 يورو لفنيي التمديدات (الكهربائيين)، و8.50 يورو لشهادة التسجيل السنوية. يُبلَّغ القرار خلال ثلاثة أشهر من تاريخ تقديم الطلب على الوجه الصحيح، وتصدر شهادة التسجيل خلال نحو 15 يومًا، وشهادة الكفاءة صالحة لمدة غير محدودة. يمكن تقديم الطلبات عبر PSC Cyprus أو مباشرة إلى دائرة EMS."
  },
  "de": {
   "q": "Welche Lizenz brauche ich, um auf Zypern elektrische Dienstleistungen zu erbringen?",
   "a": "Zuständig ist das Amt für Elektro- und Maschinendienste (EMS) in Kaimakli, Nikosia. Antragsteller müssen die passende Ausbildung und Erfahrung für das jeweilige elektrotechnische Fachgebiet haben, eingetragenes Mitglied der Zyprischen Wissenschaftlich-Technischen Kammer sein (nur Elektroingenieure), die EMS-Prüfungen bestehen (nur Errichter und Instandhalter), das Mindestalter von 21 (Errichter), 19 (Instandhalter) oder 18 Jahren (Verdrahter) erfüllen und gute Griechischkenntnisse besitzen. Die Gebühren betragen 30,50 Euro für Elektroingenieure, 20,50 Euro für leitende Elektrotechniker-Ingenieure, 20,50 Euro für Errichter elektrischer Anlagen, 18,50 Euro für Instandhalter elektrischer Betriebsmittel und Geräte, 6,50 Euro für Verdrahter (Elektriker) und 8,50 Euro für die jährliche Registrierungsbescheinigung. Die Entscheidung wird innerhalb von drei Monaten ab ordnungsgemäßer Antragstellung mitgeteilt, die Registrierungsbescheinigung wird in etwa 15 Tagen ausgestellt, und das Befähigungszeugnis gilt unbefristet. Anträge können über PSC Cyprus oder direkt beim EMS-Amt gestellt werden."
  },
  "pl": {
   "q": "Jakiej licencji potrzebuję, aby świadczyć usługi elektryczne na Cyprze?",
   "a": "Właściwym organem jest Departament Służb Elektrycznych i Mechanicznych (EMS) w Kaimakli, Nikozja. Wnioskodawcy muszą mieć odpowiednie wykształcenie i doświadczenie w danej dziedzinie elektrycznej, być zarejestrowanymi członkami Cypryjskiej Izby Naukowo-Technicznej (tylko inżynierowie elektrycy), zdać egzaminy EMS (tylko wykonawcy i konserwatorzy), spełnić minimalny wiek 21 lat (wykonawcy), 19 (konserwatorzy) lub 18 (monterzy okablowania) oraz dobrze znać język grecki. Opłaty wynoszą 30,50 euro dla inżynierów elektryków, 20,50 euro dla starszych techników inżynierów elektryków, 20,50 euro dla wykonawców instalacji elektrycznych, 18,50 euro dla konserwatorów sprzętu i urządzeń elektrycznych, 6,50 euro dla monterów okablowania (elektryków) i 8,50 euro za roczne Świadectwo Rejestracji. Decyzja jest zawiadamiana w ciągu trzech miesięcy od dnia należytego złożenia wniosku, Świadectwo Rejestracji wydawane jest w ok. 15 dni, a Świadectwo Kwalifikacji jest ważne bezterminowo. Wnioski można składać przez PSC Cyprus lub bezpośrednio w Departamencie EMS."
  },
  "ru": {
   "q": "Какая лицензия нужна для оказания электротехнических услуг на Кипре?",
   "a": "Компетентный орган — Департамент электромеханических служб (EMS) в Каймаклы, Никосия. Заявители должны иметь соответствующее образование и опыт в конкретной электротехнической области, быть зарегистрированными членами Кипрской научно-технической палаты (только инженеры-электрики), сдать экзамены EMS (только подрядчики и специалисты по обслуживанию), соответствовать минимальному возрасту 21 год (подрядчики), 19 (специалисты по обслуживанию) или 18 (монтажники проводки) и хорошо знать греческий язык. Сборы — 30,50 евро для инженеров-электриков, 20,50 евро для старших инженеров-техников-электриков, 20,50 евро для подрядчиков по электроустановкам, 18,50 евро для специалистов по обслуживанию электрооборудования и приборов, 6,50 евро для монтажников проводки (электриков) и 8,50 евро за ежегодное свидетельство о регистрации. Решение сообщается в течение трёх месяцев с даты надлежащей подачи заявления, свидетельство о регистрации выдаётся примерно за 15 дней, а свидетельство о квалификации действует бессрочно. Заявления можно подавать через PSC Cyprus или непосредственно в Департамент EMS."
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
