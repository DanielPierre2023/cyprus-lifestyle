// Concierge quality evals — the PURE verdict/scoring logic (roadmap item 14).
// The live answer + LLM judge cost model calls and are exercised on demand from the
// admin panel; here we lock down the deterministic parts: score clamping, the
// overall average, the pass/weak/fail rules, and the sampler's spread + set integrity.
import { clampScore, overallScore, verdictFor, sampleEvalSet, EVAL_SET } from '@/lib/concierge/eval';
import { eq, ok, report } from './_harness';

// ── clampScore: integer in 0..5, 0 for anything invalid. ──────────────────────
eq('clamp 5', clampScore(5), 5);
eq('clamp over → 5', clampScore(6), 5);
eq('clamp 0', clampScore(0), 0);
eq('clamp negative → 0', clampScore(-3), 0);
eq('clamp rounds down', clampScore(3.4), 3);
eq('clamp rounds up', clampScore(3.6), 4);
eq('clamp string → 0', clampScore('nope'), 0);
eq('clamp null → 0', clampScore(null), 0);
eq('clamp undefined → 0', clampScore(undefined), 0);
eq('clamp NaN → 0', clampScore(NaN), 0);

// ── overallScore: mean of the three, 2dp. ─────────────────────────────────────
eq('overall perfect', overallScore({ grounded: 5, language: 5, helpful: 5 }), 5);
eq('overall mixed 2dp', overallScore({ grounded: 5, language: 4, helpful: 4 }), 4.33);
eq('overall low', overallScore({ grounded: 2, language: 2, helpful: 2 }), 2);

// ── verdictFor: hallucination or wrong language = hard fail; else avg gate. ────
eq('all high → pass', verdictFor({ grounded: 5, language: 5, helpful: 5 }), 'pass');
eq('low grounded → fail', verdictFor({ grounded: 2, language: 5, helpful: 5 }), 'fail');
eq('low language → fail', verdictFor({ grounded: 5, language: 2, helpful: 5 }), 'fail');
eq('grounded 1 → fail', verdictFor({ grounded: 1, language: 5, helpful: 5 }), 'fail');
eq('mid all → weak', verdictFor({ grounded: 3, language: 3, helpful: 3 }), 'weak');
eq('3.33 avg → weak', verdictFor({ grounded: 3, language: 3, helpful: 4 }), 'weak');
eq('3.67 avg, none low → pass', verdictFor({ grounded: 4, language: 4, helpful: 3 }), 'pass');
eq('grounded 3, avg high → pass', verdictFor({ grounded: 3, language: 4, helpful: 4 }), 'pass');
eq('all fail → fail (grounded wins over avg)', verdictFor({ grounded: 2, language: 2, helpful: 2 }), 'fail');

// ── sampleEvalSet: distinct, spread across locales, bounded by the set. ────────
const s4 = sampleEvalSet(4);
eq('sample 4 length', s4.length, 4);
ok('sample 4 all distinct', new Set(s4.map((x) => x.id)).size === 4);
ok('sample 4 spans 4 locales', new Set(s4.map((x) => x.locale)).size === 4);

const s7 = sampleEvalSet(7);
eq('sample 7 length', s7.length, 7);
ok('sample 7 one per locale', new Set(s7.map((x) => x.locale)).size === 7);

const sAll = sampleEvalSet(1000);
eq('sample over-cap → whole set', sAll.length, EVAL_SET.length);
ok('sample over-cap no dupes', new Set(sAll.map((x) => x.id)).size === EVAL_SET.length);

// ── EVAL_SET integrity. ───────────────────────────────────────────────────────
ok('all ids unique', new Set(EVAL_SET.map((x) => x.id)).size === EVAL_SET.length);
ok('all questions non-empty', EVAL_SET.every((x) => x.question.trim().length > 0));
const LOCS = new Set(['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru']);
ok('all locales valid', EVAL_SET.every((x) => LOCS.has(x.locale)));
ok('every locale represented', new Set(EVAL_SET.map((x) => x.locale)).size === 7);

report('eval.scoring');
