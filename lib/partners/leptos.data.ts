// lib/partners/leptos.data.ts: the language-independent facts about Leptos Estates / the Leptos Group.
//
// Sources (status 14 Oct 2026): the Leptos Group company workbook Daniel supplied (Companies, Offices, Projects,
// Property Listings), the public pages of leptosestates.com (page titles, descriptions, award pages) and Daniel's
// own "12 reasons" text. Nothing here is invented: where a fact is a company claim it is shown as one (see leptos.text.ts).
//
// Coordinates: the Leptos pages carry none. `geocoded` = an OpenStreetMap feature with the same name (or the
// office / street) was found; `town` = the centre of the village or town only. Exact plots can be added when Leptos
// sends a site list (template in the delivery). Pure data, no I/O.
import type { CoordsPrecision } from '@/lib/partners/types';

export const LEPTOS_SLUG = 'leptos-estates';
export const LEPTOS_SITE = 'https://www.leptosestates.com/';

// ── places (villages and towns the projects stand in) ───────────────────────────────────────────
export type PlaceKey =
  | 'paphos' | 'kato-paphos' | 'geroskipou' | 'chloraka' | 'kissonerga' | 'peyia' | 'coral-bay' | 'tala' | 'tsada'
  | 'kamares' | 'polis' | 'argaka' | 'latchi' | 'mandria' | 'pissouri' | 'limassol';

/** Centre of each place (OpenStreetMap place node). Used when a project has no point of its own. */
export const PLACE_CENTRE: Record<PlaceKey, { lat: number; lng: number; district: 'paphos' | 'limassol' }> = {
  paphos: { lat: 34.7744, lng: 32.42316, district: 'paphos' },
  'kato-paphos': { lat: 34.75876, lng: 32.41008, district: 'paphos' },
  geroskipou: { lat: 34.76118, lng: 32.4527, district: 'paphos' },
  chloraka: { lat: 34.79959, lng: 32.40792, district: 'paphos' },
  kissonerga: { lat: 34.82287, lng: 32.40192, district: 'paphos' },
  peyia: { lat: 34.88351, lng: 32.38032, district: 'paphos' },
  'coral-bay': { lat: 34.85528, lng: 32.37025, district: 'paphos' },
  tala: { lat: 34.83613, lng: 32.43098, district: 'paphos' },
  tsada: { lat: 34.83938, lng: 32.47524, district: 'paphos' },
  kamares: { lat: 34.845448, lng: 32.4359, district: 'paphos' },
  polis: { lat: 35.03448, lng: 32.42647, district: 'paphos' },
  argaka: { lat: 35.06524, lng: 32.49293, district: 'paphos' },
  latchi: { lat: 35.04081, lng: 32.39391, district: 'paphos' },
  mandria: { lat: 34.71579, lng: 32.53227, district: 'paphos' },
  pissouri: { lat: 34.6689, lng: 32.70105, district: 'limassol' },
  limassol: { lat: 34.68529, lng: 33.03327, district: 'limassol' },
};

// ── project areas (filter chips on the profile) ─────────────────────────────────────────────────
export type AreaKey = 'paphos' | 'coast' | 'peyia' | 'hills' | 'northwest' | 'limassol';
export const AREA_ORDER: AreaKey[] = ['paphos', 'coast', 'peyia', 'hills', 'northwest', 'limassol'];
export const AREA_OF_PLACE: Record<PlaceKey, AreaKey> = {
  paphos: 'paphos', 'kato-paphos': 'paphos', geroskipou: 'paphos', mandria: 'paphos',
  chloraka: 'coast', kissonerga: 'coast',
  peyia: 'peyia', 'coral-bay': 'peyia',
  tala: 'hills', tsada: 'hills', kamares: 'hills',
  polis: 'northwest', argaka: 'northwest', latchi: 'northwest',
  limassol: 'limassol', pissouri: 'limassol',
};

