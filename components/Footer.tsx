import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

const CATS = ['property', 'relocation', 'culture', 'cyprus', 'business', 'escapes', 'table', 'agenda', 'people', 'world'] as const;

export default async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="top">
          <div>
            <div className="brand">{t('brand.name')}</div>
            <p>{t('home.footerBlurb')}</p>
          </div>
          <div>
            <h4>{t('footer.sections')}</h4>
            {CATS.map((c) => <Link key={c} href={`/${c}`}>{t(`nav.${c}`)}</Link>)}
          </div>
          <div>
            <h4>{t('home.magazine')}</h4>
            <Link href="/directory">{t('directory.title')}</Link>
            <Link href="/guide">{t('guide.title')}</Link>
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
          <span>© {year} {t('brand.name')} · Nicosia</span>
          <span>EN · ΕΛ · RO · ع</span>
        </div>
      </div>
    </footer>
  );
}
