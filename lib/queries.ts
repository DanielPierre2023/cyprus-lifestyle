// Cyprus Lifestyle — read helpers for the public site. Reads only PUBLISHED
// posts, projecting the fields for the active locale (falling back to English).
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Locale } from '@/lib/locales';

export interface Card {
  id: string; slug: string; title: string; excerpt: string; category: string | null;
  cover_image: string | null; cover_image_credit: string | null; author_name: string | null;
  author_slug: string | null;
  published_at: string | null; reading_time_min: number | null;
}
export interface Article extends Card {
  content: string; summary: string; tags: string[]; county: string | null;
  seo_title: string; seo_description: string; source_url: string | null; updated_at: string | null;
}

function pick(r: Record<string, unknown>, base: string, locale: Locale): string {
  return String(r[`${base}_${locale}`] || r[`${base}_en`] || '');
}

const CARD_COLS = (l: Locale) =>
  `id, slug, category, cover_image, cover_image_credit, author_name, published_at, reading_time_min, title_${l}, title_en, excerpt_${l}, excerpt_en, author:authors(slug)`;

function toCard(r: Record<string, unknown>, l: Locale): Card {
  return {
    id: String(r.id), slug: String(r.slug), category: (r.category as string) ?? null,
    cover_image: (r.cover_image as string) ?? null, cover_image_credit: (r.cover_image_credit as string) ?? null,
    author_name: (r.author_name as string) ?? null,
    author_slug: ((r.author as { slug?: string } | null)?.slug) ?? null,
    published_at: (r.published_at as string) ?? null,
    reading_time_min: (r.reading_time_min as number) ?? null,
    title: pick(r, 'title', l), excerpt: pick(r, 'excerpt', l),
  };
}

export async function getLatest(locale: Locale, limit = 9, offset = 0): Promise<Card[]> {
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published').order('published_at', { ascending: false }).range(offset, offset + limit - 1);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toCard(r, locale)).filter((c) => c.title);
}

export async function getFeatured(locale: Locale): Promise<Card | null> {
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published').eq('is_breaking', true).order('published_at', { ascending: false }).limit(1);
  const rows = (data || []) as unknown as Record<string, unknown>[];
  if (rows.length) return toCard(rows[0], locale);
  const latest = await getLatest(locale, 1);
  return latest[0] || null;
}

export async function getByCategory(locale: Locale, category: string, limit = 18): Promise<Card[]> {
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published').eq('category', category).order('published_at', { ascending: false }).limit(limit);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toCard(r, locale)).filter((c) => c.title);
}

export async function searchArticles(locale: Locale, q: string, limit = 24): Promise<Card[]> {
  const query = (q || '').trim();
  if (query.length < 2) return [];
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published')
    .textSearch('search_document', query, { type: 'websearch', config: 'simple' })
    .order('published_at', { ascending: false }).limit(limit);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toCard(r, locale)).filter((c) => c.title);
}

export async function getArticle(locale: Locale, slug: string): Promise<Article | null> {
  const l = locale;
  const cols = `id, slug, category, county, cover_image, cover_image_credit, author_name, published_at, updated_at, reading_time_min, source_url,
    title_${l}, title_en, excerpt_${l}, excerpt_en, summary_${l}, summary_en, content_${l}, content_en,
    seo_title_${l}, seo_title_en, seo_description_${l}, seo_description_en, tags_${l}, tags_en, author:authors(slug)`;
  const { data } = await supabaseAdmin().from('blog_posts').select(cols)
    .eq('status', 'published').eq('slug', slug).maybeSingle();
  if (!data) return null;
  const r = data as unknown as Record<string, unknown>;
  const tags = (r[`tags_${l}`] as string[]) || (r.tags_en as string[]) || [];
  return {
    ...toCard(r, l),
    county: (r.county as string) ?? null,
    content: pick(r, 'content', l),
    summary: pick(r, 'summary', l),
    seo_title: pick(r, 'seo_title', l) || pick(r, 'title', l),
    seo_description: pick(r, 'seo_description', l) || pick(r, 'excerpt', l),
    source_url: (r.source_url as string) ?? null,
    updated_at: (r.updated_at as string) ?? null,
    tags: Array.isArray(tags) ? tags : [],
  };
}

export interface Banner { id: string; advertiser_name: string; headline: string; body: string; cta: string; url: string; image_url: string | null; bg_color: string; accent_color: string }
export async function getBanner(locale: Locale, slot = 'sidebar-homepage'): Promise<Banner | null> {
  const l = locale;
  const { data } = await supabaseAdmin().from('sponsor_banners')
    .select(`id, advertiser_name, url, image_url, bg_color, accent_color, headline_${l}, headline_en, body_${l}, body_en, cta_${l}, cta_en`)
    .eq('slot', slot).eq('is_active', true).order('weight', { ascending: false }).limit(1);
  const rows = (data || []) as unknown as Record<string, unknown>[];
  if (!rows.length) return null;
  const r = rows[0];
  return {
    id: String(r.id), advertiser_name: String(r.advertiser_name || ''), url: String(r.url || '#'),
    image_url: (r.image_url as string) ?? null, bg_color: String(r.bg_color || '#0B0E11'), accent_color: String(r.accent_color || '#C9A24C'),
    headline: pick(r, 'headline', l), body: pick(r, 'body', l), cta: pick(r, 'cta', l),
  };
}

export interface Author {
  id: string; slug: string; name: string; title: string; bio: string; specialties: string[];
}

export async function getAuthor(locale: Locale, slug: string): Promise<Author | null> {
  const l = locale;
  const { data } = await supabaseAdmin().from('authors')
    .select(`id, slug, specialties, name_${l}, name_en, title_${l}, title_en, bio_${l}, bio_en`)
    .eq('slug', slug).eq('active', true).maybeSingle();
  if (!data) return null;
  const r = data as unknown as Record<string, unknown>;
  return {
    id: String(r.id), slug: String(r.slug),
    name: pick(r, 'name', l), title: pick(r, 'title', l), bio: pick(r, 'bio', l),
    specialties: Array.isArray(r.specialties) ? (r.specialties as string[]) : [],
  };
}

export async function getByAuthor(locale: Locale, authorId: string, limit = 24): Promise<Card[]> {
  const { data } = await supabaseAdmin().from('blog_posts').select(CARD_COLS(locale))
    .eq('status', 'published').eq('author_id', authorId).order('published_at', { ascending: false }).limit(limit);
  return ((data || []) as unknown as Record<string, unknown>[]).map((r) => toCard(r, locale)).filter((c) => c.title);
}
