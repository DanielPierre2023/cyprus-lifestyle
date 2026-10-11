// The style check as a service: the website's side (runAssess, behind app/api/desk/assess) and the edge function's side (remoteAssess).
// Why it exists: a Supabase edge function may use two seconds of computing per call and the voice engine needs more for one article.
import { runAssess, ASSESS_MAX_HTML } from '@/lib/journalism/assessService';
import { remoteAssess, parseAssessment, assessConfigError, ASSESS_PATH } from '@/lib/journalism/assessClient';
import { assessEdition } from '@/lib/journalism/assess';
import { FIXTURES } from './fixtures/antiAi-langs';
import { LANGS } from '@/lib/journalism/languages';
import { eq, ok, report } from './_harness';

/* eslint-disable @typescript-eslint/no-explicit-any */
const html = (l: (typeof LANGS)[number]) => FIXTURES[l].human[0].split(/\n\s*\n/).map((p: string) => `<p>${p.trim()}</p>`).join('');
const CTX = { title: 'Marina fees rise', category: 'cyprus', articleType: 'news' as const };

async function main() {
  // ── the website's side: the same judge as everywhere ────────────────────────────────────────────────────────────────────
  for (const l of LANGS) {
    const r = runAssess({ html: html(l), lang: l, ...CTX });
    eq(`${l}: the service answers exactly what the judge says`, r.status === 200 && JSON.stringify(r.json) === JSON.stringify(assessEdition(html(l), l, CTX)), true);
  }
  const ai = runAssess({ html: `<p>${FIXTURES.en.ai[0]}</p>`, lang: 'en', ...CTX });
  ok('a machine-like text is judged as such (not ok, tells listed)', ai.status === 200 && (ai.json as any).ok === false && (ai.json as any).tells.length > 3);
  eq('an interview is judged on the interview desk (first person allowed)', runAssess({ html: html('en'), lang: 'en', title: 'x', category: 'people', articleType: 'interview' }).status, 200);
  eq('an unknown article type falls back to news', JSON.stringify(runAssess({ html: html('en'), lang: 'en', ...CTX, articleType: 'poem' }).json) === JSON.stringify(runAssess({ html: html('en'), lang: 'en', ...CTX }).json), true);
  for (const [name, body] of [['no body', null], ['a string', 'text'], ['empty html', { html: '  ', lang: 'en' }], ['unknown language', { html: '<p>x y z</p>', lang: 'fr' }], ['no language', { html: '<p>x y z</p>' }], ['too long', { html: 'a'.repeat(ASSESS_MAX_HTML + 1), lang: 'en' }]] as Array<[string, unknown]>) {
    const r = runAssess(body);
    ok(`rejected: ${name}`, r.status === 400 && (r.json as any).ok === false && typeof (r.json as any).error === 'string');
  }

  // ── the answer is checked before it is trusted ──────────────────────────────────────────────────────────────────────────
  eq('a real assessment passes', parseAssessment({ score: 3, ok: true, high: 0, words: 90, tells: [{ key: 'k', label: 'l', severity: 'low' }] })?.score, 3);
  for (const [name, v] of [['null', null], ['a string', 'x'], ['no score', { ok: true, tells: [] }], ['score is NaN', { score: NaN, ok: true, tells: [] }], ['ok is not a boolean', { score: 1, ok: 'yes', tells: [] }], ['tells is not a list', { score: 1, ok: true, tells: 'x' }]] as Array<[string, unknown]>) ok(`not an assessment: ${name}`, parseAssessment(v) === null);
  eq('tells without a key are dropped', parseAssessment({ score: 1, ok: true, tells: [{ key: 'a' }, { label: 'no key' }, null] })?.tells.length, 1);

  // ── configuration ────────────────────────────────────────────────────────────────────────────────────────────────────────
  eq('configured', assessConfigError('https://cypruslifestyle.eu', 'secret'), null);
  ok('no site URL', /SITE_URL/.test(String(assessConfigError('', 'secret'))));
  ok('a site URL without a scheme', /SITE_URL/.test(String(assessConfigError('cypruslifestyle.eu', 'secret'))));
  ok('no secret', /ENRICH_SECRET/.test(String(assessConfigError('https://x.test', '  '))));

  // ── the edge function's side ─────────────────────────────────────────────────────────────────────────────────────────────
  type Call = { url: string; headers: Record<string, string>; body: any; timeoutSet: boolean };
  const mk = (replies: Array<((c: Call) => Response | Promise<Response>) | 'throw' | 'timeout'>) => {
    const calls: Call[] = []; const sleeps: number[] = [];
    const fetchFn = async (url: any, init: any) => {
      const c: Call = { url: String(url), headers: init.headers, body: JSON.parse(init.body), timeoutSet: !!init.signal };
      calls.push(c);
      const entry = replies[Math.min(calls.length - 1, replies.length - 1)];
      const r = typeof entry === 'function' ? entry(c) : entry;
      if (r === 'throw') throw new Error('connect ECONNREFUSED');
      if (r === 'timeout') { const e = new Error('The operation was aborted due to timeout'); e.name = 'TimeoutError'; throw e; }
      return r as Response;
    };
    return { calls, sleeps, fetchFn: fetchFn as unknown as typeof fetch, sleep: async (ms: number) => { sleeps.push(ms); } };
  };
  const good = (c: Call) => new Response(JSON.stringify(runAssess(c.body).json), { status: 200, headers: { 'content-type': 'application/json' } });
  const make = (m: ReturnType<typeof mk>, over: Record<string, unknown> = {}) => remoteAssess({ siteUrl: 'https://site.test/', secret: 's3cret-value', fetch: m.fetchFn, sleep: m.sleep, ...over });

  let m = mk([good]);
  const a = await make(m)(html('de'), 'de', CTX);
  eq('the call goes to the website\'s route, the trailing slash of the URL does not matter', m.calls[0].url, `https://site.test${ASSESS_PATH}`);
  eq('it carries the secret in x-enrich-key and the edition with its language and context', [m.calls[0].headers['x-enrich-key'], m.calls[0].body.lang, m.calls[0].body.title, m.calls[0].body.category, m.calls[0].body.articleType, m.calls[0].body.html === html('de')], ['s3cret-value', 'de', CTX.title, 'cyprus', 'news', true]);
  eq('and returns the judge\'s verdict untouched', JSON.stringify(a), JSON.stringify(assessEdition(html('de'), 'de', CTX)));
  ok('every attempt has its own time limit', m.calls[0].timeoutSet);

  m = mk([() => new Response('x', { status: 503 }), 'throw', good]);
  eq('network trouble and a 503 are retried (with a short pause), then it works', [(await make(m)(html('en'), 'en', CTX)).ok, m.calls.length, m.sleeps], [true, 3, [600, 1500]]);

  m = mk([() => new Response('x', { status: 500 })]);
  let err = ''; try { await make(m)(html('en'), 'en', CTX); } catch (e) { err = (e as Error).message; }
  eq('three failures end in a clear error', [m.calls.length, err], [3, 'style check unavailable: HTTP 500']);

  m = mk(['timeout']);
  err = ''; try { await make(m)(html('en'), 'en', CTX); } catch (e) { err = (e as Error).message; }
  eq('a timeout is retried and reported as "no answer in time"', [m.calls.length, err], [3, 'style check unavailable: no answer in time']);

  m = mk([() => new Response('{"ok":true}', { status: 200 }), () => new Response('not json', { status: 200 }), good]);
  eq('an answer that is not an assessment is not trusted: it is retried', [(await make(m)(html('en'), 'en', CTX)).ok, m.calls.length], [true, 3]);

  for (const [status, what] of [[401, /ENRICH_SECRET differs/], [403, /ENRICH_SECRET differs/], [404, /not been updated yet/], [400, /rejected the request/]] as Array<[number, RegExp]>) {
    m = mk([() => new Response('no', { status })]);
    err = ''; try { await make(m)(html('en'), 'en', CTX); } catch (e) { err = (e as Error).message; }
    ok(`HTTP ${status} is not retried (trying again cannot change it) and says what to do`, m.calls.length === 1 && what.test(err));
    ok(`HTTP ${status}: the secret is never in the message`, !err.includes('s3cret-value'));
  }

  m = mk([good]);
  let clock = 1_000_000;
  err = ''; try { await make(m, { deadlineAt: clock + 2_500, now: () => clock })(html('en'), 'en', CTX); } catch (e) { err = (e as Error).message; }
  eq('with less than three seconds left no attempt is started', [m.calls.length, /out of time/.test(err)], [0, true]);
  m = mk([() => new Response('x', { status: 503 }), good]);
  err = ''; try { await make(m, { deadlineAt: clock + 10_000, now: () => { clock += 4_000; return clock; } })(html('en'), 'en', CTX); } catch (e) { err = (e as Error).message; }
  ok('the deadline also stops the retries (time runs out between attempts)', /out of time/.test(err) && m.calls.length <= 2);

  report('journalism-assess-service');
}
main().catch((e) => { console.error(e); process.exit(1); });
