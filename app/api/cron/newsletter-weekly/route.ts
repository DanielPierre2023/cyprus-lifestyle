// Cron/manual → PREPARE the weekly digest drafts (all editions). It never sends anything: an administrator
// approves each edition in Admin → Newsletter. (Before the approval workflow this route mailed every
// subscriber directly; that behaviour was removed on purpose.)
import { NextRequest, NextResponse } from 'next/server';
import { isCronAuthorized } from '@/lib/cron';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { notifyApprover, prepareDigest } from '@/lib/newsletterDigest';

export const runtime = 'nodejs';
export const maxDuration = 60; // Hobby cap

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req)) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  const result = await prepareDigest(supabaseAdmin());
  const notified = await notifyApprover(result);
  return NextResponse.json({ ok: true, ...result, notified });
}
