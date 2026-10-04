'use client';
// ============================================================================
// GetYourGuide partner widget (city / activities) + its mandatory Analytics script.
//
//   <GygWidget location="paphos" locale="de" />          → Paphos "things to do" widget
//   <GygWidget kind="activities" location="cyprus" />    → top activities in Cyprus
//
// Privacy: the GetYourGuide script is third-party tracking, so it is loaded ONLY after
// the visitor accepts cookies (components/ConsentAnalytics.tsx, key 'cl-consent').
// Before that — or if declined — a plain partner-tagged link is shown instead, which
// still earns: GetYourGuide sets its 31-day attribution cookie on its own site after
// the click. The widget earns the same way once consent is given.
// ============================================================================
import { useEffect, useState } from 'react';
import {
  GYG_ANALYTICS_SRC, GYG_CITY_FRAME, GYG_ACTIVITIES_FRAME, gygLocationFor, gygLocaleCode, gygLocationLink, gygPartnerIdFromEnv,
} from '@/lib/gyg';

const CONSENT_KEY = 'cl-consent';
const consentGranted = () => { try { return localStorage.getItem(CONSENT_KEY) === 'granted'; } catch { return false; } };

/**
 * Load the partner Analytics script once (in <head>). Called again with rescan=true
 * after a client-side navigation mounts a new widget, so the script scans the new DOM.
 */
export function loadGygAnalytics(partnerId: string, rescan = false) {
  if (typeof document === 'undefined' || !consentGranted()) return;
  const existing = document.querySelector('script[data-gyg-analytics]');
  if (existing && !rescan) return;
  existing?.remove();
  const s = document.createElement('script');
  s.async = true; s.defer = true;
  s.src = GYG_ANALYTICS_SRC;
  s.setAttribute('data-gyg-partner-id', partnerId);
  s.setAttribute('data-gyg-analytics', '');
  document.head.appendChild(s);
}

/** Mount once in the layout (inside the consent gate): loads the script when consent is granted. */
export function GygAnalytics() {
  useEffect(() => { loadGygAnalytics(gygPartnerIdFromEnv()); }, []);
  return null;
}

const T: Record<string, { cta: (n: string) => string; note: string }> = {
  en: { cta: (n) => `Browse and book experiences in ${n} on GetYourGuide`, note: 'Accept cookies to see live availability here.' },
  el: { cta: (n) => `Δείτε και κλείστε εμπειρίες σε ${n} στο GetYourGuide`, note: 'Αποδεχτείτε τα cookies για να δείτε τη διαθεσιμότητα εδώ.' },
  ro: { cta: (n) => `Descoperă și rezervă experiențe în ${n} pe GetYourGuide`, note: 'Acceptă cookie-urile pentru a vedea disponibilitatea aici.' },
  ar: { cta: (n) => `تصفّح التجارب في ${n} واحجزها على GetYourGuide`, note: 'اقبل ملفات تعريف الارتباط لعرض التوفر هنا.' },
  de: { cta: (n) => `Erlebnisse in ${n} auf GetYourGuide entdecken und buchen`, note: 'Cookies akzeptieren, um hier die Verfügbarkeit zu sehen.' },
  pl: { cta: (n) => `Odkryj i zarezerwuj atrakcje w ${n} na GetYourGuide`, note: 'Zaakceptuj pliki cookie, aby zobaczyć tu dostępność.' },
  ru: { cta: (n) => `Смотреть и бронировать впечатления в ${n} на GetYourGuide`, note: 'Примите cookie, чтобы видеть наличие мест здесь.' },
};

export default function GygWidget({ kind = 'city', location = 'cyprus', locale = 'en', campaign = 'cl-widget', minHeight = 320 }: {
  kind?: 'city' | 'activities'; location?: string; locale?: string; campaign?: string; minHeight?: number;
}) {
  const partner = gygPartnerIdFromEnv();
  const loc = gygLocationFor(location);
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    setGranted(consentGranted());
    const on = () => setGranted(consentGranted());
    window.addEventListener('cl-consent', on);
    window.addEventListener('storage', on);
    return () => { window.removeEventListener('cl-consent', on); window.removeEventListener('storage', on); };
  }, []);
  useEffect(() => { if (granted) loadGygAnalytics(partner, true); }, [granted, partner, loc.id, kind]);

  const t = T[locale] || T.en;
  if (granted) {
    return (
      <div key={`${kind}-${loc.id}-${locale}`} style={{ minHeight }}
        data-gyg-href={kind === 'city' ? GYG_CITY_FRAME : GYG_ACTIVITIES_FRAME}
        data-gyg-location-id={String(loc.id)} data-gyg-locale-code={gygLocaleCode(locale)}
        data-gyg-widget={kind} data-gyg-partner-id={partner} data-gyg-cmp={campaign} />
    );
  }
  return (
    <a href={gygLocationLink(loc, campaign, partner)} target="_blank" rel="sponsored noopener"
      style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '18px 20px', borderRadius: 14, border: '1px solid rgba(201,162,76,.45)', background: '#fffdf8', color: '#171922', textDecoration: 'none', fontFamily: 'var(--sans, system-ui, sans-serif)' }}>
      <b style={{ fontSize: 16 }}>{t.cta(loc.name)} ↗</b>
      {granted === false ? <span style={{ fontSize: 13, color: '#5b5647' }}>{t.note}</span> : null}
    </a>
  );
}
