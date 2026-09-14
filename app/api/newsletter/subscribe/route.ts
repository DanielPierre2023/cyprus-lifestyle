// Public newsletter sign-up. Body: { email, language }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { subscribe } from '@/lib/newsletter';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (isHoneypot(body)) return NextResponse.json({ ok: true }); // silently drop bots
  if (!(await rateLimit(req, 'newsletter'))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }
  const r = await subscribe(supabaseAdmin(), String(body.email || ''), String(body.language || 'en'));
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
