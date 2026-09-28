// lib/directory/map-meta.ts
// ============================================================================
// Pure, dependency-free metadata for the interactive directory map:
//   • a classy line icon (SVG) per canonical category — used on the map pins and
//     in the sidebar (NOT emoji),
//   • the category name translated per locale, and
//   • the map's own UI microcopy per locale.
// No I/O / server-only imports, so both the server page and the client map can
// import it. Unknown categories fall back to a pin icon and the English label.
// ============================================================================

export interface BizLabels {
  title: string; subtitle: string; searchPh: string; inView: string;
  loading: string; none: string; choose: string;
  call: string; email: string; website: string; directions: string;
}

// A sidebar category, resolved on the server: canonical key + label + icon + count.
// `icon` holds the SVG inner markup (paths), rendered by the client.
export interface BizCategory { k: string; label: string; icon: string; count: number }

// ---- Line icons (24×24 inner SVG, stroked with currentColor) ----------------
// Clean single-line pictograms — the "dark badge + white icon" look, not emoji.
const ICONS: Record<string, string> = {
  pin: '<path d="M12 22c4.6-5.3 7-8.9 7-12a7 7 0 1 0-14 0c0 3.1 2.4 6.7 7 12z"/><circle cx="12" cy="10" r="2.4"/>',
  utensils: '<path d="M7 2v20"/><path d="M4 2v5a3 3 0 0 0 6 0V2"/><path d="M17.5 2C15.5 3.8 15 6 15 8.2c0 1.6 1 2.6 2.5 2.6V22"/>',
  cup: '<path d="M5 8h11v5a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8z"/><path d="M16 9h2.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8 2v2M11 2v2"/>',
  glass: '<path d="M5 4h14l-7 8v8"/><path d="M8 20h8"/>',
  wine: '<path d="M8 3h8s0 7-4 7-4-7-4-7z"/><path d="M12 10v8"/><path d="M8 21h8"/>',
  cart: '<circle cx="9" cy="20" r="1.4"/><circle cx="17" cy="20" r="1.4"/><path d="M3 4h2l2.2 11.2a1.5 1.5 0 0 0 1.5 1.2h8.1a1.5 1.5 0 0 0 1.5-1.2L21 8H6"/>',
  bed: '<path d="M3 18V8M3 12h18v6M21 18v-4"/><path d="M6 12V9h5v3"/>',
  wrench: '<path d="M15 4a4 4 0 0 0-5 5l-6 6 3 3 6-6a4 4 0 0 0 5-5l-2.5 2.5-2-2L16.5 5z"/>',
  scales: '<path d="M12 4v16M6 20h12M4 7h16M12 4l-.01 0"/><path d="M4 7l-2 6a3 2.4 0 0 0 6 0z"/><path d="M20 7l-2 6a3 2.4 0 0 0 6 0z"/>',
  calc: '<rect x="6" y="3" width="12" height="18" rx="1.5"/><rect x="8.5" y="5.5" width="7" height="3" rx="0.5"/><path d="M9 12h.01M12 12h.01M15 12h.01M9 15h.01M12 15h.01M15 15h.01M9 18h.01M12 18h.01"/>',
  bank: '<path d="M3 10l9-6 9 6"/><path d="M4 10h16"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/><path d="M3 20h18"/>',
  shield: '<path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z"/>',
  briefcase: '<rect x="3" y="8" width="18" height="12" rx="2"/><path d="M9 8V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  home: '<path d="M4 11l8-7 8 7"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  ruler: '<path d="M4 16L16 4l4 4L8 20z"/><path d="M8.5 7.5l1.5 1.5M11 5l1.5 1.5M6 10l1.5 1.5"/>',
  laptop: '<rect x="4" y="5" width="16" height="11" rx="1.5"/><path d="M2 20h20"/>',
  medical: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.6"/>',
  paw: '<circle cx="7" cy="9" r="1.6"/><circle cx="12" cy="7" r="1.7"/><circle cx="17" cy="9" r="1.6"/><path d="M8.5 15c0-2 1.6-3.5 3.5-3.5S15.5 13 15.5 15c0 1.7-1.6 2-3.5 2s-3.5-.3-3.5-2z"/>',
  scissors: '<circle cx="6" cy="6" r="2.2"/><circle cx="6" cy="18" r="2.2"/><path d="M8 7.5l12 9M8 16.5l12-9"/>',
  spa: '<path d="M12 3c1.6 2 1.6 4 0 6-1.6-2-1.6-4 0-6z"/><path d="M12 9c2.6 0 4.5 1.9 4.5 4.5S14.6 18 12 18s-4.5-1.9-4.5-4.5S9.4 9 12 9z"/><path d="M12 18v3"/>',
  dumbbell: '<path d="M4 9v6M6.5 7v10M17.5 7v10M20 9v6M6.5 12h11"/>',
  car: '<path d="M4 15l1.4-4.2A2 2 0 0 1 7.3 9.4h9.4a2 2 0 0 1 1.9 1.4L20 15v3H4z"/><path d="M4 15h16"/><circle cx="7.5" cy="18" r="1.4"/><circle cx="16.5" cy="18" r="1.4"/>',
  boat: '<path d="M3 17h18l-3 4H6z"/><path d="M12 3v10"/><path d="M12 5l7 8H5z"/>',
  shirt: '<path d="M8 3l4 3 4-3 4 4-3 3v11H7V10L4 7z"/>',
  gem: '<path d="M6 3h12l3 6-9 12L3 9z"/><path d="M3 9h18M9 3l-3 6 6 12 6-12-3-6"/>',
  sofa: '<path d="M4 12V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3"/><path d="M3 12a2 2 0 0 1 2 2v3h14v-3a2 2 0 0 1 2-2 2 2 0 0 0-2 2v-2"/><path d="M5 17v2M19 17v2"/>',
  book: '<path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2z"/><path d="M5 18a2 2 0 0 1 2-2h11"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1"/><path d="M4 13h16M12 9v11"/><path d="M12 9S10.5 4 8 5s0 4 4 4c4 0 6.5-3 4-4s-4 4-4 4z"/>',
  ball: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5c3 3 3 14 0 17M12 3.5c-3 3-3 14 0 17M3.6 10h16.8M4.5 15h15"/>',
  cap: '<path d="M12 4l10 4-10 4L2 8z"/><path d="M6 10v5c0 1.5 3 2.5 6 2.5s6-1 6-2.5v-5"/><path d="M22 8v5"/>',
  landmark: '<path d="M3 21h18M4 10h16M5 21V10M9 21V10M15 21V10M19 21V10M3 10l9-6 9 6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
  umbrella: '<path d="M12 3a9 5.5 0 0 1 9 5.5H3A9 5.5 0 0 1 12 3z"/><path d="M12 8.5V19a2.5 2.5 0 0 1-5 0"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v4M16 3v4"/>',
  camera: '<rect x="3" y="7" width="18" height="13" rx="2"/><circle cx="12" cy="13.5" r="3.2"/><path d="M8 7l1.5-2.5h5L16 7"/>',
  washer: '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="13" r="4.5"/><path d="M7 6h.01M10 6h.01"/>',
  printer: '<path d="M6 9V4h12v5"/><rect x="4" y="9" width="16" height="7" rx="1.5"/><path d="M7 16h10v4H7z"/><path d="M17 12h.01"/>',
};

