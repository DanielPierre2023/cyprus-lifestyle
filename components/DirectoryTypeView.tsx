// The body of /directory/<type> and /directory/<type>/p/<n> (plan item V1): one ranked, paginated page of a type, with the
// "best in <district>" chips and a map of the businesses on THIS page (a page of 48 pins, never 13,000).
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/locales';
import { getListingsPage, getCollectionFacets, tagPage, cacheTag, cacheTagWithLocale } from '@/lib/queries.cached';
import { districtLabel } from '@/lib/collections';
import { breadcrumbJsonLd, itemListJsonLd, ld } from '@/lib/seo';
import DirectoryMap from '@/components/DirectoryMap';
import DirectoryPagedList, { type PagerLabels } from '@/components/DirectoryPagedList';

export default async function DirectoryTypeView({ locale, type, page }: { locale: Locale; type: string; page: number }) {
  const t = await getTranslations();
  const [result, allFacets] = await Promise.all([
    getListingsPage(locale, { type, page }),
    getCollectionFacets(),
    tagPage([...cacheTagWithLocale(cacheTag.dir(type), locale), ...cacheTagWithLocale(cacheTag.dir(null), locale)], `dirtype:${type}:${locale}:${page}`),
  ]);
  if (page > result.pages || (page > 1 && !result.items.length)) notFound();
  const collections = allFacets.filter((f) => f.type === type).slice(0, 12);
  const label = t(`directory.${type}`);
  const base = `/directory/${type}`;
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

      {collections.length && page === 1 ? (
        <div className="wrap section">
          <h2 className="cl-bd-h">{t('collections.rankedTitle')} · {label}</h2>
          <div className="cl-bydistrict">
            {collections.map((f) => (
              <Link key={f.slug} href={`/best/${f.slug}`} className="cl-dchip">
                {districtLabel(f.district)}<span className="n">{f.count}</span>
              </Link>
            ))}
          </div>
          <style>{`
            .cl-bd-h{font-family:var(--disp);font-weight:600;font-size:20px;margin:0 0 14px}
            .cl-bydistrict{display:flex;flex-wrap:wrap;gap:10px}
            .cl-dchip{display:inline-flex;align-items:center;gap:9px;padding:8px 14px;border:1px solid var(--line,#e0d6c1);border-radius:999px;background:#fff;font-family:var(--sans);font-size:15px;color:var(--ink,#171310)}
            .cl-dchip:hover{background:var(--paper-2,#efe8d8);text-decoration:none;border-color:#C9A24C}
            .cl-dchip .n{font-size:12px;color:var(--ink-soft,#5b5346);background:var(--paper-2,#efe8d8);border-radius:999px;padding:1px 8px}
          `}</style>
        </div>
      ) : null}

      {points.length ? <div className="wrap section"><DirectoryMap points={points} locale={locale} viewLabel={t('directory.view')} placesLabel={t('directory.places')} ariaLabel={t('directory.mapAria')} /></div> : null}

      <div className="wrap section">
        <DirectoryPagedList locale={locale} items={result.items} kickerFallback={label} base={base} page={result.page} pages={result.pages} total={result.total} labels={labels} noneLabel={t('directory.none')} />
      </div>
    </>
  );
}
