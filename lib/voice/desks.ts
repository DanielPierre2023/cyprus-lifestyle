// lib/voice/desks.ts — the desks of Cyprus Lifestyle and what each one demands.
// Pure data + one mapping function (no I/O), unit-tested. The per-language notes for each desk live in lib/voice/data/<lang>.ts.
//
// WHY desks exist: a single generic "write well" brief gives every article the same shape, and a uniform shape is itself the
// strongest machine signature. A planning-permission explainer, a restaurant review and a festival listing must be built
// differently: different opening, rhythm, evidence and ending.
//
// Length follows the facts. There is no per-desk word target: a piece is as long as its verified facts make it and never
// longer, because padding means inventing, and invented text is what gets a piece recognised as machine-made. Only an
// extremely short piece (under minWords, 100) is reported, as information, never repaired.

export const DESKS = [
  'news', 'business', 'economy', 'property_legal', 'relocation_guide', 'culture', 'food',
  'fashion_lifestyle', 'travel', 'events', 'interview', 'review', 'people',
] as const;
export type Desk = (typeof DESKS)[number];
export const isDesk = (x: unknown): x is Desk => typeof x === 'string' && (DESKS as readonly string[]).includes(x);

export interface DeskSpec { label: string; minWords: number; targetWords: number; brief: string; ending: string }

