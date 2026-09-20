'use client';
// Footer language switcher — all seven editions, linking to the current page in
// each locale (keeps the reader where they are).
import { Link, usePathname } from '@/lib/i18n/routing';
import { useLocale } from 'next-intl';
import { LOCALES, type Locale } from '@/lib/locales';

const SHORT: Record<Locale, string> = { en: 'EN', el: 'ΕΛ', ro: 'RO', ar: 'ع', de: 'DE', pl: 'PL', ru: 'RU' };

export default function LocaleSwitch() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <span className="foot-langs" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
      {LOCALES.map((l: Locale, i) => (
        <span key={l}>
          {i > 0 ? <span aria-hidden="true" style={{ opacity: 0.4, margin: '0 4px' }}>·</span> : null}
          <Link href={pathname} locale={l} hrefLang={l} aria-current={l === locale ? 'true' : undefined}
            style={{ color: 'inherit', fontWeight: l === locale ? 700 : 400, opacity: l === locale ? 1 : 0.7, textDecoration: 'none' }}>
            {SHORT[l]}
          </Link>
        </span>
      ))}
    </span>
  );
}
