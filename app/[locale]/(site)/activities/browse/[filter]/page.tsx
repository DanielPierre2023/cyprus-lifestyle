import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { isLocale, type Locale } from '@/lib/locales';
import { parseFilterKey, applyFilters, paginate } from '@/lib/activities/browse';
import { getPublicActivities } from '@/lib/activities/public';
import Listing, { listingMetadata } from '../../_components/Listing';

// Filtered / paginated lists: the filters live in the PATH (kind-boat_district-paphos_page-2), so each is an ordinary ISR page.
export const revalidate = 3600;
export function generateStaticParams() { return []; } // rendered on first request, then cached (no build-time database read)

type P = { params: Promise<{ locale: string; filter: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, filter } = await params;
  const f = isLocale(locale) ? parseFilterKey(filter) : null;
  if (!f) return {};
  return listingMetadata(locale as Locale, f);
}

export default async function ActivitiesBrowsePage({ params }: P) {
  const { locale, filter } = await params;
  if (!isLocale(locale)) notFound();
  const f = parseFilterKey(filter);
  if (!f || filter === 'all') notFound(); // 'all' is the index itself: one list, one URL
  setRequestLocale(locale);
  // A page number past the end is a 404, not a silently clamped duplicate.
  const rows = applyFilters(await getPublicActivities(), f);
  if (f.page > paginate(rows, f.page).pages) notFound();
  return <Listing locale={locale as Locale} f={f} />;
}
