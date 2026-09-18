import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { DIRECTORY_TYPES, getListings, getDirectoryMapPoints, getDirectoryCounts } from '@/lib/queries';
import { breadcrumbJsonLd, itemListJsonLd, ld, pageMetadata } from '@/lib/seo';
import DirectoryMap from '@/components/DirectoryMap';
import CoverImage from '@/components/CoverImage';

export const revalidate = 300;

const PREVIEW = 6; // cards shown per category on the index

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale: locale as Locale, path: '/directory', title: t('directory.title'), description: t('directory.intro'), kicker: 'Cyprus Lifestyle' });
}

export default async function DirectoryIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  // Map = every published listing (paginated past the 1000 cap). Chips = true head
  // counts. Sections = a small preview per category (the full list lives on /directory/[type]).
  const [rawPoints, counts, previews] = await Promise.all([
    getDirectoryMapPoints(l),
    getDirectoryCounts(),
    Promise.all(DIRECTORY_TYPES.map(async (ty) => ({ ty, items: await getListings(l, ty, PREVIEW) }))),
  ]);
  const points = rawPoints.map((p) => ({ lat: p.lat, lng: p.lng, name: p.name, type: p.type, image: p.image, href: `/${l}/directory/${p.type}/${p.slug}` }));
  const typeLabels: Record<string, string> = Object.fromEntries(DIRECTORY_TYPES.map((ty) => [ty, t(`directory.${ty}`)]));
  const groups = previews.map((g) => ({ ...g, count: counts[g.ty] || 0 })).filter((g) => g.count > 0);
  const sample = previews.flatMap((g) => g.items).slice(0, 50);
  const crumbLd = breadcrumbJsonLd(l, [{ name: t('brand.name'), path: '/' }, { name: t('directory.title'), path: '/directory' }]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(itemListJsonLd(l, sample)) }} />

      <div className="wrap dept">
        <span className="kicker">{t('brand.name')}</span>
        <h1>{t('directory.title')}</h1>
        <p className="desc">{t('directory.intro')}</p>
        <div className="chips">
          {groups.map(({ ty, count }) => (
            <a key={ty} className="chip" href={`#${ty}`}>{typeLabels[ty]} <span className="chip-n">{count}</span></a>
          ))}
        </div>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      {points.length ? (
        <div className="wrap section"><DirectoryMap points={points} typeLabels={typeLabels} locale={l} /></div>
      ) : null}

      {groups.length ? groups.map(({ ty, items, count }) => (
        <section key={ty} id={ty} className="wrap section dir-group">
          <div className="dir-group-head">
            <h2><span className="dot" style={{ background: `var(--dir-${ty})` }} />{typeLabels[ty]}</h2>
            {count > PREVIEW ? <Link className="see-all" href={`/directory/${ty}`}>{t('directory.all')} ({count}) →</Link> : null}
          </div>
          <div className="grid g3">
            {items.slice(0, PREVIEW).map((x) => (
              <article key={x.id} className="card">
                <Link href={`/directory/${x.type}/${x.slug}`} className="ph" aria-hidden="true" tabIndex={-1}>
                  <CoverImage src={x.image} seed={x.slug} alt={x.name} className="ph-img" sizes="(max-width: 900px) 100vw, 33vw" />
                </Link>
                <span className="kicker">{x.district || typeLabels[ty]}{x.price_band ? ` · ${x.price_band}` : ''}</span>
                <h3><Link href={`/directory/${x.type}/${x.slug}`}>{x.name}</Link></h3>
                {x.summary ? <p>{x.summary}</p> : null}
              </article>
            ))}
          </div>
        </section>
      )) : (
        <div className="wrap section"><p>{t('directory.none')}</p></div>
      )}
    </>
  );
}