// ── projects ────────────────────────────────────────────────────────────────────────────────────
export type KindKey = 'villas' | 'apartments' | 'mixed' | 'residential' | 'resort' | 'plots' | 'masterplan';
/** Closed vocabulary of one-line facts, each taken from the project's own description on leptosestates.com. */
export type FeatureKey =
  | 'seafront' | 'gated63' | 'gatedResort' | 'walkBeach' | 'sea550' | 'hilltop' | 'medViews' | 'akamas' | 'inKamares'
  | 'flagship' | 'tailorMade' | 'highRise' | 'eco' | 'club' | 'outskirts' | 'cityCentre' | 'plots' | 'permanent'
  | 'finishes' | 'seaViews' | 'traditional' | 'exclusive' | 'medApartments' | 'detached' | 'beachfront' | 'community'
  | 'landscaped';

export interface LeptosProject {
  /** File base for the images and the key in the official URL, e.g. 'kamares-village'. */
  key: string;
  name: string;
  /** directory_listings.slug. New rows use `leptos-estates-<key>` (the slug the development scraper would produce too). */
  slug: string;
  /** True when the row already exists in the directory (kept, linked, not re-created). */
  existing?: boolean;
  place: PlaceKey;
  kind: KindKey;
  feature?: FeatureKey;
  lat: number;
  lng: number;
  precision: CoordsPrecision;
  /** Range of bedrooms across the units Leptos currently lists (only where at least four units are listed). */
  beds?: string;
  /** Leptos describes the project as luxury / exclusive in its own words. */
  luxury?: boolean;
  /** No picture on the official page: the card and the row show the branded placeholder. */
  noImage?: boolean;
  /** Official project page. */
  url: string;
}

const P = (key: string, o: Omit<LeptosProject, 'key' | 'slug' | 'url' | 'lat' | 'lng' | 'precision'> & Partial<Pick<LeptosProject, 'lat' | 'lng' | 'precision' | 'slug' | 'url'>>): LeptosProject => {
  const c = PLACE_CENTRE[o.place];
  return {
    key,
    slug: o.slug ?? `leptos-estates-${key}`,
    url: o.url ?? `https://www.leptosestates.com/project/${key}`,
    lat: o.lat ?? c.lat, lng: o.lng ?? c.lng, precision: o.precision ?? 'town',
    ...o,
  };
};

