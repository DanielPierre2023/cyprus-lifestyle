'use client';
import { useCallback, useEffect, useState } from 'react';

// Admin → Events sources (increment 7.1): the automated Agenda at a glance — which sources feed it, when each last ran,
// how many items it found / added / skipped as duplicates / failed on, and a per-source switch. Everything here is English by design.

interface State { enabled: boolean | null; publish_mode: 'auto' | 'draft' | null; last_run_at: string | null; last_success_at: string | null; last_status: string | null; last_found: number; last_added: number; last_duplicates: number; last_errors: number; last_error: string | null; consecutive_failures: number }
interface Src { slug: string; name: string; kind: string; format: string; homepage: string; feedUrl: string; robots: string; terms: string; checkedOn: string; autoPublish: boolean; factsOnly: boolean; images: boolean; enabled: boolean; effectiveEnabled: boolean; minIntervalMin: number; state: State | null }
interface Excl { name: string; url: string; verdict: string; reason: string; cost?: string }
interface Run { id: number; started_at: string; trigger: string | null; ms: number | null; found: number; added: number; updated: number; duplicates: number; errors: number; published: number; drafted: number; stopped_early: boolean }
interface Data { ok: boolean; tablesReady: boolean; master: boolean; sources: Src[]; excluded: Excl[]; runs: Run[]; counts: { upcoming30: number; draftsWaiting: number; publishedUpcoming: number } }
interface RunOut { summary?: { sources: { slug: string; status: string; found: number; added: number; duplicates: number; skipped: number; errors: number; published: number; drafted: number; error?: string; note?: string }[]; ms: number } ; error?: string }