// Which icon each canonical category uses.
const ICON_OF: Record<string, string> = {
  restaurant: 'utensils', 'street-food-kiosk': 'utensils', 'deli-gourmet': 'utensils',
  cafe: 'cup', bakery: 'cup', patisserie: 'cup',
  bar: 'glass', nightclub: 'glass', winery: 'wine',
  supermarket: 'cart', greengrocer: 'cart', butcher: 'cart',
  hotel: 'bed', 'apartment-rental': 'bed', 'villa-rental': 'bed', agrotourism: 'bed',
  plumber: 'wrench', electrician: 'wrench', 'ac-hvac': 'wrench', 'solar-installer': 'wrench',
  locksmith: 'wrench', painter: 'wrench', carpenter: 'wrench', builder: 'wrench', handyman: 'wrench',
  'cleaning-service': 'wrench', 'pest-control': 'wrench', 'gardener-landscaper': 'wrench',
  'pool-service': 'wrench', 'mover-removals': 'wrench', 'appliance-repair': 'wrench', 'tyre-service': 'wrench',
  'law-firm': 'scales', accountant: 'calc', bank: 'bank', insurance: 'shield',
  'business-consultant': 'briefcase', 'company-formation': 'briefcase', 'immigration-adviser': 'briefcase',
  'marketing-agency': 'briefcase',
  'real-estate-agency': 'home', 'property-developer': 'home',
  architect: 'ruler', 'surveyor-engineer': 'ruler',
  'web-it': 'laptop', electronics: 'laptop',
  'doctor-clinic': 'medical', hospital: 'medical', pharmacy: 'medical', physiotherapy: 'medical', dentist: 'medical',
  optician: 'eye', veterinary: 'paw', 'pet-shop': 'paw',
  'hair-barber': 'scissors', tailor: 'scissors',
  'beauty-spa': 'spa', 'nail-salon': 'spa', 'tattoo-piercing': 'spa', florist: 'spa',
  'gym-fitness': 'dumbbell', 'yoga-pilates': 'dumbbell',
  'car-rental': 'car', 'car-repair-garage': 'car', 'car-parts': 'car', 'taxi-transfer': 'car', 'driving-school': 'car',
  'yacht-boat-charter': 'boat', 'diving-centre': 'boat',
  'fashion-clothing': 'shirt', footwear: 'shirt', jewellery: 'gem', 'furniture-homeware': 'sofa',
  'bookshop-stationery': 'book', 'gift-souvenir': 'gift', 'sports-shop': 'ball',
  school: 'cap', 'nursery-childcare': 'cap', 'tutoring-language': 'cap',
  museum: 'landmark', 'archaeological-site': 'landmark', 'theatre-arts': 'landmark',
  'tour-activity': 'compass', beach: 'umbrella', 'event-venue': 'calendar',
  photographer: 'camera', 'laundry-drycleaner': 'washer', printing: 'printer',
  'general-vendor': 'pin',
};

