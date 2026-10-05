// VAT rules — the business decisions, as executable specification.
//   (1) EU company (other member state) + valid VAT number → NO VAT (reverse charge)
//   (2) Cypriot company → pays VAT like a private person (even with a valid CY VAT number)
import { normalizeVatInput, parseVatForCountry } from '@/lib/vat/parse';
import { expectedTreatment, mayAttachVatId } from '@/lib/vat/treatment';
import { evaluateVatOutcome } from '@/lib/vat/outcome';
import { COUNTRY_CODES, EU_VAT_PREFIX, isEuMemberState, vatPrefixOf, isCountryCode } from '@/lib/vat/countries';
import { eq, ok, report } from './_harness';

// ── countries ────────────────────────────────────────────────────────────────
eq('249 ISO country codes, unique', new Set(COUNTRY_CODES).size, 249);
eq('27 EU member states', Object.keys(EU_VAT_PREFIX).length, 27);
eq('Greece uses the VIES prefix EL', vatPrefixOf('GR'), 'EL');
eq('prefix lookup is case-insensitive', vatPrefixOf('de'), 'DE');
ok('Cyprus is an EU member state', isEuMemberState('CY'));
ok('United Kingdom is NOT (post-Brexit)', !isEuMemberState('GB'));
ok('Northern Ireland (XI) is not treated as EU for services', !isEuMemberState('XI'));
ok('every EU member state is a valid ISO code', Object.keys(EU_VAT_PREFIX).every((c) => COUNTRY_CODES.includes(c)));
ok('isCountryCode accepts lower case, rejects junk', isCountryCode('cy') && !isCountryCode('ZZ') && !isCountryCode(5));

// ── parsing what the buyer typed ─────────────────────────────────────────────
eq('normalise: spaces, dots, dashes, case', normalizeVatInput(' de 123.456-789 '), 'DE123456789');
eq('with prefix', parseVatForCountry('DE', 'DE123456789'), { ok: true, prefix: 'DE', number: '123456789', display: 'DE123456789' });
eq('without prefix', parseVatForCountry('DE', '123 456 789'), { ok: true, prefix: 'DE', number: '123456789', display: 'DE123456789' });
eq('Greece: country GR → prefix EL, typed with EL', parseVatForCountry('GR', 'EL094259216'), { ok: true, prefix: 'EL', number: '094259216', display: 'EL094259216' });
eq('Greece: the natural GR prefix is accepted and converted to EL', parseVatForCountry('GR', 'GR094259216'), { ok: true, prefix: 'EL', number: '094259216', display: 'EL094259216' });
eq('GR typed for a French buyer is a mismatch', parseVatForCountry('FR', 'GR094259216'), { ok: false, reason: 'prefix_mismatch' });
eq('Greece: typed without prefix', parseVatForCountry('GR', '094259216'), { ok: true, prefix: 'EL', number: '094259216', display: 'EL094259216' });
eq('another member state’s prefix is a mismatch', parseVatForCountry('FR', 'DE123456789'), { ok: false, reason: 'prefix_mismatch' });
eq('Spanish number starting with a letter, no prefix (not mistaken for a prefix)', parseVatForCountry('ES', 'A12345678').ok, true);
eq('Cyprus format', parseVatForCountry('CY', 'cy-12345678z'), { ok: true, prefix: 'CY', number: '12345678Z', display: 'CY12345678Z' });
eq('empty', parseVatForCountry('DE', '  .-  '), { ok: false, reason: 'empty' });
eq('non-EU country has no VIES number', parseVatForCountry('US', '123456789'), { ok: false, reason: 'not_eu_country' });
eq('absurdly short', parseVatForCountry('DE', 'DE1'), { ok: false, reason: 'format' });
eq('absurdly long', parseVatForCountry('DE', 'DE' + '1'.repeat(30)), { ok: false, reason: 'format' });

