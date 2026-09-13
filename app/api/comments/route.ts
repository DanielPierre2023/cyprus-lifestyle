// Public comments. POST { post_id, author_name, content } → pending (needs approval).
// GET ?post_id=... → approved comments for an article.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const postId = req.nextUrl.searchParams.get('post_id') || '';
  if (!postId) return NextResponse.json({ ok: false, error: 'post_id required' }, { status: 400 });
  const { data } = await supabaseAdmin().from('comments')
    .select('id, author_name, content, created_at')
    .eq('post_id', postId).eq('is_approved', true).order('created_at', { ascending: false });
  return NextResponse.json({ ok: true, comments: data || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const post_id = String(body.post_id || '');
  const author_name = String(body.author_name || '').trim().slice(0, 80);
  const content = String(body.content || '').trim().slice(0, 4000);
  if (!post_id || !author_name || !content) {
    return NextResponse.json({ ok: false, error: 'post_id, author_name and content are required' }, { status: 400 });
  }
  const { error } = await supabaseAdmin().from('comments').insert({ post_id, author_name, content, is_approved: false });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, pending: true });
}
