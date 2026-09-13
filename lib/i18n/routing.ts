import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Default (English) has no prefix; /el, /ro, /ar are prefixed.
  localePrefix: 'as-needed',
  // The locale always lives in the URL, so we don't need cookie/Accept-Language
  // detection. Disabling it stops next-intl setting a NEXT_LOCALE cookie on every
  // response — a Set-Cookie makes responses uncacheable, which was forcing every
  // page (even static ones) to be served dynamically (no-store) on Vercel.
  localeDetection: false,
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
