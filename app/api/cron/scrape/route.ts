// Vercel Cron → RSS scraper. Runs only if automation_settings.scraper_enabled.
// Schedule in vercel.json. Ported from TT tt-scrape-rss cron path.
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { scrapeAllActive } from '@/lib/scraper';

export const runtime = 'nodejs';
export const maxDuration = 300; // Vercel Pro: up to 5 min

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const sb = supabaseAdmin();
  const { data: settings } = await sb.from('automation_settings').select('scraper_enabled').eq('id', 1).maybeSingle();
  const enabled = settings ? (settings as { scraper_enabled: boolean }).scraper_enabled : false;
  if (!enabled) {
    return NextResponse.json({ ok: true, skipped: 'scraper_disabled' });
  }
  const summary = await scrapeAllActive(sb);
  return NextResponse.json({ ok: true, ...summary });
}
