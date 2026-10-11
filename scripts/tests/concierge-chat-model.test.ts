// The concierge's conversation with the model (lib/concierge/chatModel.ts) and the app's door to OpenAI (lib/ai.ts): the answer streams, history goes
// in as real messages, the link policy holds across the pieces, the cost is logged, and every failure ends in something a guest can live with.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { splitTurns, answerOnce, streamAnswer, isFinalFailure, ROUTE_BUDGET_MS, FALLBACK_MIN_MS, type AnswerEvent } from '@/lib/concierge/chatModel';
import { callAI, streamAI, aiRoute } from '@/lib/ai';
import { applyLinkPolicy } from '@/lib/concierge/linkPolicy';
import { outputCap } from '@/lib/journalism/models';
import { installFakeOpenAI, streamEvents, type FakeReply } from './_fakeOpenAI';
import { eq, ok, report } from './_harness';

const SYSTEM = 'You are the concierge for Cyprus Lifestyle.';
const U = (content: string) => ({ role: 'user' as const, content });
const A = (content: string) => ({ role: 'assistant' as const, content });
const failure = (status: number, message: string, extra: Record<string, unknown> = {}): FakeReply => ({ status, body: { error: { message, ...extra } } });

async function collect(gen: AsyncGenerator<AnswerEvent>) {
  const events: AnswerEvent[] = [];
  for await (const e of gen) events.push(e);
  const text = events.filter((e): e is Extract<AnswerEvent, { type: 'delta' }> => e.type === 'delta').map((e) => e.text).join('');
  const done = events[events.length - 1] as Extract<AnswerEvent, { type: 'done' }>;
  return { events, text, done };
}

