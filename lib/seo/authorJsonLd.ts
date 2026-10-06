// lib/seo/authorJsonLd.ts
// ---------------------------------------------------------------------------
// schema.org JSON-LD for an author profile page (/author/[slug]). Pure.
//
// Uses ONLY what the `authors` table holds: the display name, the job title, the bio and,
// when present, the X profile. Nothing is invented. A named person (no editor_key) becomes a
// Person; a desk (editor_key set, e.g. "The Cyprus Desk") stays an Organization that belongs
// to the publisher. Articles already reference a named author as a Person with the same
// `url` (lib/seo.ts articleJsonLd), so this page is what that URL resolves to.
import { urlFor, SITE_URL } from '@/lib/seo';
import type { Locale } from '@/lib/locales';

export interface AuthorLdInput {
  locale: Locale;
  slug: string;
  name: string;
  title?: string | null;     // authors.title_<locale>, e.g. "Culture & Society Editor"
  bio?: string | null;       // authors.bio_<locale>
  editorKey?: string | null; // authors.editor_key: set for the house desks, null for people
  socialX?: string | null;   // authors.social_x: "@handle", "handle" or a full URL
}

function xProfile(v: string | null | undefined): string | null {
  const s = String(v || '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  const handle = s.replace(/^@/, '');
  return /^[A-Za-z0-9_]{1,15}$/.test(handle) ? `https://x.com/${handle}` : null;
}

export function authorJsonLd(a: AuthorLdInput): Record<string, unknown> {
  const url = urlFor(a.locale, `/author/${a.slug}`);
  const description = (a.bio || a.title || '').trim() || undefined;
  if (a.editorKey) {
    return {
      '@context': 'https://schema.org', '@type': 'Organization',
      name: a.name, description, url,
      parentOrganization: { '@id': `${SITE_URL}/#organization` },
    };
  }
  const x = xProfile(a.socialX);
  return {
    '@context': 'https://schema.org', '@type': 'Person',
    '@id': `${url}#person`,
    name: a.name,
    url,
    jobTitle: a.title?.trim() || undefined,
    description,
    worksFor: { '@id': `${SITE_URL}/#organization` },
    sameAs: x ? [x] : undefined,
  };
}
