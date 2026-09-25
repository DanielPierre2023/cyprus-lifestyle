'use client';
import { useState } from 'react';

// One-click repair for a single edition, from the /admin/quality worst-offenders
// table. "Clean" runs the language-aware humaniser + proofread (or a Sonnet polish
// for source editions); "Rewrite" re-reports the edition natively from the source
// (for translations that read poorly however much they're cleaned). Admin
// session-gated route; reloads on success so the score updates.
const chip: React.CSSProperties = {
  fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 11, fontWeight: 600, letterSpacing: '.03em',
  color: '#0B0E11', background: 'transparent', border: '1px solid #cfc7b3', borderRadius: 4,
  padding: '3px 9px', cursor: 'pointer', lineHeight: 1.3,
};

export default function RepairActions({ id, locale }: { id: string; locale: string }) {
  const [busy, setBusy] = useState<'' | 'clean' | 'rewrite'>('');
  const [msg, setMsg] = useState('');

  async function run(mode: 'clean' | 'rewrite') {
    setBusy(mode); setMsg('');
    try {
      const r = await fetch('/api/admin/editorial/repair', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, locale, mode }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg(d.changed ? `✓ ${d.before}→${d.after}` : `✓ clean (${d.after})`);
        setTimeout(() => location.reload(), 1000);
      } else { setMsg(d.error || 'Failed'); setBusy(''); }
    } catch (e) { setMsg((e as Error).message); setBusy(''); }
  }

  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" style={chip} disabled={!!busy} onClick={() => run('clean')} title="Humanise + copy-edit this edition in its own language">
        {busy === 'clean' ? '…' : 'Clean'}
      </button>
      <button type="button" style={chip} disabled={!!busy} onClick={() => run('rewrite')} title="Re-report this edition natively from the source (deeper)">
        {busy === 'rewrite' ? '…' : 'Rewrite'}
      </button>
      {msg && <span style={{ fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 10.5, color: msg.startsWith('✓') ? '#1c6b34' : '#9a2020' }}>{msg}</span>}
    </span>
  );
}
