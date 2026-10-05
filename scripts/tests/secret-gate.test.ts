// Shared-secret gate + Meta webhook signature — the primitives that guard the
// maintenance routes, the edge functions' twin logic, and the WhatsApp webhook.
import { createHmac } from 'node:crypto';
import { safeEqual, extractKeys, matchesSecret, queryKeyAllowed } from '@/lib/auth/secretMatch';
import { verifyMetaSignature } from '@/lib/auth/webhookSignature';
import { eq, ok, report } from './_harness';

// ── safeEqual ────────────────────────────────────────────────────────────────
ok('equal strings match', safeEqual('s3cret-value', 's3cret-value'));
ok('different strings do not match', !safeEqual('s3cret-value', 's3cret-valuf'));
ok('different lengths do not match (and do not throw)', !safeEqual('short', 'a-much-longer-string'));
ok('empty vs non-empty does not match', !safeEqual('', 'x'));

// ── extractKeys ──────────────────────────────────────────────────────────────
eq('header first, then bearer, then query', extractKeys({ header: 'h', authorization: 'Bearer b', query: 'q' }, true), ['h', 'b', 'q']);
eq('query ignored when disabled', extractKeys({ header: null, authorization: null, query: 'q' }, false), []);
eq('non-bearer Authorization ignored', extractKeys({ authorization: 'Basic abc' }, true), []);
eq('whitespace trimmed', extractKeys({ header: '  h  ' }, true), ['h']);
eq('empty bearer ignored', extractKeys({ authorization: 'Bearer    ' }, true), []);

// ── matchesSecret ────────────────────────────────────────────────────────────
ok('any matching candidate authorises', matchesSecret('abc', ['nope', 'abc']));
ok('no matching candidate refuses', !matchesSecret('abc', ['nope', 'also-no']));
ok('no candidates refuses', !matchesSecret('abc', []));
ok('a missing/empty server secret NEVER authorises (fail-closed)', !matchesSecret('', ['']) && !matchesSecret('', ['anything']));

// ── queryKeyAllowed (legacy ?key=) ───────────────────────────────────────────
ok('query key allowed by default', queryKeyAllowed({}));
ok('query key allowed when flag is 0', queryKeyAllowed({ ENRICH_DISABLE_QUERY_KEY: '0' }));
ok('query key disabled by 1', !queryKeyAllowed({ ENRICH_DISABLE_QUERY_KEY: '1' }));
ok('query key disabled by true (case-insensitive)', !queryKeyAllowed({ ENRICH_DISABLE_QUERY_KEY: ' TRUE ' }));

// ── verifyMetaSignature ──────────────────────────────────────────────────────
const secret = 'app-secret-123';
const raw = JSON.stringify({ entry: [{ changes: [{ value: { messages: [{ from: '357', id: 'm1', type: 'text', text: { body: 'hi' } }] } }] }] });
const good = 'sha256=' + createHmac('sha256', secret).update(raw, 'utf8').digest('hex');
ok('valid signature accepted', verifyMetaSignature(raw, good, secret));
ok('tampered body rejected', !verifyMetaSignature(raw + ' ', good, secret));
ok('wrong secret rejected', !verifyMetaSignature(raw, good, 'other-secret'));
ok('missing header rejected', !verifyMetaSignature(raw, null, secret));
ok('empty secret rejected (fail-closed)', !verifyMetaSignature(raw, good, ''));
ok('missing sha256= prefix rejected', !verifyMetaSignature(raw, good.replace('sha256=', ''), secret));
ok('short / non-hex digest rejected without throwing', !verifyMetaSignature(raw, 'sha256=abcd', secret) && !verifyMetaSignature(raw, 'sha256=' + 'z'.repeat(64), secret));
ok('uppercase hex digest accepted', verifyMetaSignature(raw, 'sha256=' + good.slice(7).toUpperCase(), secret));

report('secret-gate');