export const LEPTOS_PROJECTS: LeptosProject[] = [
  P('adonis-beach-villas', { name: 'Adonis Beach Villas', place: 'chloraka', kind: 'villas', feature: 'seafront', beds: '3–6' }),
  P('akakia-villas', { name: 'Akakia Villas', place: 'kamares', kind: 'villas', feature: 'inKamares', beds: '3–4', luxury: true }),
  P('akamantis-gardens', { name: 'Akamantis Gardens', place: 'polis', kind: 'resort', beds: '2–3' }),
  P('akropolis-275', { name: 'Akropolis 275', place: 'geroskipou', kind: 'residential', feature: 'outskirts', luxury: true }),
  P('aphrodite-gardens', { name: 'Aphrodite Gardens', slug: 'aphrodite-gardens-68nradd', existing: true, place: 'kato-paphos', kind: 'residential', lat: 34.759436, lng: 32.430833, precision: 'geocoded' }),
  P('aphrodite-springs', { name: 'Aphrodite Springs', place: 'geroskipou', kind: 'residential', feature: 'permanent' }),
  P('apollo-beach-villas', { name: 'Apollo Beach Villas', place: 'chloraka', kind: 'villas', feature: 'seafront', lat: 34.791886, lng: 32.395745, precision: 'geocoded', luxury: true }),
  P('argaka-beach-villas', { name: 'Argaka Beach Villas', place: 'argaka', kind: 'villas', feature: 'traditional', luxury: true }),
  P('armonia-beach-villas', { name: 'Armonia Beach Villas', place: 'kissonerga', kind: 'villas' }),
  P('belvedere-villas', { name: 'Belvedere Villas', place: 'chloraka', kind: 'villas', feature: 'seafront' }),
  P('coral-bay-villas', { name: 'Coral Bay Villas', place: 'coral-bay', kind: 'villas', beds: '3–5' }),
  P('coral-gardens', { name: 'Coral Gardens', place: 'coral-bay', kind: 'apartments', feature: 'medApartments', beds: '1–3' }),
  P('coral-seas-villas', { name: 'Coral Seas Villas', place: 'coral-bay', kind: 'villas', feature: 'gated63', beds: '3–4', luxury: true }),
  P('eden-beach-apartments', { name: 'Eden Beach Apartments', place: 'limassol', kind: 'apartments', feature: 'seafront', lat: 34.680462, lng: 33.052683, precision: 'geocoded' }),
  P('fortuna-court-i', { name: 'Fortuna Court I', place: 'paphos', kind: 'residential' }),
  P('iasonas-beach-villas', { name: 'Iasonas Beach Villas', place: 'coral-bay', kind: 'villas', feature: 'seafront', beds: '3' }),
  P('kamares-village', { name: 'Kamares Village', place: 'kamares', kind: 'villas', feature: 'flagship', beds: '3–5', luxury: true }),
  P('kings-court', { name: 'Kings Court', place: 'paphos', kind: 'residential', feature: 'seaViews', luxury: true }),
  P('kings-gardens', { name: 'Kings Gardens', place: 'kato-paphos', kind: 'residential', feature: 'landscaped', noImage: true, url: 'https://www.leptosestates.com/project/king-gardens' }),
  P('latchi-beach-villas', { name: 'Latchi Beach Villas', place: 'latchi', kind: 'villas' }),
  P('limassol-blu-marine', { name: 'Limassol Blu Marine', place: 'limassol', kind: 'residential', feature: 'highRise', beds: '1–3', luxury: true }),
  P('limassol-del-mar', { name: 'Limassol Del Mar', slug: 'limassol-del-mar', existing: true, place: 'limassol', kind: 'residential', feature: 'seafront' }),
  P('limassol-park', { name: 'Limassol Park', place: 'limassol', kind: 'apartments', feature: 'finishes', beds: '1–3' }),
  P('limnaria-gardens', { name: 'Limnaria Gardens', place: 'kato-paphos', kind: 'residential', feature: 'club', luxury: true }),
  P('mandria-gardens', { name: 'Mandria Gardens', place: 'mandria', kind: 'apartments', feature: 'seafront', beds: '1–2', lat: 34.709604, lng: 32.531762, precision: 'geocoded' }),
  P('maniki-beach-villas', { name: 'Maniki Beach Villas', place: 'peyia', kind: 'mixed', beds: '4–6' }),
  P('neapolis-smart-ecocity', { name: 'Neapolis Smart EcoCity', place: 'paphos', kind: 'masterplan', feature: 'eco', lat: 34.749421, lng: 32.426605, precision: 'town' }),
  P('olympus-village', { name: 'Olympus Village', place: 'tsada', kind: 'villas', feature: 'tailorMade', beds: '3–5', lat: 34.827769, lng: 32.470793, precision: 'geocoded', luxury: true }),
  P('paphos-gardens', { name: 'Paphos Gardens', place: 'kato-paphos', kind: 'residential', beds: '2', lat: 34.753236, lng: 32.424643, precision: 'geocoded' }),
  P('paradise-gardens', { name: 'Paradise Gardens', place: 'kato-paphos', kind: 'residential', feature: 'walkBeach', lat: 34.758574, lng: 32.425996, precision: 'geocoded' }),
  P('perneri-villas', { name: 'Perneri Villas', place: 'tala', kind: 'villas', feature: 'medViews', beds: '3' }),
  P('peyia-gardens', { name: 'Peyia Gardens', place: 'peyia', kind: 'residential', feature: 'community' }),
  P('peyia-hills-apartments', { name: 'Peyia Hills Apartments', place: 'peyia', kind: 'apartments' }),
  P('pissouri-villas', { name: 'Pissouri Villas', place: 'pissouri', kind: 'villas', feature: 'detached', luxury: true }),
  P('polis-beach-villas', { name: 'Polis Beach Villas', place: 'polis', kind: 'villas', feature: 'beachfront' }),
  P('regina-gardens', { name: 'Regina Gardens', place: 'kato-paphos', kind: 'residential', feature: 'sea550' }),
  P('sea-caves-villas', { name: 'Sea Caves Villas', place: 'coral-bay', kind: 'villas', feature: 'akamas', lat: 34.886389, lng: 32.332511, precision: 'geocoded' }),
  P('venus-gardens-resort', { name: 'Venus Gardens Resort', place: 'chloraka', kind: 'resort', feature: 'gatedResort', beds: '2–3', luxury: true }),
  P('vikla-villas', { name: 'Vikla Villas', place: 'tsada', kind: 'villas', feature: 'hilltop', lat: 34.8312, lng: 32.474336, precision: 'geocoded' }),
  P('west-park-court', { name: 'West Park Court', place: 'paphos', kind: 'residential', feature: 'cityCentre' }),
  P('zanatzia-plots-and-villas', { name: 'Zanatzia Plots & Villas', slug: 'leptos-estates-zanatzia-plots-villas', place: 'paphos', kind: 'plots', feature: 'plots', url: 'https://www.leptosestates.com/project/zanatzia-plots-villas' }),
  P('zelemenos-village', { name: 'Zelemenos Village', place: 'tala', kind: 'villas', feature: 'exclusive', luxury: true }),
];

