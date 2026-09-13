'use client';
// Optimised cover image (next/image): responsive srcset, AVIF/WebP, no layout shift.
// Fills a positioned parent (.ph / .hero / .article-hero). If the given URL fails
// to load, it falls back to a real photo so the layout never shows a broken icon.
import Image from 'next/image';
import { useState } from 'react';

export default function CoverImage({
  src, seed, alt = '', className, sizes = '100vw', priority = false,
}: {
  src: string | null; seed: string; alt?: string; className?: string; sizes?: string; priority?: boolean;
}) {
  const fallback = `https://picsum.photos/seed/${encodeURIComponent(seed || 'cyprus')}/1200/800`;
  const [imgSrc, setImgSrc] = useState(src || fallback);
  return (
    <Image
      src={imgSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => { if (imgSrc !== fallback) setImgSrc(fallback); }}
    />
  );
}
