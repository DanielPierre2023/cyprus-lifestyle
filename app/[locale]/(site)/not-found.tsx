'use client';
// 404 for the public site. Rendered inside the (site) layout (masthead + footer
// present). App Router does not pass params to not-found, so the locale is read on
// the client and copy comes from a tiny self-contained dictionary.
import Link from 'next/link';
import { useParams } from 'next/navigation';

type Copy = { title: string; dek: string; home: string };

const COPY: Record<string, Copy> = {
  en: {
    title: 'This page has gone to press elsewhere',
    dek: 'The page you sought cannot be found. It may have moved — or perhaps never made the edition.',
    home: 'Return to the front page',
  },
  el: {
    title: 'Η σελίδα δεν βρέθηκε',
    dek: 'Η σελίδα που αναζητήσατε δεν υπάρχει. Ίσως μετακινήθηκε ή δεν συμπεριλήφθηκε ποτέ στην έκδοση.',
    home: 'Επιστροφή στην πρώτη σελίδα',
  },
  ro: {
    title: 'Pagina nu a fost găsită',
    dek: 'Pagina căutată nu poate fi găsită. Este posibil să fi fost mutată sau să nu fi apărut niciodată în ediție.',
    home: 'Înapoi la prima pagină',
  },
  ar: {
    title: 'الصفحة غير موجودة',
    dek: 'تعذّر العثور على الصفحة المطلوبة. ربما نُقلت أو لم تُنشر في هذه الطبعة قط.',
    home: 'العودة إلى الصفحة الأولى',
  },
};

export default function NotFound() {
  const params = useParams();
  const locale = typeof params?.locale === 'string' ? params.locale : 'en';
  const c = COPY[locale] ?? COPY.en;
  const home = locale === 'en' ? '/' : `/${locale}`;

  return (
    <div className="page wrap" style={{ textAlign: 'center' }}>
      <div className="page-head">
        <span className="kicker" style={{ fontSize: 13, letterSpacing: '.4em' }}>404</span>
        <h1>{c.title}</h1>
        <p className="dek">{c.dek}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <Link className="btn ghost" href={home}>{c.home}</Link>
      </div>
    </div>
  );
}
