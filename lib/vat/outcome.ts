// lib/vat/outcome.ts
// ============================================================================
// Compare what Stripe Tax actually did with what we expected (lib/vat/treatment.ts). Pure.
// A mismatch means the Stripe account is mis-configured (missing Cyprus registration, wrong tax code,
// automatic tax off, address changed in Checkout …) — it is recorded on the order and raised in the admin
// the first time it happens, instead of being discovered at the VAT return.
// ============================================================================
import type { VatExpectation } from '@/lib/vat/treatment';

export interface VatOutcomeInput {
  expectation: VatExpectation | null | undefined;
  /** tax amount Stripe charged, in major units (euros). null = Stripe returned no tax figure. */
  amountTax: number | null;
  /** the country the buyer chose (and, for reverse charge, whose VAT number we verified) */
  validatedCountry: string | null | undefined;
  /** the billing country the buyer finally entered on Stripe's page */
  billingCountry: string | null | undefined;
  /** was Stripe Tax switched on for this session */
  automaticTax: boolean | null | undefined;
}

/** null = outcome is as expected; otherwise a short human-readable alert for the admin. */
export function evaluateVatOutcome(i: VatOutcomeInput): string | null {
  if (!i.expectation) return 'No VAT expectation was recorded for this order (created before VAT handling existed).';
  if (i.automaticTax === false) return 'Stripe Tax was OFF for this checkout (STRIPE_AUTOMATIC_TAX is not enabled): no VAT was calculated.';
  if (i.amountTax == null) return 'Stripe returned no tax amount for this order.';

  const taxed = i.amountTax > 0;
  const v = (i.validatedCountry || '').toUpperCase();
  const b = (i.billingCountry || '').toUpperCase();

  switch (i.expectation) {
    case 'reverse_charge':
      if (taxed) return 'Expected a reverse charge (0 VAT) for a verified EU VAT number, but Stripe charged VAT.';
      if (v && b && v !== b) return `Reverse charge applied, but the billing country (${b}) differs from the country of the verified VAT number (${v}) — review before relying on the zero VAT.`;
      return null;
    case 'domestic_vat':
      return taxed ? null : 'Expected Cyprus VAT for a Cypriot buyer, but no VAT was charged — is the Cyprus VAT registration added in Stripe Tax?';
    case 'vat_charged_eu':
      return taxed ? null : 'Expected VAT for an EU buyer without a verified VAT number, but none was charged — check the Stripe Tax registrations and tax code.';
    case 'outside_eu':
      return taxed ? 'A buyer outside the EU was charged VAT — check the billing country and the Stripe Tax settings.' : null;
  }
}
