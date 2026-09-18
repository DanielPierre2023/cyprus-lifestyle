'use client';
// "Recently viewed" strip — reads the per-browser history written by TrackView.
// Renders only after hydration and only if there's history, so it never shows an
// empty shell and never blocks SSR/caching. Not SEO content by design.
import { useEffect, useState } from 'react';
import { Link } from '@/lib/i18n/routing';
import CoverImage from '@/components/CoverImage';
import { RECENT_KEY, type RecentItem } from '@/components/TrackView';

export default function RecentlyViewed({ title, excludeSlug }: { title: string; excludeSlug?: string }) {
  const [items, setItems] = useState<RecentItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const list: RecentItem[] = raw ? JSON.parse(raw) : [];
      setItems(list.filter((x) => x && x.slug && x.slug !== excludeSlug).slice(0, 10));
    } catch { /* storage blocked — show nothing */ }
  }, [excludeSlug]);

  if (!items.length) return null;

  return (
    <div className="rv">
      <h2 className="rv-t">{title}</h2>
      <div className="rv-row">
        {items.map((x) => (
          <Link key={x.slug} href={`/directory/${x.type}/${x.slug}`} className="rv-card">
            <span className="rv-img">
              <CoverImage src={x.image} seed={x.slug} alt={x.name} className="ph-img" sizes="200px" fallbackKind="brand" />
            </span>
            <span className="rv-name">{x.name}</span>
            {x.district ? <span className="rv-cap">{x.district}</span> : null}
          </Link>
        ))}
      </div>
      <style>{`
        .rv{margin:0}
        .rv-t{font-family:var(--disp);font-weight:600;font-size:22px;margin:0 0 14px}
        .rv-row{display:flex;gap:14px;overflow-x:auto;padding-bottom:6px;scroll-snap-type:x mandatory}
        .rv-card{flex:0 0 200px;scroll-snap-align:start}
        .rv-img{position:relative;display:block;aspect-ratio:3/2;border-radius:6px;overflow:hidden;border:1px solid var(--line,#e0d6c1);background:linear-gradient(135deg,#1c2b33,#0B0E11)}
        .rv-img .ph-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
        .rv-name{display:block;font-family:var(--disp);font-size:17px;color:var(--ink,#171310);margin-top:8px;line-height:1.2}
        .rv-card:hover .rv-name{text-decoration:underline}
        .rv-cap{display:block;font-family:var(--sans);font-size:12px;text-transform:capitalize;color:var(--ink-soft,#5b5346);margin-top:2px}
      `}</style>
    </div>
  );
}
