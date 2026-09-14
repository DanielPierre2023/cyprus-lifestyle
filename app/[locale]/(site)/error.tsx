'use client';
// Segment error boundary for the public site. Rendered inside the (site) layout,
// so the masthead, footer, fonts and design system are all present. Kept
// self-contained (its own tiny dictionary, no message loading) so that a fault in
// the i18n layer cannot make the error screen itself throw.
import { useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { reportError } from '@/lib/monitor';

type Copy = { kicker: string; title: string; dek: string; retry: string; home: string };

const COPY: Record<string, Copy> = {
  en: {
    kicker: 'Editorial Notice',
    title: 'Something went awry',
    dek: 'An unexpected fault interrupted this page. The desk has been notified — do try again.',
    retry: 'Try again',
    home: 'Return to the front page',
  },
  el: {
    kicker: 'Σημείωμα Σύνταξης',
    title: 'Κάτι πήγε στραβά',
    dek: 'Ένα απρόσμενο σφάλμα διέκοψε αυτή τη σελίδα. Η σύνταξη ειδοποιήθηκε — δοκιμάστε ξανά.',
    retry: 'Δοκιμάστε ξανά',
    home: 'Επιστροφή στην πρώτη σελίδα',
  },
  ro: {
    kicker: 'Notă Editorială',
    title: 'Ceva n-a mers bine',
    dek: 'O eroare neașteptată a întrerupt această pagină. Redacția a fost notificată — încercați din nou.',
    retry: 'Încercați din nou',
    home: 'Înapoi la prima pagină',
  },
  ar: {
    kicker: 'ملاحظة تحريرية',
    title: 'حدث خطأ ما',
    dek: 'قطع عطل غير متوقع هذه الصفحة. أُبلغت هيئة التحرير — يرجى المحاولة مرة أخرى.',
    retry: 'حاول مرة أخرى',
    home: 'العودة إلى الصفحة الأولى',
  },
};

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : 'en';
  const c = COPY[locale] ?? COPY.en;
  const home = locale === 'en' ? '/' : `/${locale}`;

  useEffect(() => {
    reportError(error, { boundary: 'site', digest: error?.digest, locale });
  }, [error, locale]);

  return (
    <div className="page wrap" style={{ textAlign: 'center' }}>
      <div className="page-head">
        <span className="kicker">{c.kicker}</span>
        <h1>{c.title}</h1>
        <p className="dek">{c.dek}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className="btn" type="button" onClick={() => reset()} style={{ padding: '13px 26px' }}>{c.retry}</button>
        <Link className="btn ghost" href={home}>{c.home}</Link>
      </div>
    </div>
  );
}
