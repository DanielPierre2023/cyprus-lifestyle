import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale } from '@/lib/locales';
import ContactForm from '@/components/ContactForm';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return { title: t('pages.contact.title') };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations();
  return (
    <div className="page wrap">
      <div className="page-head">
        <span className="kicker">{t('pages.contact.kicker')}</span>
        <h1>{t('pages.contact.title')}</h1>
        <p className="dek">{t('pages.contact.dek')}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>
      <ContactForm />
    </div>
  );
}
