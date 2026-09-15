import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { DIRECTORY_TYPES, getListing } from '@/lib/queries';
import { breadcrumbJsonLd, ld, listingJsonLd, pageMetadata } from '@/lib/seo';
import DirectoryMap from '@/components/DirectoryMap';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; type: string; slug: string }> }): Promise<Metadata> {
  const { locale, type, slug } = await params;
  if (!isLocale(locale)) return {};
  const listing = await getListing(locale as Locale, slug);
  if (!listing) return {};
  return pageMetadata({
    locale: locale as Locale, path: `/directory/${type}/${slug}`,
    title: listing.name, description: listing.summary, cover: listing.image, kicker: 'Cyprus Lifestyle',
  });
}

export default async function ListingDetail({ params }: { params: Promise<{ locale: string; type: string; slug: string }> }) {
  const { locale, type, slug } = await params;
  if (!isLocale(locale) || !DIRECTORY_TYPES.includes(type as never)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const x = await getListing(l, slug);
  if (!x) notFound();

  const label = t(`directory.${x.type}`);
  const listLd = listingJsonLd({
    locale: l, slug: x.slug, type: x.type, name: x.name, description: x.summary,
    url: x.url, image: x.image, address: x.address, lat: x.lat, lng: x.lng,
    district: x.district, priceRange: x.price_band,
  });
  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('directory.title'), path: '/directory' },
    { name: label, path: `/directory/${x.type}` },
    { name: x.name, path: `/directory/${x.type}/${x.slug}` },
  ]);
  const points = (x.lat != null && x.lng != null) ? [{ lat: x.lat, lng: x.lng, name: x.name }] : [];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(listLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <div className="page wrap">
        <div className="page-head">
          <span className="kicker">
            <Link href={`/directory/${x.type}`}>{label}</Link>{x.district ? ` · ${x.district}` : ''}
          </span>
          <h1>{x.name}</h1>
          {x.summary ? <p className="dek">{x.summary}</p> : null}
          <div className="meta">
            {[x.price_band, x.address].filter(Boolean).join(' · ')}
          </div>
          {x.url ? (
            <p style={{ marginTop: 10 }}>
              <a className="abtn gold" href={x.url} target="_blank" rel="noopener nofollow">{t('directory.visit')}</a>
            </p>
          ) : null}
          <div className="rule-orn orn"><span className="diamond" /></div>
        </div>

        {points.length ? <DirectoryMap points={points} height={320} /> : null}
      </div>
    </>
  );
}
