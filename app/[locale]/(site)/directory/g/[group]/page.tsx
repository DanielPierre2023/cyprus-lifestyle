import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { GROUP_KEYS } from '@/lib/taxonomy';
import { pageMetadata } from '@/lib/seo';
import DirectoryGroupView from '@/components/DirectoryGroupView';

export const revalidate = 300;

export function generateStaticParams() {
  return GROUP_KEYS.map((group) => ({ group }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; group: string }> }): Promise<Metadata> {
  const { locale, group } = await params;
  if (!isLocale(locale) || !GROUP_KEYS.includes(group)) return {};
  const t = await getTranslations({ locale });
  const label = t(`groups.${group}`);
  return pageMetadata({ locale: locale as Locale, path: `/directory/g/${group}`, title: `${label} · ${t('directory.title')}`, description: t('directory.intro'), kicker: 'Cyprus Lifestyle' });
}

// Page 1 of the ranked list. Further pages: /directory/g/<group>/p/<n> (48 per page).
export default async function GroupPage({ params }: { params: Promise<{ locale: string; group: string }> }) {
  const { locale, group } = await params;
  if (!isLocale(locale) || !GROUP_KEYS.includes(group)) notFound();
  setRequestLocale(locale);
  return <DirectoryGroupView locale={locale as Locale} group={group} page={1} />;
}
