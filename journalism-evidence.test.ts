// Every fact of the fact core must point to a passage of the source, and code checks the pointer: what the source does not say never reaches a
// writer. These tests use the failures that matter in practice (an invented figure, a passage that is not in the source, a passage pasted
// under every fact, a quotation that is not word for word) and the cases that must NOT be refused (another language, other punctuation,
// an ellipsis inside a sentence).
import {
  foldForMatch, passageFragments, locatePassage, figuresOf, lexicalSupport, looksEnglish, verifyCore, evidenceModeFrom, evidenceRepairSystem, evidenceRepairUser,
  parseEvidenceRepair, withRepairedEvidence, MAX_PASSAGE_WORDS, MAX_REUSE, type SourceText,
} from '@/lib/journalism/evidence';
import { parseFactCore, factCoreSchema, factCoreSystem, factCoreUser, renderFactCore, type FactCore } from '@/lib/journalism/factCore';
import { parseJsonLoose } from '@/lib/journalism/openai';
import { strictSchemaProblems } from './_openaiRules';
import { eq, ok, report } from './_harness';

const SRC_TEXT = `The Limassol marina will raise its monthly berth fee from €70 to €90 on 1 March 2027, the harbour authority said on Tuesday. About 400 berth holders are affected. The council voted 31 to 18 in favour after a long debate. "We will start the dredging in June," said harbourmaster Maria Ioannou. The works cost €4.2 million. The marina has 612 berths and has not been dredged since 2019.`;
const SRC: SourceText[] = [{ label: 'A', title: 'Marina fees rise', text: SRC_TEXT }];

const rawCore = (over: Record<string, unknown> = {}) => ({
  category: 'cyprus', subcategory: 'regional', district: 'limassol', source_lang: 'en', cyprus_angle: true, cyprus_basis: 'named', cyprus_evidence: 'The Limassol marina will raise its monthly berth fee', cyprus_hook: 'Limassol marina fees',
  story_type: 'news', complexity: 'routine', flags: [], headline_fact: 'The Limassol marina raises its berth fee to 90 euros.',
  confirmed_facts: [
    { fact: 'The Limassol marina raises its monthly berth fee from 70 to 90 euros on 1 March 2027.', evidence: 'will raise its monthly berth fee from €70 to €90 on 1 March 2027' },
    { fact: 'About 400 berth holders are affected.', evidence: 'About 400 berth holders are affected.' },
    { fact: 'The council voted 31 to 18 in favour.', evidence: 'The council voted 31 to 18 in favour after a long debate' },
    { fact: 'The works cost 4.2 million euros.', evidence: 'The works cost €4.2 million.' },
  ],
  attributed_claims: [{ who: 'Maria Ioannou', claim: 'The dredging starts in June.', evidence: 'We will start the dredging in June' }],
  allegations: [], unverified: [], direct_quotes: [{ speaker: 'Maria Ioannou', role: 'harbourmaster', original: 'We will start the dredging in June', english: 'We will start the dredging in June' }],
  dates: [{ when: '1 March 2027', what: 'new fee applies' }], numbers: [{ value: '€90', what: 'new monthly fee' }, { value: '612', what: 'berths' }],
  entities: [{ name: 'Maria Ioannou', kind: 'person', role: 'harbourmaster' }], open_questions: [], conflicts: [],
  ...over,
});
const core = (over: Record<string, unknown> = {}): FactCore => { const p = parseFactCore(JSON.stringify(rawCore(over))); if (!p.ok || !p.core) throw new Error(`fixture does not parse: ${p.error}`); return p.core; };

