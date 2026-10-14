import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { DIRECTORY_TYPES } from '@/lib/queries.cached';
import { pageMetadata } from '@/lib/seo';
import { parsePageNo } from '@/lib/directory/paging';
import DirectoryTypeView from '@/components/DirectoryTypeView';

export const revalidate = 3600;


export async function generateMetadata({ params }: { params: Promise<{ locale: string; type: string; page: string }> }): Promise<Metadata> {
  const { locale, type, page } = await params;
  const n = parsePageNo(page);
  if (!isLocale(locale) || !DIRECTORY_TYPES.includes(type as never) || n < 2) return {};
  const t = await getTranslations({ locale });
  const label = t(`directory.${type}`);
  return pageMetadata({ locale: locale as Locale, path: `/directory/${type}/p/${n}`, title: `${label} · ${t('directory.pageLabel')} ${n} · ${t('directory.title')}`, description: t('directory.intro'), kicker: 'Cyprus Lifestyle' });
}

// Page 2, 3, … of /directory/<type>. Page 1 is /directory/<type> itself.
export default async function DirectoryTypePage({ params }: { params: Promise<{ locale: string; type: string; page: string }> }) {
  const { locale, type, page } = await params;
  const n = parsePageNo(page);
  if (!isLocale(locale) || !DIRECTORY_TYPES.includes(type as never) || n < 2) notFound();
  setRequestLocale(locale);
  return <DirectoryTypeView locale={locale as Locale} type={type} page={n} />;
}
