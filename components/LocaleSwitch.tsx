'use client';
// High-end language switcher — a proper accessible dropdown that works cleanly on
// mobile (a tap target, not a cramped inline row) and lists every edition by its
// NATIVE name, so nothing renders as a broken glyph. Used in both the footer
// (opens upward) and the header utility strip (opens downward).
import { useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from 'react';
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);

  // Remember an explicit choice for one year so the middleware's auto-detection
  // defers to it — including a deliberate "stay in English". Written client-side
  // only (no Set-Cookie header), so page caching is unaffected.
  const choose = (l: Locale) => {
    try { document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; SameSite=Lax`; } catch { /* private mode */ }
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    // Move focus into the menu when it opens (start on the current edition), so
    // arrow keys work immediately and screen-reader users land in the list.
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    (items.find((a) => a.classList.contains('active')) ?? items[0])?.focus();
    return () => { document.removeEventListener('mousedown', onDoc); };
  }, [open]);

  // Full keyboard model: ArrowDown/Up (with wrap), Home/End, Escape (returns focus
  // to the trigger), and ArrowDown/Enter/Space to open from the trigger. Enter on an
  // option follows the link natively.
  const onKeyDown = (e: ReactKeyboardEvent) => {
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLAnchorElement>('a') ?? []);
    if (!open) {
      if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && document.activeElement === triggerRef.current) {
        e.preventDefault(); setOpen(true);
      }
      return;
    }
    const idx = items.indexOf(document.activeElement as HTMLAnchorElement);
    if (e.key === 'Escape') { e.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (items[idx + 1] ?? items[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); (items[idx - 1] ?? items[items.length - 1])?.focus(); }
    else if (e.key === 'Home') { e.preventDefault(); items[0]?.focus(); }
    else if (e.key === 'End') { e.preventDefault(); items[items.length - 1]?.focus(); }
    else if (e.key === 'Tab') { setOpen(false); }
  };

  return (
    <div className={`lang-switch lang-${variant}${open ? ' open' : ''}`} ref={ref} data-placement={placement} onKeyDown={onKeyDown}>
      <button type="button" className="lang-trigger" aria-haspopup="listbox" aria-expanded={open}
        ref={triggerRef} aria-label={NATIVE[locale]} onClick={() => setOpen((v) => !v)}>
        <svg className="lang-globe" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" />
        </svg>
        <span className="lang-cur">{variant === 'util' ? SHORT[locale] : NATIVE[locale]}</span>
        <svg className="lang-caret" width="10" height="7" viewBox="0 0 10 7" aria-hidden="true"><path d="M1 1.5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
      </button>
      <ul className="lang-menu" role="listbox" aria-label="Language / Γλώσσα" ref={menuRef}>
        {LOCALES.map((l: Locale) => (
          <li key={l} role="option" aria-selected={l === locale}>
            <Link href={pathname} locale={l} hrefLang={l} className={l === locale ? 'active' : ''} onClick={() => choose(l)}>
              <span className="lang-native" lang={l} dir={l === 'ar' ? 'rtl' : 'ltr'}>{NATIVE[l]}</span>
              <span className="lang-code">{SHORT[l]}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
