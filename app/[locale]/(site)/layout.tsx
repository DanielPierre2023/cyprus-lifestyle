import { setRequestLocale } from 'next-intl/server';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

// Opt this subtree into static rendering (next-intl needs the locale set in the
// segment before getTranslations runs, e.g. in the Footer).
export default async function SiteLayout({
  children, params,
}: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
