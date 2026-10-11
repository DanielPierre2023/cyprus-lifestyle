// The admin "VAT check": the scenario list, how Stripe's answers are judged, and the config status.
import { buildScenarios, toCalcInput, judgeScenario, resultFrom, resultFromError, summarise, tidyStripeError, type VatScenario } from '@/lib/vat/scenarios';
import { vatConfigStatus, stripeKeyMode } from '@/lib/vat/status';
import type { TaxCalcResult } from '@/lib/stripe';
import { eq, ok, report } from './_harness';

const S = (id: string): VatScenario => buildScenarios({}).find((s) => s.id === id)!;
const R = (amountTotal: number, taxAmount: number, reasons: string[], ratePercent: number | null = null): TaxCalcResult => ({ amountTotal, taxAmount, reasons, ratePercent });

// ── the scenario list encodes the agreed rules ───────────────────────────────
{
  const all = buildScenarios({});
  eq('six scenarios', all.map((s) => s.id), ['ad-cy-company', 'ad-de-company', 'ad-de-no-number', 'ad-us-company', 'member-cy', 'member-gr']);
  eq('expectations follow the VAT rules', all.map((s) => s.expectation), ['domestic_vat', 'reverse_charge', 'vat_charged_eu', 'outside_eu', 'domestic_vat', 'vat_charged_eu']);
  eq('member amount defaults to €19', S('member-cy').amount, 1900);
  eq('member amount follows MEMBERSHIP_PRICE_EUR', buildScenarios({ MEMBERSHIP_PRICE_EUR: '25' }).find((s) => s.id === 'member-gr')!.amount, 2500);
  eq('nonsense price falls back to €19', buildScenarios({ MEMBERSHIP_PRICE_EUR: 'abc' }).find((s) => s.id === 'member-gr')!.amount, 1900);
  eq('ad sample price', S('ad-cy-company').amount, 14900);
}

// ── what is sent to Stripe Tax mirrors the real checkouts ────────────────────
{
  eq('ad: exclusive + services code + vat id', toCalcInput(S('ad-de-company')), { currency: 'eur', country: 'DE', euVatId: 'DE123456789', lines: [{ amount: 14900, reference: 'ad-de-company', taxCode: 'txcd_20030000', taxBehavior: 'exclusive' }] });
  eq('membership: inclusive + ESS code, no vat id', toCalcInput(S('member-gr')), { currency: 'eur', country: 'GR', euVatId: undefined, lines: [{ amount: 1900, reference: 'member-gr', taxCode: 'txcd_10000000', taxBehavior: 'inclusive' }] });
}

// ── advertising: VAT is ADDED ON TOP for Cyprus / treated-as-private buyers ──
{
  const v = judgeScenario(S('ad-cy-company'), R(17731, 2831, ['standard_rated'], 19));
  ok('CY company: €149 + 19% passes', v.ok);
  eq('CY company headline shows the arithmetic', v.headline, '€149.00 + VAT €28.31 (19%) = €177.31');
  const none = judgeScenario(S('ad-cy-company'), R(14900, 0, ['not_collecting']));
  ok('CY company: no VAT fails', !none.ok);
  ok('…and tells the owner to register Cyprus', /Registrations/.test(none.detail) && /Cyprus/.test(none.detail));
  const noSetup = judgeScenario(S('ad-de-no-number'), R(14900, 0, ['standard_rated']));
  ok('unexplained zero VAT also fails, pointing at Tax settings', !noSetup.ok && /Tax → Settings/.test(noSetup.detail));
}
{
  ok('DE company without number: Cyprus VAT passes', judgeScenario(S('ad-de-no-number'), R(17731, 2831, ['standard_rated'], 19)).ok);
  ok('DE company without number: zero VAT fails (would lose tax)', !judgeScenario(S('ad-de-no-number'), R(14900, 0, ['reverse_charge'])).ok);
}

// ── reverse charge: EU company with a verified VAT number pays NO VAT ────────
{
  const v = judgeScenario(S('ad-de-company'), R(14900, 0, ['reverse_charge']));
  ok('DE company with VAT number: €149.00, no VAT passes', v.ok && /no VAT/.test(v.headline));
  const unexpected = judgeScenario(S('ad-de-company'), R(14900, 0, ['not_collecting']));
  ok('zero VAT but a different reason still passes, with a note about the invoice wording', unexpected.ok && /reverse-charge note/.test(unexpected.detail));
  const wrong = judgeScenario(S('ad-de-company'), R(17731, 2831, ['standard_rated'], 19));
  ok('VAT charged to a verified EU company fails', !wrong.ok && /was added although/.test(wrong.headline));
}

// ── outside the EU ───────────────────────────────────────────────────────────
{
  ok('US company: no VAT passes', judgeScenario(S('ad-us-company'), R(14900, 0, ['not_collecting'])).ok);
  ok('US company charged tax fails', !judgeScenario(S('ad-us-company'), R(17731, 2831, ['standard_rated'], 19)).ok);
}

