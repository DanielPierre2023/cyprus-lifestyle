/* Cyprus Lifestyle — STUB-ENRICHMENT driver (CLI).
 *
 * Drains the hollow-"stub" directory backlog by driving the admin endpoint
 * /api/admin/enrich-stubs (GET = dry-run census + cost, POST = fill a batch). The
 * heavy lifting (grounded generation, validation, writes, the SEO gate) lives in
 * lib/directory/enrich.ts and runs server-side inside Next, where the service-role
 * client + CLAUDE_API_KEY are available. This script is a thin, dependency-free
 * HTTP loop, so it runs under plain `tsx` (the lib modules are `server-only` and
 * cannot be imported into a bare Node process).
 *
 * Why a driver and not a direct DB script: every bulk DB+LLM job in this repo is an
 * admin route (see app/api/admin/backfill-translations). This matches that pattern
 * and reuses its auth, batching and timeout handling.
 *
 * ── Setup ────────────────────────────────────────────────────────────────────
 *   The target server must be running (next dev, or your deployed instance) and
 *   have SUPABASE_SERVICE_ROLE_KEY + CLAUDE_API_KEY configured. Auth uses an admin
 *   bearer secret: set ENRICH_STUBS_SECRET (or CRON_SECRET) on BOTH the server and
 *   here (this script reads .env.local / .env automatically on Node ≥ 20.12).
 *
 *   ENRICH_BASE_URL     where the app is running   (default http://localhost:3000)
 *   ENRICH_STUBS_SECRET admin bearer secret        (falls back to CRON_SECRET)
 *
 * ── Usage ────────────────────────────────────────────────────────────────────
 *   npx tsx scripts/enrich-stubs.ts                 # DRY RUN: census + cost (default, safe)
 *   npx tsx scripts/enrich-stubs.ts --run           # fill ONE batch (default limit 10)
 *   npx tsx scripts/enrich-stubs.ts --run --all     # loop batches until the backlog is clear
 *   npx tsx scripts/enrich-stubs.ts --run --all --limit 25 --concurrency 6
 *   npx tsx scripts/enrich-stubs.ts --run --all --translate   # also fill the 6 other editions
 *   npx tsx scripts/enrich-stubs.ts --base-url https://cypruslifestyle.eu --secret XXXX --run --all
 *
 * Idempotent + resumable: re-running only touches rows still hollow. Safe to Ctrl-C.
 */

