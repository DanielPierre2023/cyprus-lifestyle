// Vercel Cron → weekly digest (The Dispatch), all four editions.
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { weeklyDigest } from '@/lib/newsletter';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap; raise to 300 on Vercel Pro

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const result = await weeklyDigest(supabaseAdmin());
  return NextResponse.json({ ok: true, ...result });
}
