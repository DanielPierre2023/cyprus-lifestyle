// Model pieces: finished articles the editor-in-chief approved as the standard of a desk. The writer sees them as a standard, never as
// material; a piece is only used while it is active (the database filter lives in the edge function, the choice lives here).
import { selectExemplars, exemplarBlock, EXEMPLAR_CHARS, MAX_EXEMPLARS, type Exemplar } from '@/lib/journalism/exemplars';
import { writerSystem, writerUser, CYPRUS_RULE, CATEGORY_DEPTH } from '@/lib/journalism/prompts';
import { eq, ok, report } from './_harness';

const body = (n: number) => Array.from({ length: n }, (_, i) => `Paragraph ${i} of a finished piece says something exact about a decision, a figure and a place in the story.`).join('\n\n');
const ex = (id: string, desk: string, lang: string, over: Partial<Exemplar> = {}): Exemplar => ({ id, desk, lang, title: `Title ${id}`, body: body(5), ...over });
const ALL: Exemplar[] = [
  ex('b1', 'business', 'en'), ex('b2', 'business', 'en', { articleType: 'analysis' }), ex('b3', 'business', 'en'), ex('b-de', 'business', 'de'),
  ex('c1', 'culture', 'en'), ex('star', '*', 'en'), ex('short', 'business', 'en', { body: 'Too short to teach anything.' }),
];

// ── choosing ─────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const de = selectExemplars(ALL, { desk: 'business', lang: 'de', seed: 'core-1' });
  eq('a piece in the language itself is preferred', de.map((e) => e.id), ['b-de']);
  const el = selectExemplars(ALL, { desk: 'business', lang: 'el', seed: 'core-1' });
  ok('with none in the language, the English pieces of the desk stand in', el.length === MAX_EXEMPLARS && el.every((e) => e.lang === 'en' && e.desk !== 'culture') && !el.some((e) => e.id === 'short'));
  eq('a piece for every desk counts for each desk', selectExemplars(ALL, { desk: 'travel-not-there', lang: 'en', seed: 's' }).map((e) => e.id), ['star']);
  eq('a desk without any piece gets none', selectExemplars([ex('c1', 'culture', 'en')], { desk: 'business', lang: 'en', seed: 's' }), []);
  eq('a piece of the same article type comes first', selectExemplars(ALL, { desk: 'business', lang: 'en', articleType: 'analysis', seed: 'any' })[0].id, 'b2');
  const a = selectExemplars(ALL, { desk: 'business', lang: 'en', seed: 'story-1' }).map((e) => e.id);
  eq('the choice is stable for the same story', selectExemplars(ALL, { desk: 'business', lang: 'en', seed: 'story-1' }).map((e) => e.id), a);
  const seeds = new Set(Array.from({ length: 40 }, (_, i) => selectExemplars(ALL, { desk: 'business', lang: 'en', seed: `story-${i}` }).map((e) => e.id).join('+')));
  ok('and rotates between stories, so the same two pieces do not shape every article', seeds.size > 1);
  eq('how many at most', selectExemplars(ALL, { desk: 'business', lang: 'en', seed: 's', max: 1 }).length, 1);
}

// ── the block ────────────────────────────────────────────────────────────────────────────────────────────────────
{
  eq('no piece, no block', exemplarBlock([], 'en'), '');
  const own = exemplarBlock([ex('b1', 'business', 'en')], 'en');
  ok('the block calls the pieces a standard and forbids their facts, wording and structure', /house standard/.test(own) && /Never use their facts, names, figures, wording or structure/.test(own) && /sibling, not their copy/.test(own));
  ok('the block carries title and text of each piece', own.includes('--- MODEL PIECE 1 ---') && own.includes('Title b1') && own.includes('Paragraph 0 of a finished piece') && own.endsWith('--- END OF MODEL PIECES ---'));
  const fallback = exemplarBlock([ex('b1', 'business', 'en')], 'el');
  ok('an English piece for a Greek edition: its quality, not its language', /written in English: take its quality, not its language; write in Greek by the norms of Greek journalism/.test(fallback));
  const html = exemplarBlock([ex('h', 'business', 'en', { body: '<p>First paragraph is long enough to teach something about rhythm and density here.</p><p>Second <strong>paragraph</strong>.</p>' })], 'en');
  ok('HTML is turned into plain paragraphs', !/<\/?p>/.test(html) && html.includes('First paragraph is long enough') && /\n\nSecond paragraph\./.test(html));
  const cut = exemplarBlock([ex('l', 'business', 'en', { body: 'word '.repeat(2_000) })], 'en');
  ok('a long piece is cut', cut.length < EXEMPLAR_CHARS + 1_200);
}

