// POST /api/advertise/checkout
//   { slot, locale, email, country, vatId?, name?, company? }
// Starts a Stripe Checkout session for a self-serve rate-card item. Returns { ok, url } to redirect to. If Stripe is
// not configured, or the item is quote-only, responds { quote: true } so the page falls back to the enquiry form.
//
// VAT (see docs/VAT-SETUP.md and lib/vat/*):
//   • the buyer's COUNTRY is required — VAT depends on it;
//   • an EU VAT NUMBER is optional, and when given it is VERIFIED against the EU's VIES register BEFORE anything is
//     created. Stripe only checks the number's format, so without this a made-up number would remove the VAT;
//   • only a VIES-confirmed number is attached to the Stripe customer (→ reverse charge for other-EU businesses);
//     a number that is invalid or cannot be verified is refused (the buyer may continue without it and pay VAT);
//   • the verification evidence and what we EXPECT Stripe Tax to do are stored on the order, and the webhook compares
//     that with what Stripe actually charged.
// Error codes returned to the form: email_required · country_required · company_required · vat_format ·
// vat_invalid · vat_unverifiable (503) · quote · and a generic message for anything else.
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimit, isHoneypot } from '@/lib/ratelimit';
import { createCheckoutSession, createCustomer, stripeConfigured, automaticTaxEnabled, stripeCheckoutLocale } from '@/lib/stripe';
import { SITE_URL } from '@/lib/seo';
import { isLocale } from '@/lib/locales';
import { isCountryCode, isEuMemberState } from '@/lib/vat/countries';
import { parseVatForCountry } from '@/lib/vat/parse';
import { checkVatNumber, type ViesResult } from '@/lib/vat/vies';
import { expectedTreatment, type VatCheck } from '@/lib/vat/treatment';
import { AD_TAX } from '@/lib/vat/products';
import { logServerError } from '@/lib/monitor.server';

export const runtime = 'nodejs';

