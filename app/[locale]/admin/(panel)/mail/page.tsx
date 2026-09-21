'use client';
// Backend mailroom — every email received at @cypruslifestyle.eu (via Resend
// inbound → /api/email/inbound) lands here to read and reply, so mail is
// administered from the backend. Admin RLS (0076).
import { useEffect, useState, useCallback, Fragment } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

interface Row {
  id: string; created_at: string; received_at: string | null; from_email: string; from_name: string | null;
  to_email: string | null; subject: string | null; text_body: string | null; html_body: string | null;
  cc: string | null; status: string;
}

export default function MailInbox() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState('open');
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await sb.from('inbound_emails')
      .select('id, created_at, received_at, from_email, from_name, to_email, subject, text_body, html_body, cc, status')
      .order('created_at', { ascending: false }).limit(500);
    setRows((data as Row[]) || []);
    setLoading(false);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    await sb.from('inbound_emails').update({ status, handled_at: new Date().toISOString() }).eq('id', id);
  }
  async function openMsg(r: Row) {
    const next = openId === r.id ? null : r.id;
    setOpenId(next); setReply(''); setMsg('');
    if (next && r.status === 'new') setStatus(r.id, 'read');
  }
  async function sendReply(r: Row) {
    if (reply.trim().length < 1) return;
    setSending(true); setMsg('');
    try {
      const res = await fetch('/api/admin/mail/reply', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: r.id, to: r.from_email, from_address: r.to_email, subject: `Re: ${r.subject || ''}`.trim(), message: reply }),
      });
      const d = await res.json();
      if (!res.ok || !d.ok) setMsg('Send failed: ' + (d.error || res.status));
      else { setMsg('✓ Reply sent.'); setReply(''); setRows((rs) => rs.map((x) => x.id === r.id ? { ...x, status: 'replied' } : x)); }
    } catch (e) { setMsg('Error: ' + (e as Error).message); }
    setSending(false);
  }

  const counts: Record<string, number> = {};
  rows.forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
  const shown = rows.filter((r) => {
    if (filter === 'all') return true;
    if (filter === 'open') return r.status === 'new' || r.status === 'read';
    return r.status === filter;
  });

  return (
    <>
      <h1>Mail</h1>
      <p className="sub">Every email received at @cypruslifestyle.eu, administered here. Open a message to read it and reply — replies send from your own address via Resend.</p>

      <div className="cards">
        <div className="stat"><div className="n">{counts['new'] || 0}</div><div className="k">new</div></div>
        <div className="stat"><div className="n">{counts['read'] || 0}</div><div className="k">read</div></div>
        <div className="stat"><div className="n">{counts['replied'] || 0}</div><div className="k">replied</div></div>
        <div className="stat"><div className="n">{rows.length}</div><div className="k">total</div></div>
      </div>

      <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap' }}>
        {['open', 'new', 'read', 'replied', 'archived', 'all'].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '6px 12px', borderRadius: 999, cursor: 'pointer', textTransform: 'capitalize',
              border: `1px solid ${filter === f ? '#C9A24C' : 'var(--line,#e3d9c4)'}`,
              background: filter === f ? 'rgba(201,162,76,.12)' : 'transparent', color: 'inherit' }}>{f}</button>
        ))}
        <button onClick={load} style={{ marginLeft: 'auto', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: '1px solid var(--line,#e3d9c4)', background: 'transparent', color: 'inherit' }}>↻ Refresh</button>
      </div>

      <table className="adm-t">
        <thead><tr><th>When</th><th>From</th><th>To</th><th>Subject</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {shown.map((r) => (
            <Fragment key={r.id}>
              <tr style={{ cursor: 'pointer' }} onClick={() => openMsg(r)}>
                <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.received_at || r.created_at).toLocaleDateString()}</td>
                <td>{r.from_name ? <div>{r.from_name}</div> : null}<div style={{ fontSize: 12, opacity: .7 }}>{r.from_email}</div></td>
                <td style={{ fontSize: 12, opacity: .8 }}>{r.to_email || '—'}</td>
                <td style={{ fontWeight: r.status === 'new' ? 700 : 400 }}>{r.subject || '(no subject)'}</td>
                <td><span className={`pill ${r.status === 'replied' ? 'confirmed' : 'pending'}`}>{r.status}</span></td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.status !== 'archived' ? <button onClick={(e) => { e.stopPropagation(); setStatus(r.id, 'archived'); }} style={{ padding: '4px 8px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--line,#e3d9c4)', background: 'transparent', color: 'inherit', fontSize: 12 }}>Archive</button> : null}</td>
              </tr>
              {openId === r.id ? (
                <tr>
                  <td colSpan={6} style={{ background: 'rgba(201,162,76,.05)' }}>
                    <div style={{ padding: '8px 6px', maxWidth: 760 }}>
                      <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.6, marginBottom: 14 }}>
                        {r.text_body || (r.html_body ? r.html_body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '(no text body)')}
                      </div>
                      <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder={`Reply to ${r.from_email}…`}
                        rows={5} style={{ width: '100%', maxWidth: 720, padding: 10, borderRadius: 6, border: '1px solid var(--line,#e3d9c4)', background: 'var(--paper,#fff)', color: 'inherit', fontFamily: 'inherit', fontSize: 14 }} />
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8 }}>
                        <button onClick={() => sendReply(r)} disabled={sending || reply.trim().length < 1}
                          style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer', border: '1px solid #C9A24C', background: 'rgba(201,162,76,.15)', color: 'inherit', fontWeight: 600 }}>
                          {sending ? 'Sending…' : `Reply from ${r.to_email || 'us'} →`}</button>
                        {msg ? <span style={{ fontSize: 13, opacity: .8 }}>{msg}</span> : null}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
          {!loading && shown.length === 0 ? <tr><td colSpan={6}>No mail in this view.</td></tr> : null}
          {loading ? <tr><td colSpan={6}>Loading…</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