// ── the schema and the parser ────────────────────────────────────────────────────────────────────────────────────
eq('the single-source schema follows the strict rules', strictSchemaProblems(factCoreSchema()), []);
eq('the two-source schema follows the strict rules', strictSchemaProblems(factCoreSchema({ labels: ['A', 'B'] })), []);
{
  const one = factCoreSchema() as unknown as { properties: Record<string, { items?: { properties: Record<string, unknown> } }> };
  const two = factCoreSchema({ labels: ['A', 'B'] }) as unknown as { properties: Record<string, { items?: { properties: Record<string, unknown> } }> };
  ok('one source: no source label on the items', !('source' in one.properties.confirmed_facts.items!.properties) && !('same_story' in one.properties));
  ok('two sources: every item names its source, and the core says whether it is the same story', 'source' in two.properties.confirmed_facts.items!.properties && 'source' in two.properties.attributed_claims.items!.properties && 'source' in two.properties.allegations.items!.properties && 'same_story' in two.properties);
}
{
  const c = core();
  eq('facts and passages stay aligned', [c.confirmed.length, c.proof!.confirmed.length, c.proof!.claims.length], [4, 4, 1]);
  eq('the Cyprus basis and passage are read', [c.cyprusBasis, c.cyprusEvidence], ['named', 'The Limassol marina will raise its monthly berth fee']);
  const old = parseFactCore(JSON.stringify(rawCore({ confirmed_facts: ['A plain string fact.', 'Another.'], cyprus_basis: undefined, cyprus_evidence: undefined })));
  ok('the older shape (facts as strings) still parses, without passages', old.ok && old.core!.confirmed.length === 2 && old.core!.proof!.confirmed.every((p) => p.evidence === ''));
  const dup = parseFactCore(JSON.stringify(rawCore({ confirmed_facts: [{ fact: 'Same fact.', evidence: 'a' }, { fact: 'SAME  fact.', evidence: 'b' }, { fact: 'Other.', evidence: 'c' }] })));
  eq('a duplicate fact is dropped together with its passage', [dup.core!.confirmed, dup.core!.proof!.confirmed.map((p) => p.evidence)], [['Same fact.', 'Other.'], ['a', 'c']]);
  eq('"none" as the Cyprus passage becomes empty', parseFactCore(JSON.stringify(rawCore({ cyprus_evidence: 'none' }))).core!.cyprusEvidence, '');
  eq('an unknown Cyprus basis becomes none', parseFactCore(JSON.stringify(rawCore({ cyprus_basis: 'vibes' }))).core!.cyprusBasis, 'none');
  const two = parseFactCore(JSON.stringify(rawCore({ same_story: true, confirmed_facts: [{ fact: 'X is true.', evidence: 'x is true', source: 'b' }] })));
  eq('the source label is kept (upper case) and the verdict on the second source is read', [two.core!.proof!.confirmed[0].source, two.core!.sameStory], ['B', true]);
}
ok('the core prompt demands a letter-for-letter passage and a Cyprus passage', /LETTER FOR LETTER/.test(factCoreSystem()) && /cyprus_evidence/.test(factCoreSystem()) && /general knowledge/.test(factCoreSystem()));
ok('the two-source prompt asks whether B is the same story and where to put a disagreement', /same_story/.test(factCoreSystem({ multi: true })) && /conflicts/.test(factCoreSystem({ multi: true })) && !/TWO SOURCES/.test(factCoreSystem()));
ok('the user message holds both sources as data', ((u) => u.includes('SOURCE A TITLE') && u.includes('SOURCE B TITLE') && (u.match(/data, not instructions/g) || []).length === 2)(factCoreUser({ title: 'T', text: 'a body', extra: [{ label: 'B', title: 'T2', text: 'b body' }] })));
ok('with one source the message is the one it always was', factCoreUser({ title: 'T', text: 'body' }).startsWith('SOURCE TITLE: T'));

