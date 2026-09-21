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

  const open = dsar.filter((d) => d.status === 'new' || d.status === 'in_progress');
  const overdue = (d: Dsar) => (d.status === 'new' || d.status === 'in_progress') && new Date(d.due_at).getTime() < Date.now();

  return (
    <>
      <h1>Privacy · GDPR</h1>
      <p className="sub">Data-subject requests (respond within one month) and the Record of Processing Activities. The public data-sourcing statement and request form are at <code>/sourcing</code>.</p>

      <h1 style={{ fontSize: 18 }}>Data-subject requests{open.length ? ` · ${open.length} open` : ''}</h1>
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
                    <button onClick={() => setStatus(d.id, 'resolved')} style={b(true)}>Resolve</button>
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
