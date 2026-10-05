// DSAR acknowledgement (lib/privacy/ack.ts): abuse guards + content safety, and the new API error codes.
import { buildDsarAck, dsarReference, shouldSendDsarAck, dsarAckSince, DSAR_ACK_WINDOW_MS } from '../../lib/privacy/ack';
import { API_ERROR_CODES, errorBody, keyedErrorBody, codedError, errorMessage } from '../../lib/i18n/apiErrors';
import { claimMessages, otpWrongLeftMessage, dsarReceivedMessage } from '../../lib/i18n/notices';
import { LOCALES } from '../../lib/locales';
import { eq, ok, report } from './_harness';

// reference: derived from our own uuid only
eq('reference from uuid', dsarReference('1a2b3c4d-1111-2222-3333-444455556666'), 'DSAR-1A2B3C4D');
eq('reference empty on garbage', dsarReference('zz'), '');
eq('reference empty on blank', dsarReference(''), '');

// send decision: once per address per window; fail closed when the lookup failed
ok('first request in window -> ack', shouldSendDsarAck({ priorInWindow: 0, reference: 'DSAR-1A2B3C4D' }));
ok('repeat inside window -> no ack', !shouldSendDsarAck({ priorInWindow: 1, reference: 'DSAR-1A2B3C4D' }));
ok('lookup failed -> no ack', !shouldSendDsarAck({ priorInWindow: null, reference: 'DSAR-1A2B3C4D' }));
ok('no stored row -> no ack', !shouldSendDsarAck({ priorInWindow: 0, reference: '' }));
eq('window is 24h', DSAR_ACK_WINDOW_MS, 86400000);
eq('window start', dsarAckSince(Date.UTC(2026, 9, 5, 12)), '2026-10-04T12:00:00.000Z');

// content: fixed, localised, no user data, no links
for (const l of LOCALES) {
  const a = buildDsarAck(l, 'DSAR-1A2B3C4D');
  ok(`${l}: subject single line, non-empty`, a.subject.length > 5 && !/[\r\n]/.test(a.subject));
  ok(`${l}: reference present`, a.html.includes('DSAR-1A2B3C4D'));
  ok(`${l}: dsar received message`, dsarReceivedMessage(l).length > 10);
}
ok('reference is escaped', buildDsarAck('en', '<script>').html.includes('&lt;script&gt;') && !buildDsarAck('en', '<script>').html.includes('<script>'));
ok('ar mail is rtl', buildDsarAck('ar', 'DSAR-1').html.includes('dir="rtl"'));

// API error codes
for (const c of API_ERROR_CODES) {
  for (const l of LOCALES) ok(`code ${c}/${l} has text`, errorMessage(c, l).trim().length > 3);
  ok(`code ${c}: non-en differs from en`, LOCALES.filter((l) => l !== 'en').every((l) => errorMessage(c, l) !== errorMessage(c, 'en')));
}
eq('English texts unchanged: contact', errorMessage('contact_fields_required', 'en'), 'name, a valid email and a message are required');
eq('English texts unchanged: comment', errorMessage('comment_fields_required'), 'post_id, author_name and content are required');
eq('English texts unchanged: review', errorMessage('review_too_short', 'xx'), 'Review is too short.');
eq('errorBody shape', errorBody('rate_limited', 'en'), { ok: false, code: 'rate_limited', error: 'Too many requests — please wait a moment.' });
eq('keyed body keeps the machine key in error', keyedErrorBody('rate_limited', 'busy', 'el').error, 'busy');
eq('keyed body adds code + localised message', keyedErrorBody('rate_limited', 'busy', 'el').message, errorMessage('rate_limited', 'el'));
eq('coded body keeps verbatim error', codedError('save_failed', 'duplicate key'), { ok: false, code: 'save_failed', error: 'duplicate key' });

// claim / OTP messages
const en = claimMessages('en');
ok('en generic claim text unchanged', en.generic.startsWith("Thanks — we've started verifying your claim."));
ok('en owner text unchanged', en.ownerGeneric.startsWith("Thanks — if this listing is a verified owner profile"));
eq('en otp left plural 1', otpWrongLeftMessage('en', 1), 'That code is not correct. 1 attempt left.');
eq('en otp left plural 3', otpWrongLeftMessage('en', 3), 'That code is not correct. 3 attempts left.');
ok('ru otp few', otpWrongLeftMessage('ru', 2).includes('Осталось 2 попытки'));
ok('pl otp many', otpWrongLeftMessage('pl', 5).includes('Pozostało 5 prób'));
for (const l of LOCALES) {
  const m = claimMessages(l);
  ok(`${l}: claim messages complete`, [m.generic, m.already, m.otpSent, m.ownerGeneric, m.otpExpired, m.otpLocked, m.otpWrong, m.otpWrongLeft.other].every((s) => s.trim().length > 5));
  if (l !== 'en') ok(`${l}: claim messages differ from en`, m.generic !== en.generic && m.otpWrong !== en.otpWrong);
}
report('dsar.ack+api-errors');
