import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { breadcrumbJsonLd, ld, pageMetadata } from '@/lib/seo';
import Concierge, { type ConciergeLabels } from '@/components/Concierge';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({
    locale: locale as Locale, path: '/ask',
    title: t('concierge.title'), description: t('concierge.intro'), kicker: 'Cyprus Lifestyle',
  });
}

export default async function AskPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();

  const labels: ConciergeLabels = {
    placeholder: t('concierge.placeholder'),
    ask: t('concierge.ask'),
    thinking: t('concierge.thinking'),
    error: t('concierge.error'),
    examplesTitle: t('concierge.examplesTitle'),
    examples: (t.raw('concierge.examples') as string[]) || [],
    picksTitle: t('concierge.picksTitle'),
  };
  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('concierge.title'), path: '/ask' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <div className="wrap dept">
        <span className="kicker">{t('brand.name')}</span>
        <h1>{t('concierge.title')}</h1>
        <p className="desc">{t('concierge.intro')}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <div className="wrap section">
        <Concierge locale={l} labels={labels} autofocus />
      </div>
    </>
  );
}
