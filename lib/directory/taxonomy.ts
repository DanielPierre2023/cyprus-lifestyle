// lib/directory/taxonomy.ts
// ============================================================================
// CANONICAL BUSINESS TAXONOMY for the Cyprus directory (Phase 1 data foundation).
// ----------------------------------------------------------------------------
// The bulk import stored each business's category as the raw source slug, so the same
// real category is scattered across many spellings ('gyms', 'health-clubs', 'sports-
// clubs' …). This is the clean target taxonomy every listing is normalised INTO, so the
// whole system can filter, rank, SELL (Partner category-exclusivity) and analyse by one
// stable category. Pure data + validators — no I/O — so it is unit-tested and shared by
// the normalize job, retrieval and the admin.
// ============================================================================

export interface CanonicalCategory { key: string; label: string; group: string }

// ~75 categories across the island's real business mix + Daniel's vision. `key` is the
// stable slug stored on the listing; `group` powers coarse faceting and analytics.
export const CANONICAL_CATEGORIES: CanonicalCategory[] = [
  // Dining & food
  { key: 'restaurant', label: 'Restaurant', group: 'dining' },
  { key: 'cafe', label: 'Café / coffee', group: 'dining' },
  { key: 'bakery', label: 'Bakery', group: 'dining' },
  { key: 'patisserie', label: 'Patisserie / desserts', group: 'dining' },
  { key: 'bar', label: 'Bar / pub', group: 'nightlife' },
  { key: 'nightclub', label: 'Nightclub', group: 'nightlife' },
  { key: 'street-food-kiosk', label: 'Street food / kiosk', group: 'dining' },
  { key: 'winery', label: 'Winery', group: 'dining' },
  { key: 'deli-gourmet', label: 'Deli / gourmet', group: 'dining' },
  { key: 'butcher', label: 'Butcher', group: 'food-retail' },
  { key: 'greengrocer', label: 'Greengrocer', group: 'food-retail' },
  { key: 'supermarket', label: 'Supermarket / mini-market', group: 'food-retail' },
  // Stays
  { key: 'hotel', label: 'Hotel / resort', group: 'stays' },
  { key: 'apartment-rental', label: 'Short-stay apartments', group: 'stays' },
  { key: 'villa-rental', label: 'Villa rental', group: 'stays' },
  { key: 'agrotourism', label: 'Agrotourism / guesthouse', group: 'stays' },
  // Home services & trades
  { key: 'plumber', label: 'Plumber', group: 'home-services' },
  { key: 'electrician', label: 'Electrician', group: 'home-services' },
  { key: 'ac-hvac', label: 'Air-conditioning / HVAC', group: 'home-services' },
  { key: 'solar-installer', label: 'Solar / photovoltaic', group: 'home-services' },
  { key: 'locksmith', label: 'Locksmith', group: 'home-services' },
  { key: 'painter', label: 'Painter / decorator', group: 'home-services' },
  { key: 'carpenter', label: 'Carpenter / joiner', group: 'home-services' },
  { key: 'builder', label: 'Builder / contractor', group: 'home-services' },
  { key: 'handyman', label: 'Handyman', group: 'home-services' },
  { key: 'cleaning-service', label: 'Cleaning service', group: 'home-services' },
  { key: 'pest-control', label: 'Pest control', group: 'home-services' },
  { key: 'gardener-landscaper', label: 'Gardening / landscaping', group: 'home-services' },
  { key: 'pool-service', label: 'Pool build / maintenance', group: 'home-services' },
  { key: 'mover-removals', label: 'Movers / removals', group: 'home-services' },
  { key: 'appliance-repair', label: 'Appliance repair', group: 'home-services' },
  // Professional & money
  { key: 'law-firm', label: 'Lawyer / law firm', group: 'professional' },
  { key: 'accountant', label: 'Accountant / auditor', group: 'professional' },
  { key: 'bank', label: 'Bank', group: 'professional' },
  { key: 'insurance', label: 'Insurance', group: 'professional' },
  { key: 'business-consultant', label: 'Business / management consultant', group: 'professional' },
  { key: 'company-formation', label: 'Company formation / corporate services', group: 'professional' },
  { key: 'immigration-adviser', label: 'Immigration / relocation adviser', group: 'professional' },
  { key: 'real-estate-agency', label: 'Estate agent', group: 'real-estate' },
  { key: 'property-developer', label: 'Property developer', group: 'real-estate' },
  { key: 'architect', label: 'Architect', group: 'real-estate' },
  { key: 'surveyor-engineer', label: 'Surveyor / civil engineer', group: 'real-estate' },
  { key: 'marketing-agency', label: 'Marketing / advertising', group: 'professional' },
  { key: 'web-it', label: 'Web / IT services', group: 'professional' },
  // Health & beauty
  { key: 'doctor-clinic', label: 'Doctor / clinic', group: 'health' },
  { key: 'hospital', label: 'Hospital', group: 'health' },
  { key: 'dentist', label: 'Dentist', group: 'health' },
  { key: 'pharmacy', label: 'Pharmacy', group: 'health' },
  { key: 'physiotherapy', label: 'Physiotherapy', group: 'health' },
  { key: 'optician', label: 'Optician', group: 'health' },
  { key: 'veterinary', label: 'Vet / animal clinic', group: 'health' },
  { key: 'hair-barber', label: 'Hairdresser / barber', group: 'beauty' },
  { key: 'beauty-spa', label: 'Beauty salon / spa', group: 'beauty' },
  { key: 'nail-salon', label: 'Nail salon', group: 'beauty' },
  { key: 'gym-fitness', label: 'Gym / fitness', group: 'fitness' },
  { key: 'yoga-pilates', label: 'Yoga / pilates studio', group: 'fitness' },
  // Mobility
  { key: 'car-rental', label: 'Car rental', group: 'mobility' },
  { key: 'car-repair-garage', label: 'Car repair / garage', group: 'mobility' },
  { key: 'tyre-service', label: 'Tyres / MOT', group: 'mobility' },
  { key: 'car-parts', label: 'Car / auto parts', group: 'mobility' },
  { key: 'taxi-transfer', label: 'Taxi / transfer', group: 'mobility' },
  { key: 'driving-school', label: 'Driving school', group: 'mobility' },
  { key: 'yacht-boat-charter', label: 'Yacht / boat charter', group: 'leisure' },
  // Retail & style
  { key: 'fashion-clothing', label: 'Fashion / clothing', group: 'retail' },
  { key: 'jewellery', label: 'Jewellery', group: 'retail' },
  { key: 'footwear', label: 'Shoes / footwear', group: 'retail' },
  { key: 'furniture-homeware', label: 'Furniture / homeware', group: 'retail' },
  { key: 'electronics', label: 'Electronics', group: 'retail' },
  { key: 'bookshop-stationery', label: 'Bookshop / stationery', group: 'retail' },
  { key: 'florist', label: 'Florist', group: 'retail' },
  { key: 'gift-souvenir', label: 'Gifts / souvenirs', group: 'retail' },
  { key: 'sports-shop', label: 'Sports / outdoor shop', group: 'retail' },
  { key: 'pet-shop', label: 'Pet shop', group: 'retail' },
  // Culture & leisure
  { key: 'museum', label: 'Museum / gallery', group: 'culture' },
  { key: 'archaeological-site', label: 'Archaeological / heritage site', group: 'culture' },
  { key: 'theatre-arts', label: 'Theatre / performing arts', group: 'culture' },
  { key: 'tour-activity', label: 'Tours / activities', group: 'leisure' },
  { key: 'diving-centre', label: 'Diving / watersports', group: 'leisure' },
  { key: 'beach', label: 'Beach', group: 'leisure' },
  { key: 'event-venue', label: 'Event venue', group: 'leisure' },
  // Education & community
  { key: 'school', label: 'School', group: 'education' },
  { key: 'nursery-childcare', label: 'Nursery / childcare', group: 'education' },
  { key: 'tutoring-language', label: 'Tutoring / language school', group: 'education' },
  // Other services
  { key: 'photographer', label: 'Photographer', group: 'services' },
  { key: 'laundry-drycleaner', label: 'Laundry / dry cleaner', group: 'services' },
  { key: 'tailor', label: 'Tailor / alterations', group: 'services' },
  { key: 'printing', label: 'Printing / signage', group: 'services' },
  { key: 'general-vendor', label: 'Other / general', group: 'other' }, // fallback — never guess
];

