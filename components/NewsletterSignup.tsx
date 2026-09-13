'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';

export default function NewsletterSignup() {
  const t = useTranslations('newsletter');
  const locale = useLocale();
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState('sending');
    try {
      const res = await fetch('/api/newsletter/subscribe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, language: locale }),
      });
      setState(res.ok ? 'done' : 'error');
    } catch { setState('error'); }
  }

  return (
    <section className="letter">
      <div className="wrap">
        <h2 className="display">{t('title')}</h2>
        <p>{t('subtitle')}</p>
        {state === 'done' ? (
          <p className="gold">{t('success')}</p>
        ) : (
          <form className="field" onSubmit={submit}>
            <input type="email" required placeholder={t('placeholder')} value={email}
              onChange={(e) => setEmail(e.target.value)} aria-label={t('placeholder')} />
            <button className="btn" type="submit" disabled={state === 'sending'}>{t('cta')}</button>
          </form>
        )}
        {state === 'error' ? <p style={{ color: '#e0a', marginTop: 10 }}>{t('error')}</p> : null}
      </div>
    </section>
  );
}
