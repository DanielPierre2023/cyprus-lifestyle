#!/usr/bin/env node
// CI gate for the INLINE TypeScript dictionaries (the second translation mechanism next to
// messages/*.json, which scripts/check-i18n-parity.mjs covers). Ratchet semantics: today's known gaps
// live in scripts/i18n-dicts-baseline.json; the build fails on any NEW or WORSE gap.
//   node scripts/check-i18n-dicts.mjs                    gate
//   node scripts/check-i18n-dicts.mjs --report           per-locale gap table + every gap, never fails
//   node scripts/check-i18n-dicts.mjs --update-baseline  rewrite the baseline (review the diff!)
import { readFileSync, readdirSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { scanSource, compareToBaseline, makeBaseline, summarise, isExempt } from './lib/i18nDicts.mjs';

const root = process.cwd();
const BASELINE = join(root, 'scripts', 'i18n-dicts-baseline.json');
const walk = (dir, out = []) => {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.next' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.tsx?$/.test(name) && !name.endsWith('.d.ts')) out.push(p);
  }
  return out;
};
const dicts = [];
for (const top of ['app', 'components', 'lib']) {
  if (!existsSync(join(root, top))) continue;
  for (const p of walk(join(root, top))) {
    const rel = relative(root, p).replace(/\\/g, '/');
    if (isExempt(rel)) continue;
    dicts.push(...scanSource(rel, readFileSync(p, 'utf8')));
  }
}
dicts.sort((a, b) => a.id.localeCompare(b.id));
const args = process.argv.slice(2);

if (args.includes('--update-baseline')) {
  writeFileSync(BASELINE, JSON.stringify(makeBaseline(dicts), null, 2) + '\n');
  console.log(`baseline written: ${Object.keys(makeBaseline(dicts)).length} dictionaries with known gaps (of ${dicts.length})`);
  process.exit(0);
}
if (args.includes('--report')) {
  console.log(`Inline dictionaries (non-admin): ${dicts.length}\n`);
  console.log('locale | dicts | missing locale | shape problems | strings identical to EN');
  for (const r of summarise(dicts)) console.log(`${r.locale} | ${r.dictionaries} | ${r.missing} | ${r.shapeProblems} | ${r.sameAsReference}`);
  console.log('\nDictionaries with gaps:');
  for (const d of dicts) if (d.missing.length || Object.keys(d.shape).length) console.log(`- ${d.id} (${d.file}:${d.line}) missing=[${d.missing}] shape=${JSON.stringify(Object.fromEntries(Object.entries(d.shape).map(([l, s]) => [l, Object.entries(s).filter(([, v]) => v.length).map(([k, v]) => `${k}:${v.length}`)])))}`);
  process.exit(0);
}
const baseline = existsSync(BASELINE) ? JSON.parse(readFileSync(BASELINE, 'utf8')) : {};
const { problems, improvable } = compareToBaseline(dicts, baseline);
for (const i of improvable) console.log('· ' + i);
if (problems.length) {
  for (const p of problems) console.error('✗ ' + p);
  console.error(`\n${problems.length} new i18n dictionary problem(s). Add the missing locale(s), or (only for a deliberate exemption) run: node scripts/check-i18n-dicts.mjs --update-baseline`);
  process.exit(1);
}
console.log(`✓ i18n dictionaries: ${dicts.length} inline locale dictionaries scanned, no new gaps (${Object.keys(baseline).length} known gaps in baseline)`);
