// Two things that no test of ONE article can see. The corpus monitor: forty pieces that each pass every check can still open, end and be
// headlined alike. And the merge of two accounts of one event: a partner is only proposed when the two texts are close in meaning AND share
// concrete anchors, and never from the same outlet.
import { analyzeCorpus, MIN_PIECES, type CorpusPiece } from '@/lib/journalism/corpus';
import { leadOf, anchorsOf, sharedAnchors, enoughShared, pickPartner, type QueueItem } from '@/lib/journalism/merge';
import { eq, ok, report } from './_harness';

// ── the corpus monitor ───────────────────────────────────────────────────────────────────────────────────────────
const para = (i: number, j: number) => `Unique${i}x${j} reporting${i}x${j} covers${i}x${j} Matter${i}x${j} and${i}x${j} Detail${i}x${j} for${i}x${j} Subject${i}x${j} in${i}x${j} Place${i}x${j}.`;
const html = (first: string, last: string, i: number, mid = '') => `<p>${first}</p><p>${para(i, 1)} ${mid}</p><p>${para(i, 2)}</p><p>${last}</p>`;
const varied = (n: number): CorpusPiece[] => Array.from({ length: n }, (_, i) => ({ id: `v${i}`, slug: `varied-${i}`, title: `Headline${i} about Topic${i} and Event${i}`, html: html(`Opening${i}a words${i}b start${i}c piece${i}d number${i}e differently${i}f.`, `Ending${i}a words${i}b close${i}c piece${i}d on${i}e its${i}f own${i}g fact${i}h.`, i) }));
const samey = (n: number): CorpusPiece[] => Array.from({ length: n }, (_, i) => ({
  id: `s${i}`, slug: `samey-${i}`, title: i % 2 ? `Cyprus unveils plan number ${i} for Thing${i}` : `Cyprus unveils scheme ${i} for Other${i}`,
  html: html(`The Limassol marina announced item${i} on Tuesday after a long debate${i}.`, `The coming weeks will show whether item${i} holds, and only time will tell.`, i, 'The measure plays a key role in the plan and plays a key role in the budget.'),
}));
{
  const few = analyzeCorpus(varied(MIN_PIECES - 1), 'en');
  eq('too few pieces to judge', [few.verdict, few.pieces], ['too_few', MIN_PIECES - 1]);
  const v = analyzeCorpus(varied(24), 'en');
  eq('pieces that all begin, end and are headlined in their own way are varied', [v.verdict, v.openings.length, v.endings.length, v.titles.length, v.phrases.length], ['varied', 0, 0, 0, 0]);
  ok('...and their index is low', v.index <= 15);
  const s = analyzeCorpus(samey(24), 'en');
  eq('pieces that all begin "The Limassol marina", end on the coming weeks and are headlined "Cyprus unveils" are repetitive', s.verdict, 'repetitive');
  ok('the opening is named, counted, and shown with the pieces that have it', s.openings[0].key === 'the limassol marina' && s.openings[0].count === 24 && s.openings[0].share === 1 && s.openings[0].examples.length === 3 && s.openings[0].examples[0].slug.startsWith('samey-'));
  ok('the headline template is found', s.titles.some((t) => t.key === 'cyprus unveils' && t.count === 24));
  ok('the repeated phrase is found, with its pieces', s.phrases.some((p) => p.phrase.includes('plays a key role') && p.pieces === 24 && p.share === 1));
  eq('every ending looks forward', [s.endingMix.forward, s.endingMix.concrete], [1, 0]);
  ok('the ending words are grouped', s.endings.length >= 1 && s.endings[0].count === 24);
  ok('the first words of the sentences are counted', s.openingWords[0].key === 'the' && s.openingWords[0].share === 1);
  ok('the report is deterministic', JSON.stringify(analyzeCorpus(samey(24), 'en')) === JSON.stringify(s));
  const mixed = [...varied(16), ...samey(8)];
  const m = analyzeCorpus(mixed, 'en');
  ok('a third of the pieces repeating puts the corpus on watch or worse, and the repetition is still found', m.verdict !== 'varied' && m.openings[0].count === 8);
}
{
  // other languages: the forward-looking ending is read in the language of the corpus
  const de = Array.from({ length: 12 }, (_, i) => ({ id: `d${i}`, slug: `de-${i}`, title: `Titel${i} zum Thema${i}`, html: html(`Eigener Anfang${i} der Meldung ${i} mit Besonderheit${i} hier.`, `Wie es weitergeht, wird sich zeigen in den kommenden Wochen bei Fall${i}.`, i) }));
  eq('German "wird sich zeigen" and "in den kommenden Wochen" count as looking forward', analyzeCorpus(de, 'de').endingMix.forward, 1);
  const withFigure = Array.from({ length: 10 }, (_, i) => ({ id: `f${i}`, slug: `f-${i}`, title: `Title${i} for Item${i}`, html: html(`Opening${i} sentence of piece ${i} has its own wording here.`, `The hearing is set for ${10 + i} November at the court${i}.`, i) }));
  eq('an ending on a date or figure is concrete', analyzeCorpus(withFigure, 'en').endingMix.concrete, 1);
  const withQuote = Array.from({ length: 10 }, (_, i) => ({ id: `q${i}`, slug: `q-${i}`, title: `Title${i} for Item${i}`, html: html(`Opening${i} sentence of piece ${i} has its own wording here.`, `"We will finish in time${i}," the minister said.`, i) }));
  eq('an ending on a quotation is a quotation', analyzeCorpus(withQuote, 'en').endingMix.quote, 1);
}

