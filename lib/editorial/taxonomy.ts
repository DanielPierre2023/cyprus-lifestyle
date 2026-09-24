// lib/editorial/taxonomy.ts
// ============================================================================
// THE EDITORIAL TAXONOMY — the merged departments + subcategories that structure
// the magazine, the accountability plan, and the AI planner. Pure data + helpers
// (NO I/O), so it is unit-tested and shared by the seed check, the admin cockpit,
// the planner and the public nav.
// ----------------------------------------------------------------------------
// This is the SINGLE SOURCE OF TRUTH for the section registry. Migration
// 0114_editorial_sections.sql seeds `editorial_sections` to MATCH this file
// exactly (a test asserts the counts/targets), so code and database never drift.
//
// Design (approved by Daniel, Sep 2026):
//   • 9 DEPARTMENTS (top-level, parent_key = null). Six keep their existing keys
//     so no published article or URL breaks (table, escapes, culture, business,
//     people, property); three are NEW (style, design-living, the-island).
//   • 31 active SUBCATEGORIES. Legacy section keys (relocation, agenda, cyprus)
//     are KEPT as subcategory keys under their new department, so existing
//     blog_posts.category values still resolve. 'world' is kept but inactive
//     (legacy catch-all) so old rows map without cluttering the nav.
//   • Each subcategory carries its editorial remit, a MONTHLY TARGET (they sum to
//     79/month), a default FRANCHISE, and the DIRECTORY category keys it draws its
//     featured subjects from — the link from the magazine to the 17,747 businesses.
// ============================================================================

export interface EditorialSection {
  key: string;
  name: string;
  description: string;      // the remit, in house voice
  parentKey: string | null; // null = department; else the department key
  monthlyTarget: number;    // articles/month (0 on departments — rolled up from children)
  franchiseKey: string | null; // default franchise (see lib/editorial/pipeline.ts FRANCHISES)
  dirGroups: string[];      // canonical directory category keys supplying featured subjects
  active: boolean;          // false = legacy catch-all, kept for backward-compat, hidden from nav
}

// ── Departments (order = nav order) ───────────────────────────────────────────
const DEPARTMENTS: EditorialSection[] = [
  { key: 'style',         name: 'Style',                 description: 'How the island dresses, adorns and presents itself.',                              parentKey: null, monthlyTarget: 0, franchiseKey: null, dirGroups: [], active: true },
  { key: 'table',         name: 'The Table',             description: 'Where and how Cyprus eats and drinks.',                                            parentKey: null, monthlyTarget: 0, franchiseKey: null, dirGroups: [], active: true },
  { key: 'escapes',       name: 'Escapes',               description: 'The island as a place to arrive slowly.',                                          parentKey: null, monthlyTarget: 0, franchiseKey: null, dirGroups: [], active: true },
  { key: 'design-living', name: 'Design & Living',       description: 'Architecture, interiors and the well-made object.',                                parentKey: null, monthlyTarget: 0, franchiseKey: null, dirGroups: [], active: true },
  { key: 'property',      name: 'Property & Relocation', description: 'The practical business of living here.',                                           parentKey: null, monthlyTarget: 0, franchiseKey: null, dirGroups: [], active: true },
  { key: 'business',      name: 'Business',              description: 'The island economy and the people building it.',                                   parentKey: null, monthlyTarget: 0, franchiseKey: null, dirGroups: [], active: true },
  { key: 'culture',       name: 'Culture',               description: 'Art, heritage and what’s on.',                                                     parentKey: null, monthlyTarget: 0, franchiseKey: null, dirGroups: [], active: true },
  { key: 'people',        name: 'People',                description: 'The human island.',                                                               parentKey: null, monthlyTarget: 0, franchiseKey: null, dirGroups: [], active: true },
  { key: 'the-island',    name: 'The Island',            description: 'Essentials, news and the knowledge that helps — the civic layer, in the reader’s voice.', parentKey: null, monthlyTarget: 0, franchiseKey: null, dirGroups: [], active: true },
];

