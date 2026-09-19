import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { QA_INDEX, ALL_INTENTS, liveResources, guideHref } from '@/lib/knowledge/qa';
import { localizedIntent, localizedDomain } from '@/lib/knowledge/qa.i18n';
import { breadcrumbJsonLd, faqJsonLd, ld, pageMetadata } from '@/lib/seo';

export const revalidate = 86400;

// One practical guide page per knowledge-base intent. Content comes from the KB
// (English source in qa.ts, translations in qa.i18n.ts) so every locale is
// fully localized — never mixed-language.
export function generateStaticParams() {
  return ALL_INTENTS.map((h) => ({ slug: h.item.id }));
}

// Turn an on-site resource path into a label in the reader's language, using the
// site's existing localized names (groups, directory types, section titles).
type T = Awaited<ReturnType<typeof getTranslations>>;
function resourceLabel(path: string, t: T): string {
  if (path.startsWith('/directory/g/')) return t(`groups.${path.split('/').pop()}`);
  if (path === '/directory') return t('directory.title');
  if (path === '/directory/beach') return t('directory.beach');
  if (path === '/directory/restaurant') return t('directory.restaurant');
  if (path === '/when-to-visit') return t('whenToVisit.title');
  if (path === '/agenda') return t('nav.agenda');
  if (path === '/luxury') return t('luxury.title');
  if (path === '/ask') return t('concierge.title');
  if (path === '/best') return t('guide.bestOf');
  if (path === '/advertise') return t('guide.partner');
  return path;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !QA_INDEX[slug]) return {};
  const tx = localizedIntent(slug, locale);
  return pageMetadata({
    locale: locale as Locale, path: guideHref(slug),
    title: tx.q, description: tx.a.slice(0, 200), kicker: 'Cyprus Lifestyle',
  });
}

export default async function GuidePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const hit = QA_INDEX[slug];
  if (!hit) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const t = await getTranslations();

  const tx = localizedIntent(slug, l);
  const domainTx = localizedDomain(hit.domain.id, l);

  const related = hit.item.links.map((id) => QA_INDEX[id]).filter(Boolean).slice(0, 4);
  const siblings = hit.domain.intents.filter((it) => it.id !== slug).slice(0, 6);
  const resources = liveResources(hit.item);

  // FAQ schema — this Q&A plus the related ones, all localized.
  const faqs = [{ q: tx.q, a: tx.a }, ...related.slice(0, 3).map((h) => {
    const rt = localizedIntent(h.item.id, l);
    return { q: rt.q, a: rt.a };
  })];

  const crumbLd = breadcrumbJsonLd(l, [
    { name: t('brand.name'), path: '/' },
    { name: t('guide.title'), path: '/guide' },
    { name: tx.q, path: guideHref(slug) },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(faqJsonLd(faqs)) }} />

      <div className="wrap dept">
        <span className="kicker"><Link href="/guide">{t('guide.title')}</Link> · {domainTx.title}</span>
        <h1>{tx.q}</h1>
        <p className="desc gd-lead">{tx.a}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      <div className="wrap section gd-body">
        {/* On-site resources — where to act on this, on our own site */}
        {resources.length ? (
          <section className="gd-block">
            <h2 className="gd-h2">{t('guide.exploreTitle')}</h2>
            <div className="gd-chips">
              {resources.map((r) => (
                <Link key={r.path} href={r.path} className="gd-chip">{resourceLabel(r.path, t)} →</Link>
              ))}
            </div>
          </section>
        ) : null}

        {/* Connector CTA — the platform's promise, fully localized */}
        <section className="gd-connect">
          <h2 className="gd-connect-h">{t('guide.connectTitle')}</h2>
          <p className="gd-connect-b">{t('guide.connectBody')}</p>
          <Link href="/ask" className="btn gd-ask">{t('guide.askCta')} →</Link>
        </section>

        {/* Related questions */}
        {related.length ? (
          <section className="gd-block">
            <h2 className="gd-h2">{t('guide.relatedTitle')}</h2>
            <ul className="gd-list">
              {related.map((h) => (
                <li key={h.item.id}><Link href={guideHref(h.item.id)}>{localizedIntent(h.item.id, l).q}</Link></li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* More in this domain */}
        {siblings.length ? (
          <section className="gd-block">
            <h2 className="gd-h2">{t('guide.moreInTitle', { topic: domainTx.title })}</h2>
            <ul className="gd-list gd-list-2">
              {siblings.map((it) => (
                <li key={it.id}><Link href={guideHref(it.id)}>{localizedIntent(it.id, l).q}</Link></li>
              ))}
            </ul>
          </section>
        ) : null}

        <p className="gd-all"><Link href="/guide">← {t('guide.allGuides')}</Link></p>
      </div>

      <style>{`
        .gd-lead{max-width:64ch;font-size:20px;line-height:1.6}
        .gd-body{display:flex;flex-direction:column;gap:34px;max-width:820px}
        .gd-block{}
        .gd-h2{font-family:var(--disp);font-weight:600;font-size:22px;margin:0 0 14px}
        .gd-chips{display:flex;flex-wrap:wrap;gap:10px}
        .gd-chip{display:inline-flex;align-items:center;padding:9px 15px;border:1px solid var(--line,#e0d6c1);border-radius:999px;background:#fff;font-family:var(--sans);font-size:15px;color:var(--ink,#171310)}
        .gd-chip:hover{background:var(--paper-2,#efe8d8);text-decoration:none;border-color:#C9A24C}
        .gd-connect{border:1px solid var(--line,#e0d6c1);border-radius:10px;background:var(--paper-2,#efe8d8);padding:22px 24px}
        .gd-connect-h{font-family:var(--disp);font-weight:600;font-size:21px;margin:0 0 6px}
        .gd-connect-b{font-family:var(--body);font-size:16px;color:var(--ink-soft,#5b5346);margin:0 0 16px;max-width:60ch}
        .gd-ask{white-space:nowrap}
        .gd-list{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:2px}
        .gd-list li{border-bottom:1px solid var(--line-soft,#efe8d8)}
        .gd-list li:last-child{border-bottom:0}
        .gd-list a{display:block;padding:12px 2px;font-family:var(--disp);font-size:18px;color:var(--ink,#171310)}
        .gd-list a:hover{color:#8a5b12}
        .gd-list-2{columns:2;column-gap:34px}
        .gd-list-2 li{break-inside:avoid}
        .gd-all{font-family:var(--sans);font-size:15px;margin:6px 0 0}
        @media (max-width:640px){.gd-list-2{columns:1}.gd-lead{font-size:18px}}
      `}</style>
    </>
  );
}
