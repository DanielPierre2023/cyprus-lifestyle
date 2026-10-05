import { translatedLocales, alternatesForAvailable, robotsForTranslation, sitemapLocales } from '../../lib/seo/translationGate';
import { eq, ok, report } from './_harness';

const row = { summary_en: 'A fine hotel', summary_el: 'Ένα ωραίο ξενοδοχείο', summary_ro: 'A fine hotel', summary_ar: '', summary_de: '  ', name_en: 'Zephyros', name_el: 'Zephyros', name_ru: 'Зефирос' };
eq('copy-of-English and empty editions are excluded', translatedLocales(row, ['summary']), ['en', 'el']);
eq('identical proper nouns allowed when declared', translatedLocales({ ...row, name_ro: 'Zephyros', name_de: 'Zephyros', name_ar: 'Zephyros', name_pl: 'Zephyros' }, ['name'], { allowIdentical: ['name'] }), ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru']);
eq('every required field must be translated', translatedLocales({ ...row, name_el: 'Ζέφυρος' }, ['summary', 'name']), ['en', 'el']);
eq('nothing translated -> en only', translatedLocales({ summary_en: 'x' }, ['summary']), ['en']);
const alt = alternatesForAvailable('el', '/directory/hotel/x', ['en', 'el']);
eq('hreflang only for available + x-default', Object.keys(alt.languages), ['en', 'el', 'x-default']);
ok('x-default is the English URL', alt.languages['x-default'].endsWith('/directory/hotel/x') && !alt.languages['x-default'].includes('/el/'));
ok('available edition is self-canonical', alt.canonical.includes('/el/directory/hotel/x'));
ok('unavailable edition canonicalises to English', !alternatesForAvailable('ru', '/p', ['en']).canonical.includes('/ru'));
eq('robots: available -> undefined, missing -> noindex,follow', [robotsForTranslation('el', ['en', 'el']), robotsForTranslation('ru', ['en', 'el'])], [undefined, { index: false, follow: true }]);
eq('sitemapLocales keeps canonical order', sitemapLocales(['ru', 'en', 'ar']), ['en', 'ar', 'ru']);
report('translation-gate');
