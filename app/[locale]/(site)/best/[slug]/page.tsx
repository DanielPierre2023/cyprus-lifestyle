import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import {
  getCollectionFacets, getCollectionBySlug, getCollectionListings,
  getCollectionsInDistrict, getEventsByDistrict,
} from '@/lib/queries';
import { INTENT_BUNDLES, districtLabel } from '@/lib/collections';
import { breadcrumbJsonLd, itemListJsonLd, faqJsonLd, listingJsonLd, ld, pageMetadata } from '@/lib/seo';
import DirectoryMap from '@/components/DirectoryMap';
import CoverImage from '@/components/CoverImage';

export const revalidate = 300;

// Pre-render the default-edition pages; other locales render on demand (ISR).
// Resilient: if the DB is unreachable at build time, fall back to on-demand
// rendering rather than failing the whole build.
export async function generateStaticParams() {
  try {
    const facets = await getCollectionFacets();
    return facets.map((f) => ({ slug: f.slug }));
  } catch {
    return [];
  }
}

const TYPE_DOT: Record<string, string> = {
  restaurant: '#C0492E', winery: '#7B2D42', hotel: '#1F6F78',
  beach: '#2F86C4', development: '#8A6D3B', vendor: '#4E7A46',
};

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return <span aria-label={`${rating} out of 5`} style={{ color: '#C9A24C', letterSpacing: 1 }}>{'★'.repeat(full)}<span style={{ color: '#d9cfba' }}>{'★'.repeat(5 - full)}</span></span>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const facet = await getCollectionBySlug(slug);
  if (!facet) return {};
  const t = await getTranslations({ locale });
  const type = t(`directory.${facet.type}`);
  const place = districtLabel(facet.district);
  return pageMetadata({
    locale: locale as Locale, path: `/best/${slug}`,
    title: t('collections.heading', { type, place }),
    description: t('collections.intro', { count: facet.count, type: type.toLowerCase(), place }),
    kicker: 'Cyprus Lifestyle',
  });
}

