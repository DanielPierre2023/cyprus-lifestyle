import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { getByCategory } from '@/lib/queries';
import ArticleCard from '@/components/ArticleCard';
import NewsletterSignup from '@/components/NewsletterSignup';

export const dynamic = 'force-dynamic';

const CATS = ['cyprus', 'business', 'property', 'culture', 'escapes', 'table', 'world'];

export default async function CategoryPage({ params }: { params: Promise<{ locale: string; category: string }> }) {
  const { locale, category } = await params;
  if (!isLocale(locale) || !CATS.includes(category)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const cards = await getByCategory(l, category, 24);

  return (
    <>
      <div className="wrap section">
        <div className="section-head"><h2 className="display">{t(`nav.${category}`)}</h2></div>
        {cards.length ? <div className="grid">{cards.map((c) => <ArticleCard key={c.id} card={c} />)}</div>
          : <p>{t('common.noResults')}</p>}
      </div>
      <NewsletterSignup />
    </>
  );
}
