import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale, type Locale } from '@/lib/locales';
import Listing, { listingMetadata } from './_components/Listing';

// ISR 1 h (same as the other public pages); edits to the catalogue refresh it by tag ('activities').
export const revalidate = 3600;
export function generateStaticParams() { return []; } // rendered on first request, then cached (no build-time database read; an unreachable DB must not fail or empty-cache a deploy)

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  return listingMetadata(locale as Locale, { page: 1 });
}

export default async function ActivitiesIndexPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  return <Listing locale={locale as Locale} f={{ page: 1 }} />;
}
