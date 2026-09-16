// Cyprus Lifestyle — the seven editions.
// Arabic is right-to-left; everything else LTR.

export const LOCALES = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

export const RTL_LOCALES: Locale[] = ['ar'];

export const LOCALE_LABEL: Record<Locale, string> = {
  en: 'English',
  el: 'Ελληνικά',
  ro: 'Română',
  ar: 'العربية',
  de: 'Deutsch',
  pl: 'Polski',
  ru: 'Русский',
};

// Full language name used inside AI prompts.
export const LOCALE_NAME: Record<Locale, string> = {
  en: 'English',
  el: 'Greek',
  ro: 'Romanian',
  ar: 'Arabic',
  de: 'German',
  pl: 'Polish',
  ru: 'Russian',
};

export function isLocale(x: string): x is Locale {
  return (LOCALES as readonly string[]).includes(x);
}

export function dir(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}
