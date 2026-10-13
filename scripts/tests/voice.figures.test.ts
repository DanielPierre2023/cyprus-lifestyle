// Figures are read as figures, not as strings: a rewrite or a translation may change the notation (18:30 → 18.30 → 6:30 pm, 19:00 → ora 19,
// 19.00 → 19, cincisprezece → 15 when the title says 15) without changing a fact. The first live Clean of the Romanian festival article was
// rejected for "new figures not in the source: 15, 18.30, 19.00; drops 50% of the source's figures". Also: the false findings that kept
// editions above the bar ("EU House" read as the Romanian pronoun "I", the name Anna read as Arabic "I", "mine" the noun, "124(I)/2018",
// an acronym in a title read as shouting, the site's own "our directory" cards judged as prose) and findings that grew with the length of
// the text although they describe it once.
import { checkFacts, figuresIn, unknownFigures, numbersIn } from '@/lib/voice/guards';
import { reviseToStandard, type CallModel } from '@/lib/voice/revise';
import { scoreVoice, withoutCards } from '@/lib/voice/score';
import { scoreAiTells, tellPoints } from '@/lib/antiAi';
import { craftTells } from '@/lib/journalism/craftTells';
import { parityOf } from '@/lib/voice/parity';
import { scanPosts, rankWorst, isOffender } from '@/lib/editorial/qualityScan';
import { explainNote } from '@/lib/voice/cleanRun';
import { missingFigures } from '@/lib/journalism/evidence';
import { parseState, RULES_VERSION } from '@/lib/voice/work';
import { MAX_SCORE } from '@/lib/voice/gate';
import { eq, ok, report } from './_harness';

const shown = (s: string) => figuresIn(s).map((f) => f.shown);

// ── a time is one figure, in any notation ───────────────────────────────────────────────────────────
eq('colon time', shown('de la ora 18:30'), ['18:30']);
eq('two times and a date', shown('19:00 și 18:30, pe 22 septembrie'), ['19:00', '18:30', '22']);
eq('12-hour clock is the same time as the 24-hour clock', [shown('at 6:30 pm'), shown('6.30pm'), shown('at 7 pm'), shown('7 p.m.')], [['18:30'], ['18:30'], ['19:00'], ['19:00']]);
eq('noon and midnight', [shown('12 pm'), shown('12 am')], [['12:00'], ['0:00']]);
eq('a dot time stays a number until it meets its twin', shown('18.30'), ['18.30']);
eq('single digits are trivial, ten too', figuresIn('3 steps and 10 minutes').map((f) => f.trivial), [true, true]);
eq('the plain number reader is untouched', numbersIn('2.65% of salary, 1.200,50 euro, 18:30'), ['2.65', '1200.50', '18', '30']);

