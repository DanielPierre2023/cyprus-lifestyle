// The advertiser payment-failed e-mail: seven editions, same shape, no card data, no promise the code does not keep.
import { PAYMENT_FAILED_COPY, paymentFailedMail } from '@/lib/advertise/paymentFailedMail';
import { LOCALES } from '@/lib/locales';
import { portalLoginUrl } from '@/lib/stripe';
import { eq, ok, report } from './_harness';

const keys = Object.keys(PAYMENT_FAILED_COPY.en).sort();
for (const l of LOCALES) {
  const c = PAYMENT_FAILED_COPY[l];
  eq(`${l}: same keys as English`, Object.keys(c).sort(), keys);
  ok(`${l}: no empty text`, Object.values(c).every((v) => v.trim().length > 10));
  ok(`${l}: no link or token in the copy`, !Object.values(c).some((v) => /https?:|\{\w+\}/.test(v)));
}
const m = paymentFailedMail('xx');
ok('unknown locale falls back to English', m.subject === PAYMENT_FAILED_COPY.en.subject);
ok('html is the branded layout with the heading', m.html.includes('Cyprus') && m.html.includes(PAYMENT_FAILED_COPY.en.heading));
ok('arabic edition is right-to-left', paymentFailedMail('ar').html.includes('dir="rtl"'));
const withLink = paymentFailedMail('de', 'https://billing.stripe.com/p/login/test_abc');
ok('with a login address: button + link text', withLink.html.includes('https://billing.stripe.com/p/login/test_abc') && withLink.html.includes(PAYMENT_FAILED_COPY.de.cta) && withLink.html.includes('Anmeldelink'));
ok('without it: reply wording, no button', !m.html.includes('billing.stripe.com') && m.html.includes('reply to this e-mail'));
eq('login url accepted only on Stripe\'s hosted domain', [portalLoginUrl({ STRIPE_PORTAL_LOGIN_URL: 'https://billing.stripe.com/p/login/abc123' }), portalLoginUrl({ STRIPE_PORTAL_LOGIN_URL: 'https://evil.example/p/login/abc' }), portalLoginUrl({})], ['https://billing.stripe.com/p/login/abc123', undefined, undefined]);
report('advertise.paymentFailedMail');
