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
  if (state === 'done') return <p className="gold cform" style={{ textAlign: 'center' }}>Thank you. We will be in touch.</p>;
  return (
    <form className="cform" onSubmit={submit}>
      <input placeholder="Your name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input type="email" placeholder="Your email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
      <textarea placeholder="Message" required rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
      <button className="btn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send'}</button>
      {state === 'error' ? <p className="note" style={{ color: '#b00020' }}>Something went wrong. Please try again.</p> : null}
    </form>
  );
}
