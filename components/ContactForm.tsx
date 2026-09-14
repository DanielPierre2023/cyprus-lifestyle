'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function ContactForm() {
  const t = useTranslations('contactForm');
  const [f, setF] = useState({ name: '', email: '', subject: '', message: '', company: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState('sending');
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
    setState(res.ok ? 'done' : 'error');
  }
  if (state === 'done') return <p className="gold cform" style={{ textAlign: 'center' }}>{t('success')}</p>;
  return (
    <form className="cform" onSubmit={submit}>
      <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, overflow: 'hidden' }}>
        <label>Company<input type="text" tabIndex={-1} autoComplete="off" value={f.company} onChange={(e) => setF({ ...f, company: e.target.value })} /></label>
      </div>
      <input placeholder={t('name')} required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
      <input type="email" placeholder={t('email')} required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
      <input placeholder={t('subject')} value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
      <textarea placeholder={t('message')} required rows={6} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
      <button className="btn" type="submit" disabled={state === 'sending'}>{state === 'sending' ? t('sending') : t('send')}</button>
      {state === 'error' ? <p className="note" style={{ color: '#b00020' }}>{t('error')}</p> : null}
    </form>
  );
}
