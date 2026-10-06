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

  // ── VAT (Stripe Tax). All optional; with none of them set the behaviour is exactly as before. ──
  /** Use this existing Customer (created with the buyer's country and — if VIES-verified — VAT number). Replaces customerEmail. */
  customerId?: string;
  /** Let Stripe Tax calculate the VAT (needs the Stripe Tax set-up: see docs/VAT-SETUP.md). */
  automaticTax?: boolean;
  /** 'exclusive' = VAT is added on top of the price; 'inclusive' = the price already contains the VAT. */
  taxBehavior?: 'exclusive' | 'inclusive';
  /** Stripe product tax code, e.g. txcd_20030000 (General - Services) or txcd_10000000 (Electronically Supplied Services). */
  taxCode?: string;
  billingAddressCollection?: 'auto' | 'required';
  /** Write the billing address / name entered in Checkout back to the Customer (needed for correct invoices). */
  updateCustomerFromCheckout?: boolean;
  /** One-time payments only: have Stripe create a (paid) invoice with the VAT breakdown. Subscriptions always invoice. */
  invoiceCreation?: boolean;
  /** Language of the Stripe-hosted page; see stripeCheckoutLocale(). */
  locale?: string;
}

/**
 * Stripe-hosted Checkout supports de, el, en, pl, ro and ru — but NOT Arabic (a Stripe limitation; Arabic exists only in
 * Elements). Arabic visitors therefore get 'auto' (their browser language, else English).
 */
export function stripeCheckoutLocale(edition?: string): string {
  return ({ en: 'en', de: 'de', el: 'el', pl: 'pl', ro: 'ro', ru: 'ru' } as Record<string, string>)[String(edition || '').toLowerCase()] || 'auto';
}

/**
 * The Stripe account is shared by several of the owner's businesses, so the account-wide Terms/Privacy URLs in the
 * Stripe Dashboard cannot name Cyprus Lifestyle. Each Checkout Session therefore carries its own consent line above the
 * Pay button (custom_text.submit). Markdown links are supported by Stripe; max 1200 characters. English only (Stripe
 * has no per-language custom text).
 */