export default async function CollectionPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const facet = await getCollectionBySlug(slug);
  if (!facet) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();

  const [listings, siblings, events] = await Promise.all([
    getCollectionListings(l, facet.type, facet.district, 30),
    getCollectionsInDistrict(facet.districtSlug, facet.type),
    getEventsByDistrict(l, facet.district, 3),
  ]);
  if (!listings.length) notFound();

  const type = t(`directory.${facet.type}`);
  const typeLower = type.toLowerCase();
  const place = districtLabel(facet.district);
  const typeLabels: Record<string, string> = Object.fromEntries(
    Object.keys(INTENT_BUNDLES).map((ty) => [ty, t(`directory.${ty}`)]),
  );
  const top = listings.find((x) => x.rating != null) || listings[0];

  // Intent bundle: sibling collections in this district, in a sensible order.
  const order = INTENT_BUNDLES[facet.type] || [];
  const bundle = [...siblings].sort((a, b) => {
    const ia = order.indexOf(a.type), ib = order.indexOf(b.type);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || b.count - a.count;
  });

  const points = listings.filter((x) => x.lat != null && x.lng != null)
    .map((x) => ({ lat: x.lat as number, lng: x.lng as number, name: x.name, type: x.type, image: x.image, href: `/${l}/directory/${x.type}/${x.slug}` }));

  const faqs = [
    { q: t('collections.faqQ1', { type: typeLower, place }), a: t('collections.faqA1', { count: facet.count, type: typeLower, place }) },
    { q: t('collections.faqQ2', { type: typeLower, place }), a: t('collections.faqA2', { top: top.name, place }) },
  ];

  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('directory.title'), path: '/directory' },
    { name: type, path: `/directory/${facet.type}` },
    { name: place, path: `/best/${slug}` },
  ]);

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString(l, { day: 'numeric', month: 'short' });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(itemListJsonLd(l, listings)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faqJsonLd(faqs)) }} />
      {listings.slice(0, 10).map((x) => (
        <script key={x.id} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(listingJsonLd({
          locale: l, slug: x.slug, type: x.type, name: x.name, description: x.summary,
          url: x.url, image: x.image, address: x.address, lat: x.lat, lng: x.lng,
          district: x.district, priceRange: x.price_band, rating: x.rating, ratingCount: x.rating_count,
        })) }} />
      ))}

      {/* ── Header ── */}
      <div className="wrap dept">
        <span className="kicker">
          <Link href="/directory">{t('directory.title')}</Link> · <Link href={`/directory/${facet.type}`}>{type}</Link>
        </span>
        <h1>{t('collections.heading', { type, place })}</h1>
        <p className="desc">{t('collections.intro', { count: facet.count, type: typeLower, place })}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      {points.length ? <div className="wrap section"><DirectoryMap points={points} locale={l} typeLabels={typeLabels} /></div> : null}

      {/* ── Ranked list ── */}
      <div className="wrap section">
        <h2 className="cl-h2">{t('collections.rankedTitle')}</h2>
        <div className="grid g3">
          {listings.map((x, i) => (
            <article key={x.id} className="card cl-card">
              <Link href={`/directory/${x.type}/${x.slug}`} className="ph" aria-hidden="true" tabIndex={-1}>
                <CoverImage src={x.image} seed={x.slug} alt={x.name} className="ph-img" sizes="(max-width: 900px) 100vw, 33vw" fallbackKind="brand" />
                <span className="cl-rank">{i + 1}</span>
              </Link>
              <span className="kicker">{place}{x.price_band ? ` · ${x.price_band}` : ''}</span>
              <h3><Link href={`/directory/${x.type}/${x.slug}`}>{x.name}</Link></h3>
              {x.rating != null ? (
                <div className="cl-rate"><Stars rating={x.rating} /> <b>{x.rating.toFixed(1)}</b>{x.rating_count ? <span className="muted"> · {x.rating_count.toLocaleString(l)} {t('collections.reviews')}</span> : null}</div>
              ) : null}
              {x.verified ? <span className="cl-verified">✓ {t('collections.verified')}</span> : null}
              {x.summary ? <p>{x.summary}</p> : null}
            </article>
          ))}
        </div>
        <p className="cl-seeall"><Link href={`/directory/${facet.type}`}>{t('collections.seeAllType', { type: typeLower })} →</Link></p>
      </div>

      {/* ── Intent bundle: also in this district ── */}
      {bundle.length ? (
        <div className="wrap section">
          <h2 className="cl-h2">{t('collections.alsoTitle', { place })}</h2>
          <div className="cl-bundle">
            {bundle.map((b) => (
              <Link key={b.slug} href={`/best/${b.slug}`} className="cl-chip">
                <span className="d" style={{ background: TYPE_DOT[b.type] || '#C9A24C' }} />
                {typeLabels[b.type] || b.type}
                <span className="n">{b.count}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── What's on ── */}
      {events.length ? (
        <div className="wrap section">
          <h2 className="cl-h2">{t('collections.whatsOnTitle', { place })}</h2>
          <div className="cl-events">
            {events.map((e) => (
              <Link key={e.id} href={`/agenda/${e.slug}`} className="cl-event">
                <span className="d">{fmtDate(e.starts_at)}</span>
                <span className="ti">{e.title}{e.venue ? <span className="muted"> · {e.venue}</span> : null}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {/* ── FAQ ── */}
      <div className="wrap section">
        <h2 className="cl-h2">{t('collections.faqTitle')}</h2>
        <div className="cl-faq">
          {faqs.map((f, i) => (
            <details key={i} className="cl-faq-item" open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>

      <style>{`
        .cl-h2{font-family:var(--disp);font-weight:600;font-size:26px;margin:0 0 18px}
        .cl-card{position:relative}
        .cl-rank{position:absolute;top:10px;left:10px;z-index:2;display:inline-flex;align-items:center;justify-content:center;min-width:30px;height:30px;padding:0 8px;border-radius:999px;background:rgba(11,14,17,.82);color:#F1D592;font-family:var(--sans);font-weight:700;font-size:15px;border:1px solid rgba(241,213,146,.5)}
        .cl-rate{font-family:var(--sans);font-size:14px;margin:2px 0 0;display:flex;align-items:center;gap:6px}
        .cl-rate .muted{color:var(--ink-soft,#5b5346)}
        .cl-verified{display:inline-block;font-size:11px;font-weight:700;color:#8a5b12;background:rgba(201,162,76,.16);border:1px solid #C9A24C;border-radius:999px;padding:1px 8px;margin:6px 0 0}
        .cl-seeall{margin-top:20px;font-family:var(--sans);font-size:15px}
        .cl-bundle{display:flex;flex-wrap:wrap;gap:10px}
        .cl-chip{display:inline-flex;align-items:center;gap:9px;padding:9px 15px;border:1px solid var(--line,#e0d6c1);border-radius:999px;background:#fff;font-family:var(--sans);font-size:15px;color:var(--ink,#171310)}
        .cl-chip:hover{background:var(--paper-2,#efe8d8);text-decoration:none;border-color:#C9A24C}
        .cl-chip .d{width:9px;height:9px;border-radius:50%;display:inline-block}
        .cl-chip .n{font-size:12px;color:var(--ink-soft,#5b5346);background:var(--paper-2,#efe8d8);border-radius:999px;padding:1px 8px}
        .cl-events{display:flex;flex-direction:column;border:1px solid var(--line,#e0d6c1);border-radius:6px;overflow:hidden;max-width:640px}
        .cl-event{display:flex;gap:14px;align-items:baseline;padding:13px 16px;border-bottom:1px solid var(--line,#e0d6c1);background:#fff}
        .cl-event:last-child{border-bottom:0}
        .cl-event:hover{background:var(--paper-2,#efe8d8);text-decoration:none}
        .cl-event .d{font-family:var(--sans);text-transform:uppercase;letter-spacing:.08em;font-size:11px;color:#8a5b12;font-weight:600;min-width:56px}
        .cl-event .ti{font-family:var(--disp);font-size:17px;color:var(--ink,#171310)}
        .cl-event .muted{color:var(--ink-soft,#5b5346);font-family:var(--body);font-size:14px}
        .cl-faq{display:flex;flex-direction:column;gap:10px;max-width:760px}
        .cl-faq-item{border:1px solid var(--line,#e0d6c1);border-radius:6px;background:#fff;padding:14px 18px}
        .cl-faq-item summary{font-family:var(--disp);font-size:18px;cursor:pointer;color:var(--ink,#171310)}
        .cl-faq-item p{font-family:var(--body);color:var(--ink-soft,#5b5346);margin:10px 0 0}
      `}</style>
    </>
  );
}
