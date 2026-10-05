// What we store after payment, and when we raise a VAT alert.
import { computeVatRecord } from '@/lib/vat/record';
import { buildCheckoutBody, stripeCheckoutLocale, parseTaxCalculation, buildTaxCalculationBody, automaticTaxEnabled } from '@/lib/stripe';
import { AD_TAX, MEMBERSHIP_TAX } from '@/lib/vat/products';
import { eq, ok, report } from './_harness';

const session = (o: Record<string, unknown> = {}) => ({
  amount_subtotal: 14900, amount_total: 17731, invoice: 'in_123', automatic_tax: { enabled: true, status: 'complete' },
  total_details: { amount_tax: 2831 }, customer_details: { address: { country: 'CY' } }, ...o,
});

// ── storing the figures ──────────────────────────────────────────────────────
{
  const r = computeVatRecord({ id: 'o1', vat_expectation: 'domestic_vat', buyer_country: 'CY' }, session());
  eq('euros, not cents', [r.patch.amount_subtotal, r.patch.amount_tax, r.patch.amount_total], [149, 28.31, 177.31]);
  eq('billing country + invoice id stored', [r.patch.billing_country, r.patch.stripe_invoice_id], ['CY', 'in_123']);
  eq('as expected → no alert', [r.alert, 'vat_alert' in r.patch], [null, false]);
}
{
  const r = computeVatRecord({ id: 'o2', vat_expectation: 'reverse_charge', buyer_country: 'DE' },
    session({ amount_total: 14900, total_details: { amount_tax: 0 }, customer_details: { address: { country: 'DE' } } }));
  eq('German company, verified number: €149.00 total, €0 VAT, no alert', [r.patch.amount_total, r.patch.amount_tax, r.alert], [149, 0, null]);
}
// ── the two rules, end to end ────────────────────────────────────────────────
eq('Cypriot company charged VAT → fine', computeVatRecord({ vat_expectation: 'domestic_vat', buyer_country: 'CY' }, session()).alert, null);
ok('Cypriot company NOT charged VAT → alert', /Cyprus VAT registration/.test(computeVatRecord({ vat_expectation: 'domestic_vat', buyer_country: 'CY' }, session({ total_details: { amount_tax: 0 }, amount_total: 14900 })).alert || ''));
ok('German company charged VAT despite a verified number → alert', /reverse charge/i.test(computeVatRecord({ vat_expectation: 'reverse_charge', buyer_country: 'DE' }, session({ customer_details: { address: { country: 'DE' } } })).alert || ''));
ok('stored on the patch so the admin can see it', typeof computeVatRecord({ vat_expectation: 'reverse_charge', buyer_country: 'DE' }, session({ customer_details: { address: { country: 'DE' } } })).patch.vat_alert === 'string');
// ── legacy / odd inputs ──────────────────────────────────────────────────────
eq('order from before VAT handling: figures stored, no alert', computeVatRecord({ id: 'old' }, session()).alert, null);
eq('missing figures do not crash', computeVatRecord({ vat_expectation: 'domestic_vat' }, {}).patch.amount_total, null);
ok('Stripe Tax off in the session → alert', /OFF/.test(computeVatRecord({ vat_expectation: 'domestic_vat', buyer_country: 'CY' }, session({ automatic_tax: { enabled: false } })).alert || ''));

