import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

export const routing = defineRouting({
  locales: LOCALES,
  defaultLocale: DEFAULT_LOCALE,
  // Default (English) has no prefix; /el, /ro, /ar are prefixed.
  localePrefix: 'as-needed',
});

export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
