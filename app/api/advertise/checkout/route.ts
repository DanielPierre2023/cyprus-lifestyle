// POST /api/advertise/checkout  { slot, email?, name?, company?, locale? }
// Starts a Stripe Checkout session for a self-serve rate-card item. Returns { url }
// to redirect to. If Stripe is not configured, or the item is quote-only, responds
// { quote: true } so the page falls back to the enquiry form.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { createCheckoutSession, stripeConfigured } from '@/lib/stripe';
import { SITE_URL } from '@/lib/seo';
import { isLocale } from '@/lib/locales';

export const runtime = 'nodejs';

const INTERVAL: Record<string, 'month' | 'year' | undefined> = { 'per month': 'month', 'per year': 'year' };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (isHoneypot(body)) return NextResponse.json({ ok: true });
  if (!(await rateLimit(req, 'advertise-checkout'))) {
    return NextResponse.json({ ok: false, error: 'Too many requests — please wait a moment.' }, { status: 429 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json({ ok: false, quote: true, error: 'Online checkout is not available yet — request a quote and we will set you up.' }, { status: 400 });
  }

  const slot = String(body.slot || '').trim().slice(0, 60);
  const locale = isLocale(String(body.locale)) ? String(body.locale) : 'en';
  const email = String(body.email || '').trim().toLowerCase() || undefined;
  const name = String(body.name || '').trim().slice(0, 120) || undefined;
  const company = String(body.company || '').trim().slice(0, 160) || undefined;

  const sb = supabaseAdmin();
  const { data: item } = await sb.from('ad_pricing')
    .select('slot, label_en, unit, price_from, price_to, self_serve').eq('slot', slot).maybeSingle();
  if (!item || !item.self_serve || item.price_from == null || item.price_to != null) {
    return NextResponse.json({ ok: false, quote: true, error: 'This placement is arranged by quote.' }, { status: 400 });
  }

  const interval = INTERVAL[String(item.unit || '')];
  const mode: 'subscription' | 'payment' = interval ? 'subscription' : 'payment';
  const amount = Number(item.price_from);
  const label = String(item.label_en || slot);
  const prefix = locale === 'en' ? '' : `${locale}/`;

  const { data: order, error: insErr } = await sb.from('ad_orders').insert({
    slot, label, mode, amount, currency: 'eur',
    customer_email: email, customer_name: name, company, locale, status: 'pending',
  }).select('id').single();
  if (insErr || !order) return NextResponse.json({ ok: false, error: 'Could not start checkout.' }, { status: 500 });

  try {
    const session = await createCheckoutSession({
      mode, currency: 'eur', unitAmount: Math.round(amount * 100),
      productName: `Cyprus Lifestyle — ${label}`, interval,
      successUrl: `${SITE_URL}/${prefix}advertise?status=success`,
      cancelUrl: `${SITE_URL}/${prefix}advertise?status=cancel`,
      customerEmail: email,
      clientReferenceId: order.id as string,
      metadata: { order_id: String(order.id), slot, label },
    });
    await sb.from('ad_orders').update({ stripe_session_id: session.id, updated_at: new Date().toISOString() }).eq('id', order.id);
    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    await sb.from('ad_orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.id);
    return NextResponse.json({ ok: false, error: (e as Error).message }, { status: 502 });
  }
}
