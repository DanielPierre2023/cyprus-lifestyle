'use client';
// The partner's answer form (no login). Posts to /api/bookings/partner; all text comes from the server in the page's language.
import { useState } from 'react';

export interface PartnerLabels {
  accept: string; quote: string; decline: string; alt: string; amount: string; note: string; noteAlt: string; send: string; sending: string;
  thanks: string; error: string; badAmount: string; needAlt: string; expired: string; closed: string; noCommit: string; current: string; statuses: Record<string, string>;
}
type Action = 'accept' | 'quote' | 'decline' | 'alternative';

export default function PartnerReplyForm({ token, labels, currentStatus }: { token: string; labels: PartnerLabels; currentStatus: string }) {
  const [action, setAction] = useState<Action>('accept');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [status, setStatus] = useState(currentStatus);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (action === 'quote' && !/^\d{1,9}([.,]\d{1,2})?$/.test(amount.trim())) { setMsg({ ok: false, text: labels.badAmount }); return; }
    if (action === 'alternative' && !note.trim()) { setMsg({ ok: false, text: labels.needAlt }); return; }
    setBusy(true);
    try {
      const res = await fetch('/api/bookings/partner', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token, action, amount, note }) });
      const j = await res.json().catch(() => ({}));
      if (res.ok && j.ok) {
        setStatus(String(j.status)); setMsg({ ok: true, text: labels.thanks });
      } else {
        const code = String(j.error || '');
        setMsg({ ok: false, text: code === 'expired' ? labels.expired : code === 'closed' ? labels.closed : labels.error });
      }
    } catch { setMsg({ ok: false, text: labels.error }); }
    setBusy(false);
  }

  const opts: [Action, string][] = [['accept', labels.accept], ['quote', labels.quote], ['alternative', labels.alt], ['decline', labels.decline]];
  const input = { width: '100%', padding: '10px 12px', border: '1px solid #d9d2bf', borderRadius: 4, font: 'inherit', background: '#fff', boxSizing: 'border-box' as const };
  return (
    <form onSubmit={submit} style={{ marginTop: 18 }}>
      {status !== 'sent' ? <p style={{ fontSize: 14.5 }}><b>{labels.current.replace('{status}', labels.statuses[status] || status)}</b></p> : null}
      <div role="radiogroup" style={{ display: 'grid', gap: 8, margin: '10px 0 14px' }}>
        {opts.map(([k, text]) => (
          <label key={k} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px', border: `1px solid ${action === k ? '#C9A24C' : '#e6e0d2'}`, borderRadius: 6, background: action === k ? 'rgba(201,162,76,.10)' : '#fff', cursor: 'pointer' }}>
            <input type="radio" name="action" value={k} checked={action === k} onChange={() => setAction(k)} /> {text}
          </label>
        ))}
      </div>
      {action === 'quote' ? (
        <label style={{ display: 'block', margin: '0 0 12px' }}>{labels.amount}
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="120.00" style={{ ...input, marginTop: 4 }} />
        </label>
      ) : null}
      <label style={{ display: 'block', margin: '0 0 12px' }}>{action === 'alternative' ? labels.noteAlt : labels.note}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} maxLength={1500} style={{ ...input, marginTop: 4 }} />
      </label>
      <button type="submit" disabled={busy} style={{ padding: '12px 26px', border: 0, borderRadius: 2, background: '#C9A24C', color: '#0B0E11', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', cursor: busy ? 'wait' : 'pointer' }}>
        {busy ? labels.sending : labels.send}
      </button>
      {msg ? <p role="status" style={{ marginTop: 12, color: msg.ok ? '#1c6b34' : '#9a2a12' }}>{msg.text}</p> : null}
      <p style={{ marginTop: 16, fontSize: 13, color: '#8a8371' }}>{labels.noCommit}</p>
    </form>
  );
}