export function categoryIcon(key: string | null | undefined): string {
  const k = (key && ICON_OF[key]) || 'pin';
  return ICONS[k] || ICONS.pin;
}

// ---- Category names, per locale ---------------------------------------------
// English is taken from lib/directory/taxonomy.ts (categoryLabel); the maps below
// add the six other locales. Anything missing falls back to English, then the key.
const EN: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Café', bakery: 'Bakery', patisserie: 'Patisserie', bar: 'Bar / pub',
  nightclub: 'Nightclub', 'street-food-kiosk': 'Street food', winery: 'Winery', 'deli-gourmet': 'Deli / gourmet',
  butcher: 'Butcher', greengrocer: 'Greengrocer', supermarket: 'Supermarket', hotel: 'Hotel / resort',
  'apartment-rental': 'Short-stay apartments', 'villa-rental': 'Villa rental', agrotourism: 'Agrotourism',
  plumber: 'Plumber', electrician: 'Electrician', 'ac-hvac': 'Air-conditioning / HVAC', 'solar-installer': 'Solar / photovoltaic',
  locksmith: 'Locksmith', painter: 'Painter / decorator', carpenter: 'Carpenter', builder: 'Builder / contractor',
  handyman: 'Handyman', 'cleaning-service': 'Cleaning service', 'pest-control': 'Pest control',
  'gardener-landscaper': 'Gardening / landscaping', 'pool-service': 'Pool maintenance', 'mover-removals': 'Movers / removals',
  'appliance-repair': 'Appliance repair', 'law-firm': 'Lawyer / law firm', accountant: 'Accountant / auditor',
  bank: 'Bank', insurance: 'Insurance', 'business-consultant': 'Business consultant', 'company-formation': 'Company formation',
  'immigration-adviser': 'Immigration adviser', 'real-estate-agency': 'Estate agent', 'property-developer': 'Property developer',
  architect: 'Architect', 'surveyor-engineer': 'Surveyor / engineer', 'marketing-agency': 'Marketing / advertising',
  'web-it': 'Web / IT services', 'doctor-clinic': 'Doctor / clinic', hospital: 'Hospital', dentist: 'Dentist',
  pharmacy: 'Pharmacy', physiotherapy: 'Physiotherapy', optician: 'Optician', veterinary: 'Vet / animal clinic',
  'hair-barber': 'Hairdresser / barber', 'beauty-spa': 'Beauty salon / spa', 'nail-salon': 'Nail salon',
  'tattoo-piercing': 'Tattoo / piercing', 'gym-fitness': 'Gym / fitness', 'yoga-pilates': 'Yoga / pilates',
  'car-rental': 'Car rental', 'car-repair-garage': 'Car repair / garage', 'tyre-service': 'Tyres / MOT',
  'car-parts': 'Car / auto parts', 'taxi-transfer': 'Taxi / transfer', 'driving-school': 'Driving school',
  'yacht-boat-charter': 'Yacht / boat charter', 'fashion-clothing': 'Fashion / clothing', jewellery: 'Jewellery',
  footwear: 'Shoes / footwear', 'furniture-homeware': 'Furniture / homeware', electronics: 'Electronics',
  'bookshop-stationery': 'Bookshop / stationery', florist: 'Florist', 'gift-souvenir': 'Gifts / souvenirs',
  'sports-shop': 'Sports / outdoor shop', 'pet-shop': 'Pet shop', museum: 'Museum / gallery',
  'archaeological-site': 'Heritage site', 'theatre-arts': 'Theatre / arts', 'tour-activity': 'Tours / activities',
  'diving-centre': 'Diving / watersports', beach: 'Beach', 'event-venue': 'Event venue', school: 'School',
  'nursery-childcare': 'Nursery / childcare', 'tutoring-language': 'Tutoring / languages', photographer: 'Photographer',
  'laundry-drycleaner': 'Laundry / dry cleaner', tailor: 'Tailor / alterations', printing: 'Printing / signage',
  'general-vendor': 'Other / general',
};

