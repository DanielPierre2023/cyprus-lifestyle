import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { searchArticles } from '@/lib/queries';
import { pageMetadata } from '@/lib/seo';
import ArticleCard from '@/components/ArticleCard';

// Results depend on the ?q= query string, so this page is always dynamic.
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return {
    ...pageMetadata({ locale: locale as Locale, path: '/search', title: t('nav.search'), description: t('search.prompt') }),
    robots: { index: false, follow: true }, // search results pages shouldn't be indexed
  };
}

export default async function SearchPage(
  { params, searchParams }: {
    params: Promise<{ locale: string }>;
    searchParams: Promise<{ q?: string | string[] }>;
  },
) {
  const { locale } = await params;
  const sp = await searchParams;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q || '').trim();
  const results = q ? await searchArticles(l, q, 36) : [];
  const catLabel = (c: string | null) => (c && t.has(`nav.${c}`) ? t(`nav.${c}`) : c || '');

  return (
    <>
      <div className="wrap dept">
        <span className="kicker">{t('brand.name')}</span>
        <h1>{t('nav.search')}</h1>
        <form className="searchbox row" method="get" role="search" style={{ gap: 8, margin: '10px 0 0', maxWidth: 560 }}>
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            style={{ flex: '1 1 auto' }}
          />
          <button type="submit" className="abtn gold">{t('search.button')}</button>
        </form>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      <div className="wrap section">
        {!q ? (
          <p className="desc">{t('search.prompt')}</p>
        ) : results.length ? (
          <>
            <p className="desc">{t('search.resultsFor')} “{q}” · {results.length}</p>
            <div className="grid g3">
              {results.map((c) => (
                <ArticleCard key={c.id} card={c} kicker={catLabel(c.category)} readLabel={t('common.minRead')} />
              ))}
            </div>
          </>
        ) : (
          <p>{t('search.none')} “{q}”.</p>
        )}
      </div>
    </>
  );
}
