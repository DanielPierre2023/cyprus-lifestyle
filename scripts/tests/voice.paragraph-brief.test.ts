// "All paragraphs are the same length" is machine behaviour and the engine finds it; the repair now also works, because the editor model is
// told the MEASURED sizes and what to do about them (join neighbours that carry one thought, let a hard fact stand alone). Before, it got
// "CV 0.00" and "split where the story turns", and the Clean and Rewrite buttons changed nothing.
import { scoreVoice } from '@/lib/voice/score';
import { reviseUser } from '@/lib/voice/prompt';
import { paragraphSizesSample } from '@/lib/antiAiLang';
import { editorialFixes, remediesFor, fixKeyForFlag, SAMPLE_CHARS } from '@/lib/journalism/editorial';
import { writerSystem, OUR_OWN_REPORTING } from '@/lib/journalism/prompts';
import { factCoreSystem, renderFactCore, type FactCore } from '@/lib/journalism/factCore';
import { repairSystem } from '@/lib/journalism/factCheck';
import { transcreateSystem } from '@/lib/editorial/craft';
import { scanPosts } from '@/lib/editorial/qualityScan';
import { eq, ok, report } from './_harness';

// ── the measured sizes ───────────────────────────────────────────────────────────────────────────────────────────
eq('sizes and the shortest neighbouring pair (found by size)', paragraphSizesSample([58, 62, 60, 59, 61, 63, 60]), 'words per paragraph: 58·62·60·59·61·63·60 (shortest neighbours: 60 + 59 words)');
eq('one paragraph has no pair', paragraphSizesSample([80]), 'words per paragraph: 80');
ok('a very long piece is cut off with an ellipsis and stays short', paragraphSizesSample(Array.from({ length: 30 }, () => 50)).includes('…') && paragraphSizesSample(Array.from({ length: 30 }, () => 50)).length < SAMPLE_CHARS);

// ── the engine reports the sizes, in the finding itself ──────────────────────────────────────────────────────────
const S = (n: number, tag: string) => Array.from({ length: n }, (_, i) => `The ${tag} committee in Limassol approved item ${i + 1} on ${10 + i} March after a ${20 + i * 3}-minute session at the town hall`).join('. ') + '.';
const html = (sizes: number[]) => sizes.map((n, i) => `<p>${S(n, ['harbour', 'parking', 'ferry', 'permit', 'budget', 'lighting', 'tender'][i % 7])}</p>`).join('\n');
const equal = scoreVoice({ title: 'Limassol council approves harbour works', body: html([3, 3, 3, 3, 3, 3, 3]), lang: 'en', desk: 'news' as never });
const uniform = equal.tells.find((t) => t.key === 'uniform_paragraphs');
const variety = equal.tells.find((t) => t.key === 'c_para_variety');
ok('equal paragraphs are found', !!uniform && !!variety);
ok('the finding carries the words per paragraph, not "CV 0.00"', !!uniform && /^words per paragraph: \d+(·\d+)+ \(shortest neighbours: \d+ \+ \d+ words\)$/.test(uniform.sample) && !/CV/.test(uniform.sample));
ok('the craft finding carries the sentences per paragraph', !!variety && variety.sample === 'sentences per paragraph: 3·3·3·3·3·3·3');
const varied = scoreVoice({ title: 'Limassol council approves harbour works', body: html([1, 5, 2, 4, 3, 6, 2]), lang: 'en', desk: 'news' as never });
ok('paragraphs of different sizes are not flagged', !varied.tells.some((t) => t.key === 'uniform_paragraphs' || t.key === 'c_para_variety'));

// ── what the editor model is told ────────────────────────────────────────────────────────────────────────────────
const asFindings = equal.tells.map((t) => ({ key: t.key, label: t.label, severity: t.severity, count: t.count, sample: t.sample }));
const order = editorialFixes(asFindings);
ok('the sub-editor of the article desk gets the sizes AND the remedy', order.includes(uniform!.sample) && order.includes('join them into ONE fuller paragraph') && order.includes('stand alone in one or two sentences'));
ok('the remedy forbids merging or splitting just to reach a size, and padding', /never merge unrelated facts to reach a size/i.test(order) && /never split a thought to reach a size/i.test(order) && /no filler and no fact/i.test(order));
ok('the old brake ("split where the story turns") is gone', !/split where the story turns/.test(order));
const clean = reviseUser({ title: 'T', body: '<p>b</p>', tells: equal.tells, pass: 1 });
ok('the voice engine\'s Clean pass gets the same: the findings with their sizes, then HOW TO FIX with the remedy', clean.includes('FOUND IN THIS TEXT') && clean.includes(uniform!.sample) && clean.includes('HOW TO FIX') && clean.includes('join them into ONE fuller paragraph'));
ok('...in the right order (findings first, remedies after, then the text)', clean.indexOf('FOUND IN THIS TEXT') < clean.indexOf('HOW TO FIX') && clean.indexOf('HOW TO FIX') < clean.indexOf('BODY:'));
ok('every family is listed once, not once per finding', (clean.match(/PARAGRAPHS: the paragraphs are too alike/g) || []).length === 1);
ok('an engine with no findings adds no remedy section', !reviseUser({ title: 'T', body: 'b', tells: [], pass: 1 }).includes('HOW TO FIX'));
eq('both paragraph findings ask for the same remedy', [fixKeyForFlag('uniform_paragraphs'), fixKeyForFlag('c_para_variety')], ['PARAGRAPHS', 'PARAGRAPHS']);
eq('remediesFor lists a family once and keeps the order of the findings', remediesFor(['uniform_paragraphs', 'c_para_variety', 'em_dash']).map((r) => r.split(':')[0]), ['PARAGRAPHS', 'DASHES']);
ok('long samples are cut at the shared limit, not at 90 characters', editorialFixes([{ key: 'c_para_variety', label: 'x', sample: 'y'.repeat(300), severity: 'low', count: 1 }]).includes('y'.repeat(SAMPLE_CHARS)) && !editorialFixes([{ key: 'c_para_variety', label: 'x', sample: 'y'.repeat(300), severity: 'low', count: 1 }]).includes('y'.repeat(SAMPLE_CHARS + 1)));

