// Public newsletter sign-up. Body: { email, language }
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { subscribe } from '@/lib/newsletter';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const r = await subscribe(supabaseAdmin(), String(body.email || ''), String(body.language || 'en'));
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