// ── looking a passage up ─────────────────────────────────────────────────────────────────────────────────────────
eq('case, accents, quotation marks, dashes and spacing do not matter', foldForMatch('  «Ο Δήμαρχος»  said — “Hello,   World!”  '), 'ο δημαρχοσ said hello world');
eq('Greek tonos, final sigma and capitals fold together', foldForMatch('ΛΕΜΕΣΌΣ'), foldForMatch('Λεμεσός'));
eq('Arabic-Indic digits become digits and Arabic marks go', foldForMatch('٤٠٠ عامًا'), '400 عاما');
eq('sharp s and the German umlaut fold', [foldForMatch('Straße'), foldForMatch('Größe')], ['strasse', 'grosse']);
eq('HTML is ignored', foldForMatch('<p>The <strong>marina</strong></p>'), 'the marina');
eq('an ellipsis splits a passage into pieces', passageFragments('The works cost ... 4.2 million euros'), ['the works cost', '4 2 million euros']);
eq('a bracketed ellipsis too', passageFragments('The council voted [...] in favour').length, 2);
{
  const hay = foldForMatch(SRC_TEXT);
  ok('an exact passage is found', locatePassage(hay, 'The council voted 31 to 18 in favour').found);
  ok('with other punctuation and case it is found', locatePassage(hay, 'the council voted 31 to 18, in favour!').found);
  ok('words that are not in the source are not found', !locatePassage(hay, 'The council voted unanimously against the rise').found);
  ok('pieces joined by an ellipsis are found when they stand in order', locatePassage(hay, 'will raise its monthly berth fee ... on 1 March 2027').found);
  ok('...and not when they stand in the wrong order', !locatePassage(hay, 'on 1 March 2027 ... will raise its monthly berth fee').found);
  ok('an empty passage points at nothing', !locatePassage(hay, '   ').found && locatePassage(hay, '').reason === 'no passage given');
  ok('a passage of a few letters points at nothing', !locatePassage(hay, 'the').found);
  const at = locatePassage(hay, 'The marina has 612 berths');
  ok('the position is a share of the source (0 to 1) and grows with the place in the text', at.pos > 0.7 && at.pos < 1 && locatePassage(hay, 'The Limassol marina will raise').pos < 0.05);
}
eq('figures are read in canonical form, single digits and ten do not count', [figuresOf('€4.2 million for 3 steps and 10 people, 2,500 seats'), figuresOf('4,2 εκατ.')], [['4.2', '2500'], ['4.2']]);
eq('...unless a unit or a currency is attached to the digit', [figuresOf('2 million euros'), figuresOf('a 5% rise'), figuresOf('only €3 each'), figuresOf('3 steps and 7 people')], [['2'], ['5'], ['3'], []]);
ok('lexical support: the words of the fact stand in its passage', (lexicalSupport('The Limassol marina raises its monthly berth fee', 'will raise its monthly berth fee at the Limassol marina') ?? 0) > 0.6);
ok('...and fail when the passage is about something else', (lexicalSupport('The Limassol marina raises its monthly berth fee', 'The weather was mild and the sea calm over the weekend') ?? 1) < 0.2);
eq('too short a fact is not judged', lexicalSupport('Fee is up', 'anything at all'), null);

