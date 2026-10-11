// lib/vat/products.ts — how each kind of product is taxed. One place, used by the checkout routes AND by the
// admin self-check (so the check tests exactly what customers experience).
//
//  • Advertising / listings / sponsorships are B2B services: "General - Services" (txcd_20030000). Stripe's own
//    description of this code: "EU only: business-to-consumer sales are taxable at origin; business-to-business are
//    taxable at destination" — i.e. a business in another member state with a valid VAT number → reverse charge;
//    anyone else in the EU → VAT of the seller's country. Prices are shown WITHOUT VAT; VAT is added on top.
//  • The concierge membership is an online subscription to a consumer service: "Electronically Supplied Services"
//    (txcd_10000000), taxed where the consumer lives. The €19 is the final price: VAT is INCLUDED.
export const TAX_CODE_SERVICES = 'txcd_20030000';
export const TAX_CODE_ESS = 'txcd_10000000';

export const AD_TAX = { taxCode: TAX_CODE_SERVICES, taxBehavior: 'exclusive' } as const;
export const MEMBERSHIP_TAX = { taxCode: TAX_CODE_ESS, taxBehavior: 'inclusive' } as const;
