#!/usr/bin/env node
// scripts/perf/loadtest.mjs — roadmap item 18: a zero-dependency load-test / latency
// probe for the key public routes. It fires GET requests at a base URL with a small
// pool of workers for a fixed duration and reports throughput, latency percentiles
// (p50/p90/p95/p99) and the error rate per route. GET-only and gentle by default, so
// it is safe to point at production for a quick health read; raise the knobs for a
// real soak test against a staging deploy. NOT run in CI (it needs a live server).
//
//   BASE_URL=https://cypruslifestyle.eu node scripts/perf/loadtest.mjs
//   BASE_URL=... CONCURRENCY=20 DURATION=30 node scripts/perf/loadtest.mjs
//
// Knobs (env): BASE_URL (required), CONCURRENCY (default 8), DURATION seconds
// (default 15), PATHS (comma-separated; defaults to a representative public set).
const BASE = (process.env.BASE_URL || '').replace(/\/$/, '');
if (!BASE) { console.error('Set BASE_URL, e.g. BASE_URL=https://cypruslifestyle.eu'); process.exit(1); }
const CONCURRENCY = Math.max(1, Number(process.env.CONCURRENCY || 8));
const DURATION = Math.max(1, Number(process.env.DURATION || 15));
const PATHS = (process.env.PATHS || '/en,/en/directory,/en/magazine,/en/best/limassol,/en/concierge,/en/advertise')
  .split(',').map((s) => s.trim()).filter(Boolean);

const samples = new Map(PATHS.map((p) => [p, { ok: 0, err: 0, ms: [] }]));
const pct = (arr, p) => {
  if (!arr.length) return 0;
  const a = [...arr].sort((x, y) => x - y);
  return Math.round(a[Math.min(a.length - 1, Math.floor((p / 100) * a.length))]);
};

async function hit(path) {
  const t0 = performance.now();
  try {
    const res = await fetch(BASE + path, { headers: { 'user-agent': 'cl-loadtest/1' }, redirect: 'manual' });
    // drain the body so timing includes transfer
    await res.arrayBuffer().catch(() => {});
    const dt = performance.now() - t0;
    const rec = samples.get(path);
    if (res.status >= 200 && res.status < 400) { rec.ok++; rec.ms.push(dt); }
    else rec.err++;
  } catch { samples.get(path).err++; }
}

async function worker(deadline) {
  let i = 0;
  while (performance.now() < deadline) { await hit(PATHS[i++ % PATHS.length]); }
}

const t0 = performance.now();
const deadline = t0 + DURATION * 1000;
console.log(`Load test → ${BASE}\n  ${CONCURRENCY} workers · ${DURATION}s · ${PATHS.length} route(s)\n`);
await Promise.all(Array.from({ length: CONCURRENCY }, () => worker(deadline)));
const wall = (performance.now() - t0) / 1000;

let totalOk = 0, totalErr = 0;
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('route', 26)} ${pad('ok', 6)} ${pad('err', 5)} ${pad('p50', 6)} ${pad('p90', 6)} ${pad('p95', 6)} ${pad('p99', 6)}`);
for (const [path, r] of samples) {
  totalOk += r.ok; totalErr += r.err;
  console.log(`${pad(path, 26)} ${pad(r.ok, 6)} ${pad(r.err, 5)} ${pad(pct(r.ms, 50), 6)} ${pad(pct(r.ms, 90), 6)} ${pad(pct(r.ms, 95), 6)} ${pad(pct(r.ms, 99), 6)}`);
}
const rps = Math.round((totalOk + totalErr) / wall);
const errPct = totalOk + totalErr ? Math.round((1000 * totalErr) / (totalOk + totalErr)) / 10 : 0;
console.log(`\n${totalOk} ok · ${totalErr} err (${errPct}%) · ${rps} req/s over ${wall.toFixed(1)}s`);
process.exit(0);
