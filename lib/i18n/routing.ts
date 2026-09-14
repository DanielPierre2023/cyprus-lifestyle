import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Default (English) has no prefix; /el, /ro, /ar are prefixed.
  localePrefix: 'as-needed',
  // The locale always lives in the URL, so we don't need Accept-Language / cookie
  // detection — the default (en) is served at "/".
  localeDetection: false,
  // Never set a NEXT_LOCALE cookie. In next-intl v4 the cookie side-effect was
  // split out of `localeDetection` into its own option; a Set-Cookie makes
  // responses uncacheable, which had forced every page (even static ones) to be
  // served dynamically (no-store) on Vercel. Keeping it off preserves that fix.
  localeCookie: false,
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
