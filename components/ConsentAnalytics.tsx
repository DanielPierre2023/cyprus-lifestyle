'use client';
// Privacy-first consent gate. Nothing loads until the reader chooses. On "Accept"
// we mount Vercel's cookieless analytics and the GetYourGuide partner script (needed
// for the booking widgets); on "Decline" nothing is loaded.
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/i18n/routing';

// Analytics + Speed Insights + GetYourGuide live in their own chunk, fetched only after consent and browser idle time.
const ConsentScripts = dynamic(() => import('@/components/ConsentScripts'), { ssr: false });

const KEY = 'cl-consent';
type Choice = 'granted' | 'denied' | null | undefined;

export default function ConsentAnalytics() {
  const t = useTranslations('consent');
  const [choice, setChoice] = useState<Choice>(undefined);
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    try {
      const v = localStorage.getItem(KEY);
      setChoice(v === 'granted' ? 'granted' : v === 'denied' ? 'denied' : null);
    } catch { setChoice(null); }
  }, []);

  // Mount the scripts when the browser is idle, never in the way of first paint / hydration.
  useEffect(() => {
    if (choice !== 'granted') return;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (id: number) => void };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setIdle(true), { timeout: 3000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setIdle(true), 1500);
    return () => clearTimeout(t);
  }, [choice]);

  function decide(v: 'granted' | 'denied') {
    try { localStorage.setItem(KEY, v); } catch { /* private mode */ }
    setChoice(v);
    try { window.dispatchEvent(new CustomEvent('cl-consent', { detail: v })); } catch { /* old browsers */ }
  }

  return (
    <>
      {choice === 'granted' && idle ? <ConsentScripts /> : null}
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
