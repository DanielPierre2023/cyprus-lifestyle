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
    const H = { 'Content-Type': 'application/json' };
    try {
      const r = await fetch('/api/admin/editorial/idea', {
        method: 'POST', headers: H,
        body: JSON.stringify({ id, action, reason: action === 'reject' ? 'Not a fit' : undefined }),
      });
      const d = await r.json();
      if (!d.ok) { setState('err'); setMsg(d.error || 'Failed'); return; }

      // Auto-draft on: the cockpit triggers the draft as a second request (its own 60s).
      if (action === 'approve' && d.autoDraft && d.blogPostId) {
        setMsg('Approved · drafting… (up to a minute)');
        try {
          const r2 = await fetch('/api/admin/editorial/draft', { method: 'POST', headers: H, body: JSON.stringify({ id: d.blogPostId }) });
          const d2 = await r2.json();
          setState('done');
          setMsg(d2.ok ? `Drafted · ${d2.words || ''} words — now in Editing` : `Approved; draft failed: ${d2.error || 'unknown'}`);
        } catch { setState('done'); setMsg('Approved; the draft is still running.'); }
        setTimeout(() => location.reload(), 1400);
        return;
      }

      setState('done');
      setMsg(action === 'approve' ? 'Approved · commissioned' : 'Rejected');
      setTimeout(() => location.reload(), 900);
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
