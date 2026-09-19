import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { MARKETS } from '@/lib/knowledge/markets';
import { localizedMarket } from '@/lib/knowledge/markets.i18n';
import { breadcrumbJsonLd, ld, pageMetadata } from '@/lib/seo';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({
    locale: locale as Locale, path: '/for',
    title: t('market.indexTitle'), description: t('market.indexIntro'), kicker: 'Cyprus Lifestyle',
  });
}

export default async function ForIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();

  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('market.indexTitle'), path: '/for' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />

      <div className="wrap dept">
        <span className="kicker">{t('brand.name')}</span>
        <h1>{t('market.indexTitle')}</h1>
        <p className="desc">{t('market.indexIntro')}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      <div className="wrap section">
        <div className="fi-grid">
          {MARKETS.map((m) => {
            const c = localizedMarket(m.id, l);
            return (
              <Link key={m.id} href={`/for/${m.id}`} className="fi-card">
                <span className="fi-kicker">{c.kicker}</span>
                <span className="fi-title">{c.title}</span>
                <span className="fi-intro">{c.intro}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <style>{`
        .fi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:18px}
        .fi-card{display:flex;flex-direction:column;gap:8px;border:1px solid var(--line,#e0d6c1);border-radius:10px;background:#fff;padding:22px 24px}
        .fi-card:hover{text-decoration:none;box-shadow:0 4px 18px rgba(0,0,0,.07);border-color:#C9A24C}
        .fi-kicker{font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#8a5b12}
        .fi-title{font-family:var(--disp);font-size:24px;line-height:1.15;color:var(--ink,#171310)}
        .fi-intro{font-family:var(--body);font-size:15px;line-height:1.55;color:var(--ink-soft,#5b5346)}
      `}</style>
    </>
  );
}
