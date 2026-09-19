// POST /api/membership/checkout  { cid, email? }
// Starts a Stripe Checkout (subscription) for the Concierge Membership and returns
// the hosted URL. Reuses the app's Stripe wiring; price is inline (no dashboard
// product needed). Card details never touch our servers.
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/ratelimit';
import { stripeConfigured, createCheckoutSession } from '@/lib/stripe';
import { isValidCid } from '@/lib/concierge/memory';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!(await rateLimit(req, 'membership-checkout', 8, 60))) {
    return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  }
  if (!stripeConfigured()) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const cid = isValidCid(String(body.cid || '')) ? String(body.cid) : '';
  const email = typeof body.email === 'string' && body.email.includes('@') ? body.email.trim() : undefined;

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
