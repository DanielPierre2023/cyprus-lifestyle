#!/usr/bin/env node
// scripts/perf/check-budgets.mjs — roadmap item 18: the Core-Web-Vitals / first-load
// budget GATE. After `next build`, it reads the App Router build manifest, sums the
// first-load JS each route ships (its chunk bytes under .next/), and fails if any
// route is over its budget in perf-budgets.json. This keeps the public pages fast —
// a heavy new dependency that blows the budget is caught in CI, not in the field.
//
//   npm run build && npm run perf:budgets          # enforce (nonzero exit on breach)
//   node scripts/perf/check-budgets.mjs --warn     # report only, never fail
//   node scripts/perf/check-budgets.mjs --strict   # also fail if there is no build
//
// Pure pass/fail logic lives in ./budgets.mjs (unit-tested); this file only measures.
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateBudgets, summarize } from './budgets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const NEXT = join(root, '.next');
const argv = new Set(process.argv.slice(2));
const WARN = argv.has('--warn');
const STRICT = argv.has('--strict');

function loadBudgets() {
  const p = join(root, 'perf-budgets.json');
  try { return JSON.parse(readFileSync(p, 'utf8')); }
  catch { return { default: 250, routes: {} }; }
}

// Normalise an App Router manifest key ("/[locale]/admin/(panel)/x/page") to a route
// ("/[locale]/admin/x"): drop the trailing segment and any (route-group) segments.
function normalizeRoute(key) {
  let r = key.replace(/\/(page|route)$/, '');
  r = r.replace(/\/\([^)]*\)/g, '');
  return r === '' ? '/' : r;
}

// A budget is about the first-load JS a VISITOR downloads for a navigable page. Route
// handlers ship no client JS; layout/loading/error/template are fragments already
// counted inside their page entry; the framework specials aren't real pages. Skip
// them so the numbers mean what the budget says.
function isPageRoute(key, route) {
  if (!/\/page$/.test(key)) return false;                     // only page entries
  if (route.startsWith('/api')) return false;
  if (/\/(layout|loading|error|template|not-found)$/.test(route)) return false;
  if (['/_not-found', '/global-error', '/robots.txt', '/sitemap.xml'].includes(route)) return false;
  return true;
}

function fileKB(rel) {
  try { return statSync(join(NEXT, rel)).size / 1024; } catch { return 0; }
}

function measure() {
  // App Router first: .next/app-build-manifest.json → { pages: { key: [files] } }.
  const appManifest = join(NEXT, 'app-build-manifest.json');
  const pagesManifest = join(NEXT, 'build-manifest.json');
  const sizes = {};
  if (existsSync(appManifest)) {
    const m = JSON.parse(readFileSync(appManifest, 'utf8'));
    for (const [key, files] of Object.entries(m.pages || {})) {
      const route = normalizeRoute(key);
      if (!isPageRoute(key, route)) continue; // navigable pages only
      const uniq = Array.from(new Set(files.filter((f) => f.endsWith('.js'))));
      const kb = uniq.reduce((s, f) => s + fileKB(f), 0);
      sizes[route] = Math.max(sizes[route] || 0, kb); // keep the heaviest variant of a route
    }
  } else if (existsSync(pagesManifest)) {
    const m = JSON.parse(readFileSync(pagesManifest, 'utf8'));
    for (const [key, files] of Object.entries(m.pages || {})) {
      const uniq = Array.from(new Set(files.filter((f) => f.endsWith('.js'))));
      sizes[key] = uniq.reduce((s, f) => s + fileKB(f), 0);
    }
  }
  return sizes;
}

if (!existsSync(NEXT)) {
  console.log('perf:budgets — no .next build found. Run `npm run build` first.');
  process.exit(STRICT ? 1 : 0);
}

const budgets = loadBudgets();
const sizes = measure();
if (Object.keys(sizes).length === 0) {
  console.log('perf:budgets — could not read a build manifest from .next. Skipping.');
  process.exit(STRICT ? 1 : 0);
}

const results = evaluateBudgets(sizes, budgets);
const sum = summarize(results);
const pad = (s, n) => String(s).padEnd(n);
console.log(`\nFirst-load JS budget (KB) — ${sum.ok}/${sum.total} within budget\n`);
console.log(`${pad('route', 44)} ${pad('size', 8)} ${pad('budget', 8)} status`);
for (const r of results.sort((a, b) => b.sizeKB - a.sizeKB)) {
  const status = !Number.isFinite(r.budgetKB) ? '—' : r.over ? `OVER +${r.overBy}` : 'ok';
  console.log(`${pad(r.route, 44)} ${pad(r.sizeKB, 8)} ${pad(Number.isFinite(r.budgetKB) ? r.budgetKB : '—', 8)} ${status}`);
}
if (sum.over > 0) {
  console.log(`\n✗ ${sum.over} route(s) over budget.`);
  process.exit(WARN ? 0 : 1);
}
console.log('\n✓ all routes within budget.');
process.exit(0);