// Load .env.local then .env if present (Node ≥ 20.12). No-op / tolerant otherwise.
try {
  const load = (process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile;
  if (typeof load === 'function') { try { load('.env.local'); } catch { /* */ } try { load('.env'); } catch { /* */ } }
} catch { /* dotenv optional */ }

type Flags = {
  run: boolean; all: boolean; dryRun: boolean; translate: boolean;
  limit: number; concurrency: number; batches: number;
  baseUrl: string; secret: string; model?: string;
};

function parseArgs(argv: string[]): Flags {
  const f: Flags = {
    run: false, all: false, dryRun: true, translate: false,
    limit: 10, concurrency: 4, batches: 1,
    baseUrl: (process.env.ENRICH_BASE_URL || 'http://localhost:3000').replace(/\/+$/, ''),
    secret: process.env.ENRICH_STUBS_SECRET || process.env.CRON_SECRET || '',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const val = () => argv[++i];
    if (a === '--run') { f.run = true; f.dryRun = false; }
    else if (a === '--dry-run') { f.run = false; f.dryRun = true; }
    else if (a === '--all') { f.all = true; }
    else if (a === '--translate') { f.translate = true; }
    else if (a === '--limit') f.limit = Math.max(1, Number(val()) || 10);
    else if (a === '--concurrency') f.concurrency = Math.max(1, Number(val()) || 4);
    else if (a === '--batches') f.batches = Math.max(1, Number(val()) || 1);
    else if (a === '--model') f.model = val();
    else if (a === '--base-url') f.baseUrl = String(val()).replace(/\/+$/, '');
    else if (a === '--secret') f.secret = String(val());
    else if (a === '--help' || a === '-h') { printHelp(); process.exit(0); }
  }
  if (f.all && f.batches === 1) f.batches = Infinity;
  return f;
}

function printHelp(): void {
  console.log(`
  enrich-stubs — fill hollow directory "stub" descriptions (grounded).

  npx tsx scripts/enrich-stubs.ts [--run] [--all] [options]

    (no flags)        DRY RUN — print the stub census + cost estimate, write nothing
    --run             fill one batch (default) ; --all loops until the backlog clears
    --limit N         rows per batch        (default 10)
    --concurrency N   parallel model calls  (default 4)
    --batches N       number of batches     (default 1 ; --all = unlimited)
    --translate       also fill el/ro/ar/de/pl/ru (faithful translation of the EN blurb)
    --model ID        override the model    (default: the server's Haiku default)
    --base-url URL    app URL               (env ENRICH_BASE_URL, default localhost:3000)
    --secret TOKEN    admin bearer          (env ENRICH_STUBS_SECRET / CRON_SECRET)
  `);
}

const ENDPOINT = (base: string) => `${base}/api/admin/enrich-stubs`;

async function req(method: 'GET' | 'POST', f: Flags, body?: unknown): Promise<any> {
  const res = await fetch(ENDPOINT(f.baseUrl), {
    method,
    headers: {
      'content-type': 'application/json',
      ...(f.secret ? { authorization: `Bearer ${f.secret}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json: any; try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText} — ${json?.error || text.slice(0, 200)}`);
  }
  return json;
}

async function main(): Promise<void> {
  const f = parseArgs(process.argv.slice(2));
  console.log(`\n  enrich-stubs → ${f.baseUrl}${f.secret ? '' : '  (no secret set — relying on an admin session)'}`);

  // Always show the census first.
  let census: any;
  try {
    census = await req('GET', f);
  } catch (e) {
    console.error(`\n  ✗ Could not reach the endpoint: ${(e as Error).message}`);
    console.error('    Is the server running, and is ENRICH_STUBS_SECRET set on both sides?\n');
    process.exit(1);
  }
  console.log(`\n  Published scanned : ${census.published_scanned}`);
  console.log(`  Stubs remaining   : ${census.stubs}`);
  console.log(`  Owner-verified    : ${census.owner_verified_skipped} (skipped)`);
  console.log(`  Already generated : ${census.already_generated}`);
  const top = Object.entries(census.by_type || {}).sort((a: any, b: any) => b[1] - a[1]).slice(0, 10);
  if (top.length) console.log('  By type           : ' + top.map(([k, v]) => `${k}:${v}`).join('  '));
  const cost = census.cost_estimate_usd || {};
  console.log(`  Est. cost (EN)    : ~$${cost.english_only}  |  with translation: ~$${cost.with_translation}`);

  if (!f.run) {
    console.log('\n  Dry run only. Re-run with --run (one batch) or --run --all (drain).\n');
    return;
  }

  console.log(`\n  Filling: limit ${f.limit}/batch, concurrency ${f.concurrency}${f.translate ? ', +translation' : ''}${f.batches === Infinity ? ', until clear' : `, ${f.batches} batch(es)`}\n`);
  let totalGen = 0, totalReview = 0, totalErr = 0, totalUsd = 0, n = 0;
  for (; n < f.batches; n++) {
    const r = await req('POST', f, {
      limit: f.limit, concurrency: f.concurrency, translate: f.translate, model: f.model,
    });
    totalGen += r.generated || 0; totalReview += r.review || 0; totalErr += r.errors || 0; totalUsd += r.usd || 0;
    console.log(`  batch ${n + 1}: generated ${r.generated}, review ${r.review}, errors ${r.errors}, $${(r.usd || 0).toFixed(4)}` +
      (r.translated ? `, +${r.translated} translations` : ''));
    // Stop when a batch produced no forward progress (backlog drained or all failing).
    if ((r.generated || 0) + (r.review || 0) + (r.errors || 0) === 0) { console.log('  (no candidates left)'); break; }
    if ((r.candidates || 0) < f.limit && n + 1 < f.batches) {
      // Last partial batch processed — nothing more to fetch.
      if ((r.candidates || 0) === 0) break;
    }
  }
  console.log(`\n  Done ${n + (n < f.batches ? 1 : 0)} batch(es): generated ${totalGen}, review ${totalReview}, errors ${totalErr}, spend ~$${totalUsd.toFixed(4)}`);
  console.log('  Re-run the same command to continue if stubs remain (idempotent).\n');
}

main().catch((e) => { console.error('\n  ✗', (e as Error).message, '\n'); process.exit(1); });
