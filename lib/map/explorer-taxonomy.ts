// lib/map/explorer-taxonomy.ts
// ============================================================================
// Category model for the map explorer (components/MapExplorer.tsx).
// Pure + dependency-light so the server page, the API routes, the client and the
// unit tests all share it.
//
// Source of truth stays where it already is — nothing here redefines a category:
//   • the 89 canonical categories + their 17 groups → lib/directory/taxonomy.ts
//   • each category's icon + label in 7 languages   → lib/directory/map-meta.ts
// This module only ADDS what the explorer needs on top: translated names for the
// 17 canonical groups, the order they appear in, a fallback for rows that have no
// canonical_category yet, and the "What's on" pseudo-category for events.
// ============================================================================
import { CANONICAL_CATEGORIES } from '@/lib/directory/taxonomy';
import { catLabel, categoryIcon } from '@/lib/directory/map-meta';
import { ACTIVITY_KINDS, kindLabel } from '@/lib/activities/classify';

/** Pseudo-category used for Agenda events on the map (events have no canonical_category). */
export const EVENT_CAT = 'event';
export const EVENT_GROUP = 'events';
/** Bookable activities: one pseudo-category per kind ('act:boat', 'act:diving' …) in their own group. */
export const ACTIVITY_PREFIX = 'act:';
export const ACTIVITY_GROUP = 'activities';
export const isActivityCat = (k: string) => k.startsWith(ACTIVITY_PREFIX);

/** canonical category key → canonical group key (from lib/directory/taxonomy.ts). */
export const CATEGORY_GROUP: Readonly<Record<string, string>> = Object.fromEntries(
  CANONICAL_CATEGORIES.map((c) => [c.key, c.group]),
);

/** Rows not yet normalised (canonical_category is null) fall back via their legacy `type`. */
export const TYPE_FALLBACK: Readonly<Record<string, string>> = {
  restaurant: 'restaurant', winery: 'winery', hotel: 'hotel', beach: 'beach',
  development: 'property-developer', vendor: 'general-vendor',
};

export function canonicalOf(canonical: string | null | undefined, type: string | null | undefined): string {
  if (canonical && CATEGORY_GROUP[canonical]) return canonical;
  return (type && TYPE_FALLBACK[type]) || 'general-vendor';
}

/** Display order of the canonical groups (visitor-first, then residents/investors). */
export const GROUP_ORDER = [
  'dining', 'nightlife', 'food-retail', 'stays', 'leisure', 'culture', 'retail', 'beauty', 'health', 'fitness',
  'home-services', 'real-estate', 'professional', 'mobility', 'education', 'services', 'other',
] as const;

/** A representative category per group — its icon stands for the group. */
const GROUP_ICON_CAT: Record<string, string> = {
  dining: 'restaurant', nightlife: 'bar', 'food-retail': 'supermarket', stays: 'hotel', leisure: 'tour-activity',
  culture: 'museum', retail: 'fashion-clothing', beauty: 'beauty-spa', health: 'doctor-clinic', fitness: 'gym-fitness',
  'home-services': 'plumber', 'real-estate': 'real-estate-agency', professional: 'law-firm', mobility: 'car-rental',
  education: 'school', services: 'photographer', other: 'general-vendor', [EVENT_GROUP]: 'event-venue',
};

/** Accent colour per group (used for the small dot on group headings and map dots). */
export const GROUP_COLOR: Record<string, string> = {
  dining: '#C0492E', nightlife: '#9B3D5A', 'food-retail': '#B8763B', stays: '#1F6F78', leisure: '#2F86C4',
  culture: '#8E6FB0', retail: '#B8763B', beauty: '#C76D8E', health: '#3E8E7E', fitness: '#4E7A46',
  'home-services': '#6B5B3E', 'real-estate': '#8A6D3B', professional: '#4A6FA5', mobility: '#C9A24C',
  education: '#6B7280', services: '#4E7A46', other: '#7A7F87', [EVENT_GROUP]: '#C9A24C', [ACTIVITY_GROUP]: '#2F86C4',
};

const ACTIVITY_GROUP_LABEL: Record<string, string> = {
  en: 'Activities & tours', el: 'Δραστηριότητες & εκδρομές', ro: 'Activități & tururi', ar: 'الأنشطة والجولات',
  de: 'Aktivitäten & Touren', pl: 'Atrakcje i wycieczki', ru: 'Развлечения и экскурсии',
};

