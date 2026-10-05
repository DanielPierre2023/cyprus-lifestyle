// VIES client — against the REAL replies captured from the live service on 2026-10-05, plus failure modes.
import { interpretViesResponse, checkVatNumber, parseRequester } from '@/lib/vat/vies';
import { eq, ok, report } from './_harness';

// ── real replies ─────────────────────────────────────────────────────────────
eq('POST valid (Google Ireland)', interpretViesResponse(200, { countryCode: 'IE', vatNumber: '6388047V', valid: true, requestIdentifier: '', name: 'GOOGLE IRELAND LIMITED', address: '3RD FLOOR, GORDON HOUSE, DUBLIN 4' }),
  { status: 'valid', name: 'GOOGLE IRELAND LIMITED', address: '3RD FLOOR, GORDON HOUSE, DUBLIN 4', requestId: undefined });
eq('GET valid shape (isValid/userError)', interpretViesResponse(200, { isValid: true, userError: 'VALID', name: '---', address: '---', requestIdentifier: 'WAPIAAAA' }),
  { status: 'valid', name: undefined, address: undefined, requestId: 'WAPIAAAA' });
eq('POST non-existent number → invalid', interpretViesResponse(200, { countryCode: 'DE', vatNumber: '000000000', valid: false, name: '---' }).status, 'invalid');
eq('GET non-existent → invalid', interpretViesResponse(200, { isValid: false, userError: 'INVALID' }).status, 'invalid');
eq('INVALID_INPUT (bad country) → invalid', interpretViesResponse(200, { actionSucceed: false, errorWrappers: [{ error: 'INVALID_INPUT' }] }).status, 'invalid');
eq('server error body → unavailable', interpretViesResponse(500, { actionSucceed: false, errorWrappers: [{ error: 'VOW-ERR-1', message: 'An unexpected error occurred' }] }).status, 'unavailable');

// ── outages must NEVER read as valid ─────────────────────────────────────────
for (const e of ['MS_UNAVAILABLE', 'TIMEOUT', 'SERVICE_UNAVAILABLE', 'MS_MAX_CONCURRENT_REQ', 'GLOBAL_MAX_CONCURRENT_REQ', 'VOW-ERR-1']) {
  eq(`${e} → unavailable`, interpretViesResponse(200, { actionSucceed: false, errorWrappers: [{ error: e }] }).status, 'unavailable');
}
eq('GET shape with an outage code → unavailable (not "invalid")', interpretViesResponse(200, { isValid: false, userError: 'MS_UNAVAILABLE' }).status, 'unavailable');
eq('HTTP 503 → unavailable', interpretViesResponse(503, null).status, 'unavailable');
eq('HTTP 429 → unavailable', interpretViesResponse(429, {}).status, 'unavailable');
eq('empty / garbage body → unavailable', interpretViesResponse(200, null).status, 'unavailable');
eq('unknown shape → unavailable', interpretViesResponse(200, { hello: 'world' }).status, 'unavailable');
eq('valid=true but 500 → unavailable (HTTP failure wins)', interpretViesResponse(500, { valid: true }).status, 'unavailable');

// ── requester (the seller's own VAT number, for the consultation number) ─────
eq('requester parsed', parseRequester('cy-12345678z'), { code: 'CY', number: '12345678Z' });
eq('requester missing → null', parseRequester(undefined), null);
eq('requester junk → null', parseRequester('hello'), null);

// ── the client itself, with an injected fetch ────────────────────────────────
const fixed = () => new Date('2026-10-05T10:00:00Z');
const mk = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;
{
  let seen: { url?: string; body?: Record<string, string> } = {};
  const spy = (async (url: string, init: RequestInit) => { seen = { url, body: JSON.parse(String(init.body)) }; return new Response(JSON.stringify({ valid: true, requestIdentifier: 'WAPIAAAAZZ', name: 'ACME GMBH' }), { status: 200 }); }) as unknown as typeof fetch;
  const r = await checkVatNumber('DE', '123456789', { fetchImpl: spy, now: fixed, requester: { code: 'CY', number: '12345678Z' } });
  eq('valid result carries the consultation number', [r.status, r.requestId, r.name, r.checkedAt], ['valid', 'WAPIAAAAZZ', 'ACME GMBH', '2026-10-05T10:00:00.000Z']);
  eq('request goes to the VIES check endpoint', seen.url, 'https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number');
  eq('request body includes the requester fields', seen.body, { countryCode: 'DE', vatNumber: '123456789', requesterMemberStateCode: 'CY', requesterNumber: '12345678Z' });
}
{
  let body: Record<string, string> = {};
  const spy = (async (_u: string, init: RequestInit) => { body = JSON.parse(String(init.body)); return new Response(JSON.stringify({ valid: false }), { status: 200 }); }) as unknown as typeof fetch;
  const r = await checkVatNumber('EL', '094259216', { fetchImpl: spy, now: fixed, requester: null });
  eq('no requester → minimal body; invalid result', [r.status, body], ['invalid', { countryCode: 'EL', vatNumber: '094259216' }]);
}
eq('network failure never throws → unavailable', (await checkVatNumber('DE', '1', { fetchImpl: (async () => { throw new TypeError('fetch failed'); }) as unknown as typeof fetch, now: fixed })).status, 'unavailable');
{
  const err = new Error('timed out'); err.name = 'TimeoutError';
  const r = await checkVatNumber('DE', '1', { fetchImpl: (async () => { throw err; }) as unknown as typeof fetch, now: fixed });
  eq('timeout is reported as such', [r.status, r.detail], ['unavailable', 'timeout']);
}
eq('non-JSON body → unavailable', (await checkVatNumber('DE', '1', { fetchImpl: (async () => new Response('<html>oops</html>', { status: 200 })) as unknown as typeof fetch, now: fixed })).status, 'unavailable');
eq('HTTP 500 → unavailable', (await checkVatNumber('DE', '1', { fetchImpl: mk(500, {}), now: fixed })).status, 'unavailable');

report('vies');
