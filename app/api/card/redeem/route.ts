// POST /api/card/redeem  { token, offerId }
// Venue staff press "Redeem" on the public verification page. No login: the card token is the credential. The request is
// refused unless the card is valid right now (same entitlement rule as everywhere), the offer is live, and the member has
// not already redeemed that offer today (Cyprus day). The only thing written is (offer, member id, time).
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitKey } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { sameOrigin } from '@/lib/member/session';
import { verdictFor } from '@/lib/member/card';
import { lookupCard, redeemOffer } from '@/lib/member/cardStore';
import { hashRestoreToken } from '@/lib/concierge/restoreToken';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const no = (code: string, status: number) => NextResponse.json({ ok: false, code }, { status, headers: { 'Cache-Control': 'no-store' } });

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return no('forbidden', 403);
  if (!(await rateLimit(req, 'card-redeem', 20, 600))) return no('rate_limited', 429);
  const body = await req.json().catch(() => ({}));
  const sb = supabaseAdmin();
  const found = await lookupCard(sb, body?.token);
  if (!found || !verdictFor(found.member, found.displayName).valid) return no('invalid', 404);
  // a second, per-card brake: a card cannot be hammered from many addresses
  if (!(await rateLimitKey(hashRestoreToken(String(body.token)).slice(0, 24), 'card-redeem-card', 12, 3600))) return no('rate_limited', 429);
  const outcome = await redeemOffer(sb, found.member.id, String(body?.offerId || ''));
  if (outcome === 'ok') return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  if (outcome === 'already') return no('already', 409);
  if (outcome === 'unavailable') return no('unavailable', 404);
  return no('error', 500);
}
