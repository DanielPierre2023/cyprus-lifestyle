// Minimal Stripe REST client — no SDK dependency, so nothing to add to package.json.
// Only what the self-serve advertise funnel needs: create a hosted Checkout Session
// and verify a webhook signature. Card data never touches our servers — payment is
// entered on Stripe's hosted Checkout page. Keys live in env (STRIPE_SECRET_KEY,
// STRIPE_WEBHOOK_SECRET), set in Vercel; this code never sees their values at build.
import { createHmac, timingSafeEqual } from 'node:crypto';

const API = 'https://api.stripe.com/v1';

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

function form(obj: Record<string, string | number | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
  return p.toString();
}

export interface CheckoutParams {
  mode: 'subscription' | 'payment';
  currency: string;
  unitAmount: number; // minor units (cents)
  productName: string;
  interval?: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
  clientReferenceId?: string;
  metadata?: Record<string, string>;
}

// Build a Checkout Session with an inline price (price_data) so there is no need to
// pre-create products/prices in the Stripe dashboard — the line item is derived from
// the rate card at request time.
export async function createCheckoutSession(p: CheckoutParams): Promise<{ id: string; url: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');
  const body: Record<string, string | number | undefined> = {
    mode: p.mode,
    success_url: p.successUrl,
    cancel_url: p.cancelUrl,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': p.currency,
    'line_items[0][price_data][product_data][name]': p.productName,
    'line_items[0][price_data][unit_amount]': p.unitAmount,
    allow_promotion_codes: 'true',
    billing_address_collection: 'auto',
    client_reference_id: p.clientReferenceId,
    customer_email: p.customerEmail,
  };
  if (p.mode === 'subscription' && p.interval) {
    body['line_items[0][price_data][recurring][interval]'] = p.interval;
  }
  for (const [k, v] of Object.entries(p.metadata || {})) {
    body[`metadata[${k}]`] = v;
    if (p.mode === 'subscription') body[`subscription_data[metadata][${k}]`] = v;
    if (p.mode === 'payment') body[`payment_intent_data[metadata][${k}]`] = v;
  }
  const res = await fetch(`${API}/checkout/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form(body),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Stripe error ${res.status}`);
  return { id: j.id as string, url: j.url as string };
}

// Verify a Stripe webhook signature (header form: "t=…,v1=…"). Returns the parsed
// event on success, or null on any failure (bad/absent signature, stale timestamp,
// malformed body). Constant-time compare; 5-minute tolerance.
export function verifyWebhook(rawBody: string, sigHeader: string | null, secret: string): Record<string, unknown> | null {
  if (!sigHeader || !secret) return null;
  const parts: Record<string, string> = {};
  for (const kv of sigHeader.split(',')) {
    const i = kv.indexOf('=');
    if (i > 0) parts[kv.slice(0, i).trim()] = kv.slice(i + 1).trim();
  }
  const t = parts['t'];
  const v1 = parts['v1'];
  if (!t || !v1) return null;
  if (Math.abs(Date.now() / 1000 - Number(t)) > 300) return null;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try { return JSON.parse(rawBody) as Record<string, unknown>; } catch { return null; }
}
