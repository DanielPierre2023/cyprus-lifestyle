import { supabaseServer } from '@/lib/supabase/server';
import EvalRunner from './EvalRunner';

export const dynamic = 'force-dynamic';

function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ marginBottom: 26 }}>
      <h1 style={{ fontSize: 18 }}>{title}</h1>
      <table className="adm-t">
        <tbody>
          {rows.slice(0, 10).map((r, i) => (
            <tr key={i}><td style={{ width: 220 }}>{r.label}</td>
              <td><div style={{ background: '#C9A24C', height: 12, width: `${(r.value / max) * 100}%`, minWidth: 2, display: 'inline-block', verticalAlign: 'middle' }} /> <span style={{ marginInlineStart: 8 }}>{r.value}</span></td></tr>
          ))}
          {rows.length === 0 ? <tr><td>No data.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export default async function AnalyticsTab() {
  const sb = await supabaseServer();
  const { data } = await sb.rpc('get_analytics_data_admin', { p_period: '30d' });
  const a = (data as any) || {};
  const { data: spend } = await sb.from('ai_spend_by_function_daily').select('*').order('day', { ascending: false }).limit(12);
  const { data: months } = await sb.from('ai_spend_by_month').select('*').order('month', { ascending: false }).limit(36);
  const monthRows = (months as { month: string; calls: number; usd: number }[] | null) || [];
  const totalUsd = monthRows.reduce((sum, m) => sum + Number(m.usd || 0), 0);
  const totalCalls = monthRows.reduce((sum, m) => sum + Number(m.calls || 0), 0);

  // Concierge coverage (item 02) — the answer-coverage rate + the unanswered backlog.
  const since = new Date(Date.now() - 30 * 864e5).toISOString();
  const { data: cev } = await sb.from('concierge_events')
    .select('coverage, question, locale, channel, created_at').gte('created_at', since)
    .order('created_at', { ascending: false }).limit(3000);
  const ev = (cev as { coverage: string; question: string | null; locale: string | null; channel: string | null; created_at: string }[] | null) || [];
  const cTotal = ev.length;
  const cDeferred = ev.filter((e) => e.coverage === 'deferred').length;
  const cRate = cTotal ? Math.round((1000 * (cTotal - cDeferred)) / cTotal) / 10 : 0;
  const backlog = new Map<string, { q: string; n: number; locale: string | null; last: string }>();
  for (const e of ev) {
    if (e.coverage !== 'deferred' || !e.question) continue;
    const k = e.question.toLowerCase().trim().slice(0, 120);
    const cur = backlog.get(k);
    if (cur) cur.n++; else backlog.set(k, { q: e.question.slice(0, 160), n: 1, locale: e.locale, last: e.created_at });
  }
  const backlogRows = Array.from(backlog.values()).sort((a, b) => b.n - a.n).slice(0, 20);

  // System errors (item 03) — grouped, most frequent first.
  const { data: errGrouped } = await sb.from('error_log_grouped')
    .select('source, level, sample_message, occurrences, last_seen').limit(15);
  const errRows = (errGrouped as { source: string | null; level: string | null; sample_message: string | null; occurrences: number; last_seen: string }[] | null) || [];
  const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
  const { count: err7 } = await sb.from('error_log').select('id', { count: 'exact', head: true }).gte('created_at', since7);

  // Concierge quality — live-model evals (item 14). On-demand; may be empty until a run.
  const { data: evalRuns } = await sb.from('concierge_eval_summary')
    .select('run_id, run_at, n, avg_grounded, avg_language, avg_helpful, avg_overall, fails, weak')
    .order('run_at', { ascending: false }).limit(8);
  const eRuns = (evalRuns as { run_id: string; run_at: string; n: number; avg_grounded: number | null; avg_language: number | null; avg_helpful: number | null; avg_overall: number | null; fails: number; weak: number }[] | null) || [];
  const latestRun = eRuns[0];
  let evalIssues: { locale: string | null; intent: string | null; verdict: string | null; overall: number | null; notes: string | null; question: string | null }[] = [];
  if (latestRun) {
    const { data: iss } = await sb.from('concierge_evals')
      .select('locale, intent, verdict, overall, notes, question')
      .eq('run_id', latestRun.run_id).in('verdict', ['fail', 'weak'])
      .order('overall', { ascending: true, nullsFirst: true }).limit(12);
    evalIssues = (iss as typeof evalIssues | null) || [];
  }

  // Background jobs (item 01) — queue health + recent dead-letters.
  const { data: jobStats } = await sb.from('job_queue_stats').select('status, n, next_due');
  const jobs = (jobStats as { status: string; n: number; next_due: string | null }[] | null) || [];
  const jobCount = (s: string) => jobs.find((j) => j.status === s)?.n || 0;
  const { data: deadJobs } = await sb.from('job_queue').select('kind, last_error, updated_at').eq('status', 'dead').order('updated_at', { ascending: false }).limit(8);
  const dead = (deadJobs as { kind: string; last_error: string | null; updated_at: string }[] | null) || [];

  return (
    <>
      <h1>Analytics · Observabilitate</h1>
      <p className="sub">Traffic (last 30 days) and AI spend.</p>
      <div className="cards">
        <div className="stat"><div className="n">{a.overview?.views_30d ?? 0}</div><div className="k">Views · 30d</div></div>
        <div className="stat"><div className="n">{a.overview?.visitors_30d ?? 0}</div><div className="k">Visitors · 30d</div></div>
        <div className="stat"><div className="n">{a.overview?.views_24h ?? 0}</div><div className="k">Views · 24h</div></div>
      </div>

      {/* Concierge coverage (roadmap item 02) — can we answer, and what's the backlog? */}
      <h1 style={{ fontSize: 18, marginTop: 8 }}>Concierge coverage · 30d</h1>
      <p className="sub">How often the concierge answers from grounded facts, and the exact questions it could not fully answer — the scrape / write backlog.</p>
      <div className="cards">
        <div className="stat"><div className="n">{cRate}%</div><div className="k">Answer coverage</div></div>
        <div className="stat"><div className="n">{cTotal}</div><div className="k">Questions · 30d</div></div>
        <div className="stat"><div className="n">{cDeferred}</div><div className="k">Gaps (deferred)</div></div>
      </div>
      <h1 style={{ fontSize: 18 }}>Top unanswered questions — the backlog</h1>
      <table className="adm-t">
        <thead><tr><th style={{ width: 40 }}>#</th><th>Question the concierge could not fully answer</th><th style={{ width: 60 }}>Lang</th><th style={{ width: 70 }}>Asked</th><th style={{ width: 120 }}>Last seen</th></tr></thead>
        <tbody>
          {backlogRows.map((r, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{r.q}</td>
              <td>{r.locale || '—'}</td>
              <td>{r.n}×</td>
              <td>{new Date(r.last).toLocaleDateString()}</td>
            </tr>
          ))}
          {backlogRows.length === 0 ? <tr><td colSpan={5}>No gaps logged yet — every question was answered from grounded facts.</td></tr> : null}
        </tbody>
      </table>

      {/* Concierge quality — live-model evals (roadmap item 14). On-demand & opt-in. */}
      <h1 style={{ fontSize: 18, marginTop: 8 }}>Concierge quality · live evals</h1>
      <p className="sub">Scores the concierge&rsquo;s <em>actual answers</em> from the live model — grounding (no fabrication), language fidelity and helpfulness, 1&ndash;5 each. On-demand only (each run costs model calls): run a quick sample for an instant read, or queue the full multilingual set. Results are stored per run.</p>
      <EvalRunner />
      {latestRun ? (
        <div className="cards">
          <div className="stat"><div className="n">{latestRun.avg_overall ?? '—'}</div><div className="k">Latest overall /5</div></div>
          <div className="stat"><div className="n">{latestRun.avg_grounded ?? '—'}</div><div className="k">Grounded /5</div></div>
          <div className="stat"><div className="n">{latestRun.avg_language ?? '—'}</div><div className="k">Language /5</div></div>
          <div className="stat"><div className="n" style={latestRun.fails > 0 ? { color: '#B00020' } : undefined}>{latestRun.fails}</div><div className="k">Fails</div></div>
        </div>
      ) : null}
      <table className="adm-t">
        <thead><tr><th>Run</th><th style={{ width: 130 }}>When</th><th style={{ width: 50 }}>N</th><th style={{ width: 70 }}>Overall</th><th style={{ width: 70 }}>Ground</th><th style={{ width: 70 }}>Lang</th><th style={{ width: 70 }}>Help</th><th style={{ width: 60 }}>Weak</th><th style={{ width: 60 }}>Fail</th></tr></thead>
        <tbody>
          {eRuns.map((r, i) => (
            <tr key={i}>
              <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.run_id}</td>
              <td>{new Date(r.run_at).toLocaleString()}</td>
              <td>{r.n}</td>
              <td>{r.avg_overall ?? '—'}</td>
              <td>{r.avg_grounded ?? '—'}</td>
              <td>{r.avg_language ?? '—'}</td>
              <td>{r.avg_helpful ?? '—'}</td>
              <td>{r.weak}</td>
              <td style={r.fails > 0 ? { color: '#B00020', fontWeight: 700 } : undefined}>{r.fails}</td>
            </tr>
          ))}
          {eRuns.length === 0 ? <tr><td colSpan={9}>No eval runs yet — click &ldquo;Run quick sample&rdquo; to score the concierge live.</td></tr> : null}
        </tbody>
      </table>
      {evalIssues.length > 0 ? (
        <>
          <h1 style={{ fontSize: 18 }}>Latest run — answers to review</h1>
          <table className="adm-t">
            <thead><tr><th style={{ width: 50 }}>Lang</th><th style={{ width: 90 }}>Intent</th><th style={{ width: 60 }}>Verdict</th><th style={{ width: 60 }}>Score</th><th>Question &amp; judge note</th></tr></thead>
            <tbody>
              {evalIssues.map((r, i) => (
                <tr key={i}>
                  <td>{r.locale || '—'}</td>
                  <td>{r.intent || '—'}</td>
                  <td><span style={{ color: r.verdict === 'fail' ? '#B00020' : '#B8860B', fontWeight: 700 }}>{r.verdict}</span></td>
                  <td>{r.overall ?? '—'}</td>
                  <td><div>{r.question}</div>{r.notes ? <div className="sub" style={{ margin: '2px 0 0' }}>{r.notes}</div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {/* System errors (roadmap item 03) — durable error log, grouped. */}
      <h1 style={{ fontSize: 18, marginTop: 8 }}>System errors{typeof err7 === 'number' ? ` · ${err7} in 7d` : ''}</h1>
      <p className="sub">Server-side failures captured to the database (cron, mailroom, concierge). Grouped by problem, most frequent first, last 30 days.</p>
      <table className="adm-t">
        <thead><tr><th style={{ width: 130 }}>Source</th><th style={{ width: 50 }}>Lvl</th><th>Latest message</th><th style={{ width: 60 }}>Count</th><th style={{ width: 120 }}>Last seen</th></tr></thead>
        <tbody>
          {errRows.map((r, i) => (
            <tr key={i}>
              <td>{r.source || '—'}</td>
              <td><span style={{ color: r.level === 'warn' ? '#B8860B' : '#B00020', fontWeight: 700 }}>{r.level === 'warn' ? 'warn' : 'err'}</span></td>
              <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{r.sample_message || '—'}</td>
              <td>{r.occurrences}×</td>
              <td>{new Date(r.last_seen).toLocaleString()}</td>
            </tr>
          ))}
          {errRows.length === 0 ? <tr><td colSpan={5}>No errors logged in the last 30 days.</td></tr> : null}
        </tbody>
      </table>

      {/* Background jobs (roadmap item 01) — queue health. */}
      <h1 style={{ fontSize: 18, marginTop: 8 }}>Background jobs</h1>
      <p className="sub">The durable job queue drained by the worker (Supabase pg_cron → /api/cron/worker). Dead jobs exhausted their retries and need a look.</p>
      <div className="cards">
        <div className="stat"><div className="n">{jobCount('pending')}</div><div className="k">Pending</div></div>
        <div className="stat"><div className="n">{jobCount('running')}</div><div className="k">Running</div></div>
        <div className="stat"><div className="n">{jobCount('done')}</div><div className="k">Done</div></div>
        <div className="stat"><div className="n" style={jobCount('dead') > 0 ? { color: '#B00020' } : undefined}>{jobCount('dead')}</div><div className="k">Dead</div></div>
      </div>
      {dead.length > 0 ? (
        <table className="adm-t">
          <thead><tr><th style={{ width: 150 }}>Kind</th><th>Last error</th><th style={{ width: 130 }}>Failed at</th></tr></thead>
          <tbody>
            {dead.map((d, i) => (
              <tr key={i}>
                <td>{d.kind}</td>
                <td style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{d.last_error || '—'}</td>
                <td>{new Date(d.updated_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <Bars title="Top pages" rows={a.pages || []} />
      <Bars title="Traffic sources" rows={a.sources || []} />
      <Bars title="Countries" rows={a.countries || []} />
      <Bars title="Devices" rows={a.devices || []} />
      <h1 style={{ fontSize: 18 }}>AI spend by month</h1>
      <table className="adm-t">
        <thead><tr><th>Month</th><th>Calls</th><th>USD</th></tr></thead>
        <tbody>
          {monthRows.map((m, i) => (
            <tr key={i}><td>{m.month}</td><td>{m.calls}</td><td>${Number(m.usd || 0).toFixed(2)}</td></tr>
          ))}
          {monthRows.length === 0 ? <tr><td colSpan={3}>No spend logged yet.</td></tr> : (
            <tr style={{ fontWeight: 700, borderTop: '2px solid #C9A24C' }}>
              <td>Total</td><td>{totalCalls}</td><td>${totalUsd.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18 }}>AI spend by function (recent)</h1>
      <table className="adm-t">
        <thead><tr><th>Day</th><th>Function</th><th>Calls</th><th>USD</th></tr></thead>
        <tbody>
          {((spend as any[]) || []).map((s, i) => (
            <tr key={i}><td>{s.day}</td><td>{s.function_name}</td><td>{s.calls}</td><td>${Number(s.usd || 0).toFixed(4)}</td></tr>
          ))}
          {(!spend || spend.length === 0) ? <tr><td colSpan={4}>No spend logged yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
