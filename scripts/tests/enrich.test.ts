// Stub-enrichment — pure-logic suite for lib/directory/enrich.ts.
// Covers the two things that must not regress: the STUB-DETECTION heuristic (a
// false positive de-lists a good page; a false negative keeps a hollow page
// indexed) and the GROUNDING VALIDATION gate (which must reject fabricated facts
// and unverifiable claims rather than publish them). The DB + model I/O is an
// integration concern and is not exercised here.
import {
  isStubText, isStub, isPublishableListing,
  groundingFacts, buildDescriptionPrompt, validateGeneratedDescription,
  STUB_MIN_CHARS, STUB_MIN_WORDS, type EnrichRow,
} from '@/lib/directory/enrich';
import { ok, eq, report } from './_harness';

const GOOD =
  'Blue Lagoon Taverna is a family-run restaurant in the old town of Paphos. It serves Cypriot meze and grilled fish, with seating indoors and on a shaded terrace.';

// ── isStubText: the hollow cases ──────────────────────────────────────────────
ok('empty is a stub', isStubText(''));
ok('whitespace is a stub', isStubText('   \n  '));
ok('null is a stub', isStubText(null));
ok('"N/A" is a stub', isStubText('N/A'));
ok('"TBD" is a stub', isStubText('tbd'));
ok('dashes only is a stub', isStubText('—'));
ok('"coming soon" is a stub', isStubText('Full description coming soon.'));
ok('"no description" is a stub', isStubText('No description available for this business.'));
ok('lorem ipsum is a stub', isStubText('Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do.'));
ok('placeholder phrase is a stub', isStubText('This is a placeholder summary for the listing record here now.'));
ok('short text is a stub', isStubText('A nice place in Paphos.'));
ok('few words is a stub', isStubText('Restaurant located in the district of Paphos town.'));

// ── isStubText: the name-echo case (just the name + category + district) ──────
ok('name echo is a stub', isStubText('Blue Lagoon Taverna — restaurant, Paphos.', 'Blue Lagoon Taverna'));
ok('name repeated is a stub', isStubText('Blue Lagoon Taverna. Blue Lagoon Taverna in Paphos.', 'Blue Lagoon Taverna'));

// ── isStubText: the real description is NOT a stub ────────────────────────────
ok('a real 2-sentence blurb is NOT a stub', !isStubText(GOOD, 'Blue Lagoon Taverna'));
ok('thresholds are the documented values', STUB_MIN_CHARS === 80 && STUB_MIN_WORDS === 12);

// ── isStub: write-safety guards ───────────────────────────────────────────────
ok('a hollow published row is an enrichable stub', isStub({ summary_en: '', name_en: 'X Ltd' }));
ok('owner-verified rows are NEVER enriched', !isStub({ summary_en: '', name_en: 'X', provenance: 'owner-verified' }));
ok('already-generated rows are skipped (idempotent)', !isStub({ summary_en: '', name_en: 'X', text_status: 'generated' }));
ok('owned-text rows are skipped', !isStub({ summary_en: '', name_en: 'X', text_status: 'owned' }));
ok('a review-flagged hollow row is still a candidate', isStub({ summary_en: '', name_en: 'X', text_status: 'review' }));
ok('a row with real text is not a stub', !isStub({ summary_en: GOOD, name_en: 'Blue Lagoon Taverna' }));

// ── isPublishableListing: the SEO gate ────────────────────────────────────────
ok('real text → publishable (in sitemap)', isPublishableListing({ summary_en: GOOD, name_en: 'Blue Lagoon Taverna' }));
ok('hollow text → NOT publishable (out of sitemap)', !isPublishableListing({ summary_en: '', name_en: 'X' }));
ok('owner-verified is always publishable even if thin', isPublishableListing({ summary_en: '', name_en: 'X', provenance: 'owner-verified' }));

// ── groundingFacts ────────────────────────────────────────────────────────────
const row: EnrichRow = {
  id: '1', slug: 'blue-lagoon-taverna', name_en: 'Blue Lagoon Taverna', type: 'restaurant',
  canonical_category: 'fine-dining', district: 'Paphos', tags: ['meze', 'seafood'], price_band: '€€€',
  summary_en: '', source_description: 'A taverna by the harbour serving fish.',
};
const facts = groundingFacts(row);
eq('facts.name', facts.name, 'Blue Lagoon Taverna');
eq('facts.category normalises dashes', facts.category, 'fine dining');
eq('facts.district', facts.district, 'Paphos');
eq('facts.tags', facts.tags, ['meze', 'seafood']);
ok('facts.ownText carried through', facts.ownText === 'A taverna by the harbour serving fish.');

// ── buildDescriptionPrompt ────────────────────────────────────────────────────
const prompt = buildDescriptionPrompt(facts);
ok('prompt system states the hard grounding rule', /Use ONLY the facts/i.test(prompt.system));
ok('prompt system bans superlatives', /never|do not|no .*best|unverifiable/i.test(prompt.system));
ok('prompt user carries the name', prompt.user.includes('Name: Blue Lagoon Taverna'));
ok('prompt user carries the district', /Paphos/.test(prompt.user));

// ── validateGeneratedDescription: accept the grounded, reject the fabricated ──
const vGood = validateGeneratedDescription(GOOD, row);
ok('a grounded blurb passes', vGood.ok === true);
ok('the passing blurb still names the business', vGood.ok === true && /Blue Lagoon Taverna/i.test(vGood.text));

const vMoney = validateGeneratedDescription('Blue Lagoon Taverna is a restaurant in Paphos where a meze spread costs about €25 per head in a relaxed setting.', row);
ok('a price (€) is rejected', vMoney.ok === false);

const vUrl = validateGeneratedDescription('Blue Lagoon Taverna is a restaurant in Paphos; see www.bluelagoon.cy for the full menu and to book a table.', row);
ok('a URL is rejected', vUrl.ok === false);

const vClaim = validateGeneratedDescription('Blue Lagoon Taverna is the best and most renowned restaurant in all of Paphos, serving award-winning Cypriot meze.', row);
ok('an unverifiable claim is rejected', vClaim.ok === false);

const vYear = validateGeneratedDescription('Blue Lagoon Taverna is a restaurant in Paphos that was founded in 1987 and serves traditional Cypriot meze dishes.', row);
ok('a fabricated number (year) is rejected', vYear.ok === false);

const vNoName = validateGeneratedDescription('A family-run restaurant in the old town of Paphos serving Cypriot meze and grilled fish on a shaded terrace.', row);
ok('output that omits the business name is rejected', vNoName.ok === false);

const vShort = validateGeneratedDescription('A restaurant.', row);
ok('a thin / short output is rejected', vShort.ok === false);

report('enrich.pure');
