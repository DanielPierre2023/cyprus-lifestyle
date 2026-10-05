#!/usr/bin/env node
// scripts/check-migrations.mjs — CI gate for supabase/migrations (see scripts/lib/migrations.mjs).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { checkMigrations } from './lib/migrations.mjs';

const dir = join(process.cwd(), 'supabase', 'migrations');
const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort().map((name) => ({ name, sql: readFileSync(join(dir, name), 'utf8') }));
const problems = checkMigrations(files);
if (problems.length) { for (const p of problems) console.log('✗ ' + p); console.log(`\n✗ ${problems.length} migration problem(s) in ${files.length} files`); process.exit(1); }
console.log(`✓ ${files.length} migrations: names, unique versions, destructive-change and enum rules OK`);
