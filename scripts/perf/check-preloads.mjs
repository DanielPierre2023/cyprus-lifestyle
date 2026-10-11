#!/usr/bin/env node
// After `next build`: measure what each locale's home page PRELOADS (fonts) and how heavy its
// HTML is, against perf-budgets.json { fonts: { preloadKB }, html: { maxKB } }.
//   node scripts/perf/check-preloads.mjs            # enforce
//   node scripts/perf/check-preloads.mjs --warn     # report only
import { readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { preloadedFontHrefs, evaluatePage } from './preloads.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const NEXT = join(root, '.next');
const WARN = process.argv.includes('--warn');
if (!existsSync(NEXT)) { console.log('perf:preloads - no .next build found. Run `npm run build` first.'); process.exit(0); }

let cfg = {};
try { cfg = JSON.parse(readFileSync(join(root, 'perf-budgets.json'), 'utf8')); } catch { /* defaults */ }

const kb = (n) => n / 1024;
let bad = 0;
console.log('\npage            fonts preloaded (KB)   html (KB)');
for (const loc of ['en', 'ar', 'ru', 'pl', 'el']) {
  const f = join(NEXT, 'server', 'app', `${loc}.html`);
  if (!existsSync(f)) continue;
  const html = readFileSync(f, 'utf8');
  let fontBytes = 0;
  for (const href of preloadedFontHrefs(html)) {
    // /_next/static/media/... lives in .next; self-hosted /fonts/... (Greek, /el only) lives in public/.
    const p = href.startsWith('/fonts/') ? join(root, 'public', href) : join(NEXT, href.replace(/^\/_next\//, ''));
    try { fontBytes += statSync(p).size; } catch { /* missing file */ }
  }
  const r = evaluatePage(`/${loc}`, { fontKB: kb(fontBytes), htmlKB: kb(Buffer.byteLength(html)) }, cfg);
  console.log(`${r.page.padEnd(15)} ${String(r.fontKB).padEnd(6)} / ${String(r.fontMax).padEnd(14)} ${r.htmlKB} / ${r.htmlMax}${r.fontOver || r.htmlOver ? '   OVER' : ''}`);
  if (r.fontOver || r.htmlOver) bad++;
}
if (bad) { console.log(`\n✗ ${bad} page(s) over the preload/HTML budget.`); process.exit(WARN ? 0 : 1); }
console.log('\n✓ preload + HTML budgets met.');