/** Greek projects: only linked (to the official pages), not listed in the directory. */
export const LEPTOS_GREECE: { name: string; where: string; url: string }[] = [
  { name: 'Aegean Blue Apartments II', where: 'Crete', url: 'https://www.leptosestates.com/project/aegean-blue-apartments-ii' },
  { name: 'Ano Glyfada Building', where: 'Ano Glyfada, Athens', url: 'https://www.leptosestates.com/project/ano-glyfada-building' },
  { name: 'Aphrodite Beachfront I & II', where: 'Crete', url: 'https://www.leptosestates.com/project/aphrodite-beachfront-i-ii' },
  { name: 'Aphrodite Beachfront III', where: 'Crete', url: 'https://www.leptosestates.com/project/aphrodite-beachfront-iii' },
  { name: 'Aphrodite Beachfront V', where: 'Crete', url: 'https://www.leptosestates.com/project/aphrodite-beachfront-v' },
  { name: 'Athens Properties', where: 'Ano Glyfada, Athens', url: 'https://www.leptosestates.com/project/athens-apartments' },
  { name: 'Costa Nopia', where: 'Chania, Crete', url: 'https://www.leptosestates.com/project/costa-nopia' },
  { name: 'Fournado Hills Villas', where: 'Fournado', url: 'https://www.leptosestates.com/project/fournado-hills-villas' },
  { name: 'Golden Coast Beach Villas', where: 'Paros', url: 'https://www.leptosestates.com/project/golden-coast-beach-villas' },
  { name: 'Maleme Beach Gardens', where: 'Maleme, Crete', url: 'https://www.leptosestates.com/project/maleme-beach-gardens' },
  { name: 'Maleme Beach Villas', where: 'Maleme, Crete', url: 'https://www.leptosestates.com/project/maleme-beach-villas' },
  { name: 'Molos Beach Village', where: 'Paros', url: 'https://www.leptosestates.com/project/molos-beach-village' },
  { name: 'Santorini Villas', where: 'Santorini', url: 'https://www.leptosestates.com/project/santorini-villas' },
  { name: 'Viglia Beach Villas', where: 'Crete', url: 'https://www.leptosestates.com/project/viglia-beach-villas' },
];

// ── offices ─────────────────────────────────────────────────────────────────────────────────────
export interface LeptosOffice {
  id: 'paphos' | 'nicosia' | 'limassol';
  /** The directory row of this office. */
  slug: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  lat: number; lng: number; precision: CoordsPrecision;
}
export const LEPTOS_OFFICES: LeptosOffice[] = [
  {
    id: 'paphos', slug: LEPTOS_SLUG, name: 'Leptos Estates Paphos',
    address: 'The Leptos House, 111 Apostolou Pavlou Avenue, 8046 Paphos',
    phone: '+357 26 880 100', email: 'contactus@leptosestates.com',
    lat: 34.757208, lng: 32.412227, precision: 'geocoded',
  },
  {
    id: 'nicosia', slug: 'armonia-estates-ltd-12525', name: 'Leptos Estates Nicosia',
    address: '9 Dhemetsanis Street, 1070 Nicosia',
    phone: '+357 22 458 745', email: 'leptosnc@leptosestates.com',
    lat: 35.164723, lng: 33.365636, precision: 'geocoded',
  },
  {
    id: 'limassol', slug: 'leptos-estates-limassol', name: 'Leptos Estates Limassol',
    address: '104 Amathountos Avenue, Shop 5, 4532 Agios Tychonas, Limassol',
    phone: '+357 25 873 233', email: 'info@leptosestates.com',
    lat: 34.709137, lng: 33.126074, precision: 'geocoded',
  },
];

