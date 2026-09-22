'use client';
// Roadmap item 14 — the admin control for LIVE concierge quality evals. On-demand
// only (every run costs model calls): a quick synchronous sample for an instant
// read, or the full set queued to the background worker. Results are written to
// concierge_evals and shown by the server-rendered tables below; after a sample we
// refresh the route so the new run appears.
import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SampleResult { n: number; pass: number; weak: number; fail: number; errors: number; avgOverall: number; runId: string; }

export default function EvalRunner() {
  const router = useRouter();
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [result, setResult] = useState<SampleResult | null>(null);

  async function run(mode: 'sample' | 'full') {
    setBusy(mode); setMsg(''); setResult(null);
    try {
      const res = await fetch('/api/admin/concierge/eval/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'full' ? { mode: 'full' } : { mode: 'sample', n: 4 }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setMsg(data.error || `Failed (${res.status})`); return; }
      if (mode === 'full') {
        setMsg(`Full eval queued (${data.total} items, run ${data.runId}). It runs in the background — refresh in a minute or two to see results.`);
      } else {
        setResult(data as SampleResult);
        setMsg(`Sample done: ${data.pass} pass · ${data.weak} weak · ${data.fail} fail (avg ${data.avgOverall}/5).`);
        setTimeout(() => router.refresh(), 800);
      }
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="row" style={{ marginBottom: 14, gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
      <button className="abtn gold" disabled={!!busy} onClick={() => run('sample')}>
        {busy === 'sample' ? 'Running sample…' : 'Run quick sample (4)'}
      </button>
      <button className="abtn" disabled={!!busy} onClick={() => run('full')}>
        {busy === 'full' ? 'Queuing…' : 'Queue full eval'}
      </button>
      {msg ? <span className="sub" style={{ margin: 0 }}>{msg}</span> : null}
      {result ? (
        <span className="sub" style={{ margin: 0 }}>
          run <code>{result.runId}</code>
        </span>
      ) : null}
    </div>
  );
}
