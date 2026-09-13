import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { getArticle } from '@/lib/queries';
import CommentSection from '@/components/CommentSection';
import NewsletterSignup from '@/components/NewsletterSignup';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const a = await getArticle(locale as Locale, slug);
  if (!a) return {};
  return {
    title: a.seo_title,
    description: a.seo_description,
    openGraph: { title: a.seo_title, description: a.seo_description, images: a.cover_image ? [a.cover_image] : [], type: 'article' },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const a = await getArticle(l, slug);
  if (!a) notFound();

  const date = a.published_at ? new Date(a.published_at).toLocaleDateString(l === 'ar' ? 'ar' : l, { year: 'numeric', month: 'long', day: 'numeric' }) : '';

  return (
    <>
      <article className="article wrap">
        {a.category ? <span className="kicker">{t.has(`nav.${a.category}`) ? t(`nav.${a.category}`) : a.category}</span> : null}
        <h1>{a.title}</h1>
        {a.excerpt ? <p className="dek">{a.excerpt}</p> : null}
        <div className="byline">
          {a.author_name ? `${t('common.byline')} ${a.author_name}` : 'Cyprus Lifestyle'}
          {date ? ` · ${date}` : ''}{a.reading_time_min ? ` · ${a.reading_time_min} ${t('common.minRead')}` : ''}
        </div>
        {a.cover_image ? (
          <figure className="cover">
            <img src={a.cover_image} alt="" />
            {a.cover_image_credit ? <figcaption>{a.cover_image_credit}</figcaption> : null}
          </figure>
        ) : null}
        <div className="prose" dangerouslySetInnerHTML={{ __html: a.content }} />
        {a.source_url ? (
          <p style={{ fontFamily: 'var(--sans)', fontSize: 13, color: 'var(--ink-soft)', marginTop: 30 }}>
            {t('common.published')}: <a href={a.source_url} target="_blank" rel="noopener nofollow">source</a>
          </p>
        ) : null}
      </article>
      <CommentSection postId={a.id} />
      <NewsletterSignup />
    </>
  );
}
