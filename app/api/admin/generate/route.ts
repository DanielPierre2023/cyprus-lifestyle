// Admin "Rewrite now" / "Generate" — process a specific scraped article into a
// 4-language draft immediately (bypasses the queue's automation switch).
// Body: { scraped_article_id, auto_publish? }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { processScrapedArticle, type ScrapedRow } from '@/lib/desk/pipeline';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap; raise to 300 on Vercel Pro

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.scraped_article_id || '');
  if (!id) return NextResponse.json({ ok: false, error: 'scraped_article_id required' }, { status: 400 });

  const sb = supabaseAdmin();
  const { data, error } = await sb.from('scraped_articles')
    .select('id, original_title, original_content, original_content_full, category, county, original_url, cover_image')
    .eq('id', id).single();
  if (error || !data) return NextResponse.json({ ok: false, error: 'scraped article not found' }, { status: 404 });

  const out = await processScrapedArticle(sb, data as ScrapedRow, !!body.auto_publish);
  if (out.ok) await sb.from('scraped_articles').update({ is_used: true }).eq('id', id);
  return NextResponse.json(out, { status: out.ok ? 200 : 502 });
}
