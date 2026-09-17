import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Bodoni_Moda, Jost, Lora, Amiri, Aref_Ruqaa } from 'next/font/google';
import { LOCALES, isLocale, dir, type Locale } from '@/lib/locales';
import { SITE_URL, SITE_NAME, orgJsonLd, ld } from '@/lib/seo';
import ConsentAnalytics from '@/components/ConsentAnalytics';
import '../globals.css';

// Self-hosted at build time by next/font — no runtime request to Google (faster, no CLS, GDPR-safe).
// latin-ext covers Polish (ł ż ó ą ę ć ń ś ź) and German (ä ö ü ß); Jost + Lora
// also ship Cyrillic for the Russian edition. Bodoni Moda has no Cyrillic, so
// Russian display headings fall back to Lora via the --disp chain in globals.css.
const bodoni = Bodoni_Moda({ subsets: ['latin', 'latin-ext'], weight: ['400', '500', '600', '700'], style: ['normal', 'italic'], variable: '--font-bodoni', display: 'swap' });
const jost = Jost({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['300', '400', '500', '600'], variable: '--font-jost', display: 'swap' });
const lora = Lora({ subsets: ['latin', 'latin-ext', 'cyrillic'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-lora', display: 'swap' });
const amiri = Amiri({ subsets: ['arabic', 'latin'], weight: ['400', '700'], variable: '--font-amiri', display: 'swap' });
const arefRuqaa = Aref_Ruqaa({ subsets: ['arabic', 'latin'], weight: ['400', '700'], variable: '--font-aref', display: 'swap' });

const fontVars = `${bodoni.variable} ${jost.variable} ${lora.variable} ${amiri.variable} ${arefRuqaa.variable}`;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: 'The island, in full colour — Cyprus business, property, culture and good living, in seven languages.',
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
    <html lang={locale} dir={dir(locale as Locale)} className={fontVars}>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(orgJsonLd()) }} />
        <NextIntlClientProvider messages={messages}>
          {children}
          <ConsentAnalytics />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
