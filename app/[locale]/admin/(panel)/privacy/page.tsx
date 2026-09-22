'use client';
// GDPR admin (roadmap item 12): the data-subject request queue (with the 1-month
// deadline) and the Record of Processing Activities.
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

interface Dsar { id: string; created_at: string; kind: string; name: string | null; email: string; details: string | null; status: string; due_at: string }
interface Ropa { id: string; activity: string; purpose: string; lawful_basis: string; data_categories: string; subjects: string; recipients: string; retention: string }

export default function PrivacyAdmin() {
  const sb = supabaseBrowser();
  const [dsar, setDsar] = useState<Dsar[]>([]);
  const [ropa, setRopa] = useState<Ropa[]>([]);
  const [loading, setLoading] = useState(true);
  const [eraseEmail, setEraseEmail] = useState('');
  const [erasing, setErasing] = useState('');
  const [eraseMsg, setEraseMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: d }, { data: r }] = await Promise.all([
      sb.from('dsar_requests').select('id, created_at, kind, name, email, details, status, due_at').order('created_at', { ascending: false }).limit(200),
      sb.from('data_processing_register').select('*').order('id'),
    ]);
    setDsar((d as Dsar[]) || []); setRopa((r as Ropa[]) || []); setLoading(false);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    setDsar((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    await sb.from('dsar_requests').update({ status, handled_at: new Date().toISOString() }).eq('id', id);
  }

  // Executable erasure (item 15). Destructive & irreversible → a typed confirm.
  async function erase(email: string, requestId?: string) {
    const e = (email || '').trim();
    if (!e) return;
    if (!window.confirm(`Permanently ERASE all personal data for:\n\n${e}\n\nThis deletes their records everywhere (accounting records are anonymised, kept for tax) and cannot be undone. Continue?`)) return;
    setErasing(requestId || e); setEraseMsg('');
    try {
      const res = await fetch('/api/admin/privacy/erase', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: e, requestId: requestId || null, confirm: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { setEraseMsg(`Erasure failed: ${data.error || res.status}`); return; }
      setEraseMsg(`Erased ${data.email_masked}: ${data.total} record(s) removed/anonymised across ${Object.keys(data.counts || {}).length} tables.`);
      if (!requestId) setEraseEmail('');
      load();
    } catch (err) {
      setEraseMsg((err as Error).message);
    } finally {
      setErasing('');
    }
  }

  const open = dsar.filter((d) => d.status === 'new' || d.status === 'in_progress');
  const overdue = (d: Dsar) => (d.status === 'new' || d.status === 'in_progress') && new Date(d.due_at).getTime() < Date.now();

  return (
    <>
      <h1>Privacy · GDPR</h1>
      <p className="sub">Data-subject requests (respond within one month) and the Record of Processing Activities. The public data-sourcing statement and request form are at <code>/sourcing</code>.</p>

      <h1 style={{ fontSize: 18 }}>Data-subject requests{open.length ? ` · ${open.length} open` : ''}</h1>

      {/* Executable erasure (item 15). One audited call purges a subject everywhere. */}
      <div className="row" style={{ alignItems: 'center', gap: 8, margin: '4px 0 14px', flexWrap: 'wrap' }}>
        <input placeholder="email to erase…" value={eraseEmail} onChange={(e) => setEraseEmail(e.target.value)} style={{ minWidth: 240 }} />
        <button className="abtn" disabled={!!erasing || !eraseEmail.trim()} onClick={() => erase(eraseEmail)} style={{ borderColor: '#B00020', color: '#B00020' }}>
          {erasing === eraseEmail.trim() ? 'Erasing…' : 'Erase this email'}
        </button>
        <span className="sub" style={{ margin: 0 }}>Purges personal data across all tables; keeps &amp; anonymises accounting records; reinforces opt-out; writes an audit row.</span>
        {eraseMsg ? <span className="sub" style={{ margin: 0, fontWeight: 600 }}>{eraseMsg}</span> : null}
      </div>

      <table className="adm-t">
        <thead><tr><th>When</th><th>Type</th><th>From</th><th>Details</th><th>Due</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {dsar.map((d) => (
            <tr key={d.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{new Date(d.created_at).toLocaleDateString()}</td>
              <td>{d.kind}</td>
              <td style={{ fontSize: 13 }}>{d.name ? <div>{d.name}</div> : null}<div style={{ opacity: .7 }}>{d.email}</div></td>
              <td style={{ fontSize: 13, maxWidth: 280 }}>{d.details || '—'}</td>
              <td style={{ whiteSpace: 'nowrap', color: overdue(d) ? '#B00020' : 'inherit', fontWeight: overdue(d) ? 700 : 400 }}>{new Date(d.due_at).toLocaleDateString()}{overdue(d) ? ' ⚠' : ''}</td>
              <td><span className={`pill ${d.status === 'resolved' ? 'confirmed' : 'pending'}`}>{d.status}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {d.status !== 'resolved' ? (
                  <>
                    {d.status === 'new' ? <button onClick={() => setStatus(d.id, 'in_progress')} style={b(false)}>Start</button> : null}{' '}
                    <button onClick={() => setStatus(d.id, 'resolved')} style={b(true)}>Resolve</button>{' '}
                    {d.kind === 'erasure' ? <button onClick={() => erase(d.email, d.id)} disabled={erasing === d.id} style={bDanger()}>{erasing === d.id ? 'Erasing…' : 'Erase data'}</button> : null}
                  </>
                ) : null}
              </td>
            </tr>
          ))}
          {!loading && dsar.length === 0 ? <tr><td colSpan={7}>No requests.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18 }}>Record of Processing Activities (ROPA)</h1>
      <table className="adm-t">
        <thead><tr><th>Activity</th><th>Purpose</th><th>Lawful basis</th><th>Data</th><th>Recipients</th><th>Retention</th></tr></thead>
        <tbody>
          {ropa.map((r) => (
            <tr key={r.id}>
              <td style={{ fontWeight: 600 }}>{r.activity}</td>
              <td style={{ fontSize: 13 }}>{r.purpose}</td>
              <td style={{ fontSize: 13 }}>{r.lawful_basis}</td>
              <td style={{ fontSize: 12 }}>{r.data_categories}</td>
              <td style={{ fontSize: 12 }}>{r.recipients}</td>
              <td style={{ fontSize: 12 }}>{r.retention}</td>
            </tr>
          ))}
          {!loading && ropa.length === 0 ? <tr><td colSpan={6}>Register not seeded.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}

function b(primary: boolean): React.CSSProperties {
  return { padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
    border: `1px solid ${primary ? '#C9A24C' : 'var(--line,#e3d9c4)'}`,
    background: primary ? 'rgba(201,162,76,.15)' : 'transparent', color: 'inherit' };
}
function bDanger(): React.CSSProperties {
  return { padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
    border: '1px solid #B00020', background: 'rgba(176,0,32,.08)', color: '#B00020' };
}
