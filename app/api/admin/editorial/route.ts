// Admin: generate an editorial piece (interview questions / write-up / review)
// via the ai-editorial edge function. isAdmin-gated; the service-role key (which
// authorises the edge function) stays server-side only. The edge function holds
// the model key already stored in Supabase — nothing to configure in Vercel.
//   POST { mode: 'questions'|'interview'|'review', business: {...}, transcript?, notes? }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'Server not configured' }, { status: 500 });

  try {
    const res = await fetch(`${url}/functions/v1/ai-editorial`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ ...body, secret: key }),
      signal: AbortSignal.timeout(55000),
    });
    const d = await res.json().catch(() => ({ ok: false, error: 'The editorial AI returned an unreadable response.' }));
    return NextResponse.json(d, { status: d.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 504 });
  }
}
