'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AiTab() {
  const sb = supabaseBrowser();
  const [auto, setAuto] = useState<{ scraper_enabled: boolean; processor_enabled: boolean; auto_publish: boolean }>({ scraper_enabled: false, processor_enabled: false, auto_publish: false });
  const [queue, setQueue] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [report, setReport] = useState<any>(null);

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

  return (
    <>
      <h1>AI newsroom</h1>
      <p className="sub">Automation switches, the rewrite queue and desk telemetry.</p>

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

      {(['scraper_enabled', 'processor_enabled', 'auto_publish'] as const).map((k) => (
        <div className="toggle" key={k}>
          <input type="checkbox" checked={auto[k]} onChange={() => toggle(k)} style={{ width: 'auto', margin: 0 }} />
          <div>
            <strong>{k === 'scraper_enabled' ? 'RSS scraper' : k === 'processor_enabled' ? 'AI processor' : 'Auto-publish'}</strong>
            <div style={{ fontSize: 12, color: '#8a8371' }}>
              {k === 'scraper_enabled' ? 'Hourly cron pulls new items from active feeds.' : k === 'processor_enabled' ? 'Cron rewrites queued items into 7-language drafts.' : 'Publish automatically instead of leaving drafts for review.'}
            </div>
          </div>
        </div>
      ))}

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