export const DESK_SPEC: Record<Desk, DeskSpec> = {
  news: {
    label: 'News (Cyprus and the world)', minWords: 100, targetWords: 100,
    brief: 'Wire discipline with a magazine pulse. The first sentence carries the news itself: who did what, where, with which number. Then the reason it matters on this island, then the context a reader lacks, then what happens next. Attribute every claim to a named source and rotate the attribution verbs. A flat, precise lead beats a clever one.',
    ending: 'End on the next dated step or the hardest remaining fact, never on a moral.',
  },
  business: {
    label: 'Business', minWords: 100, targetWords: 100,
    brief: 'Numbers first, one figure that matters. Name the company, the sum, the counterparty, the date. Explain the mechanism (how the money or the decision actually works) in plain words, then the consequence for the island\'s economy or for the reader\'s own business. No promotional tone, no adjectives where a figure will do.',
    ending: 'End on a concrete next event, deadline or open question that is actually open.',
  },
  economy: {
    label: 'Economy and markets', minWords: 100, targetWords: 100,
    brief: 'Analytical, sourced, sceptical. State the data point, its source and date, the comparison (against last year, against the euro-area figure), then the reading and its limits. Distinguish what is measured from what is forecast. Charts in words: one comparison per paragraph.',
    ending: 'End on what would change the reading, as a testable condition.',
  },
  property_legal: {
    label: 'Property, tax and legal explainers', minWords: 100, targetWords: 100,
    brief: 'The explainer a careful lawyer-journalist would write. Open on the reader\'s real problem in one concrete sentence, then the rule (statute, regulation or authority named, with date), then how it plays out in practice with a worked example and figures, then the traps, then who to ask. Say plainly what is not covered and where rules change. Never promise outcomes; do not give advice that needs a licence.',
    ending: 'End on the single check the reader should do first, or the next authority/date; not on a summary.',
  },
  relocation_guide: {
    label: 'Relocation and living guides', minWords: 100, targetWords: 100,
    brief: 'A practical guide with a point of view. Open on a situation a newcomer actually faces, not on a definition. Give the real costs, durations, offices and documents; say what surprised people; separate what is law from what is custom. Vary the architecture: not a stack of identical question headings.',
    ending: 'End on a specific first step with a place, a form or a date.',
  },
  culture: {
    label: 'Culture and art', minWords: 100, targetWords: 100,
    brief: 'The art critic\'s eye: one object, one scene, one artist, described precisely before it is judged. Place the work (period, school, rival, predecessor), say what it does and whether it succeeds, with a reason. Concrete sensory detail over adjectives; opinion allowed and earned.',
    ending: 'End on an image or a verdict the reader could quote tomorrow.',
  },
  food: {
    label: 'Food and drink', minWords: 100, targetWords: 100,
    brief: 'The culinary critic: dishes named exactly, with texture, temperature, seasoning, technique and the producer where known; the room and the service in a few exact strokes; the price stated. Judge honestly: name what works and what does not. No "mouth-watering", no "culinary journey".',
    ending: 'End on the verdict with a reason: order this, skip that, book when.',
  },
  fashion_lifestyle: {
    label: 'Fashion, design and lifestyle', minWords: 100, targetWords: 100,
    brief: 'The fashion editor: the designer, the cut, the fabric, the price, the stockist; what is new and against what it is new. Taste with a spine: say what is good and what is merely fashionable. Precise vocabulary of craft, no glossy filler.',
    ending: 'End on the detail that will still matter next season.',
  },
  travel: {
    label: 'Travel and escapes', minWords: 100, targetWords: 100,
    brief: 'The reporter on the ground: arrive somewhere specific, with the road, the hour, the smell, the price. One place done properly: how to get there, when to go, what it costs, who to ask. Honest about crowds, heat and what disappoints. No brochure vocabulary.',
    ending: 'End on a practical, dated recommendation or the one image that stays.',
  },
  events: {
    label: 'Events and agenda', minWords: 100, targetWords: 100,
    brief: 'What, where, when, how much, who, how to book, in the first lines, then one paragraph of why it is worth a reader\'s evening and what to expect. Dates written out, venue and address exact, ticket price stated or "free". Nothing invented about programme or line-up.',
    ending: 'End on the practical detail (time, door, booking) not on enthusiasm.',
  },
  interview: {
    label: 'Interviews', minWords: 100, targetWords: 100,
    brief: 'Set the scene in two sentences (where, light, what the subject was doing), say why now, then let the subject talk: verbatim quotes carry the voice, narration moves between topics and adds context. Quote only what the source material contains; never invent a quotation. Keep the subject\'s own rhythm in their lines.',
    ending: 'End on the subject\'s best line or an image from the room, never a summary.',
  },
  review: {
    label: 'Reviews and criticism', minWords: 100, targetWords: 100,
    brief: 'A verdict in the first third, then the evidence for it. Be specific about what was experienced, with sensory and technical detail; compare with a predecessor or rival; state price and practicalities inside the prose. Praise what deserves it and name what does not.',
    ending: 'End on the judgement, with the condition under which it would change.',
  },
  people: {
    label: 'People and profiles', minWords: 100, targetWords: 100,
    brief: 'Open on a revealing moment or decision, not a biography. The origin in specifics, the hard part with real numbers, the person in their own words. Report, never flatter; no corporate-PR tone.',
    ending: 'End on a forward detail that implies more than it says.',
  },
};

/** Map an article (section, franchise, kind, authorship) to its desk. Pure. */
export function deskFor(o: { category?: string | null; franchise?: string | null; kind?: string | null; evergreen?: boolean }): Desk {
  const f = (o.franchise || '').toLowerCase();
  const k = (o.kind || '').toLowerCase();
  const c = (o.category || '').toLowerCase();
  if (f === 'at-the-table') return 'food';
  if (f === 'tastemakers' || f === 'five-min' || f === 'concierge-meets' || k === 'interview') return 'interview';
  if (f === 'behind-the-business' || f === 'maker' || k === 'profile') return 'people';
  if (f === 'power-list' || k === 'picks' || k === 'edit') return 'fashion_lifestyle';
  switch (c) {
    case 'cyprus': case 'world': return 'news';
    case 'business': return o.evergreen ? 'property_legal' : 'business';
    case 'property': return o.evergreen ? 'property_legal' : 'business';
    case 'relocation': case 'living': return o.evergreen ? 'relocation_guide' : 'news';
    case 'culture': return 'culture';
    case 'table': return 'food';
    case 'escapes': case 'travel': return 'travel';
    case 'agenda': return 'events';
    case 'people': return 'people';
    default: return o.evergreen ? 'relocation_guide' : 'news';
  }
}
