// lib/vat/scenarios.ts
// ============================================================================
// The admin "VAT check": the buyer situations the business cares about, each with the outcome the VAT rules
// (lib/vat/treatment.ts) say Stripe Tax must produce. The admin page runs them through Stripe Tax's calculation
// endpoint (no payment, nothing stored) and compares — PASS means "a real customer in this situation would be
// taxed the way you decided".
//
// Pure: no I/O. The route (app/api/admin/vat-check) feeds the Stripe answers in.
// The example VAT numbers are FORMAT-valid placeholders: a Stripe calculation does not verify a tax ID against
// VIES (that is done by our own checkout, lib/vat/vies.ts, before Stripe is ever called).
// ============================================================================
import type { TaxCalcInput, TaxCalcResult } from '@/lib/stripe';
import { AD_TAX, MEMBERSHIP_TAX } from '@/lib/vat/products';
import { expectedTreatment, type VatCheck, type VatExpectation } from '@/lib/vat/treatment';

export interface VatScenario {
  id: string;
  title: string;                 // who the buyer is, in plain English
  product: 'ad' | 'membership';
  country: string;               // buyer's billing country (ISO-2)
  vatId?: string;                // placeholder VAT number attached to the simulated customer
  check: VatCheck;               // what our VIES step would have answered
  amount: number;                // minor units: NET price for ads (VAT added on top), FINAL price for the membership
  expectation: VatExpectation;
}

/** Sample advertising price used by the check (the real prices come from `ad_pricing`). */
export const SAMPLE_AD_CENTS = 14900;

export function buildScenarios(env: Record<string, string | undefined> = process.env): VatScenario[] {
  const price = Number(env.MEMBERSHIP_PRICE_EUR || 19);
  const member = Math.round((Number.isFinite(price) && price > 0 ? price : 19) * 100);
  const mk = (s: Omit<VatScenario, 'expectation'>): VatScenario => ({ ...s, expectation: expectedTreatment({ buyerCountry: s.country, check: s.check }) });
  return [
    mk({ id: 'ad-cy-company',   title: 'Cypriot company with a valid Cyprus VAT number buys an ad',        product: 'ad',         country: 'CY', vatId: 'CY12345678Z', check: 'valid', amount: SAMPLE_AD_CENTS }),
    mk({ id: 'ad-de-company',   title: 'German company with a VIES-verified VAT number buys an ad',         product: 'ad',         country: 'DE', vatId: 'DE123456789', check: 'valid', amount: SAMPLE_AD_CENTS }),
    mk({ id: 'ad-de-no-number', title: 'German company WITHOUT a (verified) VAT number buys an ad',         product: 'ad',         country: 'DE',                           check: 'none',  amount: SAMPLE_AD_CENTS }),
    mk({ id: 'ad-us-company',   title: 'US company buys an ad',                                            product: 'ad',         country: 'US',                           check: 'none',  amount: SAMPLE_AD_CENTS }),
    mk({ id: 'member-cy',       title: 'Private person in Cyprus buys the concierge membership',           product: 'membership', country: 'CY',                           check: 'none',  amount: member }),
    mk({ id: 'member-gr',       title: 'Private person in Greece buys the concierge membership',           product: 'membership', country: 'GR',                           check: 'none',  amount: member }),
  ];
}

export function toCalcInput(s: VatScenario): TaxCalcInput {
  const t = s.product === 'ad' ? AD_TAX : MEMBERSHIP_TAX;
  return { currency: 'eur', country: s.country, euVatId: s.vatId, lines: [{ amount: s.amount, reference: s.id, taxCode: t.taxCode, taxBehavior: t.taxBehavior }] };
}

export const EXPECTATION_TEXT: Record<VatExpectation, string> = {
  reverse_charge: 'No VAT on the invoice (reverse charge — the buyer accounts for VAT in their own country)',
  domestic_vat: 'Cyprus VAT is added',
  vat_charged_eu: 'Cyprus VAT is added (treated like a private person)',
  outside_eu: 'No EU VAT (customer outside the EU)',
};

export interface Verdict { ok: boolean; headline: string; detail: string }

const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;
const pct = (r: number | null) => (r == null ? '' : ` (${Number.isInteger(r) ? r : r.toFixed(2).replace(/\.?0+$/, '')}%)`);

