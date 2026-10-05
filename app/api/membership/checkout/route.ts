// POST /api/membership/checkout  { cid, email? }
// Starts a Stripe Checkout (subscription) for the Concierge Membership and returns
// the hosted URL. Reuses the app's Stripe wiring; price is inline (no dashboard
// product needed). Card details never touch our servers.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { stripeConfigured, createCheckoutSession } from '@/lib/stripe';
import { isValidCid } from '@/lib/concierge/memory';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { escapeLike } from '@/lib/stripe/events';
import { logServerError } from '@/lib/monitor.server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'membership-checkout', 8, 60))) {
    return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  }
  if (!stripeConfigured()) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const cid = isValidCid(String(body.cid || '')) ? String(body.cid) : '';
  const email = typeof body.email === 'string' && body.email.includes('@') ? body.email.trim() : undefined;

  // Block a double subscription: an ACTIVE member (by cid, or by email — case-insensitive
  // exact match, LIKE wildcards escaped) must not get a second Stripe customer/subscription.
  // A failed lookup never blocks checkout (fail open) but is logged.
  try {
    const sb = supabaseAdmin();
    const lookups = [];
    if (cid) lookups.push(sb.from('concierge_members').select('id').eq('status', 'active').eq('cid', cid).limit(1));
    if (email) lookups.push(sb.from('concierge_members').select('id').eq('status', 'active').ilike('email', escapeLike(email)).limit(1));
    for (const { data, error } of await Promise.all(lookups)) {
      if (error) await logServerError('membership-checkout', new Error(`active-member lookup failed: ${error.message}`.slice(0, 300)), {}, 'warn');
      else if (data && data.length > 0) return NextResponse.json({ ok: false, error: 'already_member' }, { status: 409 });
    }
  } catch (e) { await logServerError('membership-checkout', e, {}, 'warn'); }

  const priceEur = Math.max(1, Number(process.env.MEMBERSHIP_PRICE_EUR || '19'));
  const interval = (process.env.MEMBERSHIP_INTERVAL === 'year' ? 'year' : 'month') as 'month' | 'year';
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || req.nextUrl.origin;

  try {
    const session = await createCheckoutSession({
      mode: 'subscription',
      currency: 'eur',
      unitAmount: Math.round(priceEur * 100),
      productName: 'Cyprus Lifestyle — Concierge Membership',
      interval,
      successUrl: `${origin}/membership?welcome=1`,
      cancelUrl: `${origin}/membership`,
      customerEmail: email,
      clientReferenceId: cid || undefined,
      metadata: { kind: 'membership', tier: 'concierge', cid },
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
