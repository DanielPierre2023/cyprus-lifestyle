// lib/vat/record.ts
// ============================================================================
// After Stripe confirms a payment: store what was ACTUALLY charged (subtotal / VAT / total, billing country, invoice id)
// on the order and compare it with what we EXPECTED (lib/vat/treatment.ts). A mismatch is written to ad_orders.vat_alert and
// to the error log, so it surfaces in Admin → VAT check on the very first order instead of at the VAT return.
//
// Strictly best-effort: it runs AFTER the order was marked paid, never throws, and never changes the webhook's response.
// ============================================================================
import type { SupabaseClient } from '@supabase/supabase-js';
import { evaluateVatOutcome } from '@/lib/vat/outcome';
import type { VatExpectation } from '@/lib/vat/treatment';
import { logServerError } from '@/lib/monitor.server';

const cents = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v) / 100 : null);
const rec = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

export interface VatRecord {
  patch: Record<string, unknown>;
  alert: string | null;
}

/** Pure: derive the columns to store and the alert (if any) from the order row and the Stripe Checkout Session object. */
export function computeVatRecord(order: Record<string, unknown>, session: Record<string, unknown>): VatRecord {
  const details = rec(session.customer_details);
  const amountTax = cents(rec(session.total_details).amount_tax);
  const billingCountry = (rec(details.address).country as string | undefined) || null;
  const invoice = typeof session.invoice === 'string' ? session.invoice : null;

  const patch: Record<string, unknown> = {
    amount_subtotal: cents(session.amount_subtotal),
    amount_tax: amountTax,
    amount_total: cents(session.amount_total),
    billing_country: billingCountry,
    stripe_invoice_id: invoice,
  };

  // Orders created before VAT handling existed have no expectation: store the figures, raise nothing.
  const expectation = (order.vat_expectation as VatExpectation | null | undefined) || null;
  const automatic = rec(session.automatic_tax).enabled;
  const alert = expectation
    ? evaluateVatOutcome({
        expectation,
        amountTax,
        validatedCountry: (order.buyer_country as string | null | undefined) ?? null,
        billingCountry,
        automaticTax: typeof automatic === 'boolean' ? automatic : null,
      })
    : null;
  if (alert) patch.vat_alert = alert;
  return { patch, alert };
}

/** Persist the record. Never throws. Missing columns (migration not yet applied) are logged once, not fatal. */
export async function recordVatOutcome(sb: SupabaseClient, order: Record<string, unknown>, session: Record<string, unknown>): Promise<void> {
  try {
    const { patch, alert } = computeVatRecord(order, session);
    const { error } = await sb.from('ad_orders').update(patch).eq('id', order.id as string);
    if (error) {
      await logServerError('vat-record', new Error(`could not store VAT figures: ${error.message}`.slice(0, 300)), { orderId: String(order.id || '') }, 'warn');
      return;
    }
    if (alert) await logServerError('vat-check', new Error(alert), { orderId: String(order.id || ''), expectation: String(order.vat_expectation || '') }, 'warn');
  } catch (e) {
    await logServerError('vat-record', e, { orderId: String(order.id || '') }, 'warn');
  }
}
