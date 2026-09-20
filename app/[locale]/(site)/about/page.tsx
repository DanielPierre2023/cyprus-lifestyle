import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/locales';
import { pageMetadata } from '@/lib/seo';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale, path: '/about', title: t('pages.about.title'), description: t('pages.about.dek') });
}

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  const sections = t.raw('pages.about.sections') as { h?: string; p: string[] }[];
  return (
    <div className="page wrap">
      <div className="page-head">
        <span className="kicker">{t('pages.about.kicker')}</span>
        <h1>{t('pages.about.title')}</h1>
        <p className="dek">{t('pages.about.dek')}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <div className="prose legal">
        {sections.map((s, i) => (
          <section key={i} className="legal-sec">
            {s.h ? <h2>{s.h}</h2> : null}
            {s.p.map((para, j) => <p key={j}>{para}</p>)}
          </section>
        ))}
      </div>
    </div>
  );
}
