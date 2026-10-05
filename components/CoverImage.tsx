'use client';
// Optimised cover image (next/image): responsive srcset, AVIF/WebP, no layout shift.
// Fills a positioned parent (.ph / .hero / .article-hero).
//   fallbackKind="photo" (default) → on missing/broken src, fall back to a real
//     stock photo (used by editorial cover images).
//   fallbackKind="brand" → on missing/broken src, show a tasteful on-brand
//     placeholder instead of an unrelated stock photo (used across the directory,
//     so a listing without a real photo never shows a random forest).
//
// OWNED-IMAGE GATE ("Own the Data", Part A1): many bulk-imported directory rows
// carry an `image` that HOT-LINKS a third-party server (scraped). We must not
// embed those. So when fallbackKind="brand" we render the given src ONLY when it
// is a FIRST-PARTY ("owned") image (see isOwnedImage); otherwise we fall through
// to the branded placeholder. Editorial covers (fallbackKind="photo") are
// untouched. This is the ONE place the policy lives, so it is trivial to relax
// later (e.g. add an owned-CDN host) once images are migrated to owned storage.
import Image from 'next/image';
import { useState } from 'react';
// The owned-vs-hot-link policy lives in lib/images.ts now (shared with DirectoryMap,
// lib/seo and server code). Re-exported here so existing importers keep working.
import { isOwnedImage } from '@/lib/images';
import { imageMode } from '@/lib/imageVariants';
export { isOwnedImage };

export default function CoverImage({
  src, seed, alt = '', className, sizes = '100vw', priority = false, fallbackKind = 'photo',
}: {
  src: string | null; seed: string; alt?: string; className?: string; sizes?: string; priority?: boolean;
  fallbackKind?: 'photo' | 'brand';
}) {
  const stock = `https://picsum.photos/seed/${encodeURIComponent(seed || 'cyprus')}/1200/800`;
  // For directory listings (brand fallback) drop any src that isn't first-party,
  // so a hot-linked third-party URL yields the branded placeholder, not an embed.
  const vettedSrc = fallbackKind === 'brand' && !isOwnedImage(src) ? null : src;
  const [imgSrc, setImgSrc] = useState(vettedSrc || (fallbackKind === 'brand' ? '' : stock));
  const [brandFail, setBrandFail] = useState(false);
  // Pre-resized variants / Unsplash resize params (free, no Vercel optimiser - see lib/imageVariants.ts).
  // If the variant 404s we retry once with the untouched original before any fallback.
  const [useVariants, setUseVariants] = useState(true);

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

  const finalSrc = imgSrc || stock;
  const mode = useVariants ? imageMode(finalSrc) : 'plain';
  return (
    <Image
      src={finalSrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      unoptimized={mode === 'plain'}
      onError={() => {
        if (mode !== 'plain') { setUseVariants(false); return; }
        if (fallbackKind === 'brand') setBrandFail(true);
        else if (imgSrc !== stock) setImgSrc(stock);
      }}
    />
  );
}
