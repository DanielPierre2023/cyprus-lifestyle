// Social card generator. Referenced from page metadata as an absolute URL
// (/api/og?...). Lives under /api so the i18n middleware doesn't intercept it.
import type { NextRequest } from 'next/server';
import { ogImage } from '@/lib/og/card';
import { isLocale, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const locale = p.get('l') || 'en';
  return ogImage({
    title: (p.get('t') || 'Cyprus Lifestyle').slice(0, 200),
    kicker: p.get('k') || undefined,
    locale: (isLocale(locale) ? locale : 'en') as Locale,
    coverUrl: p.get('c') || null,
  });
}
