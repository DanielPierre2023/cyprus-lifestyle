'use client';
import { useState } from 'react';

export default function ContactForm() {
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState('sending');
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setState(res.ok ? 'done' : 'error');
  }
  if (state === 'done') return <p className="gold">Thank you. We will be in touch.</p>;
  return (
    <form onSubmit={submit} style={{ maxWidth: 520 }}>
      <input placeholder="Your name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} style={inp} />
      <input type="email" placeholder="Your email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} style={inp} />
      <input placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} style={inp} />
      <textarea placeholder="Message" required rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} style={inp} />
      <button className="btn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send'}</button>
      {state === 'error' ? <p style={{ color: '#b00' }}>Something went wrong. Please try again.</p> : null}
    </form>
  );
}
const inp: React.CSSProperties = { width: '100%', padding: '11px 13px', border: '1px solid var(--line)', marginBottom: 12, fontFamily: 'var(--serif-body)', fontSize: 16, background: '#fff' };