const EL: Record<string, string> = {
  restaurant: 'Εστιατόριο', cafe: 'Καφετέρια', bakery: 'Φούρνος', patisserie: 'Ζαχαροπλαστείο', bar: 'Μπαρ',
  nightclub: 'Νυχτερινό κέντρο', 'street-food-kiosk': 'Στριτ φουντ', winery: 'Οινοποιείο', 'deli-gourmet': 'Ντελικατέσεν',
  butcher: 'Κρεοπωλείο', greengrocer: 'Μανάβικο', supermarket: 'Σούπερ μάρκετ', hotel: 'Ξενοδοχείο',
  'apartment-rental': 'Ενοικιαζόμενα διαμερίσματα', 'villa-rental': 'Ενοικίαση βίλας', agrotourism: 'Αγροτουρισμός',
  plumber: 'Υδραυλικός', electrician: 'Ηλεκτρολόγος', 'ac-hvac': 'Κλιματισμός', 'solar-installer': 'Φωτοβολταϊκά',
  locksmith: 'Κλειδαράς', painter: 'Ελαιοχρωματιστής', carpenter: 'Ξυλουργός', builder: 'Εργολάβος',
  handyman: 'Μερεμέτια', 'cleaning-service': 'Καθαρισμοί', 'pest-control': 'Απεντόμωση',
  'gardener-landscaper': 'Κηπουρική', 'pool-service': 'Συντήρηση πισίνας', 'mover-removals': 'Μεταφορές',
  'appliance-repair': 'Επισκευή συσκευών', 'law-firm': 'Δικηγόρος', accountant: 'Λογιστής',
  bank: 'Τράπεζα', insurance: 'Ασφάλειες', 'business-consultant': 'Σύμβουλος επιχειρήσεων', 'company-formation': 'Σύσταση εταιρειών',
  'immigration-adviser': 'Σύμβουλος μετανάστευσης', 'real-estate-agency': 'Κτηματομεσίτης', 'property-developer': 'Κατασκευαστής ακινήτων',
  architect: 'Αρχιτέκτονας', 'surveyor-engineer': 'Πολιτικός μηχανικός', 'marketing-agency': 'Διαφήμιση / μάρκετινγκ',
  'web-it': 'Υπηρεσίες IT', 'doctor-clinic': 'Ιατρός / κλινική', hospital: 'Νοσοκομείο', dentist: 'Οδοντίατρος',
  pharmacy: 'Φαρμακείο', physiotherapy: 'Φυσιοθεραπεία', optician: 'Οπτικός', veterinary: 'Κτηνίατρος',
  'hair-barber': 'Κομμωτήριο / κουρείο', 'beauty-spa': 'Ινστιτούτο ομορφιάς / σπα', 'nail-salon': 'Νύχια',
  'tattoo-piercing': 'Τατουάζ / πίρσινγκ', 'gym-fitness': 'Γυμναστήριο', 'yoga-pilates': 'Γιόγκα / πιλάτες',
  'car-rental': 'Ενοικίαση αυτοκινήτων', 'car-repair-garage': 'Συνεργείο αυτοκινήτων', 'tyre-service': 'Ελαστικά / ΚΤΕΟ',
  'car-parts': 'Ανταλλακτικά αυτοκινήτων', 'taxi-transfer': 'Ταξί / μεταφορές', 'driving-school': 'Σχολή οδηγών',
  'yacht-boat-charter': 'Ενοικίαση σκαφών', 'fashion-clothing': 'Ένδυση / μόδα', jewellery: 'Κοσμηματοπωλείο',
  footwear: 'Υποδήματα', 'furniture-homeware': 'Έπιπλα / είδη σπιτιού', electronics: 'Ηλεκτρονικά',
  'bookshop-stationery': 'Βιβλιοπωλείο / χαρτικά', florist: 'Ανθοπωλείο', 'gift-souvenir': 'Δώρα / σουβενίρ',
  'sports-shop': 'Είδη αθλητισμού', 'pet-shop': 'Κατάστημα κατοικιδίων', museum: 'Μουσείο / γκαλερί',
  'archaeological-site': 'Αρχαιολογικός χώρος', 'theatre-arts': 'Θέατρο / τέχνες', 'tour-activity': 'Εκδρομές / δραστηριότητες',
  'diving-centre': 'Καταδύσεις / θαλάσσια σπορ', beach: 'Παραλία', 'event-venue': 'Χώρος εκδηλώσεων', school: 'Σχολείο',
  'nursery-childcare': 'Παιδικός σταθμός', 'tutoring-language': 'Φροντιστήριο / γλώσσες', photographer: 'Φωτογράφος',
  'laundry-drycleaner': 'Πλυντήριο / καθαριστήριο', tailor: 'Ράφτης', printing: 'Εκτυπώσεις / επιγραφές',
  'general-vendor': 'Άλλο / γενικά',
};

