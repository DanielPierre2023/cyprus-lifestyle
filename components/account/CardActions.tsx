'use client';
// The member card's two small actions on /account: choose the name shown on the card, and replace the card (new QR code).
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface CardActionLabels { nameLabel: string; namePh: string; save: string; saved: string; invalid: string; rotate: string; rotateConfirm: string; rotated: string; preview: string; error: string }

const css = `
.cd{display:flex;flex-direction:column;gap:10px;margin-top:6px}
.cd label{font-size:13px;color:#c9bfa6}
.cd-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.cd input[type=text]{flex:1;min-width:160px;max-width:260px;font-size:15px;padding:9px 11px;border:1px solid #6b5a2e;border-radius:6px;background:#fff;color:#16181C}
.cd-btn{font-size:13.5px;padding:9px 14px;border:1px solid #C9A24C;border-radius:6px;background:#C9A24C;color:#0B0E11;cursor:pointer;font-weight:600}
.cd-ghost{font-size:13px;padding:8px 12px;border:1px solid #6b5a2e;border-radius:6px;background:transparent;color:#E9C978;cursor:pointer;text-decoration:none}
.cd-btn:disabled,.cd-ghost:disabled{opacity:.55;cursor:default}
.cd-ok{color:#9fe0b0;font-size:14px;margin:0}.cd-err{color:#ffb4a6;font-size:14px;margin:0}
`;

export function CardActions({ initialName, previewUrl, labels }: { initialName: string; previewUrl: string; labels: CardActionLabels }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function call(body: Record<string, unknown>) {
    const r = await fetch('/api/account/card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    return { status: r.status, ok: r.ok && d && d.ok, d };
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setMsg(''); setErr('');
    try {
      const r = await call({ action: 'name', name });
      if (r.ok) { setMsg(labels.saved); router.refresh(); return; }
      if (r.status === 401) { window.location.reload(); return; }
      setErr(r.d && r.d.code === 'invalid_input' ? labels.invalid : labels.error);
    } catch { setErr(labels.error); } finally { setBusy(false); }
  }
  async function rotate() {
    if (busy || !confirm(labels.rotateConfirm)) return;
    setBusy(true); setMsg(''); setErr('');
    try {
      const r = await call({ action: 'rotate' });
      if (r.ok) { setMsg(labels.rotated); router.refresh(); return; }
      if (r.status === 401) { window.location.reload(); return; }
      setErr(labels.error);
    } catch { setErr(labels.error); } finally { setBusy(false); }
  }
  return (
    <div className="cd">
      <form onSubmit={save} noValidate>
        <label htmlFor="cd-name">{labels.nameLabel}</label>
        <div className="cd-row">
          <input id="cd-name" type="text" maxLength={24} autoComplete="given-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={labels.namePh} />
          <button className="cd-btn" type="submit" disabled={busy}>{labels.save}</button>
        </div>
      </form>
      <div className="cd-row">
        <a className="cd-ghost" href={previewUrl} rel="nofollow noreferrer" target="_blank">{labels.preview}</a>
        <button className="cd-ghost" type="button" onClick={rotate} disabled={busy}>{labels.rotate}</button>
      </div>
      {msg ? <p className="cd-ok" role="status">{msg}</p> : null}
      {err ? <p className="cd-err" role="alert">{err}</p> : null}
      <style>{css}</style>
    </div>
  );
}
