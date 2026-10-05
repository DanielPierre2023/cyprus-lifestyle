// lib/vat/status.ts
// What the server is currently configured to do about VAT — read from environment variables, never from the
// network, never echoing a secret (only whether a key is a TEST or a LIVE key).
// Used by the admin "VAT check" page and by /api/health.
import { parseRequester } from '@/lib/vat/vies';
import { SELLER_COUNTRY } from '@/lib/vat/countries';
import { automaticTaxEnabled } from '@/lib/stripe';

export interface VatConfigStatus {
  stripeConfigured: boolean;
  stripeMode: 'test' | 'live' | 'unknown';
  automaticTax: boolean;
  sellerCountry: string;
  viesRequesterConfigured: boolean;
  membershipPriceEur: number;
  membershipInterval: 'month' | 'year';
  /** Things the owner should fix before relying on VAT handling. Empty = nothing to flag. */
  warnings: string[];
}

export function stripeKeyMode(key: string | undefined): 'test' | 'live' | 'unknown' {
  const k = String(key || '').trim();
  if (/^(sk|rk)_test_/.test(k)) return 'test';
  if (/^(sk|rk)_live_/.test(k)) return 'live';
  return 'unknown';
}

export function vatConfigStatus(env: Record<string, string | undefined> = process.env): VatConfigStatus {
  const key = env.STRIPE_SECRET_KEY;
  const stripeConfigured = !!(key && key.trim());
  const stripeMode = stripeConfigured ? stripeKeyMode(key) : 'unknown';
  const automaticTax = automaticTaxEnabled(env);
  const seller = (env.SELLER_COUNTRY || SELLER_COUNTRY || 'CY').toUpperCase();
  const viesRequesterConfigured = parseRequester(env.VIES_REQUESTER_VAT) !== null;
  const price = Number(env.MEMBERSHIP_PRICE_EUR || 19);

  const warnings: string[] = [];
  if (!stripeConfigured) warnings.push('STRIPE_SECRET_KEY is not set: no checkout (membership or advertising) can start.');
  else if (!automaticTax) warnings.push('STRIPE_AUTOMATIC_TAX is OFF: checkouts work, but NO VAT is added to anything. Finish docs/VAT-SETUP.md, make every scenario below PASS, then set STRIPE_AUTOMATIC_TAX=1.');
  if (stripeConfigured && stripeMode === 'live' && !automaticTax) warnings.push('You are using a LIVE Stripe key while VAT is off — real customers would be charged without VAT.');
  if (!viesRequesterConfigured) warnings.push('VIES_REQUESTER_VAT is not set: VAT numbers are still verified, but VIES will not return a consultation number to keep as evidence.');
  if (!/^[A-Z]{2}$/.test(seller)) warnings.push(`SELLER_COUNTRY "${seller}" is not a two-letter country code.`);

  return {
    stripeConfigured,
    stripeMode,
    automaticTax,
    sellerCountry: seller,
    viesRequesterConfigured,
    membershipPriceEur: Number.isFinite(price) && price > 0 ? price : 19,
    membershipInterval: env.MEMBERSHIP_INTERVAL === 'year' ? 'year' : 'month',
    warnings,
  };
}
