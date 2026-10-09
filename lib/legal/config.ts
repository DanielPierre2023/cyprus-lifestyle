// lib/legal/config.ts — the single place that names the business behind Cyprus Lifestyle in the legal pages.
//
// OWNER DECISION (increment 8.1): the company is published as ADD Individual Solutions Ltd, reg. HE 439793, Pyla,
// Cyprus — with NO street address and NO VAT number. Cyprus / EU e-commerce rules normally also ask the provider to
// publish its establishment (geographic) address and, if VAT-registered, its VAT number; a lawyer should confirm.
// Adding them later is a ONE-LINE change: set LEGAL_ADDRESS and/or LEGAL_VAT_NUMBER below (or the matching env
// variables on Vercel). Legal Notice (and only that page) then prints them; no text needs rewriting.

export const LEGAL = {
  company: 'ADD Individual Solutions Ltd',
  registration: 'HE 439793',
  registerName: 'Registrar of Companies, Republic of Cyprus',
  town: 'Pyla',
  country: 'Cyprus',
  site: 'cypruslifestyle.eu',
  emailGeneral: 'hello@cypruslifestyle.eu',
  emailPrivacy: 'privacy@cypruslifestyle.eu',
  emailAdvertise: 'advertise@cypruslifestyle.eu',
  /** Street address — intentionally NOT published (owner decision). Set to publish it in the Legal Notice. */
  address: process.env.NEXT_PUBLIC_LEGAL_ADDRESS || '',
  /** VAT number — intentionally NOT published (owner decision). Set to publish it in the Legal Notice. */
  vatNumber: process.env.NEXT_PUBLIC_LEGAL_VAT_NUMBER || '',
  /** Date the four legal texts were last revised (ISO). Bump it whenever a text changes. */
  updated: '2026-10-09',
} as const;

export const MEMBERSHIP_PRICE_EUR = '19';

/** The tokens the texts may use, e.g. "{company}". Resolved at render time (see lib/legal/index.ts). */
export function legalTokens(): Record<string, string> {
  return {
    company: LEGAL.company,
    reg: LEGAL.registration,
    town: LEGAL.town,
    site: LEGAL.site,
    mail: LEGAL.emailGeneral,
    privacy_mail: LEGAL.emailPrivacy,
    ads_mail: LEGAL.emailAdvertise,
    price: MEMBERSHIP_PRICE_EUR,
  };
}
