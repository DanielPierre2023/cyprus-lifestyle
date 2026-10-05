'use client';
import { useCallback, useEffect, useState } from 'react';

// Admin → Business Hub: the moderation queue for proposals that businesses send about their own listing.
// Served and written by /api/admin/business (admin session only). English only.
interface Row {
  id: string; account_email: string; listing_slug: string; listing_name: string; kind: 'description' | 'photos' | 'news';
  payload: Record<string, unknown>; status: string; desk_note: string | null; created_at: string; reviewed_at: string | null; applied_at: string | null;
  current_description: string; current_photos: string[]; owner_still_verified: boolean;
}
const STATUSES = ['submitted', 'changes_requested', 'approved', 'rejected', 'withdrawn', 'all'] as const;
const d = (s: string | null) => (s ? new Date(s).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function BusinessHubTab() {
  const [rows, setRows] = useState<Row[]>([]);
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('submitted');
  const [accounts, setAccounts] = useState(0);
  const [waiting, setWaiting] = useState(0);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const r = await fetch(`/api/admin/business?status=${status}`, { cache: 'no-store' }).then((x) => x.json()).catch(() => null);
    if (!r?.ok) { setErr(r?.error || 'Could not load the queue (is migration 20261006120000_business_hub applied?).'); return; }
    setErr(''); setRows(r.rows); setAccounts(r.accounts); setWaiting(r.waiting);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function decide(id: string, action: 'approve' | 'reject' | 'request_changes') {
    setBusy(id); setMsg(''); setErr('');
    const r = await fetch('/api/admin/business', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action, note: notes[id] || '' }) }).then((x) => x.json()).catch(() => null);
    setBusy('');
    if (!r?.ok) { setErr(r?.error || 'Failed.'); return; }
    setMsg(action === 'approve' ? (r.applied ? `Approved and applied to the listing (${r.applied}).` : 'Approved. Nothing is published automatically: follow up with the business.') : action === 'reject' ? 'Rejected.' : 'Sent back for changes.');
    await load();
  }

  return (
    <>
      <h1>Business Hub</h1>
      <p className="sub">Proposals that verified businesses send about their own listing. Approving a description or photo proposal writes it to the listing; a news proposal publishes nothing by itself. Rejections and change requests need a short note, which the business sees.</p>
      <div className="cards">
        <div className="stat"><div className="n">{waiting}</div><div className="k">Waiting for the desk</div></div>
        <div className="stat"><div className="n">{accounts}</div><div className="k">Business accounts</div></div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        {STATUSES.map((s) => <button key={s} className={status === s ? 'abtn' : 'abtn ghost'} onClick={() => setStatus(s)}>{s.replace('_', ' ')}</button>)}
      </div>
      {msg ? <p className="sub" style={{ color: '#1c6b34' }}>{msg}</p> : null}
      {err ? <p className="sub" style={{ color: '#9a2020' }}>{err}</p> : null}
      {rows.length === 0 && !err ? <p className="sub">Nothing here.</p> : null}
      {rows.map((r) => (
        <div key={r.id} style={{ border: '1px solid #e6e0d2', borderRadius: 6, padding: '14px 16px', background: '#fff', marginBottom: 12 }}>
          <div><b>{r.listing_name}</b> <span className="sub" style={{ margin: 0 }}>· {r.kind} · {r.status.replace('_', ' ')} · {d(r.created_at)}</span></div>
          <div className="sub" style={{ margin: '2px 0 8px' }}>From {r.account_email}{r.owner_still_verified ? '' : ' (NOT the verified owner any more: reject)'}</div>
          {r.kind === 'description' ? (
            <>
              <div className="sub" style={{ margin: '0 0 2px' }}>Proposed</div>
              <p style={{ margin: '0 0 8px', whiteSpace: 'pre-wrap' }}>{String(r.payload.text || '')}</p>
              <div className="sub" style={{ margin: '0 0 2px' }}>Currently shown</div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#6b6555' }}>{r.current_description || '—'}</p>
            </>
          ) : r.kind === 'photos' ? (
            <>
              <div className="sub" style={{ margin: '0 0 2px' }}>Proposed photo list (replaces the current one)</div>
              <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>{((r.payload.urls as string[]) || []).map((u) => <li key={u}><a href={u} target="_blank" rel="noreferrer noopener">{u}</a></li>)}</ul>
              <div className="sub" style={{ margin: '0 0 2px' }}>Current ({r.current_photos.length})</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#6b6555' }}>{r.current_photos.map((u) => <li key={u}>{u}</li>)}</ul>
            </>
          ) : (
            <>
              <p style={{ margin: '0 0 4px' }}><b>{String(r.payload.title || '')}</b></p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{String(r.payload.body || '')}</p>
              {r.payload.url ? <p style={{ margin: '4px 0 0' }}><a href={String(r.payload.url)} target="_blank" rel="noreferrer noopener">{String(r.payload.url)}</a></p> : null}
            </>
          )}
          {r.desk_note ? <p className="sub" style={{ marginTop: 8 }}>Desk note: {r.desk_note} ({d(r.reviewed_at)})</p> : null}
          {r.status === 'submitted' ? (
            <div className="row" style={{ marginTop: 10 }}>
              <input value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} placeholder="Note to the business (required to reject or request changes)" style={{ flex: 1, minWidth: 220 }} maxLength={500} />
              <button className="abtn" disabled={busy === r.id} onClick={() => decide(r.id, 'approve')}>Approve</button>
              <button className="abtn ghost" disabled={busy === r.id} onClick={() => decide(r.id, 'request_changes')}>Request changes</button>
              <button className="abtn ghost" disabled={busy === r.id} onClick={() => decide(r.id, 'reject')}>Reject</button>
            </div>
          ) : null}
        </div>
      ))}
    </>
  );
}
