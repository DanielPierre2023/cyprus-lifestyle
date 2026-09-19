import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { DIRECTORY_TYPES, getLuxuryListings } from '@/lib/queries';
import { breadcrumbJsonLd, itemListJsonLd, ld, pageMetadata } from '@/lib/seo';
import CoverImage from '@/components/CoverImage';

export const revalidate = 300;

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return <span aria-label={`${rating}/5`} style={{ color: '#C9A24C', letterSpacing: 1 }}>{'★'.repeat(full)}<span style={{ color: 'rgba(201,162,76,.35)' }}>{'★'.repeat(5 - full)}</span></span>;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale: locale as Locale, path: '/luxury', title: t('luxury.title'), description: t('luxury.intro'), kicker: 'Cyprus Lifestyle' });
}

export default async function LuxuryPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const items = await getLuxuryListings(l, 30);
  const typeLabels: Record<string, string> = Object.fromEntries(DIRECTORY_TYPES.map((ty) => [ty, t(`directory.${ty}`)]));
  const crumbLd = breadcrumbJsonLd(l, [{ name: t('brand.name'), path: '/' }, { name: t('luxury.title'), path: '/luxury' }]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      {items.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(itemListJsonLd(l, items)) }} /> : null}

      <div className="lx-hero">
        <div className="wrap">
          <span className="lx-kicker">{t('luxury.kicker')}</span>
          <h1 className="lx-h1">{t('luxury.title')}</h1>
          <p className="lx-dek">{t('luxury.intro')}</p>
          <span className="lx-orn">◆</span>
        </div>
      </div>

      <div className="wrap section">
        {items.length ? (
          <div className="grid g3">
            {items.map((x) => (
              <article key={x.id} className="card lx-card">
                <Link href={`/directory/${x.type}/${x.slug}`} className="ph" aria-hidden="true" tabIndex={-1}>
                  <CoverImage src={x.image} seed={x.slug} alt={x.name} className="ph-img" sizes="(max-width: 900px) 100vw, 33vw" fallbackKind="brand" />
                </Link>
                <span className="kicker">{typeLabels[x.type] || x.type}{x.district ? ` · ${x.district}` : ''}{x.price_band ? ` · ${x.price_band}` : ''}</span>
                <h3><Link href={`/directory/${x.type}/${x.slug}`}>{x.name}</Link></h3>
                {x.rating != null ? <div className="lx-rate"><Stars rating={x.rating} /> <b>{x.rating.toFixed(1)}</b>{x.rating_count ? <span className="muted"> · {x.rating_count.toLocaleString(l)} {t('directory.reviews')}</span> : null}</div> : null}
                {x.summary ? <p>{x.summary}</p> : null}
              </article>
            ))}
          </div>
        ) : <p>{t('directory.none')}</p>}
      </div>

      <style>{`
        .lx-hero{background:linear-gradient(160deg,#12242b 0%,#0B0E11 70%);border-bottom:1px solid rgba(201,162,76,.3);padding-block:clamp(48px,9vw,96px)}
        .lx-kicker{font-family:var(--sans);text-transform:uppercase;letter-spacing:.28em;font-size:12px;color:var(--gold,#C9A24C);font-weight:600}
        .lx-h1{font-family:var(--disp);color:#fff;font-weight:600;font-size:clamp(34px,6vw,64px);line-height:1.02;margin:16px 0 0}
        .lx-dek{font-family:var(--body);color:#d7cdb8;font-size:clamp(17px,2vw,21px);max-width:56ch;margin:18px 0 0;line-height:1.5}
        .lx-orn{display:block;color:rgba(201,162,76,.6);font-size:20px;margin-top:22px}
        .lx-rate{font-family:var(--sans);font-size:14px;margin:2px 0 0;display:flex;align-items:center;gap:6px}
        .lx-rate .muted{color:var(--ink-soft,#5b5346)}
        .lx-card h3{margin-top:6px}
      `}</style>
    </>
  );
}
