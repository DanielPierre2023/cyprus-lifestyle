'use client';
import { useState } from 'react';

// Give a pipeline piece a matching cover, on demand: a real Unsplash photo or an AI
// illustration. Admin session-gated route — no secret in the browser. Reloads on
// success so the new thumbnail shows.
const chip = (active: boolean): React.CSSProperties => ({
  fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 10, fontWeight: 600, letterSpacing: '.04em',
  color: active ? '#0b0e11' : '#C9A24C', background: active ? '#C9A24C' : 'transparent',
  border: '1px solid #C9A24C', borderRadius: 3, padding: '3px 7px', cursor: 'pointer', lineHeight: 1.2,
});

export default function CoverActions({ id, hasCover }: { id: string; hasCover?: boolean }) {
  const [busy, setBusy] = useState<'' | 'stock' | 'ai'>('');
  const [msg, setMsg] = useState('');

  async function set(mode: 'stock' | 'ai') {
    setBusy(mode); setMsg('');
    try {
      const r = await fetch('/api/admin/editorial/cover', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, mode }),
      });
      const d = await r.json();
      if (d.ok) { setMsg(d.source === 'ai' ? '✓ AI cover' : '✓ Photo'); setTimeout(() => location.reload(), 700); }
      else { setMsg(d.error || 'Failed'); setBusy(''); }
    } catch (e) { setMsg((e as Error).message); setBusy(''); }
  }

  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" style={chip(false)} disabled={!!busy} onClick={() => set('stock')}>
        {busy === 'stock' ? '…' : hasCover ? 'Rephoto' : 'Photo'}
      </button>
      <button type="button" style={chip(false)} disabled={!!busy} onClick={() => set('ai')}>
        {busy === 'ai' ? '…' : 'AI image'}
      </button>
      {msg && <span style={{ fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 10, color: msg.startsWith('✓') ? '#3fae6a' : '#b3654f' }}>{msg}</span>}
    </span>
  );
}
