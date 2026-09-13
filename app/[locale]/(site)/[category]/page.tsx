import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { getByCategory } from '@/lib/queries';
import { pageMetadata, breadcrumbJsonLd, ld } from '@/lib/seo';
import ArticleCard from '@/components/ArticleCard';
import CoverImage from '@/components/CoverImage';
import NewsletterSignup from '@/components/NewsletterSignup';

export const revalidate = 300;

const CATS = ['cyprus', 'business', 'property', 'culture', 'escapes', 'table', 'world'];

export async function generateMetadata({ params }: { params: Promise<{ locale: string; category: string }> }): Promise<Metadata> {
  const { locale, category } = await params;
  if (!isLocale(locale) || !CATS.includes(category)) return {};
  const t = await getTranslations({ locale });
  const label = t.has(`nav.${category}`) ? t(`nav.${category}`) : category;
  const desc = t.has(`sections.${category}`) ? t(`sections.${category}`) : undefined;
  return pageMetadata({ locale: locale as Locale, path: `/${category}`, title: label, description: desc });
}

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; category: string }> }) {
  const { locale, category } = await params;
  if (!isLocale(locale) || !CATS.includes(category)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const cards = await getByCategory(l, category, 25);

  const label = t.has(`nav.${category}`) ? t(`nav.${category}`) : category;
  const desc = t.has(`sections.${category}`) ? t(`sections.${category}`) : '';
  const lead = cards[0];
  const rest = cards.slice(1);
  const byline = (c: typeof cards[number]) =>
    [c.author_name, c.reading_time_min ? `${c.reading_time_min} ${t('common.minRead')}` : ''].filter(Boolean).join(' · ');
  const crumbLd = breadcrumbJsonLd(l, [{ name: t('brand.name'), path: '/' }, { name: label, path: `/${category}` }]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <div className="wrap dept">
        <span className="kicker">{t('brand.name')}</span>
        <h1>{label}</h1>
        {desc ? <p className="desc">{desc}</p> : null}
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      {lead ? (
        <div className="wrap">
          <article className="feature">
            <Link className="ph" href={`/article/${lead.slug}`} aria-hidden="true" tabIndex={-1}>
              <CoverImage src={lead.cover_image} seed={lead.slug} alt={lead.title} className="ph-img" sizes="(max-width: 900px) 100vw, 55vw" />
            </Link>
            <div>
              <span className="kicker">{label}</span>
              <h2><Link href={`/article/${lead.slug}`}>{lead.title}</Link></h2>
              {lead.excerpt ? <p className="dek">{lead.excerpt}</p> : null}
              {byline(lead) ? <div className="meta">{byline(lead)}</div> : null}
            </div>
          </article>
        </div>
      ) : null}

      {rest.length ? (
        <div className="wrap section">
          <div className="grid g3">
            {rest.map((c) => <ArticleCard key={c.id} card={c} kicker={label} readLabel={t('common.minRead')} />)}
          </div>
        </div>
      ) : !lead ? (
        <div className="wrap section"><p>{t('common.noResults')}</p></div>
      ) : null}

      <NewsletterSignup />
    </>
  );
}
