'use client';
// "Own this business?" — the CLAIM-TO-OWN entry point on a listing detail page.
// Posts to /api/directory/claim, which picks an honest-verification channel server-side
// (on-file email → website-domain email → phone OTP → manual) and sends a link/OTP only
// to a recipient that proves control of the business. The claimant only ever sees a
// generic next-step message (no on-file address is revealed). The hidden HoneypotField is
// the shared spam trap the server checks (field name in lib/honeypot.ts).
//
// If the listing is ALREADY owner-verified, this renders a small "Verified owner" state
// instead of the form. The self-serve profile editor is the NEXT increment — for now a
// verified claim flips provenance, records the contact, and notifies the desk to follow up.
import { useState } from 'react';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/honeypot';

export interface ClaimLabels {
  prompt: string;      // "Own this business?"
  intro: string;       // one-line pitch
  name: string;
  email: string;
  phone: string;       // optional-field placeholder
  submit: string;
  sending: string;
  codePrompt: string;  // label above the OTP input
  code: string;        // OTP input placeholder
  verify: string;      // OTP submit
  verifying: string;
  verifiedTitle: string; // "Verified owner"
  verifiedBody: string;
  error: string;
  hubHint: string;     // pointer to the Business Hub shown next to the verified badge
  hubLink: string;     // link text
  hubHref: string;     // '' = no pointer
}

const DEFAULTS: ClaimLabels = {
  prompt: 'Own this business?',
  intro: 'Claim your free verified profile — confirm ownership and take control of this listing.',
  name: 'Your name',
  email: 'Your email',
  phone: 'Business phone (optional)',
  submit: 'Claim this listing',
  sending: 'Starting…',
  codePrompt: 'Enter the 6-digit code we sent to the phone on file',
  code: '6-digit code',
  verify: 'Verify',
  verifying: 'Verifying…',
  verifiedTitle: 'Verified owner',
  verifiedBody: 'This profile has been claimed and verified by its owner.',
  error: 'Something went wrong — please try again.',
  hubHint: '',
  hubLink: '',
  hubHref: '',
};

export default function ClaimListing({
  slug,
  verified = false,
  labels,
}: {
  slug: string;
  verified?: boolean;
  labels?: Partial<ClaimLabels>;
}) {
  const t = { ...DEFAULTS, ...(labels || {}) };
  const [f, setF] = useState({ name: '', email: '', phone: '' });
  const [hp, setHp] = useState(''); // honeypot — must stay empty for a real person
  const [view, setView] = useState<'form' | 'otp' | 'done'>('form');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [claimId, setClaimId] = useState('');
  const [code, setCode] = useState('');

  // Already an owned, verified profile → show the badge, not the form.
  if (verified) {
    return (
      <div className="clm clm-verified">
        <span className="clm-badge">✓ {t.verifiedTitle}</span>
        <p className="clm-vbody">{t.verifiedBody}</p>
        {t.hubHref ? <p className="clm-vbody">{t.hubHint} <a href={t.hubHref}>{t.hubLink} →</a></p> : null}
        <style>{CLM_CSS}</style>
      </div>
    );
  }

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/directory/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name: f.name, email: f.email, phone: f.phone, [HONEYPOT_FIELD]: hp }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) { setErr(d.error || t.error); return; }
      setMsg(d.message || '');
      if (d.requiresCode && d.claimId) { setClaimId(String(d.claimId)); setView('otp'); return; }
      setView('done');
    } catch { setErr(t.error); } finally { setBusy(false); }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/directory/claim/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claimId, code }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) { setErr(d.error || t.error); return; }
      setMsg('Verified — thank you. Your listing is now an owner-verified profile.'); setView('done');
    } catch { setErr(t.error); } finally { setBusy(false); }
  }

  if (view === 'done') {
    return (
      <div className="clm clm-done">
        <span className="clm-badge">✓ {t.verifiedTitle}</span>
        <p className="clm-vbody">{msg}</p>
        {t.hubHref ? <p className="clm-vbody">{t.hubHint} <a href={t.hubHref}>{t.hubLink} →</a></p> : null}
        <style>{CLM_CSS}</style>
      </div>
    );
  }

  if (view === 'otp') {
    return (
      <form className="clm" onSubmit={verifyCode}>
        <h3 className="clm-t">{t.prompt}</h3>
        <p className="clm-i">{msg || t.codePrompt}</p>
        <input
          className="clm-in" required inputMode="numeric" autoComplete="one-time-code"
          pattern="[0-9]*" maxLength={6} placeholder={t.code}
          value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        <button className="btn clm-btn" type="submit" disabled={busy}>
          {busy ? t.verifying : t.verify}
        </button>
        {err ? <p className="clm-err">{err}</p> : null}
        <style>{CLM_CSS}</style>
      </form>
    );
  }

  return (
    <form className="clm" onSubmit={start}>
      <h3 className="clm-t">{t.prompt}</h3>
      <p className="clm-i">{t.intro}</p>
      <input className="clm-in" required placeholder={t.name} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input className="clm-in" required type="email" placeholder={t.email} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input className="clm-in" type="tel" placeholder={t.phone} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} />
      {/* honeypot — hidden spam trap shared with every public form */}
      <HoneypotField value={hp} onChange={setHp} />
      <button className="btn clm-btn" type="submit" disabled={busy}>
        {busy ? t.sending : t.submit}
      </button>
      {err ? <p className="clm-err">{err}</p> : null}
      <style>{CLM_CSS}</style>
    </form>
  );
}

const CLM_CSS = `
  .clm{background:#fff;border:1px solid var(--line,#e0d6c1);border-radius:6px;padding:18px 20px;display:flex;flex-direction:column;gap:10px}
  .clm-t{font-family:var(--disp);font-weight:600;font-size:20px;margin:0}
  .clm-i{font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink-soft,#5b5346);margin:0}
  .clm-in{font-family:var(--sans);font-size:15px;padding:10px 12px;border:1px solid var(--line,#e0d6c1);border-radius:5px;background:var(--paper,#fbf8f1);color:var(--ink,#171310)}
  .clm-in:focus{outline:none;border-color:#C9A24C}
  .clm-btn{text-align:center;margin-top:2px}
  .clm-err{font-family:var(--sans);font-size:13px;color:#9b2d1f;margin:0}
  .clm-verified,.clm-done{align-items:flex-start}
  .clm-badge{display:inline-flex;align-items:center;gap:6px;font-family:var(--sans);font-size:12px;font-weight:700;color:#0B0E11;background:#F1D592;border-radius:999px;padding:3px 12px}
  .clm-vbody{font-family:var(--body);font-size:14px;line-height:1.5;color:var(--ink-soft,#5b5346);margin:0}
`;