// Translated names for the 17 canonical groups (new — the repo had English keys only).
const GROUP_LABELS: Record<string, Record<string, string>> = {
  en: { dining: 'Dining', nightlife: 'Bars & nightlife', 'food-retail': 'Food shops', stays: 'Stays', leisure: 'Leisure & activities', culture: 'Culture', retail: 'Shopping', beauty: 'Beauty', health: 'Health', fitness: 'Fitness', 'home-services': 'Home services & trades', 'real-estate': 'Property', professional: 'Professional services', mobility: 'Getting around', education: 'Education & childcare', services: 'Other services', other: 'Other' },
  el: { dining: 'Φαγητό', nightlife: 'Μπαρ & νυχτερινή ζωή', 'food-retail': 'Τρόφιμα', stays: 'Διαμονή', leisure: 'Αναψυχή & δραστηριότητες', culture: 'Πολιτισμός', retail: 'Αγορές', beauty: 'Ομορφιά', health: 'Υγεία', fitness: 'Γυμναστική', 'home-services': 'Υπηρεσίες σπιτιού & τεχνίτες', 'real-estate': 'Ακίνητα', professional: 'Επαγγελματικές υπηρεσίες', mobility: 'Μετακινήσεις', education: 'Εκπαίδευση & φροντίδα παιδιών', services: 'Λοιπές υπηρεσίες', other: 'Άλλο' },
  ro: { dining: 'Restaurante', nightlife: 'Baruri & viață de noapte', 'food-retail': 'Magazine alimentare', stays: 'Cazare', leisure: 'Timp liber & activități', culture: 'Cultură', retail: 'Cumpărături', beauty: 'Frumusețe', health: 'Sănătate', fitness: 'Fitness', 'home-services': 'Servicii casnice & meșteri', 'real-estate': 'Imobiliare', professional: 'Servicii profesionale', mobility: 'Transport', education: 'Educație & îngrijire copii', services: 'Alte servicii', other: 'Altele' },
  ar: { dining: 'المطاعم', nightlife: 'البارات والسهر', 'food-retail': 'متاجر الأغذية', stays: 'الإقامة', leisure: 'الترفيه والأنشطة', culture: 'الثقافة', retail: 'التسوق', beauty: 'التجميل', health: 'الصحة', fitness: 'اللياقة', 'home-services': 'خدمات المنزل والحرفيون', 'real-estate': 'العقارات', professional: 'الخدمات المهنية', mobility: 'التنقل', education: 'التعليم ورعاية الأطفال', services: 'خدمات أخرى', other: 'أخرى' },
  de: { dining: 'Essen', nightlife: 'Bars & Nachtleben', 'food-retail': 'Lebensmittel', stays: 'Unterkünfte', leisure: 'Freizeit & Aktivitäten', culture: 'Kultur', retail: 'Shopping', beauty: 'Beauty', health: 'Gesundheit', fitness: 'Fitness', 'home-services': 'Haus & Handwerk', 'real-estate': 'Immobilien', professional: 'Fachdienstleistungen', mobility: 'Mobilität', education: 'Bildung & Kinderbetreuung', services: 'Weitere Dienste', other: 'Sonstiges' },
  pl: { dining: 'Jedzenie', nightlife: 'Bary i życie nocne', 'food-retail': 'Sklepy spożywcze', stays: 'Noclegi', leisure: 'Rozrywka i atrakcje', culture: 'Kultura', retail: 'Zakupy', beauty: 'Uroda', health: 'Zdrowie', fitness: 'Fitness', 'home-services': 'Dom i fachowcy', 'real-estate': 'Nieruchomości', professional: 'Usługi profesjonalne', mobility: 'Transport', education: 'Edukacja i opieka nad dziećmi', services: 'Inne usługi', other: 'Inne' },
  ru: { dining: 'Еда', nightlife: 'Бары и ночная жизнь', 'food-retail': 'Продукты', stays: 'Проживание', leisure: 'Досуг и развлечения', culture: 'Культура', retail: 'Покупки', beauty: 'Красота', health: 'Здоровье', fitness: 'Фитнес', 'home-services': 'Дом и мастера', 'real-estate': 'Недвижимость', professional: 'Профессиональные услуги', mobility: 'Транспорт', education: 'Образование и дети', services: 'Другие услуги', other: 'Другое' },
};

export function groupLabel(group: string, locale: string, eventsLabel = 'Events'): string {
  if (group === EVENT_GROUP) return eventsLabel;
  if (group === ACTIVITY_GROUP) return ACTIVITY_GROUP_LABEL[locale] || ACTIVITY_GROUP_LABEL.en;
  return GROUP_LABELS[locale]?.[group] || GROUP_LABELS.en[group] || group;
}

export interface ExplorerCategory { k: string; label: string; icon: string; group: string; count: number }
export interface ExplorerGroup { k: string; label: string; icon: string; color: string }

/**
 * Every category the backend knows (all 89 canonical keys + the events pseudo-category),
 * labelled for `locale`, with the given counts (0 when absent). Sorted by count desc, then label.
 */
export function explorerCategories(locale: string, counts: Record<string, number>, eventsLabel: string): ExplorerCategory[] {
  const out: ExplorerCategory[] = CANONICAL_CATEGORIES.map((c) => ({
    k: c.key, label: catLabel(c.key, locale), icon: categoryIcon(c.key), group: c.group, count: counts[c.key] || 0,
  }));
  out.push({ k: EVENT_CAT, label: eventsLabel, icon: categoryIcon('event-venue'), group: EVENT_GROUP, count: counts[EVENT_CAT] || 0 });
  for (const k of ACTIVITY_KINDS) {
    const key = `${ACTIVITY_PREFIX}${k.key}`;
    out.push({ k: key, label: kindLabel(k.key, locale), icon: k.icon, group: ACTIVITY_GROUP, count: counts[key] || 0 });
  }
  return out.sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, locale));
}

export function explorerGroups(locale: string, eventsLabel: string): ExplorerGroup[] {
  return [ACTIVITY_GROUP, ...GROUP_ORDER, EVENT_GROUP].map((g) => ({
    k: g, label: groupLabel(g, locale, eventsLabel),
    icon: g === ACTIVITY_GROUP ? ACTIVITY_KINDS.find((k) => k.key === 'sightseeing')!.icon : categoryIcon(GROUP_ICON_CAT[g] || 'general-vendor'),
    color: GROUP_COLOR[g] || '#7A7F87',
  }));
}
