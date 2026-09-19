import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { QA_DOMAINS, guideHref } from '@/lib/knowledge/qa';
import { localizedIntent, localizedDomain } from '@/lib/knowledge/qa.i18n';
import { breadcrumbJsonLd, ld, pageMetadata } from '@/lib/seo';

export const revalidate = 86400;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = await getTranslations({ locale });
  return pageMetadata({
    locale: locale as Locale, path: '/guide',
    title: t('guide.title'), description: t('guide.intro'), kicker: 'Cyprus Lifestyle',
  });
}

export default async function GuideIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();

  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('guide.title'), path: '/guide' },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />

      <div className="wrap dept">
        <span className="kicker">{t('brand.name')}</span>
        <h1>{t('guide.title')}</h1>
        <p className="desc">{t('guide.intro')}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      <div className="wrap section">
        <div className="gx-grid">
          {QA_DOMAINS.map((d) => {
            const dt = localizedDomain(d.id, l);
            return (
              <section key={d.id} className="gx-dom">
                <h2 className="gx-dom-h">{dt.title}</h2>
                <p className="gx-dom-b">{dt.blurb}</p>
                <ul className="gx-list">
                  {d.intents.map((it) => (
                    <li key={it.id}><Link href={guideHref(it.id)}>{localizedIntent(it.id, l).q}</Link></li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <section className="gx-cta">
          <h2 className="gx-cta-h">{t('guide.connectTitle')}</h2>
          <p className="gx-cta-b">{t('guide.connectBody')}</p>
          <Link href="/ask" className="btn">{t('guide.askCta')} →</Link>
        </section>
      </div>

      <style>{`
        .gx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:30px 40px}
        .gx-dom{border-top:2px solid #C9A24C;padding-top:16px}
        .gx-dom-h{font-family:var(--disp);font-weight:600;font-size:23px;margin:0 0 6px}
        .gx-dom-b{font-family:var(--body);font-size:15px;color:var(--ink-soft,#5b5346);margin:0 0 14px;line-height:1.5}
        .gx-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column}
        .gx-list li{border-bottom:1px solid var(--line-soft,#efe8d8)}
        .gx-list li:last-child{border-bottom:0}
        .gx-list a{display:block;padding:10px 2px;font-family:var(--body);font-size:16px;color:var(--ink,#171310);line-height:1.4}
        .gx-list a:hover{color:#8a5b12}
        .gx-cta{margin-top:44px;border:1px solid var(--line,#e0d6c1);border-radius:10px;background:var(--paper-2,#efe8d8);padding:26px 28px;text-align:center}
        .gx-cta-h{font-family:var(--disp);font-weight:600;font-size:24px;margin:0 0 6px}
        .gx-cta-b{font-family:var(--body);font-size:16px;color:var(--ink-soft,#5b5346);margin:0 0 18px;max-width:56ch;margin-inline:auto}
      `}</style>
    </>
  );
}
