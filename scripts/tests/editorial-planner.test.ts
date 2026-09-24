// Editorial planner — pure logic (seasonal calendar, prompt builders, redundancy
// helpers, model-output coercion). No I/O, so it bundles and runs like the other
// pure suites. The server runner (lib/editorial/plan.ts) is exercised via the gate.
import {
  MONTH_NAMES, seasonalNote, monthName,
  normalizeTitle, dedupHash, titleSimilarity, isTitleRedundant,
  researchQueriesFor, plannerSystem, ideatePrompt, coerceIdeas, filterRedundant,
  type IdeaCandidate,
} from '@/lib/editorial/planner';
import type { EditorialSection } from '@/lib/editorial/taxonomy';
import { eq, ok, report } from './_harness';

const SECTION: EditorialSection = {
  key: 'table-fine', name: 'Fine Dining', description: 'The tables worth travelling for.',
  parentKey: 'table', monthlyTarget: 4, franchiseKey: 'at-the-table', dirGroups: ['restaurant'], active: true,
};

// ── Seasonal calendar ────────────────────────────────────────────────────────────
eq('twelve month names', MONTH_NAMES.length, 12);
ok('every month has a seasonal note', Array.from({ length: 12 }, (_, i) => i + 1).every((m) => seasonalNote(m).length > 20));
eq('monthName(9) is September', monthName(9), 'September');
eq('seasonal note mentions the wine harvest in September', /harvest|wine/i.test(seasonalNote(9)), true);

// ── Redundancy helpers ─────────────────────────────────────────────────────────
eq('normalizeTitle strips stopwords + case + punctuation',
  normalizeTitle('The Best Restaurants in Cyprus!'), 'best restaurants');
ok('dedupHash is stable', dedupHash('The Quiet Coast') === dedupHash('the quiet coast'));
ok('reworded-but-same title collides on hash', dedupHash('The Best Tavernas of Cyprus') === dedupHash('Best Tavernas in Cyprus'));
ok('similarity high for near-dups', titleSimilarity('Where Limassol Dines Now', 'Where Limassol Dines Today') >= 0.5);
ok('similarity low for different topics', titleSimilarity('The Quiet Coast', 'A Nicosia Goldsmith') < 0.3);
ok('isTitleRedundant catches a reworded existing title',
  isTitleRedundant('Best Tavernas in Cyprus', ['The Best Tavernas of Cyprus']));
ok('isTitleRedundant passes a fresh title', !isTitleRedundant('A House Above Pissouri', ['Where Limassol Dines Now']));

// ── Research queries ─────────────────────────────────────────────────────────────
ok('research queries are non-empty and name the section', researchQueriesFor(SECTION, 9).every((q) => q.includes('Fine Dining') || q.toLowerCase().includes('fine dining')));
eq('two research queries', researchQueriesFor(SECTION, 9).length, 2);

// ── Prompt builders ──────────────────────────────────────────────────────────────
ok('planner system sets the house + south-only frame', /Cyprus Lifestyle/.test(plannerSystem()) && /south only|Northern Cyprus/i.test(plannerSystem()));
const prompt = ideatePrompt({
  section: SECTION, departmentName: 'The Table', monthIndex: 9, count: 3,
  signals: { seasonal: seasonalNote(9), web: '', demand: ['best sushi in Limassol'], candidates: [{ name: 'To Kati Allo', slug: 'to-kati-allo', district: 'limassol' }] },
  existingTitles: ['Where Limassol Dines Now'],
});
ok('prompt carries the section + remit', prompt.includes('Fine Dining') && prompt.includes('The tables worth travelling for'));
ok('prompt lists the directory candidate by slug', prompt.includes('to-kati-allo'));
ok('prompt warns against duplicating existing titles', prompt.includes('Where Limassol Dines Now') && /do NOT/i.test(prompt));
ok('prompt demands JSON with the idea fields', prompt.includes('"ideas"') && prompt.includes('workingTitle') && prompt.includes('needs'));
ok('prompt asks for the count', prompt.includes('Propose 3'));

// ── Coercion & validation ────────────────────────────────────────────────────────
const coerced = coerceIdeas({ ideas: [
  { workingTitle: 'A Table Worth the Drive', angle: 'x', needs: 'visit', franchise: 'at-the-table', wordTarget: 900, outline: ['a', 'b'], verify: ['c'], subjectSlug: 'foo' },
  { angle: 'no title — dropped' },
  { workingTitle: 'Bad Franchise', franchise: 'spaceship', needs: 'nonsense' },
]});
eq('coerce drops the title-less idea', coerced.length, 2);
eq('coerce keeps a valid franchise', coerced[0].franchise, 'at-the-table');
eq('coerce maps needs=visit', coerced[0].needs, 'visit');
eq('coerce defaults unknown needs to desk', coerced[1].needs, 'desk');
ok('coerce nulls an invalid franchise', coerced[1].franchise === null);
eq('coerce keeps the outline', coerced[0].outline.length, 2);

// ── Batch de-dup ─────────────────────────────────────────────────────────────────
const batch: IdeaCandidate[] = [
  { workingTitle: 'Where Limassol Dines Today', angle: '', rationale: '', subjectSlug: null, subjectHint: null, franchise: null, needs: 'desk', wordTarget: null, outline: [], verify: [] },
  { workingTitle: 'A Nicosia Goldsmith', angle: '', rationale: '', subjectSlug: null, subjectHint: null, franchise: null, needs: 'desk', wordTarget: null, outline: [], verify: [] },
];
const kept = filterRedundant(batch, ['Where Limassol Dines Now']);
eq('filterRedundant drops the near-dup of an existing title', kept.length, 1);
eq('filterRedundant keeps the fresh one', kept[0].workingTitle, 'A Nicosia Goldsmith');

report('editorial-planner.pure');
