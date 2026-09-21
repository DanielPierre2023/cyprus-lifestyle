'use client';
// Data-subject request form (roadmap item 12). Localized labels are passed in so the
// page stays a server component. Posts to /api/privacy/request.
import { useState } from 'react';

export interface PrivacyFormLabels {
  kind: string; access: string; erasure: string; correction: string; objection: string; portability: string;
  name: string; email: string; details: string; submit: string; sending: string;
}

export default function PrivacyRequestForm({ labels, locale }: { labels: PrivacyFormLabels; locale: string }) {
  const [kind, setKind] = useState('access');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [details, setDetails] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [msg, setMsg] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState('sending'); setMsg('');
    try {
      const res = await fetch('/api/privacy/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, name, email, details, locale }),
      });
      const d = await res.json();
      if (res.ok && d.ok) { setState('done'); setMsg(d.message || 'Received.'); }
      else { setState('idle'); setMsg(d.error || 'Please try again.'); }
    } catch { setState('idle'); setMsg('Please try again.'); }
  }

  const input: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--line,#e3d9c4)', background: 'var(--paper,#fff)', color: 'inherit', fontFamily: 'inherit', fontSize: 15, marginTop: 6 };
  const lab: React.CSSProperties = { display: 'block', fontSize: 13, opacity: .8, marginTop: 16 };

  if (state === 'done') return <p className="sub" style={{ color: '#1f7a3f', marginTop: 12 }}>{msg}</p>;

  return (
    <form onSubmit={submit} style={{ marginTop: 16, maxWidth: 560 }}>
      <label style={lab}>{labels.kind}
        <select style={input} value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="access">{labels.access}</option>
          <option value="erasure">{labels.erasure}</option>
          <option value="correction">{labels.correction}</option>
          <option value="objection">{labels.objection}</option>
          <option value="portability">{labels.portability}</option>
        </select>
      </label>
      <label style={lab}>{labels.name}<input style={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label style={lab}>{labels.email}<input style={input} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
      <label style={lab}>{labels.details}<textarea style={{ ...input, minHeight: 90, resize: 'vertical' }} value={details} onChange={(e) => setDetails(e.target.value)} /></label>
      <button disabled={state === 'sending'} style={{ marginTop: 18, padding: '10px 20px', borderRadius: 8, cursor: 'pointer', border: '1px solid #C9A24C', background: 'linear-gradient(180deg,#E4D2AC,#C9A24C)', color: '#0B0E11', fontWeight: 700 }}>
        {state === 'sending' ? labels.sending : labels.submit}
      </button>
      {msg ? <p className="sub" style={{ marginTop: 12 }}>{msg}</p> : null}
    </form>
  );
}
