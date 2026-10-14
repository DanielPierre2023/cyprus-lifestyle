#!/usr/bin/env node
// Writes the Leptos SQL files (supabase/data/20261014-5x-leptos-*.sql) from lib/partners (the same data the page uses).
//   node scripts/leptos-sql.mjs            write the files
//   node scripts/leptos-sql.mjs --check    exit 1 if the committed files differ from the data (the test does the same)
import { build } from 'esbuild';
import { mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'node_modules', '.cache', 'leptos-sql');
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
const outfile = join(out, 'gen.mjs');
await build({
  entryPoints: [join(root, 'lib/partners/leptos.sql.ts')], bundle: true, platform: 'node', format: 'esm', outfile,
  tsconfig: join(root, 'tsconfig.json'), logLevel: 'error',
});
const { leptosSqlFiles } = await import(pathToFileURL(outfile).href);
const files = leptosSqlFiles();
const dir = join(root, 'supabase', 'data');
let diff = 0;
for (const [name, sql] of Object.entries(files)) {
  const p = join(dir, name);
  if (process.argv.includes('--check')) {
    if (!existsSync(p) || readFileSync(p, 'utf8') !== sql) { console.log(`✗ ${name} differs`); diff++; }
  } else { writeFileSync(p, sql); console.log(`wrote ${name} (${sql.length} bytes)`); }
}
if (process.argv.includes('--check')) { console.log(diff ? `✗ ${diff} file(s) differ` : '✓ all Leptos SQL files match the data'); process.exit(diff ? 1 : 0); }
