'use client';
import { useState } from 'react';
import type { ScenarioResult } from '@/lib/vat/scenarios';

const eur = (cents: number | null) => (cents == null ? '—' : `€${(cents / 100).toFixed(2)}`);

type Run = { results: ScenarioResult[]; summary: { pass: number; fail: number; ready: boolean }; ranAt: string };

export default function VatCheck({ automaticTax }: { automaticTax: boolean }) {
  const [busy, setBusy] = useState(false);
  const [run, setRun] = useState<Run | null>(null);
  const [error, setError] = useState('');

  async function start() {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/admin/vat-check', { method: 'POST' });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) { setError(j.error || `Request failed (${res.status})`); setRun(null); }
      else setRun({ results: j.results, summary: j.summary, ranAt: j.ranAt });
    } catch (e) {
      setError((e as Error).message || 'Network error');
    } finally { setBusy(false); }
  }

  return (
    <>
      <p className="sub">
        Asks Stripe Tax what it would charge six typical buyers and compares the answer with the rules: businesses in <b>other EU countries</b> with a
        valid VAT number pay <b>no VAT</b> (reverse charge); <b>Cypriot</b> businesses and private persons pay <b>Cyprus VAT</b>; advertising prices are
        shown without VAT and VAT is <b>added on top</b>; the member price is <b>VAT-inclusive</b>. Nothing is charged or saved in Stripe.
        Stripe bills each check about US$0.05 (six per run ≈ US$0.30), so it only runs when you press the button.
      </p>
      <button className="abtn gold" onClick={start} disabled={busy}>{busy ? 'Checking with Stripe Tax…' : run ? 'Run the check again' : 'Run the VAT check'}</button>
      {error ? <p style={{ color: '#9a2020', marginTop: 12 }}>⚠ {error}</p> : null}

      {run ? (
        <>
          <div className="cards" style={{ marginTop: 18 }}>
            <div className="stat"><div className="n">{run.summary.pass}/{run.results.length}</div><div className="k">Scenarios passed</div></div>
            <div className="stat"><div className="n">{run.summary.ready ? 'Ready' : 'Not yet'}</div><div className="k">{run.summary.ready ? (automaticTax ? 'VAT is ON and correct' : 'Set STRIPE_AUTOMATIC_TAX=1') : 'Fix the red rows first'}</div></div>
          </div>
          <table className="adm-t">
            <thead><tr><th>Buyer</th><th>Rule</th><th>Net</th><th>VAT</th><th>Customer pays</th><th>Result</th></tr></thead>
            <tbody>
              {run.results.map((r) => (
                <tr key={r.id}>
                  <td>{r.title}</td>
                  <td style={{ fontSize: 12.5, maxWidth: 260 }}>{r.expected}</td>
                  <td>{eur(r.net)}</td>
                  <td>{eur(r.tax)}{r.ratePercent != null ? <span style={{ opacity: .6 }}> · {r.ratePercent}%</span> : null}</td>
                  <td>{eur(r.total)}</td>
                  <td style={{ maxWidth: 360 }}>
                    <span className={`pill ${r.ok ? 'ok' : 'failed'}`}>{r.ok ? 'PASS' : 'FAIL'}</span>{' '}
                    <b style={{ fontSize: 12.5 }}>{r.headline}</b>
                    {!r.ok ? <div style={{ fontSize: 12.5, marginTop: 4, color: '#6b3a3a' }}>{r.detail}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="sub" style={{ marginTop: 10 }}>Checked {new Date(run.ranAt).toLocaleString('en-GB')}. {run.summary.ready ? 'All scenarios behave as agreed.' : 'Open docs/VAT-SETUP.md → “If a scenario fails”.'}</p>
        </>
      ) : null}
    </>
  );
}
