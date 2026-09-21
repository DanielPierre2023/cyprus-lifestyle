'use client';
// Partner self-service portal (roadmap item 09). Two modes:
//  • no token → claim form: paste your listing link/slug + the email on file → we email a link.
//  • ?token=… → verify, then an edit form for the whitelisted fields; changes go to moderation.
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

const SUMMARY_FIELDS = [
  ['summary_en', 'Description (English)'],
] as const;

function slugFromInput(s: string): string {
  const t = s.trim();
  const m = t.match(/\/directory\/[^/]+\/([^/?#]+)/);
  if (m) return m[1];
  return t.replace(/^https?:\/\/[^/]+\//, '').replace(/[/?#].*$/, '').trim();
}

function Portal() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [mode, setMode] = useState<'claim' | 'verifying' | 'edit' | 'invalid'>(token ? 'verifying' : 'claim');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const verify = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/verify?token=${encodeURIComponent(token)}`);
      const d = await res.json();
      if (res.ok && d.ok) {
        setMode('edit'); setName(d.listing?.name_en || d.slug || '');
        const l = d.listing || {};
        setFields({ phone: l.phone || '', email: l.email || '', url: l.url || '', partner_pitch: l.partner_pitch || '', summary_en: l.summary_en || '' });
      } else { setMode('invalid'); setMsg(d.error === 'expired' ? 'This link has expired — please start a new claim.' : 'This link is invalid.'); }
    } catch { setMode('invalid'); setMsg('Something went wrong verifying your link.'); }
    setBusy(false);
  }, [token]);
  useEffect(() => { if (token) verify(); }, [token, verify]);

  async function submitClaim(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/partner/claim', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: slugFromInput(slug), email }),
      });
      const d = await res.json();
      setMsg(d.message || 'If that email is on file, we’ve sent a link.');
    } catch { setMsg('Something went wrong — please try again.'); }
    setBusy(false);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMsg('');
    try {
      const res = await fetch('/api/partner/edit', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, fields }),
      });
      const d = await res.json();
      setMsg(d.ok ? (d.message || 'Submitted for review.') : ('Error: ' + (d.error || 'could not save')));
    } catch { setMsg('Something went wrong — please try again.'); }
    setBusy(false);
  }

  const wrap: React.CSSProperties = { maxWidth: 640, margin: '0 auto', padding: '40px 16px' };
  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line,#e3d9c4)', background: 'var(--paper,#fff)', color: 'inherit', fontFamily: 'inherit', fontSize: 15, marginTop: 6 };
  const label: React.CSSProperties = { display: 'block', fontSize: 13, opacity: .8, marginTop: 16 };
  const button: React.CSSProperties = { marginTop: 20, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', border: '1px solid #C9A24C', background: 'linear-gradient(180deg,#E4D2AC,#C9A24C)', color: '#0B0E11', fontWeight: 700 };

  if (mode === 'verifying') return <div style={wrap}><p>Verifying your link…</p></div>;
  if (mode === 'invalid') return <div style={wrap}><h1>Manage your listing</h1><p className="sub">{msg}</p><p><a href="/partner">Start a new claim →</a></p></div>;

  if (mode === 'edit') return (
    <div style={wrap}>
      <h1>Manage your listing</h1>
      <p className="sub">You’re editing <strong>{name}</strong>. Changes are reviewed by our team before they appear.</p>
      <form onSubmit={submitEdit}>
        <label style={label}>Phone<input style={input} value={fields.phone || ''} onChange={(e) => setFields({ ...fields, phone: e.target.value })} /></label>
        <label style={label}>Public email<input style={input} value={fields.email || ''} onChange={(e) => setFields({ ...fields, email: e.target.value })} /></label>
        <label style={label}>Website<input style={input} value={fields.url || ''} onChange={(e) => setFields({ ...fields, url: e.target.value })} /></label>
        {SUMMARY_FIELDS.map(([k, lbl]) => (
          <label key={k} style={label}>{lbl}<textarea style={{ ...input, minHeight: 96, resize: 'vertical' }} value={fields[k] || ''} onChange={(e) => setFields({ ...fields, [k]: e.target.value })} /></label>
        ))}
        <label style={label}>Your note / offer (shown as “they say…”)<textarea style={{ ...input, minHeight: 80, resize: 'vertical' }} value={fields.partner_pitch || ''} onChange={(e) => setFields({ ...fields, partner_pitch: e.target.value })} /></label>
        <button style={button} disabled={busy}>{busy ? 'Submitting…' : 'Submit changes for review'}</button>
        {msg ? <p className="sub" style={{ marginTop: 14, color: '#1f7a3f' }}>{msg}</p> : null}
      </form>
    </div>
  );

  return (
    <div style={wrap}>
      <h1>Manage your listing</h1>
      <p className="sub">Own a business listed on Cyprus Lifestyle? Confirm it’s yours and keep your details, description and offers up to date. Enter your listing and the email we have on file — we’ll send a secure link.</p>
      <form onSubmit={submitClaim}>
        <label style={label}>Your listing (paste the link, or its name/slug)<input style={input} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="https://cypruslifestyle.eu/directory/restaurant/…" required /></label>
        <label style={label}>Email on file for the business<input style={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourbusiness.cy" required /></label>
        <button style={button} disabled={busy}>{busy ? 'Sending…' : 'Send me a verification link'}</button>
        {msg ? <p className="sub" style={{ marginTop: 14 }}>{msg}</p> : null}
      </form>
    </div>
  );
}

export default function PartnerPortalPage() {
  return <Suspense fallback={<div style={{ padding: 40 }}>Loading…</div>}><Portal /></Suspense>;
}
