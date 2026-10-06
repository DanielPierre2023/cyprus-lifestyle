// lib/activities/pageCopy.ts
// ============================================================================
// Typed UI copy for the public experiences pages (/activities, /activities/browse/…,
// /activities/<slug>) in the seven editions. The catalogue's titles and summaries are
// English only (owner rule: show every page, English when there is no translation), so
// only the LABELS around them are localised here. Pure and client-safe (no server-only
// imports). Client bundles import only lib/activities/uiLabels.ts (nav + 'Book'), never this module.
// messages/*.json is deliberately NOT touched (another agent owns it).
// ============================================================================
import type { Locale } from '@/lib/locales';
import { NAV_LABEL, BOOK_LABEL, experiencesNavLabel } from '@/lib/activities/uiLabels';

export interface ActivitiesCopy {
  nav: string;              // main-nav / breadcrumb label
  title: string;            // index <h1>
  dek: string;              // index intro
  kicker: string;
  filters: string;
  fKind: string; fDistrict: string; fDuration: string; fPrice: string;
  all: string; clear: string;
  durShort: string; durHalf: string; durFull: string;
  count: string;            // {n}
  pageOf: string;           // {p} {n}
  prev: string; next: string;
  empty: string;
  englishNote: string;
  partnerNote: string;      // disclosure, shown wherever a booking link is
  // detail
  details: string;
  place: string; duration: string; price: string; group: string; kind: string; includes: string;
  placeLandmark: string;    // {landmark} {town}
  placeTown: string;        // {town}
  placeNone: string;
  approxNote: string;       // never an exact meeting point
  groupUpTo: string;        // {n}
  priceLevel: string;       // {band}
  priceNote: string;
  book: string;             // booking link label
  bookSmall: string;        // short label on cards (concierge)
  onMap: string;
  northNote: string;        // {site}
  related: string;
  backToAll: string;
  home: string;
}

const EN: ActivitiesCopy = {
  nav: NAV_LABEL.en,
  title: 'Experiences in Cyprus',
  dek: 'Boat trips, diving, jeep safaris, wine and culture tours — our own short guides to bookable experiences across the Republic of Cyprus, each with an honest, approximate place and a booking link to our partner.',
  kicker: 'Cyprus Lifestyle',
  filters: 'Filter experiences',
  fKind: 'Type', fDistrict: 'District', fDuration: 'Duration', fPrice: 'Price level',
  all: 'All', clear: 'Clear filters',
  durShort: 'Up to 2 h', durHalf: '2–5 h', durFull: 'Over 5 h',
  count: '{n} experiences',
  pageOf: 'Page {p} of {n}',
  prev: 'Previous', next: 'Next',
  empty: 'No experiences match these filters.',
  englishNote: 'Titles and descriptions are in English; the page labels follow your language.',
  partnerNote: 'Partner link to GetYourGuide — we may earn a commission, at no extra cost to you.',
  details: 'At a glance',
  place: 'Place', duration: 'Duration', price: 'Price level', group: 'Group size', kind: 'Type', includes: 'Good to know',
  placeLandmark: 'Around {landmark} ({town}) — approximate area',
  placeTown: 'Departs from the {town} area — approximate area',
  placeNone: 'Location confirmed when you book',
  approxNote: 'The place shown is an approximate area, not an exact meeting point. The meeting point is confirmed on the booking page.',
  groupUpTo: 'Up to {n} people',
  priceLevel: '{band}',
  priceNote: 'Indicative price level only. The live price and availability are confirmed on the booking page.',
  book: 'Book on GetYourGuide',
  bookSmall: BOOK_LABEL.en,
  onMap: 'See these experiences on the map',
  northNote: 'This tour includes visits to sites in the north of the island ({site}), which is not under the control of the Republic of Cyprus government. Check crossing and insurance conditions with the operator before you book.',
  related: 'More experiences nearby',
  backToAll: 'All experiences',
  home: 'Cyprus Lifestyle',
};

