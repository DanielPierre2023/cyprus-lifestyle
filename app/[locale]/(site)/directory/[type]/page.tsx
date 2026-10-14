import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { DIRECTORY_TYPES } from '@/lib/queries.cached';
import { pageMetadata } from '@/lib/seo';
import DirectoryTypeView from '@/components/DirectoryTypeView';

// ISR 1 h: DB webhooks call /api/revalidate/tags on every edit (PERFORMANCE-SETUP.md 2b); this is only the safety net. Keep equal to TTL in lib/queries.cached.ts.
export const revalidate = 3600;

export function generateStaticParams() {
  return DIRECTORY_TYPES.map((type) => ({ type }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; type: string }> }): Promise<Metadata> {
  const { locale, type } = await params;
  if (!isLocale(locale) || !DIRECTORY_TYPES.includes(type as never)) return {};
  const t = await getTranslations({ locale });
  const label = t(`directory.${type}`);
  return pageMetadata({ locale: locale as Locale, path: `/directory/${type}`, title: `${label} · ${t('directory.title')}`, description: t('directory.intro'), kicker: 'Cyprus Lifestyle' });
}

// Page 1 of the ranked list. Further pages: /directory/<type>/p/<n> (48 businesses per page; the type "vendor" alone holds ~13,000).
export default async function DirectoryType({ params }: { params: Promise<{ locale: string; type: string }> }) {
  const { locale, type } = await params;
  if (!isLocale(locale) || !DIRECTORY_TYPES.includes(type as never)) notFound();
  setRequestLocale(locale);
  return <DirectoryTypeView locale={locale as Locale} type={type} page={1} />;
}