// ── THE TWO RULES ────────────────────────────────────────────────────────────
// Rule 1: EU company in another member state with a VALID VAT number → no VAT.
for (const c of ['DE', 'GR', 'RO', 'PL', 'FR', 'NL', 'IE']) {
  eq(`${c} company + verified VAT number → reverse charge`, expectedTreatment({ buyerCountry: c, check: 'valid' }), 'reverse_charge');
}
// Rule 2: Cypriot company pays VAT as a private subscriber — with or without a (valid) CY VAT number.
eq('CY company with a VALID CY VAT number → still domestic VAT', expectedTreatment({ buyerCountry: 'CY', check: 'valid' }), 'domestic_vat');
eq('CY company without VAT number → domestic VAT', expectedTreatment({ buyerCountry: 'CY', check: 'none' }), 'domestic_vat');
eq('CY with an INVALID number → domestic VAT', expectedTreatment({ buyerCountry: 'CY', check: 'invalid' }), 'domestic_vat');
// Everything else.
eq('DE buyer, no VAT number → treated as private person: VAT charged', expectedTreatment({ buyerCountry: 'DE', check: 'none' }), 'vat_charged_eu');
eq('DE buyer, number could NOT be verified → VAT charged (never zero on trust)', expectedTreatment({ buyerCountry: 'DE', check: 'unavailable' }), 'vat_charged_eu');
eq('DE buyer, number invalid → VAT charged', expectedTreatment({ buyerCountry: 'DE', check: 'invalid' }), 'vat_charged_eu');
eq('US buyer → outside the EU, no EU VAT', expectedTreatment({ buyerCountry: 'US', check: 'none' }), 'outside_eu');
eq('UK buyer → outside the EU', expectedTreatment({ buyerCountry: 'GB', check: 'none' }), 'outside_eu');
eq('a "valid" EU number from a NON-EU country is ignored', expectedTreatment({ buyerCountry: 'GB', check: 'valid' }), 'outside_eu');
eq('seller country is configurable (a DE seller: DE buyer is domestic)', expectedTreatment({ buyerCountry: 'DE', check: 'valid', sellerCountry: 'DE' }), 'domestic_vat');
eq('lower-case country codes are fine', expectedTreatment({ buyerCountry: 'de', check: 'valid' }), 'reverse_charge');

ok('only a VIES-confirmed EU number may be attached to the Stripe customer', mayAttachVatId('valid', 'DE'));
ok('…never an unverified one', !mayAttachVatId('unavailable', 'DE') && !mayAttachVatId('invalid', 'DE') && !mayAttachVatId('none', 'DE'));
ok('…nor one from outside the EU', !mayAttachVatId('valid', 'US'));

// ── comparing Stripe's result with the expectation ───────────────────────────
const base = { automaticTax: true, validatedCountry: 'DE', billingCountry: 'DE' } as const;
eq('reverse charge, 0 VAT → ok', evaluateVatOutcome({ ...base, expectation: 'reverse_charge', amountTax: 0 }), null);
ok('reverse charge but VAT charged → alert', /reverse charge/i.test(evaluateVatOutcome({ ...base, expectation: 'reverse_charge', amountTax: 28.31 }) || ''));
ok('reverse charge, billing country changed → alert', /differs/.test(evaluateVatOutcome({ ...base, expectation: 'reverse_charge', amountTax: 0, billingCountry: 'US' }) || ''));
eq('domestic VAT, VAT charged → ok', evaluateVatOutcome({ automaticTax: true, expectation: 'domestic_vat', amountTax: 28.31, validatedCountry: 'CY', billingCountry: 'CY' }), null);
ok('domestic VAT but 0 charged → alert mentioning the Cyprus registration', /Cyprus VAT registration/.test(evaluateVatOutcome({ automaticTax: true, expectation: 'domestic_vat', amountTax: 0, validatedCountry: 'CY', billingCountry: 'CY' }) || ''));
eq('EU buyer without number, VAT charged → ok', evaluateVatOutcome({ ...base, expectation: 'vat_charged_eu', amountTax: 28.31 }), null);
ok('EU buyer without number but 0 VAT → alert', evaluateVatOutcome({ ...base, expectation: 'vat_charged_eu', amountTax: 0 }) !== null);
eq('non-EU, 0 VAT → ok', evaluateVatOutcome({ automaticTax: true, expectation: 'outside_eu', amountTax: 0, validatedCountry: 'US', billingCountry: 'US' }), null);
ok('non-EU but VAT charged → alert', evaluateVatOutcome({ automaticTax: true, expectation: 'outside_eu', amountTax: 5, validatedCountry: 'US', billingCountry: 'US' }) !== null);
ok('Stripe Tax OFF → alert', /OFF/.test(evaluateVatOutcome({ ...base, expectation: 'domestic_vat', amountTax: 0, automaticTax: false }) || ''));
ok('missing tax figure → alert', evaluateVatOutcome({ ...base, expectation: 'domestic_vat', amountTax: null }) !== null);
ok('no recorded expectation → alert', evaluateVatOutcome({ ...base, expectation: null, amountTax: 0 }) !== null);

report('vat-rules');
