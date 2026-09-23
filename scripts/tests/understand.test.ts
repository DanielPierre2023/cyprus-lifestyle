// LLM query understanding (CI-3) — the pure coercion + augmentation helpers. The live
// Haiku call is opt-in and network-bound (not tested here); what MUST be right is that
// whatever the model returns is coerced safely and folded into the query the existing
// engine searches — otherwise a bad parse could mis-route or crash a turn.
import { coerceUnderstanding, buildAugmentedQuery, type Understanding } from '@/lib/concierge/understand';
import { eq, ok, report } from './_harness';

// ── coerceUnderstanding ─────────────────────────────────────────────────────────
eq('null input → null', coerceUnderstanding(null), null);
eq('non-object → null', coerceUnderstanding('nope' as unknown), null);
eq('empty object → null (nothing useful)', coerceUnderstanding({}), null);
eq('all-empty fields → null', coerceUnderstanding({ district: '', subtype: '', keywords: [] }), null);

{
  const u = coerceUnderstanding({ district: 'Larnaca', subtype: 'Air Conditioning', keywords: ['air conditioning', 'HVAC'], luxury: false });
  ok('valid parse is returned', !!u);
  eq('district lowercased', u!.district, 'larnaca');
  eq('subtype slugified', u!.subtype, 'air-conditioning');
  eq('keywords kept + lowercased', u!.keywords.join(','), 'air conditioning,hvac');
  eq('luxury false', u!.luxury, false);
}

eq('unknown district → null district', coerceUnderstanding({ district: 'kyrenia', keywords: ['bar'] })!.district, null);
eq('keywords as a string becomes an array', coerceUnderstanding({ keywords: 'plumber' })!.keywords.join(','), 'plumber');

{
  const u = coerceUnderstanding({ keywords: ['a', 'gym', 'GYM', 'fitness centre', 'pool', 'sauna', 'spa'] })!;
  ok('too-short keyword "a" dropped', !u.keywords.includes('a'));
  ok('duplicates folded (gym once)', u.keywords.filter((k) => k === 'gym').length === 1);
  ok('capped at 4 keywords', u.keywords.length <= 4);
}

eq('luxury as string "true" is honoured', coerceUnderstanding({ keywords: ['villa'], luxury: 'true' })!.luxury, true);

// ── buildAugmentedQuery ─────────────────────────────────────────────────────────
eq('null understanding → original unchanged', buildAugmentedQuery('reparator aer conditionat pila', null), 'reparator aer conditionat pila');
{
  const u: Understanding = { district: 'larnaca', subtype: 'air-conditioning', keywords: ['air conditioning', 'hvac'], luxury: false };
  const aug = buildAugmentedQuery('mi s-a stricat aerul', u);
  ok('keeps the original text', aug.startsWith('mi s-a stricat aerul'));
  ok('adds the English stems', aug.includes('air conditioning') && aug.includes('hvac'));
  ok('adds the subtype words', aug.includes('air conditioning'));
  ok('adds the district', aug.includes('larnaca'));
}
{
  const u: Understanding = { district: null, subtype: null, keywords: [], luxury: false };
  eq('no useful signal → original unchanged', buildAugmentedQuery('hello there', u), 'hello there');
}

report('understand.pure');
