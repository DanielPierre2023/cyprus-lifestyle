// Admin: send the digest now (optionally one locale). Body: { locale? }
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { weeklyDigest } from '@/lib/newsletter';
import { isLocale } from '@/lib/locales';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const only = isLocale(String(body.locale)) ? body.locale : undefined;
  const result = await weeklyDigest(supabaseAdmin(), only);
  return NextResponse.json({ ok: true, ...result });
}
