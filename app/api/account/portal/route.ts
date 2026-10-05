// POST /api/account/portal → { ok, url }  Opens Stripe's Customer Portal for the signed-in member (change card, download
// invoices, cancel). Requires a member session; complimentary members have no Stripe customer and get a clear answer.
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { rateLimit } from '@/lib/ratelimit';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SESSION_COOKIE, resolveSession, sameOrigin } from '@/lib/member/session';
import { createPortalSession, stripeCheckoutLocale, stripeConfigured } from '@/lib/stripe';
import { isLocale } from '@/lib/locales';
import { logServerError } from '@/lib/monitor.server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  if (!(await rateLimit(req, 'account-portal', 10, 300))) return NextResponse.json({ ok: false, error: 'busy' }, { status: 429 });
  const s = await resolveSession(supabaseAdmin(), (await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ ok: false, error: 'signed_out' }, { status: 401 });
  if (!s.member.stripe_customer_id) return NextResponse.json({ ok: false, error: 'no_billing' }, { status: 409 });
  if (!stripeConfigured()) return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const locale = isLocale(String(body?.locale)) ? String(body.locale) : 'en';
  const site = (process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin).replace(/\/+$/, '');
  try {
    const { url } = await createPortalSession({
      customerId: s.member.stripe_customer_id,
      returnUrl: `${site}${locale === 'en' ? '' : `/${locale}`}/account`,
      locale: stripeCheckoutLocale(locale),
    });
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    await logServerError('account-portal', e, { member: s.member.id });
    // The most common cause on a new Stripe account: the portal was never saved in Settings → Billing → Customer portal.
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 502 });
  }
}
