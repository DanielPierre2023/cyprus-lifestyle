// scripts/perf/budgets.mjs — roadmap item 18 (resilience: performance budgets).
// Pure, dependency-free logic shared by the CWV/first-load budget gate
// (check-budgets.mjs) and its unit test (scripts/tests/perf-budgets.test.ts). No I/O
// here — the caller measures the bytes; this decides pass/fail against the budget.

// Given per-route first-load sizes in KB and a budgets config, return one verdict
// per route. budgets = { default: <KB>, routes: { "<route>": <KB>, ... } }.
// A route with no explicit budget falls back to budgets.default. Routes are matched
// exactly first; if not found, the longest matching prefix in `routes` wins (so a
// budget for "/admin" covers "/admin/anything" unless a more specific one exists).
export function budgetFor(route, budgets) {
  const routes = (budgets && budgets.routes) || {};
  if (Object.prototype.hasOwnProperty.call(routes, route)) return routes[route];
  let best = null, bestLen = -1;
  for (const key of Object.keys(routes)) {
    if (route === key || route.startsWith(key.endsWith('/') ? key : key + '/')) {
      if (key.length > bestLen) { best = routes[key]; bestLen = key.length; }
    }
  }
  if (best != null) return best;
  return (budgets && typeof budgets.default === 'number') ? budgets.default : Infinity;
}

export function evaluateBudgets(routeSizesKB, budgets) {
  const out = [];
  for (const route of Object.keys(routeSizesKB || {}).sort()) {
    const sizeKB = Math.round((routeSizesKB[route] || 0) * 10) / 10;
    const budgetKB = budgetFor(route, budgets);
    const over = Number.isFinite(budgetKB) ? sizeKB > budgetKB : false;
    out.push({ route, sizeKB, budgetKB, over, overBy: over ? Math.round((sizeKB - budgetKB) * 10) / 10 : 0 });
  }
  return out;
}

export function summarize(results) {
  const over = results.filter((r) => r.over);
  const worst = results.reduce((m, r) => (r.sizeKB > (m ? m.sizeKB : -1) ? r : m), null);
  return { total: results.length, over: over.length, ok: results.length - over.length, worst };
}