(async () => {
  for (const k of ['AI_EFFORT_CHAT', 'AI_EFFORT_HELPER', 'AI_FORCE_TIER', 'AI_SOL_ENABLED', 'AI_MAX_EFFORT', 'AI_KILL_SWITCH']) delete process.env[k];
  const silence = console.error; console.error = () => {};
  const warned: string[] = []; const origWarn = console.warn; console.warn = (...a: unknown[]) => { warned.push(a.join(' ')); };

  // ── the turns the model gets ────────────────────────────────────────────────────────────────────────────────────────────
  eq('no turns, no question', splitTurns([]), null);
  eq('only an assistant turn: no question', splitTurns([A('Welcome.')]), null);
  eq('a blank question is no question', splitTurns([U('  ')]), null);
  eq('the last user turn is the question, the turns before it are the history', splitTurns([U('a'), A('b'), U('c')]), { question: 'c', turns: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] });
  eq('turns after the last user turn are dropped (the model answers the question, it does not continue its own answer)', splitTurns([U('a'), A('b'), U('c'), A('d')]), { question: 'c', turns: [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }] });
  eq('the route budget leaves room for the search before it and the writing after it', [ROUTE_BUDGET_MS < 60_000, FALLBACK_MIN_MS < ROUTE_BUDGET_MS], [true, true]);

  // ── the routing of the chat: model, effort, cache key, request shape ───────────────────────────────────────────────────
  eq('the chat is gpt-6-luna at "low" (the guest is waiting)', [aiRoute('chat').model, aiRoute('chat').effort], ['gpt-6-luna', 'low']);
  eq('the helpers are gpt-6-luna at "low"', [aiRoute('helper').model, aiRoute('helper').effort], ['gpt-6-luna', 'low']);
  eq('a mail draft is gpt-6-luna at "medium"', [aiRoute('mail', 'routine').model, aiRoute('mail', 'routine').effort], ['gpt-6-luna', 'medium']);
  {
    const fx = installFakeOpenAI(() => ({ stream: streamEvents(['Latchi ', 'harbour.'], { in: 8_000, out: 300, reasoning: 120 }) }));
    const r = await collect(streamAnswer(SYSTEM, [U('Hello'), A('Welcome. How can I help?'), U('Where is the best harbour?')], { fn: 'concierge-chat', locale: 'de' }));
    // (the link policy holds back the end of a piece until it knows no link is cut in half there, so the pieces need not arrive 1:1)
    eq('text arrives as deltas and the stream ends with exactly one done', [r.events.filter((e) => e.type === 'delta').length > 0, r.events.filter((e) => e.type === 'done').length, r.events[r.events.length - 1].type, r.text], [true, 1, 'done', 'Latchi harbour.']);
    eq('done says: words given, answer finished', [r.done.gotText, r.done.complete, r.done.error], [true, true, undefined]);
    const c = fx.calls[0];
    eq('it is a streamed call to gpt-6-luna at "low"', [c.stream, c.model, c.effort], [true, 'gpt-6-luna', 'low']);
    eq('the history goes in as real messages, the question last', c.input, [{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Welcome. How can I help?' }, { role: 'user', content: 'Where is the best harbour?' }]);
    eq('the system prompt is the instructions', c.system, SYSTEM);
    eq('the cache key names the language (the long first part of the prompt is the same for every guest of a language)', c.cacheKey, 'concierge-de');
    eq('the cap is sized for a chat answer plus the thinking', c.body.max_output_tokens, outputCap(900, 'low'));
    ok('nothing is stored at OpenAI', c.body.store === false);
    fx.restore();
  }
  {
    process.env.AI_EFFORT_CHAT = 'minimal';
    const fx = installFakeOpenAI(() => ({ stream: streamEvents(['ok']) }));
    await collect(streamAnswer(SYSTEM, [U('hi')], { fn: 'concierge-chat', locale: 'en' }));
    eq('AI_EFFORT_CHAT tunes the speed of the chat', fx.calls[0].effort, 'minimal');
    fx.restore(); delete process.env.AI_EFFORT_CHAT;
  }

  // ── what leaves the server passes the link policy, also when a link is cut in half between two pieces ──────────────────
  {
    const pieces = ['Troodos is lovely: https://mycyp', 'ruslife.com/troodos', ' and the sea is warm. Our guide: https://cyprus-lifestyle.com/guide/y'];
    const fx = installFakeOpenAI(() => ({ stream: streamEvents(pieces) }));
    const r = await collect(streamAnswer(SYSTEM, [U('Troodos?')], { fn: 'concierge-chat', locale: 'en' }));
    ok('the other site is named nowhere in the streamed text', !/mycypruslife/i.test(r.text));
    eq('and the pieces joined are the policy applied to the whole answer', r.text, applyLinkPolicy(pieces.join(''), { campaign: 'cl-concierge' }).text);
    ok('our own page stays', /cyprus-lifestyle\.com\/guide\/y/.test(r.text));
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => 'Troodos is lovely: https://mycypruslife.com/troodos and the sea is warm.');
    const a = await answerOnce(SYSTEM, [U('Troodos?')], { fn: 'concierge-chat', locale: 'en' });
    ok('an answer in one piece passes the policy too', !!a.text && !/mycypruslife/i.test(a.text) && a.error === undefined);
    eq('it is a plain (not streamed) call, same model and effort, same history format', [fx.calls[0].stream, fx.calls[0].model, fx.calls[0].effort, fx.calls[0].input], [false, 'gpt-6-luna', 'low', 'Troodos?']);
    eq('and the cap is sized the same way', fx.calls[0].body.max_output_tokens, outputCap(900, 'low'));
    fx.restore();
  }

  // ── failures: the reason goes to the log, the guest gets "unavailable" from the brain ─────────────────────────────────
  {
    const fx = installFakeOpenAI(() => failure(401, 'Incorrect API key provided: sk-test.'));
    const r = await collect(streamAnswer(SYSTEM, [U('hi')], { fn: 'concierge-chat', locale: 'en' }));
    eq('a refused key: no words, final failure of kind auth, one call', [r.text, r.done.gotText, r.done.kind, fx.calls.length], ['', false, 'auth', 1]);
    ok('a refused key cannot be cured by asking again', isFinalFailure(r.done.kind));
    fx.restore();
  }
  ok('a busy server or a timeout may be tried again, the rest may not', !isFinalFailure('overloaded') && !isFinalFailure('timeout') && !isFinalFailure('rate') && !isFinalFailure('network') && !isFinalFailure('empty') && !isFinalFailure(undefined) && isFinalFailure('bad_request') && isFinalFailure('not_found'));
  {
    const fx = installFakeOpenAI((c, n) => (n === 1 ? failure(500, 'The server had an error') : { stream: streamEvents(['Second try.']) }));
    const r = await collect(streamAnswer(SYSTEM, [U('hi')], { fn: 'concierge-chat', locale: 'en' }));
    eq('a server error before the first word is retried inside the stream', [r.text, fx.calls.length, r.done.complete], ['Second try.', 2, true]);
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => ({ stream: streamEvents(['Half of an '], { in: 1_000, out: 10 }).slice(0, 2) })); // created + one delta, no closing message
    const r = await collect(streamAnswer(SYSTEM, [U('hi')], { fn: 'concierge-chat', locale: 'en' }));
    eq('a connection that ends early after words: the words stay, the answer is not complete, nobody asks again', [r.text.trim(), r.done.gotText, r.done.complete, fx.calls.length], ['Half of an', true, false, 1]);
    ok('and the log gets the reason', typeof r.done.error === 'string' && /ended before/.test(r.done.error));
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => ({ stream: streamEvents(['no']) }));
    const r = await collect(streamAnswer(SYSTEM, [A('only the assistant spoke')], { fn: 'concierge-chat', locale: 'en' }));
    eq('no question, no call', [r.done.gotText, r.done.error, fx.calls.length], [false, 'no question to answer', 0]);
    const a = await answerOnce(SYSTEM, [], { fn: 'concierge-chat', locale: 'en' });
    eq('the same in one piece', [a.text, a.error, fx.calls.length], ['', 'no question to answer', 0]);
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => failure(401, 'Incorrect API key provided.'));
    const a = await answerOnce(SYSTEM, [U('hi')], { fn: 'concierge-chat', locale: 'en' });
    eq('in one piece: a failure is text "" with the reason and its kind for the log', [a.text, /Incorrect API key/.test(a.error || ''), a.kind], ['', true, 'auth']);
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => '');
    const a = await answerOnce(SYSTEM, [U('hi')], { fn: 'concierge-chat', locale: 'en' });
    eq('in one piece: an empty reply is a failure, not an answer', [a.text, typeof a.error], ['', 'string']);
    fx.restore();
  }

  // ── the door: only OpenAI, the kill switch, the guard against a second vendor ─────────────────────────────────────────
  {
    const fx = installFakeOpenAI(() => 'x');
    const a = await callAI({ systemInstruction: 's', userMessage: 'u', model: 'claude-sonnet-5', fn: 't' });
    eq('a model of another vendor is refused before any call', [a.text, a.kind, fx.calls.length], ['', 'bad_request', 0]);
    const s: any[] = []; for await (const e of streamAI({ systemInstruction: 's', userMessage: 'u', model: 'gemini-2.5-flash' })) s.push(e);
    eq('the same for a stream', [s.length, s[0].type, s[0].kind, fx.calls.length], [1, 'error', 'bad_request', 0]);
    const g = await callAI({ systemInstruction: 's', userMessage: 'u', model: 'gpt-5.5' });
    eq('gpt-5.5 is refused by the shared client', [g.text, g.kind, fx.calls.length], ['', 'bad_request', 0]);
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => 'ok');
    await callAI({ systemInstruction: 's', userMessage: 'u' });
    ok('callAI without task and model sends no effort (the model default), exactly as before', fx.calls[0].effort === undefined && fx.calls[0].model === 'gpt-6-luna');
    await callAI({ systemInstruction: 's', userMessage: 'u', task: 'helper', jsonMode: true });
    eq('a helper job: gpt-6-luna at "low", JSON mode', [fx.calls[1].model, fx.calls[1].effort, fx.calls[1].format], ['gpt-6-luna', 'low', { type: 'json_object' }]);
    await callAI({ systemInstruction: 's', userMessage: 'now', history: [U('before'), A('answer')], task: 'chat' });
    eq('history is accepted by the one-shot door too', fx.calls[2].input, [{ role: 'user', content: 'before' }, { role: 'assistant', content: 'answer' }, { role: 'user', content: 'now' }]);
    fx.restore();
  }
  {
    const fx = installFakeOpenAI(() => ({ stream: streamEvents(['no']) }));
    process.env.AI_KILL_SWITCH = '1';
    const r = await collect(streamAnswer(SYSTEM, [U('hi')], { fn: 'concierge-chat', locale: 'en' }));
    eq('the kill switch stops the chat without a call; it counts as a final failure (asking again changes nothing)', [r.done.gotText, r.done.kind, fx.calls.length, isFinalFailure(r.done.kind)], [false, 'billing', 0, true]);
    ok('and says why, for the log', /switched off/i.test(r.done.error || ''));
    const a = await answerOnce(SYSTEM, [U('hi')], { fn: 'concierge-chat', locale: 'en' });
    eq('the same in one piece', [a.text, fx.calls.length], ['', 0]);
    delete process.env.AI_KILL_SWITCH;
    fx.restore();
  }

  // ── last, because it changes the state of the module: running out of credit pauses every call for a while ──────────────
  {
    const fx = installFakeOpenAI(() => failure(429, 'You exceeded your current quota.', { code: 'insufficient_quota' }));
    const r = await collect(streamAnswer(SYSTEM, [U('hi')], { fn: 'concierge-chat', locale: 'en' }));
    eq('no credit in the chat: kind billing, a final failure, one call', [r.done.kind, isFinalFailure(r.done.kind), fx.calls.length], ['billing', true, 1]);
    const first = await callAI({ systemInstruction: 's', userMessage: 'u', task: 'short' });
    eq('the chat\'s out-of-credit answer paused the desk already: the one-shot call does not reach OpenAI either', [first.kind, fx.calls.length], ['billing', 1]);
    const callsAfterFirst = fx.calls.length;
    const second = await callAI({ systemInstruction: 's', userMessage: 'u', task: 'short' });
    const s: any[] = []; for await (const e of streamAI({ systemInstruction: 's', userMessage: 'u' })) s.push(e);
    eq('then the desk stops calling for a while: the next calls (one-shot and stream) never reach OpenAI', [fx.calls.length - callsAfterFirst, second.kind, s[0].kind], [0, 'billing', 'billing']);
    fx.restore();
  }

  console.error = silence; console.warn = origWarn; void warned;
  report('concierge-chat-model');
})().catch((e) => { process.stderr.write(`${(e as Error)?.stack || e}\n`); process.exit(1); });