const RO: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Cafenea', bakery: 'Brutărie', patisserie: 'Cofetărie', bar: 'Bar / pub',
  nightclub: 'Club de noapte', 'street-food-kiosk': 'Street food', winery: 'Cramă', 'deli-gourmet': 'Delicatese',
  butcher: 'Măcelărie', greengrocer: 'Aprozar', supermarket: 'Supermarket', hotel: 'Hotel / resort',
  'apartment-rental': 'Apartamente în regim hotelier', 'villa-rental': 'Închiriere vilă', agrotourism: 'Agroturism',
  plumber: 'Instalator', electrician: 'Electrician', 'ac-hvac': 'Aer condiționat / HVAC', 'solar-installer': 'Panouri solare',
  locksmith: 'Lăcătuș', painter: 'Zugrav', carpenter: 'Tâmplar', builder: 'Constructor',
  handyman: 'Meseriaș', 'cleaning-service': 'Servicii de curățenie', 'pest-control': 'Dezinsecție',
  'gardener-landscaper': 'Grădinărit / peisagistică', 'pool-service': 'Întreținere piscine', 'mover-removals': 'Mutări / transport',
  'appliance-repair': 'Reparații electrocasnice', 'law-firm': 'Avocat / casă de avocatură', accountant: 'Contabil / auditor',
  bank: 'Bancă', insurance: 'Asigurări', 'business-consultant': 'Consultant de afaceri', 'company-formation': 'Înființări firme',
  'immigration-adviser': 'Consultant imigrări', 'real-estate-agency': 'Agent imobiliar', 'property-developer': 'Dezvoltator imobiliar',
  architect: 'Arhitect', 'surveyor-engineer': 'Inginer / topograf', 'marketing-agency': 'Marketing / publicitate',
  'web-it': 'Servicii web / IT', 'doctor-clinic': 'Medic / clinică', hospital: 'Spital', dentist: 'Dentist',
  pharmacy: 'Farmacie', physiotherapy: 'Fizioterapie', optician: 'Optică', veterinary: 'Veterinar',
  'hair-barber': 'Coafor / frizerie', 'beauty-spa': 'Salon de înfrumusețare / spa', 'nail-salon': 'Salon de unghii',
  'tattoo-piercing': 'Tatuaje / piercing', 'gym-fitness': 'Sală de fitness', 'yoga-pilates': 'Yoga / pilates',
  'car-rental': 'Închirieri auto', 'car-repair-garage': 'Service auto', 'tyre-service': 'Vulcanizare / ITP',
  'car-parts': 'Piese auto', 'taxi-transfer': 'Taxi / transfer', 'driving-school': 'Școală de șoferi',
  'yacht-boat-charter': 'Închiriere ambarcațiuni', 'fashion-clothing': 'Modă / îmbrăcăminte', jewellery: 'Bijuterii',
  footwear: 'Încălțăminte', 'furniture-homeware': 'Mobilă / decorațiuni', electronics: 'Electronice',
  'bookshop-stationery': 'Librărie / papetărie', florist: 'Florărie', 'gift-souvenir': 'Cadouri / suveniruri',
  'sports-shop': 'Magazin sportiv', 'pet-shop': 'Magazin animale', museum: 'Muzeu / galerie',
  'archaeological-site': 'Sit istoric', 'theatre-arts': 'Teatru / arte', 'tour-activity': 'Excursii / activități',
  'diving-centre': 'Scufundări / sporturi nautice', beach: 'Plajă', 'event-venue': 'Locație evenimente', school: 'Școală',
  'nursery-childcare': 'Creșă / grădiniță', 'tutoring-language': 'Meditații / limbi străine', photographer: 'Fotograf',
  'laundry-drycleaner': 'Spălătorie / curățătorie', tailor: 'Croitorie', printing: 'Tipografie / semnalistică',
  'general-vendor': 'Altele / general',
};

