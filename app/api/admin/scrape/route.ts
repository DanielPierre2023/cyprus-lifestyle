// Admin "Scrape now" — one source ({ source_id }) or all active sources ({}).
// Gated by an admin session. Ignores the automation on/off switch (manual run).
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { scrapeAllActive, scrapeOne } from '@/lib/scraper';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  if (body.source_id) {
    const r = await scrapeOne(sb, body.source_id);
    if (!r) return NextResponse.json({ ok: false, error: 'Source not found' }, { status: 404 });
    return NextResponse.json({ ok: true, ...r });
  }
  const summary = await scrapeAllActive(sb);
  return NextResponse.json({ ok: true, ...summary });
}
