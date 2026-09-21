#!/usr/bin/env node
// Unit-test runner for pure logic. Each *.test.ts is bundled on its own with
// esbuild (Node ESM), with server-only and the Supabase clients aliased to test
// stubs, then executed in a child process. A suite fails if it throws (the harness
// throws on any failed assertion) or exits non-zero. Exit code is non-zero if any
// suite fails — so CI gates on it.
import { build } from 'esbuild';
import { readdirSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../..');
const stubs = join(here, '_stubs');
const outdir = join(root, 'node_modules', '.cache', 'cl-tests');
rmSync(outdir, { recursive: true, force: true });
mkdirSync(outdir, { recursive: true });

const alias = {
  'server-only': join(stubs, 'server-only.js'),
  '@/lib/supabase/admin': join(stubs, 'supabase-admin.js'),
  '@/lib/supabase/server': join(stubs, 'supabase-server.js'),
};

const files = readdirSync(here).filter((f) => f.endsWith('.test.ts')).sort();
if (files.length === 0) { console.error('no *.test.ts found'); process.exit(1); }

let failed = 0;
for (const f of files) {
  const outfile = join(outdir, f.replace(/\.test\.ts$/, '.mjs'));
  try {
    await build({
      entryPoints: [join(here, f)],
      bundle: true, platform: 'node', format: 'esm',
      tsconfig: join(root, 'tsconfig.json'),
      alias, outfile, logLevel: 'silent',
    });
  } catch (e) {
    console.log(`✗ ${f}: bundle failed`);
    console.log(String(e).split('\n').slice(0, 8).join('\n'));
    failed++; continue;
  }
  const res = spawnSync(process.execPath, [outfile], { encoding: 'utf8' });
  process.stdout.write(res.stdout || '');
  if (res.status !== 0) { process.stdout.write(res.stderr || ''); failed++; }
}

console.log(`\n${failed === 0 ? '✓ all suites passed' : `✗ ${failed} suite(s) failed`} (${files.length} file(s))`);
process.exit(failed === 0 ? 0 : 1);
