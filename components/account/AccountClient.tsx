'use client';
// The account page's interactive parts: sign-in form, link confirmation, and the signed-in panel actions.
import { useEffect, useRef, useState } from 'react';

export interface AccountLabels {
  emailPh: string; send: string; sending: string; sent: string; invalid: string; error: string;
  confirming: string; confirmExpired: string; confirmInvalid: string; confirmError: string;
  manageBilling: string; billingOpening: string; billingError: string; noBilling: string; rejoin: string;
  forget: string; forgetConfirm: string; forgetDone: string; signOut: string; signOutAll: string;
}

const CID_OK = /^[A-Za-z0-9_-]{32,64}$/;
function newCid(): string {
  try { if (crypto.randomUUID) return crypto.randomUUID(); } catch { /* insecure context */ }
  const b = new Uint8Array(24); crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}
function browserCid(): string {
  try {
    let c = localStorage.getItem('cl_cid') || '';
    if (!CID_OK.test(c)) { c = newCid(); localStorage.setItem('cl_cid', c); }
    return c;
  } catch { return ''; }
}
const home = (locale: string) => `${locale === 'en' ? '' : `/${locale}`}/account`;

const css = `
.ac{font-family:var(--sans,sans-serif);display:flex;flex-direction:column;gap:12px;max-width:520px}
.ac-row{display:flex;gap:8px;flex-wrap:wrap}
.ac input[type=email]{flex:1;min-width:200px;font-size:15px;padding:11px 12px;border:1px solid #e0d6c1;border-radius:6px;background:#fff}
.ac input:focus{outline:none;border-color:#C9A24C}
.ac-btn{font-size:14px;padding:11px 18px;border:1px solid #C9A24C;border-radius:6px;background:#C9A24C;color:#0B0E11;cursor:pointer;font-weight:600}
.ac-btn:disabled{opacity:.55;cursor:default}
.ac-ghost{font-size:13.5px;padding:9px 14px;border:1px solid #d8ceb4;border-radius:6px;background:#fff;color:#6a5a2a;cursor:pointer}
.ac-ghost:hover{border-color:#C9A24C}
.ac-ok{color:#1c6b34;font-size:14.5px;margin:0}.ac-err{color:#a3341f;font-size:14px;margin:0}
`;

export function AccountSignIn({ labels, locale, notice }: { labels: AccountLabels; locale: string; notice?: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState(notice || '');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setMsg(labels.invalid); return; }
    setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/membership/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), locale }) });
      if (res.ok) setSent(true); else setMsg(res.status === 400 ? labels.invalid : labels.error);
    } catch { setMsg(labels.error); } finally { setBusy(false); }
  }
  return (
    <form className="ac" onSubmit={submit} noValidate>
      {sent ? <p className="ac-ok" role="status">{labels.sent}</p> : (
        <>
          <div className="ac-row">
            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={labels.emailPh} aria-label={labels.emailPh} />
            <button className="ac-btn" type="submit" disabled={busy}>{busy ? labels.sending : labels.send}</button>
          </div>
          {msg ? <p className="ac-err" role="alert">{msg}</p> : null}
        </>
      )}
      <style>{css}</style>
    </form>
  );
}

/** Opened from the e-mailed link: confirm with a POST (never a GET, so mail scanners cannot consume it), then show the account. */
export function AccountConfirm({ token, labels, locale }: { token: string; labels: AccountLabels; locale: string }) {
  const [state, setState] = useState<'working' | 'failed'>('working');
  const [msg, setMsg] = useState('');
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const cid = browserCid();
    fetch('/api/membership/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, cid }) })
      .then(async (r) => ({ ok: r.ok, d: await r.json().catch(() => ({})) }))
      .then(({ ok, d }) => {
        if (ok && d && d.ok) { window.location.replace(home(locale)); return; }   // the token is gone from the address bar
        setMsg(d && d.error === 'expired' ? labels.confirmExpired : d && d.error === 'unavailable' ? labels.confirmError : labels.confirmInvalid);
        setState('failed');
      })
      .catch(() => { setMsg(labels.confirmError); setState('failed'); });
  }, [token, labels, locale]);
  if (state === 'working') return <p className="ac-ok" role="status" aria-live="polite">{labels.confirming}<style>{css}</style></p>;
  return <AccountSignIn labels={labels} locale={locale} notice={msg} />;
}

export function AccountActions({ labels, locale, hasBilling, ended }: { labels: AccountLabels; locale: string; hasBilling: boolean; ended: boolean }) {
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function portal() {
    setBusy('portal'); setErr(''); setMsg(labels.billingOpening);
    try {
      const r = await fetch('/api/account/portal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.ok && d.url) { window.location.href = d.url; return; }
      if (r.status === 401) { window.location.reload(); return; }
      setMsg(''); setErr(labels.billingError);
    } catch { setMsg(''); setErr(labels.billingError); } finally { setBusy(''); }
  }
  async function forget() {
    if (!confirm(labels.forgetConfirm)) return;
    setBusy('forget'); setErr('');
    const r = await fetch('/api/account/forget', { method: 'POST' }).then((x) => x.json()).catch(() => null);
    setBusy(''); if (r?.ok) setMsg(labels.forgetDone); else setErr(labels.error);
  }
  async function signOut(all: boolean) {
    setBusy('out');
    await fetch('/api/account/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all }) }).catch(() => {});
    window.location.replace(home(locale));
  }

  return (
    <div className="ac">
      <div className="ac-row">
        {hasBilling
          ? <button className="ac-btn" onClick={portal} disabled={!!busy}>{labels.manageBilling}</button>
          : null}
        {ended ? <a className="ac-btn" style={{ textDecoration: 'none' }} href={`${locale === 'en' ? '' : `/${locale}`}/membership`}>{labels.rejoin}</a> : null}
      </div>
      {!hasBilling && !ended ? <p style={{ margin: 0, fontSize: 14, color: '#6b6555' }}>{labels.noBilling}</p> : null}
      {msg ? <p className="ac-ok" role="status">{msg}</p> : null}
      {err ? <p className="ac-err" role="alert">{err}</p> : null}
      <div className="ac-row" style={{ marginTop: 6 }}>
        <button className="ac-ghost" onClick={forget} disabled={!!busy}>{labels.forget}</button>
        <button className="ac-ghost" onClick={() => signOut(false)} disabled={!!busy}>{labels.signOut}</button>
        <button className="ac-ghost" onClick={() => signOut(true)} disabled={!!busy}>{labels.signOutAll}</button>
      </div>
      <style>{css}</style>
    </div>
  );
}
