// Vercel Cron → auto-post newly published articles to social, in each article's
// SOURCE language (the language it was written in) — so a Greek-desk piece posts in
// Greek, a German piece in German, not always English. Falls back to EN if the source
// edition is thin. One post per article per platform (single accounts), so no spam;
// posting every edition would need per-language accounts (an ops decision).
// Skips articles already on facebook, and skip_facebook=true.
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { publishToPlatforms, type Platform, type PostForSocial } from '@/lib/social';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap; raise to 300 on Vercel Pro

const ALL: Platform[] = ['facebook', 'instagram', 'x', 'linkedin'];

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const LANGS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'] as const;
  const cols = ['id', 'slug', 'cover_image', 'source_lang',
    ...LANGS.map((l) => `title_${l}`), ...LANGS.map((l) => `excerpt_${l}`)].join(', ');
  const { data: posts } = await sb.from('blog_posts')
    .select(cols)
    .eq('status', 'published').eq('skip_facebook', false)
    .gte('published_at', since).order('published_at', { ascending: false }).limit(10);

  const list = (posts || []) as unknown as Record<string, string | null>[];
  let posted = 0;
  const done: string[] = [];
  for (const p of list) {
    const { data: already } = await sb.from('social_posts').select('id').eq('article_id', p.id as string).eq('platform', 'facebook').limit(1);
    if (already && already.length) continue;
    // Post in the article's source language, falling back to EN if that edition is thin.
    const src = typeof p.source_lang === 'string' && (LANGS as readonly string[]).includes(p.source_lang) ? p.source_lang : 'en';
    const locale = (p[`title_${src}`] ? src : 'en') as PostForSocial['locale'];
    const post: PostForSocial = {
      id: String(p.id), slug: String(p.slug), cover_image: p.cover_image ?? null, locale,
      title: String(p[`title_${locale}`] || p.title_en || ''), excerpt: String(p[`excerpt_${locale}`] || p.excerpt_en || ''),
    };
    await publishToPlatforms(sb, post, ALL);
    posted++; done.push(post.slug);
    if (posted >= 5) break;
  }
  return NextResponse.json({ ok: true, posted, slugs: done });
}
