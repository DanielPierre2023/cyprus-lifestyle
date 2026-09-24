'use client';
import { useState } from 'react';

// Backfill the SEO + editorial package (excerpt, summary, SEO title/description,
// tags, FAQ) for a piece across all seven editions, on demand — for pieces written
// before packaging existed, or to regenerate. Admin session-gated route; reloads on
// success so the "SEO ✓" indicator updates.
const chip: React.CSSProperties = {
  fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 10, fontWeight: 600, letterSpacing: '.04em',
  color: '#C9A24C', background: 'transparent', border: '1px solid #C9A24C', borderRadius: 3,
  padding: '3px 7px', cursor: 'pointer', lineHeight: 1.2,
};

export default function PackageActions({ id, hasSeo }: { id: string; hasSeo?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  async function run() {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/editorial/package', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, all: true }),
      });
      const d = await r.json();
      if (d.ok) { setMsg(`✓ SEO ×${(d.locales || []).length || 7}`); setTimeout(() => location.reload(), 800); }
      else { setMsg(d.error || 'Failed'); setBusy(false); }
    } catch (e) { setMsg((e as Error).message); setBusy(false); }
  }

  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
      <button type="button" style={chip} disabled={busy} onClick={run} title="Generate excerpt, summary, SEO title/description, tags & FAQ in all 7 editions">
        {busy ? 'SEO…' : hasSeo ? 'Redo SEO' : 'SEO ×7'}
      </button>
      {msg && <span style={{ fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 10, color: msg.startsWith('✓') ? '#3fae6a' : '#b3654f' }}>{msg}</span>}
    </span>
  );
}
