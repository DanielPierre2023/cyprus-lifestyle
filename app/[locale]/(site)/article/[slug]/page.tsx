import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { getArticle, getByCategory, getLatest, type Card } from '@/lib/queries';
import { pageMetadata, articleJsonLd, breadcrumbJsonLd, ld } from '@/lib/seo';
import ArticleCard from '@/components/ArticleCard';
import CommentSection from '@/components/CommentSection';
import CoverImage from '@/components/CoverImage';
import NewsletterSignup from '@/components/NewsletterSignup';

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const a = await getArticle(locale as Locale, slug);
  if (!a) return {};
  const t = await getTranslations({ locale });
  const kicker = a.category ? (t.has(`nav.${a.category}`) ? t(`nav.${a.category}`) : a.category) : undefined;
  return pageMetadata({
    locale: locale as Locale, path: `/article/${slug}`,
    title: a.seo_title, description: a.seo_description, type: 'article',
    ogTitle: a.title, kicker, cover: a.cover_image,
  });
}

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const a = await getArticle(l, slug);
  if (!a) notFound();

  const date = a.published_at
    ? new Date(a.published_at).toLocaleDateString(l === 'ar' ? 'ar' : l, { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const catLabel = a.category ? (t.has(`nav.${a.category}`) ? t(`nav.${a.category}`) : a.category) : '';
  const bylineParts = [
    a.author_name ? `${t('common.byline')} ${a.author_name}` : 'Cyprus Lifestyle',
    date,
    a.reading_time_min ? `${a.reading_time_min} ${t('common.minRead')}` : '',
  ].filter(Boolean);

  // "More from the island": same section first, topped up with the latest.
  let more: Card[] = a.category ? (await getByCategory(l, a.category, 4)).filter((r) => r.slug !== a.slug) : [];
  if (more.length < 3) {
    const latest = await getLatest(l, 8);
    for (const c of latest) {
      if (more.length >= 3) break;
      if (c.slug !== a.slug && !more.some((m) => m.slug === c.slug)) more.push(c);
    }
  }
  more = more.slice(0, 3);

  const artLd = articleJsonLd({
    locale: l, slug: a.slug, title: a.title, description: a.excerpt,
    image: a.cover_image, author: a.author_name, publishedAt: a.published_at, section: catLabel || a.category,
  });
  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    ...(a.category ? [{ name: catLabel, path: `/${a.category}` }] : []),
    { name: a.title, path: `/article/${a.slug}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(artLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <article>
        <header className="article-hero">
          <CoverImage src={a.cover_image} seed={a.slug} alt="" className="hero-media" sizes="100vw" priority />
          <div className="hero-scrim" />
          {a.cover_image_credit ? <span className="credit">{a.cover_image_credit}</span> : null}
          <div className="inner">
            {catLabel ? <span className="kicker">{catLabel}</span> : null}
            <h1>{a.title}</h1>
            {a.excerpt ? <p className="dek">{a.excerpt}</p> : null}
            <div className="byline">{bylineParts.join(' · ')}</div>
          </div>
        </header>

        <div className="article wrap">
          <div className="rule-orn lead-orn"><span className="diamond" /></div>
          <div className="prose" dangerouslySetInnerHTML={{ __html: a.content }} />

          {a.tags?.length ? (
            <div className="tags">
              {a.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
            </div>
          ) : null}

          {a.source_url ? (
            <p className="source">
              {t('common.published')}: <a href={a.source_url} target="_blank" rel="noopener nofollow">{a.source_url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</a>
            </p>
          ) : null}
        </div>
      </article>

      {more.length ? (
        <section className="related wrap section">
          <div className="sec-head">
            <div className="rule-orn"><span className="diamond" /></div>
            <div className="lbl">{t('home.more')}</div>
          </div>
          <div className="grid g3">
            {more.map((c) => (
              <ArticleCard key={c.id} card={c}
                kicker={c.category && t.has(`nav.${c.category}`) ? t(`nav.${c.category}`) : c.category || ''}
                readLabel={t('common.minRead')} />
            ))}
          </div>
        </section>
      ) : null}

      <CommentSection postId={a.id} />
      <NewsletterSignup />
    </>
  );
}
