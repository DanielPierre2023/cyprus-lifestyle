// POST /api/track/rec-click — logs a click on a concierge-recommended listing
// (roadmap item 08). Lightweight beacon: { slug, source?, cid?, locale? }. Best-effort,
// rate-limited, never blocks the navigation. Feeds attribution_clicks → listing_attribution.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { isValidCid } from '@/lib/concierge/memory';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  // Generous limit — a browsing session can click several picks.
  if (!(await rateLimit(req, 'rec-click', 120, 60))) return NextResponse.json({ ok: true });
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug || '').trim().slice(0, 200);
  if (!slug) return NextResponse.json({ ok: false }, { status: 400 });
  const source = ['concierge', 'directory', 'banner'].includes(String(body.source)) ? String(body.source) : 'concierge';
  const cid = isValidCid(String(body.cid || '')) ? String(body.cid) : null;
  const locale = String(body.locale || '').slice(0, 5) || null;
  try {
    await supabaseAdmin().from('attribution_clicks').insert({ slug, source, cid, locale });
  } catch { /* best-effort telemetry */ }
  return NextResponse.json({ ok: true });
}