/** Compare what Stripe Tax answered with what the rules require. */
export function judgeScenario(s: VatScenario, r: TaxCalcResult): Verdict {
  const inclusive = s.product === 'membership';
  const vatDue = s.expectation === 'domestic_vat' || s.expectation === 'vat_charged_eu';
  const notCollecting = r.reasons.includes('not_collecting');

  // The price shape must be right first: the member price must not move; an ad total must be net + VAT.
  if (inclusive && r.amountTotal !== s.amount) {
    return { ok: false, headline: `Price changed: customer would pay ${eur(r.amountTotal)} instead of ${eur(s.amount)}`, detail: 'The member price must be VAT-INCLUSIVE (the €19 stays €19). The checkout asks Stripe for tax_behavior=inclusive; check that nothing in the Stripe account overrides it.' };
  }
  if (!inclusive && r.amountTotal !== s.amount + r.taxAmount) {
    return { ok: false, headline: `Totals do not add up: ${eur(s.amount)} + VAT ${eur(r.taxAmount)} ≠ ${eur(r.amountTotal)}`, detail: 'Unexpected answer from Stripe Tax — run the check again; if it persists, contact Stripe support with this scenario.' };
  }

  if (vatDue) {
    if (r.taxAmount > 0) {
      return inclusive
        ? { ok: true, headline: `VAT ${eur(r.taxAmount)}${pct(r.ratePercent)} is inside the ${eur(r.amountTotal)}`, detail: `Net ${eur(r.amountTotal - r.taxAmount)} + VAT ${eur(r.taxAmount)}. The customer pays exactly ${eur(r.amountTotal)}.` }
        : { ok: true, headline: `${eur(s.amount)} + VAT ${eur(r.taxAmount)}${pct(r.ratePercent)} = ${eur(r.amountTotal)}`, detail: 'VAT is added on top of the advertised net price, as required.' };
    }
    return {
      ok: false,
      headline: `No VAT was calculated for ${s.country}, but VAT is due`,
      detail: notCollecting
        ? 'Stripe Tax says it is "not collecting" here. In the Stripe Dashboard → Tax → Registrations, add Cyprus (domestic registration)' + (inclusive ? ' and, for private customers in other EU countries, your OSS registration (or the small-seller option)' : '') + ', then run this check again.'
        : 'Check Stripe Dashboard → Tax → Settings (head-office address in Cyprus, default tax code) and → Registrations, then run this check again.',
    };
  }

  if (s.expectation === 'reverse_charge') {
    if (r.taxAmount === 0) {
      return { ok: true, headline: `${eur(r.amountTotal)} — no VAT (reverse charge)`, detail: r.reasons.includes('reverse_charge') ? 'Stripe reports the reverse charge.' : `Stripe reports "${r.reasons.join(', ') || 'no tax'}" instead of "reverse_charge": the amount is right, but check that the invoice shows the reverse-charge note (Stripe → Tax → Settings).` };
    }
    return { ok: false, headline: `VAT ${eur(r.taxAmount)}${pct(r.ratePercent)} was added although the buyer's VAT number is valid`, detail: 'Stripe did not treat the sale as business-to-business. Check Stripe → Tax → Settings (head office must be in Cyprus) and that Cyprus is registered under Registrations; then run this check again.' };
  }

  // outside the EU
  if (r.taxAmount === 0) return { ok: true, headline: `${eur(r.amountTotal)} — no VAT`, detail: 'Customers outside the EU are not charged EU VAT.' };
  return { ok: false, headline: `Tax ${eur(r.taxAmount)} was added for a customer outside the EU`, detail: 'Check Stripe → Tax → Registrations: you should only be registered where you actually owe tax (Cyprus, plus OSS if you opted in).' };
}

export interface ScenarioResult {
  id: string;
  title: string;
  expected: string;
  ok: boolean;
  headline: string;
  detail: string;
  net: number | null;
  tax: number | null;
  total: number | null;
  ratePercent: number | null;
  reasons: string[];
  error?: string;
}

export function resultFrom(s: VatScenario, r: TaxCalcResult): ScenarioResult {
  const v = judgeScenario(s, r);
  return { id: s.id, title: s.title, expected: EXPECTATION_TEXT[s.expectation], ok: v.ok, headline: v.headline, detail: v.detail, net: s.product === 'ad' ? s.amount : r.amountTotal - r.taxAmount, tax: r.taxAmount, total: r.amountTotal, ratePercent: r.ratePercent, reasons: r.reasons };
}

export function resultFromError(s: VatScenario, message: string): ScenarioResult {
  return { id: s.id, title: s.title, expected: EXPECTATION_TEXT[s.expectation], ok: false, headline: 'Stripe could not calculate this scenario', detail: tidyStripeError(message), net: null, tax: null, total: null, ratePercent: null, reasons: [], error: message };
}

/** Plain-English hint for the Stripe errors an unconfigured Tax account produces. */
export function tidyStripeError(message: string): string {
  const m = String(message || '');
  if (/head office|origin address|tax settings|set up stripe tax|not (yet )?(enabled|activated)/i.test(m)) {
    return `${m} — open Stripe Dashboard → Tax → Settings, enter your head-office address (Cyprus) and activate Stripe Tax, then run the check again.`;
  }
  if (/invalid api key|api_key|authentication/i.test(m)) return `${m} — STRIPE_SECRET_KEY is wrong or missing.`;
  if (/permission|restricted/i.test(m)) return `${m} — if you use a restricted key, give it write access to "Tax calculations".`;
  return m;
}

export function summarise(results: ScenarioResult[]): { pass: number; fail: number; ready: boolean } {
  const pass = results.filter((r) => r.ok).length;
  return { pass, fail: results.length - pass, ready: results.length > 0 && pass === results.length };
}
