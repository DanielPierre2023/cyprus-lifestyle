#!/usr/bin/env node
// scripts/build-edge-journalism.mjs — builds the generated edge functions (process-scraped-article, ai-editorial) from
// scripts/edge/*.src.ts and the shared modules of lib/journalism and lib/voice (see scripts/lib/edge-build.mjs).
//
//   node scripts/build-edge-journalism.mjs            writes the files
//   node scripts/build-edge-journalism.mjs --check    exits 1 if a committed file is not what the sources produce
//   node scripts/build-edge-journalism.mjs <name>     only that function
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEdgeFunction, FUNCTIONS } from './lib/edge-build.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const only = process.argv.slice(2).find((a) => !a.startsWith('--'));
const targets = only ? FUNCTIONS.filter((f) => f.name === only) : FUNCTIONS;
if (!targets.length) { console.error(`unknown function "${only}" (known: ${FUNCTIONS.map((f) => f.name).join(', ')})`); process.exit(2); }

let stale = 0;
for (const fn of targets) {
  const text = await buildEdgeFunction({ root: ROOT, name: fn.name });
  const target = join(ROOT, fn.out);
  if (process.argv.includes('--check')) {
    let current = '';
    try { current = readFileSync(target, 'utf8'); } catch { /* missing */ }
    if (current !== text) { console.error(`${fn.out} is out of date: run "node scripts/build-edge-journalism.mjs"`); stale++; }
    else console.log(`${fn.out} is up to date (${text.length} bytes)`);
  } else {
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, text);
    console.log(`wrote ${fn.out}: ${text.length} bytes, ${text.split('\n').length} lines`);
  }
}
if (stale) process.exit(1);