export function checkoutTermsMessage(env: Record<string, string | undefined> = process.env): string {
  const site = (env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').trim().replace(/\/+$/, '');
  return `By paying you agree to the [Terms](${site}/terms) and acknowledge the [Privacy Policy](${site}/privacy) of Cyprus Lifestyle, operated by ADD Individual Solutions Ltd (Cyprus).`;
}

/** Form-encoded body for POST /v1/checkout/sessions. Pure (no network) so it is unit-tested. */
export function buildCheckoutBody(p: CheckoutParams): Record<string, string | number | undefined> {
  const body: Record<string, string | number | undefined> = {
    mode: p.mode,
    success_url: p.successUrl,
    cancel_url: p.cancelUrl,
    'line_items[0][quantity]': 1,
    'line_items[0][price_data][currency]': p.currency,
    'line_items[0][price_data][product_data][name]': p.productName,
    'line_items[0][price_data][unit_amount]': p.unitAmount,
    allow_promotion_codes: 'true',
    billing_address_collection: p.billingAddressCollection ?? 'auto',
    client_reference_id: p.clientReferenceId,
  };
  if (p.customerId) {
    body.customer = p.customerId; // an existing customer replaces customer_email
    if (p.updateCustomerFromCheckout) {
      body['customer_update[address]'] = 'auto';
      body['customer_update[name]'] = 'auto';
    }
  } else {
    body.customer_email = p.customerEmail;
    if (p.invoiceCreation && p.mode === 'payment') body.customer_creation = 'always'; // an invoice needs a customer
  }
  if (p.mode === 'subscription' && p.interval) body['line_items[0][price_data][recurring][interval]'] = p.interval;
  if (p.automaticTax) body['automatic_tax[enabled]'] = 'true';
  if (p.taxBehavior) body['line_items[0][price_data][tax_behavior]'] = p.taxBehavior;
  if (p.taxCode) body['line_items[0][price_data][product_data][tax_code]'] = p.taxCode;
  if (p.invoiceCreation && p.mode === 'payment') body['invoice_creation[enabled]'] = 'true';
  if (p.locale) body.locale = p.locale;
  body['custom_text[submit][message]'] = checkoutTermsMessage();
  for (const [k, v] of Object.entries(p.metadata || {})) {
    body[`metadata[${k}]`] = v;
    if (p.mode === 'subscription') body[`subscription_data[metadata][${k}]`] = v;
    if (p.mode === 'payment') body[`payment_intent_data[metadata][${k}]`] = v;
  }
  return body;
}

// Build a Checkout Session with an inline price (price_data) so there is no need to
// pre-create products/prices in the Stripe dashboard — the line item is derived from
// the rate card at request time. Body construction lives in buildCheckoutBody().
export async function createCheckoutSession(p: CheckoutParams): Promise<{ id: string; url: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');
  const res = await fetch(`${API}/checkout/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form(buildCheckoutBody(p)),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Stripe error ${res.status}`);
  return { id: j.id as string, url: j.url as string };
}

/** Whether VAT is being calculated by Stripe Tax. Off until docs/VAT-SETUP.md has been completed in the Stripe dashboard. */
export function automaticTaxEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env.STRIPE_AUTOMATIC_TAX || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

/** Create the Stripe Customer for a checkout. `euVatId` must already be VERIFIED against VIES (lib/vat/vies.ts). */
export async function createCustomer(p: {
  email?: string; name?: string; country?: string; euVatId?: string; locale?: string; metadata?: Record<string, string>;
}): Promise<{ id: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');
  const body: Record<string, string | number | undefined> = {
    email: p.email, name: p.name, 'address[country]': p.country, 'preferred_locales[0]': p.locale,
  };
  if (p.euVatId) { body['tax_id_data[0][type]'] = 'eu_vat'; body['tax_id_data[0][value]'] = p.euVatId; }
  for (const [k, v] of Object.entries(p.metadata || {})) body[`metadata[${k}]`] = v;
  const res = await fetch(`${API}/customers`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form(body),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Stripe error ${res.status}`);
  return { id: j.id as string };
}

// ── Customer Portal (members manage card, invoices and cancellation on Stripe's own page) ───────────────────
// Needs the portal to be configured once in the Stripe Dashboard (Settings → Billing → Customer portal → Save).
// Because the Stripe account is shared with other businesses, set STRIPE_PORTAL_CONFIGURATION_ID (a `bpc_…` id, see
// docs/STRIPE-SHARED-ACCOUNT.md) so members of THIS site get a portal that links to Cyprus Lifestyle's own Terms and
// Privacy pages. Unset or malformed = the account's default portal, exactly as before.
export function portalConfigurationId(env: Record<string, string | undefined> = process.env): string | undefined {
  const v = (env.STRIPE_PORTAL_CONFIGURATION_ID || '').trim();
  return /^bpc_[A-Za-z0-9]+$/.test(v) ? v : undefined;
}
export async function createPortalSession(p: { customerId: string; returnUrl: string; locale?: string }): Promise<{ url: string }> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');
  const res = await fetch(`${API}/billing_portal/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form({ customer: p.customerId, return_url: p.returnUrl, configuration: portalConfigurationId(), locale: p.locale && p.locale !== 'auto' ? p.locale : undefined }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Stripe error ${res.status}`);
  return { url: j.url as string };
}

// ── Subscription lookup (the daily check that nobody keeps member benefits after a missed cancellation event) ──
export type SubscriptionLookup =
  | { found: true; status: string; subscription: Record<string, unknown> }
  | { found: false; reason: 'missing' }
  | { found: false; reason: 'error'; message: string };

export async function retrieveSubscription(id: string, fetchImpl: typeof fetch = fetch): Promise<SubscriptionLookup> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return { found: false, reason: 'error', message: 'Stripe is not configured' };
  if (!/^sub_[A-Za-z0-9]+$/.test(id)) return { found: false, reason: 'missing' };
  try {
    const res = await fetchImpl(`${API}/subscriptions/${id}`, { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(20000) });
    const j = (await res.json().catch(() => ({}))) as Record<string, unknown> & { error?: { code?: string; message?: string } };
    if (res.status === 404 || j.error?.code === 'resource_missing') return { found: false, reason: 'missing' };
    if (!res.ok) return { found: false, reason: 'error', message: j.error?.message || `Stripe error ${res.status}` };
    return { found: true, status: String(j.status || ''), subscription: j };
  } catch (e) {
    return { found: false, reason: 'error', message: (e as Error).message };
  }
}

// ── Stripe Tax calculation (read-only simulation: no payment, no customer, nothing is stored) ─────────────────
export interface TaxCalcInput {
  currency: string;
  country: string;
  euVatId?: string;
  lines: { amount: number; reference: string; taxCode: string; taxBehavior: 'exclusive' | 'inclusive' }[];
}
export interface TaxCalcResult {
  amountTotal: number;          // minor units, what the customer would pay
  taxAmount: number;            // minor units of VAT included in / added to that total
  reasons: string[];            // Stripe's taxability_reason per breakdown entry (reverse_charge, not_collecting, standard_rated …)
  ratePercent: number | null;   // the VAT rate Stripe applied, if any
}

export function parseTaxCalculation(j: Record<string, unknown>): TaxCalcResult {
  const breakdown = (Array.isArray(j.tax_breakdown) ? j.tax_breakdown : []) as Record<string, unknown>[];
  const exclusive = Number(j.tax_amount_exclusive ?? 0);
  const inclusive = Number(j.tax_amount_inclusive ?? 0);
  let rate: number | null = null;
  for (const b of breakdown) {
    const pct = Number((b.tax_rate_details as Record<string, unknown> | undefined)?.percentage_decimal);
    if (Number.isFinite(pct) && pct > 0) { rate = pct; break; }
  }
  return {
    amountTotal: Number(j.amount_total ?? 0),
    taxAmount: exclusive + inclusive,
    reasons: breakdown.map((b) => String(b.taxability_reason ?? 'unknown')),
    ratePercent: rate,
  };
}

export function buildTaxCalculationBody(i: TaxCalcInput): Record<string, string | number | undefined> {
  const body: Record<string, string | number | undefined> = {
    currency: i.currency,
    'customer_details[address][country]': i.country,
    'customer_details[address_source]': 'billing',
  };
  if (i.euVatId) { body['customer_details[tax_ids][0][type]'] = 'eu_vat'; body['customer_details[tax_ids][0][value]'] = i.euVatId; }
  i.lines.forEach((l, n) => {
    body[`line_items[${n}][amount]`] = l.amount;
    body[`line_items[${n}][reference]`] = l.reference;
    body[`line_items[${n}][tax_code]`] = l.taxCode;
    body[`line_items[${n}][tax_behavior]`] = l.taxBehavior;
  });
  return body;
}

export async function createTaxCalculation(i: TaxCalcInput): Promise<TaxCalcResult> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('Stripe is not configured');
  const res = await fetch(`${API}/tax/calculations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form(buildTaxCalculationBody(i)),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error?.message || `Stripe error ${res.status}`);
  return parseTaxCalculation(j as Record<string, unknown>);
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
