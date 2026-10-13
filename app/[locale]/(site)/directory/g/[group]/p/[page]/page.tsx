import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { GROUP_KEYS } from '@/lib/taxonomy';
import { pageMetadata } from '@/lib/seo';
import { parsePageNo } from '@/lib/directory/paging';
import DirectoryGroupView from '@/components/DirectoryGroupView';

export const revalidate = 300;


export async function generateMetadata({ params }: { params: Promise<{ locale: string; group: string; page: string }> }): Promise<Metadata> {
  const { locale, group, page } = await params;
  const n = parsePageNo(page);
  if (!isLocale(locale) || !GROUP_KEYS.includes(group) || n < 2) return {};
  const t = await getTranslations({ locale });
  const label = t(`groups.${group}`);
  return pageMetadata({ locale: locale as Locale, path: `/directory/g/${group}/p/${n}`, title: `${label} · ${t('directory.pageLabel')} ${n} · ${t('directory.title')}`, description: t('directory.intro'), kicker: 'Cyprus Lifestyle' });
}

// Page 2, 3, … of /directory/g/<group>. Page 1 is /directory/g/<group> itself.
export default async function GroupPageN({ params }: { params: Promise<{ locale: string; group: string; page: string }> }) {
  const { locale, group, page } = await params;
  const n = parsePageNo(page);
  if (!isLocale(locale) || !GROUP_KEYS.includes(group) || n < 2) notFound();
  setRequestLocale(locale);
  return <DirectoryGroupView locale={locale as Locale} group={group} page={n} />;
}
