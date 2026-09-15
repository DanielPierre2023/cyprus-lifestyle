import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { breadcrumbJsonLd, ld, pageMetadata } from '@/lib/seo';
import NewsletterSignup from '@/components/NewsletterSignup';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale: locale as Locale, path: '/membership', title: t('membership.title'), description: t('membership.dek'), kicker: 'Cyprus Lifestyle' });
}

export default async function MembershipPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();

  const free = t.raw('membership.free') as { name: string; price: string; cta: string; features: string[] };
  const patron = t.raw('membership.patron') as { name: string; price: string; features: string[] };
  const crumbLd = breadcrumbJsonLd(l, [{ name: t('brand.name'), path: '/' }, { name: t('membership.title'), path: '/membership' }]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />

      <div className="page wrap">
        <div className="page-head">
          <span className="kicker">{t('membership.kicker')}</span>
          <h1>{t('membership.title')}</h1>
          <p className="dek">{t('membership.dek')}</p>
          <div className="rule-orn orn"><span className="diamond" /></div>
        </div>
        <div className="prose" style={{ marginBottom: 26 }}><p>{t('membership.intro')}</p></div>

        <div className="grid g2" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <div style={{ border: '1px solid #e6e0d2', borderRadius: 6, padding: '24px 22px', background: '#fff' }}>
            <div className="kicker">{free.name}</div>
            <div className="display" style={{ fontSize: 34, margin: '6px 0 2px' }}>{free.price}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 20px' }}>
              {free.features.map((f, i) => <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f0ece0' }}>{f}</li>)}
            </ul>
            <Link className="btn" href="/#letter">{free.cta}</Link>
          </div>

          <div style={{ border: '1px solid #d8ceb4', borderRadius: 6, padding: '24px 22px', background: 'linear-gradient(180deg,#faf7ef,#fff)' }}>
            <div className="kicker">{patron.name}</div>
            <div className="display" style={{ fontSize: 34, margin: '6px 0 2px', color: '#8a7a4a' }}>{patron.price}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 20px' }}>
              {patron.features.map((f, i) => <li key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f0ece0' }}>{f}</li>)}
            </ul>
            <p style={{ color: '#8a8371', fontSize: 13.5, margin: 0 }}>{t('membership.soon')}</p>
          </div>
        </div>

        <p style={{ color: '#8a8371', fontSize: 13.5, marginTop: 22 }}>
          {t('membership.note')} <Link href="/contact" style={{ color: '#8a7a4a' }}>{t('footer.contact')}</Link>.
        </p>
      </div>

      <NewsletterSignup />
    </>
  );
}
