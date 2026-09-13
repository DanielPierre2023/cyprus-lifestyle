// Cyprus Lifestyle — the four editions.
// Arabic is right-to-left; everything else LTR.

export const LOCALES = ['en', 'el', 'ro', 'ar'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const RTL_LOCALES: Locale[] = ['ar'];

export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  el: 'Ελληνικά',
  ro: 'Română',
  ar: 'العربية',
};

// Full language name used inside AI prompts.
export const LOCALE_NAME: Record<Locale, string> = {
  en: 'English',
  el: 'Greek',
  ro: 'Romanian',
  ar: 'Arabic',
};

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

export function dir(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}
