#!/usr/bin/env node
// scripts/check-secrets.mjs — fails the build if a credential-looking string is committed.
// Scans the files git tracks (or, with --all, every text file outside node_modules/.git/.next).
// Patterns are deliberately high-precision (vendor key prefixes, JWTs, secrets passed in a URL)
// so a hit is almost certainly real. Placeholders such as <ENRICH_SECRET>, $ENRICH_SECRET,
// YOUR_… or PASTE_… are ignored.
//
//   node scripts/check-secrets.mjs          # CI
//   node scripts/check-secrets.mjs --all    # also untracked files (before first commit)
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { scanText } from './lib/secrets.mjs';

const ALL = process.argv.includes('--all');
const SKIP_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.pdf', '.zip', '.mp4', '.svg', '.lock']);
const SKIP_FILE = /(^|\/)(package-lock\.json|scripts\/check-secrets\.mjs|scripts\/tests\/secret-scan\.test\.ts)$/;

function listFiles() {
  if (!ALL) {
    return execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 1 << 26 }).split('\0').filter(Boolean);
  }
  const out = [];
  const walk = (d) => {
    for (const e of readdirSync(d)) {
      if (['node_modules', '.git', '.next', 'out'].includes(e)) continue;
      const p = join(d, e);
      const st = statSync(p);
      if (st.isDirectory()) walk(p); else out.push(p);
    }
  };
  walk('.');
  return out.map((p) => p.replace(/^\.\//, ''));
}

{
  let bad = 0, scanned = 0;
  for (const f of listFiles()) {
    if (SKIP_EXT.has(extname(f).toLowerCase()) || SKIP_FILE.test(f)) continue;
    let text;
    try { if (statSync(f).size > 2_000_000) continue; text = readFileSync(f, 'utf8'); } catch { continue; }
    scanned++;
    for (const h of scanText(text)) { bad++; console.log(`✗ ${f}:${h.line}  ${h.rule}  ${h.sample}`); }
  }
  console.log(bad ? `\n✗ ${bad} possible secret(s) in ${scanned} files. Rotate anything real, then remove it from the file.` : `✓ no credential-looking strings in ${scanned} files`);
  process.exit(bad ? 1 : 0);
}