export const CATEGORY_KEYS: ReadonlySet<string> = new Set(CANONICAL_CATEGORIES.map((c) => c.key));
export const CATEGORY_GROUPS: ReadonlySet<string> = new Set(CANONICAL_CATEGORIES.map((c) => c.group));
export const categoryLabel = (key: string): string => CANONICAL_CATEGORIES.find((c) => c.key === key)?.label || key;
export const isCanonicalCategory = (key: string): boolean => CATEGORY_KEYS.has(key);

// A compact list for the classifier prompt: "key — label" per line, grouped.
export function classifyPromptList(): string {
  return CANONICAL_CATEGORIES.map((c) => `${c.key} — ${c.label}`).join('\n');
}

// ── Deterministic mapper — classify the BULK with zero model calls. The import's raw
// slugs/names are finite and mostly recognisable, so ordered keyword rules (specific
// before generic) map them straight to a canonical key. Only what this can't place goes
// to the LLM. Pure + unit-tested. Match against subtype + type + group + name, deaccented.
const _deacc = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
const RULES: [RegExp, string][] = [
  [/rent.?a.?car|car.?rental|car.?hire|rental.?car|ενοικιαση αυτοκιν/, 'car-rental'],
  [/car.?repair|auto.?repair|car.?service|\bgarage\b|mechanic|body.?shop|vehicle.?repair|συνεργειο/, 'car-repair-garage'],
  [/\btyres?\b|\btire\b|wheel.?align|vulcaniz/, 'tyre-service'],
  [/auto.?part|car.?part|spare.?part|autopart|ανταλλακτ/, 'car-parts'],
  [/air.?condition|aircon|hvac|climate.?control|refriger|cooling.?heating|κλιματ/, 'ac-hvac'],
  [/solar|photovolta|pv.?system|φωτοβολτα/, 'solar-installer'],
  [/estate.?agent|real.?estate|realtor|realty|property.?agent|letting.?agent|κτηματομεσιτ|μεσιτ/, 'real-estate-agency'],
  [/developer|land.?development|property.?development/, 'property-developer'],
  [/lawyer|law.?firm|advocat|solicitor|attorney|legal.?service|barrister|δικηγορ/, 'law-firm'],
  [/account|audit|bookkeep|λογιστ/, 'accountant'],
  [/insurance|insurer|assurance|ασφαλ/, 'insurance'],
  [/\bbank\b|banking|τραπεζ/, 'bank'],
  [/immigration|residency.?service|relocation.?service|μεταναστευσ/, 'immigration-adviser'],
  [/company.?formation|corporate.?service|company.?service|fiduciary/, 'company-formation'],
  [/consultant|consulting|advisory/, 'business-consultant'],
  [/marketing|advertis|branding|\bpr.?agency\b|διαφημ/, 'marketing-agency'],
  [/web.?design|web.?develop|software|digital.?agency|\bhosting\b|ιστοσελιδ/, 'web-it'],
  [/architect|αρχιτεκτ/, 'architect'],
  [/surveyor|civil.?engineer|structural.?engineer|quantity.?surveyor|πολιτικος μηχανικ/, 'surveyor-engineer'],
  [/pharmac|chemist|φαρμακ/, 'pharmacy'],
  [/dentist|dental|orthodont|οδοντιατ/, 'dentist'],
  [/physio|physical.?therapy|rehabilitation|φυσιοθεραπ/, 'physiotherapy'],
  [/optician|optical|eyewear|\boptic/, 'optician'],
  [/veterin|\bvet\b|animal.?hospital|animal.?clinic|κτηνιατ/, 'veterinary'],
  [/hospital|νοσοκομειο/, 'hospital'],
  [/clinic|medical.?cent|\bdoctor|physician|polyclinic|diagnostic|ιατρειο|ιατρικ/, 'doctor-clinic'],
  [/\bgym|fitness|health.?club|crossfit|body.?build|γυμναστ/, 'gym-fitness'],
  [/\byoga\b|pilates/, 'yoga-pilates'],
  [/hairdress|\bbarber|hair.?salon|coiffure|κομμωτ|κουρειο/, 'hair-barber'],
  [/beauty.?salon|beauty.?cent|\bspa\b|\bmassage|wellness|aesthetic|cosmetic|ινστιτουτ ομορφ/, 'beauty-spa'],
  [/nail.?salon|nail.?bar|manicure|νυχια/, 'nail-salon'],
  [/restaurant|tavern|eatery|bistro|\bgrill\b|steakhouse|pizzeria|trattoria|\bdiner\b|\bmeze|εστιατορ|ταβερν/, 'restaurant'],
  [/\bcafes?\b|coffee|cafeteria|espresso|\bcaffe|καφε/, 'cafe'],
  [/bakery|\bbaker\b|αρτοποιε|φουρνο/, 'bakery'],
  [/patisserie|pastry|confection|ζαχαροπλαστ/, 'patisserie'],
  [/delicatessen|\bdeli\b|gourmet|fine.?food/, 'deli-gourmet'],
  [/\bbars?\b|\bpubs?\b|wine.?bar|cocktail|lounge.?bar|brewery/, 'bar'],
  [/night.?club|nightclub|\bdisco\b/, 'nightclub'],
  [/winery|\bwiner|vineyard|οινοποιε|κρασ/, 'winery'],
  [/butcher|κρεοπωλ|meat.?market/, 'butcher'],
  [/greengrocer|fruit.?and.?veg|μαναβ/, 'greengrocer'],
  [/supermarket|mini.?market|\bgrocery\b|convenience.?store|υπεραγορ|παντοπωλ/, 'supermarket'],
  [/\bhotels?\b|\bresorts?\b|\bmotels?\b|ξενοδοχ/, 'hotel'],
  [/apartment|studios|holiday.?let|short.?stay|διαμερισμα/, 'apartment-rental'],
  [/\bvilla/, 'villa-rental'],
  [/agrotour|guest.?house|guesthouse|\bhostel\b|bed.?and.?breakfast/, 'agrotourism'],
  [/plumb|υδραυλικ|sanitary.?install/, 'plumber'],
  [/electrician|ηλεκτρολογ|electrical.?install/, 'electrician'],
  [/locksmith|κλειδαρ|key.?cutting/, 'locksmith'],
  [/painter|paint.?contract|decorator|ελαιοχρωμ|βαψιμ/, 'painter'],
  [/carpenter|\bjoiner|ξυλουργ|cabinet.?mak/, 'carpenter'],
  [/\bbuilder|building.?contract|construction|οικοδομ/, 'builder'],
  [/handyman|home.?repair|maintenance.?service/, 'handyman'],
  [/cleaning|\bclean\b|καθαρισμ|housekeep|janitor/, 'cleaning-service'],
  [/pest.?control|fumigat|απολυμανσ/, 'pest-control'],
  [/garden|landscap|κηπουρ/, 'gardener-landscaper'],
  [/\bpool\b|piscina|πισιν/, 'pool-service'],
  [/removal|\bmover|moving.?company|μετακομισ/, 'mover-removals'],
  [/appliance.?repair|white.?good|domestic.?appliance|επισκευη συσκευ/, 'appliance-repair'],
  [/jewel|κοσμηματ|goldsmith|watch.?shop|χρυσοχ/, 'jewellery'],
  [/florist|flower.?shop|ανθοπωλ/, 'florist'],
  [/furnitur|\bεπιπλα|homeware|home.?decor|mattress/, 'furniture-homeware'],
  [/electronic|computer.?shop|mobile.?phone|ηλεκτρονικ/, 'electronics'],
  [/book.?shop|bookstore|stationer|βιβλιοπωλ|χαρτικ/, 'bookshop-stationery'],
  [/fashion|clothing|\bboutique|apparel|garment|menswear|womenswear|ενδυματ|ρουχ/, 'fashion-clothing'],
  [/\bshoes?\b|footwear|παπουτσ|υποδημα/, 'footwear'],
  [/sport.?shop|sport.?good|sportswear|athletic.?wear/, 'sports-shop'],
  [/pet.?shop|pet.?store|pet.?suppl|ζωοτροφ/, 'pet-shop'],
  [/souvenir|gift.?shop|\bgifts\b|δωρα/, 'gift-souvenir'],
  [/museum|\bgallery\b|μουσειο|πινακοθηκ/, 'museum'],
  [/archaeolog|antiquit|ancient.?site|αρχαιολογ/, 'archaeological-site'],
  [/theatre|theater|performing.?art|θεατρο/, 'theatre-arts'],
  [/diving|dive.?cent|scuba|watersport|καταδυσ/, 'diving-centre'],
  [/\byacht|boat.?charter|boat.?trip|sailing|σκαφ|ιστιοπλο/, 'yacht-boat-charter'],
  [/travel.?agen|tour.?operat|\btours\b|excursion|sightsee|ταξιδιωτ/, 'tour-activity'],
  [/driving.?school|driving.?instruct|σχολη οδηγ/, 'driving-school'],
  [/\btaxi\b|transfer.?service|airport.?transfer|chauffeur|private.?driver/, 'taxi-transfer'],
  [/nursery|kindergarten|pre.?school|childcare|day.?care|παιδικ.?σταθμ|νηπιαγ/, 'nursery-childcare'],
  [/tutoring|\btuition\b|language.?school|φροντιστηρ|private.?lesson/, 'tutoring-language'],
  [/\bschools?\b|academy|γυμνασιο|λυκειο/, 'school'],
  [/photograph|foto.?studio|videograph|φωτογραφ/, 'photographer'],
  [/laundr|dry.?clean|καθαριστηρ|πλυντηρ/, 'laundry-drycleaner'],
  [/\btailor|alteration|ραφτ|seamstress/, 'tailor'],
  [/printing|\bprint\b|signage|typograph|copy.?shop|εκτυπωσ/, 'printing'],
];

