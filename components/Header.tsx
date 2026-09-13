'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link, usePathname } from '@/lib/i18n/routing';
import { LOCALES, LOCALE_LABEL, type Locale } from '@/lib/locales';

const CATS = ['cyprus', 'business', 'property', 'culture', 'escapes', 'table', 'world'] as const;

export default function Header() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="masthead">
      <div className="wrap">
        <div className="bar">
          <Link href="/" className="logo" onClick={() => setOpen(false)}>
            Cyprus<b> Lifestyle</b>
          </Link>
          <button className="menu-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? t('close') : t('menu')}
          </button>
          <nav className={`nav${open ? ' open' : ''}`}>
            {CATS.map((c) => (
              <Link key={c} href={`/${c}`} onClick={() => setOpen(false)}>{t(c)}</Link>
            ))}
          </nav>
          <div className="lang" aria-label="Editions">
            {LOCALES.map((l: Locale) => (
              <Link key={l} href={pathname} locale={l} className={l === locale ? 'active' : ''} hrefLang={l}>
                {l === 'el' ? 'ΕΛ' : l === 'ar' ? 'ع' : l.toUpperCase()}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
