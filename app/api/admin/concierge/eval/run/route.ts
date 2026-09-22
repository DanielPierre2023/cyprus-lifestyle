// POST /api/admin/concierge/eval/run — roadmap item 14. Runs live-model concierge
// quality evals ON DEMAND (admin only). Two modes:
//   • sample (default) — a small spread across languages, run SYNCHRONOUSLY, so the
//     operator gets scores back in the response (stays within the serverless budget).
//   • full — enqueues the whole eval set as a chunked background job (drained by the
//     worker / pg_cron); results appear under the run id when done.
// Every run costs model calls (an answer + a judge per item), so this is never
// auto-scheduled — it only runs when a human clicks. Gated by an admin session.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { enqueue } from '@/lib/jobs';
import { EVAL_SET, sampleEvalSet, runEvalBatch, newRunId } from '@/lib/concierge/eval';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap — the sample mode is sized to fit.

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const mode = body.mode === 'full' ? 'full' : 'sample';

  if (mode === 'full') {
    const runId = newRunId('full');
    const id = await enqueue('eval_concierge', { runId, offset: 0, limit: 6 }, { dedupeKey: `eval:${runId}:0`, priority: 2, maxAttempts: 2 });
    return NextResponse.json({
      ok: true, mode, runId, total: EVAL_SET.length, queued: !!id,
      note: 'The full eval runs in the background via the job worker; results appear under this run id when it finishes.',
    });
  }

  // Sample: keep it small so the synchronous run finishes inside the time budget.
  const n = Math.max(1, Math.min(Number(body.n || 4), 8));
  const runId = newRunId('sample');
  const items = sampleEvalSet(n);
  const summary = await runEvalBatch(items, runId);
  return NextResponse.json({ ok: true, mode, ...summary });
}
