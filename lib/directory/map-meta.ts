// lib/directory/map-meta.ts
// ============================================================================
// Pure, dependency-free metadata for the interactive directory map:
//   • one emoji icon per canonical category (map pins + sidebar), and
//   • the map's UI microcopy per locale (so no message-file edits are needed).
// No I/O and no server-only imports, so BOTH the server page and the client map
// component can import it safely. Unknown categories fall back to a pin.
// ============================================================================

export interface BizLabels {
  title: string; subtitle: string; searchPh: string; inView: string;
  loading: string; none: string; choose: string;
  call: string; email: string; website: string; directions: string;
}

// A sidebar category, resolved on the server: canonical key + label + icon + count.
export interface BizCategory { k: string; label: string; icon: string; count: number }

export const CATEGORY_ICON: Record<string, string> = {
  restaurant: '🍽️', hotel: '🏨', 'car-parts': '🔩', accountant: '🧮', 'marketing-agency': '📣',
  builder: '🏗️', 'doctor-clinic': '🩺', 'law-firm': '⚖️', 'business-consultant': '💼',
  'furniture-homeware': '🛋️', architect: '📐', 'real-estate-agency': '🏠', school: '🎓',
  'web-it': '💻', pharmacy: '💊', 'car-repair-garage': '🛠️', 'beauty-spa': '💆',
  'fashion-clothing': '👗', 'car-rental': '🚗', 'tour-activity': '🧭', electronics: '🔌',
  physiotherapy: '💪', 'gym-fitness': '🏋️', dentist: '🦷', photographer: '📷',
  'gift-souvenir': '🎁', 'sports-shop': '⚽', 'hair-barber': '💈', 'taxi-transfer': '🚕',
  bar: '🍸', 'event-venue': '🎪', 'pet-shop': '🐾', 'deli-gourmet': '🧀',
  'tutoring-language': '📚', beach: '⛱️', cafe: '☕', 'ac-hvac': '❄️', electrician: '⚡',
  insurance: '🛡️', supermarket: '🛒', 'cleaning-service': '🧹', bakery: '🥖', winery: '🍷',
  optician: '👓', 'bookshop-stationery': '📖', printing: '🖨️', museum: '🏛️', footwear: '👟',
  'archaeological-site': '🏺',
  'yacht-boat-charter': '⛵', 'surveyor-engineer': '📏', florist: '💐', 'nursery-childcare': '🧸',
  patisserie: '🧁', jewellery: '💍', 'street-food-kiosk': '🌭', greengrocer: '🥬',
  'solar-installer': '☀️', 'theatre-arts': '🎭', 'property-developer': '🏘️', 'tyre-service': '🛞',
  'company-formation': '🏢', 'laundry-drycleaner': '🧺', 'diving-centre': '🤿',
  'gardener-landscaper': '🌳', tailor: '🧵', bank: '🏦', 'apartment-rental': '🔑',
  painter: '🎨', veterinary: '🐕', 'tattoo-piercing': '🖋️', nightclub: '🪩', plumber: '🚰',
  hospital: '🏥', 'appliance-repair': '🧰', 'pool-service': '🏊', handyman: '🔨',
  'mover-removals': '📦', carpenter: '🪚', 'pest-control': '🐜', 'villa-rental': '🏡',
  agrotourism: '🌾', 'yoga-pilates': '🧘', 'immigration-adviser': '🛂', butcher: '🥩',
  'driving-school': '🚦', 'nail-salon': '💅', locksmith: '🗝️', 'general-vendor': '📍',
};

export function categoryIcon(key: string | null | undefined): string {
  return (key && CATEGORY_ICON[key]) || '📍';
}

const EN: BizLabels = {
  title: 'Business map',
  subtitle: 'Pick a category, then drag the map to your area.',
  searchPh: 'Search a category…',
  inView: 'shown', loading: 'Loading…',
  none: 'No businesses in this category yet.', choose: 'Choose a category',
  call: 'Call', email: 'Email', website: 'Website', directions: 'Directions',
};

export const BIZMAP_LABELS: Record<string, BizLabels> = {
  en: EN,
  el: {
    title: 'Χάρτης επιχειρήσεων',
    subtitle: 'Διάλεξε κατηγορία και σύρε τον χάρτη στην περιοχή σου.',
    searchPh: 'Αναζήτηση κατηγορίας…',
    inView: 'εμφανίζονται', loading: 'Φόρτωση…',
    none: 'Δεν υπάρχουν ακόμη επιχειρήσεις σε αυτή την κατηγορία.', choose: 'Διάλεξε κατηγορία',
    call: 'Κλήση', email: 'Email', website: 'Ιστότοπος', directions: 'Οδηγίες',
  },
  ro: {
    title: 'Harta afacerilor',
    subtitle: 'Alege o categorie, apoi trage harta spre zona ta.',
    searchPh: 'Caută o categorie…',
    inView: 'afișate', loading: 'Se încarcă…',
    none: 'Încă nu există afaceri în această categorie.', choose: 'Alege o categorie',
    call: 'Sună', email: 'Email', website: 'Site web', directions: 'Direcții',
  },
  ar: {
    title: 'خريطة الأعمال',
    subtitle: 'اختر فئة، ثم اسحب الخريطة إلى منطقتك.',
    searchPh: 'ابحث عن فئة…',
    inView: 'معروضة', loading: 'جارٍ التحميل…',
    none: 'لا توجد أعمال في هذه الفئة بعد.', choose: 'اختر فئة',
    call: 'اتصال', email: 'بريد إلكتروني', website: 'الموقع', directions: 'الاتجاهات',
  },
  de: {
    title: 'Firmenkarte',
    subtitle: 'Wähle eine Kategorie und zieh die Karte zu deiner Gegend.',
    searchPh: 'Kategorie suchen…',
    inView: 'angezeigt', loading: 'Wird geladen…',
    none: 'Noch keine Unternehmen in dieser Kategorie.', choose: 'Kategorie wählen',
    call: 'Anrufen', email: 'E-Mail', website: 'Website', directions: 'Route',
  },
  pl: {
    title: 'Mapa firm',
    subtitle: 'Wybierz kategorię i przeciągnij mapę do swojej okolicy.',
    searchPh: 'Szukaj kategorii…',
    inView: 'pokazano', loading: 'Ładowanie…',
    none: 'Brak firm w tej kategorii.', choose: 'Wybierz kategorię',
    call: 'Zadzwoń', email: 'E-mail', website: 'Strona', directions: 'Trasa',
  },
  ru: {
    title: 'Карта бизнесов',
    subtitle: 'Выберите категорию и перетащите карту к своему району.',
    searchPh: 'Поиск категории…',
    inView: 'показано', loading: 'Загрузка…',
    none: 'В этой категории пока нет компаний.', choose: 'Выберите категорию',
    call: 'Позвонить', email: 'Эл. почта', website: 'Сайт', directions: 'Маршрут',
  },
};

export function bizLabels(locale: string): BizLabels {
  return BIZMAP_LABELS[locale] || EN;
}