const INTERVAL: Record<string, 'month' | 'year' | undefined> = { 'per month': 'month', 'per year': 'year' };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const fail = (error: string, status: number, extra?: Record<string, unknown>) => NextResponse.json({ ok: false, error, ...extra }, { status });

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  if (isHoneypot(body)) return NextResponse.json({ ok: true });
  if (!(await rateLimit(req, 'advertise-checkout'))) return fail('Too many requests — please wait a moment.', 429);
  if (!stripeConfigured()) return fail('Online checkout is not available yet — request a quote and we will set you up.', 400, { quote: true });

  const slot = String(body.slot || '').trim().slice(0, 60);
  const locale = isLocale(String(body.locale)) ? String(body.locale) : 'en';
  const email = String(body.email || '').trim().toLowerCase();
  const name = String(body.name || '').trim().slice(0, 120) || undefined;
  const company = String(body.company || '').trim().slice(0, 160) || undefined;
  const country = String(body.country || '').trim().toUpperCase();
  const vatRaw = String(body.vatId || '').trim().slice(0, 40);

  if (!EMAIL_RE.test(email)) return fail('email_required', 400);
  if (!isCountryCode(country)) return fail('country_required', 400);

  const sb = supabaseAdmin();
  const { data: item } = await sb.from('ad_pricing')
    .select('slot, label_en, unit, price_from, price_to, self_serve').eq('slot', slot).maybeSingle();
  if (!item || !item.self_serve || item.price_from == null || item.price_to != null) {
    return fail('This placement is arranged by quote.', 400, { quote: true });
  }

  // ── VAT number: verify BEFORE creating anything ─────────────────────────────────────────────────────────────────
  let check: VatCheck = 'none';
  let vatDisplay: string | null = null;
  let vies: ViesResult | null = null;
  if (vatRaw && isEuMemberState(country)) {
    if (!company) return fail('company_required', 400);
    const parsed = parseVatForCountry(country, vatRaw);
    if (!parsed.ok) return fail('vat_format', 422);
    vies = await checkVatNumber(parsed.prefix, parsed.number);
    if (vies.status === 'invalid') return fail('vat_invalid', 422);
    if (vies.status === 'unavailable') {
      await logServerError('vat-vies', new Error(`VIES unavailable (${vies.detail || 'unknown'})`), { country }, 'warn');
      return fail('vat_unverifiable', 503);
    }
    check = 'valid';
    vatDisplay = parsed.display;
  } // a VAT number typed for a non-EU country is ignored: it has no effect on EU VAT

  const expectation = expectedTreatment({ buyerCountry: country, check });
  const interval = INTERVAL[String(item.unit || '')];
  const mode: 'subscription' | 'payment' = interval ? 'subscription' : 'payment';
  const amount = Number(item.price_from);
  const label = String(item.label_en || slot);
  const prefix = locale === 'en' ? '' : `${locale}/`;
  const automaticTax = automaticTaxEnabled();
  if (!automaticTax) console.warn('[vat] STRIPE_AUTOMATIC_TAX is off — this checkout will NOT collect VAT (see docs/VAT-SETUP.md)');

  const orderRow = {
    slot, label, mode, amount, currency: 'eur',
    customer_email: email, customer_name: name, company, locale, status: 'pending',
  };
  const vatCols = {
    buyer_country: country, buyer_vat_id: vatDisplay, vat_status: check,
    vies_request_id: vies?.requestId ?? null, vies_checked_at: vies?.checkedAt ?? null, vat_expectation: expectation,
  };
  let ins = await sb.from('ad_orders').insert({ ...orderRow, ...vatCols }).select('id').single();
  if (ins.error && /column|schema cache/i.test(ins.error.message)) {
    // The VAT migration (20261005130000) has not been applied yet: keep selling, but say so loudly.
    await logServerError('vat-schema', new Error('ad_orders VAT columns missing — run migration 20261005130000_vat_evidence.sql'), {}, 'warn');
    ins = await sb.from('ad_orders').insert(orderRow).select('id').single();
  }
  const order = ins.data;
  if (ins.error || !order) return fail('Could not start checkout.', 500);

  try {
    const customer = await createCustomer({
      email, name: company || name, country, euVatId: vatDisplay || undefined,
      locale: stripeCheckoutLocale(locale) === 'auto' ? undefined : locale,
      metadata: { order_id: String(order.id), slot },
    });
    const session = await createCheckoutSession({
      mode, currency: 'eur', unitAmount: Math.round(amount * 100),
      productName: `Cyprus Lifestyle — ${label}`, interval,
      successUrl: `${SITE_URL}/${prefix}advertise?status=success`,
      cancelUrl: `${SITE_URL}/${prefix}advertise?status=cancel`,
      customerId: customer.id,
      clientReferenceId: order.id as string,
      metadata: { order_id: String(order.id), slot, label, vat_expectation: expectation },
      // VAT: prices on the rate card EXCLUDE VAT; Stripe Tax adds it (or applies the reverse charge).
      automaticTax, taxBehavior: AD_TAX.taxBehavior, taxCode: AD_TAX.taxCode,
      billingAddressCollection: 'required', updateCustomerFromCheckout: true,
      invoiceCreation: mode === 'payment',
      locale: stripeCheckoutLocale(locale),
    });
    await sb.from('ad_orders').update({
      stripe_session_id: session.id, stripe_customer_id: customer.id, updated_at: new Date().toISOString(),
    }).eq('id', order.id);
    return NextResponse.json({ ok: true, url: session.url });
  } catch (e) {
    await sb.from('ad_orders').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', order.id);
    const msg = (e as Error).message || '';
    // Stripe rejects a tax-ID whose format it does not accept for the type.
    if (/tax[_ ]id/i.test(msg)) return fail('vat_format', 422);
    await logServerError('advertise-checkout', e, { slot });
    return fail('Could not start checkout.', 502);
  }
}
