import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { breadcrumbJsonLd, ld, pageMetadata } from '@/lib/seo';
import NewsletterSignup from '@/components/NewsletterSignup';
import MembershipCheckout from '@/components/MembershipCheckout';

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
  const conc = t.raw('membership.concierge') as {
    name: string; tagline: string; perMonth: string; perYear: string; inclVat: string; features: string[]; priorityHint: string;
    cta: string; sending: string; active: string; welcome: string;
    restorePrompt: string; emailPh: string; restore: string; notConfigured: string;
    restoreBusy: string; restoreSent: string; restoreInvalid: string; restoreError: string;
    confirming: string; confirmOk: string; confirmExpired: string; confirmInvalid: string; confirmError: string;
  };
  // Same source of truth as app/api/membership/checkout (price + billing interval).
  const priceEur = process.env.MEMBERSHIP_PRICE_EUR || '19';
  const perLabel = process.env.MEMBERSHIP_INTERVAL === 'year' ? conc.perYear : conc.perMonth;
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

          <div style={{ border: '1px solid #C9A24C', borderRadius: 6, padding: '24px 22px', background: 'linear-gradient(180deg,#1c1710,#2a2114)', color: '#f1e9d8' }}>
            <div className="kicker" style={{ color: '#E9C978' }}>{conc.name}</div>
            <div className="display" style={{ fontSize: 34, margin: '6px 0 0', color: '#fff' }}>€{priceEur} <span style={{ fontSize: 15, color: '#c9bfa6' }}>{perLabel} · {conc.inclVat}</span></div>
            <p style={{ fontFamily: 'var(--body)', fontStyle: 'italic', color: '#c9bfa6', margin: '4px 0 0', fontSize: 14.5 }}>{conc.tagline}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 20px' }}>
              {conc.features.map((f, i) => <li key={i} style={{ padding: '7px 0', borderBottom: '1px solid rgba(201,162,76,.22)', fontSize: 15 }}>◆&nbsp;&nbsp;{f}</li>)}
            </ul>
            <p style={{ margin: '-8px 0 18px', fontSize: 13, lineHeight: 1.5, color: '#c9bfa6' }}>{conc.priorityHint}</p>
            <MembershipCheckout locale={locale} labels={{
              cta: conc.cta, sending: conc.sending, active: conc.active, welcome: conc.welcome, restorePrompt: conc.restorePrompt, emailPh: conc.emailPh, restore: conc.restore, notConfigured: conc.notConfigured,
              restoreBusy: conc.restoreBusy, restoreSent: conc.restoreSent, restoreInvalid: conc.restoreInvalid, restoreError: conc.restoreError,
              confirming: conc.confirming, confirmOk: conc.confirmOk, confirmExpired: conc.confirmExpired, confirmInvalid: conc.confirmInvalid, confirmError: conc.confirmError,
            }} />
          </div>
        </div>

        <p style={{ color: '#8a8371', fontSize: 13.5, marginTop: 22 }}>
          {t('membership.note')} <Link href="/contact" style={{ color: '#8a7a4a' }}>{t('footer.contact')}</Link>.
        </p>
        <p style={{ fontSize: 13.5, marginTop: 6 }}>
          <Link href="/account" style={{ color: '#8a7a4a' }}>{t('account.signInLink')}</Link>
        </p>
      </div>

      <NewsletterSignup />
    </>
  );
}
