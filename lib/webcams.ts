import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Locale } from '@/lib/locales';

export type WebcamProvider = 'youtube' | 'windy' | 'iframe' | 'link' | 'snapshot';
export type WebcamCategory = 'beach' | 'mountain' | 'city' | 'village';

export interface Webcam {
  slug: string;
  name: string;
  provider: WebcamProvider;
  embedRef: string | null;
  externalUrl: string | null;
  thumbUrl: string | null;
  lat: number | null;
  lng: number | null;
  district: string | null;
  area: string | null;
  category: WebcamCategory;
  tags: string[];
  listingSlug: string | null;
}

const NAME_COL = (l: Locale) => `name_${l}` as const;

// Public read of the published cam registry, ordered for display. Uses the
// service-role client like the other public queries; RLS still only exposes
// published rows to anon, this is just the server-side read path.
export async function getPublishedWebcams(locale: Locale): Promise<Webcam[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from('webcams')
    .select(`slug, provider, embed_ref, external_url, thumb_url, lat, lng, district, area, category, tags, ${NAME_COL(locale)}, name_en, directory_listings(slug)`)
    .eq('status', 'published')
    .order('sort', { ascending: true });
  if (error || !data) return [];

  return (data as unknown as Record<string, unknown>[]).map((r) => {
    const listing = r.directory_listings as { slug?: string } | { slug?: string }[] | null;
    const listingSlug = Array.isArray(listing) ? (listing[0]?.slug ?? null) : (listing?.slug ?? null);
    return {
      slug: String(r.slug),
      name: String(r[NAME_COL(locale)] || r.name_en || r.slug),
      provider: (r.provider as WebcamProvider) || 'link',
      embedRef: (r.embed_ref as string) ?? null,
      externalUrl: (r.external_url as string) ?? null,
      thumbUrl: (r.thumb_url as string) ?? null,
      lat: (r.lat as number) ?? null,
      lng: (r.lng as number) ?? null,
      district: (r.district as string) ?? null,
      area: (r.area as string) ?? null,
      category: (r.category as WebcamCategory) || 'beach',
      tags: (r.tags as string[]) ?? [],
      listingSlug,
    } satisfies Webcam;
  });
}
