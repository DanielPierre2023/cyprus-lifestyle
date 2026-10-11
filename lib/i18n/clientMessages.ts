// lib/i18n/clientMessages.ts - which message namespaces are shipped to the browser. PURE.
//
// <NextIntlClientProvider> serialises whatever `messages` it receives into every page's
// HTML/RSC payload. Passing the whole catalogue put ~24 KB (EN; 21-27 KB in the others)
// of JSON - 27 namespaces - into each of ~3k pages x 7 locales, although the only
// components that call a client-side `useTranslations()` read the 7 namespaces below.
// Everything else is rendered on the server (getTranslations) and never needs shipping.
//
// GUARD: scripts/tests/client-messages.test.ts scans every 'use client' file and fails
// if one reads a namespace that is not listed here, so adding `useTranslations('foo')`
// to a client component without updating this list cannot reach production silently.
export const CLIENT_NAMESPACES = ['brand', 'comments', 'consent', 'contactForm', 'home', 'nav', 'newsletter'] as const;

export function pickMessages<T extends Record<string, unknown>>(messages: T, namespaces: readonly string[]): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const ns of namespaces) if (ns in messages) out[ns] = messages[ns];
  return out as Partial<T>;
}
