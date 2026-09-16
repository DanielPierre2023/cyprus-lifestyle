'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function NewsletterTab() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const { data } = await sb.from('newsletter_campaigns').select('*').order('created_at', { ascending: false }).limit(30);
    setRows(data || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function send(locale?: string) {
    setBusy(locale || 'all'); setMsg('');
    const res = await fetch('/api/admin/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(locale ? { locale } : {}) });
    const d = await res.json();
    setBusy(''); setMsg(d.ok ? `Sent ${d.sent} emails.` : (d.error || 'Failed')); load();
  }

  return (
    <>
      <h1>Newsletter · The Dispatch</h1>
      <p className="sub">Send the weekly digest now, per edition or to all. (Cron also sends Mondays 06:00.)</p>
      <div className="row" style={{ marginBottom: 8 }}>
        <button className="abtn gold" disabled={!!busy} onClick={() => send()}>{busy === 'all' ? 'Sending…' : 'Send all editions'}</button>
        {['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'].map((l) => <button key={l} className="abtn ghost" disabled={!!busy} onClick={() => send(l)}>{busy === l ? '…' : `Send ${l}`}</button>)}
      </div>
      {msg ? <p style={{ color: '#1c6b34' }}>{msg}</p> : null}
      <table className="adm-t">
        <thead><tr><th>Subject</th><th>Edition</th><th>Status</th><th>Recipients</th><th>Sent</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td>{r.subject}</td><td>{r.target_language}</td>
              <td><span className={`pill ${r.status === 'sent' ? 'ok' : 'draft'}`}>{r.status}</span></td>
              <td>{r.recipient_count}</td><td>{r.sent_at ? new Date(r.sent_at).toLocaleString() : '—'}</td></tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={5}>No campaigns yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
