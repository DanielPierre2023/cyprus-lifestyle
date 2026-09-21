'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AiTab() {
  const sb = supabaseBrowser();
  const [auto, setAuto] = useState<{ scraper_enabled: boolean; processor_enabled: boolean; auto_publish: boolean; mail_autoack_enabled: boolean; developments_enabled: boolean; developments_autopublish: boolean; regulation_watch_enabled: boolean; events_watch_enabled: boolean }>({ scraper_enabled: false, processor_enabled: false, auto_publish: false, mail_autoack_enabled: false, developments_enabled: false, developments_autopublish: false, regulation_watch_enabled: false, events_watch_enabled: false });
  const [queue, setQueue] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [report, setReport] = useState<any>(null);
  const [bf, setBf] = useState<any>(null);        // de/pl/ru backfill backlog
  const [bfMsg, setBfMsg] = useState('');
  const [dev, setDev] = useState<any>(null);       // developer-projects scraper status
  const [devMsg, setDevMsg] = useState('');
  const [reg, setReg] = useState<any>(null);       // regulation watch status + alerts
  const [regMsg, setRegMsg] = useState('');
  const [ev, setEv] = useState<any>(null);         // events actualiser status
  const [evMsg, setEvMsg] = useState('');

  const load = useCallback(async () => {
    const [{ data: s }, { data: q }, { data: l }] = await Promise.all([
      sb.from('automation_settings').select('*').eq('id', 1).maybeSingle(),
      sb.from('scraped_articles').select('id, original_title, category, county, status, created_at').eq('status', 'scraped').eq('is_used', false).order('created_at', { ascending: false }).limit(25),
      sb.from('generation_logs').select('id, status, editor, category, total_ms, en_humanness, created_at, error_stage').order('created_at', { ascending: false }).limit(15),
    ]);
    if (s) setAuto(s as any);
    setQueue(q || []); setLogs(l || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function toggle(key: keyof typeof auto) {
    const next = { ...auto, [key]: !auto[key] };
    setAuto(next);
    await sb.from('automation_settings').update({ [key]: next[key], updated_at: new Date().toISOString() }).eq('id', 1);
  }
  async function generate(id: string) {
    // Invoke the Supabase Edge Function directly (the admin's session JWT authorises it).
    // This runs the AI desk on Supabase — where the model keys live and the runtime is
    // long enough — instead of the Vercel route, which has no keys and a 60s limit.
    setBusy(id); setMsg('Composing four editions natively — this takes a minute or two…');
    try {
      const { data, error } = await sb.functions.invoke('process-scraped-article', { body: { scraped_article_id: id } });
      const d = data as any;
      if (error) setMsg('Generation failed: ' + (error.message || 'edge function error'));
      else if (d && d.ok === false) {
        const r = d.reason || 'unknown';
        setMsg(/off-topic/i.test(r) ? 'Skipped — ' + r : 'Generation failed — ' + r);
      }
      else if (d && d.quality_warning) setMsg('Article drafted, but ⚠ ' + d.quality_warning);
      else setMsg('Article drafted. See it in Articles (status: draft).');
    } catch (e) {
      setMsg('Generation error: ' + (e as Error).message);
    }
    setBusy(''); load();
  }

  // Diagnostic: check the AI service is reachable (health only — no model names).
  async function selfTest() {
    setBusy('selftest'); setMsg('Checking the AI service…'); setReport(null);
    try {
      const { data, error } = await sb.functions.invoke('process-scraped-article', { body: { action: 'selftest' } });
      if (error) { setMsg('Self-test failed: ' + (error.message || 'edge function error')); }
      else {
        const d = data as any;
        setReport(d);
        setMsg((d?.ok ? '✓ ' : '✗ ') + (d?.verdict || 'Self-test complete.'));
      }
    } catch (e) {
      setMsg('Self-test error: ' + (e as Error).message);
    }
    setBusy('');
  }

  // Legacy backfill — fill missing German/Polish/Russian editions of older
  // articles (structure-preserving translation of the stored English). GET shows
  // the backlog for free; the run fills it in bounded batches until clear.
  const checkBackfill = useCallback(async () => {
    setBusy('bf-check'); setBfMsg('Counting the backlog…');
    try {
      const res = await fetch('/api/admin/backfill-translations', { credentials: 'same-origin' });
      const d = await res.json();
      if (!res.ok || !d.ok) setBfMsg('Check failed: ' + (d.error || res.status));
      else { setBf(d); setBfMsg(d.tasks_remaining ? `${d.tasks_remaining} editions to fill across ${d.articles_with_gaps} articles.` : 'All articles already carry all seven editions.'); }
    } catch (e) { setBfMsg('Check error: ' + (e as Error).message); }
    setBusy('');
  }, []);

  async function runBackfill() {
    setBusy('bf-run'); setBfMsg('Filling editions…');
    let filled = 0;
    try {
      for (let i = 0; i < 400; i++) {
        const res = await fetch('/api/admin/backfill-translations', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 3 }),
        });
        const d = await res.json();
        if (!res.ok || !d.ok) { setBfMsg('Run stopped: ' + (d.error || res.status)); break; }
        filled += d.filled || 0;
        setBfMsg(`Filled ${filled} so far · ${d.tasks_remaining} remaining…`);
        if (!d.tasks_remaining) { setBfMsg(`Done — filled ${filled} editions. Every article now ships all seven.`); break; }
      }
    } catch (e) { setBfMsg('Run error: ' + (e as Error).message); }
    setBusy(''); checkBackfill();
  }

  // Developer-projects scraper (living directory) — status + on-demand run.
  const checkDev = useCallback(async () => {
    try { const res = await fetch('/api/admin/scrape/developments', { credentials: 'same-origin' }); const d = await res.json(); if (d.ok) setDev(d); } catch { /* ignore */ }
  }, []);
  useEffect(() => { checkDev(); }, [checkDev]);

  async function seedDev() {
    setBusy('dev-seed'); setDevMsg('Registering developer & agent sites from your directory…');
    try {
      const res = await fetch('/api/admin/scrape/developments', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) });
      const d = await res.json();
      setDevMsg(d.ok ? `Registered ${d.added} new source${d.added === 1 ? '' : 's'}. Now press “Scrape now”.` : 'Seed failed: ' + (d.error || res.status));
    } catch (e) { setDevMsg('Seed error: ' + (e as Error).message); }
    setBusy(''); checkDev();
  }
  async function runDev(force = false) {
    setBusy('dev-run'); setDevMsg('Scraping developer projects — this can take up to a minute…');
    try {
      const res = await fetch('/api/admin/scrape/developments', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run', force, maxSources: 6 }) });
      const d = await res.json();
      if (!d.ok) setDevMsg('Run failed: ' + (d.error || res.status));
      else { const s = d.summary; setDevMsg(`Processed ${s.sources_processed} site${s.sources_processed === 1 ? '' : 's'} (${s.sources_unchanged} unchanged) · ${s.projects_upserted} projects saved${s.errors?.length ? ` · ${s.errors.length} error(s)` : ''}. ${d.autopublish ? 'Published live.' : 'Saved as drafts — review in Directory.'}`); }
    } catch (e) { setDevMsg('Run error: ' + (e as Error).message); }
    setBusy(''); checkDev();
  }

  // Regulation watch (living knowledge, Phase 2) — status, on-demand check, alert triage.
  const checkReg = useCallback(async () => {
    try { const res = await fetch('/api/admin/scrape/regulations', { credentials: 'same-origin' }); const d = await res.json(); if (d.ok) setReg(d); } catch { /* ignore */ }
  }, []);
  useEffect(() => { checkReg(); }, [checkReg]);

  async function seedReg() {
    setBusy('reg-seed'); setRegMsg('Registering the official pages to watch…');
    try {
      const res = await fetch('/api/admin/scrape/regulations', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) });
      const d = await res.json();
      setRegMsg(d.ok ? `Registered ${d.added} official source${d.added === 1 ? '' : 's'}. Now press “Check now” to baseline them.` : 'Seed failed: ' + (d.error || res.status));
    } catch (e) { setRegMsg('Seed error: ' + (e as Error).message); }
    setBusy(''); checkReg();
  }
  async function runReg(force = false) {
    setBusy('reg-run'); setRegMsg('Checking official pages for changes…');
    try {
      const res = await fetch('/api/admin/scrape/regulations', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'run', force }) });
      const d = await res.json();
      if (!d.ok) setRegMsg('Run failed: ' + (d.error || res.status));
      else { const s = d.summary; setRegMsg(`Checked ${s.considered} page(s) · ${s.baselined} baselined · ${s.changed} changed · ${s.unchanged} unchanged${s.errors?.length ? ` · ${s.errors.length} error(s)` : ''}.`); }
    } catch (e) { setRegMsg('Run error: ' + (e as Error).message); }
    setBusy(''); checkReg();
  }
  async function setAlert(id: string, action: 'review' | 'dismiss') {
    try {
      await fetch('/api/admin/scrape/regulations', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, id }) });
      checkReg();
    } catch { /* ignore */ }
  }

  // Events actualiser (living knowledge, Phase 3) — status + on-demand refresh/mine.
  const checkEv = useCallback(async () => {
    try { const res = await fetch('/api/admin/scrape/events', { credentials: 'same-origin' }); const d = await res.json(); if (d.ok) setEv(d); } catch { /* ignore */ }
  }, []);
  useEffect(() => { checkEv(); }, [checkEv]);

  async function runEvents(action: 'refresh' | 'mine' | 'run') {
    setBusy('ev-' + action);
    setEvMsg(action === 'refresh' ? 'Pulling real events from listings…' : action === 'mine' ? 'Lifting events from our culture articles…' : 'Refreshing the agenda…');
    try {
      const res = await fetch('/api/admin/scrape/events', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const d = await res.json();
      if (!d.ok) setEvMsg('Failed: ' + (d.error || res.status));
      else { const s = d.summary; setEvMsg(`${s.agenda_refreshed ? 'Listings refreshed. ' : ''}Scanned ${s.articles_scanned} article(s) · ${s.events_added} event(s) added as drafts${s.errors?.length ? ` · ${s.errors.length} note(s)` : ''}. Review & approve in Agenda.`); }
    } catch (e) { setEvMsg('Error: ' + (e as Error).message); }
    setBusy(''); checkEv();
  }

  return (
    <>
      <h1>AI newsroom</h1>
      <p className="sub">Automation switches, the rewrite queue and desk telemetry.</p>

      <div className="row" style={{ marginBottom: 6, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="abtn ghost" disabled={busy === 'bf-check'} onClick={checkBackfill}>
          {busy === 'bf-check' ? 'Checking…' : 'Check de/pl/ru backlog'}
        </button>
        <button className="abtn gold" disabled={busy === 'bf-run' || !(bf && bf.tasks_remaining)} onClick={runBackfill}>
          {busy === 'bf-run' ? 'Filling…' : 'Backfill missing editions'}
        </button>
        <span style={{ fontSize: 12, color: '#8a8371' }}>Translates older articles into German, Polish and Russian — no English fallback left behind.</span>
      </div>
      {bfMsg ? <p style={{ fontSize: 13, color: '#8a8371', margin: '0 0 14px' }}>{bfMsg}{bf && bf.edition_gaps ? ` (de ${bf.edition_gaps.de} · pl ${bf.edition_gaps.pl} · ru ${bf.edition_gaps.ru})` : ''}</p> : null}

      <div className="row" style={{ marginBottom: 14 }}>
        <button className="abtn ghost" disabled={busy === 'selftest'} onClick={selfTest}>
          {busy === 'selftest' ? 'Checking…' : 'Run AI health check'}
        </button>
        <span style={{ fontSize: 12, color: '#8a8371' }}>Checks that the AI service is reachable, before you generate.</span>
      </div>
      {report ? (
        <pre style={{ background: '#0B0E11', color: '#E4D2AC', padding: 12, borderRadius: 4, fontSize: 12, overflowX: 'auto', margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
{`AI service:       ${report.ok ? 'reachable' : 'NOT reachable'}
primary writer:   ${report.writer_primary?.usable ? 'ok' : 'FAIL'} (${report.writer_primary?.prefill ?? ''})
fallback writer:  ${report.writer_fallback?.usable ? 'ok' : 'FAIL'}
research helper:  ${report.research ?? ''}
keys present:     ${Object.entries(report.keys_present || {}).map(([k, v]) => `${k}=${v ? 'yes' : 'NO'}`).join('  ')}`}
        </pre>
      ) : null}

      {([
        ['scraper_enabled', 'RSS scraper', 'Daily cron pulls new items from active feeds.'],
        ['processor_enabled', 'AI processor', 'Cron rewrites queued items into 7-language drafts.'],
        ['auto_publish', 'Auto-publish articles', 'Publish articles automatically instead of leaving drafts for review.'],
        ['mail_autoack_enabled', 'Auto-acknowledge email', 'Send a polite branded receipt automatically to genuine first-contact enquiries, in the sender’s language. Substantive replies always stay a human decision — a draft is prepared, never sent. Guarded against auto-replies, bounces and no-reply senders.'],
        ['developments_enabled', 'Developer-projects scraper', 'On the daily rotation, refresh real developer projects from their own websites into the directory (name, price, status, contact — each stamped with its source). Content-hash change-detection keeps it cheap.'],
        ['developments_autopublish', 'Publish scraped projects live', 'Publish newly scraped projects immediately. Off = they land as drafts for review in Directory first (recommended until you trust a source).'],
        ['regulation_watch_enabled', 'Regulation watch', 'On the daily rotation, check the official government pages (company setup, tax & VAT, permits, employment, funding) and raise a reviewable alert when the law changes. It never rewrites answers itself — a human folds confirmed changes into the knowledge base.'],
        ['events_watch_enabled', 'Agenda actualiser', 'On the daily rotation, lift the dated events our published culture articles describe into the Agenda (as drafts for approval). The heavier external-listings refresh is the “Refresh agenda now” button below.'],
      ] as const).map(([k, label, desc]) => (
        <div className="toggle" key={k}>
          <input type="checkbox" checked={auto[k]} onChange={() => toggle(k)} style={{ width: 'auto', margin: 0 }} />
          <div>
            <strong>{label}</strong>
            <div style={{ fontSize: 12, color: '#8a8371' }}>{desc}</div>
          </div>
        </div>
      ))}

      <h1 style={{ fontSize: 20, marginTop: 22 }}>Developer projects (living directory)</h1>
      <p className="sub" style={{ marginTop: 0 }}>Real projects scraped from developers’ own sites into the directory, each stamped with its source and date — so the concierge can name a project, its price and status, and hand over the developer’s contact. Nothing invented.</p>
      {dev ? (
        <div className="cards" style={{ marginBottom: 10 }}>
          <div className="stat"><div className="n">{dev.sources}</div><div className="k">sources</div></div>
          <div className="stat"><div className="n">{dev.never_run}</div><div className="k">never run</div></div>
          <div className="stat"><div className="n">{dev.projects}</div><div className="k">projects</div></div>
          <div className="stat"><div className="n">{dev.drafts}</div><div className="k">drafts to review</div></div>
        </div>
      ) : null}
      <div className="row" style={{ marginBottom: 6, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="abtn ghost" disabled={busy === 'dev-seed'} onClick={seedDev}>{busy === 'dev-seed' ? 'Registering…' : 'Seed sources from directory'}</button>
        <button className="abtn gold" disabled={busy === 'dev-run'} onClick={() => runDev(false)}>{busy === 'dev-run' ? 'Scraping…' : 'Scrape developer projects now'}</button>
        <button className="abtn ghost" disabled={busy === 'dev-run'} onClick={() => runDev(true)} title="Re-scrape even sites that haven’t changed">Force re-scrape</button>
        <span style={{ fontSize: 12, color: '#8a8371' }}>Seed once, then scrape. New projects appear in Directory (as drafts unless “publish live” is on).</span>
      </div>
      {devMsg ? <p style={{ fontSize: 13, color: '#8a8371', margin: '0 0 6px' }}>{devMsg}</p> : null}
      {dev?.recent?.length ? (
        <table className="adm-t" style={{ marginTop: 6 }}>
          <thead><tr><th>Developer</th><th>Last run</th><th>Found</th><th>Status</th></tr></thead>
          <tbody>
            {dev.recent.map((r: any, i: number) => (
              <tr key={i}>
                <td>{r.name || r.url}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.last_fetched_at ? new Date(r.last_fetched_at).toLocaleDateString() : '—'}</td>
                <td>{r.last_found ?? '—'}</td>
                <td><span className={`pill ${r.status === 'active' ? 'confirmed' : 'pending'}`}>{r.status}{r.last_error ? `: ${String(r.last_error).slice(0, 40)}` : ''}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h1 style={{ fontSize: 20, marginTop: 22 }}>Regulation watch (living knowledge)</h1>
      <p className="sub" style={{ marginTop: 0 }}>The official Cyprus pages that govern our advice — company setup, tax &amp; VAT, permits, employment, funding — checked on a rotation. When the law moves you get an alert here to fold into the knowledge base. Nothing is rewritten automatically.</p>
      {reg ? (
        <div className="cards" style={{ marginBottom: 10 }}>
          <div className="stat"><div className="n">{reg.sources}</div><div className="k">pages watched</div></div>
          <div className="stat"><div className="n">{reg.open}</div><div className="k">open alerts</div></div>
        </div>
      ) : null}
      <div className="row" style={{ marginBottom: 6, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="abtn ghost" disabled={busy === 'reg-seed'} onClick={seedReg}>{busy === 'reg-seed' ? 'Registering…' : 'Seed official pages'}</button>
        <button className="abtn gold" disabled={busy === 'reg-run'} onClick={() => runReg(false)}>{busy === 'reg-run' ? 'Checking…' : 'Check for changes now'}</button>
        <button className="abtn ghost" disabled={busy === 'reg-run'} onClick={() => runReg(true)} title="Re-check even unchanged pages">Force re-check</button>
        <span style={{ fontSize: 12, color: '#8a8371' }}>Seed once to baseline; after that only real changes raise an alert.</span>
      </div>
      {regMsg ? <p style={{ fontSize: 13, color: '#8a8371', margin: '0 0 6px' }}>{regMsg}</p> : null}
      {reg?.alerts?.length ? (
        <table className="adm-t" style={{ marginTop: 6 }}>
          <thead><tr><th>When</th><th>What changed</th><th>Severity</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {reg.alerts.map((a: any) => (
              <tr key={a.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(a.detected_at).toLocaleDateString()}</td>
                <td><a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontWeight: 600 }}>{a.title}</a><div style={{ fontSize: 12, opacity: .8 }}>{a.summary}</div></td>
                <td><span className={`pill ${a.severity === 'major' ? 'pending' : 'confirmed'}`}>{a.severity}</span></td>
                <td>{a.status}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {a.status === 'new' ? (
                    <>
                      <button onClick={() => setAlert(a.id, 'review')} style={{ padding: '4px 8px', borderRadius: 6, cursor: 'pointer', border: '1px solid #C9A24C', background: 'rgba(201,162,76,.15)', color: 'inherit', fontSize: 12, marginRight: 6 }}>Reviewed</button>
                      <button onClick={() => setAlert(a.id, 'dismiss')} style={{ padding: '4px 8px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--line,#e3d9c4)', background: 'transparent', color: 'inherit', fontSize: 12 }}>Dismiss</button>
                    </>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h1 style={{ fontSize: 20, marginTop: 22 }}>Agenda actualiser (living knowledge)</h1>
      <p className="sub" style={{ marginTop: 0 }}>Keeps the Agenda current: real events from public listings (with posters), and the dated events our own culture articles describe — lifted in as drafts you approve. Approved events are what articles link to, and what the concierge can point guests toward.</p>
      {ev ? (
        <div className="cards" style={{ marginBottom: 10 }}>
          <div className="stat"><div className="n">{ev.upcoming}</div><div className="k">upcoming (live)</div></div>
          <div className="stat"><div className="n">{ev.drafts}</div><div className="k">drafts to approve</div></div>
          <div className="stat"><div className="n">{ev.unmined_articles}</div><div className="k">articles to mine</div></div>
        </div>
      ) : null}
      <div className="row" style={{ marginBottom: 6, gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="abtn gold" disabled={busy.startsWith('ev-')} onClick={() => runEvents('refresh')}>{busy === 'ev-refresh' ? 'Refreshing…' : 'Refresh agenda now'}</button>
        <button className="abtn ghost" disabled={busy.startsWith('ev-')} onClick={() => runEvents('mine')}>{busy === 'ev-mine' ? 'Mining…' : 'Mine events from articles'}</button>
        <span style={{ fontSize: 12, color: '#8a8371' }}>Everything lands as drafts — approve in Admin → Agenda (translate-on-approve fills all seven editions).</span>
      </div>
      {evMsg ? <p style={{ fontSize: 13, color: '#8a8371', margin: '0 0 6px' }}>{evMsg}</p> : null}

      <h1 style={{ fontSize: 20, marginTop: 22 }}>Scrape queue ({queue.length})</h1>
      {msg ? <p style={{ fontSize: 13, color: msg.startsWith('Generation') ? '#b00020' : '#8a8371', margin: '0 0 10px' }}>{msg}</p> : null}
      <table className="adm-t">
        <thead><tr><th>Headline</th><th>Category</th><th>District</th><th></th></tr></thead>
        <tbody>
          {queue.map((r) => (
            <tr key={r.id}>
              <td>{r.original_title}</td><td>{r.category || '—'}</td><td>{r.county || '—'}</td>
              <td><button className="abtn gold" disabled={busy === r.id} onClick={() => generate(r.id)}>{busy === r.id ? 'Writing…' : 'Generate'}</button></td>
            </tr>
          ))}
          {queue.length === 0 ? <tr><td colSpan={4}>Queue empty.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 20, marginTop: 22 }}>Recent desk runs</h1>
      <table className="adm-t">
        <thead><tr><th>When</th><th>Editor</th><th>Status</th><th>ms</th><th>Humanness (EN)</th></tr></thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td>{new Date(l.created_at).toLocaleString()}</td><td>{l.editor || '—'}</td>
              <td><span className={`pill ${l.status}`}>{l.status}{l.error_stage ? `: ${l.error_stage}` : ''}</span></td>
              <td>{l.total_ms ?? '—'}</td><td>{l.en_humanness ?? '—'}</td>
            </tr>
          ))}
          {logs.length === 0 ? <tr><td colSpan={5}>No runs yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
