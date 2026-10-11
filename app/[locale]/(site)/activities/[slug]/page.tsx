import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { setRequestLocale, getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { isLocale, type Locale } from '@/lib/locales';
import { pageMetadata, breadcrumbJsonLd, ld } from '@/lib/seo';
import { kindOf, kindLabel, priceBasisLabel } from '@/lib/activities/classify';
import { gygPartnerId } from '@/lib/activities/data';
import { getPublicActivity, getRelatedActivities } from '@/lib/activities/public';
import { activitiesCopy, districtName, tagLabels, fill } from '@/lib/activities/pageCopy';
import { activityJsonLd, activityPath, bookingHref, mapHref, isActivitySlug, placeText } from '@/lib/activities/pageData';
import { tagPage, cacheTag, cacheTagWithLocale } from '@/lib/queries.cached';
import TrackedCTA from '@/components/TrackedCTA';
import { Card, CSS as LIST_CSS } from '../_components/Listing';

// ISR 1 h like the other public pages; a catalogue edit refreshes one experience by tag (activity:<slug>).
export const revalidate = 3600;
export function generateStaticParams() { return []; } // rendered on first request, then cached (no build-time database read)

type P = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isActivitySlug(slug)) return {};
  const a = await getPublicActivity(slug);
  if (!a) return {};
  const l = locale as Locale;
  return pageMetadata({
    locale: l, path: activityPath(slug), title: a.title,
    description: a.summary || undefined, kicker: kindLabel(a.kind, l),
  }) as Metadata;
}

export default async function ActivityPage({ params }: P) {
  const { locale, slug } = await params;
  if (!isLocale(locale) || !isActivitySlug(slug)) notFound();
  const a = await getPublicActivity(slug);
  if (!a) notFound();
  setRequestLocale(locale);
  const l = locale as Locale;
  const c = activitiesCopy(l);
  await tagPage([...cacheTagWithLocale(cacheTag.activity(slug), l), ...cacheTagWithLocale(cacheTag.activities(), l)], `activity:${slug}:${l}`);
  const related = await getRelatedActivities(a);
  const t = await getTranslations({ locale: l });
  const brand = t('brand.name');

  const book = bookingHref(a, gygPartnerId());
  const k = kindOf(a.kind);
  const tags = tagLabels(a.tags, l);
  const place = placeLine(a, c, l);
  const basis = a.price_basis ? priceBasisLabel(a.price_basis, l, a.group_max) : '';
  const crumbs = [{ name: brand, path: '/' }, { name: c.nav, path: '/activities' }, { name: a.title, path: activityPath(slug) }];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(breadcrumbJsonLd(l, crumbs)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(activityJsonLd(a, l)) }} />
      <article className="wrap page-head act-head act-detail">
        <nav aria-label="breadcrumb" className="act-crumbs"><Link href="/">{brand}</Link> › <Link href="/activities">{c.nav}</Link> › <span>{a.title}</span></nav>
        <span className="kicker">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: '-3px', marginInlineEnd: 6 }} dangerouslySetInnerHTML={{ __html: k.icon }} />
          {kindLabel(a.kind, l)}
        </span>
        <h1>{a.title}</h1>
        {a.summary ? <p className="dek" lang="en" style={{ maxWidth: '62ch' }}>{a.summary}</p> : null}
        <div className="rule-orn orn"><span className="diamond" /></div>

        {a.visits_north ? <p className="act-warn" role="note">{fill(c.northNote, { site: a.north_site || '—' })}</p> : null}

        <h2 className="act-h2">{c.details}</h2>
        <dl className="act-facts">
          <div><dt>{c.place}</dt><dd>{place}</dd></div>
          {a.duration_label ? <div><dt>{c.duration}</dt><dd>{a.duration_label}</dd></div> : null}
          {a.price_band ? <div><dt>{c.price}</dt><dd><b>{a.price_band}</b>{basis ? ` · ${basis}` : ''}</dd></div> : null}
          {a.group_max && a.group_max > 1 ? <div><dt>{c.group}</dt><dd>{fill(c.groupUpTo, { n: a.group_max })}</dd></div> : null}
          <div><dt>{c.kind}</dt><dd>{kindLabel(a.kind, l)}</dd></div>
        </dl>
        {tags.length ? (
          <>
            <h2 className="act-h2">{c.includes}</h2>
            <ul className="act-tags">{tags.map((x) => <li key={x}>{x}</li>)}</ul>
          </>
        ) : null}
        <p className="act-note">{c.approxNote}</p>
        {a.price_band ? <p className="act-note">{c.priceNote}</p> : null}

        <div className="act-cta">
          {book ? (
            <TrackedCTA slug={`gyg:${a.external_id}`} label="activity-page" href={book} target="_blank" rel="sponsored nofollow noopener" className="act-book">
              {c.book} ↗
            </TrackedCTA>
          ) : null}
          <Link href={mapHref(a)} className="act-map">{c.onMap} →</Link>
        </div>
        <p className="act-note">{c.partnerNote}</p>
        <p className="act-note">{c.englishNote}</p>

        {related.length ? (
          <>
            <h2 className="act-h2">{c.related}</h2>
            <ul className="act-grid">{related.map((r) => <li key={r.slug}><Card a={r} locale={l} /></li>)}</ul>
          </>
        ) : null}
        <p className="act-note"><Link href="/activities">← {c.backToAll}</Link>{a.district && districtName(a.district, l) ? <> · <Link href={`/activities/browse/district-${a.district}`}>{districtName(a.district, l)}</Link></> : null}</p>
      </article>
      <style>{LIST_CSS + DETAIL_CSS}</style>
    </>
  );
}

function placeLine(a: Parameters<typeof placeText>[0] & { district: string | null }, c: ReturnType<typeof activitiesCopy>, l: Locale): string {
  const base = placeText(a, c);
  const d = a.district ? districtName(a.district, l) : '';
  return d && !base.includes(d) ? `${base} · ${d}` : base;
}

const DETAIL_CSS = `
.act-detail h1{margin:4px 0 0}
.act-h2{font-family:var(--disp);font-weight:600;font-size:22px;margin:26px 0 10px}
.act-facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:10px;margin:0}
.act-facts>div{padding:12px 14px;border:1px solid var(--line,#e0d6c1);border-radius:10px;background:#fff}
.act-facts dt{font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft,#5b5346)}
.act-facts dd{margin:4px 0 0;font-family:var(--body);font-size:16px}
.act-tags{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:6px}
.act-tags li{padding:4px 12px;border:1px solid var(--line,#e0d6c1);border-radius:999px;background:#fff;font-family:var(--sans);font-size:14px}
.act-warn{margin:18px 0 0;padding:12px 14px;border:1px solid #C9A24C;border-radius:10px;background:rgba(201,162,76,.12);font-family:var(--sans);font-size:14.5px}
.act-cta{display:flex;flex-wrap:wrap;gap:12px;align-items:center;margin:22px 0 6px}
.act-book{display:inline-block;padding:12px 20px;border-radius:999px;background:#123A4A;color:#fff;font-family:var(--sans);font-weight:700;text-decoration:none}
.act-book:hover{background:#0c2a37;text-decoration:none}
.act-map{font-family:var(--sans);font-size:15px}
`;
