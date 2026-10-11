'use client';
import { useState } from 'react';
import { wantsSecondPass, type RepairReply } from '@/lib/voice/cleanRun';

// One-click repair for a single edition, from the /admin/quality worst-offenders table. "Clean" is the editor's pass in the edition's
// own language (sources named, equal-size paragraphs, stock phrases); a text that moved but still fails the bar gets one more call that
// starts from the improved text. "Rewrite" re-reports the edition natively from the source edition (for editions that are far too short,
// too long or poorly translated). Both save only a real improvement. Admin session-gated route; reloads when done so the score updates.
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
      const replies: RepairReply[] = [];
      for (let pass = 1; pass <= (mode === 'clean' ? 2 : 1); pass++) {
        const r = await fetch('/api/admin/editorial/repair', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, locale, mode }),
        });
        const d = (await r.json()) as RepairReply;
        if (!d.ok) {
          if (!replies.length) { setMsg(d.error || 'Failed'); setBusy(''); return; }
          break;   // the first pass worked and is saved; the second could not run
        }
        replies.push(d);
        if (!wantsSecondPass(d)) break;
      }
      const first = replies[0]; const last = replies[replies.length - 1];
      const changed = replies.some((x) => x.changed);
      setMsg(changed
        ? `✓ ${first.before}→${last.after}${last.ok_standard ? ' · passes' : ''}${replies.length > 1 ? ' · 2 passes' : ''}`
        : `${last.note || 'No safe improvement found.'} (${last.after})`);
      setTimeout(() => location.reload(), 1000);
    } catch (e) { setMsg((e as Error).message); setBusy(''); }
  }

  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
      <button type="button" style={chip} disabled={!!busy} onClick={() => run('clean')} title="Edit this edition in its own language (up to two passes)">
        {busy === 'clean' ? '…' : 'Clean'}
      </button>
      <button type="button" style={chip} disabled={!!busy} onClick={() => run('rewrite')} title="Re-report this edition natively from the source edition (for editions far too short, too long or poorly translated)">
        {busy === 'rewrite' ? '…' : 'Rewrite'}
      </button>
      {msg && <span style={{ fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 10.5, color: msg.startsWith('✓') ? '#1c6b34' : '#9a2020' }}>{msg}</span>}
    </span>
  );
}
