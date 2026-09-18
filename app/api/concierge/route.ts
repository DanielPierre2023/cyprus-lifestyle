// POST /api/concierge  { q, locale }
// Public "Ask the island" endpoint. Rate-limited, then forwarded to the
// `concierge` edge function which holds the model key (CLAUDE_API_KEY) in
// Supabase and grounds every answer in the published directory. The service-role
// key that authorises the function stays server-side only.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'concierge', 12, 60))) {
    return NextResponse.json({ ok: false, error: 'A lot of questions at once — give it a moment and try again.' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const q = String(body.q || '').trim().slice(0, 500);
  const locale = String(body.locale || 'en');
  if (q.length < 3) return NextResponse.json({ ok: false, error: 'Please ask a fuller question.' }, { status: 400 });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: 'The concierge is not configured.' }, { status: 500 });

  try {
    const res = await fetch(`${url}/functions/v1/concierge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: key, Authorization: `Bearer ${key}` },
      body: JSON.stringify({ q, locale, secret: key }),
      signal: AbortSignal.timeout(40000),
    });
    const d = await res.json().catch(() => ({ ok: false, error: 'The concierge returned an unreadable response.' }));
    return NextResponse.json(d, { status: d.ok ? 200 : 502 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 504 });
  }
}
