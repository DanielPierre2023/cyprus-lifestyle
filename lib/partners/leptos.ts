// lib/partners/leptos.ts: everything derived from the Leptos data and texts. Pure functions (no I/O), unit-tested.
//   • summaries for the directory rows (the SQL is generated from the same functions, so page, SQL and concierge never disagree)
//   • the concierge brief and the "is this about Leptos?" detector
import type { Locale } from '@/lib/locales';
import {
  AREA_ORDER, AREA_OF_PLACE, LEPTOS_AWARDS, LEPTOS_AWARD_PAGES, LEPTOS_ENTITIES, LEPTOS_GREECE,
  LEPTOS_OFFICES, LEPTOS_PROJECTS, LEPTOS_SLUG, LEPTOS_ALL_SLUGS, SECTOR_ORDER,
  type LeptosProject, type PlaceKey,
} from '@/lib/partners/leptos.data';
import { AREA, ENTITY_ROLE, FEATURE, HUB_SUMMARY, KIND, OFFICE_NOTE, PLACE, SECTOR } from '@/lib/partners/leptos.text';

export * from '@/lib/partners/leptos.data';
export * from '@/lib/partners/leptos.text';

/** The short text stored in directory_listings.summary_<locale> of a project: a fixed sentence frame plus one fact from the project's own description. */
export function projectSummary(locale: Locale, p: LeptosProject): string {
  const base = KIND[p.kind].frame[locale].replace('{name}', p.name).replace('{in}', PLACE[p.place].in[locale]);
  return p.feature ? `${base} ${FEATURE[p.feature][locale]}` : base;
}

export const placeName = (locale: Locale, key: PlaceKey): string => PLACE[key].name[locale];
export const kindLabel = (locale: Locale, p: LeptosProject): string => KIND[p.kind].label[locale];
export const hubSummary = (locale: Locale): string => HUB_SUMMARY[locale];
export const officeSummary = (locale: Locale, id: 'paphos' | 'nicosia' | 'limassol'): string => OFFICE_NOTE[id][locale];
export const entitySummary = (locale: Locale, id: string): string => ENTITY_ROLE[id]?.[locale] ?? '';

/** Summary of one of the new group rows (Vesta, Chestertons, Resitour, Arena): the entity's role line. */
export function groupRowSummary(locale: Locale, slug: string): string {
  const e = LEPTOS_ENTITIES.find((x) => x.slug === slug);
  return e ? entitySummary(locale, e.id) : '';
}

/** What the page shows about a listing that belongs to the Leptos group (a small block with a link to the head-office page). */
export type LeptosRole = 'hub' | 'project' | 'office' | 'group';
export function leptosRole(slug: string): LeptosRole | null {
  if (slug === LEPTOS_SLUG) return 'hub';
  if (LEPTOS_PROJECTS.some((p) => p.slug === slug)) return 'project';
  if (LEPTOS_OFFICES.some((o) => o.slug === slug)) return 'office';
  if (LEPTOS_ALL_SLUGS.includes(slug)) return 'group';
  return null;
}

// ── concierge ────────────────────────────────────────────────────────────────────────────────────
const fold = (s: string): string => s.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Names that identify Leptos in a guest's message. Generic project names that other businesses also use are left out. */
const GENERIC_PROJECT = new Set(['Paphos Gardens', 'Coral Gardens', 'Kings Court', 'Kings Gardens', 'Regina Gardens', 'Peyia Gardens', 'Limassol Park', 'West Park Court', 'Paradise Gardens', 'Aphrodite Gardens', 'Coral Bay Villas']);
const NAME_TOKENS: string[] = [
  ...LEPTOS_PROJECTS.filter((p) => !GENERIC_PROJECT.has(p.name)).map((p) => fold(p.name)),
  'armonia estates', 'leptos', 'leptosestates', 'vesta holidays', 'resitour', 'pandora investments', 'neapolis smart ecocity', 'neapolis ecocity',
];
// Cyrillic and Arabic spellings of the brand. The Greek spelling is the ordinary word "thin", so Greek text must carry the Latin name.
const SCRIPT_TOKENS = ['лептос', 'ليبتوس'];

