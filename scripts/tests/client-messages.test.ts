// Guard for lib/i18n/clientMessages.ts: every namespace a client component reads with
// useTranslations('ns') must be in CLIENT_NAMESPACES, otherwise that text would be missing
// in the browser. Scans the real source tree.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { CLIENT_NAMESPACES, pickMessages } from '../../lib/i18n/clientMessages';
import { eq, ok, report } from './_harness';

const root = process.cwd();
const walk = (d: string): string[] => readdirSync(d).flatMap((n) => {
  if (n === 'node_modules' || n === '.next' || n.startsWith('.')) return [];
  const p = join(d, n);
  return statSync(p).isDirectory() ? walk(p) : /\.(tsx|ts)$/.test(n) ? [p] : [];
});

const used = new Set<string>();
let bare = 0;
for (const dir of ['app', 'components', 'lib']) {
  for (const f of walk(join(root, dir))) {
    const src = readFileSync(f, 'utf8');
    if (!/^\s*['"]use client['"]/.test(src.slice(0, 200))) continue;
    for (const m of src.matchAll(/useTranslations\(\s*(?:['"]([\w.]+)['"])?\s*\)/g)) {
      if (m[1]) used.add(m[1].split('.')[0]); else bare++;
    }
    if (/useMessages\(/.test(src)) bare++;
  }
}
const allowed = new Set<string>(CLIENT_NAMESPACES);
const missing = [...used].filter((ns) => !allowed.has(ns));
eq('every client-side namespace is shipped', missing, []);
eq('no client component reads the whole catalogue', bare, 0);
ok('found the known client namespaces', used.size >= 5);

// pickMessages
eq('pick keeps only listed', pickMessages({ a: 1, b: 2, c: 3 }, ['a', 'c']), { a: 1, c: 3 });
eq('pick ignores absent', pickMessages({ a: 1 }, ['a', 'zz']), { a: 1 });

// the catalogue really is smaller (all 7 locales)
for (const l of ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru']) {
  const m = JSON.parse(readFileSync(join(root, 'messages', `${l}.json`), 'utf8'));
  const full = JSON.stringify(m).length, picked = JSON.stringify(pickMessages(m, CLIENT_NAMESPACES)).length;
  ok(`${l}: client payload < 15% of catalogue`, picked < full * 0.15);
  ok(`${l}: all client namespaces exist`, CLIENT_NAMESPACES.every((ns) => ns in m));
}

report('client-messages');
