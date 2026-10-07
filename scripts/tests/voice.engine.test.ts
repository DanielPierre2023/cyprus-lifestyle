// The voice engine: guards (no invented facts, no copying), gate, desks, prompt and the revise loop with a fake model.
import { numbersIn, overlap, checkFacts, quotesIn, namesIn } from '@/lib/voice/guards';
import { judge, MAX_SCORE } from '@/lib/voice/gate';
import { deskFor, DESKS, DESK_SPEC, isDesk } from '@/lib/voice/desks';
import { voiceSystem, reviseUser, INTEGRITY, CRAFT_LAWS } from '@/lib/voice/prompt';
import { scoreVoice } from '@/lib/voice/score';
import { reviseToStandard, mechanicalClean, isHtmlBody, type CallModel } from '@/lib/voice/revise';
import { paragraphsOf, headingsOf } from '@/lib/voice/structure';
import { eq, ok, report } from './_harness';

// ── numbers ─────────────────────────────────────────────────────────────────────────────
eq('thousands comma', numbersIn('It costs €1,200 a month.'), ['1200']);
eq('thousands dot and decimal comma', numbersIn('1.200,50 euro'), ['1200.50']);
eq('thousands dot only', numbersIn('1.200 euro'), ['1200']);
eq('decimal point', numbersIn('2.65% of salary'), ['2.65']);
eq('arabic-indic digits', numbersIn('٣٥ يورو'), ['35']);
eq('space grouping', numbersIn('180 000 euro'), ['180000']);
eq('years and ranges', numbersIn('between 2024 and 2026, 9-11 days'), ['2024', '2026', '9', '11']);

// ── overlap ──────────────────────────────────────────────────────────────────────────────
const src = 'The Council of Ministers approved a seventy million euro package on Tuesday to cut value added tax on bread, milk and solar panels for households across the island.';
const same = overlap(src, src);
ok('identical text shares everything', same.ratio === 1 && same.longestRun >= 20);
const reworded = 'Households will pay less tax on staples and solar equipment after ministers signed off a seventy million euro support plan this week.';
const ov = overlap(src, reworded);
ok('a genuine rewording shares little', ov.ratio <= 0.12 && ov.longestRun < 12);
ok('html and punctuation are ignored', overlap('<p>Alpha beta gamma delta epsilon zeta eta.</p>', 'alpha, beta; gamma delta epsilon zeta eta').ratio === 1);
eq('empty inputs are safe', overlap('', 'x y z').ratio, 0);

// ── quotes and names ───────────────────────────────────────────────────────────────────
eq('quotes of 25+ chars in several marks', quotesIn('He said “we will not raise the rate before January” and „we are on track for the whole year“ today. «Short one» and "this quote has more than twenty five characters in it".').length, 3);
ok('names skip sentence starts', !namesIn('Meanwhile the minister spoke. Several members agreed. He met Andreas Constantinou in Limassol.').has('meanwhile') && namesIn('He met Andreas Constantinou in Limassol.').has('andreas'));

// ── facts ───────────────────────────────────────────────────────────────────────────────
const base = 'GESY contributions are 2.65% for employees and 2.90% for employers, capped at €180,000 a year. A specialist visit costs about €6. “Chronic and cancer treatment is carried at no charge to the patient.”';
ok('a faithful rewrite passes', checkFacts(base, 'Employees pay 2.65% and employers 2.90%; the ceiling is €180,000 of income a year. A specialist visit is around €6. “Chronic and cancer treatment is carried at no charge to the patient.”').ok);
const inv = checkFacts(base, 'Employees pay 2.65% and employers 2.90% (capped at €180,000), and a visit costs €9.50.');
ok('an invented figure is caught', !inv.ok && inv.invented.includes('9.50'));
ok('trivial counts are not facts', checkFacts(base, 'Employees pay 2.65% and employers 2.90%, capped at €180,000 a year, and a specialist visit costs about €6; 3 things matter.').ok);
const drop = checkFacts(base, 'Contributions are income based and capped, and visits cost a little.');
ok('dropping most figures is caught', !drop.ok && drop.droppedRatio > 0.3);
const q = checkFacts(base, 'Employees pay 2.65% and employers 2.90%, capped at €180,000 a year, with visits at €6. “Chronic and all cancer treatment is always free for every patient.”');
ok('a changed quotation is caught', !q.ok && q.changedQuotes.length === 1);
ok('translations skip the quote and name checks', checkFacts(base, 'Contribuțiile sunt de 2,65% și 2,90%, plafonate la 180.000 €; o vizită costă 6 €. „Tratamentul este gratuit pentru pacient în cazuri cronice.”', { sameLanguage: false }).ok);

