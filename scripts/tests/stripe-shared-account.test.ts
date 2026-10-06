// The Stripe account is shared with other businesses: Cyprus Lifestyle's terms travel with each Checkout Session.
import { buildCheckoutBody, checkoutTermsMessage, portalConfigurationId } from '@/lib/stripe';
import { eq, ok, report } from './_harness';

const base = { mode: 'subscription' as const, currency: 'eur', unitAmount: 1000, productName: 'x', successUrl: 'https://a.b/s', cancelUrl: 'https://a.b/c' };

const m = String(buildCheckoutBody(base)['custom_text[submit][message]']);
ok('every checkout carries the terms + privacy line', m.includes('/terms)') && m.includes('/privacy)') && m.includes('Cyprus Lifestyle') && m.includes('ADD Individual Solutions Ltd'));
ok('message is within Stripe\'s 1200-character limit', m.length <= 1200);
eq('links follow NEXT_PUBLIC_SITE_URL, trailing slashes stripped', checkoutTermsMessage({ NEXT_PUBLIC_SITE_URL: 'https://example.test///' }).includes('(https://example.test/terms)'), true);
eq('valid bpc_ id is used', portalConfigurationId({ STRIPE_PORTAL_CONFIGURATION_ID: ' bpc_1AbC ' }), 'bpc_1AbC');
eq('invalid id ignored', portalConfigurationId({ STRIPE_PORTAL_CONFIGURATION_ID: 'whsec_x' }), undefined);
eq('unset ignored', portalConfigurationId({}), undefined);
report('stripe-shared-account');
