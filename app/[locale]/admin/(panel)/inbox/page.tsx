'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function InboxTab() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [lang, setLang] = useState('en');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(100);
    setRows(data || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) { await sb.from('contact_messages').update({ status: 'read' }).eq('id', id); load(); }
  async function send(id: string) {
    setBusy(true);
    const res = await fetch('/api/admin/inbox', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, reply, language: lang }) });
    setBusy(false);
    if (res.ok) { setOpen(null); setReply(''); load(); } else alert((await res.json()).error || 'Send failed');
  }

  return (
    <>
      <h1>Inbox</h1>
      <p className="sub">Messages from the contact form.</p>
      <table className="adm-t">
        <thead><tr><th>From</th><th>Subject</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id}>
              <td>{m.name}<br /><span style={{ color: '#8a8371', fontSize: 12 }}>{m.email}</span></td>
              <td>{m.subject || '—'}<div style={{ color: '#6b6552', fontSize: 12, maxWidth: 380 }}>{m.message.slice(0, 160)}</div>
                {open === m.id ? (
                  <div style={{ marginTop: 8 }}>
                    <select value={lang} onChange={(e) => setLang(e.target.value)} style={{ width: 120 }}><option>en</option><option>el</option><option>ro</option><option>ar</option></select>
                    <textarea rows={3} placeholder="Your reply…" value={reply} onChange={(e) => setReply(e.target.value)} />
                    <button className="abtn gold" disabled={busy} onClick={() => send(m.id)}>{busy ? 'Sending…' : 'Send reply'}</button>
                  </div>
                ) : null}
              </td>
              <td><span className={`pill ${m.status}`}>{m.status}</span></td>
              <td>
                <button className="abtn ghost" onClick={() => { setOpen(open === m.id ? null : m.id); setReply(m.admin_reply || ''); }}>{open === m.id ? 'Close' : 'Reply'}</button>
                {m.status === 'unread' ? <button className="abtn ghost" onClick={() => markRead(m.id)}>Mark read</button> : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={4}>Inbox empty.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
