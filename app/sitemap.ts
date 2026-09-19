import type { MetadataRoute } from 'next';
import { LOCALES, DEFAULT_LOCALE } from '@/lib/locales';
import { urlFor } from '@/lib/seo';

export const revalidate = 3600;

const STATIC = ['/', '/property', '/relocation', '/culture', '/cyprus', '/business', '/escapes', '/table', '/agenda', '/people', '/world', '/directory', '/luxury', '/ask', '/guide', '/when-to-visit', '/membership', '/about', '/advertise', '/contact', '/standards', '/privacy'];
const DIRECTORY_TYPES = ['restaurant', 'winery', 'development', 'hotel', 'beach', 'vendor'];

function entry(path: string, lastModified?: Date): MetadataRoute.Sitemap[number] {
  return {
    url: urlFor(DEFAULT_LOCALE, path),
    lastModified: lastModified || new Date(),
    alternates: { languages: Object.fromEntries(LOCALES.map((l) => [l, urlFor(l, path)])) },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = STATIC.map((p) => entry(p));
  entries.push(...DIRECTORY_TYPES.map((tp) => entry(`/directory/${tp}`)));
  // Practical guide pages (one per knowledge-base intent) — static, no DB needed.
  const { ALL_INTENTS, guideHref } = await import('@/lib/knowledge/qa');
  for (const h of ALL_INTENTS) entries.push(entry(guideHref(h.item.id)));
  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    const sb = supabaseAdmin();
    const [{ data: posts }, { data: listings }] = await Promise.all([
      sb.from('blog_posts').select('slug, published_at').eq('status', 'published')
        .order('published_at', { ascending: false }).limit(2000),
      sb.from('directory_listings').select('slug, type, updated_at').eq('status', 'published').limit(2000),
    ]);
    for (const r of (posts || []) as { slug: string; published_at: string | null }[]) {
      entries.push(entry(`/article/${r.slug}`, r.published_at ? new Date(r.published_at) : undefined));
    }
    for (const r of (listings || []) as { slug: string; type: string; updated_at: string | null }[]) {
      entries.push(entry(`/directory/${r.type}/${r.slug}`, r.updated_at ? new Date(r.updated_at) : undefined));
    }
    // Programmatic collection guides ("best restaurants in Paphos", …).
    const { getCollectionFacets, getGroupCounts } = await import('@/lib/queries');
    for (const f of await getCollectionFacets()) {
      entries.push(entry(`/best/${f.slug}`));
    }
    // Category-group hubs (the 12-group taxonomy).
    const { GROUP_KEYS } = await import('@/lib/taxonomy');
    const gc = await getGroupCounts();
    for (const g of GROUP_KEYS) if ((gc[g] || 0) > 0) entries.push(entry(`/directory/g/${g}`));
  } catch {
    /* a sitemap of the static routes is still valid without the dynamic lists */
  }
  return entries;
}