// Deterministically map a business's text to a canonical key, or null if unsure.
export function mapToCanonical(text: string): string | null {
  const s = _deacc(String(text || '').toLowerCase());
  if (!s.trim()) return null;
  for (const [rx, cat] of RULES) if (rx.test(s)) return cat;
  return null;
}

export interface Classification { category: string; subtype: string | null; tags: string[] }

// Coerce a model classification into a safe, validated shape. An unknown/blank category
// falls back to 'general-vendor' (we never invent a category that isn't in the taxonomy).
export function coerceClassification(j: unknown): Classification {
  const o = (j && typeof j === 'object') ? j as Record<string, unknown> : {};
  let category = typeof o.category === 'string' ? o.category.toLowerCase().trim() : '';
  if (!isCanonicalCategory(category)) category = 'general-vendor';
  const subtype = typeof o.subtype === 'string' && o.subtype.trim()
    ? o.subtype.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40) || null
    : null;
  let rawTags: unknown[] = Array.isArray(o.tags) ? o.tags : (typeof o.tags === 'string' ? [o.tags] : []);
  const tags = Array.from(new Set(rawTags.map((t) => String(t ?? '').toLowerCase().trim()).filter((t) => t.length >= 2 && t.length <= 30))).slice(0, 6);
  return { category, subtype, tags };
}
