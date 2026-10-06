// Admin control of the automated Agenda (increment 7.1).
//   GET  -> the source registry merged with run-time state, the latest runs, and agenda counters.
//   POST { action:'run', source?, dryRun? }   -> run the pipeline now (time-boxed to 50 s; dryRun writes nothing)
//        { action:'toggle', slug, enabled }   -> enable / disable one source (null = back to the registry default)
//        { action:'mode', slug, mode }        -> 'auto' | 'draft' | null : may this source publish on its own?
//        { action:'master', enabled }         -> the master switch (automation_settings.events_pipeline_enabled)
// Admin only; every POST is written to the audit log.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { auditAdminRequest } from '@/lib/auditRequest';
import { EVENT_SOURCES, EXCLUDED_SOURCES } from '@/lib/events/sources';
import { runEventsIngest } from '@/lib/events/run';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const sb = supabaseAdmin();
  const nowIso = new Date().toISOString();
  const in30 = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const [st, runs, auto, up, drafts, total] = await Promise.all([
    sb.from('events_sources').select('*'),
    sb.from('events_ingest_runs').select('id, started_at, trigger, ms, found, added, updated, duplicates, errors, published, drafted, stopped_early').order('started_at', { ascending: false }).limit(12),
    sb.from('automation_settings').select('events_pipeline_enabled').eq('id', 1).maybeSingle(),
    sb.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').not('tags', 'cs', '{public-holiday}')
      .or(`and(starts_at.gte.${nowIso},starts_at.lte.${in30}),and(starts_at.lt.${nowIso},ends_at.gte.${nowIso})`),
    sb.from('events').select('id', { count: 'exact', head: true }).eq('status', 'draft').gte('starts_at', nowIso),
    sb.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').or(`starts_at.gte.${nowIso},ends_at.gte.${nowIso}`),
  ]);
  const state = new Map(((st.data || []) as { slug: string }[]).map((r) => [r.slug, r as Record<string, unknown>]));
  return NextResponse.json({
    ok: true,
    tablesReady: !st.error,
    master: (auto.data as { events_pipeline_enabled?: boolean } | null)?.events_pipeline_enabled !== false,
    sources: EVENT_SOURCES.map((s) => ({ ...s, state: state.get(s.slug) ?? null, effectiveEnabled: ((state.get(s.slug)?.enabled as boolean | null | undefined) ?? s.enabled) })),
    excluded: EXCLUDED_SOURCES,
    runs: runs.data || [],
    counts: { upcoming30: up.count ?? 0, draftsWaiting: drafts.count ?? 0, publishedUpcoming: total.count ?? 0 },
  });
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  auditAdminRequest(req, 'events.pipeline');
  const sb = supabaseAdmin();
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const action = String(body.action || '');
  const slug = String(body.slug || body.source || '');
  const known = EVENT_SOURCES.some((s) => s.slug === slug);

  if (action === 'run') {
    if (slug && !known) return NextResponse.json({ ok: false, error: 'Unknown source' }, { status: 400 });
    const summary = await runEventsIngest(sb, { deadlineMs: 50_000, only: slug || undefined, force: true, dryRun: !!body.dryRun, trigger: 'admin' });
    return NextResponse.json({ ok: true, summary });
  }
  if (action === 'toggle' && known) {
    const enabled = body.enabled === null ? null : !!body.enabled;
    const { error } = await sb.from('events_sources').upsert({ slug, enabled, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
    return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (action === 'mode' && known) {
    const mode = body.mode === 'auto' || body.mode === 'draft' ? body.mode : null;
    const { error } = await sb.from('events_sources').upsert({ slug, publish_mode: mode, updated_at: new Date().toISOString() }, { onConflict: 'slug' });
    return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  if (action === 'master') {
    const { error } = await sb.from('automation_settings').update({ events_pipeline_enabled: !!body.enabled }).eq('id', 1);
    return error ? NextResponse.json({ ok: false, error: error.message }, { status: 500 }) : NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });
}
