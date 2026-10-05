// next/image custom loader (wired in next.config.mjs via `images.loaderFile`).
// Replaces the Vercel optimiser (/_next/image) entirely - nothing here is metered by
// Vercel. See lib/imageVariants.ts for the rules. Must stay a tiny, pure, isomorphic module.
import { urlForWidth } from '@/lib/imageVariants';

export default function imageLoader({ src, width, quality }: { src: string; width: number; quality?: number }): string {
  return urlForWidth(src, width, quality);
}
