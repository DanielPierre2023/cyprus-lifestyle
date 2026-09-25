'use client';
import { useMemo, useState } from 'react';

export interface WebcamCard {
  slug: string;
  name: string;
  provider: 'youtube' | 'windy' | 'iframe' | 'link' | 'snapshot';
  embedRef: string | null;
  externalUrl: string | null;
  thumbUrl: string | null;
  area: string | null;
  district: string | null;
  category: 'beach' | 'mountain' | 'city' | 'village';
  tags: string[];
  seaTempC: number | null;
}

type Cat = 'all' | 'beach' | 'mountain' | 'city' | 'village';

const GOLD = '#C9A24C';

function embedSrc(c: WebcamCard): string | null {
  if (c.provider === 'youtube' && c.embedRef) {
    return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(c.embedRef)}?autoplay=1&mute=1&playsinline=1&rel=0`;
  }
  if ((c.provider === 'windy' || c.provider === 'iframe') && c.embedRef && /^https:\/\//.test(c.embedRef)) {
    return c.embedRef;
  }
  return null;
}

export default function WebcamGrid({
  cams, labels,
}: {
  cams: WebcamCard[];
  labels: {
    all: string; beach: string; mountain: string; city: string; village: string;
    watchLive: string; snapshot: string; seaTemp: string; none: string; live: string;
  };
}) {
  const [cat, setCat] = useState<Cat>('all');

  const cats: Cat[] = ['all', 'beach', 'mountain', 'city', 'village'];
  const shown = useMemo(() => cams.filter((c) => cat === 'all' || c.category === cat), [cams, cat]);

  return (
    <div>
      <style>{`
        .wc-filters{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px}
        .wc-filters button{font:600 12px/1 var(--font-jost,system-ui,sans-serif);text-transform:uppercase;letter-spacing:.08em;padding:8px 14px;border-radius:999px;border:1px solid #d9cfb8;background:transparent;color:#5b5647;cursor:pointer}
        .wc-filters button.on{background:${GOLD};border-color:${GOLD};color:#0B0E11}
        .wc-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px}
        .wc-card{border:1px solid #e3d9c4;border-radius:8px;overflow:hidden;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,.05);display:flex;flex-direction:column}
        .wc-media{position:relative;aspect-ratio:16/9;background:#0B0E11;display:block;width:100%;border:0;padding:0}
        .wc-media.wc-link{cursor:pointer}
        .wc-media img{width:100%;height:100%;object-fit:cover;display:block;opacity:.92}
        .wc-media .ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#5b6470;font:600 13px var(--font-jost,system-ui,sans-serif);letter-spacing:.1em;text-transform:uppercase}
        .wc-badge{position:absolute;top:8px;left:8px;z-index:2;font:700 10px/1 var(--font-jost,system-ui,sans-serif);letter-spacing:.1em;padding:4px 8px;border-radius:999px;text-transform:uppercase;pointer-events:none}
        .wc-badge.live{background:#C0492E;color:#fff}
        .wc-badge.snap{background:rgba(11,14,17,.8);color:#e7e0d2}
        .wc-play{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
        .wc-play span{width:54px;height:54px;border-radius:50%;background:rgba(201,162,76,.92);color:#0B0E11;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 4px 16px rgba(0,0,0,.3)}
        .wc-temp{position:absolute;bottom:8px;right:8px;z-index:2;background:rgba(255,255,255,.92);border-radius:6px;padding:4px 8px;font:600 12px var(--font-jost,system-ui,sans-serif);color:#12181c;pointer-events:none}
        .wc-embed .wc-temp{top:8px;bottom:auto}
        .wc-body{padding:12px 14px 14px}
        .wc-body h3{margin:0;font-family:var(--disp,Georgia,serif);font-weight:600;font-size:17px;line-height:1.2;color:#12181c}
        .wc-meta{margin:3px 0 0;font-size:12px;color:#8a8371}
        .wc-tags{margin-top:8px;display:flex;flex-wrap:wrap;gap:5px}
        .wc-tags span{font-size:10px;letter-spacing:.06em;text-transform:uppercase;color:#8a5b12;border:1px solid #ecdfc2;border-radius:999px;padding:2px 7px}
        .wc-frame{position:absolute;inset:0;height:100%;width:100%;border:0;display:block;background:#0B0E11}
        .wc-none{padding:30px;color:#8a8371;text-align:center}
      `}</style>

      <div className="wc-filters">
        {cats.map((c) => (
          <button key={c} type="button" className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
            {labels[c]}
          </button>
        ))}
      </div>

      {shown.length === 0 ? <p className="wc-none">{labels.none}</p> : (
        <div className="wc-grid">
          {shown.map((c) => {
            const src = embedSrc(c);
            const isLive = c.provider !== 'snapshot';
            return (
              <div className="wc-card" key={c.slug}>
                {src ? (
                  // Embeddable cams (Windy/YouTube/iframe) render the live player DIRECTLY,
                  // so the camera is visible on load — no click needed, no click-away.
                  <div className="wc-media wc-embed">
                    <iframe className="wc-frame" src={src} title={c.name}
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen
                      loading="lazy" referrerPolicy="strict-origin-when-cross-origin" />
                    {c.category === 'beach' && c.seaTempC != null ? <span className="wc-temp">{labels.seaTemp} {Math.round(c.seaTempC)}°</span> : null}
                  </div>
                ) : (
                  // Non-embeddable cams (paralieslive beaches, Skyline, venue cams): open the
                  // source in a new tab. These stay links until we have embed permission.
                  <a className="wc-media wc-link" href={c.externalUrl || '#'} target="_blank" rel="noopener noreferrer" aria-label={`${labels.watchLive}: ${c.name}`}>
                    {c.thumbUrl ? <img src={c.thumbUrl} alt="" loading="lazy" /> : <span className="ph">{c.area || c.name}</span>}
                    <span className={`wc-badge ${isLive ? 'live' : 'snap'}`}>{isLive ? labels.live : labels.snapshot}</span>
                    <span className="wc-play"><span>↗</span></span>
                    {c.category === 'beach' && c.seaTempC != null ? <span className="wc-temp">{labels.seaTemp} {Math.round(c.seaTempC)}°</span> : null}
                  </a>
                )}
                <div className="wc-body">
                  <h3>{c.name}</h3>
                  <p className="wc-meta">{[c.area, c.district].filter(Boolean).join(' · ')}</p>
                  {c.tags.length ? (
                    <div className="wc-tags">{c.tags.slice(0, 3).map((t) => <span key={t}>{t}</span>)}</div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
