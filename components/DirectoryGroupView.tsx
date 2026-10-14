// The body of /directory/g/<group> and /directory/g/<group>/p/<n> (plan item V1). Same idea as DirectoryTypeView: a ranked page of 48.
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/locales';
import { getListingsPage } from '@/lib/queries';
import { breadcrumbJsonLd, itemListJsonLd, ld } from '@/lib/seo';
import DirectoryMap from '@/components/DirectoryMap';
import DirectoryPagedList, { type PagerLabels } from '@/components/DirectoryPagedList';

export default async function DirectoryGroupView({ locale, group, page }: { locale: Locale; group: string; page: number }) {
  const t = await getTranslations();
  const result = await getListingsPage(locale, { group, page });
  if (page > result.pages || (page > 1 && !result.items.length)) notFound();
  const label = t(`groups.${group}`);
  const base = `/directory/g/${group}`;
  const points = result.items.filter((x) => x.lat != null && x.lng != null)
    .map((x) => ({ lat: x.lat as number, lng: x.lng as number, name: x.name, type: x.type, image: x.image, href: `/${locale}/directory/${x.type}/${x.slug}` }));
  const crumbLd = breadcrumbJsonLd(locale, [
    { name: t('brand.name'), path: '/' },
    { name: t('directory.title'), path: '/directory' },
    { name: label, path: base },
  ]);
  const labels: PagerLabels = { prev: t('directory.pagePrev'), next: t('directory.pageNext'), page: t('directory.pageLabel') };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(itemListJsonLd(locale, result.items.slice(0, 50))) }} />
      <div className="wrap dept">
        <span className="kicker"><Link href="/directory">{t('directory.title')}</Link></span>
        <h1>{label}</h1>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      {points.length ? <div className="wrap section"><DirectoryMap points={points} locale={locale} viewLabel={t('directory.view')} placesLabel={t('directory.places')} ariaLabel={t('directory.mapAria')} /></div> : null}

      <div className="wrap section">
        <DirectoryPagedList locale={locale} items={result.items} kickerFallback={label} base={base} page={result.page} pages={result.pages} total={result.total} labels={labels} noneLabel={t('directory.none')} showRating />
      </div>
    </>
  );
}