const AR: Record<string, string> = {
  restaurant: 'مطعم', cafe: 'مقهى', bakery: 'مخبز', patisserie: 'حلويات', bar: 'بار',
  nightclub: 'نادٍ ليلي', 'street-food-kiosk': 'أكل الشارع', winery: 'مصنع نبيذ', 'deli-gourmet': 'أطعمة فاخرة',
  butcher: 'ملحمة', greengrocer: 'خضار وفواكه', supermarket: 'سوبر ماركت', hotel: 'فندق / منتجع',
  'apartment-rental': 'شقق للإيجار القصير', 'villa-rental': 'إيجار فيلا', agrotourism: 'سياحة ريفية',
  plumber: 'سباك', electrician: 'كهربائي', 'ac-hvac': 'تكييف', 'solar-installer': 'طاقة شمسية',
  locksmith: 'أقفال ومفاتيح', painter: 'دهان', carpenter: 'نجار', builder: 'مقاول بناء',
  handyman: 'صيانة عامة', 'cleaning-service': 'خدمات تنظيف', 'pest-control': 'مكافحة حشرات',
  'gardener-landscaper': 'تنسيق حدائق', 'pool-service': 'صيانة مسابح', 'mover-removals': 'نقل عفش',
  'appliance-repair': 'تصليح أجهزة', 'law-firm': 'محامٍ / مكتب محاماة', accountant: 'محاسب / مدقق',
  bank: 'بنك', insurance: 'تأمين', 'business-consultant': 'استشاري أعمال', 'company-formation': 'تأسيس شركات',
  'immigration-adviser': 'استشاري هجرة', 'real-estate-agency': 'وكيل عقاري', 'property-developer': 'مطوّر عقاري',
  architect: 'مهندس معماري', 'surveyor-engineer': 'مهندس مدني / مساح', 'marketing-agency': 'تسويق / إعلان',
  'web-it': 'خدمات ويب / تقنية', 'doctor-clinic': 'طبيب / عيادة', hospital: 'مستشفى', dentist: 'طبيب أسنان',
  pharmacy: 'صيدلية', physiotherapy: 'علاج طبيعي', optician: 'نظارات', veterinary: 'طبيب بيطري',
  'hair-barber': 'حلاق / تصفيف شعر', 'beauty-spa': 'صالون تجميل / سبا', 'nail-salon': 'العناية بالأظافر',
  'tattoo-piercing': 'وشم / ثقب', 'gym-fitness': 'نادٍ رياضي', 'yoga-pilates': 'يوغا / بيلاتس',
  'car-rental': 'تأجير سيارات', 'car-repair-garage': 'ورشة سيارات', 'tyre-service': 'إطارات / فحص',
  'car-parts': 'قطع غيار سيارات', 'taxi-transfer': 'تاكسي / نقل', 'driving-school': 'مدرسة قيادة',
  'yacht-boat-charter': 'تأجير يخوت وقوارب', 'fashion-clothing': 'أزياء / ملابس', jewellery: 'مجوهرات',
  footwear: 'أحذية', 'furniture-homeware': 'أثاث / مستلزمات منزل', electronics: 'إلكترونيات',
  'bookshop-stationery': 'مكتبة / قرطاسية', florist: 'محل زهور', 'gift-souvenir': 'هدايا / تذكارات',
  'sports-shop': 'متجر رياضي', 'pet-shop': 'متجر حيوانات أليفة', museum: 'متحف / معرض',
  'archaeological-site': 'موقع أثري', 'theatre-arts': 'مسرح / فنون', 'tour-activity': 'جولات / أنشطة',
  'diving-centre': 'غوص / رياضات مائية', beach: 'شاطئ', 'event-venue': 'قاعة مناسبات', school: 'مدرسة',
  'nursery-childcare': 'حضانة أطفال', 'tutoring-language': 'دروس / لغات', photographer: 'مصوّر',
  'laundry-drycleaner': 'مغسلة / تنظيف جاف', tailor: 'خياط / تعديل', printing: 'طباعة / لافتات',
  'general-vendor': 'أخرى / عام',
};

const DE: Record<string, string> = {
  restaurant: 'Restaurant', cafe: 'Café', bakery: 'Bäckerei', patisserie: 'Konditorei', bar: 'Bar / Kneipe',
  nightclub: 'Nachtclub', 'street-food-kiosk': 'Streetfood', winery: 'Weingut', 'deli-gourmet': 'Feinkost',
  butcher: 'Metzgerei', greengrocer: 'Obst & Gemüse', supermarket: 'Supermarkt', hotel: 'Hotel / Resort',
  'apartment-rental': 'Kurzzeit-Apartments', 'villa-rental': 'Villa-Vermietung', agrotourism: 'Agrotourismus',
  plumber: 'Klempner', electrician: 'Elektriker', 'ac-hvac': 'Klima / Lüftung', 'solar-installer': 'Solar / Photovoltaik',
  locksmith: 'Schlüsseldienst', painter: 'Maler', carpenter: 'Tischler', builder: 'Bauunternehmer',
  handyman: 'Handwerker', 'cleaning-service': 'Reinigungsdienst', 'pest-control': 'Schädlingsbekämpfung',
  'gardener-landscaper': 'Gartenbau / Landschaft', 'pool-service': 'Poolservice', 'mover-removals': 'Umzüge',
  'appliance-repair': 'Gerätereparatur', 'law-firm': 'Anwalt / Kanzlei', accountant: 'Buchhalter / Prüfer',
  bank: 'Bank', insurance: 'Versicherung', 'business-consultant': 'Unternehmensberater', 'company-formation': 'Firmengründung',
  'immigration-adviser': 'Einwanderungsberater', 'real-estate-agency': 'Immobilienmakler', 'property-developer': 'Bauträger',
  architect: 'Architekt', 'surveyor-engineer': 'Ingenieur / Vermesser', 'marketing-agency': 'Marketing / Werbung',
  'web-it': 'Web / IT-Dienste', 'doctor-clinic': 'Arzt / Klinik', hospital: 'Krankenhaus', dentist: 'Zahnarzt',
  pharmacy: 'Apotheke', physiotherapy: 'Physiotherapie', optician: 'Optiker', veterinary: 'Tierarzt',
  'hair-barber': 'Friseur / Barbier', 'beauty-spa': 'Kosmetik / Spa', 'nail-salon': 'Nagelstudio',
  'tattoo-piercing': 'Tattoo / Piercing', 'gym-fitness': 'Fitnessstudio', 'yoga-pilates': 'Yoga / Pilates',
  'car-rental': 'Autovermietung', 'car-repair-garage': 'Autowerkstatt', 'tyre-service': 'Reifen / TÜV',
  'car-parts': 'Autoteile', 'taxi-transfer': 'Taxi / Transfer', 'driving-school': 'Fahrschule',
  'yacht-boat-charter': 'Yacht- / Bootscharter', 'fashion-clothing': 'Mode / Kleidung', jewellery: 'Schmuck',
  footwear: 'Schuhe', 'furniture-homeware': 'Möbel / Haushalt', electronics: 'Elektronik',
  'bookshop-stationery': 'Buchhandlung / Schreibwaren', florist: 'Blumenladen', 'gift-souvenir': 'Geschenke / Souvenirs',
  'sports-shop': 'Sportgeschäft', 'pet-shop': 'Tierbedarf', museum: 'Museum / Galerie',
  'archaeological-site': 'Historische Stätte', 'theatre-arts': 'Theater / Kunst', 'tour-activity': 'Touren / Aktivitäten',
  'diving-centre': 'Tauchen / Wassersport', beach: 'Strand', 'event-venue': 'Eventlocation', school: 'Schule',
  'nursery-childcare': 'Kita / Kinderbetreuung', 'tutoring-language': 'Nachhilfe / Sprachen', photographer: 'Fotograf',
  'laundry-drycleaner': 'Wäscherei / Reinigung', tailor: 'Schneider / Änderungen', printing: 'Druck / Beschriftung',
  'general-vendor': 'Sonstiges / Allgemein',
};

