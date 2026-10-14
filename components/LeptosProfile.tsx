// The long-form profile of Leptos Estates / the Leptos Group, rendered on the head-office listing page.
// Server component: all text comes from lib/partners (code, reviewed like any change), the live rows only supply links, images and
// coordinates. Every section degrades to plain text when a row is not published yet (cards then link to the official Leptos page).
import { Link } from '@/lib/i18n/routing';
import type { Locale } from '@/lib/locales';
import type { Listing } from '@/lib/queries';
import { formatNumber } from '@/lib/i18n/format';
import DirectoryMap, { type MapPoint } from '@/components/DirectoryMap';
import LeptosProjects, { type AreaChip, type ProjectCard } from '@/components/LeptosProjects';
import { fanOut } from '@/lib/partners/geo';
import {
  AREA, AREA_OF_PLACE, AREA_ORDER, ENTITY_ROLE, HISTORY, HISTORY_INTRO, HISTORY_TODAY, LEPTOS_ABROAD, LEPTOS_AWARDS, LEPTOS_ENTITIES,
  LEPTOS_GREECE, LEPTOS_OFFICES, LEPTOS_PROJECTS, LEPTOS_SITE, OFFICE_NOTE, REASONS, SECTOR, SECTOR_ORDER, UI, kindLabel, placeName,
} from '@/lib/partners/leptos';

export interface LeptosMapLabels { typeLabels: Record<string, string>; view: string; places: string; aria: string }

const telHref = (p: string) => `tel:${p.replace(/[^\d+]/g, '')}`;

