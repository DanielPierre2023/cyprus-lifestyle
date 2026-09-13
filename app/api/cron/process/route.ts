// Vercel Cron → AI desk queue. Runs only if automation_settings.processor_enabled.
// Publishes automatically only if automation_settings.auto_publish is also true;
// otherwise new articles land as drafts for editorial sign-off.
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { processBatch } from '@/lib/desk/queue';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap; raise to 300 on Vercel Pro

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const sb = supabaseAdmin();
  const { data: settings } = await sb.from('automation_settings').select('processor_enabled, auto_publish').eq('id', 1).maybeSingle();
  const s = settings as { processor_enabled: boolean; auto_publish: boolean } | null;
  if (!s?.processor_enabled) return NextResponse.json({ ok: true, skipped: 'processor_disabled' });
  const result = await processBatch(sb, { autoPublish: !!s.auto_publish, max: 4, deadlineMs: 250_000 });
  return NextResponse.json({ ok: true, ...result });
}