// ── membership: the €19 is the final price, VAT is inside ────────────────────
{
  const cy = judgeScenario(S('member-cy'), R(1900, 303, ['standard_rated'], 19));
  ok('CY member: VAT inside the €19 passes', cy.ok);
  eq('CY member headline', cy.headline, 'VAT €3.03 (19%) is inside the €19.00');
  ok('GR member at the Greek rate (OSS) passes', judgeScenario(S('member-gr'), R(1900, 368, ['standard_rated'], 24)).ok);
  ok('GR member at the Cyprus rate (small-seller option) passes', judgeScenario(S('member-gr'), R(1900, 303, ['standard_rated'], 19)).ok);
  const moved = judgeScenario(S('member-gr'), R(2356, 456, ['standard_rated'], 24));
  ok('price pushed above €19 fails', !moved.ok && /Price changed/.test(moved.headline) && /INCLUSIVE/.test(moved.detail));
  const none = judgeScenario(S('member-gr'), R(1900, 0, ['not_collecting']));
  ok('no VAT inside the €19 fails, hints OSS', !none.ok && /OSS/.test(none.detail));
  ok('non-adding totals fail', !judgeScenario(S('ad-cy-company'), R(17000, 2831, ['standard_rated'], 19)).ok);
}

// ── results, errors, summary ─────────────────────────────────────────────────
{
  const good = resultFrom(S('ad-cy-company'), R(17731, 2831, ['standard_rated'], 19));
  eq('result carries the figures', [good.net, good.tax, good.total, good.ratePercent, good.ok], [14900, 2831, 17731, 19, true]);
  const member = resultFrom(S('member-cy'), R(1900, 303, ['standard_rated'], 19));
  eq('membership net = price minus the VAT inside it', member.net, 1597);
  const bad = resultFromError(S('ad-cy-company'), 'You must provide a head office address in your Tax settings.');
  ok('Stripe error → FAIL with a how-to-fix hint', !bad.ok && /Tax → Settings/.test(bad.detail) && bad.error !== undefined);
  ok('unknown Stripe error text is passed through', tidyStripeError('boom') === 'boom');
  ok('bad key hint', /STRIPE_SECRET_KEY/.test(tidyStripeError('Invalid API Key provided: sk_test_***')));
  eq('summary counts', summarise([good, bad, member]), { pass: 2, fail: 1, ready: false });
  eq('all pass → ready', summarise([good, member]).ready, true);
  eq('nothing run → not ready', summarise([]).ready, false);
}

// ── configuration status (no secrets leave this function) ────────────────────
{
  eq('key modes', [stripeKeyMode('sk_test_abc'), stripeKeyMode('rk_live_abc'), stripeKeyMode('whatever'), stripeKeyMode(undefined)], ['test', 'live', 'unknown', 'unknown']);
  const none = vatConfigStatus({});
  ok('no Stripe key → says so', !none.stripeConfigured && none.warnings.some((w) => /STRIPE_SECRET_KEY/.test(w)));
  const off = vatConfigStatus({ STRIPE_SECRET_KEY: 'sk_test_x' });
  ok('VAT OFF is flagged', off.stripeMode === 'test' && !off.automaticTax && off.warnings.some((w) => /AUTOMATIC_TAX is OFF/.test(w)));
  const live = vatConfigStatus({ STRIPE_SECRET_KEY: 'sk_live_x' });
  ok('live key with VAT off gets the extra warning', live.warnings.some((w) => /LIVE Stripe key/.test(w)));
  const fine = vatConfigStatus({ STRIPE_SECRET_KEY: 'sk_live_x', STRIPE_AUTOMATIC_TAX: '1', VIES_REQUESTER_VAT: 'CY12345678Z', SELLER_COUNTRY: 'cy', MEMBERSHIP_INTERVAL: 'year', MEMBERSHIP_PRICE_EUR: '190' });
  eq('fully configured → nothing to flag', [fine.warnings, fine.automaticTax, fine.viesRequesterConfigured, fine.sellerCountry, fine.membershipInterval, fine.membershipPriceEur], [[], true, true, 'CY', 'year', 190]);
  ok('missing VIES requester is flagged', vatConfigStatus({ STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_AUTOMATIC_TAX: '1' }).warnings.some((w) => /VIES_REQUESTER_VAT/.test(w)));
  ok('the status never contains the key', !JSON.stringify(vatConfigStatus({ STRIPE_SECRET_KEY: 'sk_live_SECRETVALUE' })).includes('SECRETVALUE'));
  ok('bad seller country is flagged', vatConfigStatus({ SELLER_COUNTRY: 'Cyprus' }).warnings.some((w) => /SELLER_COUNTRY/.test(w)));
}

report('vat-scenarios');
