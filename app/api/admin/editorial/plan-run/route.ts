// POST /api/admin/editorial/plan-run   (admin session-gated)
// Trigger a planner pass from the cockpit — no secret needed, the admin session
// authorises it. Body (all optional): { section, month, dryRun, web, max }.
// (The scheduled/cron path uses the key-gated /api/editorial/plan/run instead.)
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { runPlanner } from '@/lib/editorial/plan';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const b = await req.json().catch(() => ({} as Record<string, unknown>));
  const month = Number(b.month);
  const max = Number(b.max);
  return NextResponse.json(await runPlanner({
    sectionKey: typeof b.section === 'string' && b.section ? b.section : null,
    monthIndex: Number.isFinite(month) && month >= 1 && month <= 12 ? month : null,
    webSearch: b.web === false ? false : null,
    maxIdeas: Number.isFinite(max) && max > 0 ? max : null,
    dryRun: b.dryRun === true,
  }));
}
