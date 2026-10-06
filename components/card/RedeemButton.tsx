'use client';
// "Redeem" for venue staff on the public verification page. One press = one logged redemption (offer + time).
import { useState } from 'react';

export interface RedeemLabels { redeem: string; redeeming: string; redeemed: string; already: string; unavailable: string; rateLimited: string; error: string }

export function RedeemButton({ token, offerId, done, labels }: { token: string; offerId: string; done: boolean; labels: RedeemLabels }) {
  const [state, setState] = useState<'idle' | 'busy' | 'ok' | 'already' | 'unavailable' | 'rate' | 'error'>(done ? 'already' : 'idle');
  async function press() {
    if (state === 'busy') return;
    setState('busy');
    try {
      const r = await fetch('/api/card/redeem', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, offerId }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok) setState('ok');
      else if (d.code === 'already') setState('already');
      else if (d.code === 'unavailable') setState('unavailable');
      else if (d.code === 'rate_limited') setState('rate');
      else setState('error');
    } catch { setState('error'); }
  }
  const msg = state === 'ok' ? labels.redeemed : state === 'already' ? labels.already : state === 'unavailable' ? labels.unavailable : state === 'rate' ? labels.rateLimited : state === 'error' ? labels.error : '';
  const locked = state === 'ok' || state === 'already' || state === 'unavailable';
  return (
    <div style={{ marginTop: 8 }}>
      <button type="button" onClick={press} disabled={state === 'busy' || locked}
        style={{ fontSize: 15, padding: '11px 20px', border: '1px solid #C9A24C', borderRadius: 6, background: locked ? '#e8e0cc' : '#C9A24C', color: '#0B0E11', fontWeight: 600, cursor: locked ? 'default' : 'pointer' }}>
        {state === 'busy' ? labels.redeeming : labels.redeem}
      </button>
      {msg ? <p role="status" style={{ margin: '8px 0 0', fontSize: 14.5, color: state === 'ok' ? '#1c6b34' : '#6b6555' }}>{msg}</p> : null}
    </div>
  );
}