// ── in the writer's prompt ───────────────────────────────────────────────────────────────────────────────────────
{
  const opts = { lang: 'de' as const, deskBrief: 'The Business Desk.', articleType: 'news' as const, category: 'business' };
  const plain = writerSystem(opts);
  const withEx = writerSystem({ ...opts, exemplars: [ex('b-de', 'business', 'de')] });
  ok('without pieces the prompt has no block', !plain.includes('MODEL PIECES'));
  ok('the block comes after the language notes and the headline craft (the shared prefix stays shared) and before the proof rule', withEx.indexOf('MODEL PIECES') > withEx.indexOf('LANGUAGE NOTES: GERMAN') && withEx.indexOf('MODEL PIECES') > withEx.indexOf('── HEADLINE ──') && withEx.indexOf('MODEL PIECES') < withEx.indexOf('FINAL PROOF'));
  eq('the part before the language-specific notes is the same with and without pieces', withEx.slice(0, withEx.indexOf('── LANGUAGE NOTES')), plain.slice(0, plain.indexOf('── LANGUAGE NOTES')));
  ok('the Cyprus rule is part of every writer prompt', plain.includes(CYPRUS_RULE) && /only link between this story and Cyprus/.test(CYPRUS_RULE) && /do not mention Cyprus at all/i.test(CYPRUS_RULE));
  ok('the desk depth notes no longer push a Cyprus link by themselves', !/state plainly why it matters to Cyprus/.test(CATEGORY_DEPTH.world) && !/consequence for the island/.test(CATEGORY_DEPTH.cyprus) && /CYPRUS CONNECTION/.test(CATEGORY_DEPTH.world));
}
{
  const u = writerUser({ lang: 'ro', sourceTitle: 'T', factCore: 'CORE', recent: ['Primăria a decis luni să majoreze taxa.', '  Taxa de ormeiaj  crește de la 1 martie.  '] });
  ok('the latest openings are listed as the ones not to repeat', /HOW OUR LATEST ROMANIAN PIECES BEGAN/.test(u) && u.includes('- Primăria a decis luni') && u.includes('- Taxa de ormeiaj crește de la 1 martie.'));
  eq('no openings, no list', writerUser({ lang: 'ro', sourceTitle: 'T', factCore: 'CORE', recent: [] }).includes('LATEST'), false);
  const many = writerUser({ lang: 'en', sourceTitle: 'T', factCore: 'C', recent: Array.from({ length: 30 }, (_, i) => `Opening ${i}`) });
  eq('at most twelve are shown', (many.match(/^- Opening /gm) || []).length, 12);
  const redo = writerUser({ lang: 'en', sourceTitle: 'T', factCore: 'C', redo: { reasons: ['Cites its source ×8', 'Sentence lengths too even'], structure: true } });
  ok('a rewrite is told what failed, to reuse no sentence, and (for a copy of the structure) to build its own order', /A FIRST ATTEMPT AT THIS EDITION WAS REJECTED/.test(redo) && redo.includes('- Cites its source ×8') && /Do not reuse any sentence/.test(redo) && /different order/.test(redo));
  ok('without a reason about structure the order is not mentioned', !/different order/.test(writerUser({ lang: 'en', sourceTitle: 'T', factCore: 'C', redo: { reasons: ['x'] } })));
  ok('the ordinary message is unchanged', !/REJECTED|LATEST/.test(writerUser({ lang: 'en', sourceTitle: 'T', factCore: 'C' })));
}

report('journalism-exemplars');
