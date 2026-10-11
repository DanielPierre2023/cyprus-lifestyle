// The shared list view of the public experiences pages (/activities and /activities/browse/<filters>).
// Server component, no client JS: filters, pagination and cards are plain links, so every state is a
// cacheable ISR page. Catalogue text is English everywhere (owner rule); only the labels are localised.
import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';
import { pageMetadata, breadcrumbJsonLd, ld } from '@/lib/seo';
import type { Locale } from '@/lib/locales';
import { kindOf, kindLabel } from '@/lib/activities/classify';
import { activitiesCopy, districtName, fill } from '@/lib/activities/pageCopy';
import { getPublicActivities } from '@/lib/activities/public';
import { listJsonLd } from '@/lib/activities/pageData';
import { tagPage, cacheTag, cacheTagWithLocale } from '@/lib/queries.cached';
import {
  applyFilters, facets, filterPath, isIndexable, paginate, toggled, facetCount, PRICE_BANDS,
  type Filters, type PublicActivity,
} from '@/lib/activities/browse';

const durLabel = (c: ReturnType<typeof activitiesCopy>, k: string) => (k === 'short' ? c.durShort : k === 'half' ? c.durHalf : c.durFull);

export function listingMetadata(locale: Locale, f: Filters): Metadata {
  const c = activitiesCopy(locale);
  const facetName = f.kind ? kindLabel(f.kind, locale) : f.district ? districtName(f.district, locale) : '';
  const title = facetName && facetCount(f) === 1 ? `${facetName} · ${c.title}` : c.title;
  const path = filterPath(f);
  const robots = isIndexable(f) ? undefined : { index: false, follow: true };
  return pageMetadata({ locale, path, title, description: c.dek, kicker: c.kicker, ...(robots ? { robots } : {}) }) as Metadata;
}

export default async function Listing({ locale, f }: { locale: Locale; f: Filters }) {
  const c = activitiesCopy(locale);
  await tagPage([...cacheTagWithLocale(cacheTag.activities(), locale)], `activities:list:${locale}`);
  const all = await getPublicActivities();
  const filtered = applyFilters(all, f);
  const slice = paginate(filtered, f.page);
  const fx = facets(all, f);
  const active = facetCount(f) > 0;
  const href = (g: Filters) => filterPath(g);

  const crumbs = [{ name: c.home, path: '/' }, { name: c.nav, path: '/activities' }];
  const crumbLd = breadcrumbJsonLd(locale, crumbs);
  const listLd = listJsonLd(slice.items, locale);

  const Chip = ({ g, on, children, n }: { g: Filters; on: boolean; children: React.ReactNode; n: number }) => (
    <Link href={href(g)} className={`act-chip${on ? ' on' : ''}`} aria-current={on ? 'true' : undefined}>{children}<span className="n">{n}</span></Link>
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(crumbLd) }} />
      {slice.items.length ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(listLd) }} /> : null}
      <div className="wrap page-head act-head">
        <nav aria-label="breadcrumb" className="act-crumbs"><Link href="/">{c.home}</Link> › {active ? <Link href="/activities">{c.nav}</Link> : <span>{c.nav}</span>}</nav>
        <span className="kicker">{c.kicker}</span>
        <h1>{c.title}</h1>
        <p className="dek" style={{ maxWidth: '62ch' }}>{c.dek}</p>
        <div className="rule-orn orn"><span className="diamond" /></div>
      </div>

      <div className="wrap section">
        <div className="act-filters" role="group" aria-label={c.filters}>
          <FilterRow label={c.fKind}>
            {fx.kind.map((x) => <Chip key={x.key} g={toggled(f, 'kind', x.key)} on={f.kind === x.key} n={x.n}>{kindLabel(x.key, locale)}</Chip>)}
          </FilterRow>
          <FilterRow label={c.fDistrict}>
            {fx.district.map((x) => <Chip key={x.key} g={toggled(f, 'district', x.key)} on={f.district === x.key} n={x.n}>{districtName(x.key, locale)}</Chip>)}
          </FilterRow>
          <FilterRow label={c.fDuration}>
            {fx.dur.map((x) => <Chip key={x.key} g={toggled(f, 'dur', x.key)} on={f.dur === x.key} n={x.n}>{durLabel(c, x.key)}</Chip>)}
          </FilterRow>
          <FilterRow label={c.fPrice}>
            {fx.price.map((x) => <Chip key={x.key} g={toggled(f, 'price', x.key)} on={f.price === x.key} n={x.n}>{PRICE_BANDS[x.key - 1]}</Chip>)}
          </FilterRow>
          {active ? <Link href="/activities" className="act-clear">{c.clear}</Link> : null}
        </div>

        <p className="act-count" role="status">{fill(c.count, { n: slice.total })}{slice.pages > 1 ? ` · ${fill(c.pageOf, { p: slice.page, n: slice.pages })}` : ''}</p>

        {slice.items.length ? (
          <ul className="act-grid">
            {slice.items.map((a) => <li key={a.slug}><Card a={a} locale={locale} /></li>)}
          </ul>
        ) : <p className="act-empty">{c.empty}</p>}

        {slice.pages > 1 ? (
          <nav className="act-pager" aria-label={c.pageOf.replace('{p}', String(slice.page)).replace('{n}', String(slice.pages))}>
            {slice.page > 1 ? <Link href={href({ ...f, page: slice.page - 1 })} rel="prev">← {c.prev}</Link> : <span />}
            <span>{fill(c.pageOf, { p: slice.page, n: slice.pages })}</span>
            {slice.page < slice.pages ? <Link href={href({ ...f, page: slice.page + 1 })} rel="next">{c.next} →</Link> : <span />}
          </nav>
        ) : null}

        <p className="act-note">{c.englishNote} {c.partnerNote}</p>
      </div>
      <style>{CSS}</style>
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="act-frow"><span className="act-flabel">{label}</span><div className="act-chips">{children}</div></div>;
}