/** True when the guest's message is about Leptos (the brand, a project or an entity), or the best named match is one of its listings. */
export function leptosMentioned(text: string, namedSlugs: string[] = []): boolean {
  const t = fold(String(text || ''));
  if (NAME_TOKENS.some((n) => new RegExp(`(^|[^a-z0-9])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(t))) return true;
  if (SCRIPT_TOKENS.some((n) => t.includes(n))) return true;
  return namedSlugs.some((s) => LEPTOS_ALL_SLUGS.includes(s));
}

const joinNames = (xs: string[]): string => xs.join(', ');

/** The brief the concierge receives when a guest asks about Leptos. English facts; the model answers in the guest's language. */
export function leptosBrief(): string {
  const byArea = AREA_ORDER.map((a) => {
    const ps = LEPTOS_PROJECTS.filter((p) => AREA_OF_PLACE[p.place] === a);
    return `  - ${AREA[a].en} (${ps.length}): ${joinNames(ps.map((p) => p.name))}`;
  });
  const bySector = SECTOR_ORDER.map((s) => {
    const es = LEPTOS_ENTITIES.filter((e) => e.sector === s);
    return `  - ${SECTOR[s].en}: ${joinNames(es.map((e) => (e.country === 'GR' ? `${e.name} (Greece)` : e.name)))}`;
  });
  const offices = LEPTOS_OFFICES.map((o) => `  - ${o.name}: ${o.address}. Tel ${o.phone}`);
  const awards = LEPTOS_AWARDS.filter((a) => a.year).map((a) => `${a.title} ${a.year}`).slice(-6);
  return [
    'BRAND BRIEF: LEPTOS (a luxury developer and a family group). The guest is asking about Leptos, Leptos Estates, "Leptos Developers", the Leptos Group, or one of their projects, hotels or companies. Use the facts below. Everything that Leptos says about itself is the company\'s own statement: present it as "Leptos says" and never as our own finding.',
    'WHO THEY ARE: Leptos Estates is the luxury property developer and estate agent of the Leptos Group, a Cypriot family company active since 1960. Founded by Michael G. Leptos (1937 to 2021) in Keryneia; Paphos has been the home base since 1978; led today by Co-Presidents George M. Leptos and Pantelis M. Leptos. The company\'s own name is Leptos Estates (legal entity Armonia Estates Ltd); "Leptos Developers" is how some guests call it. Head office: The Leptos House, 111 Apostolou Pavlou Avenue, Paphos.',
    'HOW TO PRESENT IT: as a luxury developer: villas, seafront residences, resort communities and high-rise apartments in Cyprus and Greece, from beachfront villas to condominium projects and country homes. Describe the whole structure when asked about the company (sectors below), lead with substance (track record, locations, the group around it), warm and factual. Never call it the best. Never state a price: Leptos lists its units "on request"; send the guest to the enquiry form on the Leptos page or to the sales offices. This brief does not change the trust rules: call Leptos a partner only if the context tags it OUR PARTNER.',
    'FIGURES AS STATED BY LEPTOS: sales network in 75 countries; more than 350 home developments completed; more than 25,000 happy home owners; one of the largest employers in Cyprus with more than 1,300 employees; more than 30 companies in the group; a technical department of more than 60 civil engineers, architects, interior designers and surveyors; one of a select few Cypriot builders with a first-class state licence for Technical Project Development; 13 sales offices worldwide.',
    `AWARDS: Leptos lists ${LEPTOS_AWARD_PAGES} award pages on its website, for example ${joinNames(awards)}.`,
    `OFFICES IN CYPRUS:\n${offices.join('\n')}`,
    `GROUP STRUCTURE (seven sectors):\n${bySector.join('\n')}\n  - Leptos states that the group has more than 30 companies in total; the list above names the main brands.`,
    `PROJECTS IN CYPRUS (${LEPTOS_PROJECTS.length}, each with its own page in our directory):\n${byArea.join('\n')}\n  - Limassol Del Mar is a joint development with D. Zavos Group. Kamares Village (Tala) is the flagship villa community. Neapolis Smart EcoCity is a masterplan around Neapolis University Pafos and Iasis Private Hospital.`,
    `ALSO IN GREECE: ${joinNames(LEPTOS_GREECE.map((g) => g.name))} (official pages on leptosestates.com).`,
    `HOTELS AND RESORTS OF THE GROUP (Leptos Calypso Hotels, listed on the Cyprus Stock Exchange): Coral Beach Hotel & Resort and Thalassa Boutique Hotel & Spa in Coral Bay, Paphos Gardens Holiday Resort and Basilica Holiday Resort in Paphos, Leptos Panorama Hotel in Crete.`,
    'LINKS: our directory has a page called "Leptos Estates" for the head office, with the history, the twelve reasons Leptos gives, the group structure, a map and every project. Point the guest there; the interface shows it as a card when it is in the picks.',
  ].join('\n');
}

export const LEPTOS_BRIEF_ID = 'leptos';
