'use client';
import { useState } from 'react';

// Bulk repair from /admin/quality: clean every flagged edition in the list, one at a
// time (each is its own bounded model pass, so we sequence them and show progress).
// Idempotent — cleaning an already-clean edition is a cheap no-op. Reloads at the end.
export interface Target { id: string; locale: string }

const btn: React.CSSProperties = {
  fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '.04em',
  color: '#0b0e11', background: '#C9A24C', border: 'none', borderRadius: 4, padding: '8px 14px', cursor: 'pointer',
};

export default function QualityBulkClean({ targets }: { targets: Target[] }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState('');

  async function run() {
    if (!targets.length) return;
    setBusy(true); setDone(0); setMsg('');
    let ok = 0;
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      try {
        const r = await fetch('/api/admin/editorial/repair', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, locale: t.locale, mode: 'clean' }),
        });
        const d = await r.json();
        if (d.ok) ok++;
      } catch { /* keep going; idempotent */ }
      setDone(i + 1);
    }
    setMsg(`Cleaned ${ok}/${targets.length}. Refreshing…`);
    setTimeout(() => location.reload(), 1200);
  }

  if (!targets.length) return null;
  return (
    <span style={{ display: 'inline-flex', gap: 10, alignItems: 'center' }}>
      <button type="button" style={{ ...btn, opacity: busy ? 0.7 : 1 }} disabled={busy} onClick={run}>
        {busy ? `Cleaning ${done}/${targets.length}…` : `Clean all flagged (${targets.length})`}
      </button>
      {msg && <span className="sub" style={{ margin: 0, color: '#1c6b34' }}>{msg}</span>}
    </span>
  );
}