/** The ten sales offices outside Cyprus (company workbook, Offices sheet). */
export const LEPTOS_ABROAD: { city: string; country: string; address: string; phone: string; email: string }[] = [
  { city: 'London', country: 'United Kingdom', address: '16 Berkeley Street, Mayfair, London W1J 8DZ', phone: '+44 208 883 2333', email: 'info@leptosuk.com' },
  { city: 'Dubai', country: 'UAE', address: 'Office N403, North Tower, Emirates Financial Towers, DIFC', phone: '+971 4 257 9306', email: 'info@leptosestates.ae' },
  { city: 'New Delhi', country: 'India', address: '1518, Regus, 15th Floor, Eros Corporate Tower, Nehru Place', phone: '+91 011 66 155 049', email: 'info@leptosestates.com' },
  { city: 'Beijing', country: 'China', address: 'Level 26, Fortune Financial Center, 5 Dong San Huan Road, Chaoyang District', phone: '+86 10 5775 0360', email: 'info@leptosestates.com' },
  { city: 'Shanghai', country: 'China', address: 'Unit 5, 38F Park Place, 1601 W. Nanjing Road, Jing’an District', phone: '+86 21 6137 3772', email: 'info@leptosestates.com' },
  { city: 'Ho Chi Minh City', country: 'Vietnam', address: 'Vincom Landmark 81, Vinhomes Central Park, 720A Dien Bien Phu, Binh Thanh District', phone: '+84 708 714 704', email: 'info@leptosestates.com' },
  { city: 'Cairo', country: 'Egypt', address: 'Al Fatemieen Street, Ismailia Square, Cairo Governorate', phone: '+20 114 448 2362', email: 'info@leptosestates.com' },
  { city: 'Athens', country: 'Greece', address: '37 Achaias Street, Ambelokipi, 115 23 Athens', phone: '+30 210 608 3800', email: 'infoathens@leptosestates.gr' },
  { city: 'Chania', country: 'Greece', address: 'Panorama Hotel, Kato Galatas, 73100 Chania, Crete', phone: '+30 28210 20830', email: 'infochania@leptosestates.gr' },
  { city: 'Paros', country: 'Greece', address: 'Ekatondapiliani, 84400 Paroikia, Paros', phone: '+30 22840 28503', email: 'infoparos@leptosestates.gr' },
];

// ── group structure ─────────────────────────────────────────────────────────────────────────────
export type SectorKey = 'realestate' | 'hospitality' | 'education' | 'health' | 'travel' | 'investment' | 'insurance';
export const SECTOR_ORDER: SectorKey[] = ['realestate', 'hospitality', 'education', 'health', 'travel', 'investment', 'insurance'];

export interface LeptosEntity {
  id: string;
  name: string;
  sector: SectorKey;
  /** The directory row, when the entity has a place in Cyprus that has its own page. */
  slug?: string;
  /** Own website (no scheme). */
  site?: string;
  /** Greek entities are listed but have no page here. */
  country?: 'GR';
}