// ── source talk: repeated attribution is the worst case ──────────────────────────────────────────────────────────
const talk = editorialFixes([{ key: 'source_attribution', label: 'Cites its source', severity: 'high', count: 8, sample: 'Σύμφωνα με στοιχεία της Eurostat' }]);
ok('"according to" in paragraph after paragraph is named, and a speaker is named as the actor of a plain verb, once', /paragraph after paragraph/.test(talk) && /actor of a plain verb \(the minister said\), once/.test(talk));

// ── the writer's brief no longer discourages short paragraphs ────────────────────────────────────────────────────
const w = writerSystem({ lang: 'en', deskBrief: 'The Cyprus Desk.', articleType: 'news', category: 'cyprus' });
ok('a paragraph is one move of the story; sizes differ because moves differ', /A paragraph is one move of the story/.test(w) && /Do not cut every paragraph to the same size/.test(w));
ok('...without a formula and without playing human', /Never vary sizes by formula and never to look human/.test(w) && !/only when the story calls for it/.test(w));

// ── the Rewrite prompt knows the house rule ──────────────────────────────────────────────────────────────────────
const tc = transcreateSystem('German');
ok('Rewrite carries the "our own reporting" rule, so a source named in the English edition is not carried across', tc.includes(OUR_OWN_REPORTING) && /OUR OWN REPORTING/.test(tc));
ok('...and says the one thing it drops is the pointer, never the fact', /The one thing you leave out is the pointer to where a fact came from/.test(tc) && /the fact itself stays/.test(tc));

// ── the fact core: official statistics are facts, not claims ─────────────────────────────────────────────────────
const core = factCoreSystem();
ok('published figures of an official body are confirmed facts', /published figures of an official body/.test(core) && /Eurostat/.test(core) && /name the body only when its publication is itself the news/.test(core));
ok('claims are what a person or party says, believes, promises, predicts or estimates', /what a person or party says, believes, promises, predicts or estimates/.test(core));
ok('the source\'s pointers are not carried into a fact', /Do not carry the source's pointers/.test(core));
const c: FactCore = {
  category: 'cyprus', subcategory: 'national', district: null, sourceLang: 'en', cyprusAngle: true, cyprusHook: 'x', storyType: 'news', complexity: 'routine', flags: [], headlineFact: 'h',
  confirmed: ['a'], claims: [{ who: 'The ministry', claim: 'it will build' }], allegations: [], unverified: [], quotes: [], dates: [], numbers: [], entities: [], openQuestions: [], conflicts: [],
};
ok('the writers are told how to name a speaker: as the actor of a plain verb, once, never "according to"', /ATTRIBUTED CLAIMS \(name the speaker as the actor of a plain verb, once: "the ministry said"; never "according to"\):/.test(renderFactCore(c)));
ok('the repair sub-editor is told the same when a fix adds a speaker', /name the speaker as the actor of a plain verb/.test(repairSystem('el')) && /never “according to …”/.test(repairSystem('el')));

// ── the Quality tab keeps the found passage ──────────────────────────────────────────────────────────────────────
{
  const row = { id: '1', slug: 's', status: 'published', source_lang: 'en', category: 'cyprus', title_en: 'T', content_en: html([3, 3, 3, 3, 3, 3, 3]) };
  const scan = scanPosts([row]);
  const en = scan.editions.find((e) => e.lang === 'en')!;
  ok('every tell on the page has its sample (the measured sizes, or the passage)', en.tells.length > 0 && en.tells.every((t) => typeof t.sample === 'string') && en.tells.some((t) => /words per paragraph/.test(t.sample)));
}

report('voice.paragraph-brief');
