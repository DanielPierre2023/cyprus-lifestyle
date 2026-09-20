'use client';
// Concierge Requests inbox — every "arrange it / connect me" request the concierge
// captured, so nothing is a dead end. Read + status management (admin RLS, 0063).
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

interface Pick { slug?: string; name?: string; why?: string }
interface Row {
  id: string; created_at: string; locale: string; query: string; answer: string | null;
  picks: Pick[] | null; name: string | null; email: string | null; phone: string | null;
  note: string | null; category: string | null; district: string | null; status: string;
}
const STATUSES = ['new', 'routed', 'fulfilled', 'closed'] as const;
const NEXT: Record<string, string> = { new: 'routed', routed: 'fulfilled', fulfilled: 'closed', closed: 'new' };

export default function RequestsInbox() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState<string>('open');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from('concierge_requests')
      .select('id, created_at, locale, query, answer, picks, name, email, phone, note, category, district, status')
      .order('created_at', { ascending: false }).limit(500);
    setRows((data as Row[]) || []);
    setLoading(false);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    await sb.from('concierge_requests').update({ status, handled_at: new Date().toISOString() }).eq('id', id);
  }

  const counts: Record<string, number> = {};
  rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const withContact = rows.filter((r) => r.email || r.phone).length;
  const gaps = rows.filter((r) => !r.picks || r.picks.length === 0).length;

  const shown = rows.filter((r) =>
    filter === 'all' ? true : filter === 'open' ? (r.status === 'new' || r.status === 'routed') : r.status === filter);

  return (
    <>
      <h1>Concierge Requests</h1>
      <p className="sub">Every request a guest asked the concierge to arrange or route. Contact left = a warm lead; no picks = a demand gap to fill in the directory.</p>

      <div className="cards">
        <div className="stat"><div className="n">{counts['new'] || 0}</div><div className="k">new</div></div>
        <div className="stat"><div className="n">{counts['routed'] || 0}</div><div className="k">routed</div></div>
        <div className="stat"><div className="n">{counts['fulfilled'] || 0}</div><div className="k">fulfilled</div></div>
        <div className="stat"><div className="n">{withContact}</div><div className="k">with contact</div></div>
        <div className="stat"><div className="n">{gaps}</div><div className="k">demand gaps</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '14px 0' }}>
        {['open', 'new', 'routed', 'fulfilled', 'closed', 'all'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 12px', borderRadius: 999, cursor: 'pointer', textTransform: 'capitalize',
              border: `1px solid ${filter === f ? '#C9A24C' : 'var(--line,#e3d9c4)'}`,
              background: filter === f ? 'rgba(201,162,76,.12)' : 'transparent', color: 'inherit' }}>{f}</button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: '1px solid var(--line,#e3d9c4)', background: 'transparent', color: 'inherit' }}>↻ Refresh</button>
      </div>

      <table className="adm-t">
        <thead><tr><th>When</th><th>Request</th><th>Contact</th><th>Suggested</th><th>Lang</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.created_at).toLocaleDateString()}<br /><span style={{ opacity: .6, fontSize: 12 }}>{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></td>
              <td style={{ maxWidth: 360 }}>
                <div style={{ fontWeight: 600 }}>{r.query}</div>
                {r.note ? <div style={{ fontSize: 13, opacity: .8, marginTop: 3 }}>{r.note}</div> : null}
                {(r.category || r.district) ? <div style={{ fontSize: 11, opacity: .6, marginTop: 3 }}>{[r.category, r.district].filter(Boolean).join(' · ')}</div> : null}
              </td>
              <td>
                {r.email || r.phone ? (
                  <div style={{ fontSize: 13 }}>
                    {r.name ? <div>{r.name}</div> : null}
                    {r.email ? <div><a href={`mailto:${r.email}`}>{r.email}</a></div> : null}
                    {r.phone ? <div><a href={`https://wa.me/${r.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer">{r.phone}</a></div> : null}
                  </div>
                ) : <span className="pill pending">demand signal</span>}
              </td>
              <td style={{ fontSize: 12, maxWidth: 200 }}>{r.picks && r.picks.length ? r.picks.map((p) => p.name || p.slug).filter(Boolean).join(', ') : <span className="pill pending">gap — none</span>}</td>
              <td>{r.locale}</td>
              <td><span className={`pill ${r.status === 'fulfilled' || r.status === 'closed' ? 'confirmed' : 'pending'}`}>{r.status}</span></td>
              <td><button onClick={() => setStatus(r.id, NEXT[r.status] || 'routed')}
                style={{ padding: '5px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--line,#e3d9c4)', background: 'transparent', color: 'inherit', whiteSpace: 'nowrap' }}>
                → {NEXT[r.status] || 'routed'}</button></td>
            </tr>
          ))}
          {!loading && shown.length === 0 ? <tr><td colSpan={7}>No requests in this view.</td></tr> : null}
          {loading ? <tr><td colSpan={7}>Loading…</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
