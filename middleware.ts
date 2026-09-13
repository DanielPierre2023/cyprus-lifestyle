import createIntlMiddleware from 'next-intl/middleware';
import { routing } from '@/lib/i18n/routing';

// Locale routing for the whole app. /admin resolves to the default (en) edition;
// the admin console ignores the locale. Admin authorisation is enforced in the
// admin layout (server) + Supabase RLS.
export default createIntlMiddleware(routing);

export const config = {
  // Everything except API, Next internals and files with an extension.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
