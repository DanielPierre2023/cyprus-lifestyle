'use client';
// The Concierge Membership call-to-action: starts Stripe Checkout (subscription),
// recognises an existing member by the browser cid, and lets a member on another
// device restore access through an EMAIL-VERIFIED link (request → check inbox → open the
// link, which this component confirms with a POST). Card details are entered on Stripe.
import { useEffect, useRef, useState } from 'react';

export interface MembershipLabels {
  cta: string; sending: string; active: string; welcome: string;
  restorePrompt: string; emailPh: string; restore: string; notConfigured: string;
  restoreBusy: string; restoreSent: string; restoreInvalid: string; restoreError: string;
  confirming: string; confirmOk: string; confirmExpired: string; confirmInvalid: string; confirmError: string;
}

// The cid is a bearer secret (server requires 32–64 chars of [A-Za-z0-9_-]).
const CID_OK = /^[A-Za-z0-9_-]{32,64}$/;
function newCid(): string {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch { /* insecure context */ }
  const b = new Uint8Array(24); crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export default function MembershipCheckout({ labels, locale }: { labels: MembershipLabels; locale: string }) {
  const [cid, setCid] = useState('');
  const [member, setMember] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [email, setEmail] = useState('');
  const [welcome, setWelcome] = useState(false);
  const [sent, setSent] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [restoredNow, setRestoredNow] = useState(false);
  const [notice, setNotice] = useState('');
  const confirmed = useRef(false);

  useEffect(() => {
    let c = '';
    try {
      c = localStorage.getItem('cl_cid') || '';
      if (!CID_OK.test(c)) { c = newCid(); localStorage.setItem('cl_cid', c); }
    } catch { c = ''; }
    setCid(c);

    // Opened from the emailed restore link: confirm with a POST (never a GET, so mail
    // scanners can't consume the token). The membership binds to THIS browser's cid.
    let token = '';
    try { token = new URLSearchParams(location.search).get('restore') || ''; } catch { token = ''; }
    if (token && !confirmed.current) {
      confirmed.current = true;
      try { // drop the secret from the address bar/history straight away
        const u = new URL(location.href); u.searchParams.delete('restore');
        history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
      } catch { /* ignore */ }
      if (!c) { setErr(labels.confirmError); return; }
      setRestoring(true);
      fetch('/api/membership/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, cid: c }) })
        .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
        .then(({ ok, d }) => {
          if (ok && d && d.ok && d.member !== false) { setMember(true); setRestoredNow(true); return; }
          setErr(d && d.error === 'expired' ? labels.confirmExpired : d && d.error === 'unavailable' ? labels.confirmError : labels.confirmInvalid);
        })
        .catch(() => setErr(labels.confirmError))
        .finally(() => setRestoring(false));
      return;
    }
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
      const res = await fetch('/api/membership/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid, email: email.includes('@') ? email : undefined, locale: document.documentElement.lang || 'en' }) });
      const d = await res.json();
      if (d.ok && d.url) { window.location.href = d.url; return; }
      setErr(labels.notConfigured);
    } catch { setErr(labels.notConfigured); } finally { setBusy(false); }
  }

  async function restore() {
    if (busy) return;
    setNotice('');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setNotice(labels.restoreInvalid); return; }
    setBusy(true); setErr('');
    try {
      // Same answer whether or not the address is a member — we never reveal that.
      const res = await fetch('/api/membership/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), locale }) });
      if (res.ok) setSent(true);
      else setNotice(res.status === 400 ? labels.restoreInvalid : labels.restoreError);
    } catch { setNotice(labels.restoreError); } finally { setBusy(false); }
  }

  if (member) {
    return <p className="mc-active" role="status">✦ {restoredNow ? labels.confirmOk : welcome ? labels.welcome : labels.active}</p>;
  }
  if (restoring) return <p className="mc-active" role="status" aria-live="polite">{labels.confirming}</p>;

  return (
    <div className="mc">
      <button className="btn mc-cta" onClick={join} disabled={busy}>{busy ? labels.sending : labels.cta}</button>
      {err && <p className="mc-err">{err}</p>}
      <div className="mc-restore">
        {sent ? (
          <span role="status" aria-live="polite">{labels.restoreSent}</span>
        ) : (
          <>
            <span>{labels.restorePrompt}</span>
            <span className="mc-restore-row">
              <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') restore(); }} placeholder={labels.emailPh} aria-label={labels.emailPh} />
              <button type="button" onClick={restore} disabled={busy}>{busy ? labels.restoreBusy : labels.restore}</button>
            </span>
            {notice && <span className="mc-err" role="alert">{notice}</span>}
          </>
        )}
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
