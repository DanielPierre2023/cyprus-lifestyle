// lib/concierge/orphans.ts
// ============================================================================
// Orphan-vector cleanup for the nightly embed job (app/api/concierge/embed-sources). Pure: the route
// injects the database.
//
// concierge_embeddings holds one vector per (source, ref) for articles, events and experiences. When the
// source item is unpublished, deleted or de-activated the vector used to stay behind, so the concierge's
// vector search could still surface it (the card is later dropped by the publish re-check, but the slot
// and the similarity budget are wasted). The job now deletes such rows:
//
//   • orphan = a stored (source, ref) that is NOT in the live set the same run just built from the
//     published / active rows (the exact set it would embed);
//   • BATCHED   — ≤ PRUNE_BATCH refs per DELETE, ≤ PRUNE_MAX_PER_RUN per run;
//   • TIME-BOXED — never starts a batch after PRUNE_BUDGET_MS from the start of the run;
//   • IDEMPOTENT — deleting what is already gone is a no-op; a second run finds nothing;
//   • SAFE      — the stored keys are read BEFORE the live set (a vector embedded meanwhile is never mistaken for
//                 an orphan), a source whose live set is empty while vectors exist is skipped (a failed/empty read
//                 must never wipe an index), as is a run that would delete more than half of a source's vectors
//                 (unless ?prune=force); ?prune=0 turns the step off; ?dry=1 only reports.
// ============================================================================
export type VectorSource = 'article' | 'event' | 'activity';
export const VECTOR_SOURCES: readonly VectorSource[] = ['article', 'event', 'activity'];
export const PRUNE_BATCH = 100;
export const PRUNE_MAX_PER_RUN = 2000;
export const PRUNE_BUDGET_MS = 12_000;

export interface StoredKey { source: string; ref: string; }

export interface PruneParams { enabled: boolean; mass: boolean; }
export function parsePruneParams(sp: URLSearchParams): PruneParams {
  const v = sp.get('prune');
  return { enabled: v !== '0', mass: v === 'force' };
}

export interface OrphanPlan {
  /** orphan refs per source that are safe to delete */
  orphans: Record<VectorSource, string[]>;
  /** sources skipped by a safety guard, with the reason */
  skipped: { source: VectorSource; reason: 'no-live-rows' | 'too-many'; orphans: number; stored: number }[];
  stored: Record<VectorSource, number>;
}

/** Which stored vectors have no live source item. `live` holds `${source}:${ref}` keys. */
export function planOrphans(stored: readonly StoredKey[], live: ReadonlySet<string>, opts: { mass?: boolean } = {}): OrphanPlan {
  const plan: OrphanPlan = { orphans: { article: [], event: [], activity: [] }, skipped: [], stored: { article: 0, event: 0, activity: 0 } };
  const liveCount: Record<VectorSource, number> = { article: 0, event: 0, activity: 0 };
  for (const k of live) { const s = k.slice(0, k.indexOf(':')) as VectorSource; if (s in liveCount) liveCount[s]++; }
  const found: Record<VectorSource, string[]> = { article: [], event: [], activity: [] };
  const seen = new Set<string>();
  for (const k of stored) {
    if (!(VECTOR_SOURCES as readonly string[]).includes(k.source)) continue; // never touch rows of another source
    const s = k.source as VectorSource; const key = `${s}:${k.ref}`;
    if (seen.has(key)) continue; seen.add(key);
    plan.stored[s]++;
    if (!live.has(key)) found[s].push(k.ref);
  }
  for (const s of VECTOR_SOURCES) {
    const n = found[s].length; if (!n) continue;
    if (liveCount[s] === 0) { plan.skipped.push({ source: s, reason: 'no-live-rows', orphans: n, stored: plan.stored[s] }); continue; }
    if (!opts.mass && plan.stored[s] >= 20 && n > plan.stored[s] / 2) { plan.skipped.push({ source: s, reason: 'too-many', orphans: n, stored: plan.stored[s] }); continue; }
    plan.orphans[s] = found[s].sort();
  }
  return plan;
}

export interface PruneDeps {
  /** delete the given refs of one source; resolves to an error message or null */
  deleteRefs(source: VectorSource, refs: string[]): Promise<string | null>;
  now(): number;
}
export interface PruneResult {
  found: number; deleted: number; remaining: number; batches: number;
  stoppedBy: 'budget' | 'cap' | 'error' | null; error?: string;
  skipped: OrphanPlan['skipped'];
  bySource: Record<VectorSource, number>;
}

/** Delete the planned orphans in batches, inside the time budget (`t0` = start of the whole run). */
export async function pruneOrphans(plan: OrphanPlan, deps: PruneDeps, t0: number, o: { budgetMs?: number; batch?: number; maxDeletes?: number } = {}): Promise<PruneResult> {
  const budget = o.budgetMs ?? PRUNE_BUDGET_MS; const batch = o.batch ?? PRUNE_BATCH; const cap = o.maxDeletes ?? PRUNE_MAX_PER_RUN;
  const found = VECTOR_SOURCES.reduce((n, s) => n + plan.orphans[s].length, 0);
  const res: PruneResult = { found, deleted: 0, remaining: found, batches: 0, stoppedBy: null, skipped: plan.skipped, bySource: { article: 0, event: 0, activity: 0 } };
  outer:
  for (const s of VECTOR_SOURCES) {
    let at = 0;
    while (at < plan.orphans[s].length) {
      if (deps.now() - t0 >= budget) { res.stoppedBy = 'budget'; break outer; }
      if (res.deleted >= cap) { res.stoppedBy = 'cap'; break outer; }
      const part = plan.orphans[s].slice(at, at + Math.min(batch, cap - res.deleted));
      const err = await deps.deleteRefs(s, part);
      res.batches++;
      if (err) { res.stoppedBy = 'error'; res.error = err; break outer; }
      at += part.length; res.deleted += part.length; res.bySource[s] += part.length;
    }
  }
  res.remaining = found - res.deleted;
  return res;
}
