import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { CLIMATE, SEA_MIN, SEA_MAX, type Swim } from '@/lib/knowledge/cyprus';
import { breadcrumbJsonLd, ld, pageMetadata } from '@/lib/seo';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({ locale: locale as Locale, path: '/when-to-visit', title: t('whenToVisit.title'), description: t('whenToVisit.intro'), kicker: 'Cyprus Lifestyle' });
}

const SWIM_COLOR: Record<Swim, string> = { yes: '#2a8892', shoulder: '#C9A24C', no: '#9aa0a6' };

export default async function WhenToVisitPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();
  const swimLabel: Record<Swim, string> = { yes: t('whenToVisit.yes'), shoulder: t('whenToVisit.shoulder'), no: t('whenToVisit.no') };
  const crumbLd = breadcrumbJsonLd(l, [{ name: t('brand.name'), path: '/' }, { name: t('whenToVisit.title'), path: '/when-to-visit' }]);
  const monthName = (m: number) => new Date(2025, m, 1).toLocaleString(l, { month: 'long' });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <div className="wrap dept">
        <span className="kicker">{t('whenToVisit.kicker')}</span>
        <h1>{t('whenToVisit.title')}</h1>
        <p className="desc">{t('whenToVisit.intro')}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      <div className="wrap section">
        <div className="wv-wrap">
          <table className="wv">
            <thead>
              <tr>
                <th>{t('whenToVisit.month')}</th>
                <th className="num">{t('whenToVisit.day')}</th>
                <th>{t('whenToVisit.sea')}</th>
                <th>{t('whenToVisit.swimming')}</th>
              </tr>
            </thead>
            <tbody>
              {CLIMATE.map((c) => {
                const pct = Math.max(6, Math.min(100, Math.round(((c.sea - SEA_MIN) / (SEA_MAX - SEA_MIN)) * 100)));
                return (
                  <tr key={c.month}>
                    <td className="mo">{monthName(c.month)}</td>
                    <td className="num">{c.airHigh}° <span className="lo">/ {c.airLow}°</span></td>
                    <td className="sea">
                      <span className="sea-bar"><span className="sea-fill" style={{ width: `${pct}%`, background: SWIM_COLOR[c.swim] }} /></span>
                      <span className="sea-n">{c.sea}°</span>
                    </td>
                    <td><span className="verdict" style={{ color: SWIM_COLOR[c.swim] }}>● {swimLabel[c.swim]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="wv-best">{t('whenToVisit.best')}</p>
        <p className="wv-cta"><Link href="/ask">{t('whenToVisit.askCta')} →</Link></p>
      </div>

      <style>{`
        .wv-wrap{overflow-x:auto;border:1px solid var(--line,#e0d6c1);border-radius:8px}
        table.wv{border-collapse:collapse;width:100%;min-width:420px;background:#fff;font-family:var(--body)}
        table.wv th,table.wv td{text-align:left;padding:12px 16px;border-bottom:1px solid var(--line,#e0d6c1);font-size:16px}
        table.wv thead th{font-family:var(--sans);text-transform:uppercase;letter-spacing:.1em;font-size:11px;color:var(--ink-soft,#5b5346);background:var(--paper-2,#efe8d8)}
        table.wv tbody tr:last-child td{border-bottom:0}
        table.wv .mo{font-family:var(--disp);font-size:18px}
        table.wv .num{font-variant-numeric:tabular-nums;white-space:nowrap}
        table.wv .lo{color:var(--ink-soft,#8a8272)}
        .sea{min-width:160px}
        .sea-bar{display:inline-block;width:96px;height:8px;border-radius:999px;background:var(--paper-2,#efe8d8);vertical-align:middle;overflow:hidden;margin-right:10px}
        .sea-fill{display:block;height:100%;border-radius:999px}
        .sea-n{font-variant-numeric:tabular-nums;font-family:var(--sans);font-size:14px}
        .verdict{font-family:var(--sans);font-size:14px;font-weight:600;white-space:nowrap}
        .wv-best{font-family:var(--body);font-size:19px;line-height:1.55;color:var(--ink,#171310);max-width:64ch;margin:26px 0 0}
        .wv-cta{margin:16px 0 0;font-family:var(--sans);font-size:15px}
      `}</style>
    </>
  );
}
