// Admin control for the developer-projects scraper (Phase 1 of living knowledge).
//   GET  → status: source + project counts, so the admin sees coverage at a glance.
//   POST { action:'seed' } → register developer/agent sites from the directory as sources.
//   POST { action:'run', force?, maxSources? } → run the scraper now (drains due sources;
//         'force' re-scrapes even unchanged sites). Publishing follows the autopublish
//         switch; otherwise new projects land as drafts for review in the Directory admin.
// Admin only. The daily cron does the same on a rotation without anyone here.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { runDevelopmentsScrape, seedSourcesFromDirectory } from '@/lib/scrape/developments';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const [sources, due, projects, drafts, recent] = await Promise.all([
    sb.from('scrape_sources').select('id', { count: 'exact', head: true }).eq('category', 'development'),
    sb.from('scrape_sources').select('id', { count: 'exact', head: true }).eq('category', 'development').eq('enabled', true).is('last_fetched_at', null),
    sb.from('directory_listings').select('id', { count: 'exact', head: true }).eq('type', 'development'),
    sb.from('directory_listings').select('id', { count: 'exact', head: true }).eq('type', 'development').eq('status', 'draft'),
    sb.from('scrape_sources').select('name, url, status, last_fetched_at, last_found, last_error').eq('category', 'development').order('last_fetched_at', { ascending: false, nullsFirst: false }).limit(8),
  ]);
  return NextResponse.json({
    ok: true,
    sources: sources.count ?? 0,
    never_run: due.count ?? 0,
    projects: projects.count ?? 0,
    drafts: drafts.count ?? 0,
    recent: recent.data ?? [],
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || 'run');

  if (action === 'seed') {
    const added = await seedSourcesFromDirectory(sb);
    return NextResponse.json({ ok: true, action, added });
  }

  // run
  const { data: a } = await sb.from('automation_settings').select('developments_autopublish').eq('id', 1).maybeSingle();
  const autopublish = Boolean((a as { developments_autopublish?: boolean } | null)?.developments_autopublish);
  const summary = await runDevelopmentsScrape(sb, {
    deadlineMs: 45_000,
    maxSources: Math.min(Number(body.maxSources) || 5, 10),
    autopublish,
    force: Boolean(body.force),
  });
  return NextResponse.json({ ok: true, action: 'run', autopublish, summary });
}
