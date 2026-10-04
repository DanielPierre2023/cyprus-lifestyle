import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { getMapItems } from '@/lib/queries';
import { pageMetadata } from '@/lib/seo';
import LiveMap from '@/components/LiveMap';
import MapExplorer from '@/components/MapExplorer';
import GygWidget from '@/components/GygWidget';
import { explorerOnMapPage } from '@/lib/map/flags';
import { getExplorerCounts } from '@/lib/map/explorer-data';
import { explorerCategories, explorerGroups } from '@/lib/map/explorer-taxonomy';
import { explorerUi } from '@/lib/map/explorer-i18n';

export const revalidate = 300;

// The map draws its base tiles + coordinates on the client, so keep it dynamic.
const TITLE: Record<string, string> = { en: 'The Map', el: 'Ο Χάρτης', ro: 'Harta', ar: 'الخريطة', de: 'Die Karte', pl: 'Mapa', ru: 'Карта' };
const DEK: Record<string, string> = {
  en: 'Every address we cover — restaurants, wineries, hotels, beaches and what’s on — on one living map of the island.',
  el: 'Κάθε διεύθυνση που καλύπτουμε — εστιατόρια, οινοποιεία, ξενοδοχεία, παραλίες και εκδηλώσεις — σε έναν ζωντανό χάρτη του νησιού.',
  ro: 'Fiecare adresă pe care o acoperim — restaurante, crame, hoteluri, plaje și evenimente — pe o singură hartă vie a insulei.',
  ar: 'كل عنوان نغطيه — مطاعم ومصانع نبيذ وفنادق وشواطئ وفعاليات — على خريطة حية واحدة للجزيرة.',
  de: 'Jede Adresse, die wir abdecken — Restaurants, Weingüter, Hotels, Strände und Veranstaltungen — auf einer lebendigen Karte der Insel.',
  pl: 'Każdy adres, który obejmujemy — restauracje, winnice, hotele, plaże i wydarzenia — na jednej żywej mapie wyspy.',
  ru: 'Каждый адрес, который мы охватываем — рестораны, винодельни, отели, пляжи и события — на одной живой карте острова.',
};

const WIDGET_TITLE: Record<string, string> = {
  en: 'Book experiences across Cyprus', el: 'Κλείστε εμπειρίες σε όλη την Κύπρο', ro: 'Rezervă experiențe în tot Ciprul', ar: 'احجز تجارب في جميع أنحاء قبرص',
  de: 'Erlebnisse in ganz Zypern buchen', pl: 'Zarezerwuj atrakcje na całym Cyprze', ru: 'Бронируйте впечатления по всему Кипру',
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

  const head = (
    <div className="page-head" style={{ marginBottom: 16 }}>
      <span className="kicker">{t('brand.name')}</span>
      <h1 style={{ margin: '4px 0 0' }}>{TITLE[l] || TITLE.en}</h1>
      <p className="dek" style={{ maxWidth: '60ch' }}>{DEK[l] || DEK.en}</p>
      <div className="rule-orn orn"><span className="diamond" /></div>
    </div>
  );

  // New explorer (MAP_EXPLORER=map|all, the default): the whole directory — every
  // geocoded published + listed business in all canonical categories, plus events.
  // Counts are for the first paint; the client loads /api/map/index for the pins.
  if (explorerOnMapPage()) {
    const counts = await getExplorerCounts().catch(() => ({ cats: {} as Record<string, number>, districts: {}, total: 0 }));
    const ui = explorerUi(l, (k) => t(k));
    return (
      <div className="wrap" style={{ paddingTop: 26, paddingBottom: 34 }}>
        {head}
        <MapExplorer locale={l} mode="page" ui={ui}
          categories={explorerCategories(l, counts.cats, ui.events)} groups={explorerGroups(l, ui.events)} />
        <section style={{ marginTop: 34 }}>
          <h2 style={{ fontFamily: 'var(--disp)', fontWeight: 600, fontSize: 24, margin: '0 0 12px' }}>{WIDGET_TITLE[l] || WIDGET_TITLE.en}</h2>
          <GygWidget kind="city" location="cyprus" locale={l} campaign="cl-map-widget" />
        </section>
      </div>
    );
  }

  // Original map (MAP_EXPLORER=off) — unchanged.
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
      {head}
      <LiveMap items={items} locale={l} labels={labels} ui={{ search: t('directory.searchPlaces'), inView: t('directory.inView'), noMatches: t('directory.noMatches'), mapAria: t('directory.mapAria'), live: t('nav.live'), watchLive: t('live.watchLive') }} />
    </div>
  );
}