const when = (s: string | null | undefined) => (s ? new Date(s).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Nicosia' }) : '—');
const post = (body: Record<string, unknown>) => fetch('/api/admin/events/pipeline', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

export default function EventsSourcesTab() {
  const [d, setD] = useState<Data | null>(null);
  const [busy, setBusy] = useState('');
  const [out, setOut] = useState<RunOut | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/events/pipeline', { cache: 'no-store' });
    if (!r.ok) { setErr(`Could not load (HTTP ${r.status}).`); return; }
    setD(await r.json()); setErr('');
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(key: string, body: Record<string, unknown>) {
    setBusy(key); setOut(null);
    const j = await post(body);
    if (body.action === 'run') setOut(j as RunOut);
    else if (!j.ok) setErr(j.error || 'Failed');
    setBusy(''); load();
  }

  if (!d) return <><h1>Events sources</h1><p className="sub">{err || 'Loading…'}</p></>;
  const lvl = (s: Src) => (!s.effectiveEnabled ? '#6b7280' : (s.state?.consecutive_failures ?? 0) >= 3 ? '#b42318' : s.state?.last_status === 'error' || s.state?.last_status === 'blocked' ? '#b7791f' : '#2f7d4f');

  return (
    <>
      <h1>Events sources</h1>
      <p className="sub">
        The Agenda fills itself: every 3 hours (and once a day as a fallback) the site reads the free, public event feeds below, drops duplicates, and publishes
        events from official sources that have a confirmed date and place. Everything else waits as a draft in <a href="/admin/agenda">Admin → Agenda</a>.
        {' '}<b>{d.counts.upcoming30}</b> real events in the next 30 days · <b>{d.counts.publishedUpcoming}</b> upcoming or running in total · <b>{d.counts.draftsWaiting}</b> future draft(s) waiting for approval.
      </p>
      {!d.tablesReady ? <p style={{ color: '#b42318' }}><b>Migration 20261007120000_events_pipeline.sql has not been run yet</b> — run it in the Supabase SQL Editor, then reload.</p> : null}
      {err ? <p style={{ color: '#b42318' }}>{err}</p> : null}

      <div className="row" style={{ marginBottom: 16, alignItems: 'center' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={d.master} disabled={busy === 'master'} onChange={(e) => act('master', { action: 'master', enabled: e.target.checked })} />
          <b>Automatic Agenda is {d.master ? 'ON' : 'OFF'}</b> (master switch)
        </label>
        <button className="abtn gold" disabled={!!busy} onClick={() => act('run-all', { action: 'run' })}>{busy === 'run-all' ? 'Running… (up to 50 s)' : 'Run all due sources now'}</button>
      </div>

      {out ? (
        <div style={{ border: '1px solid var(--line,#e3d9c4)', borderRadius: 6, padding: 12, marginBottom: 16 }}>
          {out.error ? <b style={{ color: '#b42318' }}>{out.error}</b> : (
            <>
              <b>Run finished in {Math.round((out.summary?.ms || 0) / 100) / 10} s.</b>
              <ul style={{ margin: '6px 0 0', paddingInlineStart: 18 }}>
                {(out.summary?.sources || []).map((r) => (
                  <li key={r.slug}><b>{r.slug}</b>: {r.status} — found {r.found}, added {r.added} ({r.published} published, {r.drafted} draft), duplicates {r.duplicates}, skipped {r.skipped}, errors {r.errors}{r.error ? ` — ${r.error}` : ''}{r.note ? ` — ${r.note}` : ''}</li>
                ))}
                {!(out.summary?.sources || []).length ? <li>No source was due (each has a minimum interval). Use “Run now” on a source to force it.</li> : null}
              </ul>
            </>
          )}
        </div>
      ) : null}

      <table className="adm-t">
        <thead><tr><th>On</th><th>Source</th><th>Last run</th><th>Found</th><th>Added</th><th>Dupes</th><th>Errors</th><th>Publishing</th><th /></tr></thead>
        <tbody>
          {d.sources.map((s) => (
            <tr key={s.slug}>
              <td><input type="checkbox" checked={s.effectiveEnabled} disabled={busy === `t-${s.slug}`} onChange={(e) => act(`t-${s.slug}`, { action: 'toggle', slug: s.slug, enabled: e.target.checked })} /></td>
              <td>
                <b style={{ color: lvl(s) }}>●</b> <b>{s.name}</b><br />
                <span style={{ opacity: 0.75 }}>{s.kind} · {s.format}{s.factsOnly ? ' · facts only' : ''} · every {Math.round(s.minIntervalMin / 60 * 10) / 10} h</span><br />
                <a href={s.homepage} target="_blank" rel="noopener">{s.homepage.replace(/^https?:\/\//, '')}</a>
                <details style={{ marginTop: 4 }}>
                  <summary>robots.txt &amp; terms (checked {s.checkedOn})</summary>
                  <p style={{ margin: '4px 0' }}><b>robots:</b> {s.robots}</p>
                  <p style={{ margin: '4px 0' }}><b>terms:</b> {s.terms}</p>
                  <p style={{ margin: '4px 0' }}><b>feed:</b> <code style={{ wordBreak: 'break-all' }}>{s.feedUrl}</code></p>
                </details>
              </td>
              <td>{when(s.state?.last_run_at)}<br /><span style={{ opacity: 0.75 }}>{s.state?.last_status || 'never'}{s.state?.consecutive_failures ? ` · ${s.state.consecutive_failures} failed in a row` : ''}</span>{s.state?.last_error ? <><br /><span style={{ color: '#b42318' }}>{s.state.last_error}</span></> : null}</td>
              <td>{s.state?.last_found ?? '—'}</td><td>{s.state?.last_added ?? '—'}</td><td>{s.state?.last_duplicates ?? '—'}</td><td>{s.state?.last_errors ?? '—'}</td>
              <td>
                <select value={s.state?.publish_mode ?? ''} disabled={busy === `m-${s.slug}`} onChange={(e) => act(`m-${s.slug}`, { action: 'mode', slug: s.slug, mode: e.target.value || null })}>
                  <option value="">Default ({s.autoPublish ? 'auto' : 'draft'})</option><option value="auto">Auto-publish</option><option value="draft">Always draft</option>
                </select>
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="abtn" disabled={!!busy} onClick={() => act(`r-${s.slug}`, { action: 'run', source: s.slug, dryRun: true })}>{busy === `r-${s.slug}` ? '…' : 'Test'}</button>{' '}
                <button className="abtn" disabled={!!busy} onClick={() => act(`r-${s.slug}`, { action: 'run', source: s.slug })}>Run now</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sub">“Test” fetches and parses the source and reports what it would add, without saving anything. Sources that are switched off here still can be tested.</p>

      <h2 style={{ marginTop: 28 }}>Recent runs</h2>
      <table className="adm-t">
        <thead><tr><th>Started (Cyprus)</th><th>By</th><th>Found</th><th>Added</th><th>Published</th><th>Draft</th><th>Updated</th><th>Dupes</th><th>Errors</th><th>Took</th></tr></thead>
        <tbody>
          {d.runs.length === 0 ? <tr><td colSpan={10}>No run recorded yet.</td></tr> : d.runs.map((r) => (
            <tr key={r.id}><td>{when(r.started_at)}</td><td>{r.trigger}{r.stopped_early ? ' (time box)' : ''}</td><td>{r.found}</td><td>{r.added}</td><td>{r.published}</td><td>{r.drafted}</td><td>{r.updated}</td><td>{r.duplicates}</td><td>{r.errors}</td><td>{r.ms != null ? `${Math.round(r.ms / 100) / 10} s` : '—'}</td></tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 28 }}>Looked at and NOT used</h2>
      <p className="sub">Recorded so nobody re-checks them: sources that forbid scraping, block bots, have no structured feed, are dead, or would cost money.</p>
      <table className="adm-t">
        <thead><tr><th style={{ width: 150 }}>Verdict</th><th>Source</th><th>Why</th></tr></thead>
        <tbody>
          {d.excluded.map((x) => (
            <tr key={x.name}><td><b>{x.verdict}</b>{x.cost ? <><br />{x.cost}</> : null}</td><td><a href={x.url} target="_blank" rel="noopener">{x.name}</a></td><td>{x.reason}</td></tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