export const LEPTOS_ENTITIES: LeptosEntity[] = [
  { id: 'estates', name: 'Leptos Estates', sector: 'realestate', slug: LEPTOS_SLUG, site: 'leptosestates.com' },
  { id: 'kamares', name: 'Kamares Village', sector: 'realestate', slug: 'leptos-estates-kamares-village', site: 'kamaresvillage.com' },
  { id: 'ecocity', name: 'Neapolis Smart EcoCity', sector: 'realestate', slug: 'leptos-estates-neapolis-smart-ecocity', site: 'neapolis.com' },
  { id: 'chestertons', name: 'Chestertons Cyprus Residential', sector: 'realestate', slug: 'leptos-chestertons-cyprus', site: 'chestertons.com.cy' },
  { id: 'vesta', name: 'Vesta Holidays', sector: 'realestate', slug: 'leptos-vesta-holidays', site: 'vestaholidays.com' },
  { id: 'design', name: 'Basilica Design Centre', sector: 'realestate' },
  { id: 'calypso', name: 'Leptos Calypso Hotels', sector: 'hospitality', site: 'leptoscalypso.com.cy' },
  { id: 'coral', name: 'Coral Beach Hotel & Resort', sector: 'hospitality', slug: 'coral-beach-hotel-and-resort', site: 'coral.com.cy' },
  { id: 'thalassa', name: 'Thalassa Boutique Hotel & Spa', sector: 'hospitality', slug: 'thalassa-3l4tp3', site: 'thalassa.com.cy' },
  { id: 'paphosgardens', name: 'Paphos Gardens Holiday Resort', sector: 'hospitality', slug: 'paphos-gardens-fvm4nm', site: 'paphosgardens.com' },
  { id: 'basilica', name: 'Basilica Holiday Resort', sector: 'hospitality', slug: 'basilica-4oa6krw', site: 'basilicaresort.com' },
  { id: 'panorama', name: 'Leptos Panorama Hotel', sector: 'hospitality', site: 'panorama-hotel.gr', country: 'GR' },
  { id: 'resitour', name: 'Resitour Holiday Residences', sector: 'hospitality', slug: 'leptos-resitour-holiday-residences', site: 'resitour.com' },
  { id: 'nup', name: 'Neapolis University Pafos', sector: 'education', slug: 'neapolis-university-pafos-paphos', site: 'nup.ac.cy' },
  { id: 'iasis', name: 'Iasis Private Hospital', sector: 'health', slug: 'iasis-private-hospital-4757', site: 'iasishospital.com' },
  { id: 'arena', name: 'Arena Sports', sector: 'travel', slug: 'leptos-arena-sports', site: 'arena-sports.com' },
  { id: 'leda', name: 'Leda Travel', sector: 'travel' },
  { id: 'karkavatsos', name: 'Karkavatsos & Sia Touristiki SA', sector: 'travel', country: 'GR' },
  { id: 'pandora', name: 'Pandora Investments', sector: 'investment', site: 'pandora.com.cy' },
  { id: 'cronos', name: 'Cronos Insurance Agency', sector: 'insurance' },
];

/** Directory rows of the group that are not projects and not offices: created or linked by the SQL. */
export interface LeptosGroupRow {
  slug: string;
  /** Existing rows are linked as they are; new rows are inserted. */
  existing?: boolean;
  name: string;
  type: 'vendor' | 'hotel';
  group: string;
  subtype: string;
  address: string;
  district: 'paphos';
  phone: string | null;
  email: string | null;
  url: string | null;
  lat: number; lng: number; precision: CoordsPrecision;
  tags: string[];
}
export const LEPTOS_NEW_GROUP_ROWS: LeptosGroupRow[] = [
  {
    slug: 'leptos-vesta-holidays', name: 'Vesta Holidays', type: 'vendor', group: 'realestate', subtype: 'property-management',
    address: 'Regina Gardens, Pinelopis Delta, 8016 Paphos', district: 'paphos', phone: '+357 26 880 570', email: 'info@vestaholidays.com',
    url: 'https://www.vestaholidays.com', lat: 34.783786, lng: 32.408588, precision: 'geocoded',
    tags: ['leptos', 'property management', 'rentals', 'paphos'],
  },
  {
    slug: 'leptos-chestertons-cyprus', name: 'Chestertons Cyprus Residential', type: 'vendor', group: 'realestate', subtype: 'real-estate-agency',
    address: '27 Poseidonos Avenue, 8042 Paphos', district: 'paphos', phone: '800 00 808', email: null,
    url: 'https://www.chestertons.com.cy', lat: 34.756076, lng: 32.416215, precision: 'geocoded',
    tags: ['leptos', 'estate agent', 'lettings', 'paphos'],
  },
  {
    slug: 'leptos-resitour-holiday-residences', name: 'Resitour Holiday Residences', type: 'vendor', group: 'stays', subtype: 'holiday-rentals',
    address: 'Leptos Aphrodite Gardens Complex 20, Agiou Panaretou Street, 8036 Paphos', district: 'paphos', phone: '+357 26 880 880', email: null,
    url: 'https://www.resitour.com', lat: 34.759436, lng: 32.430833, precision: 'geocoded',
    tags: ['leptos', 'holiday rentals', 'self-catering', 'paphos'],
  },
  {
    slug: 'leptos-arena-sports', name: 'Arena Sports', type: 'vendor', group: 'services', subtype: 'sports-travel',
    address: 'Coral Beach Hotel & Resort, Coral Bay, 8099 Paphos', district: 'paphos', phone: '+357 26 880 877', email: 'info@arena.com.cy',
    url: 'https://www.arena-sports.com', lat: 34.857098, lng: 32.362959, precision: 'geocoded',
    tags: ['leptos', 'sports travel', 'training camps', 'coral bay'],
  },
];

