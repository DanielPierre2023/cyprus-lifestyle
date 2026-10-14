// A page of directory cards with page-number navigation. Server component, no client JS (plan item V1).
// Page 1 lives at the list's own address, page N at "<base>/p/<N>": every page is a normal, cacheable, crawlable URL.
import { Link } from '@/lib/i18n/routing';
import CoverImage from '@/components/CoverImage';
import { formatNumber } from '@/lib/i18n/format';
import type { Listing } from '@/lib/queries';
import { pageWindow, pageHref } from '@/lib/directory/paging';

export interface PagerLabels { prev: string; next: string; page: string }

export default function DirectoryPagedList({
  locale, items, kickerFallback, base, page, pages, total, labels, noneLabel, showRating = false,
}: {
  locale: string; items: Listing[]; kickerFallback: string; base: string; page: number; pages: number; total: number;
  labels: PagerLabels; noneLabel: string; showRating?: boolean;
}) {
  if (!items.length) return <p>{noneLabel}</p>;
  const win = pageWindow(page, pages);
  return (
    <>
      <p className="dpl-count" aria-live="polite">{formatNumber(locale, total)} · {labels.page} {formatNumber(locale, page)} / {formatNumber(locale, pages)}</p>
      <div className="grid g3">
        {items.map((x) => (
          <article key={x.id} className="card">
            <Link href={`/directory/${x.type}/${x.slug}`} className="ph" aria-hidden="true" tabIndex={-1}>
              <CoverImage src={x.image} seed={x.slug} alt={x.name} className="ph-img" sizes="(max-width: 900px) 100vw, 33vw" fallbackKind="brand" />
            </Link>
            <span className="kicker">{x.district || kickerFallback}{x.price_band ? ` · ${x.price_band}` : ''}</span>
            <h3><Link href={`/directory/${x.type}/${x.slug}`}>{x.name}</Link></h3>
            {x.verified ? <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, color: '#8a5b12', background: 'rgba(201,162,76,.16)', border: '1px solid #C9A24C', borderRadius: 999, padding: '1px 8px', margin: '2px 0 0' }}>✓</span> : null}
            {showRating && x.rating != null ? <p style={{ margin: '2px 0 0', fontFamily: 'var(--sans)', fontSize: 14, color: '#8a5b12' }}>★ {x.rating.toFixed(1)}{x.rating_count ? <span style={{ color: 'var(--ink-soft,#5b5346)' }}> · {formatNumber(locale, x.rating_count)}</span> : null}</p> : null}
            {x.summary ? <p>{x.summary}</p> : null}
          </article>
        ))}
      </div>
      {pages > 1 ? (
        <nav className="dpl-pager" aria-label={labels.page}>
          {page > 1 ? <Link href={pageHref(base, page - 1)} rel="prev" className="dpl-a">← {labels.prev}</Link> : null}
          {win.map((n, i) => n === 0
            ? <span key={`g${i}`} className="dpl-gap">…</span>
            : n === page
              ? <span key={n} className="dpl-a on" aria-current="page">{formatNumber(locale, n)}</span>
              : <Link key={n} href={pageHref(base, n)} className="dpl-a" aria-label={`${labels.page} ${n}`}>{formatNumber(locale, n)}</Link>)}
          {page < pages ? <Link href={pageHref(base, page + 1)} rel="next" className="dpl-a">{labels.next} →</Link> : null}
        </nav>
      ) : null}
      <style>{`
        .dpl-count{font-family:var(--sans);font-size:13px;color:var(--ink-soft,#5b5346);margin:0 0 14px}
        .dpl-pager{display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;margin:34px 0 6px}
        .dpl-a{font-family:var(--sans);font-size:14px;min-width:38px;text-align:center;padding:8px 12px;border:1px solid var(--line,#e0d6c1);border-radius:999px;background:#fff;color:var(--ink,#171310)}
        a.dpl-a:hover{text-decoration:none;border-color:#C9A24C;background:var(--paper-2,#efe8d8)}
        .dpl-a.on{background:#C9A24C;border-color:#C9A24C;color:#0B0E11;font-weight:700}
        .dpl-gap{color:var(--ink-soft,#5b5346)}
      `}</style>
    </>
  );
}
