import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { getFeatured, getLatest, getByCategory, getBanner } from '@/lib/queries';
import ArticleCard from '@/components/ArticleCard';
import NewsletterSignup from '@/components/NewsletterSignup';
import SponsorBanner from '@/components/SponsorBanner';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();

  const [featured, latest, property, culture, banner] = await Promise.all([
    getFeatured(l), getLatest(l, 7), getByCategory(l, 'property', 3), getByCategory(l, 'culture', 3), getBanner(l),
  ]);
  const rest = latest.filter((c) => c.slug !== featured?.slug).slice(0, 6);

  return (
    <>
      {featured ? (
        <section className="hero">
          <div className="wrap inner">
            <div>
              <span className="kicker">{t('common.featured')}</span>
              <h1 className="display">{featured.title}</h1>
              <p>{featured.excerpt}</p>
              <Link className="read" href={`/article/${featured.slug}`}>{t('common.readMore')} →</Link>
            </div>
            <Link href={`/article/${featured.slug}`} className="hero-figure">
              {featured.cover_image ? <img src={featured.cover_image} alt="" /> : <span />}
            </Link>
          </div>
        </section>
      ) : null}

      <div className="wrap section">
        <div className="section-head"><h2 className="display">{t('common.latest')}</h2></div>
        {rest.length ? <div className="grid">{rest.map((c) => <ArticleCard key={c.id} card={c} />)}</div>
          : <p>{t('common.noResults')}</p>}
      </div>

      {banner ? <div className="wrap" style={{ marginBottom: 30 }}><SponsorBanner banner={banner} /></div> : null}

      {property.length ? (
        <div className="wrap section">
          <div className="section-head"><h2 className="display">{t('nav.property')}</h2><Link href="/property" className="kicker">{t('common.readMore')} →</Link></div>
          <div className="grid">{property.map((c) => <ArticleCard key={c.id} card={c} kicker={t('nav.property')} />)}</div>
        </div>
      ) : null}

      {culture.length ? (
        <div className="wrap section">
          <div className="section-head"><h2 className="display">{t('nav.culture')}</h2><Link href="/culture" className="kicker">{t('common.readMore')} →</Link></div>
          <div className="grid">{culture.map((c) => <ArticleCard key={c.id} card={c} kicker={t('nav.culture')} />)}</div>
        </div>
      ) : null}

      <NewsletterSignup />
    </>
  );
}
