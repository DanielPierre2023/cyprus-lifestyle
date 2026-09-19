import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { getByGroup } from '@/lib/queries';
import { GROUP_KEYS } from '@/lib/taxonomy';
import { breadcrumbJsonLd, itemListJsonLd, ld, pageMetadata } from '@/lib/seo';
import DirectoryMap from '@/components/DirectoryMap';
import CoverImage from '@/components/CoverImage';

export const revalidate = 300;

export function generateStaticParams() {
  return GROUP_KEYS.map((group) => ({ group }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; group: string }> }): Promise<Metadata> {
  const { locale, group } = await params;
  if (!isLocale(locale) || !GROUP_KEYS.includes(group)) return {};
  const t = await getTranslations({ locale });
  const label = t(`groups.${group}`);
  return pageMetadata({ locale: locale as Locale, path: `/directory/g/${group}`, title: `${label} · ${t('directory.title')}`, description: t('directory.intro'), kicker: 'Cyprus Lifestyle' });
}

export default async function GroupPage({ params }: { params: Promise<{ locale: string; group: string }> }) {
  const { locale, group } = await params;
  if (!isLocale(locale) || !GROUP_KEYS.includes(group)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const listings = await getByGroup(l, group);
  const label = t(`groups.${group}`);
  const points = listings.filter((x) => x.lat != null && x.lng != null)
    .map((x) => ({ lat: x.lat as number, lng: x.lng as number, name: x.name, type: x.type, image: x.image, href: `/${l}/directory/${x.type}/${x.slug}` }));
  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('directory.title'), path: '/directory' },
    { name: label, path: `/directory/g/${group}` },
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

      {points.length ? <div className="wrap section"><DirectoryMap points={points} locale={l} viewLabel={t('directory.view')} placesLabel={t('directory.places')} ariaLabel={t('directory.mapAria')} /></div> : null}

      <div className="wrap section">
        {listings.length ? (
          <div className="grid g3">
            {listings.map((x) => (
              <article key={x.id} className="card">
                <Link href={`/directory/${x.type}/${x.slug}`} className="ph" aria-hidden="true" tabIndex={-1}>
                  <CoverImage src={x.image} seed={x.slug} alt={x.name} className="ph-img" sizes="(max-width: 900px) 100vw, 33vw" fallbackKind="brand" />
                </Link>
                <span className="kicker">{x.district || label}{x.price_band ? ` · ${x.price_band}` : ''}</span>
                <h3><Link href={`/directory/${x.type}/${x.slug}`}>{x.name}</Link></h3>
                {x.rating != null ? <p style={{ margin: '2px 0 0', fontFamily: 'var(--sans)', fontSize: 14, color: '#8a5b12' }}>★ {x.rating.toFixed(1)}{x.rating_count ? <span className="muted" style={{ color: 'var(--ink-soft,#5b5346)' }}> · {x.rating_count.toLocaleString(l)}</span> : null}</p> : null}
                {x.summary ? <p>{x.summary}</p> : null}
              </article>
            ))}
          </div>
        ) : <p>{t('directory.none')}</p>}
      </div>
    </>
  );
}
