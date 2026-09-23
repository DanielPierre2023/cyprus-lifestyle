// POST /api/admin/concierge/coverage/run — the concierge BREADTH baseline.
// Runs the retrieval-only coverage probe (lib/concierge/coverage.ts) across every
// topic in all seven languages and returns a scorecard: an overall coverage score,
// a per-topic and per-locale breakdown, and the worklist of blind/thin topics to
// fix next. It calls NO answer model and NO judge — only the same retrieval the
// concierge uses — so it is free of answer/judge cost and safe to run often.
// Admin only. Results are also persisted (concierge_coverage) so breadth is tracked
// over time and every later increment can be proven to have moved the numbers.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import {
  COVERAGE_PROBES, runCoverageProbe, persistCoverage, newCoverageRunId,
  overallCoverage, rollupByTopic, rollupByLocale, gaps,
} from '@/lib/concierge/coverage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  // Optional filters, so the probe can be narrowed (e.g. one language or a few topics)
  // while iterating; default is the full baseline.
  const topicFilter: string[] | null = Array.isArray(body.topics) && body.topics.length ? body.topics.map(String) : null;
  const localeFilter: string[] | null = Array.isArray(body.locales) && body.locales.length ? body.locales.map(String) : null;
  let probes = COVERAGE_PROBES;
  if (topicFilter) probes = probes.filter((p) => topicFilter.includes(p.topic));
  if (localeFilter) probes = probes.filter((p) => localeFilter.includes(p.locale));
  if (!probes.length) return NextResponse.json({ ok: false, error: 'No probes match the given filters' }, { status: 400 });

  const runId = newCoverageRunId();
  const results = await runCoverageProbe(probes, 5);
  await persistCoverage(runId, results);

  return NextResponse.json({
    ok: true,
    runId,
    overall: overallCoverage(results),
    byTopic: rollupByTopic(results),
    byLocale: rollupByLocale(results),
    gaps: gaps(results),
    note: 'Retrieval-only breadth probe (no answer/judge model). blind = nothing found; thin = an expected source empty; ok/strong = covered. Fix the gaps list first.',
  });
}