// ── the merge ────────────────────────────────────────────────────────────────────────────────────────────────────
const A = `The Limassol marina will raise its monthly berth fee from €70 to €90 on 1 March, the harbour authority said on Tuesday. Harbourmaster Maria Ioannou said dredging starts in June. About 400 berth holders are affected.`;
const B = `Berth holders at the Limassol marina will pay €90 a month from 1 March instead of €70, the harbour authority announced. Maria Ioannou, the harbourmaster, said dredging begins in June. The marina has 612 berths.`;
const C = `The Paphos municipality will close the old harbour car park for repairs during the summer season, officials said on Wednesday. The works cost €250,000 and last eight weeks according to the engineer Costas Georgiou.`;
const item = (id: string, title: string, text: string, url: string, sourceId = id): QueueItem => ({ id, title, text, url, sourceId });
const target = { ...item('a', 'Marina fees rise', A, 'https://cyprus-mail.com/a', 's1'), vec: [1, 0, 0, 0] };
const same = item('b', 'Berth fees go up at Limassol marina', B, 'https://philenews.com/b', 's2');
const other = item('c', 'Harbour car park closes', C, 'https://sigmalive.com/c', 's3');
{
  ok('the lead is the title and the first part of the text', leadOf('Title', 'a '.repeat(500)).startsWith('Title. a a') && leadOf('Title', 'x'.repeat(2_000)).length <= 'Title. '.length + 450);
  const an = anchorsOf(A);
  ok('anchors: the figures of consequence and the capitalised names, folded', an.figures.has('90') && an.figures.has('400') && an.names.has('limassol') && an.names.has('harbourmaster') && !an.names.has('the'));
  eq('single digits do not anchor, figures do', [[...anchorsOf('3 steps and 400 people at €90').figures].sort()], [['400', '90']]);
  const sh = sharedAnchors(A, B);
  ok('the two accounts share figures and names', sh.figures.includes('90') && sh.figures.includes('70') && sh.names.includes('limassol') && sh.names.includes('ioannou') && sh.names.includes('maria') && enoughShared(sh));
  ok('two different stories share almost nothing', !enoughShared(sharedAnchors(A, C)));
  ok('three shared names are enough without a figure', enoughShared({ figures: [], names: ['a', 'b', 'c'] }) && !enoughShared({ figures: [], names: ['a', 'b'] }));
  const vecs = [[0.95, 0.2, 0, 0], [0.9, 0.1, 0.1, 0.2]];
  const pick = pickPartner(target, [same, other], vecs);
  ok('the partner is the close account from another outlet', !!pick && pick.item.id === 'b' && pick.sim > 0.9 && pick.shared.figures.length >= 1);
  eq('close in meaning but nothing shared: no partner', pickPartner(target, [other], [[1, 0, 0, 0]]), null);
  eq('shared anchors but too far in meaning: no partner', pickPartner(target, [same], [[0, 1, 0, 0]]), null);
  eq('the same outlet is no second account (by source and by host)', [pickPartner(target, [item('b2', 'x', B, 'https://cyprus-mail.com/other', 's1')], [[1, 0, 0, 0]]), pickPartner(target, [item('b3', 'x', B, 'https://www.cyprus-mail.com/another', 's9')], [[1, 0, 0, 0]])], [null, null]);
  eq('the article itself is never its own partner', pickPartner(target, [item('a', 'x', A, 'https://other.example/a', 's5')], [[1, 0, 0, 0]]), null);
  const better = pickPartner(target, [same, item('d', 'More on marina fees', B, 'https://politis.com.cy/d', 's4')], [[0.9, 0.3, 0, 0], [0.99, 0.05, 0, 0]]);
  eq('of several partners the closest wins', better?.item.id, 'd');
  eq('a stricter threshold can be set', pickPartner(target, [same], [[0.9, 0.436, 0, 0]], { minSim: 0.95 }), null);
}

report('journalism-corpus-merge');