// ── the case of the screenshot ──────────────────────────────────────────────────────────────────────────────
const ro = '<p>Trei seri, cincisprezece filme. Între 22 și 24 septembrie, Nicosia găzduiește un festival de film scurt, cu producții din zece țări.</p><p>Startul se dă pe 22 septembrie, de la ora 18:30, la EU House. Pe 23 septembrie, de la ora 19:00, amfiteatrul din Piața Eleftheria adună producții din cinci țări. Pe 24 septembrie, tot de la ora 19:00, festivalul se mută la Gardens of the Future.</p>';
const title = 'Nicosia proiectează gratuit 15 filme scurte din zece țări europene';
const model = ro.replace('cincisprezece', '15').replace('18:30', '18.30').replace(/19:00/g, '19.00');
{
  const without = checkFacts(ro, model, { sameLanguage: true, lang: 'ro' });
  ok('the times in another notation are not new figures: only "15" is left, and the title has it', !without.ok && without.invented.join() === '15' && without.droppedRatio === 0);
  const withTitle = checkFacts(ro, model, { sameLanguage: true, lang: 'ro', attested: title });
  ok('with the title known, the faithful rewrite passes', withTitle.ok && withTitle.invented.length === 0);
  const noThirty = checkFacts(ro, model.replace('18.30', '17.30'), { sameLanguage: true, lang: 'ro', attested: title });
  ok('a time that really changed is still caught', !noThirty.ok && noThirty.invented.includes('17.30'));
  const lost = checkFacts(ro, model.replace('de la ora 18.30', 'seara').replace(/de la ora 19.00/g, 'seara').replace(/tot /, ''), { sameLanguage: true, lang: 'ro', attested: title });
  ok('dropping the times is still caught', !lost.ok && lost.droppedRatio > 0.3);
  ok('"ora 19" for 19:00 is allowed, a bare 19 never vouches for a new time',
    checkFacts(ro, ro.replace(/19:00/g, '19'), { sameLanguage: true, lang: 'ro' }).ok
    && !checkFacts('Pe 19 septembrie.', 'Pe 19 septembrie, la ora 19:00.', { sameLanguage: true, lang: 'ro' }).ok);
  ok('an English rendering of the Romanian times passes against the English source (12-hour source, 24-hour output)',
    checkFacts('The first screening begins at 6:30 pm on 22 September; the others at 7 pm on 23 and 24 September.', 'Prima proiecție începe la 18:30, pe 22 septembrie; celelalte la 19:00, pe 23 și 24 septembrie.', { sameLanguage: false }).ok);
  ok('a figure in the NEW title must be known too', !checkFacts(ro, ro, { sameLanguage: true, lang: 'ro', candidateTitle: 'Nicosia proiectează 40 de filme' }).ok);
}
eq('unknownFigures: strict mode counts single digits (4 films must not become 5)', [unknownFigures('4 films at 18:30', '5 filme la 18.30', { strict: true }), unknownFigures('4 films at 18:30', '5 filme la 18.30')], [['5'], []]);

// ── the evidence check reads figures the same way ─────────────────────────────────────────────────────────────────
eq('a fact in the 24-hour clock is supported by a passage in the 12-hour clock', missingFigures('The first screening starts at 18:30 on 22 September.', 'The first screening begins at 6:30 pm on 22 September at EU House.'), []);
eq('...but not by another time', missingFigures('The screening starts at 18:30.', 'The screening begins at 7 pm.'), ['18:30']);
eq('a decimal comma is a decimal point; units make single digits count', [missingFigures('2,5 million visitors', 'about 2.5 million visitors'), missingFigures('a 5% rise', 'a rise of 5 percent'), missingFigures('a 7% rise', 'a rise of 5 percent')], [[], [], ['7']]);

// ── the revise loop accepts it ───────────────────────────────────────────────────────────────────────────────────────
const aiish = '<p>Nestled in the heart of Nicosia, this hidden gem of a festival is a testament to the island’s rich tapestry. Fifteen short films from ten countries screen from 22 to 24 September, and the experience is truly vibrant and stunning.</p><p>The first screening begins at 6:30 pm on 22 September at EU House. On 23 September a 7 pm screening moves outdoors to the Eleftheria Square amphitheatre.</p><p>The closing screening starts at 7 pm on 24 September at the Gardens of the Future, with six films from Greece, Germany and France.</p>';
const good = '<p>15 short films from ten countries screen in Nicosia between 22 and 24 September.</p><p>The first screening is at 18:30 on 22 September at EU House. On 23 September the programme moves outdoors, to the Eleftheria Square amphitheatre, at 19:00.</p><p>The last evening begins at 19:00 on 24 September at the Gardens of the Future, with six films from Greece, Germany and France.</p>';
const fake = (text: string): CallModel => async () => ({ text: JSON.stringify({ title: 'Nicosia screens 15 short films for free', body: text }) });
{
  const r = await reviseToStandard({ title: 'Nicosia screens 15 short films for free', body: aiish, lang: 'en', desk: 'events', maxPasses: 1, callModel: fake(good) });
  ok('a rewrite with 15, 18:30 and 19:00 for fifteen, 6:30 pm and 7 pm is accepted (the title says 15)', r.changed && r.facts?.ok === true && r.body.includes('18:30') && r.after.score < r.before.score);
}
{
  const r = await reviseToStandard({ title: 'Nicosia screens 15 short films for free', body: aiish, lang: 'en', desk: 'events', maxPasses: 1, callModel: fake(good.replace('at 19:00. ', 'at 19:30. ').replace('begins at 19:00', 'begins at 20:00')) });
  ok('a rewrite that moves a screening is rejected', r.log.some((l) => /rejected, new figures not in the source: .*(19:30|20:00)/.test(l)));
}
{
  const r = await reviseToStandard({ title: 'Nicosia screens films', body: aiish, lang: 'en', desk: 'events', maxPasses: 1, callModel: fake(good) });
  ok('without 15 in any title, spelled-out "fifteen" cannot silently become a figure', r.log.some((l) => /rejected, new figures not in the source: 15/.test(l)));
  const withEditions = await reviseToStandard({ title: 'Nicosia screens films', body: aiish, lang: 'en', desk: 'events', maxPasses: 1, attested: 'Nikosia zeigt 15 Kurzfilme', callModel: fake(good) });
  ok('…unless the other editions carry it', withEditions.changed && withEditions.facts?.ok === true);
}

