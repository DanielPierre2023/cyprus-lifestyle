'use client';
// High-end language switcher — a proper accessible dropdown that works cleanly on
// mobile (a tap target, not a cramped inline row) and lists every edition by its
// NATIVE name, so nothing renders as a broken glyph. Used in both the footer
// (opens upward) and the header utility strip (opens downward).
import { useState, useRef, useEffect } from 'react';
import { Link, usePathname } from '@/lib/i18n/routing';
import { useLocale } from 'next-intl';
import { LOCALES, type Locale } from '@/lib/locales';

const NATIVE: Record<Locale, string> = {
  en: 'English', el: 'Ελληνικά', ro: 'Română', ar: 'العربية', de: 'Deutsch', pl: 'Polski', ru: 'Русский',
};
const SHORT: Record<Locale, string> = { en: 'EN', el: 'ΕΛ', ro: 'RO', ar: 'AR', de: 'DE', pl: 'PL', ru: 'RU' };

export default function LocaleSwitch(
  { placement = 'up', variant = 'foot' }: { placement?: 'up' | 'down'; variant?: 'foot' | 'util' },
) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div className={`lang-switch lang-${variant}${open ? ' open' : ''}`} ref={ref} data-placement={placement}>
      <button type="button" className="lang-trigger" aria-haspopup="listbox" aria-expanded={open}
        aria-label={NATIVE[locale]} onClick={() => setOpen((v) => !v)}>
        <svg className="lang-globe" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
        </svg>
        <span className="lang-cur">{variant === 'util' ? SHORT[locale] : NATIVE[locale]}</span>
        <svg className="lang-caret" width="10" height="7" viewBox="0 0 10 7" aria-hidden="true"><path d="M1 1.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <ul className="lang-menu" role="listbox" aria-label="Language / Γλώσσα">
        {LOCALES.map((l: Locale) => (
          <li key={l} role="option" aria-selected={l === locale}>
            <Link href={pathname} locale={l} hrefLang={l} className={l === locale ? 'active' : ''} onClick={() => setOpen(false)}>
              <span className="lang-native" lang={l} dir={l === 'ar' ? 'rtl' : 'ltr'}>{NATIVE[l]}</span>
              <span className="lang-code">{SHORT[l]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
