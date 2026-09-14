'use client';
// Privacy-first consent gate. Nothing loads until the reader chooses. On "Accept"
// we mount Vercel's cookieless analytics; on "Decline" nothing is loaded.
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Link } from '@/lib/i18n/routing';

const KEY = 'cl-consent';
type Choice = 'granted' | 'denied' | null | undefined;

export default function ConsentAnalytics() {
  const t = useTranslations('consent');
  const [choice, setChoice] = useState<Choice>(undefined);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setChoice(v === 'granted' ? 'granted' : v === 'denied' ? 'denied' : null);
    } catch { setChoice(null); }
  }, []);

  function decide(v: 'granted' | 'denied') {
    try { localStorage.setItem(KEY, v); } catch { /* private mode */ }
    setChoice(v);
  }

  return (
    <>
      {choice === 'granted' ? (<><Analytics /><SpeedInsights /></>) : null}
      {choice === null ? (
        <div className="consent" role="dialog" aria-label={t('title')}>
          <div className="consent-inner">
            <p className="consent-text">
              <strong>{t('title')}.</strong> {t('body')} <Link href="/privacy">{t('learnMore')}</Link>
            </p>
            <div className="consent-actions">
              <button className="btn ghost" onClick={() => decide('denied')}>{t('decline')}</button>
              <button className="btn" onClick={() => decide('granted')}>{t('accept')}</button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
