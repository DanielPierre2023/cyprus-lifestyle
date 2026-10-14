'use client';
// The project grid of the Leptos profile: filter chips by area + one card per project. Client component only because of the filter;
// every card is plain links, so the page stays readable without it (all cards render server-side with the "all" filter on).
import { useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import CoverImage from '@/components/CoverImage';

export interface ProjectCard {
  key: string; slug: string; name: string;
  /** Internal page (the directory row exists and is published), or null. */
  href: string | null;
  /** Official page on leptosestates.com. */
  official: string;
  thumb: string;
  kind: string; place: string; beds: string | null; area: string; luxury: boolean;
}
export interface AreaChip { key: string; label: string; count: number }
export interface ProjectLabels { all: string; bedrooms: string; viewProject: string; officialPage: string }

export default function LeptosProjects({ cards, areas, labels }: { cards: ProjectCard[]; areas: AreaChip[]; labels: ProjectLabels }) {
  const [area, setArea] = useState<string>('all');
  const shown = area === 'all' ? cards : cards.filter((c) => c.area === area);
  return (
    <>
      <div className="lp-chips" role="group">
        <button type="button" className="lp-chip" aria-pressed={area === 'all'} onClick={() => setArea('all')}>{labels.all} ({cards.length})</button>
        {areas.map((a) => (
          <button key={a.key} type="button" className="lp-chip" aria-pressed={area === a.key} onClick={() => setArea(a.key)}>{a.label} ({a.count})</button>
        ))}
      </div>
      <div className="lp-pgrid">
        {shown.map((c) => (
          <article key={c.key} className="lp-pcard">
            {c.href ? (
              <Link href={c.href} className="ph" aria-hidden="true" tabIndex={-1}>
                <CoverImage src={c.thumb} seed={c.slug} alt={c.name} className="ph-img" sizes="(max-width: 700px) 100vw, 360px" fallbackKind="brand" />
              </Link>
            ) : (
              <a href={c.official} className="ph" target="_blank" rel="noopener nofollow" aria-hidden="true" tabIndex={-1}>
                <CoverImage src={c.thumb} seed={c.slug} alt={c.name} className="ph-img" sizes="(max-width: 700px) 100vw, 360px" fallbackKind="brand" />
              </a>
            )}
            <div className="bd">
              <span className="k">{c.kind}{c.luxury ? ' · ◆' : ''}</span>
              <h3>{c.href ? <Link href={c.href}>{c.name}</Link> : <a href={c.official} target="_blank" rel="noopener nofollow">{c.name}</a>}</h3>
              <span className="m">{c.place}{c.beds ? ` · ${labels.bedrooms}: ${c.beds}` : ''}</span>
              <div className="acts">
                {c.href ? <Link href={c.href}>{labels.viewProject} →</Link> : null}
                <a href={c.official} target="_blank" rel="noopener nofollow">{labels.officialPage} ↗</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
