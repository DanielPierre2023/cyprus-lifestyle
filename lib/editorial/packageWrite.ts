// lib/editorial/packageWrite.ts
// ============================================================================
// Server-only glue between the SEO package (lib/editorial/seo.ts) and the
// per-language blog_posts columns. Used by the draft routes, the translate route
// and the on-demand /package route so the read/write shape lives in one place.
// ============================================================================
import 'server-only';
import type { PackageFields } from '@/lib/editorial/seo';
import type { PackageInput } from '@/lib/editorial/generate';

/** The blog_posts UPDATE fragment that stores a package for one edition. Only fields that have a value are written, so a partial result
 *  never wipes what is already stored (and never writes a blank over a good field). */
export function packageColumns(locale: string, pkg: PackageFields): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (pkg.seoTitle) out[`seo_title_${locale}`] = pkg.seoTitle;
  if (pkg.seoDescription) out[`seo_description_${locale}`] = pkg.seoDescription;
  if (pkg.excerpt) out[`excerpt_${locale}`] = pkg.excerpt;
  if (pkg.summary) out[`summary_${locale}`] = pkg.summary;
  if (pkg.tags.length) out[`tags_${locale}`] = pkg.tags;
  if (pkg.faq.length) out[`faq_${locale}`] = pkg.faq;
  return out;
}

/** Read a stored package for one edition back out of a blog_posts row. */
export function packageFromPiece(p: Record<string, unknown>, locale: string): PackageFields {
  const s = (k: string) => (typeof p[k] === 'string' ? (p[k] as string).trim() : '');
  const arr = (k: string) => (Array.isArray(p[k]) ? (p[k] as unknown[]) : []);
  return {
    seoTitle: s(`seo_title_${locale}`),
    seoDescription: s(`seo_description_${locale}`),
    excerpt: s(`excerpt_${locale}`),
    summary: s(`summary_${locale}`),
    tags: arr(`tags_${locale}`).map(String).filter(Boolean),
    faq: arr(`faq_${locale}`)
      .map((x) => (x && typeof x === 'object' ? x as Record<string, unknown> : {}))
      .map((o) => ({ q: String(o.q ?? '').trim(), a: String(o.a ?? '').trim() }))
      .filter((f) => f.q && f.a),
  };
}

/** True when a stored package is essentially empty (needs generating). */
export function packageIsEmpty(pkg: PackageFields): boolean {
  return !pkg.seoTitle && !pkg.seoDescription && !pkg.excerpt && !pkg.summary && pkg.tags.length === 0;
}

/** Build the model input for (re)generating a piece's package in a given edition. */
export function pieceToPackageInput(p: Record<string, unknown>, locale: string, body?: string): PackageInput {
  const s = (k: string) => (typeof p[k] === 'string' ? (p[k] as string).trim() : '');
  return {
    title: s(`title_${locale}`) || s('title_en'),
    body: body ?? (s(`content_${locale}`) || s('content_en')),
    locale,
    category: s('category') || s('subcategory') || null,
    place: s('county') || null,
    franchise: s('franchise') || null,
    kind: s('kind') || null,
  };
}
