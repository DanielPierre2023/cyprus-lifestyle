import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { guideHref } from '@/lib/knowledge/qa';
import { localizedIntent } from '@/lib/knowledge/qa.i18n';
import { MARKET_INDEX, MARKET_IDS } from '@/lib/knowledge/markets';
import { localizedMarket } from '@/lib/knowledge/markets.i18n';
import { breadcrumbJsonLd, ld, pageMetadata } from '@/lib/seo';

export const revalidate = 86400;

export function generateStaticParams() {
  return MARKET_IDS.map((market) => ({ market }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; market: string }> }): Promise<Metadata> {
  const { locale, market } = await params;
  if (!isLocale(locale) || !MARKET_INDEX[market]) return {};
  const m = localizedMarket(market, locale);
  return pageMetadata({
    locale: locale as Locale, path: `/for/${market}`,
    title: m.title, description: m.intro, kicker: 'Cyprus Lifestyle',
  });
}

export default async function MarketHub({ params }: { params: Promise<{ locale: string; market: string }> }) {
  const { locale, market } = await params;
  if (!isLocale(locale)) notFound();
  const mk = MARKET_INDEX[market];
  if (!mk) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const copy = localizedMarket(market, l);

  const startHere = mk.guides.slice(0, 3);
  const more = mk.guides.slice(3);

  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('market.indexTitle'), path: '/for' },
    { name: copy.title, path: `/for/${market}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />

      <div className="wrap dept">
        <span className="kicker"><Link href="/for">{t('market.indexTitle')}</Link> · {copy.kicker}</span>
        <h1>{copy.title}</h1>
        <p className="desc">{copy.intro}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      <div className="wrap section mh-body">
        {/* Start here — flagship answers with a snippet */}
        <section>
          <h2 className="mh-h2">{t('market.startHere')}</h2>
          <div className="mh-cards">
            {startHere.map((id) => {
              const tx = localizedIntent(id, l);
              return (
                <Link key={id} href={guideHref(id)} className="mh-card">
                  <span className="mh-card-q">{tx.q}</span>
                  <span className="mh-card-a">{tx.a.length > 150 ? tx.a.slice(0, 150) + '…' : tx.a}</span>
                  <span className="mh-card-go">{t('guide.askCta')} →</span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* More practical guides */}
        {more.length ? (
          <section>
            <h2 className="mh-h2">{t('market.guidesLabel')}</h2>
            <ul className="mh-list">
              {more.map((id) => (
                <li key={id}><Link href={guideHref(id)}>{localizedIntent(id, l).q}</Link></li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Explore the directory */}
        <section>
          <h2 className="mh-h2">{t('market.exploreLabel')}</h2>
          <div className="mh-chips">
            {mk.groups.map((g) => (
              <Link key={g} href={`/directory/g/${g}`} className="mh-chip">{t(`groups.${g}`)} →</Link>
            ))}
            {mk.luxury ? <Link href="/luxury" className="mh-chip mh-chip-lux">{t('luxury.title')} →</Link> : null}
          </div>
        </section>

        {/* Ask in your language */}
        <section className="mh-ask">
          <h2 className="mh-ask-h">{t('market.askTitle')}</h2>
          <p className="mh-ask-b">{t('market.askBody')}</p>
          <Link href="/ask" className="btn">{t('guide.askCta')} →</Link>
        </section>
      </div>

      <style>{`
        .mh-body{display:flex;flex-direction:column;gap:38px;max-width:960px}
        .mh-h2{font-family:var(--disp);font-weight:600;font-size:24px;margin:0 0 16px}
        .mh-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
        .mh-card{display:flex;flex-direction:column;gap:8px;border:1px solid var(--line,#e0d6c1);border-top:3px solid #C9A24C;border-radius:8px;background:#fff;padding:18px 20px}
        .mh-card:hover{text-decoration:none;box-shadow:0 4px 16px rgba(0,0,0,.06);border-color:#C9A24C}
        .mh-card-q{font-family:var(--disp);font-size:19px;line-height:1.25;color:var(--ink,#171310)}
        .mh-card-a{font-family:var(--body);font-size:14.5px;line-height:1.5;color:var(--ink-soft,#5b5346);flex:1}
        .mh-card-go{font-family:var(--sans);font-size:13px;font-weight:600;color:#8a5b12}
        .mh-list{list-style:none;padding:0;margin:0;columns:2;column-gap:36px}
        .mh-list li{break-inside:avoid;border-bottom:1px solid var(--line-soft,#efe8d8)}
        .mh-list a{display:block;padding:11px 2px;font-family:var(--body);font-size:16px;color:var(--ink,#171310)}
        .mh-list a:hover{color:#8a5b12}
        .mh-chips{display:flex;flex-wrap:wrap;gap:10px}
        .mh-chip{display:inline-flex;align-items:center;padding:9px 16px;border:1px solid var(--line,#e0d6c1);border-radius:999px;background:#fff;font-family:var(--sans);font-size:15px;color:var(--ink,#171310)}
        .mh-chip:hover{background:var(--paper-2,#efe8d8);text-decoration:none;border-color:#C9A24C}
        .mh-chip-lux{border-color:#C9A24C;color:#8a5b12;background:rgba(201,162,76,.10)}
        .mh-ask{border:1px solid var(--line,#e0d6c1);border-radius:10px;background:var(--paper-2,#efe8d8);padding:24px 26px}
        .mh-ask-h{font-family:var(--disp);font-weight:600;font-size:22px;margin:0 0 6px}
        .mh-ask-b{font-family:var(--body);font-size:16px;color:var(--ink-soft,#5b5346);margin:0 0 16px;max-width:60ch}
        @media (max-width:640px){.mh-list{columns:1}}
      `}</style>
    </>
  );
}
