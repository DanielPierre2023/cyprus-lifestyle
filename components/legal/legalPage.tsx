// Shared page + metadata factory for the four legal routes (privacy, terms, cookies, legal-notice).
import type { Metadata } from 'next';
import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/locales';
import { pageMetadata } from '@/lib/seo';
import { LEGAL_PATHS, getLegalDoc, type LegalKind } from '@/lib/legal';
import LegalDocument from '@/components/legal/LegalDocument';

type Props = { params: Promise<{ locale: string }> };

export function legalMetadata(kind: LegalKind) {
  return async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { locale } = await params;
    if (!isLocale(locale)) return {};
    const doc = getLegalDoc(kind, locale as Locale);
    return pageMetadata({ locale: locale as Locale, path: LEGAL_PATHS[kind], title: doc.title, description: doc.dek });
  };
}

export function legalPage(kind: LegalKind) {
  return async function LegalPage({ params }: Props) {
    const { locale } = await params;
    if (!isLocale(locale)) notFound();
    setRequestLocale(locale);
    return <LegalDocument kind={kind} locale={locale as Locale} />;
  };
}
