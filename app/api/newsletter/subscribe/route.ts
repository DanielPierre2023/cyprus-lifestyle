// Public newsletter sign-up. Body: { email, language }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { subscribe } from '@/lib/newsletter';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { localeOf } from '@/lib/i18n/resolveLocale';
import { errorBody, codedError } from '@/lib/i18n/apiErrors';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (isHoneypot(body)) return NextResponse.json({ ok: true }); // silently drop bots
  if (!(await rateLimit(req, 'newsletter'))) {
    return NextResponse.json(errorBody('rate_limited', localeOf(req, body.language)), { status: 429 });
  }
  const r = await subscribe(supabaseAdmin(), String(body.email || ''), String(body.language || 'en'));
  if (r.ok) return NextResponse.json(r);
  // `error` keeps the previous text ('invalid email' / the database message); `code` is new.
  return NextResponse.json(codedError(r.error === 'invalid email' ? 'invalid_email' : 'subscribe_failed', r.error || 'invalid email'), { status: 400 });
}
