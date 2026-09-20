import { getTranslations, getLocale } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import LocaleSwitch from '@/components/LocaleSwitch';
import type { Locale } from '@/lib/locales';

const CATS = ['property', 'relocation', 'culture', 'cyprus', 'business', 'escapes', 'table', 'agenda', 'people', 'world'] as const;

// Cyprus Lifestyle is the media title of ADD Individual Solutions Ltd.
const OWNER: Record<Locale, string> = {
  en: 'Cyprus Lifestyle is part of the Media department of ADD Individual Solutions Ltd.',
  el: 'Το Cyprus Lifestyle αποτελεί μέρος του τμήματος Media της ADD Individual Solutions Ltd.',
  ro: 'Cyprus Lifestyle face parte din departamentul Media al ADD Individual Solutions Ltd.',
  ar: 'Cyprus Lifestyle جزء من قسم الإعلام في شركة ADD Individual Solutions Ltd.',
  de: 'Cyprus Lifestyle ist Teil der Media-Abteilung der ADD Individual Solutions Ltd.',
  pl: 'Cyprus Lifestyle jest częścią działu Media firmy ADD Individual Solutions Ltd.',
  ru: 'Cyprus Lifestyle — часть медиаотдела компании ADD Individual Solutions Ltd.',
};
const MADE: Record<Locale, string> = {
  en: 'Made with ❤ in Cyprus', el: 'Φτιαγμένο με ❤ στην Κύπρο', ro: 'Creat cu ❤ în Cipru',
  ar: 'صُنع بحب ❤ في قبرص', de: 'Mit ❤ in Zypern gemacht', pl: 'Zrobione z ❤ na Cyprze', ru: 'Сделано с ❤ на Кипре',
};

export default async function Footer() {
  const t = await getTranslations();
  const locale = (await getLocale()) as Locale;
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="top">
          <div className="foot-brand">
            <img src="/brand/monogram.svg" alt="" className="foot-mono" aria-hidden="true" width={96} height={96} />
            <div className="brand">{t('brand.name')}</div>
            <p className="foot-blurb">{t('home.footerBlurb')}</p>
            <p className="foot-owner">{OWNER[locale] || OWNER.en}</p>
          </div>
          <div>
            <h4>{t('footer.sections')}</h4>
            {CATS.map((c) => <Link key={c} href={`/${c}`}>{t(`nav.${c}`)}</Link>)}
          </div>
          <div>
            <h4>{t('home.magazine')}</h4>
            <Link href="/directory">{t('directory.title')}</Link>
            <Link href="/guide">{t('guide.title')}</Link>
            <Link href="/for">{t('market.indexTitle')}</Link>
            <Link href="/ask">{t('concierge.title')}</Link>
            <Link href="/search">{t('nav.search')}</Link>
            <Link href="/membership">{t('nav.membership')}</Link>
            <Link href="/#letter">{t('home.letterTitle')}</Link>
            <Link href="/advertise">{t('footer.advertise')}</Link>
          </div>
          <div>
            <h4>{t('footer.about')}</h4>
            <Link href="/about">{t('footer.about')}</Link>
            <Link href="/standards">{t('footer.standards')}</Link>
            <Link href="/contact">{t('footer.contact')}</Link>
            <Link href="/privacy">{t('footer.privacy')}</Link>
          </div>
        </div>
        <div className="fine">
          <span className="foot-copy">© {year} {t('brand.name')} · Nicosia</span>
          <span className="foot-made">{MADE[locale] || MADE.en}</span>
          <LocaleSwitch placement="up" variant="foot" />
        </div>
      </div>
    </footer>
  );
}
