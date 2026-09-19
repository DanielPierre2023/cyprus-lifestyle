'use client';
// The Concierge Membership call-to-action: starts Stripe Checkout (subscription),
// recognises an existing member by the browser cid, and lets a member on another
// device restore access by email. Card details are entered on Stripe, never here.
import { useEffect, useState } from 'react';

export interface MembershipLabels {
  cta: string; sending: string; active: string; welcome: string;
  restorePrompt: string; emailPh: string; restore: string; notConfigured: string;
}

export default function MembershipCheckout({ labels }: { labels: MembershipLabels }) {
  const [cid, setCid] = useState('');
  const [member, setMember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [welcome, setWelcome] = useState(false);

  useEffect(() => {
    let c = '';
    try {
      c = localStorage.getItem('cl_cid') || '';
      if (!c) { c = (crypto.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2)).replace(/[^A-Za-z0-9_-]/g, ''); localStorage.setItem('cl_cid', c); }
    } catch { c = ''; }
    setCid(c);
    const w = typeof location !== 'undefined' && new URLSearchParams(location.search).get('welcome') === '1';
    setWelcome(!!w);
    if (c) {
      const check = () => fetch(`/api/membership/status?cid=${encodeURIComponent(c)}`).then((r) => r.json()).then((d) => { if (d && d.member) setMember(true); }).catch(() => {});
      check();
      if (w) { setTimeout(check, 2500); setTimeout(check, 6000); } // webhook may lag a moment after checkout
    }
  }, []);

  async function join() {
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/membership/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid, email: email.includes('@') ? email : undefined }) });
      const d = await res.json();
      if (d.ok && d.url) { window.location.href = d.url; return; }
      setErr(labels.notConfigured);
    } catch { setErr(labels.notConfigured); } finally { setBusy(false); }
  }

  async function restore() {
    if (!email.includes('@')) return;
    try {
      const res = await fetch('/api/membership/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid, email }) });
      const d = await res.json();
      if (d.member) setMember(true); else setErr(labels.notConfigured);
    } catch { /* ignore */ }
  }

  if (member) {
    return <p className="mc-active">✦ {welcome ? labels.welcome : labels.active}</p>;
  }

  return (
    <div className="mc">
      <button className="btn mc-cta" onClick={join} disabled={busy}>{busy ? labels.sending : labels.cta}</button>
      {err && <p className="mc-err">{err}</p>}
      <div className="mc-restore">
        <span>{labels.restorePrompt}</span>
        <span className="mc-restore-row">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={labels.emailPh} aria-label={labels.emailPh} />
          <button type="button" onClick={restore}>{labels.restore}</button>
        </span>
      </div>
      <style>{`
        .mc{display:flex;flex-direction:column;gap:12px}
        .mc-cta{width:100%;text-align:center}
        .mc-err{color:#a3341f;font-size:13.5px;margin:0}
        .mc-active{font-family:var(--body,serif);color:#6a5a2a;font-size:16px;margin:0}
        .mc-restore{font-family:var(--sans,sans-serif);font-size:12.5px;color:#8a8371;display:flex;flex-direction:column;gap:6px}
        .mc-restore-row{display:flex;gap:6px}
        .mc-restore input{flex:1;min-width:0;font-size:14px;padding:8px 10px;border:1px solid #e0d6c1;border-radius:6px;background:#fff}
        .mc-restore input:focus{outline:none;border-color:#C9A24C}
        .mc-restore button{white-space:nowrap;font-size:13px;padding:0 12px;border:1px solid #d8ceb4;border-radius:6px;background:#fff;color:#8a7a4a;cursor:pointer}
        .mc-restore button:hover{border-color:#C9A24C}
      `}</style>
    </div>
  );
}
