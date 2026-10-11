'use client';
import { useState } from 'react';
import { wantsSecondPass, outcomeOf, tally, summaryLine, type RepairReply } from '@/lib/voice/cleanRun';

// Bulk repair from /admin/quality: clean every flagged edition in the list, one at a time (each call is its own bounded model pass,
// so we sequence them and show progress). An edition that moved but still fails the bar gets one more call, which starts from the
// improved text. Idempotent: cleaning an already-clean edition is a cheap no-op. The summary counts what really got better, not
// how many calls went through. Reloads at the end.
export interface Target { id: string; locale: string }

const btn: React.CSSProperties = {
  fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '.04em',
  color: '#0b0e11', background: '#C9A24C', border: 'none', borderRadius: 4, padding: '8px 14px', cursor: 'pointer',
};

async function cleanOne(t: Target): Promise<Array<RepairReply | null>> {
  const replies: Array<RepairReply | null> = [];
  for (let pass = 1; pass <= 2; pass++) {
    let d: RepairReply | null = null;
    try {
      const r = await fetch('/api/admin/editorial/repair', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, locale: t.locale, mode: 'clean' }),
      });
      d = (await r.json()) as RepairReply;
    } catch { d = null; /* keep going; idempotent */ }
    replies.push(d);
    if (!wantsSecondPass(d)) break;
  }
  return replies;
}

export default function QualityBulkClean({ targets }: { targets: Target[] }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(0);
  const [msg, setMsg] = useState('');

  async function run() {
    if (!targets.length) return;
    setBusy(true); setDone(0); setMsg('');
    const outcomes: Array<ReturnType<typeof outcomeOf>> = [];
    for (let i = 0; i < targets.length; i++) {
      outcomes.push(outcomeOf(await cleanOne(targets[i])));
      setDone(i + 1);
    }
    setMsg(`${summaryLine(tally(outcomes))} Refreshing…`);
    setTimeout(() => location.reload(), 2500);
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
