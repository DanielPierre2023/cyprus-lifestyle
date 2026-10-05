#!/usr/bin/env node
// Read-only coverage report across the three code-side translation layers, one table per layer:
//   1. messages/*.json         (keys, empty, placeholder mismatch, values identical to EN = suspected untranslated)
//   2. inline TS dictionaries  (delegates to scripts/check-i18n-dicts.mjs --report)
//   3. knowledge base overlay  (lib/knowledge/qa.i18n.ts vs the English intents in qa.ts)
// DB coverage (blog_posts, directory_listings, events) is measured with SQL, see docs/I18N.md.
// No network, no AI, no writes. Usage: node scripts/i18n-report.mjs
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const root = process.cwd();
const LOC = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
const flat = (o, p = '', out = {}) => {
  if (Array.isArray(o)) o.forEach((v, i) => flat(v, `${p}[${i}]`, out));
  else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) flat(v, p ? `${p}.${k}` : k, out);
  else out[p] = o;
  return out;
};
const ph = (s) => (String(s).match(/\{[^}]+\}/g) || []).sort().join('|');
const msgs = Object.fromEntries(LOC.map((l) => [l, flat(JSON.parse(readFileSync(join(root, 'messages', `${l}.json`), 'utf8')))]));
console.log(`## 1. messages/*.json (${Object.keys(msgs.en).length} EN keys)\nlocale | missing | extra | empty | placeholder mismatch | identical to EN (4+ letters)`);
for (const l of LOC) {
  let missing = 0, extra = 0, empty = 0, bad = 0, same = 0;
  for (const k of Object.keys(msgs.en)) if (!(k in msgs[l])) missing++;
  for (const [k, v] of Object.entries(msgs[l])) {
    if (!(k in msgs.en)) extra++;
    if (typeof v === 'string' && v.trim() === '') empty++;
    if (k in msgs.en && ph(v) !== ph(msgs.en[k])) bad++;
    if (l !== 'en' && typeof v === 'string' && v === msgs.en[k] && /\p{L}{4,}/u.test(v)) same++;
  }
  console.log(`${l} | ${missing} | ${extra} | ${empty} | ${bad} | ${l === 'en' ? '-' : same}`);
}

console.log('\n## 2. inline TS dictionaries');
const r = spawnSync(process.execPath, [join(root, 'scripts', 'check-i18n-dicts.mjs'), '--report'], { encoding: 'utf8' });
console.log(r.stdout.trim());

console.log('\n## 3. knowledge base (intents translated per locale)');
try {
  const out = join(root, 'node_modules', '.cache', 'i18n-report'); mkdirSync(out, { recursive: true });
  const entry = join(out, 'kb-entry.ts');
  (await import('node:fs')).writeFileSync(entry, `import { ALL_INTENTS, QA_DOMAINS } from '${join(root, 'lib/knowledge/qa').replace(/\\/g, '/')}';\nimport { INTENT_I18N, DOMAIN_I18N } from '${join(root, 'lib/knowledge/qa.i18n').replace(/\\/g, '/')}';\nexport const data = { ids: ALL_INTENTS.map((h) => h.item.id), domains: QA_DOMAINS.map((d) => d.id), INTENT_I18N, DOMAIN_I18N };\n`);
  const outfile = join(out, 'kb.mjs');
  await build({ entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile, logLevel: 'silent', tsconfig: join(root, 'tsconfig.json'), alias: { 'server-only': join(root, 'scripts/tests/_stubs/server-only.js') } });
  const { data } = await import(outfile + '?t=' + Date.now());
  console.log(`intents: ${data.ids.length}, domains: ${data.domains.length}\nlocale | intents translated | untranslated | domains translated`);
  for (const l of LOC.filter((x) => x !== 'en')) {
    const t = data.ids.filter((id) => data.INTENT_I18N[id]?.[l]).length;
    const d = data.domains.filter((id) => data.DOMAIN_I18N[id]?.[l]).length;
    console.log(`${l} | ${t}/${data.ids.length} | ${data.ids.length - t} | ${d}/${data.domains.length}`);
  }
} catch (e) { console.log('(knowledge-base coverage unavailable: ' + (e.message || e).slice(0, 120) + ')'); }