export const ACTIVITIES_COPY: Record<Locale, ActivitiesCopy> = {
  en: EN,
  el: {
    nav: NAV_LABEL.el,
    title: 'Εμπειρίες στην Κύπρο',
    dek: 'Εκδρομές με σκάφος, καταδύσεις, σαφάρι με τζιπ, περιηγήσεις κρασιού και πολιτισμού — δικοί μας σύντομοι οδηγοί για εμπειρίες με κράτηση σε όλη την Κυπριακή Δημοκρατία, με ειλικρινή, κατά προσέγγιση τοποθεσία και σύνδεσμο κράτησης στον συνεργάτη μας.',
    kicker: 'Cyprus Lifestyle',
    filters: 'Φίλτρα εμπειριών',
    fKind: 'Είδος', fDistrict: 'Επαρχία', fDuration: 'Διάρκεια', fPrice: 'Επίπεδο τιμής',
    all: 'Όλα', clear: 'Καθαρισμός φίλτρων',
    durShort: 'Έως 2 ώρες', durHalf: '2–5 ώρες', durFull: 'Πάνω από 5 ώρες',
    count: '{n} εμπειρίες',
    pageOf: 'Σελίδα {p} από {n}',
    prev: 'Προηγούμενη', next: 'Επόμενη',
    empty: 'Καμία εμπειρία δεν ταιριάζει με αυτά τα φίλτρα.',
    englishNote: 'Οι τίτλοι και οι περιγραφές είναι στα αγγλικά· οι ετικέτες της σελίδας ακολουθούν τη γλώσσα σας.',
    partnerNote: 'Σύνδεσμος συνεργάτη προς το GetYourGuide — ενδέχεται να λάβουμε προμήθεια, χωρίς επιπλέον κόστος για εσάς.',
    details: 'Με μια ματιά',
    place: 'Τοποθεσία', duration: 'Διάρκεια', price: 'Επίπεδο τιμής', group: 'Μέγεθος ομάδας', kind: 'Είδος', includes: 'Καλό να γνωρίζετε',
    placeLandmark: 'Γύρω από {landmark} ({town}) — κατά προσέγγιση περιοχή',
    placeTown: 'Αναχώρηση από την περιοχή {town} — κατά προσέγγιση περιοχή',
    placeNone: 'Η τοποθεσία επιβεβαιώνεται κατά την κράτηση',
    approxNote: 'Η τοποθεσία που εμφανίζεται είναι κατά προσέγγιση περιοχή και όχι ακριβές σημείο συνάντησης. Το σημείο συνάντησης επιβεβαιώνεται στη σελίδα κράτησης.',
    groupUpTo: 'Έως {n} άτομα',
    priceLevel: '{band}',
    priceNote: 'Ενδεικτικό επίπεδο τιμής μόνο. Η τρέχουσα τιμή και η διαθεσιμότητα επιβεβαιώνονται στη σελίδα κράτησης.',
    book: 'Κράτηση στο GetYourGuide',
    bookSmall: BOOK_LABEL.el,
    onMap: 'Δείτε αυτές τις εμπειρίες στον χάρτη',
    northNote: 'Η εκδρομή περιλαμβάνει επισκέψεις σε τοποθεσίες στα βόρεια του νησιού ({site}), που δεν βρίσκονται υπό τον έλεγχο της κυβέρνησης της Κυπριακής Δημοκρατίας. Ελέγξτε με τον διοργανωτή τους όρους διέλευσης και ασφάλισης πριν κλείσετε.',
    related: 'Περισσότερες εμπειρίες κοντά',
    backToAll: 'Όλες οι εμπειρίες',
    home: 'Cyprus Lifestyle',
  },
  ro: {
    nav: NAV_LABEL.ro,
    title: 'Experiențe în Cipru',
    dek: 'Excursii cu barca, scufundări, safari cu jeep-ul, tururi de vin și de cultură — ghidurile noastre scurte despre experiențe care se pot rezerva în Republica Cipru, cu un loc aproximativ, spus cinstit, și un link de rezervare la partenerul nostru.',
    kicker: 'Cyprus Lifestyle',
    filters: 'Filtrează experiențele',
    fKind: 'Tip', fDistrict: 'District', fDuration: 'Durată', fPrice: 'Nivel de preț',
    all: 'Toate', clear: 'Șterge filtrele',
    durShort: 'Până la 2 h', durHalf: '2–5 h', durFull: 'Peste 5 h',
    count: '{n} experiențe',
    pageOf: 'Pagina {p} din {n}',
    prev: 'Înapoi', next: 'Înainte',
    empty: 'Nicio experiență nu se potrivește cu aceste filtre.',
    englishNote: 'Titlurile și descrierile sunt în engleză; etichetele paginii urmează limba ta.',
    partnerNote: 'Link de partener către GetYourGuide — putem primi un comision, fără costuri suplimentare pentru tine.',
    details: 'Pe scurt',
    place: 'Loc', duration: 'Durată', price: 'Nivel de preț', group: 'Mărimea grupului', kind: 'Tip', includes: 'Bine de știut',
    placeLandmark: 'În jurul {landmark} ({town}) — zonă aproximativă',
    placeTown: 'Plecare din zona {town} — zonă aproximativă',
    placeNone: 'Locul se confirmă la rezervare',
    approxNote: 'Locul afișat este o zonă aproximativă, nu un punct exact de întâlnire. Punctul de întâlnire se confirmă pe pagina de rezervare.',
    groupUpTo: 'Până la {n} persoane',
    priceLevel: '{band}',
    priceNote: 'Doar un nivel de preț orientativ. Prețul actual și disponibilitatea se confirmă pe pagina de rezervare.',
    book: 'Rezervă pe GetYourGuide',
    bookSmall: BOOK_LABEL.ro,
    onMap: 'Vezi aceste experiențe pe hartă',
    northNote: 'Turul include vizite în locuri din nordul insulei ({site}), care nu se află sub controlul guvernului Republicii Cipru. Verifică la organizator condițiile de trecere și de asigurare înainte de a rezerva.',
    related: 'Mai multe experiențe în apropiere',
    backToAll: 'Toate experiențele',
    home: 'Cyprus Lifestyle',
  },
  ar: {
    nav: NAV_LABEL.ar,
    title: 'تجارب في قبرص',
    dek: 'رحلات بحرية وغوص وسفاري بالجيب وجولات النبيذ والثقافة — أدلتنا القصيرة لتجارب قابلة للحجز في جمهورية قبرص، مع مكان تقريبي صادق ورابط حجز لدى شريكنا.',
    kicker: 'Cyprus Lifestyle',
    filters: 'تصفية التجارب',
    fKind: 'النوع', fDistrict: 'المنطقة', fDuration: 'المدة', fPrice: 'مستوى السعر',
    all: 'الكل', clear: 'مسح عوامل التصفية',
    durShort: 'حتى ساعتين', durHalf: '2–5 ساعات', durFull: 'أكثر من 5 ساعات',
    count: '{n} تجربة',
    pageOf: 'الصفحة {p} من {n}',
    prev: 'السابق', next: 'التالي',
    empty: 'لا توجد تجارب تطابق عوامل التصفية هذه.',
    englishNote: 'العناوين والأوصاف بالإنجليزية؛ أما تسميات الصفحة فتتبع لغتك.',
    partnerNote: 'رابط شريك إلى GetYourGuide — قد نحصل على عمولة دون أي تكلفة إضافية عليك.',
    details: 'لمحة سريعة',
    place: 'المكان', duration: 'المدة', price: 'مستوى السعر', group: 'حجم المجموعة', kind: 'النوع', includes: 'من المفيد معرفته',
    placeLandmark: 'حول {landmark} ({town}) — منطقة تقريبية',
    placeTown: 'الانطلاق من منطقة {town} — منطقة تقريبية',
    placeNone: 'يُؤكَّد المكان عند الحجز',
    approxNote: 'المكان المعروض منطقة تقريبية وليس نقطة لقاء دقيقة. تُؤكَّد نقطة اللقاء في صفحة الحجز.',
    groupUpTo: 'حتى {n} أشخاص',
    priceLevel: '{band}',
    priceNote: 'مستوى سعر استرشادي فقط. يُؤكَّد السعر الحالي والتوفر في صفحة الحجز.',
    book: 'احجز عبر GetYourGuide',
    bookSmall: BOOK_LABEL.ar,
    onMap: 'شاهد هذه التجارب على الخريطة',
    northNote: 'تشمل هذه الجولة زيارات إلى مواقع في شمال الجزيرة ({site})، وهو ليس تحت سيطرة حكومة جمهورية قبرص. تحقق من شروط العبور والتأمين لدى المنظّم قبل الحجز.',
    related: 'المزيد من التجارب القريبة',
    backToAll: 'كل التجارب',
    home: 'Cyprus Lifestyle',
  },
  de: {
    nav: NAV_LABEL.de,
    title: 'Erlebnisse auf Zypern',
    dek: 'Bootsausflüge, Tauchen, Jeep-Safaris, Wein- und Kulturtouren — unsere eigenen Kurzporträts buchbarer Erlebnisse in der Republik Zypern, jeweils mit ehrlicher, ungefährer Ortsangabe und einem Buchungslink zu unserem Partner.',
    kicker: 'Cyprus Lifestyle',
    filters: 'Erlebnisse filtern',
    fKind: 'Art', fDistrict: 'Bezirk', fDuration: 'Dauer', fPrice: 'Preisniveau',
    all: 'Alle', clear: 'Filter zurücksetzen',
    durShort: 'Bis 2 Std.', durHalf: '2–5 Std.', durFull: 'Über 5 Std.',
    count: '{n} Erlebnisse',
    pageOf: 'Seite {p} von {n}',
    prev: 'Zurück', next: 'Weiter',
    empty: 'Keine Erlebnisse für diese Filter.',
    englishNote: 'Titel und Beschreibungen sind auf Englisch; die Seitenbeschriftungen folgen Ihrer Sprache.',
    partnerNote: 'Partnerlink zu GetYourGuide — wir erhalten ggf. eine Provision, für Sie ohne Mehrkosten.',
    details: 'Auf einen Blick',
    place: 'Ort', duration: 'Dauer', price: 'Preisniveau', group: 'Gruppengröße', kind: 'Art', includes: 'Gut zu wissen',
    placeLandmark: 'Rund um {landmark} ({town}) — ungefähre Gegend',
    placeTown: 'Start im Raum {town} — ungefähre Gegend',
    placeNone: 'Ort wird bei der Buchung bestätigt',
    approxNote: 'Der angezeigte Ort ist eine ungefähre Gegend, kein genauer Treffpunkt. Den Treffpunkt bestätigt die Buchungsseite.',
    groupUpTo: 'Bis zu {n} Personen',
    priceLevel: '{band}',
    priceNote: 'Nur ein Richtwert für das Preisniveau. Aktueller Preis und Verfügbarkeit werden auf der Buchungsseite bestätigt.',
    book: 'Bei GetYourGuide buchen',
    bookSmall: BOOK_LABEL.de,
    onMap: 'Diese Erlebnisse auf der Karte ansehen',
    northNote: 'Diese Tour umfasst Besuche an Orten im Norden der Insel ({site}), der nicht unter der Kontrolle der Regierung der Republik Zypern steht. Klären Sie Grenzübertritt und Versicherung vor der Buchung mit dem Veranstalter.',
    related: 'Weitere Erlebnisse in der Nähe',
    backToAll: 'Alle Erlebnisse',
    home: 'Cyprus Lifestyle',
  },
  pl: {
    nav: NAV_LABEL.pl,
    title: 'Atrakcje na Cyprze',
    dek: 'Rejsy łodzią, nurkowanie, safari jeepami, wycieczki winne i kulturalne — nasze własne krótkie opisy atrakcji do zarezerwowania w Republice Cypryjskiej, każda z uczciwie podanym, przybliżonym miejscem i linkiem rezerwacyjnym do naszego partnera.',
    kicker: 'Cyprus Lifestyle',
    filters: 'Filtruj atrakcje',
    fKind: 'Rodzaj', fDistrict: 'Dystrykt', fDuration: 'Czas trwania', fPrice: 'Poziom cen',
    all: 'Wszystkie', clear: 'Wyczyść filtry',
    durShort: 'Do 2 godz.', durHalf: '2–5 godz.', durFull: 'Ponad 5 godz.',
    count: 'Atrakcji: {n}',
    pageOf: 'Strona {p} z {n}',
    prev: 'Poprzednia', next: 'Następna',
    empty: 'Brak atrakcji pasujących do tych filtrów.',
    englishNote: 'Tytuły i opisy są po angielsku; etykiety strony są w Twoim języku.',
    partnerNote: 'Link partnerski do GetYourGuide — możemy otrzymać prowizję, bez dodatkowych kosztów dla Ciebie.',
    details: 'W skrócie',
    place: 'Miejsce', duration: 'Czas trwania', price: 'Poziom cen', group: 'Wielkość grupy', kind: 'Rodzaj', includes: 'Warto wiedzieć',
    placeLandmark: 'W okolicy: {landmark} ({town}) — obszar przybliżony',
    placeTown: 'Wyjazd z okolic: {town} — obszar przybliżony',
    placeNone: 'Miejsce potwierdzane przy rezerwacji',
    approxNote: 'Pokazane miejsce to obszar przybliżony, a nie dokładny punkt zbiórki. Punkt zbiórki potwierdza strona rezerwacji.',
    groupUpTo: 'Do {n} osób',
    priceLevel: '{band}',
    priceNote: 'Tylko orientacyjny poziom cen. Aktualna cena i dostępność są potwierdzane na stronie rezerwacji.',
    book: 'Zarezerwuj w GetYourGuide',
    bookSmall: BOOK_LABEL.pl,
    onMap: 'Zobacz te atrakcje na mapie',
    northNote: 'Wycieczka obejmuje odwiedziny w miejscach na północy wyspy ({site}), która nie jest pod kontrolą rządu Republiki Cypryjskiej. Przed rezerwacją sprawdź u organizatora warunki przekraczania granicy i ubezpieczenia.',
    related: 'Więcej atrakcji w pobliżu',
    backToAll: 'Wszystkie atrakcje',
    home: 'Cyprus Lifestyle',
  },
  ru: {
    nav: NAV_LABEL.ru,
    title: 'Впечатления на Кипре',
    dek: 'Морские прогулки, дайвинг, джип-сафари, винные и культурные туры — наши собственные краткие описания впечатлений с бронированием в Республике Кипр: с честным, примерным местом и ссылкой на бронирование у нашего партнёра.',
    kicker: 'Cyprus Lifestyle',
    filters: 'Фильтр впечатлений',
    fKind: 'Тип', fDistrict: 'Район', fDuration: 'Длительность', fPrice: 'Уровень цен',
    all: 'Все', clear: 'Сбросить фильтры',
    durShort: 'До 2 ч', durHalf: '2–5 ч', durFull: 'Более 5 ч',
    count: 'Впечатлений: {n}',
    pageOf: 'Страница {p} из {n}',
    prev: 'Назад', next: 'Вперёд',
    empty: 'Нет впечатлений, подходящих под эти фильтры.',
    englishNote: 'Названия и описания на английском; подписи на странице — на вашем языке.',
    partnerNote: 'Партнёрская ссылка на GetYourGuide — мы можем получить комиссию без доплаты с вашей стороны.',
    details: 'Коротко',
    place: 'Место', duration: 'Длительность', price: 'Уровень цен', group: 'Размер группы', kind: 'Тип', includes: 'Полезно знать',
    placeLandmark: 'Район: {landmark} ({town}) — примерная зона',
    placeTown: 'Отправление из района {town} — примерная зона',
    placeNone: 'Место подтверждается при бронировании',
    approxNote: 'Указанное место — примерная зона, а не точка встречи. Точку встречи подтверждает страница бронирования.',
    groupUpTo: 'До {n} человек',
    priceLevel: '{band}',
    priceNote: 'Только ориентировочный уровень цен. Актуальная цена и наличие мест подтверждаются на странице бронирования.',
    book: 'Забронировать на GetYourGuide',
    bookSmall: BOOK_LABEL.ru,
    onMap: 'Посмотреть эти впечатления на карте',
    northNote: 'Тур включает посещение мест на севере острова ({site}), который не находится под контролем правительства Республики Кипр. Перед бронированием уточните у организатора условия пересечения и страховки.',
    related: 'Ещё впечатления рядом',
    backToAll: 'Все впечатления',
    home: 'Cyprus Lifestyle',
  },
};

