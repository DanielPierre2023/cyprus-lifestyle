// GET|POST /api/editorial/plan/run?key=<ENRICH_SECRET>
//   [&section=<subcategory-key>]  plan just one subcategory
//   [&month=1..12]               plan for a specific month (default: current)
//   [&web=0]                     force web search off for this run (default: the setting)
//   [&max=N]                     hard cap on ideas created this run
//   [&dryRun=1]                  generate + report, write nothing
//
// The AI Editorial Planner: reads the accountability gaps and, grounded on the
// season, live web research and the directory's own businesses, queues fresh,
// non-redundant article ideas (status 'suggested') for the editor to approve.
// Key-gated exactly like the concierge enrichment routes. Safe to call repeatedly
// (each call covers a few sections; it reports remainingGaps).
import { NextRequest, NextResponse } from 'next/server';
import { denyReason } from '@/lib/editorial/gate';
import { runPlanner } from '@/lib/editorial/plan';

export const runtime = 'nodejs';
export const maxDuration = 60;

async function run(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const monthRaw = Number(p.get('month'));
  const maxRaw = Number(p.get('max'));
  return runPlanner({
    sectionKey: p.get('section') || null,
    monthIndex: Number.isFinite(monthRaw) && monthRaw >= 1 && monthRaw <= 12 ? monthRaw : null,
    webSearch: p.get('web') === '0' ? false : null,
    maxIdeas: Number.isFinite(maxRaw) && maxRaw > 0 ? maxRaw : null,
    dryRun: p.get('dryRun') === '1',
  });
}

export async function GET(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req));
}
export async function POST(req: NextRequest) {
  const deny = denyReason(req);
  if (deny) return NextResponse.json({ ok: false, error: deny }, { status: 401 });
  return NextResponse.json(await run(req));
}