// ── gate ────────────────────────────────────────────────────────────────────────────────
const cleanText = 'The bakery opens at six. By seven the queue reaches the pharmacy next door, and Maria Ioannou has already sold forty loaves. She will not say how many she makes. “If I told you, the neighbours would copy me,” she says, and laughs.';
const clean = scoreVoice({ body: cleanText, lang: 'en', desk: 'people' });
ok('clean prose passes the voice gate', judge({ report: clean }).voiceOk);
const dirty = scoreVoice({ body: 'As an AI language model, I hope this helps. Nestled in the heart of Limassol, this hidden gem is a testament to the city.', lang: 'en', desk: 'travel' });
ok('a machine signature fails it', !judge({ report: dirty }).voiceOk && dirty.score > MAX_SCORE);
const jo = judge({ report: clean, overlap: { ratio: 0.4, longestRun: 30, shared: 4, total: 10 } });
ok('copying the source fails the gate', !jo.ok && jo.reasons.length === 2);
ok('thin is flagged, not failed', judge({ report: scoreVoice({ body: cleanText, lang: 'en', desk: 'property_legal' }) }).needsExpansion);

// ── desks ───────────────────────────────────────────────────────────────────────────────
eq('every desk has a spec', DESKS.every((d) => !!DESK_SPEC[d].brief && DESK_SPEC[d].minWords < DESK_SPEC[d].targetWords), true);
eq('news for world and cyprus', [deskFor({ category: 'world' }), deskFor({ category: 'cyprus' })], ['news', 'news']);
eq('evergreen guides route to explainer desks', [deskFor({ category: 'living', evergreen: true }), deskFor({ category: 'business', evergreen: true }), deskFor({ category: 'property', evergreen: true })], ['relocation_guide', 'property_legal', 'property_legal']);
eq('franchise beats category', [deskFor({ category: 'culture', franchise: 'at-the-table' }), deskFor({ category: 'business', franchise: 'tastemakers' }), deskFor({ category: 'table' })], ['food', 'interview', 'food']);
ok('isDesk', isDesk('news') && !isDesk('sport'));

// ── prompt ──────────────────────────────────────────────────────────────────────────────
const sys = voiceSystem({ lang: 'en', desk: 'food' });
ok('the brief carries integrity, craft laws and the desk', INTEGRITY.every((x) => sys.includes(x)) && CRAFT_LAWS.every((x) => sys.includes(x)) && sys.includes(DESK_SPEC.food.brief) && sys.includes('"title"'));
ok('the brief forbids enumerations and conclusions', /NO enumerations/.test(sys) && /NO conclusion/.test(sys));
const usr = reviseUser({ title: 'T', body: '<p>b</p>', tells: dirty.tells, pass: 1, notes: ['too close'] });
ok('the user message lists what was found and the text', usr.includes('FOUND IN THIS TEXT') && usr.includes('too close') && usr.includes('<p>b</p>') && usr.includes('full rewrite'));
ok('later passes are targeted', reviseUser({ title: 'T', body: 'b', tells: [], pass: 2 }).includes('Change only the passages'));

// ── structure helpers ───────────────────────────────────────────────────────────────────
eq('paragraphs skip headings and list items', paragraphsOf('<h2>Head</h2><p>One two three four five.</p><ul><li>skip this one please now</li></ul><p>Six seven eight nine ten.</p>').length, 2);
eq('markdown paragraphs skip headings and bullets', paragraphsOf('## Head\n\nOne two three four five.\n\n- bullet one two three four\n\nSix seven eight nine ten.').length, 2);
eq('headings of html and markdown', [headingsOf('<h2>A</h2><h3>B</h3>').length, headingsOf('## A\ntext\n### B').length], [2, 2]);

// ── mechanical clean ────────────────────────────────────────────────────────────────────
ok('dashes go, tags stay', (() => { const r = mechanicalClean('<p>Prices — for most — rise.</p>', 'en'); return !/[—–]/.test(r) && r.startsWith('<p>') && r.endsWith('</p>'); })());
ok('html detection', isHtmlBody('<p>x</p>') && !isHtmlBody('plain **markdown**'));

