'use client';
import { useEffect, useRef } from 'react';
import type { Banner } from '@/lib/queries';

export default function SponsorBanner({ banner }: { banner: Banner }) {
  const seen = useRef(false);
  useEffect(() => {
    if (seen.current) return;
    seen.current = true;
    fetch('/api/banners/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: banner.id, type: 'impression' }) }).catch(() => {});
  }, [banner.id]);

  function click() {
    fetch('/api/banners/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: banner.id, type: 'click' }) }).catch(() => {});
  }

  return (
    <a className="sponsor" href={banner.url} onClick={click} target="_blank" rel="noopener sponsored"
       style={{ background: banner.bg_color, color: '#F4EFE6', textDecoration: 'none', borderColor: banner.accent_color }}>
      {banner.image_url ? <img src={banner.image_url} alt="" width={96} height={96} style={{ objectFit: 'cover' }} /> : null}
      <span>
        <span className="tag" style={{ color: banner.accent_color }}>Advertisement · {banner.advertiser_name}</span>
        <strong style={{ display: 'block', fontFamily: 'var(--disp)', fontSize: 18, margin: '4px 0' }}>{banner.headline}</strong>
        <span style={{ fontSize: 14, opacity: 0.85 }}>{banner.body}</span>
        <span style={{ display: 'block', marginTop: 6, color: banner.accent_color, fontWeight: 700 }}>{banner.cta}</span>
      </span>
    </a>
  );
}
