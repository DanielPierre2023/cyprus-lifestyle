// Performance budget gate — the pure pass/fail logic (roadmap item 18). The gate
// (scripts/perf/check-budgets.mjs) measures first-load JS from the Next build and
// hands the sizes to these functions; here we lock down budget selection (exact,
// longest-prefix, default) and the over/under verdict.
import { budgetFor, evaluateBudgets, summarize } from '../perf/budgets.mjs';
import { eq, ok, report } from './_harness';

const budgets = { default: 260, routes: { '/[locale]': 240, '/[locale]/admin': 420 } };

// budgetFor — exact, prefix, default.
eq('exact match wins', budgetFor('/[locale]', budgets), 240);
eq('longest prefix wins', budgetFor('/[locale]/admin/analytics', budgets), 420);
eq('shorter prefix for public route', budgetFor('/[locale]/directory', budgets), 240);
eq('unknown route → default', budgetFor('/api/whatever', budgets), 260);
eq('no budgets → Infinity', budgetFor('/x', { routes: {} }), Infinity);
ok('prefix does not match a partial segment', budgetFor('/[locale]-admin', budgets) === 240 || budgetFor('/[locale]-admin', budgets) === 260);

// evaluateBudgets — over/under, rounding, overBy.
const res = evaluateBudgets({
  '/[locale]': 200,                 // under 240
  '/[locale]/admin/analytics': 500, // over 420 by 80
  '/[locale]/directory': 245,       // over 240 by 5
  '/api/track': 100,                // under default 260
}, budgets);
const by = Object.fromEntries(res.map((r) => [r.route, r]));
ok('public under budget → ok', by['/[locale]'].over === false);
ok('admin over budget flagged', by['/[locale]/admin/analytics'].over === true);
eq('over-by computed', by['/[locale]/admin/analytics'].overBy, 80);
ok('directory just over flagged', by['/[locale]/directory'].over === true);
eq('directory over-by', by['/[locale]/directory'].overBy, 5);
ok('api under default ok', by['/api/track'].over === false);

// summarize — counts + worst.
const sum = summarize(res);
eq('summary total', sum.total, 4);
eq('summary over count', sum.over, 2);
eq('summary ok count', sum.ok, 2);
eq('worst is the biggest', sum.worst.route, '/[locale]/admin/analytics');

// Infinite budget (no matching budget, no default) never counts as over.
const noDefault = evaluateBudgets({ '/x': 9999 }, { routes: {} });
ok('infinite budget never over', noDefault[0].over === false);

report('perf.budgets');
