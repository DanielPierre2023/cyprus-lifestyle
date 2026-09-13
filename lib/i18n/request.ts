import { getRequestConfig } from 'next-intl/server';
import { routing } from '@/lib/i18n/routing';
import { isLocale, DEFAULT_LOCALE } from '@/lib/locales';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = requested && isLocale(requested) ? requested : DEFAULT_LOCALE;
  return {
    locale,
    messages: (await import(`@/messages/${locale}.json`)).default,
  };
});

export { routing };