export function Card({ a, locale }: { a: PublicActivity; locale: Locale }) {
  const c = activitiesCopy(locale);
  const k = kindOf(a.kind);
  const place = [a.town, a.district ? districtName(a.district, locale) : ''].filter((x, i, arr) => x && arr.indexOf(x) === i).join(' · ');
  return (
    <article className="act-card">
      <Link href={`/activities/${a.slug}`} className="act-ic" aria-hidden="true" tabIndex={-1}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: k.icon }} />
      </Link>
      <div className="act-body">
        <span className="act-kind">{kindLabel(a.kind, locale)}{place ? ` · ${place}` : ''}</span>
        <h2 className="act-title"><Link href={`/activities/${a.slug}`}>{a.title}</Link></h2>
        <p className="act-meta">
          {a.duration_label ? <span>{a.duration_label}</span> : null}
          {a.price_band ? <span><b>{a.price_band}</b></span> : null}
          <span className="act-more">{c.details} →</span>
        </p>
      </div>
    </article>
  );
}

export const CSS = `
.act-head .act-crumbs{font-family:var(--sans);font-size:13px;color:var(--ink-soft,#5b5346);margin:0 0 6px}
.act-head .act-crumbs a{color:inherit}
.act-filters{display:flex;flex-direction:column;gap:10px;margin:0 0 14px}
.act-frow{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline}
.act-flabel{font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft,#5b5346);min-width:96px}
.act-chips{display:flex;flex-wrap:wrap;gap:6px}
.act-chip{display:inline-flex;align-items:center;gap:7px;padding:5px 12px;border:1px solid var(--line,#e0d6c1);border-radius:999px;background:#fff;font-family:var(--sans);font-size:14px;color:var(--ink,#171310);text-decoration:none}
.act-chip:hover{border-color:#C9A24C;text-decoration:none}
.act-chip.on{background:#171310;color:#fff;border-color:#171310}
.act-chip .n{font-size:12px;opacity:.7}
.act-clear{font-family:var(--sans);font-size:14px;align-self:flex-start}
.act-count{font-family:var(--sans);font-size:14px;color:var(--ink-soft,#5b5346);margin:6px 0 14px}
.act-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:12px}
.act-card{display:flex;gap:12px;padding:12px;border:1px solid var(--line,#e0d6c1);border-radius:10px;background:#fff;height:100%}
.act-ic{flex:none;width:56px;height:56px;border-radius:10px;background:#f4eedf;color:#8a5b12;display:flex;align-items:center;justify-content:center}
.act-body{display:flex;flex-direction:column;min-width:0;flex:1}
.act-kind{font-family:var(--sans);font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#8a5b12}
.act-title{font-family:var(--disp);font-size:18px;line-height:1.25;margin:3px 0 6px;font-weight:600}
.act-title a{color:var(--ink,#171310);text-decoration:none}
.act-title a:hover{text-decoration:underline}
.act-meta{display:flex;flex-wrap:wrap;gap:4px 12px;margin:auto 0 0;font-family:var(--sans);font-size:13px;color:var(--ink-soft,#5b5346)}
.act-meta b{color:var(--ink,#171310)}
.act-more{margin-inline-start:auto;color:#123A4A;font-weight:600}
.act-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:22px 0 4px;font-family:var(--sans);font-size:15px}
.act-empty{font-family:var(--body);color:var(--ink-soft,#5b5346)}
.act-note{font-family:var(--sans);font-size:12.5px;color:var(--ink-soft,#5b5346);margin:22px 0 0;max-width:80ch}
`;
