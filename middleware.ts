import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from '@/lib/i18n/routing';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';

// Locale routing for the whole app. /admin resolves to the default (en) edition;
// the admin console ignores the locale. Admin authorisation is enforced in the
// admin layout (server) + Supabase RLS.
const intlMiddleware = createIntlMiddleware(routing);
const NON_DEFAULT = LOCALES.filter((l) => l !== DEFAULT_LOCALE);

// Pick the best-supported edition from an Accept-Language header (the phone/browser
// language). "ar", "ar-EG", "de-CH" all resolve to our matching base locale.
function fromAcceptLanguage(header: string | null): string {
  if (!header) return DEFAULT_LOCALE;
  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const qp = params.find((p) => p.trim().startsWith('q='));
      return { base: tag.trim().toLowerCase().split('-')[0], q: qp ? parseFloat(qp.split('=')[1]) : 1 };
    })
    .filter((x) => x.base)
    .sort((a, b) => b.q - a.q);
  for (const { base } of ranked) {
    if ((LOCALES as readonly string[]).includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Auto-detect the reader's language on entries that have NO locale prefix (these
  // would otherwise resolve to the English edition). An explicit /el, /ar, … URL is
  // always honoured as-is, and /admin is always English.
  //
  // This deliberately does NOT enable next-intl's own localeDetection (which sets a
  // NEXT_LOCALE cookie and makes every response uncacheable). Instead we redirect
  // only the unprefixed entry, add no Set-Cookie to any page response, and read a
  // cookie that is written ONLY when the reader picks a language from the switcher —
  // so their explicit choice (including "stay in English") always wins, and the
  // localized pages themselves stay static and cacheable.
  const hasLocalePrefix = NON_DEFAULT.some((l) => pathname === `/${l}` || pathname.startsWith(`/${l}/`));
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  if (!hasLocalePrefix && !isAdmin) {
    const cookie = req.cookies.get('NEXT_LOCALE')?.value;
    const chosen = cookie && (LOCALES as readonly string[]).includes(cookie) ? cookie : null;
    const target = chosen || fromAcceptLanguage(req.headers.get('accept-language'));
    if (target && target !== DEFAULT_LOCALE) {
      const url = req.nextUrl.clone();
      url.pathname = pathname === '/' ? `/${target}` : `/${target}${pathname}`;
      return NextResponse.redirect(url, 307);
    }
  }
  return intlMiddleware(req);
}

export const config = {
  // Everything except API, Next internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
