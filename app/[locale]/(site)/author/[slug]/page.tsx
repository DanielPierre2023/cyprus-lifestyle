import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { getAuthor, getByAuthor } from '@/lib/queries';
import { pageMetadata, urlFor, SITE_URL, SITE_NAME, ld } from '@/lib/seo';
import ArticleCard from '@/components/ArticleCard';
import NewsletterSignup from '@/components/NewsletterSignup';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const a = await getAuthor(locale as Locale, slug);
  if (!a) return {};
  return pageMetadata({
    locale: locale as Locale, path: `/author/${slug}`,
    title: a.name, description: a.title || `${SITE_NAME} — ${a.name}`, kicker: 'Cyprus Lifestyle',
  });
}

export default async function AuthorPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const a = await getAuthor(l, slug);
  if (!a) notFound();
  const articles = await getByAuthor(l, a.id, 24);

  const orgLd = {
    '@context': 'https://schema.org', '@type': 'Organization',
    name: a.name, description: a.bio || a.title || undefined,
    url: urlFor(l, `/author/${slug}`), parentOrganization: { '@id': `${SITE_URL}/#organization` },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(orgLd) }} />
      <div className="page wrap">
        <div className="page-head">
          <span className="kicker">{t('pages.author.desk')}</span>
          <h1>{a.name}</h1>
          {a.title ? <p className="dek">{a.title}</p> : null}
          <div className="rule-orn orn"><span className="diamond" /></div>
        </div>
        {a.bio ? <div className="prose" style={{ textAlign: 'center' }}><p>{a.bio}</p></div> : null}
        {a.specialties.length ? (
          <div className="tags" style={{ justifyContent: 'center', borderTop: 'none', marginTop: 18, paddingTop: 0 }}>
            {a.specialties.map((s) => <span className="tag" key={s}>{s}</span>)}
          </div>
        ) : null}
      </div>

      {articles.length ? (
        <section className="wrap section">
          <div className="sec-head">
            <div className="rule-orn"><span className="diamond" /></div>
            <div className="lbl">{t('pages.author.recent')}</div>
          </div>
          <div className="grid g3">
            {articles.map((c) => (
              <ArticleCard key={c.id} card={c}
                kicker={c.category && t.has(`nav.${c.category}`) ? t(`nav.${c.category}`) : c.category || ''}
                readLabel={t('common.minRead')} />
            ))}
          </div>
        </section>
      ) : null}

      <NewsletterSignup />
    </>
  );
}