// ── verifying the core ───────────────────────────────────────────────────────────────────────────────────────────
{
  const r = verifyCore(core(), SRC, { mode: 'enforce' });
  eq('a well-founded core is kept whole', [r.core.confirmed.length, r.core.claims.length, r.core.quotes.length, r.core.numbers.length, r.core.dates.length, r.failed.length, r.report.dropped.length], [4, 1, 1, 2, 1, 0, 0]);
  eq('the order of the source is recorded (1-based, by the place of the passage)', r.core.sourceOrder, [1, 2, 3, 4]);
  eq('everything kept: share 1', r.keptShare, 1);
}
{
  // the editor invents a detail and a figure; and gives a passage that is not in the source
  const c = core({
    confirmed_facts: [
      ...rawCore().confirmed_facts,
      { fact: 'The mayor said the rise was unavoidable.', evidence: 'The mayor said the rise was unavoidable' },
      { fact: 'The marina earns 2 million euros a year.', evidence: 'The marina has 612 berths and has not been dredged since 2019.' },
      { fact: 'Dredging has not been done since 2019.', evidence: 'has not been dredged since 2019' },
    ],
  });
  const r = verifyCore(c, SRC, { mode: 'enforce' });
  eq('the fact without a passage in the source is dropped', r.core.confirmed.includes('The mayor said the rise was unavoidable.'), false);
  eq('the fact whose figure is not in its passage is dropped (2 million is nowhere)', r.core.confirmed.includes('The marina earns 2 million euros a year.'), false);
  eq('a true fact with a good passage stays', r.core.confirmed.includes('Dredging has not been done since 2019.'), true);
  eq('what was dropped is reported with the reason', r.report.dropped.map((d) => d.reason).sort(), ['the figure 2000000 is not in the passage'.replace('2000000', '2'), 'the passage is not in the source'].sort());
  ok('and offered for a second ask', r.failed.length === 2 && r.failed.every((f) => f.kind === 'confirmed'));
  eq('the share kept (six of eight items)', +r.keptShare.toFixed(2), 0.75);
  eq('proofs stay aligned after dropping', r.core.proof!.confirmed.length, r.core.confirmed.length);
}
{
  const long = Array.from({ length: MAX_PASSAGE_WORDS + 5 }, (_, i) => `word${i}`).join(' ');
  const r = verifyCore(core({ confirmed_facts: [{ fact: 'About 400 berth holders are affected.', evidence: long }, { fact: 'The works cost 4.2 million euros.', evidence: 'The works cost €4.2 million.' }] }), SRC, { mode: 'enforce' });
  eq('a passage longer than the limit is refused', r.report.dropped.map((d) => d.reason), [`the passage is longer than ${MAX_PASSAGE_WORDS} words`]);
}
{
  // one passage pasted under many facts
  const same = 'The Limassol marina will raise its monthly berth fee from €70 to €90 on 1 March 2027';
  const facts = Array.from({ length: MAX_REUSE + 2 }, (_, i) => ({ fact: `The Limassol marina raises its monthly berth fee, detail ${i}.`, evidence: same }));
  const r = verifyCore(core({ confirmed_facts: facts }), SRC, { mode: 'enforce' });
  eq(`the same passage serves ${MAX_REUSE} facts and no more`, [r.core.confirmed.length, r.report.dropped.every((d) => /too many facts/.test(d.reason))], [MAX_REUSE, true]);
}
{
  // quotations, figures, dates
  const r = verifyCore(core({
    direct_quotes: [{ speaker: 'Maria Ioannou', role: 'harbourmaster', original: 'We will start the dredging in June', english: 'x' }, { speaker: 'The mayor', role: 'mayor', original: 'The rise is a disgrace to the island', english: 'x' }],
    numbers: [{ value: '€90', what: 'fee' }, { value: '€120', what: 'invented fee' }, { value: 'three', what: 'a word, not a figure' }],
    dates: [{ when: '1 March 2027', what: 'fee applies' }, { when: '15 April 2027', what: 'invented date' }, { when: 'next Monday', what: 'no digits' }],
  }), SRC, { mode: 'enforce' });
  eq('only the quotation that is in the source word for word stays', r.core.quotes.map((q) => q.speaker), ['Maria Ioannou']);
  eq('only figures of the source stay (a figure written as a word has nothing to check)', r.core.numbers.map((n) => n.value), ['€90', 'three']);
  eq('only dates of the source stay (a date without digits has nothing to check)', r.core.dates.map((d) => d.when), ['1 March 2027', 'next Monday']);
}
{
  // another language: the passage is Greek, the fact English; the figures decide
  const el: SourceText[] = [{ label: 'A', title: 'Αύξηση τελών', text: 'Η μαρίνα της Λεμεσού θα αυξήσει το μηνιαίο τέλος ελλιμενισμού από 70 σε 90 ευρώ την 1η Μαρτίου 2027, ανακοίνωσε η λιμενική αρχή. Περίπου 400 κάτοχοι θέσεων επηρεάζονται.' }];
  const c = core({
    source_lang: 'el',
    confirmed_facts: [
      { fact: 'The Limassol marina raises its monthly berth fee from 70 to 90 euros.', evidence: 'θα αυξήσει το μηνιαίο τέλος ελλιμενισμού από 70 σε 90 ευρώ' },
      { fact: 'About 400 berth holders are affected.', evidence: 'ΠΕΡΙΠΟΥ 400 κάτοχοι θέσεων επηρεάζονται' },
      { fact: 'The fee rises to 95 euros.', evidence: 'θα αυξήσει το μηνιαίο τέλος ελλιμενισμού από 70 σε 90 ευρώ' },
    ],
    attributed_claims: [], direct_quotes: [], dates: [{ when: '1 March 2027', what: 'x' }], numbers: [],
  });
  const r = verifyCore(c, el, { mode: 'enforce' });
  eq('a Greek passage supports an English fact when its figures agree (capitals and accents do not matter); a wrong figure is caught', [r.core.confirmed.length, r.core.confirmed.includes('The fee rises to 95 euros.')], [2, false]);
}
{
  // English source and English fact: the words must be there too
  const c = core({ confirmed_facts: [{ fact: 'Harbour dredging contracts were awarded to a Dutch consortium.', evidence: 'The marina has 612 berths and has not been dredged since 2019.' }], attributed_claims: [] });
  const r = verifyCore(c, SRC, { mode: 'enforce' });
  eq('a passage that exists but says something else does not support the fact', r.report.dropped.map((d) => d.reason), ['the passage does not support the fact']);
}
{
  // a core that says "en" for a source that is not English must not lose its facts to the word check
  const el: SourceText[] = [{ label: 'A', title: 'Αύξηση τελών', text: 'Η μαρίνα της Λεμεσού θα αυξήσει το μηνιαίο τέλος ελλιμενισμού από 70 σε 90 ευρώ την 1η Μαρτίου 2027, ανακοίνωσε η λιμενική αρχή. Περίπου 400 κάτοχοι θέσεων επηρεάζονται από την αύξηση, ενώ οι εργασίες εκβάθυνσης ξεκινούν τον Ιούνιο, όπως δήλωσε ο λιμενάρχης Μαρία Ιωάννου. Η μαρίνα διαθέτει 612 θέσεις και δεν έχει εκβαθυνθεί από το 2019.' }];
  const c = core({
    source_lang: 'en',
    confirmed_facts: [{ fact: 'The Limassol marina raises its monthly berth fee from 70 to 90 euros.', evidence: 'θα αυξήσει το μηνιαίο τέλος ελλιμενισμού από 70 σε 90 ευρώ' }],
    attributed_claims: [], direct_quotes: [], dates: [], numbers: [],
  });
  const r = verifyCore(c, el, { mode: 'enforce' });
  eq('a Greek source declared as English: the word check is not applied, the fact stays', [r.core.confirmed.length, r.report.dropped.length], [1, 0]);
  ok('English prose is recognised by its function words; Greek, German and a few words are not', looksEnglish(SRC[0].text) && !looksEnglish(el[0].text) && !looksEnglish('Die Marina von Limassol erhöht die monatliche Liegegebühr von 70 auf 90 Euro ab dem 1. März, wie die Hafenbehörde am Dienstag mitteilte. Rund 400 Liegeplatzinhaber sind betroffen, die Baggerarbeiten beginnen im Juni, sagte die Hafenmeisterin Maria Ioannou.') && !looksEnglish('The marina raises fees.'));
}
{
  // modes
  const bad = core({ confirmed_facts: [...rawCore().confirmed_facts, { fact: 'The mayor resigned.', evidence: 'The mayor resigned yesterday' }] });
  const warn = verifyCore(bad, SRC, { mode: 'warn' });
  eq('warn: the core is returned as it was, and the report says what enforce would drop', [warn.core === bad, warn.report.dropped.length, warn.failed.length], [true, 1, 1]);
  const off = verifyCore(bad, SRC, { mode: 'off' });
  eq('off: nothing is looked at', [off.core === bad, off.report.dropped.length, off.keptShare], [true, 0, 1]);
  eq('the mode is read from a setting (anything but off or warn enforces)', ['off', ' WARN ', 'enforce', '', undefined, 'yes'].map((v) => evidenceModeFrom(v as string | undefined)), ['off', 'warn', 'enforce', 'enforce', 'enforce', 'enforce']);
  const legacy = parseFactCore(JSON.stringify(rawCore({ confirmed_facts: ['A fact with no passage.'], attributed_claims: [{ who: 'X', claim: 'a claim' }] }))).core!;
  const lr = verifyCore(legacy, SRC, { mode: 'enforce' });
  eq('a core without passages (the older shape) is emptied', [lr.core.confirmed.length, lr.core.claims.length], [0, 0]);
}