// ── Subcategories ─────────────────────────────────────────────────────────────
const SUBCATEGORIES: EditorialSection[] = [
  // Style
  { key: 'style-fashion',   name: 'Fashion & Wardrobe',        description: 'Cypriot designers, boutiques and the seasonal Mediterranean wardrobe.',              parentKey: 'style',         monthlyTarget: 3, franchiseKey: null,                 dirGroups: ['fashion-clothing', 'footwear', 'tailor'], active: true },
  { key: 'style-beauty',    name: 'Beauty & Grooming',         description: 'Salons, spas, barbers and skincare worth the appointment.',                          parentKey: 'style',         monthlyTarget: 2, franchiseKey: 'maker',              dirGroups: ['beauty-spa', 'hair-barber', 'nail-salon', 'tattoo-piercing'], active: true },
  { key: 'style-jewellery', name: 'Jewellery & Watches',       description: 'Goldsmiths and ateliers, filigree cut by eye.',                                      parentKey: 'style',         monthlyTarget: 1, franchiseKey: 'maker',              dirGroups: ['jewellery'], active: true },
  // The Table
  { key: 'table-fine',      name: 'Fine Dining',               description: 'The tables worth travelling for, reported without flattery.',                        parentKey: 'table',         monthlyTarget: 4, franchiseKey: 'at-the-table',       dirGroups: ['restaurant'], active: true },
  { key: 'table-taverna',   name: 'Tavernas & Island Cooking', description: 'The authentic, the local, the meze that matters.',                                   parentKey: 'table',         monthlyTarget: 2, franchiseKey: 'at-the-table',       dirGroups: ['restaurant', 'deli-gourmet'], active: true },
  { key: 'table-wine',      name: 'Wine & Vineyards',          description: 'The island’s wineries and the people making Cypriot wine serious.',                  parentKey: 'table',         monthlyTarget: 2, franchiseKey: 'maker',              dirGroups: ['winery'], active: true },
  { key: 'table-nightlife', name: 'Bars & Nightlife',          description: 'Cocktail rooms, rooftops and where the night goes.',                                 parentKey: 'table',         monthlyTarget: 2, franchiseKey: 'at-the-table',       dirGroups: ['bar', 'nightclub'], active: true },
  // Escapes
  { key: 'escapes-beaches', name: 'Beaches & Coves',           description: 'The earned beaches, the hidden coves, the swim before the crowds.',                  parentKey: 'escapes',       monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['beach', 'diving-centre'], active: true },
  { key: 'escapes-stays',   name: 'Hotels, Resorts & Villas',  description: 'Where to stay, from the grand resort to the restored stone house.',                  parentKey: 'escapes',       monthlyTarget: 3, franchiseKey: 'tastemakers',        dirGroups: ['hotel', 'villa-rental', 'apartment-rental', 'agrotourism'], active: true },
  { key: 'escapes-sea',     name: 'Sea & Society',             description: 'Yachting, the marina set, watersports and the long lunch on the water.',             parentKey: 'escapes',       monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['yacht-boat-charter', 'diving-centre'], active: true },
  { key: 'escapes-tours',   name: 'Days Out & Tours',          description: 'Excursions, guides and the itinerary worth following.',                              parentKey: 'escapes',       monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['tour-activity'], active: true },
  // Design & Living
  { key: 'design-arch',     name: 'Architecture & Interiors',  description: 'The houses and rooms that define contemporary Cyprus.',                              parentKey: 'design-living', monthlyTarget: 2, franchiseKey: 'tastemakers',        dirGroups: ['architect'], active: true },
  { key: 'design-homes',    name: 'Homes & Gardens',           description: 'Furnishing and planting a Mediterranean life.',                                      parentKey: 'design-living', monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['furniture-homeware', 'gardener-landscaper'], active: true },
  { key: 'design-maker',    name: 'The Maker',                 description: 'Craftspeople and producers — ceramicists, boat-builders, perfumers.',               parentKey: 'design-living', monthlyTarget: 2, franchiseKey: 'maker',              dirGroups: ['jewellery', 'winery', 'photographer'], active: true },
  // Property & Relocation
  { key: 'property-buying', name: 'Buying & Renting',          description: 'The market, the developments, the honest numbers.',                                  parentKey: 'property',      monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['real-estate-agency', 'property-developer'], active: true },
  { key: 'property-hoods',  name: 'Neighbourhoods',            description: 'Area guides — who lives where, and why.',                                            parentKey: 'property',      monthlyTarget: 2, franchiseKey: null,                 dirGroups: [], active: true },
  { key: 'relocation',      name: 'Relocation & Residency',    description: 'Visas, tax, moving — the move-to-Cyprus playbook.',                                  parentKey: 'property',      monthlyTarget: 3, franchiseKey: 'concierge-meets',    dirGroups: ['immigration-adviser', 'law-firm', 'company-formation'], active: true },
  { key: 'property-family', name: 'Schools & Family',          description: 'Schools, childcare and raising a family on the island.',                             parentKey: 'property',      monthlyTarget: 1, franchiseKey: null,                 dirGroups: ['school', 'nursery-childcare', 'tutoring-language'], active: true },
  // Business
  { key: 'business-founders', name: 'Behind the Business',     description: 'Founder profiles — how they actually built it.',                                     parentKey: 'business',      monthlyTarget: 4, franchiseKey: 'behind-the-business', dirGroups: [], active: true },
  { key: 'business-economy',  name: 'Economy & Investment',    description: 'Money, funds, the forces shaping the island.',                                       parentKey: 'business',      monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['bank', 'accountant', 'business-consultant'], active: true },
  { key: 'business-tech',     name: 'Tech & Startups',         description: 'The companies betting on Cyprus as a base.',                                         parentKey: 'business',      monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['web-it', 'marketing-agency'], active: true },
  // Culture
  { key: 'culture-art',      name: 'Art & Galleries',          description: 'Shows, artists and the collectors around them.',                                     parentKey: 'culture',       monthlyTarget: 2, franchiseKey: 'tastemakers',        dirGroups: ['museum'], active: true },
  { key: 'culture-heritage', name: 'Heritage & Archaeology',   description: 'The deep past, told for the present.',                                               parentKey: 'culture',       monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['archaeological-site'], active: true },
  { key: 'culture-stage',    name: 'Music, Film & Stage',      description: 'Performance across the island.',                                                     parentKey: 'culture',       monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['theatre-arts'], active: true },
  { key: 'agenda',           name: 'The Agenda',               description: 'The essential events calendar, curated.',                                            parentKey: 'culture',       monthlyTarget: 4, franchiseKey: null,                 dirGroups: ['event-venue'], active: true },
  // People
  { key: 'people-tastemakers', name: 'The Tastemakers',        description: 'Long-form conversations with those shaping how Cyprus lives well.',                  parentKey: 'people',        monthlyTarget: 4, franchiseKey: 'tastemakers',        dirGroups: [], active: true },
  { key: 'people-fivemin',     name: 'Five Minutes With',      description: 'Fast, quotable Q&As with someone worth knowing this week.',                          parentKey: 'people',        monthlyTarget: 8, franchiseKey: 'five-min',           dirGroups: [], active: true },
  { key: 'people-society',     name: 'Society',                description: 'Parties, openings and the social calendar.',                                         parentKey: 'people',        monthlyTarget: 2, franchiseKey: null,                 dirGroups: ['event-venue'], active: true },
  // The Island
  { key: 'cyprus',            name: 'News & Now',              description: 'What’s happening on the island (absorbs the former “Cyprus” and “World”).',          parentKey: 'the-island',    monthlyTarget: 4, franchiseKey: null,                 dirGroups: [], active: true },
  { key: 'island-essentials', name: 'Essentials & Civic',      description: 'Pharmacies, emergencies, how-things-work — the concierge’s knowledge, published.',   parentKey: 'the-island',    monthlyTarget: 2, franchiseKey: 'concierge-meets',    dirGroups: ['pharmacy', 'hospital', 'doctor-clinic'], active: true },
  { key: 'island-guides',     name: 'Guides',                  description: 'Evergreen, practical how-to for residents and movers.',                              parentKey: 'the-island',    monthlyTarget: 2, franchiseKey: null,                 dirGroups: [], active: true },
  // Legacy catch-all — kept so historical blog_posts.category='world' still maps, hidden from nav.
  { key: 'world',             name: 'World',                   description: 'Legacy international bucket — folded into News & Now.',                               parentKey: 'the-island',    monthlyTarget: 0, franchiseKey: null,                 dirGroups: [], active: false },
];