export default function LeptosProfile({ locale, members, mapLabels }: { locale: Locale; members: Listing[]; mapLabels: LeptosMapLabels }) {
  const ui = UI[locale];
  const bySlug = new Map(members.map((m) => [m.slug, m]));
  const pageOf = (slug?: string): string | null => {
    const m = slug ? bySlug.get(slug) : undefined;
    return m ? `/directory/${m.type}/${m.slug}` : null;
  };

  const stats: [string, string][] = [
    ['1960', ui.stat.since],
    [formatNumber(locale, 75), ui.stat.countries],
    [`${formatNumber(locale, 350)}+`, ui.stat.developments],
    [`${formatNumber(locale, 25000)}+`, ui.stat.owners],
    [`${formatNumber(locale, 1300)}+`, ui.stat.employees],
    [`${formatNumber(locale, 30)}+`, ui.stat.companies],
  ];

  // Project cards, in the order of the areas, then A to Z.
  const cards: ProjectCard[] = LEPTOS_PROJECTS.map((p) => ({
    key: p.key, slug: p.slug, name: p.name, href: pageOf(p.slug), official: p.url,
    thumb: p.noImage ? '' : `/partners/leptos/t/${p.key}.jpg`, kind: kindLabel(locale, p), place: placeName(locale, p.place),
    beds: p.beds ?? null, area: AREA_OF_PLACE[p.place], luxury: Boolean(p.luxury),
  })).sort((a, b) => AREA_ORDER.indexOf(a.area as never) - AREA_ORDER.indexOf(b.area as never) || a.name.localeCompare(b.name));
  const areas: AreaChip[] = AREA_ORDER
    .map((a) => ({ key: a, label: AREA[a][locale], count: cards.filter((c) => c.area === a).length }))
    .filter((a) => a.count > 0);

  // Map: offices (exact), the group's own rows that have a point, then every project (spread a little where several share a village).
  const hrefOf = (slug: string): string | undefined => { const p = pageOf(slug); return p ? `/${locale}${p}` : undefined; };
  const officePts: MapPoint[] = LEPTOS_OFFICES.map((o) => {
    const m = bySlug.get(o.slug);
    return { lat: m?.lat ?? o.lat, lng: m?.lng ?? o.lng, name: o.name, type: 'vendor', href: o.id === 'paphos' ? undefined : hrefOf(o.slug), image: m?.image ?? null };
  });
  const officeSlugs = new Set(LEPTOS_OFFICES.map((o) => o.slug));
  const projectSlugs = new Set(LEPTOS_PROJECTS.map((p) => p.slug));
  const groupPts: MapPoint[] = members
    .filter((m) => m.lat != null && m.lng != null && !officeSlugs.has(m.slug) && !projectSlugs.has(m.slug))
    .map((m) => ({ lat: m.lat as number, lng: m.lng as number, name: m.name, type: m.type, href: hrefOf(m.slug), image: m.image }));
  const projectPts: MapPoint[] = fanOut(LEPTOS_PROJECTS.map((p) => ({
    lat: p.lat, lng: p.lng, name: p.name, type: 'development', href: hrefOf(p.slug) ?? p.url, image: bySlug.get(p.slug)?.image ?? null,
  })));
  const points = [...officePts, ...groupPts, ...projectPts];

  const nav = ui.nav;
  return (
    <div className="lp">
      <nav className="lp-nav" aria-label="Leptos">
        <a href="#lp-history">{nav.history}</a><a href="#lp-reasons">{nav.reasons}</a><a href="#lp-structure">{nav.structure}</a>
        <a href="#lp-locations">{nav.locations}</a><a href="#lp-projects">{nav.projects}</a><a href="#lp-awards">{nav.awards}</a>
      </nav>

      <section className="lp-sec" aria-labelledby="lp-glance-h">
        <h2 className="lp-h2" id="lp-glance-h">{ui.glanceTitle}</h2>
        <div className="lp-glance">
          {stats.map(([v, l]) => (<div key={l} className="lp-stat"><b dir="ltr">{v}</b><span>{l}</span></div>))}
        </div>
        <p className="lp-note">{ui.glanceNote}</p>
      </section>

      <section className="lp-sec" id="lp-history" aria-labelledby="lp-history-h">
        <h2 className="lp-h2" id="lp-history-h">{ui.historyTitle}</h2>
        <p className="lp-lead">{HISTORY_INTRO[locale]}</p>
        <ol className="lp-time">
          {HISTORY.map((h) => (
            <li key={h.year}><span className="y">{h.after ? `${ui.after} ${h.year}` : h.year}</span><span className="t">{h.text[locale]}</span></li>
          ))}
          <li><span className="y">{ui.today}</span><span className="t">{HISTORY_TODAY[locale]}</span></li>
        </ol>
      </section>

      <section className="lp-sec" id="lp-reasons" aria-labelledby="lp-reasons-h">
        <h2 className="lp-h2" id="lp-reasons-h">{ui.reasonsTitle}</h2>
        <p className="lp-lead">{ui.reasonsSub}</p>
        <ol className="lp-reasons">
          {REASONS.map((r, i) => (
            <li key={i} className="lp-reason"><span className="n">{formatNumber(locale, i + 1)}</span><h3>{r.title[locale]}</h3><p>{r.text[locale]}</p></li>
          ))}
        </ol>
      </section>

      <section className="lp-sec" id="lp-structure" aria-labelledby="lp-structure-h">
        <h2 className="lp-h2" id="lp-structure-h">{ui.structureTitle}</h2>
        <p className="lp-lead">{ui.structureIntro}</p>
        {SECTOR_ORDER.map((s) => (
          <div key={s} className="lp-sector">
            <h3>{SECTOR[s][locale]}</h3>
            {LEPTOS_ENTITIES.filter((e) => e.sector === s).map((e) => {
              const internal = e.id === 'estates' ? null : pageOf(e.slug);
              const external = !internal && e.site && e.id !== 'estates' ? `https://${e.site}` : null;
              return (
                <div key={e.id} className="lp-ent">
                  <span className="nm">{internal ? <Link href={internal}>{e.name}</Link> : e.name}{e.country === 'GR' ? <span className="tag">{ui.inGreece}</span> : null}</span>
                  <p>{ENTITY_ROLE[e.id][locale]}</p>
                  <span className="go">
                    {internal ? <Link href={internal}>{ui.openPage} →</Link> : external ? <a href={external} target="_blank" rel="noopener nofollow">{ui.website} ↗</a> : null}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
        <p className="lp-note">{ui.structureNote}</p>
      </section>

      <section className="lp-sec" id="lp-locations" aria-labelledby="lp-locations-h">
        <h2 className="lp-h2" id="lp-locations-h">{ui.locationsTitle}</h2>
        <p className="lp-lead">{ui.locationsIntro}</p>
        <div className="lp-offices">
          {LEPTOS_OFFICES.map((o) => {
            const page = o.id === 'paphos' ? null : pageOf(o.slug);
            return (
              <article key={o.id} className="lp-office">
                <span className="k">{o.id === 'paphos' ? ui.headOffice : ui.salesOffice}</span>
                <h3>{page ? <Link href={page}>{o.name}</Link> : o.name}</h3>
                <p className="a">{o.address}</p>
                <p className="c"><a href={telHref(o.phone)}>{o.phone}</a><br /><a href={`mailto:${o.email}`}>{o.email}</a></p>
                <p className="n">{OFFICE_NOTE[o.id][locale]}</p>
                {page ? <Link className="go" href={page}>{ui.openPage} →</Link> : null}
              </article>
            );
          })}
        </div>
        <div className="lp-map">
          <DirectoryMap points={points} height={460} locale={locale} typeLabels={mapLabels.typeLabels} viewLabel={mapLabels.view} placesLabel={mapLabels.places} ariaLabel={mapLabels.aria} />
        </div>
        <p className="lp-note">{ui.mapCaption}</p>
      </section>

      <section className="lp-sec" id="lp-projects" aria-labelledby="lp-projects-h">
        <h2 className="lp-h2" id="lp-projects-h">{ui.projectsTitle}</h2>
        <p className="lp-lead">{ui.projectsIntro.replace('{n}', formatNumber(locale, LEPTOS_PROJECTS.length))}</p>
        <LeptosProjects cards={cards} areas={areas} labels={{ all: ui.all, bedrooms: ui.bedrooms, viewProject: ui.viewProject, officialPage: ui.officialPage }} />
        <h3 className="lp-h3">{ui.greeceTitle}</h3>
        <p className="lp-note" style={{ marginTop: 0 }}>{ui.greeceIntro}</p>
        <ul className="lp-gr">
          {LEPTOS_GREECE.map((g) => (<li key={g.url}><a href={g.url} target="_blank" rel="noopener nofollow">{g.name}<span> · {g.where}</span></a></li>))}
        </ul>
      </section>

      <section className="lp-sec" id="lp-awards" aria-labelledby="lp-awards-h">
        <h2 className="lp-h2" id="lp-awards-h">{ui.awardsTitle}</h2>
        <p className="lp-lead">{ui.awardsIntro}</p>
        <ul className="lp-awards">
          {LEPTOS_AWARDS.map((a, i) => (<li key={i}><span className="y">{a.year ?? ''}</span>{a.title}</li>))}
        </ul>
      </section>

      <section className="lp-sec" aria-labelledby="lp-abroad-h">
        <h2 className="lp-h2" id="lp-abroad-h">{ui.abroadTitle}</h2>
        <p className="lp-lead">{ui.abroadIntro}</p>
        <details className="lp-abroad">
          <summary>{LEPTOS_ABROAD.map((a) => a.city).join(' · ')}</summary>
          <div className="lp-abroad-grid">
            {LEPTOS_ABROAD.map((a) => (
              <div key={a.city} className="lp-ab"><b>{a.city}</b><span>{a.country}</span><span>{a.address}</span>
                <span><a href={telHref(a.phone)}>{a.phone}</a> · <a href={`mailto:${a.email}`}>{a.email}</a></span></div>
            ))}
          </div>
        </details>
      </section>

      <p className="lp-src">{ui.sourceNote} <a href={LEPTOS_SITE} target="_blank" rel="noopener nofollow">leptosestates.com ↗</a></p>

      <style>{`
        .lp-nav{display:flex;flex-wrap:wrap;gap:6px 18px;margin:30px 0 0;padding:12px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--line);font-family:var(--sans);font-size:12px;letter-spacing:.16em;text-transform:uppercase;font-weight:600}
        .lp-nav a{color:var(--gold-deep)}
        .lp-sec{margin-top:54px}
        .lp-h2{font-family:var(--disp);font-weight:600;font-size:clamp(26px,3.2vw,34px);line-height:1.1;margin:0 0 8px;letter-spacing:-.01em}
        .lp-h3{font-family:var(--sans);text-transform:uppercase;letter-spacing:.2em;font-size:11.5px;color:var(--copper);margin:34px 0 8px}
        .lp-lead{font-family:var(--body);font-size:17.5px;line-height:1.6;color:var(--ink-soft);max-width:72ch;margin:0 0 20px}
        .lp-note{font-family:var(--sans);font-size:12.5px;line-height:1.5;color:var(--ink-soft);margin:10px 0 0}
        .lp-glance{display:grid;grid-template-columns:repeat(6,1fr);border:1px solid var(--line);background:#fff;border-radius:6px;overflow:hidden}
        .lp-stat{padding:22px 12px;text-align:center;border-inline-end:1px solid var(--line)}
        .lp-stat:last-child{border-inline-end:0}
        .lp-stat b{display:block;font-family:var(--disp);font-weight:600;font-size:clamp(26px,3vw,36px);color:var(--gold-deep);line-height:1}
        .lp-stat span{display:block;margin-top:9px;font-family:var(--sans);font-size:11px;letter-spacing:.07em;text-transform:uppercase;color:var(--ink-soft);line-height:1.35}
        .lp-time{list-style:none;margin:0;padding:0}
        .lp-time li{display:grid;grid-template-columns:110px 1fr;gap:18px;padding:14px 0;border-top:1px solid var(--line)}
        .lp-time li:last-child{border-bottom:1px solid var(--line)}
        .lp-time .y{font-family:var(--disp);font-size:23px;color:var(--gold-deep);line-height:1.2}
        .lp-time .t{font-family:var(--body);font-size:16.5px;line-height:1.55}
        .lp-reasons{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .lp-reason{background:#fff;border:1px solid var(--line);border-radius:6px;padding:20px 20px 18px}
        .lp-reason .n{font-family:var(--disp);font-style:italic;font-size:32px;color:var(--gold);line-height:1;display:block}
        .lp-reason h3{font-family:var(--sans);text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:600;margin:10px 0 6px}
        .lp-reason p{font-family:var(--body);font-size:15.5px;line-height:1.5;margin:0}
        .lp-sector{margin-top:24px}
        .lp-sector h3{font-family:var(--sans);text-transform:uppercase;letter-spacing:.2em;font-size:11.5px;color:var(--copper);border-bottom:1px solid var(--ink);padding-bottom:8px;margin:0 0 4px}
        .lp-ent{display:grid;grid-template-columns:minmax(0,270px) minmax(0,1fr) auto;gap:6px 24px;padding:14px 0;border-bottom:1px solid var(--line);align-items:baseline}
        .lp-ent .nm{font-family:var(--disp);font-size:20px;line-height:1.2}
        .lp-ent .nm a:hover{color:var(--copper)}
        .lp-ent .tag{font-family:var(--sans);font-size:10px;letter-spacing:.12em;text-transform:uppercase;border:1px solid var(--line);border-radius:999px;padding:1px 8px;margin-inline-start:8px;color:var(--ink-soft);vertical-align:middle}
        .lp-ent p{font-family:var(--body);font-size:15.5px;line-height:1.5;color:var(--ink-soft);margin:0}
        .lp-ent .go{font-family:var(--sans);font-size:12.5px;font-weight:600;white-space:nowrap}
        .lp-ent .go a{color:var(--gold-deep)}
        .lp-offices{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
        .lp-office{background:#fff;border:1px solid var(--line);border-radius:6px;padding:18px 20px;display:flex;flex-direction:column;gap:6px}
        .lp-office .k{font-family:var(--sans);text-transform:uppercase;letter-spacing:.16em;font-size:10.5px;color:var(--copper);font-weight:600}
        .lp-office h3{font-family:var(--disp);font-size:21px;line-height:1.15;margin:0}
        .lp-office p{margin:0;font-family:var(--body);font-size:15px;line-height:1.5}
        .lp-office .c a{color:var(--gold-deep);font-family:var(--sans);font-size:14px;font-weight:600}
        .lp-office .n{color:var(--ink-soft);font-size:14px}
        .lp-office .go{margin-top:auto;font-family:var(--sans);font-size:12.5px;font-weight:600;color:var(--gold-deep)}
        .lp-map{margin-top:18px;border:1px solid var(--line);border-radius:6px;overflow:hidden}
        .lp-chips{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 20px}
        .lp-chip{font-family:var(--sans);font-size:12.5px;font-weight:600;border:1px solid var(--line);border-radius:999px;padding:7px 15px;background:#fff;color:var(--ink);cursor:pointer}
        .lp-chip:hover{border-color:var(--gold)}
        .lp-chip[aria-pressed=true]{background:var(--obsidian);color:var(--champagne);border-color:var(--obsidian)}
        .lp-pgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
        .lp-pcard{display:flex;flex-direction:column;background:#fff;border:1px solid var(--line);border-radius:6px;overflow:hidden}
        .lp-pcard .ph{position:relative;display:block;aspect-ratio:3/2;overflow:hidden;background:linear-gradient(135deg,#1c2b33,#0B0E11)}
        .lp-pcard:hover .ph-img{transform:scale(1.04)}
        .lp-pcard .bd{padding:14px 16px 16px;display:flex;flex-direction:column;gap:4px;flex:1}
        .lp-pcard .k{font-family:var(--sans);text-transform:uppercase;letter-spacing:.14em;font-size:10.5px;color:var(--copper);font-weight:600}
        .lp-pcard h3{font-family:var(--disp);font-size:21px;line-height:1.12;margin:2px 0 0}
        .lp-pcard h3 a:hover{color:var(--copper)}
        .lp-pcard .m{font-family:var(--sans);font-size:13px;color:var(--ink-soft)}
        .lp-pcard .acts{margin-top:auto;padding-top:10px;display:flex;gap:16px;flex-wrap:wrap;font-family:var(--sans);font-size:12.5px;font-weight:600}
        .lp-pcard .acts a{color:var(--gold-deep)}
        .lp-gr{list-style:none;margin:10px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:8px 10px}
        .lp-gr a{display:inline-block;font-family:var(--sans);font-size:13px;font-weight:600;border:1px solid var(--line);border-radius:999px;padding:5px 13px;background:#fff;color:var(--ink)}
        .lp-gr a:hover{border-color:var(--gold);text-decoration:none}
        .lp-gr span{font-weight:400;color:var(--ink-soft)}
        .lp-awards{columns:2;column-gap:36px;margin:0;padding:0;list-style:none}
        .lp-awards li{break-inside:avoid;padding:8px 0;border-bottom:1px solid var(--line);font-family:var(--body);font-size:15.5px;line-height:1.4}
        .lp-awards .y{font-family:var(--sans);font-size:12px;font-weight:600;color:var(--gold-deep);margin-inline-end:10px;display:inline-block;min-width:74px}
        .lp-abroad summary{cursor:pointer;font-family:var(--sans);font-size:13px;font-weight:600;color:var(--gold-deep);padding:10px 0;list-style:revert}
        .lp-abroad-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px 28px;padding:6px 0 4px}
        .lp-ab{display:flex;flex-direction:column;gap:2px;font-family:var(--body);font-size:14.5px;line-height:1.45;border-top:1px solid var(--line);padding-top:10px}
        .lp-ab b{font-family:var(--disp);font-size:18px;font-weight:600}
        .lp-ab span{color:var(--ink-soft)}
        .lp-ab a{color:var(--gold-deep)}
        .lp-src{margin-top:44px;font-family:var(--sans);font-size:12.5px;line-height:1.55;color:var(--ink-soft);border-top:1px solid var(--line);padding-top:14px}
        .lp-src a{color:var(--gold-deep);font-weight:600}
        @media (max-width:980px){.lp-glance{grid-template-columns:repeat(3,1fr)}.lp-stat:nth-child(3){border-inline-end:0}.lp-stat:nth-child(-n+3){border-bottom:1px solid var(--line)}
          .lp-reasons,.lp-offices,.lp-pgrid{grid-template-columns:repeat(2,1fr)}}
        @media (max-width:700px){.lp-glance{grid-template-columns:repeat(2,1fr)}.lp-stat:nth-child(3){border-inline-end:1px solid var(--line)}.lp-stat:nth-child(2n){border-inline-end:0}.lp-stat:nth-child(-n+4){border-bottom:1px solid var(--line)}
          .lp-reasons,.lp-offices,.lp-pgrid{grid-template-columns:1fr}.lp-time li{grid-template-columns:78px 1fr;gap:12px}
          .lp-ent{grid-template-columns:1fr}.lp-awards{columns:1}.lp-abroad-grid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}