// ── asking once more ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const bad = core({ confirmed_facts: [...rawCore().confirmed_facts, { fact: 'Dredging has not been done since 2019.', evidence: 'dredging did not happen after nineteen' }, { fact: 'The mayor resigned.', evidence: '' }] });
  const v1 = verifyCore(bad, SRC, { mode: 'enforce' });
  eq('two items go back to the editor', v1.failed.map((f) => f.text), ['Dredging has not been done since 2019.', 'The mayor resigned.']);
  const sys = evidenceRepairSystem();
  ok('the repair prompt asks for letter-for-letter passages or "none", and calls the source data', /letter for letter/.test(sys) && /"none"/.test(sys) && /UNTRUSTED DATA/.test(sys));
  const usr = evidenceRepairUser(SRC, v1.failed);
  ok('the repair message holds the source and the numbered statements', usr.includes('SOURCE A') && usr.includes('1. Dredging has not been done since 2019.') && usr.includes('2. The mayor resigned.'));
  const answer = JSON.stringify({ passages: [{ n: 1, evidence: 'has not been dredged since 2019' }, { n: 2, evidence: 'none' }] });
  const got = parseEvidenceRepair(answer, parseJsonLoose);
  eq('"none" and empty answers are left out', [...got.entries()], [[1, 'has not been dredged since 2019']]);
  const w = withRepairedEvidence(bad, v1.failed, got);
  eq('one passage is put in place', w.applied, 1);
  const v2 = verifyCore(w.core, SRC, { mode: 'enforce', repaired: w.applied });
  eq('the fact whose passage was found is kept, the invention is not', [v2.core.confirmed.includes('Dredging has not been done since 2019.'), v2.core.confirmed.includes('The mayor resigned.'), v2.report.repaired], [true, false, 1]);
  eq('junk answers are harmless', [parseEvidenceRepair('nonsense', parseJsonLoose).size, parseEvidenceRepair(JSON.stringify({ passages: [{ n: 'x', evidence: 'y' }, { n: 0, evidence: 'y' }] }), parseJsonLoose).size], [0, 0]);
}

