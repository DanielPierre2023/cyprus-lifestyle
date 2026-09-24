'use client';
import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/lib/i18n/routing';
import LocaleSwitch from '@/components/LocaleSwitch';

// Order echoes the print masthead: lead with the marquee sections.
// The nine merged departments (see lib/editorial/taxonomy.ts). Subcategories and
// the legacy sections (cyprus/relocation/agenda/world) still have working URLs;
// they're just no longer top-level masthead links.
const CATS = ['style', 'table', 'escapes', 'design-living', 'property', 'business', 'culture', 'people', 'the-island'] as const;

export default function Header() {
  const t = useTranslations('nav');
  const th = useTranslations('home');
  const tb = useTranslations('brand');
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  const date = new Intl.DateTimeFormat(locale === 'ar' ? 'ar' : locale, {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date());

  return (
    <header>
      {/* Utility strip */}
      <div className="util">
        <div className="wrap row">
          <div className="l">
            <span>{t('city')}</span>
            <span className="hide">·</span>
            <span className="hide" suppressHydrationWarning>{date}</span>
          </div>
          <div className="r">
            <LocaleSwitch placement="down" variant="util" />
            <Link className="sub" href="/directory">{t('directory')}</Link>
            <Link className="sub hide" href="/search" aria-label={t('search')}>{t('search')}</Link>
            <Link className="sub" href="/membership">{t('membership')}</Link>
            <Link className="sub" href="/#letter">{th('subscribe')}</Link>
          </div>
        </div>
      </div>

      {/* Masthead */}
      <div className="mast">
        <img src="/brand/monogram.svg" alt="" width={76} height={76} className="mono" aria-hidden="true" />
        <Link href="/" className="brand" onClick={() => setOpen(false)}>{tb('name')}</Link>
        <div className="tag">{th('tagline')}</div>
        <div className="navwrap">
          <button className="menu-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            {open ? t('close') : t('menu')}
          </button>
          <nav className={`nav wrap${open ? ' open' : ''}`}>
            {CATS.map((c) => (
              <Link key={c} href={`/${c}`} onClick={() => setOpen(false)}>{t(c)}</Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
