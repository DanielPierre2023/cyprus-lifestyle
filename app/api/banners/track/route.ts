// Public sponsor-banner tracking. POST { id: uuid, type: 'impression' | 'click' }
// Hardened: per-IP rate limit, strict body validation, a short per-IP-per-banner de-dup
// bucket (a reload/spam loop counts once), and a generic error (never the DB message).
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logServerError } from '@/lib/monitor.server';

export const runtime = 'nodejs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FN = { impression: 'increment_banner_impressions', click: 'increment_banner_clicks' } as const;
// De-dup window per IP + banner + event type (seconds).
const DEDUP_SEC = { impression: 30, click: 5 } as const;

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'banner-track', 120, 60))) {
    return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  }
  const body = await req.json().catch(() => null);
  const id = typeof body?.id === 'string' ? body.id : '';
  const type = typeof body?.type === 'string' ? body.type : '';
  if (!UUID.test(id)) return NextResponse.json({ ok: false, error: 'invalid id' }, { status: 400 });
  if (type !== 'impression' && type !== 'click') return NextResponse.json({ ok: false, error: 'invalid type' }, { status: 400 });
  const kind: 'impression' | 'click' = type;

  // Already counted for this visitor a moment ago → acknowledge without counting again.
  if (!(await rateLimit(req, `banner-${kind}-${id}`, 1, DEDUP_SEC[kind]))) return NextResponse.json({ ok: true });

  const { error } = await supabaseAdmin().rpc(FN[kind], { banner_id: id });
  if (error) {
    await logServerError('banners-track', new Error(error.message.slice(0, 300)), { type });
    return NextResponse.json({ ok: false, error: 'tracking failed' }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
