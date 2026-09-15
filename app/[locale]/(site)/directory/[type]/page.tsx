import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { DIRECTORY_TYPES, getListings } from '@/lib/queries';
import { breadcrumbJsonLd, itemListJsonLd, ld, pageMetadata } from '@/lib/seo';
import DirectoryMap from '@/components/DirectoryMap';

export const revalidate = 300;

export function generateStaticParams() {
  return DIRECTORY_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; type: string }> }): Promise<Metadata> {
  const { locale, type } = await params;
  if (!isLocale(locale) || !DIRECTORY_TYPES.includes(type as never)) return {};
  const t = await getTranslations({ locale });
  const label = t(`directory.${type}`);
  return pageMetadata({ locale: locale as Locale, path: `/directory/${type}`, title: `${label} · ${t('directory.title')}`, description: t('directory.intro'), kicker: 'Cyprus Lifestyle' });
}

export default async function DirectoryType({ params }: { params: Promise<{ locale: string; type: string }> }) {
  const { locale, type } = await params;
  if (!isLocale(locale) || !DIRECTORY_TYPES.includes(type as never)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const listings = await getListings(l, type);
  const label = t(`directory.${type}`);
  const points = listings.filter((x) => x.lat != null && x.lng != null)
    .map((x) => ({ lat: x.lat as number, lng: x.lng as number, name: x.name, type: x.type, href: `/${l}/directory/${x.type}/${x.slug}` }));
  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('directory.title'), path: '/directory' },
    { name: label, path: `/directory/${type}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(itemListJsonLd(l, listings.slice(0, 50))) }} />
      <div className="wrap dept">
        <span className="kicker"><Link href="/directory">{t('directory.title')}</Link></span>
        <h1>{label}</h1>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      {points.length ? <div className="wrap section"><DirectoryMap points={points} locale={l} /></div> : null}

      <div className="wrap section">
        {listings.length ? (
          <div className="grid g3">
            {listings.map((x) => (
              <article key={x.id} className="card">
                <Link href={`/directory/${x.type}/${x.slug}`}>
                  <span className="kicker">{x.district || label}{x.price_band ? ` · ${x.price_band}` : ''}</span>
                  <h3>{x.name}</h3>
                </Link>
                {x.summary ? <p className="dek">{x.summary}</p> : null}
              </article>
            ))}
          </div>
        ) : <p>{t('directory.none')}</p>}
      </div>
    </>
  );
}
