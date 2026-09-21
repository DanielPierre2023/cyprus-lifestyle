// Admin control for the events actualiser (Phase 3 of living knowledge).
//   GET  → status: upcoming published events, draft events awaiting approval, and
//          culture articles not yet mined for their events.
//   POST { action:'refresh' } → pull real external listings via the events-ingest edge fn.
//   POST { action:'mine' }    → lift dated events from our own culture articles into the agenda.
//   POST { action:'run' }     → both.
// New events always land as drafts for approval in Admin → Agenda. Admin only.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runEventsActualiser, CULTURE_CATEGORIES } from '@/lib/scrape/events';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const nowIso = new Date().toISOString();
  const [upcoming, drafts, unmined] = await Promise.all([
    sb.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').gte('starts_at', nowIso),
    sb.from('events').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    sb.from('blog_posts').select('id', { count: 'exact', head: true }).eq('status', 'published').is('events_mined_at', null).in('category', CULTURE_CATEGORIES),
  ]);
  return NextResponse.json({ ok: true, upcoming: upcoming.count ?? 0, drafts: drafts.count ?? 0, unmined_articles: unmined.count ?? 0 });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || 'run');
  const refresh = action === 'refresh' || action === 'run';
  const mine = action === 'mine' || action === 'run';
  const summary = await runEventsActualiser(sb, { refresh, mine, mineLimit: Math.min(Number(body.mineLimit) || 6, 12), deadlineMs: 55_000 });
  return NextResponse.json({ ok: true, action, summary });
}