// ── plain words for the admin ────────────────────────────────────────────────────────────────────────────────────────────────
ok('a rejection says what the new version did', explainNote('pass 1: rejected, new figures not in the source: 15, 18.30; drops 50% of the source\'s figures') === 'Not saved: the new version added figures that are not in the text (15, 18.30) and it left out 50% of the figures.');
ok('a worse rewrite says so', /not better \(it scored 20, the live text 14\)/.test(explainNote('pass 1: no improvement (20 vs 14)')));
ok('a passing text says there is nothing to do', /already passes the bar \(score 6\)/.test(explainNote('start: score 6')));
ok('a model error says to try again', /did not answer \(overloaded\).*try again/.test(explainNote('pass 1: model error overloaded')));
ok('nothing logged still says something', explainNote('') !== '' && explainNote(undefined) !== '');

// ── findings that were wrong ────────────────────────────────────────────────────────────────────────────────────────────────────
const para = (t: string) => [t];
const filler = ' Programul cuprinde zece filme scurte, subtitrate în engleză, iar intrarea este liberă pentru toți cei care vin. Organizatorii așteaptă mulți vizitatori în prima seară, iar la a doua proiecție locurile se ocupă repede.';
const hasFp = (lang: 'ro' | 'en' | 'ar', text: string) => craftTells({ paragraphs: para(text), lang }).some((t) => t.key === 'c_first_person');
ok('Romanian: "EU House" is a venue, not the pronoun "I"', !hasFp('ro', `Startul se dă pe 22 septembrie, la EU House, pe Byron Avenue, iar publicul intră fără bilet.${filler}`));
ok('Romanian: the pronoun is still found', hasFp('ro', `Eu cred că festivalul este o idee bună pentru oraș, iar publicul va veni.${filler}`));
const enFill = ' The programme runs for three evenings, with films from ten countries, and admission is free for everyone who comes to the screenings in the city.';
ok('English: a mine is not "mine"', !hasFp('en', `The garden sits inside the old Amiantos asbestos mine, with a visitor centre and a section for endemic plants.${enFill}`));
ok('English: "(I)" in a law number and "Our Lady" are not pronouns', !hasFp('en', `The Alternative Investment Funds Law (124(I)/2018) replaced the law of 2014, and the icon was named Ayia Napa, Our Lady of the Forest.${enFill}`));
ok('English: "I" is still found', hasFp('en', `Last week I visited the new marina and spoke to the harbour master about the fees.${enFill}`));
const arFill = ' يستمر البرنامج ثلاث أمسيات وتعرض فيه أفلام قصيرة من عشر دول، والدخول مجاني لجميع الزوار الذين يأتون إلى العروض في المدينة هذا الشهر. ويتوقع المنظمون حضورا كبيرا في الأمسية الأولى، بينما تمتلئ المقاعد بسرعة في العرض الثاني، ويقام العرض الأخير في الحديقة العامة قرب وسط المدينة القديمة.';
ok('Arabic: the name Anna (آنا) is not "I"', !hasFp('ar', `وتقول آنا تسيليبو، التي تدرس تقاليد القرية، إن عدد الورش ارتفع هذا العام بشكل واضح.${arFill}`));
ok('Arabic: "أنا" is still found', hasFp('ar', `أنا أعتقد أن المهرجان فكرة جيدة للمدينة وأن الجمهور سيأتي بكثير.${arFill}`));
{
  const t = scoreAiTells({ title: 'Healthcare in Cyprus: how GESY works', content: 'GESY covers GP visits and specialist care. Contributions are 2.65% of salary.', lang: 'en' });
  ok('an acronym that the article writes in capitals is not shouting', !t.tells.some((x) => x.key === 'title_caps'));
  const s = scoreAiTells({ title: 'BREAKING NEWS from Cyprus today', content: 'The ministry published the new rules on Tuesday and explained them to journalists.', lang: 'en' });
  ok('real shouting is still found', s.tells.some((x) => x.key === 'title_caps'));
}
ok('a heading count weighs once, a count of occurrences scales', tellPoints({ key: 'over_sectioned', severity: 'low', count: 5 }) === 3 && tellPoints({ key: 'uniform_paragraphs', severity: 'low', count: 8 }) === 3 && tellPoints({ key: 'rule_of_three', severity: 'low', count: 5 }) === 10.5);
{
  const prose = '<p>Rents in Nicosia run from €500 to €800 a month, and in Limassol from €800 to €1,200, agents say.</p><p>Landlords ask for a deposit of one to two months. Read the contract before you sign.</p>';
  const card = "<aside class='specialist-card'><span class='sc-eyebrow'>In the directory</span><h3 class='sc-title'>Verified firms</h3><p class='sc-lead'>Real, checked companies from our directory, in every district.</p><ul class='sc-links'><li><a href='/d'>Letting agents</a></li></ul></aside>";
  ok('the site\'s own cards are not prose', withoutCards(prose + card).includes('Read the contract') && !withoutCards(prose + card).includes('our directory'));
  ok('…so "our directory" is not first person in the article', !scoreVoice({ body: prose + card, lang: 'en', desk: 'relocation_guide' }).tells.some((t) => t.key === 'c_first_person'));
}

