// lib/seo/translationGate.ts — decide which editions of a DB-backed page really have a
// translation, so empty/English-copy editions get NO hreflang and a noindex (thin-duplicate
// SEO risk, CTO review 2.5). Pure, no I/O. NOT yet wired into pages (see docs/I18N.md for the
// exact call sites); lib/seo.ts `pageMetadata({ robots })` and the sitemap `urlXml` are the
// existing places that will consume it.
import { LOCALES, DEFAULT_LOCALE, type Locale } from '@/lib/locales';
import { urlFor } from '@/lib/seo';

type Row = Record<string, unknown>;
const txt = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/**
 * Editions with a REAL translation of every required field: `<field>_<locale>` is non-empty
 * and not a verbatim copy of the English text (the import jobs copy English into the
 * other columns as a fallback). English is always available.
 */
export function translatedLocales(row: Row, fields: string[], opts: { allowIdentical?: string[] } = {}): Locale[] {
  const out: Locale[] = [DEFAULT_LOCALE];
  for (const l of LOCALES) {
    if (l === DEFAULT_LOCALE) continue;
    const ok = fields.every((f) => {
      const v = txt(row[`${f}_${l}`]);
      if (!v) return false;
      // Proper nouns (a venue name) are legitimately identical; callers list such fields.
      return opts.allowIdentical?.includes(f) ? true : v !== txt(row[`${f}_${DEFAULT_LOCALE}`]);
    });
    if (ok) out.push(l);
  }
  return out;
}

/** Metadata `alternates` limited to the available editions (+ x-default). */
export function alternatesForAvailable(locale: Locale, path: string, available: Locale[]) {
  const languages: Record<string, string> = {};
  for (const l of LOCALES) if (available.includes(l)) languages[l] = urlFor(l, path);
  languages['x-default'] = urlFor(DEFAULT_LOCALE, path);
  // A non-available edition canonicalises to the English page so it never competes with it.
  const self: Locale = available.includes(locale) ? locale : DEFAULT_LOCALE;
  return { canonical: urlFor(self, path), languages };
}

/** `robots` for pageMetadata: noindex,follow when this edition has no real translation. */
export function robotsForTranslation(locale: Locale, available: Locale[]): { index: boolean; follow: boolean } | undefined {
  return available.includes(locale) ? undefined : { index: false, follow: true };
}

/** Editions to list as sitemap alternates for a row (use instead of LOCALES in urlXml). */
export function sitemapLocales(available: Locale[]): Locale[] {
  return LOCALES.filter((l) => available.includes(l));
}
