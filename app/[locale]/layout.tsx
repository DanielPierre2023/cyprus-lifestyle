import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { LOCALES, isLocale, dir, type Locale } from '@/lib/locales';
import { SITE_URL, SITE_NAME, orgJsonLd, ld } from '@/lib/seo';
import ConsentAnalytics from '@/components/ConsentAnalytics';
import { fontClassNames } from '@/lib/fonts';
import { greekFontCss, greekPreloadHrefs } from '@/lib/fontsGreek';
import { CLIENT_NAMESPACES, pickMessages } from '@/lib/i18n/clientMessages';
import '../globals.css';

// Fonts: see lib/fonts.ts (self-hosted by next/font - no runtime request to Google; preload diet).
// Greek (/el only): see lib/fontsGreek.ts - its @font-face rules and preload hints are rendered for locale 'el' and nothing else.

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: 'The island, in full colour — Cyprus business, property, culture and good living, in seven languages.',
  // Site-wide self-referential canonical fallback. `'./'` is resolved by Next
  // against the current request pathname, so every route gets a correct
  // self-canonical even if it never sets its own. Content pages that call
  // `pageMetadata()` provide their own `alternates` (canonical + all 7 hreflang
  // + x-default, computed per-pathname — next-intl's recommended pattern), which
  // fully override this default. Per-locale hreflang is intentionally NOT set
  // here: a root layout cannot know the sub-path, and with `as-needed` locale
  // prefixes a static alternate set would be wrong for sub-pages.
  alternates: { canonical: './' },
  openGraph: { siteName: SITE_NAME, type: 'website' },
  robots: { index: true, follow: true },
};

export default async function LocaleLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const messages = await getMessages();

  return (
    <html lang={locale} dir={dir(locale as Locale)} className={fontClassNames}>
      {locale === 'el' ? (
        <head>
          {greekPreloadHrefs().map((href) => <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="anonymous" />)}
          <style dangerouslySetInnerHTML={{ __html: greekFontCss() }} />
        </head>
      ) : null}
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(orgJsonLd()) }} />
        {/* Only the namespaces client components actually read (lib/i18n/clientMessages.ts) - the rest never needs to ship in the HTML. */}
        <NextIntlClientProvider messages={pickMessages(messages, CLIENT_NAMESPACES)}>
          {children}
          <ConsentAnalytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
