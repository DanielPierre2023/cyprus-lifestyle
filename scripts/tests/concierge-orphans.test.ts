// Orphan-vector cleanup of the nightly embed job (pure planner + pruner, fakes for the database).
import { readFileSync } from 'node:fs';
import { planOrphans, pruneOrphans, parsePruneParams, PRUNE_BATCH, type PruneDeps, type VectorSource } from '@/lib/concierge/orphans';
import { eq, ok, report } from './_harness';

const live = (keys: string[]) => new Set(keys);
const stored = (keys: string[]) => keys.map((k) => ({ source: k.split(':')[0], ref: k.slice(k.indexOf(':') + 1) }));

// planner
const p1 = planOrphans(stored(['article:a', 'article:gone', 'event:e1', 'event:e2-expired', 'activity:1', 'activity:2']), live(['article:a', 'event:e1', 'activity:1', 'activity:3']));
eq('orphans per source', p1.orphans, { article: ['gone'], event: ['e2-expired'], activity: ['2'] });
eq('nothing skipped', p1.skipped, []);
eq('stored counts', p1.stored, { article: 2, event: 2, activity: 2 });
eq('idempotent: after deleting, nothing left', planOrphans(stored(['article:a', 'event:e1', 'activity:1']), live(['article:a', 'event:e1', 'activity:1', 'activity:3'])).orphans, { article: [], event: [], activity: [] });
eq('rows of another source are never touched', planOrphans(stored(['kb:1', 'article:a']), live(['article:a'])).orphans, { article: [], event: [], activity: [] });
eq('duplicate stored keys counted once', planOrphans(stored(['article:x', 'article:x', 'article:a']), live(['article:a'])).orphans.article, ['x']);
const g1 = planOrphans(stored(['activity:1', 'activity:2', 'article:a']), live(['article:a']));
eq('guard: empty live set for a source while vectors exist → skipped, not wiped', [g1.orphans.activity, g1.skipped], [[], [{ source: 'activity', reason: 'no-live-rows', orphans: 2, stored: 2 }]]);
const many = Array.from({ length: 30 }, (_, i) => `event:e${i}`);
const g2 = planOrphans(stored(many), live(['event:e0', 'event:e1', 'event:e2']));
eq('guard: more than half of a source (≥ 20 stored) → skipped', [g2.orphans.event.length, g2.skipped[0]?.reason], [0, 'too-many']);
eq('?prune=force lifts the mass guard', planOrphans(stored(many), live(['event:e0']), { mass: true }).orphans.event.length, 29);
eq('small sets are not blocked by the ratio guard', planOrphans(stored(['event:a', 'event:b', 'event:c']), live(['event:a'])).orphans.event, ['b', 'c']);
eq('params', [parsePruneParams(new URLSearchParams('')), parsePruneParams(new URLSearchParams('prune=0')), parsePruneParams(new URLSearchParams('prune=force'))], [{ enabled: true, mass: false }, { enabled: false, mass: false }, { enabled: true, mass: true }]);

// pruner with a fake database
function fake(opts: { failAt?: number; clock?: () => number } = {}) {
  const calls: { source: VectorSource; refs: string[] }[] = [];
  let t = 0;
  const deps: PruneDeps = {
    now: opts.clock || (() => t),
    async deleteRefs(source, refs) { calls.push({ source, refs: [...refs] }); t += 100; return opts.failAt === calls.length ? 'boom' : null; },
  };
  return { deps, calls };
}
const big = planOrphans(stored([...Array.from({ length: 250 }, (_, i) => `article:r${String(i).padStart(3, '0')}`), 'article:keep', 'event:keep', 'activity:keep']), live(['article:keep', 'event:keep', 'activity:keep']), { mass: true });
(async () => {
  const f = fake();
  const r = await pruneOrphans(big, f.deps, 0);
  eq('batched (100 + 100 + 50)', f.calls.map((c) => c.refs.length), [100, 100, 50]);
  eq('result', [r.found, r.deleted, r.remaining, r.batches, r.stoppedBy], [250, 250, 0, 3, null]);
  ok('every orphan deleted exactly once', new Set(f.calls.flatMap((c) => c.refs)).size === 250 && !f.calls.some((c) => c.refs.includes('keep')));
  eq('batch constant', PRUNE_BATCH, 100);

  const fb = fake();
  const rb = await pruneOrphans(big, fb.deps, 0, { budgetMs: 150 });
  eq('time-boxed: stops starting batches past the budget', [fb.calls.length, rb.deleted, rb.remaining, rb.stoppedBy], [2, 200, 50, 'budget']);

  const fc = fake();
  const rc = await pruneOrphans(big, fc.deps, 0, { maxDeletes: 120 });
  eq('capped per run (batch trimmed to the cap)', [rc.deleted, rc.remaining, rc.stoppedBy, fc.calls.map((c) => c.refs.length)], [120, 130, 'cap', [100, 20]]);

  const fe = fake({ failAt: 2 });
  const re = await pruneOrphans(big, fe.deps, 0);
  eq('error stops the run and is reported (nothing thrown)', [re.deleted, re.stoppedBy, re.error], [100, 'error', 'boom']);

  const fn = fake();
  const rn = await pruneOrphans(planOrphans(stored(['article:a']), live(['article:a'])), fn.deps, 0);
  eq('nothing to do → no database call', [fn.calls.length, rn.found, rn.deleted], [0, 0, 0]);

  // second run over the same database = no-op (idempotent), simulated with a set
  const db = new Set(stored(['article:a', 'article:gone', 'event:old']).map((k) => `${k.source}:${k.ref}`));
  const run = async () => {
    const plan = planOrphans([...db].map((k) => ({ source: k.split(':')[0], ref: k.split(':')[1] })), live(['article:a', 'event:keep']), { mass: true });
    return pruneOrphans(plan, { now: () => 0, async deleteRefs(s, refs) { for (const x of refs) db.delete(`${s}:${x}`); return null; } }, 0);
  };
  const first = await run(); const second = await run();
  eq('idempotent across runs', [first.deleted, second.deleted, [...db]], [2, 0, ['article:a']]);

  // route wiring (source level)
  const route = readFileSync('app/api/concierge/embed-sources/route.ts', 'utf8');
  ok('route: prune step wired, reports under `prune`, honours dry + ?prune', route.includes('pruneStep') && route.includes('prune: pruned') && route.includes('parsePruneParams') && route.includes("delete().eq('source', source).in('ref', refs)"));
  ok('route: stored keys are read before the live rows', route.indexOf("from('concierge_embeddings').select('source,ref,content_hash')") < route.indexOf('await loadDocs()'));
  report('concierge-orphans');
})();