export const activitiesCopy = (locale: string): ActivitiesCopy => (ACTIVITIES_COPY as Record<string, ActivitiesCopy>)[locale] || EN;
export { experiencesNavLabel };

/** '{n}' / '{p}' placeholders. */
export function fill(tpl: string, vars: Record<string, string | number>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : ''));
}

// ── district + tag labels ────────────────────────────────────────────────────
export const DISTRICT_LABELS: Record<string, Record<Locale, string>> = {
  nicosia:   { en: 'Nicosia', el: 'Λευκωσία', ro: 'Nicosia', ar: 'نيقوسيا', de: 'Nikosia', pl: 'Nikozja', ru: 'Никосия' },
  limassol:  { en: 'Limassol', el: 'Λεμεσός', ro: 'Limassol', ar: 'ليماسول', de: 'Limassol', pl: 'Limassol', ru: 'Лимасол' },
  larnaca:   { en: 'Larnaca', el: 'Λάρνακα', ro: 'Larnaca', ar: 'لارنكا', de: 'Larnaka', pl: 'Larnaka', ru: 'Ларнака' },
  paphos:    { en: 'Paphos', el: 'Πάφος', ro: 'Paphos', ar: 'بافوس', de: 'Paphos', pl: 'Pafos', ru: 'Пафос' },
  famagusta: { en: 'Famagusta district', el: 'Επαρχία Αμμοχώστου', ro: 'Districtul Famagusta', ar: 'منطقة فاماغوستا', de: 'Bezirk Famagusta', pl: 'Dystrykt Famagusta', ru: 'Район Фамагусты' },
};
export const districtName = (key: string | null | undefined, locale: string): string => {
  const d = key ? DISTRICT_LABELS[key] : null;
  return d ? (d as Record<string, string>)[locale] || d.en : '';
};

