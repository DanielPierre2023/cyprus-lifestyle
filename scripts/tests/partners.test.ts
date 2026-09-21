// Partner self-service pure logic (roadmap item 09): edit sanitization and the
// anti-spoofing email/domain match. The DB apply function's whitelist is verified
// separately against fixtures.
import { sanitizeEdit, emailMatchesListing, EDITABLE_FIELDS } from '@/lib/partners/claims';
import { eq, ok, report } from './_harness';

// sanitizeEdit — only whitelisted keys survive; the dangerous ones are dropped.
const clean = sanitizeEdit({ phone: ' +357 99 123456 ', summary_en: 'A lovely spot', featured: true, status: 'archived', rating: '5', junk: 'x' });
eq('keeps whitelisted phone (trimmed)', clean.phone, '+357 99 123456');
eq('keeps whitelisted summary', clean.summary_en, 'A lovely spot');
ok('drops featured', !('featured' in clean));
ok('drops status', !('status' in clean));
ok('drops rating', !('rating' in clean));
ok('drops unknown key', !('junk' in (clean as Record<string, unknown>)));
eq('empty/whitespace values dropped', sanitizeEdit({ phone: '   ', url: '' }), {});
ok('long summary capped', (sanitizeEdit({ summary_en: 'x'.repeat(2000) }).summary_en || '').length <= 800);
ok('whitelist matches expected size', EDITABLE_FIELDS.length === 11);

// emailMatchesListing — anti-spoofing.
ok('exact on-file email matches', emailMatchesListing('info@biz.com', 'info@biz.com', null));
ok('same email domain matches', emailMatchesListing('owner@biz.com', 'info@biz.com', null));
ok('website domain matches', emailMatchesListing('owner@biz.com', null, 'https://www.biz.com/contact'));
ok('subdomain of site host matches', emailMatchesListing('me@mail.biz.com', null, 'https://biz.com'));
ok('unrelated domain is rejected', !emailMatchesListing('random@gmail.com', 'info@biz.com', 'https://biz.com'));
ok('malformed email rejected', !emailMatchesListing('not-an-email', 'info@biz.com', 'https://biz.com'));
ok('no on-file contact → cannot match', !emailMatchesListing('owner@biz.com', null, null));

report('partners.claims');
