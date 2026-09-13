import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/locales';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('pages.privacy.title') };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const body = t.raw('pages.privacy.body') as string[];
  return (
    <div className="page wrap">
      <div className="page-head">
        <span className="kicker">{t('pages.privacy.kicker')}</span>
        <h1>{t('pages.privacy.title')}</h1>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <div className="prose">{body.map((p, i) => <p key={i}>{p}</p>)}</div>
    </div>
  );
}