// ── checkout parameters ──────────────────────────────────────────────────────
const base = { mode: 'subscription' as const, currency: 'eur', unitAmount: 4900, productName: 'X', interval: 'month' as const, successUrl: 'https://s', cancelUrl: 'https://c' };
{
  const b = buildCheckoutBody({ ...base, customerId: 'cus_1', automaticTax: true, taxBehavior: AD_TAX.taxBehavior, taxCode: AD_TAX.taxCode, billingAddressCollection: 'required', updateCustomerFromCheckout: true, locale: 'de', customerEmail: 'ignored@x.y' });
  eq('ad product: VAT added on top (exclusive) with the services tax code', [b['line_items[0][price_data][tax_behavior]'], b['line_items[0][price_data][product_data][tax_code]']], ['exclusive', 'txcd_20030000']);
  eq('automatic tax on', b['automatic_tax[enabled]'], 'true');
  eq('existing customer replaces customer_email', [b.customer, b.customer_email], ['cus_1', undefined]);
  eq('address + name written back to the customer', [b['customer_update[address]'], b['customer_update[name]']], ['auto', 'auto']);
  eq('billing address required + Stripe page language', [b.billing_address_collection, b.locale], ['required', 'de']);
  eq('no tax-id collection on Stripe’s page (we verify ourselves)', Object.keys(b).some((k) => k.startsWith('tax_id_collection')), false);
}
{
  const b = buildCheckoutBody({ ...base, automaticTax: true, taxBehavior: MEMBERSHIP_TAX.taxBehavior, taxCode: MEMBERSHIP_TAX.taxCode, customerEmail: 'm@x.y' });
  eq('membership: VAT INCLUDED in the €19 with the digital-services tax code', [b['line_items[0][price_data][tax_behavior]'], b['line_items[0][price_data][product_data][tax_code]']], ['inclusive', 'txcd_10000000']);
  eq('membership without a customer uses the email', [b.customer_email, b.customer, b['customer_update[address]']], ['m@x.y', undefined, undefined]);
}
{
  const b = buildCheckoutBody({ ...base, mode: 'payment', interval: undefined, customerEmail: 'a@b.c', invoiceCreation: true });
  eq('one-time payment: invoice created, customer created for it', [b['invoice_creation[enabled]'], b.customer_creation], ['true', 'always']);
  const sub = buildCheckoutBody({ ...base, invoiceCreation: true, customerEmail: 'a@b.c' });
  eq('subscription never sets invoice_creation (it always invoices)', [sub['invoice_creation[enabled]'], sub.customer_creation], [undefined, undefined]);
}
{
  const plain = buildCheckoutBody(base);
  eq('with no VAT options the body is exactly the old one (no tax keys)', Object.keys(plain).filter((k) => /tax|invoice|customer_update|locale/.test(k)), []);
  eq('metadata copied to the subscription', buildCheckoutBody({ ...base, metadata: { order_id: 'o' } })['subscription_data[metadata][order_id]'], 'o');
}
eq('Stripe page languages: 6 supported, Arabic falls back to automatic', ['en', 'de', 'el', 'pl', 'ro', 'ru', 'ar'].map(stripeCheckoutLocale), ['en', 'de', 'el', 'pl', 'ro', 'ru', 'auto']);
eq('unknown edition → auto', stripeCheckoutLocale('xx'), 'auto');
ok('automatic tax is OFF unless explicitly enabled', !automaticTaxEnabled({}) && !automaticTaxEnabled({ STRIPE_AUTOMATIC_TAX: '0' }) && automaticTaxEnabled({ STRIPE_AUTOMATIC_TAX: '1' }) && automaticTaxEnabled({ STRIPE_AUTOMATIC_TAX: 'true' }));

// ── tax-calculation (used by the live self-check) ────────────────────────────
eq('calculation body: country, verified number, tax code and behaviour per line',
  (() => { const b = buildTaxCalculationBody({ currency: 'eur', country: 'DE', euVatId: 'DE123456789', lines: [{ amount: 14900, reference: 'ad', taxCode: 'txcd_20030000', taxBehavior: 'exclusive' }] });
    return [b['customer_details[address][country]'], b['customer_details[tax_ids][0][type]'], b['customer_details[tax_ids][0][value]'], b['line_items[0][tax_code]'], b['line_items[0][tax_behavior]']]; })(),
  ['DE', 'eu_vat', 'DE123456789', 'txcd_20030000', 'exclusive']);
eq('calculation parse: Cyprus 19 % on €149', parseTaxCalculation({ amount_total: 17731, tax_amount_exclusive: 2831, tax_amount_inclusive: 0, tax_breakdown: [{ taxability_reason: 'standard_rated', tax_rate_details: { percentage_decimal: '19.0' } }] }),
  { amountTotal: 17731, taxAmount: 2831, reasons: ['standard_rated'], ratePercent: 19 });
eq('calculation parse: reverse charge', parseTaxCalculation({ amount_total: 14900, tax_amount_exclusive: 0, tax_amount_inclusive: 0, tax_breakdown: [{ taxability_reason: 'reverse_charge', tax_rate_details: { percentage_decimal: '0.0' } }] }),
  { amountTotal: 14900, taxAmount: 0, reasons: ['reverse_charge'], ratePercent: null });

report('vat-record');