// ── what the writers get ─────────────────────────────────────────────────────────────────────────────────────────
{
  const cleaned = verifyCore(core(), SRC, { mode: 'enforce' }).core;
  const text = renderFactCore({ ...cleaned, cyprus: { grounded: true, kind: 'named', statement: 'Limassol marina fees', via: 'named' } });
  ok('the Cyprus connection is stated first, as the only one', /CYPRUS CONNECTION \(the only link to Cyprus you may state/.test(text) && text.indexOf('CYPRUS CONNECTION') < text.indexOf('CONFIRMED FACTS'));
  ok('the writers never see a passage of the source', !text.includes('berth holders are affected.\n') || !/will raise its monthly berth fee from €70/.test(text));
  ok('the order of the original is named as the order NOT to follow', /THE ORDER OF THE ORIGINAL/.test(text) && /Do not follow it/.test(text));
  const none = renderFactCore({ ...cleaned, cyprus: { grounded: false, kind: 'none', statement: '', via: 'none' }, sourceOrder: undefined });
  ok('no connection: the writers are told not to mention Cyprus at all', /CYPRUS CONNECTION: none\. Do not mention Cyprus/.test(none));
  ok('a core that the desk has not looked at renders as before', !/CYPRUS CONNECTION/.test(renderFactCore(core())) && !/THE ORDER OF THE ORIGINAL/.test(renderFactCore({ ...core(), sourceOrder: [1, 2] })));
}

report('journalism-evidence');
