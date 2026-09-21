// lib/jobs.ts — the durable background-job layer (roadmap item 01).
// A tiny, dependency-light API over the Postgres job_queue (migration 0086):
//   • enqueue(kind, payload, opts)   — add work (dedupe-aware, schedulable)
//   • registerJob(kind, handler)     — teach the worker how to run a kind
//   • runWorker(opts)                — drain due jobs, retry/backoff, dead-letter
// The worker is called by /api/cron/worker, which Supabase pg_cron + pg_net hit
// every few minutes (free) — lifting the single-daily-cron ceiling. A handler that
// throws is retried with exponential backoff and finally dead-lettered; success is
// marked done. Everything is best-effort logged and never crashes the drain loop.
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logServerError } from '@/lib/monitor.server';

export interface JobRow {
  id: string; kind: string; payload: Record<string, unknown>;
  attempts: number; max_attempts: number; priority: number;
}
export type JobHandler = (payload: Record<string, unknown>, job: JobRow) => Promise<void>;

export interface EnqueueOpts {
  runAfter?: Date; priority?: number; maxAttempts?: number; dedupeKey?: string;
}

// Add a job. Returns its id (or the existing live job's id when a dedupeKey matches).
export async function enqueue(kind: string, payload: Record<string, unknown> = {}, opts: EnqueueOpts = {}): Promise<string | null> {
  try {
    const { data, error } = await supabaseAdmin().rpc('job_enqueue', {
      p_kind: kind,
      p_payload: payload,
      p_run_after: (opts.runAfter || new Date()).toISOString(),
      p_priority: opts.priority ?? 0,
      p_max_attempts: opts.maxAttempts ?? 5,
      p_dedupe_key: opts.dedupeKey ?? null,
    });
    if (error) throw new Error(error.message);
    return (data as string) || null;
  } catch (e) {
    await logServerError('jobs:enqueue', e, { kind });
    return null;
  }
}

// ── Handler registry ──────────────────────────────────────────────────────────
const handlers: Record<string, JobHandler> = {
  // Heartbeat / connectivity check — safe to schedule; proves the whole pipe.
  noop: async () => { /* no-op */ },
  // Housekeeping — prune old finished jobs and old error rows. Self-contained.
  housekeeping: async () => {
    const sb = supabaseAdmin();
    try { await sb.rpc('job_prune', { p_keep: '7 days' }); } catch { /* ignore */ }
    try { await sb.rpc('prune_error_log'); } catch { /* ignore */ }
  },
};

// Register a handler for a job kind. Later roadmap items call this at module load
// (side-effect import from the worker route) to add real work — e.g.
//   registerJob('enrich_listing', async (p) => { ... })
export function registerJob(kind: string, fn: JobHandler): void { handlers[kind] = fn; }
export function registeredKinds(): string[] { return Object.keys(handlers); }

export interface WorkerSummary {
  worker: string; claimed: number; done: number; failed: number; kinds: Record<string, number>;
}

// Drain due jobs until the queue is empty or the time budget is spent. Called by
// /api/cron/worker. Safe to run concurrently (job_dequeue uses FOR UPDATE SKIP LOCKED).
export async function runWorker(opts: { worker?: string; batch?: number; deadlineMs?: number } = {}): Promise<WorkerSummary> {
  const sb = supabaseAdmin();
  const worker = opts.worker || `w-${Math.random().toString(36).slice(2, 8)}`;
  const deadline = Date.now() + (opts.deadlineMs ?? 50_000);
  const summary: WorkerSummary = { worker, claimed: 0, done: 0, failed: 0, kinds: {} };

  // Recover jobs abandoned by a crashed worker.
  try { await sb.rpc('job_reap_stuck', { p_timeout: '5 minutes' }); } catch { /* ignore */ }

  while (Date.now() < deadline) {
    let jobs: JobRow[] = [];
    try {
      const { data, error } = await sb.rpc('job_dequeue', { p_worker: worker, p_limit: opts.batch ?? 5 });
      if (error) throw new Error(error.message);
      jobs = (data as JobRow[]) || [];
    } catch (e) {
      await logServerError('jobs:dequeue', e, { worker });
      break;
    }
    if (jobs.length === 0) break; // queue drained

    for (const job of jobs) {
      summary.claimed++;
      summary.kinds[job.kind] = (summary.kinds[job.kind] || 0) + 1;
      try {
        const fn = handlers[job.kind];
        if (!fn) throw new Error(`no handler registered for kind "${job.kind}"`);
        await fn(job.payload || {}, job);
        await supabaseAdmin().rpc('job_complete', { p_id: job.id });
        summary.done++;
      } catch (e) {
        try { await supabaseAdmin().rpc('job_fail', { p_id: job.id, p_error: (e as Error).message }); } catch { /* ignore */ }
        summary.failed++;
        await logServerError('jobs:handler', e, { kind: job.kind, jobId: job.id });
      }
      if (Date.now() >= deadline) break;
    }
  }
  return summary;
}
