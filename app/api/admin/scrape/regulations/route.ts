// Admin control for the regulation watch (Phase 2 of living knowledge).
//   GET  → status: source count, open alerts, recent change alerts.
//   POST { action:'seed' } → register the curated official pages as sources.
//   POST { action:'run', force? } → check due sources now (baseline first time; alert on change).
//   POST { action:'review'|'dismiss', id } → set an alert's status.
// Admin only. The daily cron does the checking on a rotation; changes to the law are
// surfaced here for a human to fold into the knowledge base — never auto-applied.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runRegulationWatch, seedRegulationSources } from '@/lib/scrape/regulations';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const [sources, open, alerts] = await Promise.all([
    sb.from('scrape_sources').select('id', { count: 'exact', head: true }).eq('category', 'regulation'),
    sb.from('regulation_alerts').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    sb.from('regulation_alerts').select('id, url, title, summary, severity, status, detected_at').order('detected_at', { ascending: false }).limit(20),
  ]);
  return NextResponse.json({ ok: true, sources: sources.count ?? 0, open: open.count ?? 0, alerts: alerts.data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || 'run');

  if (action === 'seed') {
    const added = await seedRegulationSources(sb);
    return NextResponse.json({ ok: true, action, added });
  }
  if (action === 'review' || action === 'dismiss') {
    const id = String(body.id || '');
    if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });
    const status = action === 'review' ? 'reviewed' : 'dismissed';
    const { error } = await sb.from('regulation_alerts').update({ status }).eq('id', id);
    return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true, action, status });
  }

  // run
  const summary = await runRegulationWatch(sb, { deadlineMs: 45_000, maxSources: Math.min(Number(body.maxSources) || 6, 12), force: Boolean(body.force) });
  return NextResponse.json({ ok: true, action: 'run', summary });
}