// ── parity reads times as figures ───────────────────────────────────────────────────────────────────────────────────────────
{
  const words = (n: number) => Array.from({ length: n }, (_, i) => ['alpha', 'beta', 'gamma', 'delta', 'omega'][i % 5]).join(' ');
  const b = (t: string) => `<p>${words(60)} ${t} ${words(60)} 22 24 2026</p>`;
  const p = parityOf({ en: b('at 6:30 pm'), ro: b('la ora 18:30'), de: b('um 18.30 Uhr'), pl: b('o godzinie 18:30') });
  ok('one time written four ways is not "missing" or "found nowhere else"', p.problems.every((x) => !/figures/.test(x)));
}

// ── the Quality scan keeps style and length apart ──────────────────────────────────────────────────────────────────────
{
  // 24 plain sentences of varied length (no stock phrases, no lists of three), laid out in paragraphs of different sizes.
  const S = [
    'The harbour opens at six.', 'By seven the first boats are already out beyond the breakwater, and the fishmongers on the quay have laid their ice trays in a long row.', 'Prices change daily.',
    'A kilo of sea bream was €14 on Tuesday, a euro less than the week before, said the stallholder who has worked the quay since 1998.', 'Nobody haggles.', 'Regular customers phone ahead and collect their orders from a cool box under the awning.',
    'The municipality plans to extend the quay by forty metres next spring, a project that fishermen say will ease the morning crush but also raise the berthing fees.', 'Fees are set by the council each January.', 'Tourists arrive from ten, when the cafés fill.',
    'They photograph the nets, buy a bag of oranges and leave before the sun gets strong.', 'The ice factory behind the market produces two tonnes a day in summer.', 'Its owner, Andreas Pavlou, says demand doubled after the heatwave of 2023.',
    'Winter is quieter.', 'Only six boats go out when the wind turns northerly, and the quay smells of diesel and wet rope.', 'Schools bring classes on Fridays.',
    'A retired skipper tells them how to read the weather from the colour of the sea at dawn.', 'Not everyone is pleased with the plan.', 'The café owners fear that the longer quay will push the evening crowd towards the new marina, two kilometres east.',
    'The council says it will decide in March.', 'Until then the morning routine holds.', 'The fishmonger lifts the lid of the ice tray, checks the gills with a thumb, and wraps the bream in yesterday\'s paper without a word.',
    'Change is counted out in coins.', 'At nine the quay is empty again.', 'Gulls take what is left.',
  ];
  const LAYOUT = [4, 3, 5, 2, 4, 3, 3];
  const prose = (from: number, count: number, offset = 0): string => {
    const pick = Array.from({ length: count }, (_, i) => S[(offset + from + i) % S.length]);
    const out: string[] = []; let at = 0;
    for (const n of LAYOUT) { if (at >= pick.length) break; out.push(`<p>${pick.slice(at, at + n).join(' ')}</p>`); at += n; }
    return out.join('');
  };
  const edition = (en: string, others: (k: number) => string) => ({ id: '1', slug: 's', status: 'published', source_lang: 'en', category: 'cyprus',
    title_en: 'T', content_en: en, ...Object.fromEntries(['de', 'el', 'ro', 'ar', 'pl', 'ru'].flatMap((l, k) => [[`title_${l}`, 'T'], [`content_${l}`, others(k + 1)]])) });

  // (A) the style fails, the length is in line with the others
  const nestled = '<p>Nestled in the heart of Nicosia, this hidden gem of a festival is a testament to the island’s rich tapestry. Fifteen short films from ten countries screen from 22 to 24 September, and the experience is truly vibrant and stunning.</p><p>The first screening begins at 6:30 pm on 22 September at EU House. On 23 September a 7 pm screening moves outdoors to the Eleftheria Square amphitheatre.</p><p>The closing screening starts at 7 pm on 24 September at the Gardens of the Future, with six films from Greece, Germany and France.</p>';
  const a = scanPosts([edition(nestled, (k) => prose(0, 6, k))]).editions.find((e) => e.lang === 'en')!;
  ok('an edition with machine tells needs Clean and is in line in length', a.needsClean && a.parity === '' && a.voice > MAX_SCORE && a.score === a.voice);
  // (B) the style passes, the edition is far shorter than the others
  const b = scanPosts([edition(prose(0, 6), (k) => prose(0, 24, k))]);
  const en = b.editions.find((e) => e.lang === 'en')!;
  ok('a short edition is flagged for its length, not for its style', en.parity !== '' && /less than the other editions/.test(en.parity) && !en.needsClean && en.voice <= MAX_SCORE && en.score === Math.min(100, en.voice + 25));
  ok('…and it is listed as an offender', isOffender(en) && rankWorst(b.editions).some((e) => e.lang === 'en'));
  ok('an edition that passes and is in line is not listed', !isOffender({ ...en, parity: '', needsClean: false }));
}

// ── the worker forgets verdicts reached under older rules ──────────────────────────────────────────────────────────────────
{
  const att = { 'a:ro': { n: 3, last: '2026-10-12T10:00:00.000Z', ok: false, score: 14 } };
  eq('attempts recorded under no rules version are dropped', Object.keys(parseState({ enabled: true, attempts: att }).attempts), []);
  eq('attempts recorded under the current rules are kept', Object.keys(parseState({ enabled: true, rules: RULES_VERSION, attempts: att }).attempts), ['a:ro']);
  ok('the rest of the state survives the reset', parseState({ enabled: true, dailyCap: 300, usedToday: 64, day: '2026-10-13', attempts: att }).dailyCap === 300);
}

report('voice.figures');
