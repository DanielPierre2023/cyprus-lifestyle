// lib/imageVariants.ts — image strategy for Vercel HOBBY + Supabase FREE (Phase 6.1). PURE.
//
// Why not the Vercel optimiser: Hobby includes only 5,000 image transformations / month
// (every distinct image x width x format counts; over the limit new images return HTTP 402).
// ~3k pages x covers x 7 locales blows through that in days. Supabase's own transform
// endpoint is Pro-only. So the site pays neither: variants are PRE-RESIZED once with
// `sharp` (already a dependency) and stored as ordinary Storage objects, and a custom
// next/image loader just picks the right pre-made file. Plain static files = free CDN hits.
//
//   original : <host>/storage/v1/object/public/<bucket>/<path>.<ext>
//   variant  : <host>/storage/v1/object/public/<bucket>/_v/<path>-<w>.webp      (w in LADDER)
//
// Safe by default: variants are used only when NEXT_PUBLIC_IMAGE_VARIANTS=1 (set it AFTER
// the backfill has run). Until then Supabase images load exactly as they do today.
export const LADDER = [480, 960, 1440] as const;
export const VARIANT_DIR = '_v';
export const VARIANT_QUALITY = 74;

const PUBLIC_MARK = '/storage/v1/object/public/';

export type ImageMode = 'variant' | 'unsplash' | 'picsum' | 'plain';

/** Smallest ladder step >= the requested width (capped at the largest). */
export function pickWidth(w: number): number {
  for (const s of LADDER) if (w <= s) return s;
  return LADDER[LADDER.length - 1];
}

function parse(src: string): URL | null {
  try { return new URL(src); } catch { return null; }
}

/** Split a public Storage URL into host + bucket + object path. */
export function splitStorageUrl(src: string): { origin: string; bucket: string; path: string } | null {
  const u = parse(src);
  if (!u) return null;
  const i = u.pathname.indexOf(PUBLIC_MARK);
  if (i < 0) return null;
  const rest = u.pathname.slice(i + PUBLIC_MARK.length);
  const slash = rest.indexOf('/');
  if (slash <= 0) return null;
  return { origin: u.origin, bucket: rest.slice(0, slash), path: rest.slice(slash + 1) };
}

export function isVariantPath(path: string): boolean {
  return path.startsWith(`${VARIANT_DIR}/`);
}

/** Object path of the variant of `path` at width `w` (`a/b.png` -> `_v/a/b-960.webp`). */
export function variantPath(path: string, w: number): string {
  const noExt = path.replace(/\.[a-z0-9]{2,5}$/i, '');
  return `${VARIANT_DIR}/${noExt}-${w}.webp`;
}

/** Only raster formats sharp can resize (never SVG/GIF animations). */
export function isRasterPath(path: string): boolean {
  return /\.(jpe?g|png|webp|avif)$/i.test(path);
}

export function variantsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.NEXT_PUBLIC_IMAGE_VARIANTS === '1';
}

/** How should this image be delivered? */
export function imageMode(src: string, enabled: boolean = variantsEnabled()): ImageMode {
  const u = parse(src);
  if (!u) return 'plain';
  if (u.hostname === 'images.unsplash.com') return 'unsplash';
  if (u.hostname === 'picsum.photos') return /^\/seed\/[^/]+\/\d+\/\d+/.test(u.pathname) ? 'picsum' : 'plain';
  if (enabled) {
    const s = splitStorageUrl(src);
    if (s && !isVariantPath(s.path) && isRasterPath(s.path)) return 'variant';
  }
  return 'plain';
}

/** URL for `src` at (about) `width` px. Returns `src` untouched whenever no variant applies. */
export function urlForWidth(src: string, width: number, quality = VARIANT_QUALITY, enabled: boolean = variantsEnabled()): string {
  const mode = imageMode(src, enabled);
  if (mode === 'variant') {
    const s = splitStorageUrl(src)!;
    return `${s.origin}${PUBLIC_MARK}${s.bucket}/${variantPath(s.path, pickWidth(width))}`;
  }
  if (mode === 'unsplash') {
    // Unsplash is imgix: resize + modern format on THEIR CDN, free, no Vercel quota.
    const u = new URL(src);
    u.searchParams.set('w', String(pickWidth(width)));
    u.searchParams.set('q', String(Math.min(85, Math.max(40, quality))));
    u.searchParams.set('auto', 'format');
    u.searchParams.set('fit', 'max');
    return u.toString();
  }
  if (mode === 'picsum') {
    // picsum placeholder covers: /seed/<s>/<w>/<h> - keep the aspect ratio, shrink the size.
    const u = new URL(src);
    const m = u.pathname.match(/^(\/seed\/[^/]+)\/(\d+)\/(\d+)/)!;
    const w = Math.min(pickWidth(width), Number(m[2]));
    const h = Math.max(1, Math.round((w * Number(m[3])) / Number(m[2])));
    u.pathname = `${m[1]}/${w}/${h}`;
    return u.toString();
  }
  return src;
}
