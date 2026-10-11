#!/usr/bin/env node
// Verifies messages/*.json parity: identical key sets across all locales, no empty
// values, identical {placeholders} per key. Exit 1 on any mismatch. Usage: node scripts/check-i18n-parity.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');
const files = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
const flat = (o, p = '', out = {}) => {
  if (Array.isArray(o)) o.forEach((v, i) => flat(v, `${p}[${i}]`, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) flat(v, p ? `${p}.${k}` : k, out);
  else out[p] = o;
  return out;
};
const data = Object.fromEntries(files.map((f) => [f.replace('.json', ''), flat(JSON.parse(readFileSync(join(dir, f), 'utf8')))]));
const locales = Object.keys(data);
const ref = 'en';
const refKeys = Object.keys(data[ref]);
const ph = (s) => (String(s).match(/\{[^}]+\}/g) || []).sort().join('|');
let bad = 0;
const fail = (m) => { bad++; console.error('✗ ' + m); };
for (const l of locales) {
  const keys = new Set(Object.keys(data[l]));
  for (const k of refKeys) if (!keys.has(k)) fail(`${l}: missing ${k}`);
  for (const k of keys) if (!(k in data[ref])) fail(`${l}: extra ${k}`);
  for (const [k, v] of Object.entries(data[l])) {
    if (typeof v === 'string' && v.trim() === '') fail(`${l}: empty ${k}`);
    if (k in data[ref] && typeof v === 'string' && ph(v) !== ph(data[ref][k])) fail(`${l}: placeholder mismatch ${k} (${ph(v)} vs ${ph(data[ref][k])})`);
  }
}
if (bad) { console.error(`\n${bad} problem(s)`); process.exit(1); }
console.log(`✓ i18n parity: ${locales.length} locales (${locales.join(', ')}), ${refKeys.length} keys each, no empty values, placeholders match`);