// ── the loop with a fake model ──────────────────────────────────────────────────────────
const aiish = '<p>Nestled in the heart of Limassol, this hidden gem is a testament to the island’s rich tapestry. Whether you’re a local or a visitor, you will find a vibrant, stunning experience that truly captivates.</p><p>Rents run from €500 to €800 a month in Nicosia, and €800 to €1,200 in Limassol, with a deposit of one to two months.</p><p>In conclusion, renting here is a seamless journey that shows why Cyprus remains a must-visit destination.</p>';
const good = '<p>A one-bedroom flat in Nicosia costs €500 to €800 a month; in Limassol, €800 to €1,200. Landlords ask for a deposit of one to two months.</p><p>Read the contract before you sign. Check who pays the agent, and ask what happens to the deposit if you leave early.</p><p>Most arrivals rent for a year first, then decide whether to stay.</p>';
const never: CallModel = async () => { throw new Error('the model must not be called'); };
const fake = (text: string): CallModel => async () => ({ text: JSON.stringify({ title: 'Renting in Cyprus', body: text }) });

{
  const r = await reviseToStandard({ title: 'Renting in Cyprus', body: good, lang: 'en', desk: 'relocation_guide', callModel: never });
  ok('a piece that already passes costs no model call and is untouched', !r.changed && r.passes === 0 && r.verdict.voiceOk);
}
{
  const r = await reviseToStandard({ title: 'Renting in Cyprus', body: aiish, lang: 'en', desk: 'relocation_guide', callModel: fake(good) });
  ok('a tell-ridden piece is rewritten and scores better', r.changed && r.after.score < r.before.score && r.passes === 1 && r.body.includes('€1,200') && r.facts?.ok === true);
}
{
  const r = await reviseToStandard({ title: 'Renting in Cyprus', body: aiish, lang: 'en', desk: 'relocation_guide', callModel: fake(good.replace('€1,200', '€1,950')) });
  ok('a rewrite that invents a figure is rejected', r.body === mechanicalClean(aiish, 'en') || r.body === aiish ? !r.log.every((l) => !/rejected/.test(l)) : false);
}
{
  const r = await reviseToStandard({ title: 'Renting in Cyprus', body: aiish, lang: 'en', desk: 'relocation_guide', callModel: fake('Rents are high and the deposit is large. Read the contract.') });
  ok('a rewrite that drops the figures or shrinks the text is rejected', r.log.some((l) => /rejected/.test(l)) && !r.body.includes('Read the contract.'));
}
{
  const r = await reviseToStandard({ title: 'Renting in Cyprus', body: aiish, lang: 'en', desk: 'relocation_guide', callModel: fake(good.replace(/<\/?p>/g, '')) });
  ok('HTML structure lost is rejected', r.log.some((l) => /HTML structure lost/.test(l)));
}
{
  const r = await reviseToStandard({ title: 'Renting in Cyprus', body: aiish, lang: 'en', desk: 'relocation_guide', callModel: async () => ({ error: 'overloaded' }) });
  ok('a model error returns the best version we have, never throws', r.log.some((l) => /model error/.test(l)) && typeof r.body === 'string');
}
{
  let t = 0;
  const r = await reviseToStandard({ title: 'Renting in Cyprus', body: aiish, lang: 'en', desk: 'relocation_guide', callModel: never, budgetMs: 1000, now: () => (t += 5000) });
  ok('an exhausted time budget skips the model', r.passes === 0);
}
{
  const source = 'Landlords in Cyprus ask a deposit of one to two months and rents run from €500 to €800 a month in Nicosia, and €800 to €1,200 in Limassol, according to agents surveyed this autumn.';
  const copy = '<p>Landlords in Cyprus ask a deposit of one to two months and rents run from €500 to €800 a month in Nicosia, and €800 to €1,200 in Limassol, according to agents surveyed this autumn.</p><p>Read the contract before you sign it.</p><p>Most arrivals rent for a year first.</p>';
  const r = await reviseToStandard({ title: 'Rents', body: aiish, lang: 'en', desk: 'relocation_guide', source, callModel: fake(copy) });
  ok('a candidate that copies the external source is rejected', r.log.some((l) => /closer to original|rejected/.test(l)) && !r.body.includes('according to agents surveyed this autumn'));
}

report('voice.engine');
