'use client';
// Robust cover image: shows the given URL, and if it ever fails to load (a dead
// Unsplash link, a removed source image, etc.) it falls back to a real photo so
// the layout never shows a broken-image icon.
export default function CoverImage({
  src, seed, alt = '', className, style,
}: { src: string | null; seed: string; alt?: string; className?: string; style?: React.CSSProperties }) {
  const fallback = `https://picsum.photos/seed/${encodeURIComponent(seed || 'cyprus')}/1200/800`;
  return (
    <img
      src={src || fallback}
      alt={alt}
      loading="lazy"
      className={className}
      style={style}
      onError={(e) => {
        const t = e.currentTarget as HTMLImageElement & { dataset: DOMStringMap };
        if (!t.dataset.fb) { t.dataset.fb = '1'; t.src = fallback; }
      }}
    />
  );
}