export const TAG_LABELS: Record<string, Record<Locale, string>> = {
  pickup:      { en: 'Pickup available', el: 'Διαθέσιμη παραλαβή', ro: 'Preluare disponibilă', ar: 'خدمة الاستقبال متاحة', de: 'Abholung möglich', pl: 'Odbiór możliwy', ru: 'Возможен трансфер' },
  private:     { en: 'Private option', el: 'Ιδιωτική επιλογή', ro: 'Variantă privată', ar: 'خيار خاص', de: 'Private Option', pl: 'Opcja prywatna', ru: 'Частный вариант' },
  'small-group': { en: 'Small group', el: 'Μικρή ομάδα', ro: 'Grup mic', ar: 'مجموعة صغيرة', de: 'Kleine Gruppe', pl: 'Mała grupa', ru: 'Малая группа' },
  meal:        { en: 'Meal included', el: 'Περιλαμβάνεται γεύμα', ro: 'Masă inclusă', ar: 'وجبة مشمولة', de: 'Mahlzeit inklusive', pl: 'Posiłek w cenie', ru: 'Питание включено' },
  family:      { en: 'Family-friendly', el: 'Κατάλληλο για οικογένειες', ro: 'Potrivit pentru familii', ar: 'مناسب للعائلات', de: 'Familienfreundlich', pl: 'Dla rodzin', ru: 'Для семей' },
  sunset:      { en: 'Sunset', el: 'Ηλιοβασίλεμα', ro: 'Apus', ar: 'غروب الشمس', de: 'Sonnenuntergang', pl: 'Zachód słońca', ru: 'Закат' },
  sunrise:     { en: 'Sunrise', el: 'Ανατολή', ro: 'Răsărit', ar: 'شروق الشمس', de: 'Sonnenaufgang', pl: 'Wschód słońca', ru: 'Рассвет' },
  romantic:    { en: 'Romantic', el: 'Ρομαντικό', ro: 'Romantic', ar: 'رومانسي', de: 'Romantisch', pl: 'Romantyczne', ru: 'Романтика' },
  beginners:   { en: 'Beginners welcome', el: 'Κατάλληλο για αρχάριους', ro: 'Începători bineveniți', ar: 'مرحّب بالمبتدئين', de: 'Auch für Anfänger', pl: 'Dla początkujących', ru: 'Подходит новичкам' },
  'adults-only': { en: 'Adults only', el: 'Μόνο για ενήλικες', ro: 'Doar adulți', ar: 'للبالغين فقط', de: 'Nur für Erwachsene', pl: 'Tylko dla dorosłych', ru: 'Только для взрослых' },
  'certified-divers': { en: 'Certified divers', el: 'Πιστοποιημένοι δύτες', ro: 'Scafandri certificați', ar: 'غواصون معتمدون', de: 'Zertifizierte Taucher', pl: 'Certyfikowani nurkowie', ru: 'Дайверы с сертификатом' },
  'multi-day': { en: 'Multi-day', el: 'Πολυήμερο', ro: 'Mai multe zile', ar: 'عدة أيام', de: 'Mehrtägig', pl: 'Kilkudniowe', ru: 'Несколько дней' },
  morning:     { en: 'Morning', el: 'Πρωί', ro: 'Dimineață', ar: 'صباحًا', de: 'Vormittags', pl: 'Rano', ru: 'Утро' },
  evening:     { en: 'Evening', el: 'Βράδυ', ro: 'Seară', ar: 'مساءً', de: 'Abends', pl: 'Wieczór', ru: 'Вечер' },
};
/** Localised labels for the tags we have wording for (unknown / duration-ish tags are skipped). */
export function tagLabels(tags: string[] | null | undefined, locale: string): string[] {
  const out: string[] = [];
  for (const t of tags || []) {
    const l = TAG_LABELS[t];
    if (l) out.push((l as Record<string, string>)[locale] || l.en);
  }
  return out;
}
