// Canonical taxonomy (CI-8, Phase 1) — the pure integrity + coercion. Every listing gets
// classified into these keys, so the set must be unique and the coercion must never emit
// a category outside the taxonomy (that would break faceting, ranking and Partner
// category-exclusivity).
import {
  CANONICAL_CATEGORIES, CATEGORY_KEYS, isCanonicalCategory, categoryLabel,
  classifyPromptList, coerceClassification, mapToCanonical,
} from '@/lib/directory/taxonomy';
import { eq, ok, report } from './_harness';

// ── Integrity ────────────────────────────────────────────────────────────────────
eq('keys are unique', new Set(CANONICAL_CATEGORIES.map((c) => c.key)).size, CANONICAL_CATEGORIES.length);
ok('a healthy number of categories', CANONICAL_CATEGORIES.length >= 60);
ok('every category has a label and group', CANONICAL_CATEGORIES.every((c) => c.label.length > 1 && c.group.length > 1));
ok('key set matches the list', CATEGORY_KEYS.size === CANONICAL_CATEGORIES.length);
ok('the key vision categories exist', ['gym-fitness', 'solar-installer', 'locksmith', 'car-repair-garage', 'pharmacy', 'law-firm', 'fashion-clothing', 'nightclub', 'museum', 'veterinary'].every((k) => isCanonicalCategory(k)));
ok('a general-vendor fallback exists', isCanonicalCategory('general-vendor'));
eq('categoryLabel resolves', categoryLabel('gym-fitness'), 'Gym / fitness');
ok('classify prompt lists the keys', classifyPromptList().includes('gym-fitness —'));

// ── coerceClassification ───────────────────────────────────────────────────────────
{
  const c = coerceClassification({ category: 'Gym-Fitness', subtype: 'CrossFit Box', tags: ['crossfit', 'weights', 'weights'] });
  eq('valid category lowercased & kept', c.category, 'gym-fitness');
  eq('subtype slugified', c.subtype, 'crossfit-box');
  eq('tags cleaned + deduped', c.tags.join(','), 'crossfit,weights');
}
eq('unknown category → general-vendor', coerceClassification({ category: 'spaceship-dealer' }).category, 'general-vendor');
eq('blank input → general-vendor', coerceClassification({}).category, 'general-vendor');
eq('blank input → null subtype', coerceClassification({}).subtype, null);
eq('blank input → empty tags', coerceClassification({}).tags.length, 0);
eq('non-object → general-vendor', coerceClassification('nope' as unknown).category, 'general-vendor');
{
  const c = coerceClassification({ category: 'pharmacy', tags: ['a', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty'] });
  ok('tags capped at 6', c.tags.length <= 6);
  ok('too-short tag dropped', !c.tags.includes('a'));
}

// ── mapToCanonical (deterministic bulk classifier) ────────────────────────────────
eq('raw slug "gyms" → gym-fitness', mapToCanonical('gyms'), 'gym-fitness');
eq('"health-clubs" → gym-fitness', mapToCanonical('health-clubs'), 'gym-fitness');
eq('"solar-energy" → solar-installer', mapToCanonical('solar-energy'), 'solar-installer');
eq('"lawyers" → law-firm', mapToCanonical('lawyers'), 'law-firm');
eq('"advocates" → law-firm', mapToCanonical('advocates'), 'law-firm');
eq('"estate agents" → real-estate-agency', mapToCanonical('estate agents'), 'real-estate-agency');
eq('"pharmacies" → pharmacy', mapToCanonical('pharmacies'), 'pharmacy');
eq('"car rental" → car-rental', mapToCanonical('car rental'), 'car-rental');
eq('"car repair garage" → car-repair-garage', mapToCanonical('auto repair garage'), 'car-repair-garage');
eq('"coffee shop" → cafe', mapToCanonical('coffee shop'), 'cafe');
eq('Greek "φαρμακείο" → pharmacy', mapToCanonical('φαρμακείο'), 'pharmacy');
eq('name-based "FROSTER refrigerator" → ac-hvac', mapToCanonical('vendor FROSTER REFRIGERATOR COMPANY'), 'ac-hvac');
eq('unrecognised → null (goes to LLM)', mapToCanonical('quantum flux widgets ltd'), null);
eq('empty → null', mapToCanonical('   '), null);

report('taxonomy.pure');
