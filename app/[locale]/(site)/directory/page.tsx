import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { DIRECTORY_TYPES, getListings } from '@/lib/queries';
import { breadcrumbJsonLd, itemListJsonLd, ld, pageMetadata } from '@/lib/seo';
import DirectoryMap from '@/components/DirectoryMap';

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
  const listings = await getListings(l);

  const points = listings.filter((x) => x.lat != null && x.lng != null)
    .map((x) => ({ lat: x.lat as number, lng: x.lng as number, name: x.name, type: x.type, href: `/${l}/directory/${x.type}/${x.slug}` }));
  const typeLabels: Record<string, string> = Object.fromEntries(DIRECTORY_TYPES.map((ty) => [ty, t(`directory.${ty}`)]));
  // Group by type, preserving the canonical category order.
  const groups = DIRECTORY_TYPES.map((ty) => ({ ty, items: listings.filter((x) => x.type === ty) })).filter((g) => g.items.length);
  const crumbLd = breadcrumbJsonLd(l, [{ name: t('brand.name'), path: '/' }, { name: t('directory.title'), path: '/directory' }]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(itemListJsonLd(l, listings.slice(0, 50))) }} />

      <div className="wrap dept">
        <span className="kicker">{t('brand.name')}</span>
        <h1>{t('directory.title')}</h1>
        <p className="desc">{t('directory.intro')}</p>
        <div className="chips">
          {groups.map(({ ty, items }) => (
            <a key={ty} className="chip" href={`#${ty}`}>{typeLabels[ty]} <span className="chip-n">{items.length}</span></a>
          ))}
        </div>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      {points.length ? (
        <div className="wrap section"><DirectoryMap points={points} typeLabels={typeLabels} locale={l} /></div>
      ) : null}

      {groups.length ? groups.map(({ ty, items }) => (
        <section key={ty} id={ty} className="wrap section dir-group">
          <div className="dir-group-head">
            <h2><span className="dot" style={{ background: `var(--dir-${ty})` }} />{typeLabels[ty]}</h2>
            {items.length > PREVIEW ? <Link className="see-all" href={`/directory/${ty}`}>{t('directory.all')} ({items.length}) →</Link> : null}
          </div>
          <div className="grid g3">
            {items.slice(0, PREVIEW).map((x) => (
              <article key={x.id} className="card">
                <Link href={`/directory/${x.type}/${x.slug}`}>
                  <span className="kicker">{x.district || typeLabels[ty]}{x.price_band ? ` · ${x.price_band}` : ''}</span>
                  <h3>{x.name}</h3>
                </Link>
                {x.summary ? <p className="dek">{x.summary}</p> : null}
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
