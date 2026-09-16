import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { getMapItems } from '@/lib/queries';
import { pageMetadata } from '@/lib/seo';
import LiveMap from '@/components/LiveMap';

export const revalidate = 300;

// The map draws its base tiles + coordinates on the client, so keep it dynamic.
const TITLE: Record<string, string> = { en: 'The Map', el: 'Ο Χάρτης', ro: 'Harta', ar: 'الخريطة' };
const DEK: Record<string, string> = {
  en: 'Every address we cover — restaurants, wineries, hotels, beaches and what’s on — on one living map of the island.',
  el: 'Κάθε διεύθυνση που καλύπτουμε — εστιατόρια, οινοποιεία, ξενοδοχεία, παραλίες και εκδηλώσεις — σε έναν ζωντανό χάρτη του νησιού.',
  ro: 'Fiecare adresă pe care o acoperim — restaurante, crame, hoteluri, plaje și evenimente — pe o singură hartă vie a insulei.',
  ar: 'كل عنوان نغطيه — مطاعم ومصانع نبيذ وفنادق وشواطئ وفعاليات — على خريطة حية واحدة للجزيرة.',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const l = locale as Locale;
  return pageMetadata({ locale: l, path: '/map', title: TITLE[l] || TITLE.en, description: DEK[l] || DEK.en, kicker: 'Cyprus Lifestyle' });
}

export default async function MapPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const items = await getMapItems(l);

  const labels: Record<string, string> = {
    restaurant: t('directory.restaurant'),
    winery: t('directory.winery'),
    hotel: t('directory.hotel'),
    beach: t('directory.beach'),
    development: t('directory.development'),
    vendor: t('directory.vendor'),
    event: t('nav.agenda'),
  };

  return (
    <div className="wrap" style={{ paddingTop: 26, paddingBottom: 34 }}>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <span className="kicker">{t('brand.name')}</span>
        <h1 style={{ margin: '4px 0 0' }}>{TITLE[l] || TITLE.en}</h1>
        <p className="dek" style={{ maxWidth: '60ch' }}>{DEK[l] || DEK.en}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <LiveMap items={items} locale={l} labels={labels} />
    </div>
  );
}
