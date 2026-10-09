// POST /api/desk/assess: the door in front of the style check. The judge itself is tested in journalism-assess-service.test.ts.
import type { NextRequest } from 'next/server';
import { POST } from '../../app/api/desk/assess/route';
import { FIXTURES } from './fixtures/antiAi-langs';
import { eq, ok, report } from './_harness';

const BODY = { html: FIXTURES.en.human[0].split(/\n\s*\n/).map((p: string) => `<p>${p.trim()}</p>`).join(''), lang: 'en', title: 'Latchi harbour', category: 'cyprus', articleType: 'news' };
// The route only reads headers, the URL's query and the JSON body, so a small stand-in for NextRequest is enough (and keeps Next out of the test).
const req = (body: unknown, headers: Record<string, string> = {}, query = ''): NextRequest => ({
  headers: new Headers(headers), nextUrl: new URL(`https://site.test/api/desk/assess${query}`),
  json: async () => { if (body === NOT_JSON) throw new SyntaxError('Unexpected token'); return body; },
}) as unknown as NextRequest;
const NOT_JSON = Symbol('not json');

async function main() {
  process.env.ENRICH_SECRET = 'enrich-secret';
  delete process.env.ENRICH_DISABLE_QUERY_KEY;

  let r = await POST(req(BODY));
  eq('no secret: 401, and nothing is judged', r.status, 401);
  r = await POST(req(BODY, { 'x-enrich-key': 'wrong' }));
  eq('a wrong secret: 401', r.status, 401);
  ok('the refusal does not repeat the secret', !JSON.stringify(await r.json()).includes('enrich-secret'));

  r = await POST(req(BODY, { 'x-enrich-key': 'enrich-secret' }));
  const a = await r.json();
  ok('the shared secret in x-enrich-key: 200 and an assessment', r.status === 200 && typeof a.score === 'number' && typeof a.ok === 'boolean' && Array.isArray(a.tells));
  eq('the answer is never cached', r.headers.get('cache-control'), 'no-store');
  eq('Authorization: Bearer works as well (the other job routes accept it)', (await POST(req(BODY, { authorization: 'Bearer enrich-secret' }))).status, 200);

  r = await POST(req({ ...BODY, lang: 'fr' }, { 'x-enrich-key': 'enrich-secret' }));
  ok('a request the judge cannot take: 400 with the reason', r.status === 400 && /unknown language/.test((await r.json()).error));
  r = await POST(req(NOT_JSON, { 'x-enrich-key': 'enrich-secret' }));
  eq('a body that is not JSON: 400, not a crash', r.status, 400);

  process.env.ENRICH_SECRET = '';
  eq('no secret configured on the server: it fails closed (only a signed-in admin could get in)', (await POST(req(BODY, { 'x-enrich-key': '' }))).status, 401);
  eq('and an empty header does not match an empty secret', (await POST(req(BODY))).status, 401);

  report('desk-assess-route');
}
main().catch((e) => { console.error(e); process.exit(1); });
