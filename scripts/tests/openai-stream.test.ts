// The streaming half of the OpenAI client (lib/journalism/openaiStream.ts): the concierge chat shows the answer while it is written.
// A scripted network: every test says what the "server" sends, in which pieces, and what the client has to do with it.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { streamOpenAI, sseEvents, type StreamEvent } from '@/lib/journalism/openaiStream';
import { outputCap, costUsd } from '@/lib/journalism/models';
import { eq, ok, report } from './_harness';
import { chunkedBody, sseText, streamEvents } from './_fakeOpenAI';

type Step = Response | Error | ((init: any) => Response | Promise<Response>);
function script(steps: Step[]) {
  const calls: { url: string; init: any; body: any }[] = [];
  const fetchFn = (async (url: string, init: any) => {
    const body = JSON.parse(String(init.body));
    calls.push({ url, init, body });
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    if (step instanceof Error) throw step;
    return typeof step === 'function' ? step(init) : step.clone();
  }) as unknown as typeof fetch;
  return { fetch: fetchFn, calls };
}
const sse = (events: Record<string, unknown>[], chunkBytes = 0) => new Response(chunkedBody(sseText(events), chunkBytes), { status: 200, headers: { 'content-type': 'text/event-stream' } });
const failed = (status: number, message: string, extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) => new Response(JSON.stringify({ error: { message, ...extra } }), { status, headers: { 'content-type': 'application/json', ...headers } });
const delta = (d: string) => ({ type: 'response.output_text.delta', item_id: 'msg_1', output_index: 0, content_index: 0, delta: d });
const usageOf = (i = 1000, o = 200, r = 50) => ({ input_tokens: i, output_tokens: o, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: r } });
const completed = (usage = usageOf()) => ({ type: 'response.completed', response: { status: 'completed', output: [], usage } });
const REQ = { model: 'gpt-6-luna', system: 'You are the concierge.', user: 'Where is the best harbour?', effort: 'low' as const, fn: 'concierge-chat' };

async function run(req: Parameters<typeof streamOpenAI>[0], deps: Partial<Parameters<typeof streamOpenAI>[1]> & { fetch: typeof fetch }, take = Infinity): Promise<StreamEvent[]> {
  const out: StreamEvent[] = [];
  for await (const e of streamOpenAI(req, { apiKey: 'sk-test', sleep: async () => {}, ...deps })) { out.push(e); if (out.length >= take) break; }
  return out;
}
const text = (ev: StreamEvent[]) => ev.filter((e): e is Extract<StreamEvent, { type: 'delta' }> => e.type === 'delta').map((e) => e.text).join('');
const last = (ev: StreamEvent) => ev as any;

