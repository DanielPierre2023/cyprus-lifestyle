// POST /api/membership/restore { token, cid }
// Confirms an emailed restore link. POST-only on purpose: mail scanners and link
// previewers GET links, and must never be able to consume a single-use token.
// The membership is bound to `cid` — the browser that opened the link and is confirming.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { confirmRestore } from '@/lib/concierge/membership';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'membership-restore-confirm', 10, 600))) {
    return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  }
  const body = await req.json().catch(() => ({}));
  const outcome = await confirmRestore(supabaseAdmin(), body?.token, body?.cid);
  if (outcome === 'error') console.error('[membership/restore] confirm failed (is migration 20261004130100 applied?)');
  if (outcome === 'restored') return NextResponse.json({ ok: true, member: true });
  // Generic and non-leaking: callers only learn "expired/used" vs "invalid" vs "try later".
  if (outcome === 'error') return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });
  return NextResponse.json({ ok: false, error: outcome === 'expired' ? 'expired' : 'invalid' }, { status: 400 });
}