const PL: Record<string, string> = {
  restaurant: 'Restauracja', cafe: 'Kawiarnia', bakery: 'Piekarnia', patisserie: 'Cukiernia', bar: 'Bar / pub',
  nightclub: 'Klub nocny', 'street-food-kiosk': 'Street food', winery: 'Winiarnia', 'deli-gourmet': 'Delikatesy',
  butcher: 'Sklep mięsny', greengrocer: 'Warzywniak', supermarket: 'Supermarket', hotel: 'Hotel / resort',
  'apartment-rental': 'Apartamenty na doby', 'villa-rental': 'Wynajem willi', agrotourism: 'Agroturystyka',
  plumber: 'Hydraulik', electrician: 'Elektryk', 'ac-hvac': 'Klimatyzacja / HVAC', 'solar-installer': 'Fotowoltaika',
  locksmith: 'Ślusarz', painter: 'Malarz', carpenter: 'Stolarz', builder: 'Wykonawca budowlany',
  handyman: 'Złota rączka', 'cleaning-service': 'Usługi sprzątające', 'pest-control': 'Dezynsekcja',
  'gardener-landscaper': 'Ogrodnictwo', 'pool-service': 'Serwis basenów', 'mover-removals': 'Przeprowadzki',
  'appliance-repair': 'Naprawa AGD', 'law-firm': 'Prawnik / kancelaria', accountant: 'Księgowy / audytor',
  bank: 'Bank', insurance: 'Ubezpieczenia', 'business-consultant': 'Doradca biznesowy', 'company-formation': 'Zakładanie firm',
  'immigration-adviser': 'Doradca imigracyjny', 'real-estate-agency': 'Agent nieruchomości', 'property-developer': 'Deweloper',
  architect: 'Architekt', 'surveyor-engineer': 'Inżynier / geodeta', 'marketing-agency': 'Marketing / reklama',
  'web-it': 'Usługi web / IT', 'doctor-clinic': 'Lekarz / klinika', hospital: 'Szpital', dentist: 'Dentysta',
  pharmacy: 'Apteka', physiotherapy: 'Fizjoterapia', optician: 'Optyk', veterinary: 'Weterynarz',
  'hair-barber': 'Fryzjer / barber', 'beauty-spa': 'Salon urody / spa', 'nail-salon': 'Paznokcie',
  'tattoo-piercing': 'Tatuaż / piercing', 'gym-fitness': 'Siłownia / fitness', 'yoga-pilates': 'Joga / pilates',
  'car-rental': 'Wypożyczalnia aut', 'car-repair-garage': 'Warsztat samochodowy', 'tyre-service': 'Opony / przegląd',
  'car-parts': 'Części samochodowe', 'taxi-transfer': 'Taxi / transfer', 'driving-school': 'Szkoła jazdy',
  'yacht-boat-charter': 'Czarter jachtów', 'fashion-clothing': 'Moda / odzież', jewellery: 'Biżuteria',
  footwear: 'Obuwie', 'furniture-homeware': 'Meble / dom', electronics: 'Elektronika',
  'bookshop-stationery': 'Księgarnia / papeteria', florist: 'Kwiaciarnia', 'gift-souvenir': 'Prezenty / pamiątki',
  'sports-shop': 'Sklep sportowy', 'pet-shop': 'Sklep zoologiczny', museum: 'Muzeum / galeria',
  'archaeological-site': 'Zabytek', 'theatre-arts': 'Teatr / sztuka', 'tour-activity': 'Wycieczki / atrakcje',
  'diving-centre': 'Nurkowanie / sporty wodne', beach: 'Plaża', 'event-venue': 'Sala na imprezy', school: 'Szkoła',
  'nursery-childcare': 'Żłobek / przedszkole', 'tutoring-language': 'Korepetycje / języki', photographer: 'Fotograf',
  'laundry-drycleaner': 'Pralnia', tailor: 'Krawiec / przeróbki', printing: 'Druk / szyldy',
  'general-vendor': 'Inne / ogólne',
};