export const EDITORIAL_SECTIONS: EditorialSection[] = [...DEPARTMENTS, ...SUBCATEGORIES];

// A stable sort index (nav/board order): departments in declared order, each
// followed by its subcategories in declared order.
export function orderedSections(): EditorialSection[] {
  const out: EditorialSection[] = [];
  for (const d of DEPARTMENTS) {
    out.push(d);
    for (const s of SUBCATEGORIES) if (s.parentKey === d.key) out.push(s);
  }
  return out;
}
export const SECTION_SORT: Record<string, number> = Object.fromEntries(
  orderedSections().map((s, i) => [s.key, (i + 1) * 10]),
);

// ── lookups & rollups ─────────────────────────────────────────────────────────
export const SECTION_KEYS: ReadonlySet<string> = new Set(EDITORIAL_SECTIONS.map((s) => s.key));
export const isSection = (k: string): boolean => SECTION_KEYS.has(k);
export const getSection = (k: string): EditorialSection | undefined => EDITORIAL_SECTIONS.find((s) => s.key === k);
export const departments = (): EditorialSection[] => DEPARTMENTS.filter((d) => d.active);
export const subcategoriesOf = (deptKey: string): EditorialSection[] =>
  SUBCATEGORIES.filter((s) => s.parentKey === deptKey && s.active);
export const activeSubcategories = (): EditorialSection[] => SUBCATEGORIES.filter((s) => s.active);

// A department's monthly target = the sum of its active subcategories'.
export function departmentTarget(deptKey: string): number {
  return subcategoriesOf(deptKey).reduce((a, s) => a + s.monthlyTarget, 0);
}
// The whole-magazine monthly target (the 79).
export function totalMonthlyTarget(): number {
  return activeSubcategories().reduce((a, s) => a + s.monthlyTarget, 0);
}
// Resolve any section key (dept or sub) to its department key.
export function departmentOf(key: string): string | null {
  const s = getSection(key);
  if (!s) return null;
  return s.parentKey ?? s.key;
}
