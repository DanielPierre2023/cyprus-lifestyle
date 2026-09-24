'use client';
import { useState } from 'react';

// Approve / reject a planner suggestion from the Idea Board. Calls the admin
// session-gated route (no secret in the browser) and refreshes on success.
const btn = (bg: string): React.CSSProperties => ({
  fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '.04em',
  color: '#0b0e11', background: bg, border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer',
});

export default function IdeaActions({ id }: { id: string }) {
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'err'>('idle');
  const [msg, setMsg] = useState('');

  async function act(action: 'approve' | 'reject') {
    setState('busy'); setMsg('');
    try {
      const r = await fetch('/api/admin/editorial/idea', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action, reason: action === 'reject' ? 'Not a fit' : undefined }),
      });
      const d = await r.json();
      if (d.ok) {
        setState('done');
        setMsg(action === 'approve' ? (d.autoDrafted ? 'Approved · drafted' : 'Approved · commissioned') : 'Rejected');
        setTimeout(() => location.reload(), 800);
      } else { setState('err'); setMsg(d.error || 'Failed'); }
    } catch (e) { setState('err'); setMsg((e as Error).message); }
  }

  if (state === 'done') return <span style={{ color: '#3fae6a', fontSize: 12, fontWeight: 600 }}>✓ {msg}</span>;
  return (
    <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
      <button disabled={state === 'busy'} onClick={() => act('approve')} style={btn('#C9A24C')}>{state === 'busy' ? '…' : 'Approve'}</button>
      <button disabled={state === 'busy'} onClick={() => act('reject')} style={{ ...btn('transparent'), color: '#b3654f', border: '1px solid rgba(179,101,79,.5)' }}>Reject</button>
      {state === 'err' && <span style={{ color: '#b3402f', fontSize: 11 }}>{msg}</span>}
    </span>
  );
}