(async () => {
  // ── a normal answer ─────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const fx = script([sse(streamEvents(['Latchi ', 'is ', 'the ', 'one.'], { in: 1000, out: 200, reasoning: 50 }))]);
    const used: any[] = [];
    const ev = await run(REQ, { fetch: fx.fetch, onUsage: (e) => { used.push(e); } });
    eq('deltas arrive in order, then exactly one end', ev.map((e) => e.type), ['delta', 'delta', 'delta', 'delta', 'end']);
    eq('the pieces joined are the answer', text(ev), 'Latchi is the one.');
    const r = last(ev[4]).result;
    ok('the end says: finished, complete, with the text', r.ok === true && r.status === 'completed' && r.text === 'Latchi is the one.');
    eq('usage is read from the closing message', [r.usage.inputTokens, r.usage.outputTokens, r.usage.reasoningTokens], [1000, 200, 50]);
    eq('cost is the Luna price of that usage (raw, no markup)', r.usd, costUsd('gpt-6-luna', r.usage));
    eq('0.1 $/M in and 0.5 $/M out make 0.0002 $', r.usd, 0.0002);
    eq('the usage is reported once, with the label of the job', [used.length, used[0].fn, used[0].model, used[0].status], [1, 'concierge-chat', 'gpt-6-luna', 'completed']);
    ok('time to first word is measured', typeof r.firstWordMs === 'number' && r.firstWordMs >= 0);
    eq('one attempt', r.attempts, 1);
    const b = fx.calls[0].body;
    eq('the request asks for a stream, without storing it', [b.stream, b.store], [true, false]);
    eq('system prompt and question go in the right fields', [b.instructions, b.input], ['You are the concierge.', 'Where is the best harbour?']);
    eq('the effort is sent, the cap includes room for the thinking', [b.reasoning, b.max_output_tokens], [{ effort: 'low' }, outputCap(3_000, 'low')]);
    ok('no temperature is sent (reasoning models do not take one)', !('temperature' in b));
    ok('the key goes in the Authorization header, the call goes to /v1/responses', fx.calls[0].init.headers.Authorization === 'Bearer sk-test' && /\/v1\/responses$/.test(fx.calls[0].url));
  }

  // ── a conversation: earlier turns are real messages, the cache key and the expected length size the call ────────────────
  {
    const fx = script([sse(streamEvents(['ok']))]);
    await run({ ...REQ, history: [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Welcome.' }], cacheKey: 'concierge-de', expectTokens: 900 }, { fetch: fx.fetch });
    const b = fx.calls[0].body;
    eq('the history goes before the question, as messages', b.input, [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Welcome.' }, { role: 'user', content: 'Where is the best harbour?' }]);
    eq('the cache key is sent', b.prompt_cache_key, 'concierge-de');
    eq('the cap follows the expected length', b.max_output_tokens, outputCap(900, 'low'));
  }

  // ── the network cuts the answer into pieces: lines, JSON and even letters are split ────────────────────────────────────
  {
    const pieces = ['Καλημέρα, ', 'το λιμάνι ', 'του Λατσί — ', 'مرحبا بكم ', 'in Zypern 🇨🇾.'];
    for (const chunk of [1, 2, 3, 5, 7, 64]) {
      const fx = script([sse(streamEvents(pieces), chunk)]);
      const ev = await run(REQ, { fetch: fx.fetch });
      ok(`bytes in pieces of ${chunk}: the text is intact`, text(ev) === pieces.join('') && last(ev[ev.length - 1]).result.ok === true);
    }
  }
  {
    const raw = ': keep-alive\n\nevent: x\ndata: not json\n\ndata: [DONE]\n\r\ndata: {"type":"a","n":1}\r\n\r\ndata: {"type":"b"}';
    const got: any[] = [];
    for await (const e of sseEvents(chunkedBody(raw, 4))) got.push(e);
    eq('comments, damaged lines and [DONE] are skipped; CRLF and a last line without a newline are read', got, [{ type: 'a', n: 1 }, { type: 'b' }]);
  }

  // ── trouble BEFORE the first word is retried ────────────────────────────────────────────────────────────────────────────
  {
    const sleeps: number[] = [];
    const fx = script([failed(429, 'Rate limit reached for requests per min', {}, { 'retry-after': '1' }), sse(streamEvents(['fine']))]);
    const ev = await run(REQ, { fetch: fx.fetch, sleep: async (ms) => { sleeps.push(ms); } });
    eq('a rate limit is waited out (as long as the server says) and retried', [fx.calls.length, sleeps, text(ev)], [2, [1000], 'fine']);
    eq('the result counts both attempts', last(ev[ev.length - 1]).result.attempts, 2);
  }
  {
    const fx = script([failed(500, 'The server had an error'), failed(503, 'overloaded'), sse(streamEvents(['third time']))]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('server errors are retried, up to three attempts', [fx.calls.length, text(ev)], [3, 'third time']);
  }
  {
    const fx = script([failed(500, 'The server had an error')]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('three server errors in a row end in one error event', [fx.calls.length, ev.length, ev[0].type, last(ev[0]).kind], [3, 1, 'error', 'overloaded']);
  }
  {
    const fx = script([failed(429, 'Rate limit reached for requests per min', {}, { 'retry-after': '30' })]);
    const sleeps: number[] = [];
    const ev = await run(REQ, { fetch: fx.fetch, sleep: async (ms) => { sleeps.push(ms); } });
    eq('a server that asks for a 30 s pause is not waited for: the guest gets the error at once', [fx.calls.length, sleeps, last(ev[0]).kind], [1, [], 'rate']);
    ok('and the message says how long it asked', /asked to wait 30s/.test(last(ev[0]).message));
  }
  {
    const fx = script([failed(401, 'Incorrect API key provided: sk-test.')]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('a refused key is final: one call, error kind auth', [fx.calls.length, last(ev[0]).kind], [1, 'auth']);
  }
  {
    const fx = script([failed(429, 'You exceeded your current quota, please check your plan and billing details.', { code: 'insufficient_quota' })]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('no credit left is final too: one call, error kind billing', [fx.calls.length, last(ev[0]).kind], [1, 'billing']);
  }
  {
    const fx = script([failed(404, 'The model `gpt-9` does not exist')]);
    const ev = await run({ ...REQ, model: 'gpt-9' }, { fetch: fx.fetch });
    eq('an unknown model is final: error kind not_found', [fx.calls.length, last(ev[0]).kind], [1, 'not_found']);
  }
  {
    const fx = script([new TypeError('fetch failed'), sse(streamEvents(['back']))]);
    const sleeps: number[] = [];
    const ev = await run(REQ, { fetch: fx.fetch, sleep: async (ms) => { sleeps.push(ms); } });
    eq('a dropped connection is retried after a short pause', [fx.calls.length, sleeps, text(ev)], [2, [700], 'back']);
  }
  {
    const fx = script([Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' })]);
    const ev = await run({ ...REQ, timeoutMs: 20_000 }, { fetch: fx.fetch });
    eq('a call that timed out is not repeated (it was already slow)', [fx.calls.length, last(ev[0]).kind], [1, 'timeout']);
    ok('the message says how long it waited', /no answer after 20s/.test(last(ev[0]).message));
  }
  {
    // the model refuses the reasoning effort: one level lower, and so on, finally none at all
    const msg = "Unsupported value: 'reasoning.effort' does not support 'xhigh' with this model.";
    const fx = script([failed(400, msg), failed(400, msg), failed(400, msg), sse(streamEvents(['ok']))]);
    const ev = await run({ ...REQ, effort: 'xhigh' }, { fetch: fx.fetch, maxAttempts: 4 });
    eq('the effort steps down: high, medium, low', fx.calls.slice(1).map((c) => c.body.reasoning?.effort), ['high', 'medium', 'low']);
    eq('and the answer comes', text(ev), 'ok');
  }
  {
    const msg = "Unsupported value: 'reasoning.effort' does not support 'low' with this model.";
    const fx = script([failed(400, msg), sse(streamEvents(['ok']))]);
    const ev = await run(REQ, { fetch: fx.fetch });
    ok('nothing below "low": the field is dropped', fx.calls[1].body.reasoning === undefined && text(ev) === 'ok');
    eq('the result reports that no effort was used', last(ev[ev.length - 1]).result.effortUsed, null);
  }
  {
    const fx = script([failed(400, "Unknown parameter: 'prompt_cache_key'."), sse(streamEvents(['ok']))]);
    const ev = await run({ ...REQ, cacheKey: 'concierge-en' }, { fetch: fx.fetch });
    ok('a refused cache key is dropped and the call repeated', fx.calls[0].body.prompt_cache_key === 'concierge-en' && fx.calls[1].body.prompt_cache_key === undefined && text(ev) === 'ok');
  }
  {
    const fx = script([sse([{ type: 'response.failed', response: { status: 'failed', error: { code: 'server_error', message: 'The server had an error while processing your request' }, usage: null } }]), sse(streamEvents(['recovered']))]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('a failed response before any word is retried', [fx.calls.length, text(ev)], [2, 'recovered']);
  }
  {
    const fx = script([sse([{ type: 'error', code: 'server_error', message: 'The server had an error' }]), sse(streamEvents(['recovered']))]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('an error event before any word is retried', [fx.calls.length, text(ev)], [2, 'recovered']);
  }
  {
    const fx = script([sse([{ type: 'error', code: 'insufficient_quota', message: 'You exceeded your current quota' }])]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('an out-of-credit error event is final', [fx.calls.length, last(ev[0]).kind], [1, 'billing']);
  }
  {
    // the cap was used up by the thinking before a single word: billed, so ask once more with room to finish
    const inc = { type: 'response.incomplete', response: { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [], usage: usageOf(2_000, 3_375, 3_375) } };
    const fx = script([sse([inc]), sse(streamEvents(['now it fits'], { in: 2_000, out: 500, reasoning: 200 }))]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('the second try has a 1.7x cap', [fx.calls[0].body.max_output_tokens, fx.calls[1].body.max_output_tokens], [outputCap(3_000, 'low'), Math.ceil(outputCap(3_000, 'low') * 1.7)]);
    const r = last(ev[ev.length - 1]).result;
    eq('the answer comes and both attempts are billed', [text(ev), r.usage.outputTokens, r.usage.reasoningTokens], ['now it fits', 3_875, 3_575]);
    const u = (inn: number, out: number) => ({ inputTokens: inn, cachedTokens: 0, outputTokens: out, reasoningTokens: 0 });
    eq('the cost is the sum of both', r.usd, +(costUsd('gpt-6-luna', u(2_000, 3_375)) + costUsd('gpt-6-luna', u(2_000, 500))).toFixed(6));
  }
  {
    const inc = { type: 'response.incomplete', response: { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [], usage: usageOf(2_000, 3_375, 3_375) } };
    const fx = script([sse([inc])]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('twice used up, no word: one error event of kind incomplete', [ev.length, last(ev[0]).kind], [1, 'incomplete']);
  }
  {
    const fx = script([sse([{ type: 'response.refusal.delta', delta: 'I cannot help with that.' }, completed(usageOf(500, 20, 0))])]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('a refusal with no text is an error of kind refusal, not an empty success', [ev.length, last(ev[0]).kind], [1, 'refusal']);
    ok('with the refusal in the message', /I cannot help/.test(last(ev[0]).message));
  }
  {
    const fx = script([sse([completed(usageOf(500, 20, 20))])]);
    const ev = await run(REQ, { fetch: fx.fetch });
    eq('a finished answer without a word is an error of kind empty', [ev.length, last(ev[0]).kind], [1, 'empty']);
  }

  // ── trouble AFTER the first word is never retried ───────────────────────────────────────────────────────────────────────
  {
    const fx = script([sse([delta('Latchi is '), delta('the')])]);
    const used: any[] = [];
    const ev = await run(REQ, { fetch: fx.fetch, onUsage: (e) => { used.push(e); } });
    eq('the connection ends without a closing message: the words stay, the end says "cut", one call only', [text(ev), last(ev[ev.length - 1]).result.status, last(ev[ev.length - 1]).result.ok, fx.calls.length], ['Latchi is the', 'cut', false, 1]);
    eq('nothing is reported as used (the stream never said)', used.length, 0);
  }
  {
    const fx = script([sse([delta('Latchi is '), { type: 'response.failed', response: { status: 'failed', error: { message: 'The server had an error' }, usage: usageOf(900, 40, 10) } }])]);
    const ev = await run(REQ, { fetch: fx.fetch });
    const r = last(ev[ev.length - 1]).result;
    eq('a failure after words ends the answer as failed; no second try', [r.ok, r.status, fx.calls.length, r.text], [false, 'failed', 1, 'Latchi is ']);
  }
  {
    const inc = { type: 'response.incomplete', response: { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [], usage: usageOf(900, 3_000, 2_500) } };
    const fx = script([sse([delta('A long plan: '), inc])]);
    const ev = await run(REQ, { fetch: fx.fetch });
    const r = last(ev[ev.length - 1]).result;
    eq('cut off at the cap after words: the end says incomplete and why', [r.ok, r.status, r.incompleteReason, fx.calls.length], [false, 'incomplete', 'max_output_tokens', 1]);
  }
  {
    // the time runs out while words are arriving: the stream breaks with a timeout error after the first piece
    let sent = false;
    const body = () => new ReadableStream<Uint8Array>({
      pull(c) {
        if (!sent) { sent = true; c.enqueue(new TextEncoder().encode(sseText([delta('Half an answer')]))); }
        else c.error(Object.assign(new Error('The operation timed out'), { name: 'TimeoutError' }));
      },
    });
    const fx = script([() => new Response(body(), { status: 200 })]);
    const ev = await run({ ...REQ, timeoutMs: 20_000 }, { fetch: fx.fetch });
    const r = last(ev[ev.length - 1]).result;
    eq('the words that arrived are kept, the answer ends as cut off, no second try', [text(ev), r.ok, r.status, fx.calls.length], ['Half an answer', false, 'cut', 1]);
    ok('and the reason names the time', /no complete answer after 20s/.test(r.error));
  }

  // ── leaving early closes the connection ───────────────────────────────────────────────────────────────────────────────────
  {
    let cancelled = false;
    const bytes = new TextEncoder().encode(sseText([delta('one '), delta('two ')]));
    const body = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes); }, pull() { return new Promise(() => {}); }, cancel() { cancelled = true; } });
    const fx = script([() => new Response(body, { status: 200 })]);
    const ev = await run(REQ, { fetch: fx.fetch }, 1);
    eq('the guest closed the tab after the first word', text(ev), 'one ');
    ok('the connection to the model was closed (it stops writing, and stops billing)', cancelled);
  }

  // ── guards ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const fx = script([sse(streamEvents(['no']))]);
    const ev = await run({ ...REQ, model: 'gpt-5.5' }, { fetch: fx.fetch });
    eq('gpt-5.5 is never called', [fx.calls.length, last(ev[0]).kind], [0, 'bad_request']);
    ok('and the message says why', /blocked by policy/.test(last(ev[0]).message));
  }
  {
    const fx = script([sse(streamEvents(['no']))]);
    const ev = await run(REQ, { fetch: fx.fetch, apiKey: '' });
    eq('no key: no call, error kind auth', [fx.calls.length, last(ev[0]).kind], [0, 'auth']);
  }
  {
    const fx = script([sse(streamEvents(['no']))]);
    const t = 1_000_000;
    const ev = await run(REQ, { fetch: fx.fetch, now: () => t, deadlineAt: t + 1_000 });
    eq('no time left: no call, error kind timeout', [fx.calls.length, last(ev[0]).kind], [0, 'timeout']);
  }
  {
    const fx = script([sse(streamEvents(['fine']))]);
    const ev = await run(REQ, { fetch: fx.fetch, onUsage: () => { throw new Error('log table is down'); } });
    eq('a spend log that fails never breaks the answer', [text(ev), last(ev[ev.length - 1]).result.ok], ['fine', true]);
  }
  {
    const fx = script([sse(streamEvents(['fine'], { in: 5_000, out: 100 }))]);
    const prices = JSON.stringify({ 'gpt-6-luna': { in: 1, cachedIn: 1, out: 2, cacheWrite: 1 } });
    const ev = await run(REQ, { fetch: fx.fetch, env: { OPENAI_PRICES_JSON: prices } });
    eq('a price override from the environment is honoured', last(ev[ev.length - 1]).result.usd, +((5_000 * 1 + 100 * 2) / 1e6).toFixed(6));
  }

  report('openai-stream');
})().catch((e) => { console.error(e); process.exit(1); });
