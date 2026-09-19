// Cyprus Lifestyle — the connector taxonomy. Twelve top-level groups spanning
// every business a visitor, resident or investor could need. Pure config so
// server (queries, pages, ingestion mapping) and client share one source of
// truth. Group labels are localised via next-intl `groups.<key>`; the current
// six directory `type`s each roll up into a group (see TYPE_GROUP), and the data
// engine fills the finer `subtype`s over time.

export interface TaxonomyGroup {
  key: string;            // stable id, also the i18n key (groups.<key>)
  color: string;          // accent used on chips/dots
  subtypes: string[];     // representative sub-categories (English display seeds)
}

export const TAXONOMY: TaxonomyGroup[] = [
  { key: 'hospitality', color: '#C0492E', subtypes: ['Restaurants', 'Cafés & bakeries', 'Bars & nightlife', 'Beach clubs', 'Catering & private chefs'] },
  { key: 'stays',       color: '#1F6F78', subtypes: ['Hotels & resorts', 'Boutique', 'Luxury villas', 'Serviced apartments', 'Agrotourism'] },
  { key: 'realestate',  color: '#8A6D3B', subtypes: ['Developers', 'Agencies', 'Construction', 'Architects', 'Interior design', 'Furniture', 'Property management', 'Legal & notary', 'Mortgage'] },
  { key: 'professional', color: '#4A6FA5', subtypes: ['Company formation', 'Accounting & tax', 'Banking', 'Immigration & residency', 'Law firms', 'Insurance', 'Consulting'] },
  { key: 'services',    color: '#4E7A46', subtypes: ['Cleaning & laundry', 'Maintenance & trades', 'Movers', 'Janitorial & suppliers', 'Pet care', 'Childcare', 'Security'] },
  { key: 'health',      color: '#3E8E7E', subtypes: ['Clinics & hospitals', 'Dentists', 'Pharmacies', 'Diagnostics', 'Gyms', 'Spa & beauty', 'Physiotherapy'] },
  { key: 'retail',      color: '#B8763B', subtypes: ['Malls', 'Boutiques & fashion', 'Luxury & designer', 'Jewellery', 'Cosmetics', 'Electronics', 'Home & DIY', 'Souvenirs', 'Art & antiques', 'Food markets'] },
  { key: 'food',        color: '#7B2D42', subtypes: ['Wineries', 'Distilleries & breweries', 'Halloumi & dairy', 'Olive oil & honey', 'Confectionery', 'Farm shops'] },
  { key: 'nature',      color: '#2F86C4', subtypes: ['Blue Flag beaches', 'Forest parks', 'Akamas & Cape Greco', 'Trails & viewpoints', 'Gardens'] },
  { key: 'culture',     color: '#8E6FB0', subtypes: ['Museums & UNESCO', 'Galleries & theatres', 'Tours & activities', 'Diving & boat trips', 'Events & weddings', 'Golf & marinas'] },
  { key: 'community',   color: '#6B7280', subtypes: ['International schools', 'Universities', 'Language schools', 'Worship', 'Consulates', 'Expat community'] },
  { key: 'mobility',    color: '#C9A24C', subtypes: ['Taxi & ride-hailing', 'Public buses', 'Luxury transfer', 'Car rental', 'Car sharing', 'Airport shuttle', 'Yacht charter'] },
];

export const GROUP_KEYS = TAXONOMY.map((g) => g.key);

// The current six directory `type`s → their parent group.
export const TYPE_GROUP: Record<string, string> = {
  restaurant: 'hospitality',
  winery: 'food',
  hotel: 'stays',
  development: 'realestate',
  beach: 'nature',
  vendor: 'services',
};

export function groupColor(key: string): string {
  return (TAXONOMY.find((g) => g.key === key)?.color) || '#C9A24C';
}
