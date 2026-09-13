// Vercel Cron → auto-post newly published articles to social (EN edition).
// Posts each article once (skips those already on facebook, and skip_facebook=true).
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
  const { data: posts } = await sb.from('blog_posts')
    .select('id, slug, cover_image, title_en, excerpt_en')
    .eq('status', 'published').eq('skip_facebook', false)
    .gte('published_at', since).order('published_at', { ascending: false }).limit(10);

  const list = (posts || []) as Record<string, string | null>[];
  let posted = 0;
  const done: string[] = [];
  for (const p of list) {
    const { data: already } = await sb.from('social_posts').select('id').eq('article_id', p.id as string).eq('platform', 'facebook').limit(1);
    if (already && already.length) continue;
    const post: PostForSocial = {
      id: String(p.id), slug: String(p.slug), cover_image: p.cover_image ?? null, locale: 'en',
      title: String(p.title_en || ''), excerpt: String(p.excerpt_en || ''),
    };
    await publishToPlatforms(sb, post, ALL);
    posted++; done.push(post.slug);
    if (posted >= 5) break;
  }
  return NextResponse.json({ ok: true, posted, slugs: done });
}
