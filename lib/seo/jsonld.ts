// lib/seo/jsonld.ts
// ---------------------------------------------------------------------------
// JSON-LD builders + a tiny <JsonLd> server component.
//
// The canonical schema logic already lives in `@/lib/seo` (listingJsonLd,
// articleJsonLd, faqJsonLd, breadcrumbJsonLd, …). This module is a thin,
// additive facade that exposes those builders under the short names the pages
// use, plus one genuine enhancement (LocalBusiness `telephone`, which the base
// builder omits) and the <JsonLd> renderer that safely stringifies + injects
// the object. Nothing here re-implements schema shapes — it delegates, so the
// two files can never drift.
//
// This file is written with React.createElement (no JSX) so it can keep the
// requested `.ts` extension while still exporting a usable server component.
import { createElement } from 'react';
import {
  listingJsonLd,
  articleJsonLd,
  faqJsonLd,
  breadcrumbJsonLd,
  ld,
} from '@/lib/seo';

// Re-export the base builders under the short, page-facing names.
/** @type Article / NewsArticle JSON-LD for an editorial post. */
export const article = articleJsonLd;
/** FAQPage JSON-LD. items: [{ q, a }]. */
export const faqPage = faqJsonLd;
/** BreadcrumbList JSON-LD. `breadcrumb(locale, [{ name, path }])` in order. */
export const breadcrumb = breadcrumbJsonLd;

type ListingArg = Parameters<typeof listingJsonLd>[0] & {
  phone?: string | null;
  telephone?: string | null;
};

/**
 * LocalBusiness (or a more specific subtype picked from the listing category)
 * JSON-LD. Delegates to the base `listingJsonLd` builder and adds `telephone`
 * when a phone number is present (the base builder does not emit it).
 */
export function localBusiness(a: ListingArg): Record<string, unknown> {
  const base = listingJsonLd(a) as Record<string, unknown>;
  const tel = a.telephone ?? a.phone ?? null;
  return tel ? { ...base, telephone: tel } : base;
}

/**
 * Server component: renders a <script type="application/ld+json"> with the
 * given object, escaped via `ld()` (which neutralises `<` to prevent the
 * closing-tag / injection break-out).
 */
export function JsonLd({ data }: { data: unknown }) {
  return createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: ld(data) },
  });
}
