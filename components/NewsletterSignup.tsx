'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

export default function NewsletterSignup() {
  const tn = useTranslations('newsletter');
  const th = useTranslations('home');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language: locale, company }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch { setState('error'); }
  }

  return (
    <section className="letter" id="letter">
      <div className="wrap">
        <div className="frame">
          <div className="rule-orn"><span className="diamond" /></div>
          <h2 className="display">{th('letterTitle')}</h2>
          <p>{th('letterSub')}</p>
          {state === 'done' ? (
            <p className="gold">{tn('success')}</p>
          ) : (
            <form className="field" onSubmit={submit}>
              <div aria-hidden="true" style={{ position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0 }}>
                <label>Company<input type="text" tabIndex={-1} autoComplete="off" value={company} onChange={(e) => setCompany(e.target.value)} /></label>
              </div>
              <input type="email" required placeholder={tn('placeholder')} value={email}
                onChange={(e) => setEmail(e.target.value)} aria-label={tn('placeholder')} />
              <button className="btn" type="submit" disabled={state === 'sending'}>{tn('cta')}</button>
            </form>
          )}
          {state === 'error' ? <p style={{ color: '#e0a0a0', marginTop: 12 }}>{tn('error')}</p> : null}
          <div className="fine">{th('letterFine')}</div>
        </div>
      </div>
    </section>
  );
}
