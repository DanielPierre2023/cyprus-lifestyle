// lib/vat/treatment.ts
// ============================================================================
// The VAT rules the business has decided on, written down once, in one pure function.
// (Stripe Tax computes the actual amounts; this states what we EXPECT it to do — used to
//  (a) explain the outcome in the UI/docs, (b) store the expectation on the order, and
//  (c) detect a mis-configured Stripe account on the very first live order.)
//
//   Seller = a Cyprus company (SELLER_COUNTRY).
//   1. Buyer outside the EU                                → no EU VAT.
//   2. Buyer in the seller's country (Cyprus)              → Cyprus VAT — even a company with a valid CY VAT number
//                                                            (a domestic supply is never a reverse charge).
//   3. Buyer in another EU country + VAT number VERIFIED   → reverse charge: no VAT on the invoice.
//   4. Buyer in another EU country, no verified number     → treated as a private person: Cyprus VAT
//                                                            (services to non-taxable persons are taxed at the supplier's place).
// ============================================================================
import { SELLER_COUNTRY, isEuMemberState } from '@/lib/vat/countries';

/** What the VIES check said, from the checkout's point of view. */
export type VatCheck = 'none' | 'valid' | 'invalid' | 'unavailable';

export type VatExpectation = 'reverse_charge' | 'domestic_vat' | 'vat_charged_eu' | 'outside_eu';

export function expectedTreatment(args: { buyerCountry: string; check: VatCheck; sellerCountry?: string }): VatExpectation {
  const buyer = String(args.buyerCountry || '').toUpperCase();
  const seller = (args.sellerCountry || SELLER_COUNTRY).toUpperCase();
  if (!isEuMemberState(buyer)) return 'outside_eu';
  if (buyer === seller) return 'domestic_vat';
  return args.check === 'valid' ? 'reverse_charge' : 'vat_charged_eu';
}

/** True when the buyer's tax-ID may be attached to the Stripe customer (only a VIES-confirmed EU number). */
export function mayAttachVatId(check: VatCheck, buyerCountry: string): boolean {
  return check === 'valid' && isEuMemberState(buyerCountry);
}
