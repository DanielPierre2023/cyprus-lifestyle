// lib/journalism/exemplars.ts — MODEL PIECES: finished articles the editor-in-chief has approved as the house standard of a desk. Pure
// (imports ./languages only). Shared by the Supabase edge function (generated copy) and the app.
//
// Why: a prompt that lists rules ("no stock phrases, vary the rhythm, open with the strongest fact") teaches a model what to avoid, and it
// answers with the next-most-likely pattern. A few pieces that already sound right teach register, density, rhythm and the way a lead is
// built far better than any list, and they cost nothing to keep current: replace a piece and the standard moves. The pieces are chosen and
// approved by a human (a piece is only used while it is marked active), they are shown to the writer as a standard, never as material: the
// facts, names, figures and sentences of a model piece must not appear in another story, and the fact check would catch it if they did.
import { LANG_NAME } from './languages';
import { stableHash } from './hash';

/** The desks a model piece can belong to: the ten magazine categories, or '*' for a piece that sets the standard of every desk. */
export const EXEMPLAR_DESKS = ['cyprus', 'business', 'property', 'relocation', 'culture', 'escapes', 'table', 'agenda', 'people', 'world', '*'] as const;

export interface Exemplar {
  id?: string;
  /** The desk (magazine category: cyprus, business, property, relocation, culture, escapes, table, agenda, people, world) or "*" for every desk. */
  desk: string;
  lang: string;
  title: string;
  /** Plain text, paragraphs separated by a blank line (HTML is accepted and stripped). */
  body: string;
  articleType?: string | null;
}

const plain = (s: string): string => String(s || '')
  .replace(/<\/?(?:strong|em|b|i|u|span|a|sup|sub|mark)\b[^>]*>/gi, '')
  .replace(/<\/(p|h2|h3|blockquote|li)>/gi, '\n\n').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/[ \t]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

/** How many characters of one model piece the writer sees (a model piece is a standard of sound, not a reading list). */
export const EXEMPLAR_CHARS = 2_600;
export const MAX_EXEMPLARS = 2;

/**
 * Up to `max` pieces for a desk and language: the language's own pieces first (English ones stand in when there are none), pieces of the
 * same article type before the others, and a stable rotation by story, so the same two pieces do not shape every article.
 */
export function selectExemplars(all: readonly Exemplar[], o: { desk: string; lang: string; articleType?: string; seed: string; max?: number }): Exemplar[] {
  const max = o.max ?? MAX_EXEMPLARS;
  const ofDesk = all.filter((e) => (e.desk === o.desk || e.desk === '*') && plain(e.body).length >= 200);
  const own = ofDesk.filter((e) => e.lang === o.lang);
  const pool = own.length ? own : ofDesk.filter((e) => e.lang === 'en');
  const key = (e: Exemplar) => `${e.articleType && e.articleType === o.articleType ? 0 : 1}-${stableHash(`${o.seed}|${e.id ?? e.title}`)}`;
  return [...pool].sort((a, b) => key(a).localeCompare(key(b))).slice(0, max);
}

/** The block for the writer's system prompt; '' when there is no piece. */
export function exemplarBlock(list: readonly Exemplar[], lang: string): string {
  if (!list.length) return '';
  const name = LANG_NAME[lang as keyof typeof LANG_NAME] || lang;
  const pieces = list.map((e, i) => {
    const fallback = e.lang !== lang ? ` (written in ${LANG_NAME[e.lang as keyof typeof LANG_NAME] || e.lang}: take its quality, not its language; write in ${name} by the norms of ${name} journalism)` : '';
    return `--- MODEL PIECE ${i + 1}${fallback} ---\n${e.title}\n\n${plain(e.body).slice(0, EXEMPLAR_CHARS)}`;
  });
  return `── MODEL PIECES ──
The editor-in-chief approved the pieces below as the house standard of this desk. They show how a finished piece sounds: its register, how dense it is with facts, how its sentences and paragraphs move, how a lead is built and where it ends. They cover OTHER stories. Never use their facts, names, figures, wording or structure, never mention them, never imitate their topic. Write your piece as their sibling, not their copy, and let it be as good.
${pieces.join('\n\n')}
--- END OF MODEL PIECES ---`;
}
