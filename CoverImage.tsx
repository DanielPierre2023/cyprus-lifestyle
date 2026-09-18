'use client';
// Optimised cover image (next/image): responsive srcset, AVIF/WebP, no layout shift.
// Fills a positioned parent (.ph / .hero / .article-hero).
//   fallbackKind="photo" (default) → on missing/broken src, fall back to a real
//     stock photo (used by editorial cover images).
//   fallbackKind="brand" → on missing/broken src, show a tasteful on-brand
//     placeholder instead of an unrelated stock photo (used across the directory,
//     so a listing without a real photo never shows a random forest).
import Image from 'next/image';
import { useState } from 'react';

export default function CoverImage({
  src, seed, alt = '', className, sizes = '100vw', priority = false, fallbackKind = 'photo',
}: {
  src: string | null; seed: string; alt?: string; className?: string; sizes?: string; priority?: boolean;
  fallbackKind?: 'photo' | 'brand';
}) {
  const stock = `https://picsum.photos/seed/${encodeURIComponent(seed || 'cyprus')}/1200/800`;
  const [imgSrc, setImgSrc] = useState(src || (fallbackKind === 'brand' ? '' : stock));
  const [brandFail, setBrandFail] = useState(false);

  if (fallbackKind === 'brand' && (!imgSrc || brandFail)) {
    return (
      <span role="img" aria-label={alt} style={{
        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'radial-gradient(120% 120% at 30% 20%, #17323a, #0B0E11 70%)',
      }}>
        <span style={{ color: 'rgba(201,162,76,.55)', fontSize: 'clamp(22px,5vw,40px)', lineHeight: 1 }}>◆</span>
      </span>
    );
  }

  return (
    <Image
      src={imgSrc || stock}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => {
        if (fallbackKind === 'brand') setBrandFail(true);
        else if (imgSrc !== stock) setImgSrc(stock);
      }}
    />
  );
}
