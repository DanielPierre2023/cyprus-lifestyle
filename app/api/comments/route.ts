// Public comments. POST { post_id, author_name, content } → pending (needs approval).
// GET ?post_id=... → approved comments for an article.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { localeOf } from '@/lib/i18n/resolveLocale';
import { errorBody, codedError } from '@/lib/i18n/apiErrors';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('post_id') || '';
  if (!postId) return NextResponse.json(errorBody('post_required', localeOf(req)), { status: 400 });
  const { data } = await supabaseAdmin().from('comments')
    .select('id, author_name, content, created_at')
    .eq('post_id', postId).eq('is_approved', true).order('created_at', { ascending: false });
  return NextResponse.json({ ok: true, comments: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (isHoneypot(body)) return NextResponse.json({ ok: true, pending: true }); // silently drop bots
  if (!(await rateLimit(req, 'comments'))) {
    return NextResponse.json(errorBody('rate_limited', localeOf(req, body.locale)), { status: 429 });
  }
  const post_id = String(body.post_id || '');
  const author_name = String(body.author_name || '').trim().slice(0, 80);
  const content = String(body.content || '').trim().slice(0, 4000);
  if (!post_id || !author_name || !content) {
    return NextResponse.json(errorBody('comment_fields_required', localeOf(req, body.locale)), { status: 400 });
  }
  const { error } = await supabaseAdmin().from('comments').insert({ post_id, author_name, content, is_approved: false });
  if (error) return NextResponse.json(codedError('save_failed', error.message), { status: 400 });
  return NextResponse.json({ ok: true, pending: true });
}
