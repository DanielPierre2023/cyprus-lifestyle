// Admin "Generate now" — process one scraped article into a 4-language draft.
//
// The AI editorial desk now runs as the Supabase Edge Function
// `process-scraped-article` — that is where the model keys live (Supabase
// secrets) and where the runtime is long enough for four native compositions.
// The admin UI invokes that edge function DIRECTLY from the browser (see
// app/[locale]/admin/(panel)/ai/page.tsx), which is the reliable path.
//
// This route remains only as a server-side proxy for any non-browser caller.
// Note: Vercel's 60s function limit can cut a long run short here even though
// the edge function finishes on Supabase — prefer the direct browser invoke.
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const id = String(body.scraped_article_id || '');
  if (!id) return NextResponse.json({ ok: false, error: 'scraped_article_id required' }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Supabase env not configured' }, { status: 500 });

  try {
    const res = await fetch(`${url}/functions/v1/process-scraped-article`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ scraped_article_id: id, auto_publish: !!body.auto_publish }),
    });
    const data = await res.json().catch(() => ({ ok: false, error: 'bad response from edge function' }));
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
