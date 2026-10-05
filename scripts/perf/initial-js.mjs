#!/usr/bin/env node
// scripts/perf/initial-js.mjs - the JS a visitor really downloads on first load of a page:
// the page entry PLUS every ancestor layout's chunks (union, de-duplicated), raw and gzipped.
// Why a second measurement: check-budgets.mjs (and Next's own "First Load JS" column) read only
// the page entry, so code that lives in a layout - e.g. the concierge widget that used to sit in
// the (site) layout - was invisible to every budget.
//   node scripts/perf/initial-js.mjs                  # report public pages
//   node scripts/perf/initial-js.mjs --json           # machine-readable
//   node scripts/perf/initial-js.mjs --enforce        # fail if a public page is over perf-budgets.json initialJsGzKB
//   node scripts/perf/initial-js.mjs --max-gz 130     # or a flat ceiling for every page
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { evaluateBudgets } from './budgets.mjs';
import { chainKeys } from './preloads.mjs';

if (import.meta.url === `file://${process.argv[1]}`) {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const NEXT = join(root, '.next');
  const argv = process.argv.slice(2);
  const maxGz = argv.includes('--max-gz') ? Number(argv[argv.indexOf('--max-gz') + 1]) : null;
  if (!existsSync(join(NEXT, 'app-build-manifest.json'))) { console.log('initial-js - no build found.'); process.exit(0); }
  const pages = JSON.parse(readFileSync(join(NEXT, 'app-build-manifest.json'), 'utf8')).pages;
  const keys = Object.keys(pages);
  const rows = [];
  for (const k of keys) {
    if (!/\/page$/.test(k) || k.startsWith('/api') || k.includes('/admin')) continue; // public pages only
    const files = new Set();
    for (const kk of chainKeys(k, keys)) for (const f of pages[kk]) if (f.endsWith('.js')) files.add(f);
    let raw = 0, gz = 0;
    for (const f of files) { try { const b = readFileSync(join(NEXT, f)); raw += b.length; gz += gzipSync(b).length; } catch { /* missing */ } }
    rows.push({ route: k.replace(/\/page$/, '').replace(/\/\([^)]*\)/g, '') || '/', rawKB: +(raw / 1024).toFixed(1), gzKB: +(gz / 1024).toFixed(1) });
  }
  rows.sort((a, b) => b.gzKB - a.gzKB);
  let cfg = {};
  try { cfg = JSON.parse(readFileSync(join(root, 'perf-budgets.json'), 'utf8')); } catch { /* none */ }
  if (argv.includes('--json')) console.log(JSON.stringify(rows, null, 1));
  else { console.log('route'.padEnd(40), 'raw KB'.padEnd(9), 'gzip KB'); rows.forEach((r) => console.log(r.route.padEnd(40), String(r.rawKB).padEnd(9), r.gzKB)); }
  if (argv.includes('--enforce')) {
    const verdict = evaluateBudgets(Object.fromEntries(rows.map((r) => [r.route, r.gzKB])), cfg.initialJsGzKB || {});
    const over = verdict.filter((v) => v.over);
    over.forEach((v) => console.log(`OVER ${v.route}: ${v.sizeKB} KB gz > ${v.budgetKB} (+${v.overBy})`));
    if (over.length) process.exit(1);
    console.log('\n✓ initial JS (gzip) within budget on all public pages.');
  }
  if (maxGz != null && rows.some((r) => r.gzKB > maxGz)) { console.log(`\n✗ a public page exceeds ${maxGz} KB gzip initial JS`); process.exit(1); }
}