const RU: Record<string, string> = {
  restaurant: 'Ресторан', cafe: 'Кафе', bakery: 'Пекарня', patisserie: 'Кондитерская', bar: 'Бар / паб',
  nightclub: 'Ночной клуб', 'street-food-kiosk': 'Уличная еда', winery: 'Винодельня', 'deli-gourmet': 'Деликатесы',
  butcher: 'Мясная лавка', greengrocer: 'Овощи и фрукты', supermarket: 'Супермаркет', hotel: 'Отель / курорт',
  'apartment-rental': 'Посуточная аренда квартир', 'villa-rental': 'Аренда виллы', agrotourism: 'Агротуризм',
  plumber: 'Сантехник', electrician: 'Электрик', 'ac-hvac': 'Кондиционеры / HVAC', 'solar-installer': 'Солнечные панели',
  locksmith: 'Слесарь / ключи', painter: 'Маляр', carpenter: 'Плотник', builder: 'Строитель / подрядчик',
  handyman: 'Мастер на час', 'cleaning-service': 'Клининг', 'pest-control': 'Дезинсекция',
  'gardener-landscaper': 'Садоводство / ландшафт', 'pool-service': 'Обслуживание бассейнов', 'mover-removals': 'Переезды / грузоперевозки',
  'appliance-repair': 'Ремонт техники', 'law-firm': 'Юрист / адвокат', accountant: 'Бухгалтер / аудитор',
  bank: 'Банк', insurance: 'Страхование', 'business-consultant': 'Бизнес-консультант', 'company-formation': 'Регистрация компаний',
  'immigration-adviser': 'Иммиграционный консультант', 'real-estate-agency': 'Агент по недвижимости', 'property-developer': 'Застройщик',
  architect: 'Архитектор', 'surveyor-engineer': 'Инженер / геодезист', 'marketing-agency': 'Маркетинг / реклама',
  'web-it': 'Веб / IT-услуги', 'doctor-clinic': 'Врач / клиника', hospital: 'Больница', dentist: 'Стоматолог',
  pharmacy: 'Аптека', physiotherapy: 'Физиотерапия', optician: 'Оптика', veterinary: 'Ветеринар',
  'hair-barber': 'Парикмахерская / барбершоп', 'beauty-spa': 'Салон красоты / спа', 'nail-salon': 'Маникюр',
  'tattoo-piercing': 'Тату / пирсинг', 'gym-fitness': 'Спортзал / фитнес', 'yoga-pilates': 'Йога / пилатес',
  'car-rental': 'Аренда авто', 'car-repair-garage': 'Автосервис', 'tyre-service': 'Шиномонтаж / ТО',
  'car-parts': 'Автозапчасти', 'taxi-transfer': 'Такси / трансфер', 'driving-school': 'Автошкола',
  'yacht-boat-charter': 'Аренда яхт и лодок', 'fashion-clothing': 'Мода / одежда', jewellery: 'Ювелирные изделия',
  footwear: 'Обувь', 'furniture-homeware': 'Мебель / товары для дома', electronics: 'Электроника',
  'bookshop-stationery': 'Книги / канцтовары', florist: 'Цветы', 'gift-souvenir': 'Подарки / сувениры',
  'sports-shop': 'Спортивный магазин', 'pet-shop': 'Зоомагазин', museum: 'Музей / галерея',
  'archaeological-site': 'Историческое место', 'theatre-arts': 'Театр / искусство', 'tour-activity': 'Туры / развлечения',
  'diving-centre': 'Дайвинг / водный спорт', beach: 'Пляж', 'event-venue': 'Площадка для событий', school: 'Школа',
  'nursery-childcare': 'Ясли / детский сад', 'tutoring-language': 'Репетиторы / языки', photographer: 'Фотограф',
  'laundry-drycleaner': 'Прачечная / химчистка', tailor: 'Ателье / пошив', printing: 'Печать / вывески',
  'general-vendor': 'Другое / общее',
};

const LABELS: Record<string, Record<string, string>> = { en: EN, el: EL, ro: RO, ar: AR, de: DE, pl: PL, ru: RU };

export function catLabel(key: string, locale: string): string {
  return LABELS[locale]?.[key] || EN[key] || key;
}

// ---- Map UI microcopy, per locale -------------------------------------------
const UI_EN: BizLabels = {
  title: 'Business map',
  subtitle: 'Pick a category, then drag the map to your area.',
  searchPh: 'Search a category…',
  inView: 'shown', loading: 'Loading…',
  none: 'No businesses in this category yet.', choose: 'Choose a category',
  call: 'Call', email: 'Email', website: 'Website', directions: 'Directions',
};

export const BIZMAP_LABELS: Record<string, BizLabels> = {
  en: UI_EN,
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
  return BIZMAP_LABELS[locale] || UI_EN;
}
