// lib/map/explorer-i18n.ts
// The map explorer's interface text in all seven languages, plus a helper that
// merges it with the strings that already live in messages/*.json (next-intl) and
// the directory map's action labels (lib/directory/map-meta.ts → bizLabels).
// Pure data — shared by /map and /directory so both render identical copy.
import { bizLabels } from '@/lib/directory/map-meta';

export type MapUiKey = 'results' | 'fullscreen' | 'closeMap' | 'locate' | 'zoomIn' | 'zoomOut' | 'showMore' | 'showLess' | 'save' | 'close'
  | 'filters' | 'resetAll' | 'showResults' | 'clear' | 'startTime' | 'morning' | 'afternoon' | 'evening' | 'when' | 'today' | 'weekend' | 'week' | 'month'
  | 'places' | 'categories' | 'interests' | 'price' | 'features' | 'rating' | 'featured' | 'verified' | 'luxury' | 'withPhoto' | 'saved'
  | 'all' | 'businesses' | 'searchAddress' | 'viewProfile' | 'loading' | 'partner' | 'profile' | 'from'
  | 'book' | 'approx' | 'partnerNote' | 'pickup' | 'meal' | 'smallGroup' | 'privateGroup' | 'family' | 'adults' | 'sunset' | 'beginners';

export const MAP_UI: Record<string, Record<MapUiKey, string>> = {
  en: { book: 'Book on GetYourGuide', approx: 'Approximate area — the exact meeting point comes with your booking', partnerNote: 'Partner link: we may earn a commission, at no extra cost to you.', pickup: 'Pickup available', meal: 'Meal included', smallGroup: 'Small group', privateGroup: 'Private group', family: 'Good for families', adults: 'Adults only', sunset: 'Sunset', beginners: 'No experience needed',
    all: 'All', businesses: 'Businesses', searchAddress: 'Search this address', viewProfile: 'View profile', loading: 'Loading the map…', partner: 'Recommended', profile: 'Full profile', from: 'From',
    results: 'results', fullscreen: 'Full screen', closeMap: 'Close map', locate: 'Show my location', zoomIn: 'Zoom in', zoomOut: 'Zoom out', showMore: 'Show more', showLess: 'Show less', save: 'Save', close: 'Close',
    filters: 'Filters', resetAll: 'Reset all', showResults: 'Show {n} results', clear: 'Clear', startTime: 'Start time', morning: 'Morning, before 12 PM', afternoon: 'Afternoon, after 12 PM', evening: 'Evening, after 5 PM', when: 'When', today: 'Today', weekend: 'This weekend', week: 'Next 7 days', month: 'Next 30 days',
    places: 'Places', categories: 'Categories', interests: 'Interests', price: 'Price', features: 'Features', rating: 'Star rating', featured: 'Featured', verified: 'Verified', luxury: 'Luxury collection', withPhoto: 'With photo', saved: 'Saved' },
  el: { book: 'Κράτηση στο GetYourGuide', approx: 'Κατά προσέγγιση περιοχή — το ακριβές σημείο συνάντησης δίνεται με την κράτηση', partnerNote: 'Σύνδεσμος συνεργάτη: ενδέχεται να λάβουμε προμήθεια, χωρίς επιπλέον κόστος για εσάς.', pickup: 'Παραλαβή διαθέσιμη', meal: 'Περιλαμβάνεται γεύμα', smallGroup: 'Μικρή ομάδα', privateGroup: 'Ιδιωτική ομάδα', family: 'Ιδανικό για οικογένειες', adults: 'Μόνο για ενήλικες', sunset: 'Ηλιοβασίλεμα', beginners: 'Δεν απαιτείται εμπειρία',
    all: 'Όλα', businesses: 'Επιχειρήσεις', searchAddress: 'Αναζήτηση αυτής της διεύθυνσης', viewProfile: 'Προβολή προφίλ', loading: 'Φόρτωση χάρτη…', partner: 'Προτεινόμενο', profile: 'Πλήρες προφίλ', from: 'Από',
    results: 'αποτελέσματα', fullscreen: 'Πλήρης οθόνη', closeMap: 'Κλείσιμο χάρτη', locate: 'Η τοποθεσία μου', zoomIn: 'Μεγέθυνση', zoomOut: 'Σμίκρυνση', showMore: 'Περισσότερα', showLess: 'Λιγότερα', save: 'Αποθήκευση', close: 'Κλείσιμο',
    filters: 'Φίλτρα', resetAll: 'Επαναφορά', showResults: 'Εμφάνιση {n} αποτελεσμάτων', clear: 'Καθαρισμός', startTime: 'Ώρα έναρξης', morning: 'Πρωί, πριν τις 12:00', afternoon: 'Απόγευμα, μετά τις 12:00', evening: 'Βράδυ, μετά τις 17:00', when: 'Πότε', today: 'Σήμερα', weekend: 'Αυτό το Σαββατοκύριακο', week: 'Επόμενες 7 ημέρες', month: 'Επόμενες 30 ημέρες',
    places: 'Περιοχές', categories: 'Κατηγορίες', interests: 'Ενδιαφέροντα', price: 'Τιμή', features: 'Χαρακτηριστικά', rating: 'Βαθμολογία', featured: 'Προτεινόμενα', verified: 'Επαληθευμένα', luxury: 'Συλλογή πολυτελείας', withPhoto: 'Με φωτογραφία', saved: 'Αποθηκευμένα' },
  ro: { book: 'Rezervă pe GetYourGuide', approx: 'Zonă aproximativă — punctul exact de întâlnire vine odată cu rezervarea', partnerNote: 'Link de partener: putem primi un comision, fără costuri suplimentare pentru tine.', pickup: 'Preluare disponibilă', meal: 'Masă inclusă', smallGroup: 'Grup mic', privateGroup: 'Grup privat', family: 'Potrivit pentru familii', adults: 'Doar adulți', sunset: 'Apus', beginners: 'Nu necesită experiență',
    all: 'Toate', businesses: 'Afaceri', searchAddress: 'Caută această adresă', viewProfile: 'Vezi profilul', loading: 'Se încarcă harta…', partner: 'Recomandat', profile: 'Profil complet', from: 'De la',
    results: 'rezultate', fullscreen: 'Ecran complet', closeMap: 'Închide harta', locate: 'Locația mea', zoomIn: 'Mărește', zoomOut: 'Micșorează', showMore: 'Arată mai mult', showLess: 'Arată mai puțin', save: 'Salvează', close: 'Închide',
    filters: 'Filtre', resetAll: 'Resetează tot', showResults: 'Arată {n} rezultate', clear: 'Șterge', startTime: 'Ora de începere', morning: 'Dimineața, înainte de 12:00', afternoon: 'După-amiaza, după 12:00', evening: 'Seara, după 17:00', when: 'Când', today: 'Azi', weekend: 'Weekendul acesta', week: 'Următoarele 7 zile', month: 'Următoarele 30 de zile',
    places: 'Locuri', categories: 'Categorii', interests: 'Interese', price: 'Preț', features: 'Caracteristici', rating: 'Rating', featured: 'Recomandate', verified: 'Verificate', luxury: 'Colecția de lux', withPhoto: 'Cu fotografie', saved: 'Salvate' },
  ar: { book: 'احجز على GetYourGuide', approx: 'منطقة تقريبية — يصلك مكان اللقاء الدقيق مع الحجز', partnerNote: 'رابط شريك: قد نحصل على عمولة دون أي تكلفة إضافية عليك.', pickup: 'خدمة التوصيل متاحة', meal: 'يشمل وجبة', smallGroup: 'مجموعة صغيرة', privateGroup: 'مجموعة خاصة', family: 'مناسب للعائلات', adults: 'للبالغين فقط', sunset: 'غروب الشمس', beginners: 'لا تتطلب خبرة',
    all: 'الكل', businesses: 'الأعمال', searchAddress: 'ابحث عن هذا العنوان', viewProfile: 'عرض الملف', loading: 'جارٍ تحميل الخريطة…', partner: 'موصى به', profile: 'ملف كامل', from: 'من',
    results: 'نتيجة', fullscreen: 'ملء الشاشة', closeMap: 'إغلاق الخريطة', locate: 'موقعي', zoomIn: 'تكبير', zoomOut: 'تصغير', showMore: 'عرض المزيد', showLess: 'عرض أقل', save: 'حفظ', close: 'إغلاق',
    filters: 'عوامل التصفية', resetAll: 'إعادة تعيين الكل', showResults: 'عرض {n} نتيجة', clear: 'مسح', startTime: 'وقت البدء', morning: 'صباحًا، قبل 12 ظهرًا', afternoon: 'بعد الظهر، بعد 12 ظهرًا', evening: 'مساءً، بعد 5 مساءً', when: 'متى', today: 'اليوم', weekend: 'عطلة نهاية الأسبوع', week: 'الأيام السبعة القادمة', month: 'الأيام الثلاثون القادمة',
    places: 'الأماكن', categories: 'الفئات', interests: 'الاهتمامات', price: 'السعر', features: 'الميزات', rating: 'التقييم', featured: 'مميز', verified: 'موثّق', luxury: 'المجموعة الفاخرة', withPhoto: 'مع صورة', saved: 'المحفوظات' },
  de: { book: 'Bei GetYourGuide buchen', approx: 'Ungefähre Gegend — den genauen Treffpunkt erhalten Sie mit der Buchung', partnerNote: 'Partnerlink: Wir erhalten ggf. eine Provision – für Sie ohne Mehrkosten.', pickup: 'Abholung möglich', meal: 'Mahlzeit inklusive', smallGroup: 'Kleingruppe', privateGroup: 'Private Gruppe', family: 'Familienfreundlich', adults: 'Nur für Erwachsene', sunset: 'Sonnenuntergang', beginners: 'Keine Vorkenntnisse nötig',
    all: 'Alle', businesses: 'Unternehmen', searchAddress: 'Diese Adresse suchen', viewProfile: 'Profil ansehen', loading: 'Karte wird geladen…', partner: 'Empfohlen', profile: 'Vollständiges Profil', from: 'Ab',
    results: 'Ergebnisse', fullscreen: 'Vollbild', closeMap: 'Karte schließen', locate: 'Mein Standort', zoomIn: 'Vergrößern', zoomOut: 'Verkleinern', showMore: 'Mehr anzeigen', showLess: 'Weniger anzeigen', save: 'Merken', close: 'Schließen',
    filters: 'Filter', resetAll: 'Alle zurücksetzen', showResults: '{n} Ergebnisse anzeigen', clear: 'Löschen', startTime: 'Startzeit', morning: 'Morgens, vor 12 Uhr', afternoon: 'Nachmittags, nach 12 Uhr', evening: 'Abends, nach 17 Uhr', when: 'Wann', today: 'Heute', weekend: 'Dieses Wochenende', week: 'Nächste 7 Tage', month: 'Nächste 30 Tage',
    places: 'Orte', categories: 'Kategorien', interests: 'Interessen', price: 'Preis', features: 'Merkmale', rating: 'Bewertung', featured: 'Empfohlen', verified: 'Verifiziert', luxury: 'Luxus-Kollektion', withPhoto: 'Mit Foto', saved: 'Gemerkt' },
  pl: { book: 'Zarezerwuj w GetYourGuide', approx: 'Przybliżony obszar — dokładne miejsce zbiórki otrzymasz z rezerwacją', partnerNote: 'Link partnerski: możemy otrzymać prowizję, bez dodatkowych kosztów dla Ciebie.', pickup: 'Odbiór z hotelu', meal: 'Posiłek w cenie', smallGroup: 'Mała grupa', privateGroup: 'Grupa prywatna', family: 'Dla rodzin', adults: 'Tylko dla dorosłych', sunset: 'Zachód słońca', beginners: 'Bez doświadczenia',
    all: 'Wszystkie', businesses: 'Firmy', searchAddress: 'Szukaj tego adresu', viewProfile: 'Zobacz profil', loading: 'Ładowanie mapy…', partner: 'Polecane', profile: 'Pełny profil', from: 'Od',
    results: 'wyników', fullscreen: 'Pełny ekran', closeMap: 'Zamknij mapę', locate: 'Moja lokalizacja', zoomIn: 'Powiększ', zoomOut: 'Pomniejsz', showMore: 'Pokaż więcej', showLess: 'Pokaż mniej', save: 'Zapisz', close: 'Zamknij',
    filters: 'Filtry', resetAll: 'Wyczyść wszystko', showResults: 'Pokaż {n} wyników', clear: 'Wyczyść', startTime: 'Godzina rozpoczęcia', morning: 'Rano, przed 12:00', afternoon: 'Po południu, po 12:00', evening: 'Wieczorem, po 17:00', when: 'Kiedy', today: 'Dziś', weekend: 'Ten weekend', week: 'Najbliższe 7 dni', month: 'Najbliższe 30 dni',
    places: 'Miejsca', categories: 'Kategorie', interests: 'Zainteresowania', price: 'Cena', features: 'Cechy', rating: 'Ocena', featured: 'Polecane', verified: 'Zweryfikowane', luxury: 'Kolekcja luksusowa', withPhoto: 'Ze zdjęciem', saved: 'Zapisane' },
  ru: { book: 'Забронировать на GetYourGuide', approx: 'Примерный район — точное место встречи придёт с бронированием', partnerNote: 'Партнёрская ссылка: мы можем получить комиссию без доплаты с вашей стороны.', pickup: 'Трансфер из отеля', meal: 'Питание включено', smallGroup: 'Небольшая группа', privateGroup: 'Частная группа', family: 'Для семей', adults: 'Только для взрослых', sunset: 'Закат', beginners: 'Опыт не нужен',
    all: 'Все', businesses: 'Компании', searchAddress: 'Найти этот адрес', viewProfile: 'Открыть профиль', loading: 'Загрузка карты…', partner: 'Рекомендуем', profile: 'Полный профиль', from: 'От',
    results: 'результатов', fullscreen: 'Во весь экран', closeMap: 'Закрыть карту', locate: 'Моё местоположение', zoomIn: 'Приблизить', zoomOut: 'Отдалить', showMore: 'Показать ещё', showLess: 'Свернуть', save: 'Сохранить', close: 'Закрыть',
    filters: 'Фильтры', resetAll: 'Сбросить всё', showResults: 'Показать {n} результатов', clear: 'Очистить', startTime: 'Время начала', morning: 'Утром, до 12:00', afternoon: 'Днём, после 12:00', evening: 'Вечером, после 17:00', when: 'Когда', today: 'Сегодня', weekend: 'В эти выходные', week: 'Ближайшие 7 дней', month: 'Ближайшие 30 дней',
    places: 'Места', categories: 'Категории', interests: 'Интересы', price: 'Цена', features: 'Особенности', rating: 'Рейтинг', featured: 'Рекомендуемые', verified: 'Проверенные', luxury: 'Коллекция люкс', withPhoto: 'С фото', saved: 'Сохранённые' },
};

/** Strings the explorer takes from messages/*.json — pass `t` from next-intl. */
type T = (key: string) => string;

export interface ExplorerUi extends Record<MapUiKey, string> {
  search: string; inView: string; noMatches: string; mapAria: string; live: string; watchLive: string;
  reviews: string; view: string; events: string; call: string; website: string; directions: string;
}

export function explorerUi(locale: string, t: T): ExplorerUi {
  const biz = bizLabels(locale);
  return {
    ...(MAP_UI[locale] || MAP_UI.en),
    search: t('directory.searchPlaces'), inView: t('directory.inView'), noMatches: t('directory.noMatches'),
    mapAria: t('directory.mapAria'), live: t('nav.live'), watchLive: t('live.watchLive'),
    reviews: t('directory.reviews'), view: t('directory.view'), events: t('nav.agenda'),
    call: biz.call, website: biz.website, directions: biz.directions,
  };
}
