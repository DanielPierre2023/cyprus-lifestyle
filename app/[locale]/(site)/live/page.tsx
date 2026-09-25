import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { getPublishedWebcams } from '@/lib/webcams';
import { nowcastByKey, type GeoKey } from '@/lib/weather';
import { pageMetadata } from '@/lib/seo';
import WebcamGrid, { type WebcamCard } from '@/components/WebcamGrid';

// Cams + sea-temperature nowcast; refresh every 15 min (matches the nowcast TTL).
export const revalidate = 900;

const TITLE: Record<string, string> = { en: 'Cyprus Live', el: 'Η Κύπρος Ζωντανά', ro: 'Cipru în Direct', ar: 'قبرص مباشر', de: 'Zypern Live', pl: 'Cypr na Żywo', ru: 'Кипр в прямом эфире' };
const DEK: Record<string, string> = {
  en: 'Real-time views from Cyprus’s beaches, mountains and towns — check conditions before you go.',
  el: 'Ζωντανές εικόνες από τις παραλίες, τα βουνά και τις πόλεις της Κύπρου — δείτε τις συνθήκες πριν πάτε.',
  ro: 'Imagini în timp real de pe plajele, munții și orașele Ciprului — verifică condițiile înainte să pleci.',
  ar: 'مشاهد حية من شواطئ قبرص وجبالها ومدنها — تحقق من الأحوال قبل أن تذهب.',
  de: 'Echtzeit-Ansichten von Zyperns Stränden, Bergen und Städten — prüfen Sie die Bedingungen, bevor Sie losfahren.',
  pl: 'Podglądy na żywo z plaż, gór i miast Cypru — sprawdź warunki, zanim wyruszysz.',
  ru: 'Виды в реальном времени с пляжей, гор и городов Кипра — проверьте условия перед поездкой.',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const l = locale as Locale;
  return pageMetadata({ locale: l, path: '/live', title: TITLE[l] || TITLE.en, description: DEK[l] || DEK.en, kicker: 'Cyprus Lifestyle' });
}

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();

  const cams = await getPublishedWebcams(l);

  // Sea-temperature nowcast for beach cams that have coordinates (one batched call).
  const beachPoints: GeoKey[] = cams
    .filter((c) => c.category === 'beach' && c.lat != null && c.lng != null)
    .map((c) => ({ key: c.slug, lat: c.lat as number, lng: c.lng as number }));
  const nowcast = beachPoints.length ? await nowcastByKey(beachPoints) : {};

  const cards: WebcamCard[] = cams.map((c) => ({
    slug: c.slug,
    name: c.name,
    provider: c.provider,
    embedRef: c.embedRef,
    externalUrl: c.externalUrl,
    thumbUrl: c.thumbUrl,
    area: c.area,
    district: c.district,
    category: c.category,
    tags: c.tags,
    seaTempC: nowcast[c.slug]?.seaTempC ?? null,
  }));

  const labels = {
    all: t('live.all'),
    beach: t('live.beach'),
    mountain: t('live.mountain'),
    city: t('live.city'),
    village: t('live.village'),
    watchLive: t('live.watchLive'),
    snapshot: t('live.snapshot'),
    seaTemp: t('live.seaTemp'),
    none: t('live.none'),
    live: t('live.live'),
  };

  return (
    <div className="wrap" style={{ paddingTop: 26, paddingBottom: 40 }}>
      <div className="page-head" style={{ marginBottom: 16 }}>
        <span className="kicker">{t('brand.name')}</span>
        <h1 style={{ margin: '4px 0 0' }}>{TITLE[l] || TITLE.en}</h1>
        <p className="dek" style={{ maxWidth: '60ch' }}>{DEK[l] || DEK.en}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <WebcamGrid cams={cards} labels={labels} />
    </div>
  );
}
