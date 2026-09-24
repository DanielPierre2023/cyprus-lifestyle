import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { Link } from '@/lib/i18n/routing';
import { pageMetadata } from '@/lib/seo';
import { JsonLd, breadcrumb, faqPage } from '@/lib/seo/jsonld';
import { ALL_INTENTS } from '@/lib/knowledge/qa';
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
    guidesTitle: t('concierge.guidesTitle'),
    req: {
      title: t('concierge.req.title'), intro: t('concierge.req.intro'),
      emailPh: t('concierge.req.emailPh'), notePh: t('concierge.req.notePh'),
      send: t('concierge.req.send'), sending: t('concierge.req.sending'), sent: t('concierge.req.sent'),
      trust: t('concierge.req.trust'), trustLink: t('concierge.req.trustLink'),
    },
  };
  const crumbLd = breadcrumb(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('concierge.title'), path: '/ask' },
  ]);
  // FAQPage from the knowledge base's real questions + answers (English source —
  // the same grounding the concierge answers from). A representative sample keeps
  // the structured data lean while covering the top visitor intents.
  const faqLd = faqPage(ALL_INTENTS.slice(0, 12).map((h) => ({ q: h.item.q, a: h.item.a })));

  return (
    <>
      <JsonLd data={crumbLd} />
      <JsonLd data={faqLd} />
      <div className="wrap dept">
        <span className="kicker">{t('brand.name')}</span>
        <h1>{t('concierge.title')}</h1>
        <p className="desc">{t('concierge.intro')}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <div className="wrap section">
        <Concierge locale={l} labels={labels} autofocus />
        <p style={{ marginTop: 22, fontFamily: 'var(--sans)', fontSize: 15, display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <Link href="/guide">{t('guide.title')} →</Link>
          <Link href="/when-to-visit">{t('whenToVisit.title')} →</Link>
        </p>
      </div>
    </>
  );
}
