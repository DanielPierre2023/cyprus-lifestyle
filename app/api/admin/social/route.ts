// Admin: publish an article to social channels now.
// Body: { post_id, platforms: ['facebook','instagram','x','linkedin'], locale? }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { publishToPlatforms, type Platform, type PostForSocial } from '@/lib/social';
import { isLocale, type Locale } from '@/lib/locales';

export const runtime = 'nodejs';
export const maxDuration = 120;

const ALL: Platform[] = ['facebook', 'instagram', 'x', 'linkedin'];

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.post_id || '');
  const locale: Locale = isLocale(String(body.locale)) ? body.locale : 'en';
  const platforms: Platform[] = Array.isArray(body.platforms) ? body.platforms.filter((p: string) => ALL.includes(p as Platform)) : ALL;
  if (!id) return NextResponse.json({ ok: false, error: 'post_id required' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data } = await sb.from('blog_posts')
    .select(`id, slug, cover_image, title_${locale}, excerpt_${locale}, title_en, excerpt_en`)
    .eq('id', id).single();
  if (!data) return NextResponse.json({ ok: false, error: 'post not found' }, { status: 404 });
  const r = data as Record<string, string | null>;
  const post: PostForSocial = {
    id: String(r.id), slug: String(r.slug), cover_image: r.cover_image ?? null, locale,
    title: String(r[`title_${locale}`] || r.title_en || ''),
    excerpt: String(r[`excerpt_${locale}`] || r.excerpt_en || ''),
  };
  const results = await publishToPlatforms(sb, post, platforms);
  return NextResponse.json({ ok: true, results });
}