/** Existing group rows the profile links to. Only listed so tests and the SQL know which slugs belong to the group. */
export const LEPTOS_EXISTING_GROUP_SLUGS = [
  'coral-beach-hotel-and-resort', 'thalassa-3l4tp3', 'paphos-gardens-fvm4nm', 'basilica-4oa6krw',
  'neapolis-university-pafos-paphos', 'iasis-private-hospital-4757',
] as const;

// ── awards (titles as listed on leptosestates.com; years only where the title carries one) ───────
export interface LeptosAward { title: string; year?: string }
export const LEPTOS_AWARDS: LeptosAward[] = [
  { title: 'Excellence Award, finalist, Leisure Real Estate category', year: '1994' },
  { title: 'Best Cypriot Residential Development, highly commended', year: '1997' },
  { title: 'Best Cypriot Development', year: '2003' },
  { title: 'Leading Cypriot Developer', year: '2003/2004' },
  { title: 'Best Cypriot Development', year: '2004' },
  { title: 'Best Cypriot Property', year: '2004' },
  { title: 'Best Property Agents', year: '2006' },
  { title: 'Best Property Agents', year: '2007' },
  { title: 'Best Property Agents', year: '2010' },
  { title: 'Cyprus Congress Award', year: '2011' },
  { title: 'Cyprus Expo Award', year: '2012' },
  { title: 'Award for Excellence, Moscow: Gold Standard Hotel for Family Holiday', year: '2014' },
  { title: 'Cyprus Export Award', year: '2016' },
  { title: 'Cyprus Export Award', year: '2018' },
  { title: 'Best Residential Development (20+ units), Cyprus', year: '2025' },
  { title: 'Best Cyprus Property' },
  { title: 'Best Cypriot Apartment, silver' },
  { title: 'Best Cypriot House / Villa' },
  { title: 'Best Development Cyprus' },
  { title: 'Best Development Greece' },
  { title: 'Residential Development Cyprus' },
  { title: 'Residential Development Greece' },
  { title: 'Best Residential High-Rise Development Cyprus' },
  { title: 'Residential High-Rise Architecture Cyprus' },
  { title: 'Residential Interior, Private Residence' },
  { title: 'Best Interior Design Show Home Cyprus' },
  { title: 'Developer Website Award' },
];
/** The company website lists 33 award pages; the list above merges the repeated titles. */
export const LEPTOS_AWARD_PAGES = 33;

// ── helpers ─────────────────────────────────────────────────────────────────────────────────────
export const LEPTOS_PROJECT_SLUGS: string[] = LEPTOS_PROJECTS.map((p) => p.slug);
export const LEPTOS_NEW_PROJECTS: LeptosProject[] = LEPTOS_PROJECTS.filter((p) => !p.existing);

/** Every directory slug that belongs to the Leptos group (hub, offices, group rows, projects). */
export const LEPTOS_ALL_SLUGS: string[] = Array.from(new Set([
  LEPTOS_SLUG,
  ...LEPTOS_OFFICES.map((o) => o.slug),
  ...LEPTOS_NEW_GROUP_ROWS.map((g) => g.slug),
  ...LEPTOS_EXISTING_GROUP_SLUGS,
  ...LEPTOS_PROJECT_SLUGS,
]));

export function projectBySlug(slug: string): LeptosProject | undefined {
  return LEPTOS_PROJECTS.find((p) => p.slug === slug);
}
