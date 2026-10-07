// lib/voice/reportage.ts — the standard for WRITING a piece of magazine journalism, learned from the first rewritten articles.
// Pure text, shared by every writer that drafts new copy (scraped-article desk, AI editor, interviews, reviews) and by the rewriter.
//
// Two lessons it encodes:
//   1. A data sheet is not journalism. A profile or a cultural piece needs an opening image, one thread, concrete detail and
//      an interpretation that follows from the record.
//   2. Colour must come from evidence, never from invention. The old pipelines asked for "about 700 words", so a model with 250
//      words of facts padded the rest with commentary nobody could source. Length now follows the verified material.
import type { Desk } from '@/lib/voice/desks';

export const TRUTH_RULES: string[] = [
  'Every fact (name, date, number, place, title, quotation) must be in the material you were given or in a source you actually read. Never invent a scene, a quotation, a feeling, a smell, a conversation, or something "seen": you were not there.',
  'You MAY interpret, in your own voice, whenever the interpretation follows from the facts, and you should say whose reading it is when it is the institution\'s or the source\'s ("the gallery\'s own text says...").',
  'Length follows the verified material. Do not aim at a word count and never pad: a sentence with no source behind it is an invention. If the material is thin, the piece is short and exact; if the material is rich, the piece is full.',
  'A direct quotation is allowed only when it is verbatim in a source, attributed, and short (at most 25 words); never close to the source\'s wording otherwise: re-report in your own structure and sentences.',
];

export const REPORTAGE_CRAFT: string[] = [
  'Open on an image or a concrete moment taken from the record (an object, a place, a decision, a number that stops the reader), not on the date and not on a summary of the piece.',
  'Give the piece one thread and keep pulling it: a material, a place, a question, a person\'s choice. Move through time or space with it (scene, background, development, tension) so the reader travels instead of reading a list.',
  'Use the specific over the general: titles of works, materials, sizes, dates, street names, prices, ingredients, names of colleagues and rivals. Strong verbs, exact nouns, one adjective only where it earns its place.',
  'Let a short sentence land after a long one. Vary paragraph size on purpose: a single-sentence paragraph next to a long one.',
  'Show a person through the record: where they trained, what they made, what they chose, what it cost, what others say about them in print. Their own words only when verbatim from a source.',
  'End on an image or on the practical line (address, hours, date, price). Never end on a moral, a recap or an invitation to feel.',
  'Write natively in the language of the edition, with its own idiom and rhythm, as that language\'s best magazines do; never a translation-sounding sentence.',
];

export const REPORTAGE_BY_DESK: Partial<Record<Desk, string>> = {
  people: 'A profile is built from the record: the places, the works, the turning points, the numbers. Find at least three independent sources before you write (their own site or CV, a gallery or company page, reputable press). Name the thread of the life and follow it.',
  culture: 'Describe the object or the performance precisely before judging it: titles, materials, venue, dates. Anchor interpretation in the institution\'s or critic\'s stated reading, and say so.',
  food: 'Name dishes, producers and prices exactly; describe room and service in a few verified strokes; separate what a named critic wrote from what is fact.',
  travel: 'Arrive somewhere specific: the road, the hour, the price, the opening times, all from sources. Do not describe weather or crowds you cannot document.',
  interview: 'Let the subject speak in verbatim quotation; narrate only what the material contains.',
  news: 'Hard news keeps the flat, precise lead, but add the verified context a reader lacks (previous measures, figures, dates) found in more than one outlet.',
  business: 'Numbers first, then the human consequence, then the verified context from at least two outlets.',
};

/** The block appended to a writer's system prompt. */
export function reportageBlock(desk?: Desk | null): string {
  const d = desk ? REPORTAGE_BY_DESK[desk] : undefined;
  return [
    'TRUTH (non-negotiable):',
    ...TRUTH_RULES.map((x) => `• ${x}`),
    '',
    'REPORTAGE CRAFT (this is magazine journalism, not a data sheet):',
    ...REPORTAGE_CRAFT.map((x) => `• ${x}`),
    ...(d ? ['', `FOR THIS DESK: ${d}`] : []),
  ].join('\n');
}
