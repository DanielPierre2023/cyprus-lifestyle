import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';

const CATS = ['cyprus', 'business', 'property', 'culture', 'escapes', 'table', 'world'] as const;

export default async function Footer() {
  const t = await getTranslations();
  const year = new Date().getFullYear();
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="cols">
          <div>
            <div className="logo">Cyprus <span className="gold">Lifestyle</span></div>
            <p style={{ maxWidth: 360, opacity: 0.85 }}>{t('brand.tagline')}</p>
          </div>
          <div>
            <h4>{t('footer.sections')}</h4>
            {CATS.map((c) => <Link key={c} href={`/${c}`}>{t(`nav.${c}`)}</Link>)}
          </div>
          <div>
            <h4>{t('footer.about')}</h4>
            <Link href="/about">{t('footer.about')}</Link>
            <Link href="/advertise">{t('footer.advertise')}</Link>
            <Link href="/contact">{t('footer.contact')}</Link>
            <Link href="/privacy">{t('footer.privacy')}</Link>
          </div>
        </div>
        <div className="fine">© {year} Cyprus Lifestyle. {t('footer.rights')}</div>
      </div>
    </footer>
  );
}
