import type { MetadataRoute } from 'next';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';
import { urlFor } from '@/lib/seo';

export const revalidate = 3600;

const STATIC = ['/', '/property', '/culture', '/cyprus', '/business', '/escapes', '/table', '/world', '/about', '/advertise', '/contact', '/privacy'];

function entry(path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  return {
    url: urlFor(DEFAULT_LOCALE, path),
    lastModified: lastModified || new Date(),
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, urlFor(l, path)])) },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC.map((p) => entry(p));
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const { data } = await supabaseAdmin()
      .from('blog_posts')
      .select('slug, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(2000);
    for (const r of (data || []) as { slug: string; published_at: string | null }[]) {
      entries.push(entry(`/article/${r.slug}`, r.published_at ? new Date(r.published_at) : undefined));
    }
  } catch {
    /* a sitemap of the static routes is still valid without the article list */
  }
  return entries;
}
