// The text desk's model layer: routing (Luna everywhere, effort by difficulty), cost, and the Responses-API client (caps, retries, 429s, Flex, web search).
import {
  route, complexityFrom, clampEffort, supportsEffort, outputCap, tokensForChars, costUsd, priceFor, modelIds, tierOf, effortCap,
  effortForBudget, maxEffortOf, isBlockedModel, LONG_CONTEXT_TOKENS, REASONING_RESERVE, MAX_OUTPUT_CAP, DEFAULT_MODEL_IDS, PRICES, type Effort,
} from '@/lib/journalism/models';
import {
  buildRequestBody, parseResponse, classifyError, waitFromHeaders, callOpenAI, parseJsonLoose, type LlmResult, type UsageEvent,
} from '@/lib/journalism/openai';
import { eq, ok, report } from './_harness';

// ── models: ids, prices, cost ────────────────────────────────────────────────────────────────────────────────────────
eq('default ids are the ones on the account page', DEFAULT_MODEL_IDS, { luna: 'gpt-6-luna', sol: 'gpt-6.1-sol', astra: 'gpt-6-astra' });
eq('env overrides an id', modelIds({ OPENAI_MODEL_LUNA: 'gpt-5.6-luna' }).luna, 'gpt-5.6-luna');
eq('tier from id', [tierOf('gpt-6-luna'), tierOf('gpt-6.1-sol'), tierOf('gpt-6-astra'), tierOf('gpt-4.1')], ['luna', 'sol', 'astra', null]);
eq('Luna price', PRICES['gpt-6-luna'], { in: 0.10, cachedIn: 0.01, out: 0.50, cacheWrite: 0.125 });
eq('Sol price', PRICES['gpt-6.1-sol'], { in: 2.00, cachedIn: 0.10, out: 10.00, cacheWrite: 2.50 });
eq('a 100k-in / 10k-out Luna call', costUsd('gpt-6-luna', { inputTokens: 100_000, cachedTokens: 0, outputTokens: 10_000, reasoningTokens: 6_000 }), 0.015);
eq('cached input is billed at the cached rate', costUsd('gpt-6-luna', { inputTokens: 100_000, cachedTokens: 80_000, outputTokens: 0, reasoningTokens: 0 }), 0.0028);
eq('a Sol call costs about twenty times a Luna call', Math.round(costUsd('gpt-6.1-sol', { inputTokens: 10_000, cachedTokens: 0, outputTokens: 10_000, reasoningTokens: 0 }) / costUsd('gpt-6-luna', { inputTokens: 10_000, cachedTokens: 0, outputTokens: 10_000, reasoningTokens: 0 })), 20);
ok('an unknown model is priced high, never zero', costUsd('gpt-9-mystery', { inputTokens: 1_000_000, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0 }) > 0);
eq('price override from the environment', priceFor('gpt-6-luna', { OPENAI_PRICES_JSON: '{"gpt-6-luna":{"in":1,"out":2}}' }), { in: 1, cachedIn: 1, out: 2, cacheWrite: 1 });
eq('garbage override is ignored', priceFor('gpt-6-luna', { OPENAI_PRICES_JSON: 'nope' }), PRICES['gpt-6-luna']);
eq('cached tokens above the input are clamped', costUsd('gpt-6-luna', { inputTokens: 10, cachedTokens: 50, outputTokens: 0, reasoningTokens: 0 }), 0);
eq('a cache WRITE costs 1.25x the input rate', costUsd('gpt-6-luna', { inputTokens: 100_000, cachedTokens: 0, cacheWriteTokens: 50_000, outputTokens: 0, reasoningTokens: 0 }), 0.01125);
eq('cache writes and cache reads together', costUsd('gpt-6-luna', { inputTokens: 100_000, cachedTokens: 40_000, cacheWriteTokens: 40_000, outputTokens: 0, reasoningTokens: 0 }), 0.0074);
eq('a prompt above 272K tokens pays 2x input and 1.5x output for the whole request', costUsd('gpt-6-luna', { inputTokens: LONG_CONTEXT_TOKENS + 28_000, cachedTokens: 0, outputTokens: 10_000, reasoningTokens: 0 }), 0.0675);
eq('exactly 272K tokens is still short context', costUsd('gpt-6-luna', { inputTokens: LONG_CONTEXT_TOKENS, cachedTokens: 0, outputTokens: 0, reasoningTokens: 0 }), 0.0272);
eq('Flex is half price', costUsd('gpt-6-luna', { inputTokens: 100_000, cachedTokens: 0, outputTokens: 10_000, reasoningTokens: 0, serviceTier: 'flex' }), 0.0075);
eq('Fast mode (priority) doubles it', costUsd('gpt-6-luna', { inputTokens: 100_000, cachedTokens: 0, outputTokens: 10_000, reasoningTokens: 0, serviceTier: 'priority' }), 0.03);
ok('gpt-5.5 is not in the price table (it is never used)', !('gpt-5.5' in PRICES));
eq('gpt-5.5 is recognised as blocked, in any spelling', [isBlockedModel('gpt-5.5'), isBlockedModel('GPT-5.5-pro'), isBlockedModel('gpt-5.5-2026-04-23'), isBlockedModel('gpt-6-luna'), isBlockedModel('gpt-5.6-luna'), isBlockedModel(undefined)], [true, true, true, false, false, false]);
eq('a setting that points a tier at gpt-5.5 is ignored', [modelIds({ OPENAI_MODEL_LUNA: 'gpt-5.5' }).luna, modelIds({ OPENAI_MODEL_SOL: ' gpt-5.5-pro ' }).sol, modelIds({ OPENAI_MODEL_ASTRA: 'gpt-5.5' }).astra], ['gpt-6-luna', 'gpt-6.1-sol', 'gpt-6-astra']);
eq('routing can never return gpt-5.5', ['write', 'check', 'core', 'chat', 'extract', 'rewrite'].some((t) => route({ task: t as never, complexity: 'investigative' }, { OPENAI_MODEL_LUNA: 'gpt-5.5', OPENAI_MODEL_SOL: 'gpt-5.5', AI_FORCE_TIER: 'sol' }).model.includes('5.5')), false);

// ── effort ───────────────────────────────────────────────────────────────────────────────────────────────────────────
eq('Luna accepts every effort', (['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as Effort[]).every((e) => supportsEffort('luna', e)), true);
eq('Sol rejects none and minimal', [supportsEffort('sol', 'none'), supportsEffort('sol', 'minimal'), supportsEffort('sol', 'low')], [false, false, true]);
eq('Astra rejects none', [supportsEffort('astra', 'none'), supportsEffort('astra', 'low')], [false, true]);
eq('Sol asked for none gets low', clampEffort('sol', 'none'), 'low');
eq('xhigh passes by default (the cap is max)', clampEffort('luna', 'xhigh'), 'xhigh');
eq('a lower cap wins', clampEffort('luna', 'xhigh', 'high'), 'high');
eq('effort cap from the environment (default max)', [effortCap({}), effortCap({ AI_MAX_EFFORT: 'xhigh' }), effortCap({ AI_MAX_EFFORT: 'nonsense' })], ['max', 'xhigh', 'max']);
eq('the gpt-5.0 … 5.4 line stops at xhigh, the gpt-6 family goes to max', [maxEffortOf('gpt-5.4'), maxEffortOf('gpt-5-mini'), maxEffortOf('gpt-6-luna'), maxEffortOf('gpt-5.6-luna'), maxEffortOf('gpt-6.1-sol')], ['xhigh', 'xhigh', 'max', 'max', 'max']);
eq('short on time: max steps down until it fits', [effortForBudget('max', 200_000), effortForBudget('max', 30_000), effortForBudget('xhigh', 60_000), effortForBudget('max', 1_000)], ['max', 'medium', 'high', 'low']);
eq('the time scale can be tuned', effortForBudget('max', 100_000, 'luna', { AI_EFFORT_MS_SCALE: '0.5' }), 'max');
eq('a budget step never lands on an effort the tier rejects', effortForBudget('high', 1_000, 'sol'), 'low');

// ── complexity ───────────────────────────────────────────────────────────────────────────────────────────────────────
eq('a plain brief is routine', complexityFrom({ declared: 'routine', articleType: 'breva' }), 'routine');
eq('missing or junk declared complexity is routine', [complexityFrom({}), complexityFrom({ declared: 'banana' })], ['routine', 'routine']);
eq('a feature is at least complex', complexityFrom({ declared: 'routine', articleType: 'reportaj' }), 'complex');
eq('an interview is at least complex', complexityFrom({ articleType: 'interview' }), 'complex');
eq('an investigation is investigative', complexityFrom({ declared: 'routine', articleType: 'investigation' }), 'investigative');
eq('political news is complex', complexityFrom({ declared: 'routine', articleType: 'news', flags: ['political'] }), 'complex');
eq('allegations make it demanding', complexityFrom({ declared: 'routine', flags: ['allegations'] }), 'demanding');
eq('allegations plus conflicting sources are investigative', complexityFrom({ flags: ['allegations', 'conflicting_sources'] }), 'investigative');
eq('legal risk is demanding', complexityFrom({ flags: ['legal_risk'] }), 'demanding');
eq('a property-law explainer is at least complex', complexityFrom({ desk: 'property_legal' }), 'complex');
eq('the model may declare more than the rules would', complexityFrom({ declared: 'demanding', articleType: 'news' }), 'demanding');
eq('flags never lower it', complexityFrom({ declared: 'investigative', flags: ['breaking'] }), 'investigative');

// ── routing (owner's rule: Luna everywhere; simple = medium, demanding = xhigh, hardest = max) ───────────────────────
const r = (task: Parameters<typeof route>[0]['task'], complexity?: Parameters<typeof route>[0]['complexity'], env: Record<string, string> = {}, attempt?: number) => { const x = route({ task, complexity, attempt }, env); return `${x.tier}/${x.effort}`; };
eq('normal news: Luna medium', r('write', 'routine'), 'luna/medium');
eq('reportage, interviews, complex stories: Luna high', r('write', 'complex'), 'luna/high');
eq('demanding journalism: Luna xhigh (no Sol)', r('write', 'demanding'), 'luna/xhigh');
eq('investigative: Luna max', r('write', 'investigative'), 'luna/max');
eq('the fact check thinks as hard as the writer', [r('check', 'routine'), r('check', 'complex'), r('check', 'demanding'), r('check', 'investigative')], ['luna/medium', 'luna/high', 'luna/xhigh', 'luna/max']);
eq('editing and repair: lighter', [r('edit', 'routine'), r('edit', 'complex'), r('edit', 'demanding'), r('repair', 'investigative')], ['luna/medium', 'luna/medium', 'luna/high', 'luna/high']);
eq('the fact core is read by Luna high (it is the base of seven articles)', r('core'), 'luna/high');
eq('simple recurring jobs: Luna medium', [r('extract'), r('short'), r('classify'), r('mail'), r('translate')], ['luna/medium', 'luna/medium', 'luna/medium', 'luna/medium', 'luna/medium']);
eq('the same jobs on a complex input: Luna high', [r('extract', 'complex'), r('translate', 'demanding')], ['luna/high', 'luna/high']);
eq('the planner with web research: Luna high', r('plan'), 'luna/high');
eq('the guest is waiting: chat and helpers on Luna low', [r('chat'), r('helper')], ['luna/low', 'luna/low']);
eq('the voice rewrite escalates on Luna: high, xhigh, max', [r('rewrite', undefined, {}, 1), r('rewrite', undefined, {}, 2), r('rewrite', undefined, {}, 3)], ['luna/high', 'luna/xhigh', 'luna/max']);
eq('Sol is never used unless switched on', ['write', 'check', 'edit', 'rewrite', 'core'].every((t) => ['demanding', 'investigative'].every((c) => !r(t as never, c as never).startsWith('sol') && !r(t as never, c as never, {}, 3).startsWith('sol'))), true);
eq('AI_SOL_ENABLED=true brings Sol back for demanding and investigative stories', [r('write', 'demanding', { AI_SOL_ENABLED: 'true' }), r('write', 'investigative', { AI_SOL_ENABLED: 'true' }), r('rewrite', undefined, { AI_SOL_ENABLED: 'true' }, 2)], ['sol/medium', 'sol/high', 'sol/medium']);
eq('AI_MAX_EFFORT lowers the cap everywhere', r('write', 'investigative', { AI_MAX_EFFORT: 'medium' }), 'luna/medium');
eq('AI_EFFORT_<TASK> sets one task', [r('chat', undefined, { AI_EFFORT_CHAT: 'medium' }), r('write', 'routine', { AI_EFFORT_WRITE: 'high' })], ['luna/medium', 'luna/high']);
eq('AI_FORCE_TIER=sol forces one tier', r('write', 'routine', { AI_FORCE_TIER: 'sol' }), 'sol/medium');
eq('AI_PREMIUM_TIER=astra (with Sol enabled) sends investigative stories to Astra', r('write', 'investigative', { AI_SOL_ENABLED: 'true', AI_PREMIUM_TIER: 'astra' }), 'astra/high');
eq('the model id follows the environment', route({ task: 'write', complexity: 'routine' }, { OPENAI_MODEL_LUNA: 'gpt-5.6-luna' }).model, 'gpt-5.6-luna');
eq('a model that stops at xhigh is never sent max', route({ task: 'write', complexity: 'investigative' }, { OPENAI_MODEL_LUNA: 'gpt-5.4' }).effort, 'xhigh');
eq('Sol is never asked for none', route({ task: 'write', complexity: 'demanding' }, { AI_SOL_ENABLED: 'true', AI_MAX_EFFORT: 'none' }).effort, 'low');
eq('Flex only for background jobs', [route({ task: 'extract', background: true }).flex, route({ task: 'extract' }).flex, route({ task: 'chat', background: false }).flex], [true, false, false]);
eq('AI_FLEX=off switches Flex off', route({ task: 'extract', background: true }, { AI_FLEX: 'off' }).flex, false);

// ── output cap ───────────────────────────────────────────────────────────────────────────────────────────────────────
eq('cap = 1.25 × visible + reserve for the effort', outputCap(3_000, 'medium'), Math.ceil(3_000 * 1.25) + REASONING_RESERVE.medium);
eq('higher effort reserves more', outputCap(3_000, 'high') > outputCap(3_000, 'medium'), true);
eq('never above the hard cap', outputCap(500_000, 'max'), MAX_OUTPUT_CAP);
eq('a tiny answer still gets room', outputCap(10, 'none') >= 1_024, true);
eq('Arabic, Greek and Russian need about twice the tokens of English', tokensForChars(7_600, 'ar') / tokensForChars(7_600, 'en') > 1.8, true);

// ── request body ────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const b = buildRequestBody({ model: 'gpt-6-luna', system: 'SYS', user: 'USR', effort: 'high', expectTokens: 2_000, fn: 'x' }) as Record<string, any>;
  eq('instructions + input, nothing stored', [b.instructions, b.input, b.store, b.model], ['SYS', 'USR', false, 'gpt-6-luna']);
  eq('reasoning effort', b.reasoning, { effort: 'high' });
  eq('cap includes the reasoning reserve', b.max_output_tokens, outputCap(2_000, 'high'));
  ok('no temperature (reasoning models reject it)', !('temperature' in b) && !('max_tokens' in b));
  const j = buildRequestBody({ model: 'm', system: 'S', user: 'U', json: 'object' }) as Record<string, any>;
  eq('JSON mode', j.text, { format: { type: 'json_object' } });
  ok('the word JSON is added when the prompt lacks it', /json/i.test(j.instructions));
  eq('no duplicate JSON instruction when present', (buildRequestBody({ model: 'm', system: 'Return JSON.', user: 'U', json: 'object' }) as Record<string, any>).instructions, 'Return JSON.');
  const s = buildRequestBody({ model: 'm', system: 'S', user: 'U', json: { name: 'core', schema: { type: 'object' } }, cacheKey: 'k1' }) as Record<string, any>;
  eq('strict structured output', s.text, { format: { type: 'json_schema', name: 'core', strict: true, schema: { type: 'object' } } });
  eq('prompt cache key', s.prompt_cache_key, 'k1');
  ok('no reasoning field when no effort is given', !('reasoning' in (buildRequestBody({ model: 'm', system: 'S', user: 'U' }) as object)));
  eq('explicit cap wins', (buildRequestBody({ model: 'm', system: 'S', user: 'U', maxOutputTokens: 1234 }) as Record<string, any>).max_output_tokens, 1234);
}

// ── response parsing ────────────────────────────────────────────────────────────────────────────────────────────────
const completed = (text: string, o: { out?: number; reasoning?: number; inTok?: number; cached?: number } = {}) => ({
  status: 'completed', incomplete_details: null, error: null,
  output: [{ type: 'reasoning', id: 'rs_1', summary: [] }, { type: 'message', id: 'msg_1', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text, annotations: [] }] }],
  usage: { input_tokens: o.inTok ?? 100, input_tokens_details: { cached_tokens: o.cached ?? 0 }, output_tokens: o.out ?? 50, output_tokens_details: { reasoning_tokens: o.reasoning ?? 20 } },
});
{
  const p = parseResponse(completed('  {"a":1}  ', { out: 70, reasoning: 30, inTok: 200, cached: 64 }));
  eq('text is read from the message, the reasoning item is skipped', p.text, '{"a":1}');
  eq('usage is mapped', p.usage, { inputTokens: 200, cachedTokens: 64, outputTokens: 70, reasoningTokens: 30, cacheWriteTokens: 0, serviceTier: undefined });
  const cw = parseResponse({ status: 'completed', service_tier: 'flex', output: [{ type: 'message', content: [{ type: 'output_text', text: 'x' }] }], usage: { input_tokens: 500, input_tokens_details: { cached_tokens: 100, cache_write_tokens: 300 }, output_tokens: 5 } });
  eq('cache-write tokens and the processing tier are read', [cw.usage.cacheWriteTokens, cw.usage.serviceTier], [300, 'flex']);
  const ws = parseResponse({ status: 'completed', output: [{ type: 'web_search_call', id: 'ws_1' }, { type: 'web_search_call', id: 'ws_2' }, { type: 'message', content: [{ type: 'output_text', text: '{"a":1}' }] }] });
  eq('web search calls are counted, the text is still read', [ws.webSearchCalls, ws.text], [2, '{"a":1}']);
  const two = parseResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: 'A' }, { type: 'output_text', text: 'B' }] }] });
  eq('several text parts are joined', two.text, 'AB');
  const ref = parseResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No.' }] }] });
  eq('a refusal has no text', [ref.text, ref.refusal], ['', 'No.']);
  const inc = parseResponse({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [{ type: 'reasoning' }], usage: { output_tokens: 900, output_tokens_details: { reasoning_tokens: 900 } } });
  eq('incomplete reads its reason', [inc.status, inc.incompleteReason, inc.text], ['incomplete', 'max_output_tokens', '']);
  eq('junk does not throw', parseResponse(null).text, '');
}

// ── error classification ────────────────────────────────────────────────────────────────────────────────────────────
const err = (message: string, code = '', type = '') => ({ error: { message, code, type } });
eq('401 is auth', classifyError(401, err('Incorrect API key')).kind, 'auth');
eq('404 is a missing model', classifyError(404, err('The model does not exist')).kind, 'not_found');
eq('a 429 about tokens per minute is worth waiting for', classifyError(429, err('Rate limit reached for gpt-6-luna on tokens per min (TPM): Limit 2000000. Please try again in 6ms.', 'rate_limit_exceeded')), { kind: 'rate', retry: true, message: 'Rate limit reached for gpt-6-luna on tokens per min (TPM): Limit 2000000. Please try again in 6ms.' });
eq('a 429 for no credit is final', classifyError(429, err('You exceeded your current quota, please check your plan and billing details.', 'insufficient_quota')).retry, false);
eq('the organisation spend limit is final', classifyError(429, err('You have reached your organization spend limit.')).kind, 'billing');
eq('billing_hard_limit_reached is final', classifyError(429, err('x', 'billing_hard_limit_reached')).kind, 'billing');
eq('500 and 503 are retried', [classifyError(500, err('boom')).retry, classifyError(503, err('overloaded')).retry], [true, true]);
eq('a schema complaint is recognised', classifyError(400, err("Invalid schema for response_format 'core'")).kind, 'schema');
eq('another 400 is not retried', classifyError(400, err('Unsupported parameter: foo')), { kind: 'bad_request', retry: false, message: 'Unsupported parameter: foo' });

// ── wait headers ────────────────────────────────────────────────────────────────────────────────────────────────────
const hdr = (h: Record<string, string>) => (n: string) => h[n.toLowerCase()] ?? null;
eq('Retry-After in seconds', waitFromHeaders(hdr({ 'retry-after': '7' }), 0), 7000);
eq('Retry-After as a date', waitFromHeaders(hdr({ 'retry-after': new Date(5000).toUTCString() }), 1000), 4000);
eq('reset header minutes and seconds', waitFromHeaders(hdr({ 'x-ratelimit-reset-tokens': '1m30s' }), 0), 90_000);
eq('reset header milliseconds', waitFromHeaders(hdr({ 'x-ratelimit-reset-tokens': '20ms' }), 0), 20);
eq('no header, no wait value', waitFromHeaders(hdr({}), 0), null);

// ── the call: scripted fetch ────────────────────────────────────────────────────────────────────────────────────────
type Step = { status?: number; body?: unknown; headers?: Record<string, string>; throws?: { name: string; message: string } };
function scripted(steps: Step[]) {
  const sent: Record<string, any>[] = []; const urls: string[] = []; const auth: string[] = [];
  let i = 0;
  const f = (async (url: string, init: RequestInit) => {
    sent.push(JSON.parse(String(init.body))); urls.push(url); auth.push(String((init.headers as Record<string, string>).Authorization));
    const s = steps[Math.min(i++, steps.length - 1)];
    if (s.throws) { const e = new Error(s.throws.message); e.name = s.throws.name; throw e; }
    return new Response(JSON.stringify(s.body ?? {}), { status: s.status ?? 200, headers: s.headers });
  }) as unknown as typeof fetch;
  return { f, sent, urls, auth, calls: () => i };
}
const slept: number[] = [];
const base = (fx: ReturnType<typeof scripted>, extra: Record<string, unknown> = {}) => ({ apiKey: 'sk-test', fetch: fx.f, sleep: async (ms: number) => { slept.push(ms); }, ...extra });
const REQ = { model: 'gpt-6-luna', system: 'You are a journalist. Return JSON.', user: 'Write.', effort: 'medium' as Effort, expectTokens: 2_000, json: 'object' as const, fn: 'compose-ro' };

async function main() {
  {
    const fx = scripted([{ body: completed('{"ok":true}', { out: 1_000, reasoning: 600, inTok: 5_000, cached: 4_000 }) }]);
    const events: UsageEvent[] = [];
    const res = await callOpenAI(REQ, base(fx, { onUsage: (e: UsageEvent) => { events.push(e); } }));
    eq('success: text and ok', [res.ok, res.text, res.attempts], [true, '{"ok":true}', 1]);
    eq('success: posts to the Responses endpoint with the key', [fx.urls[0], fx.auth[0]], ['https://api.openai.com/v1/responses', 'Bearer sk-test']);
    eq('success: cost counts cached input and reasoning output', res.usd, 0.00064);
    eq('success: usage event once, labelled', [events.length, events[0].fn, events[0].usage.reasoningTokens], [1, 'compose-ro', 600]);
  }
  {
    slept.length = 0;
    const fx = scripted([{ status: 429, body: err('Rate limit reached on tokens per min (TPM)', 'rate_limit_exceeded'), headers: { 'retry-after': '3' } }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI(REQ, base(fx));
    eq('429 slow-down: waits what the server said, then succeeds', [res.ok, res.attempts, slept[0]], [true, 2, 3000]);
  }
  {
    const fx = scripted([{ status: 429, body: err('You exceeded your current quota, please check your plan and billing details.', 'insufficient_quota') }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI(REQ, base(fx));
    eq('429 out of credit: stops at once', [res.ok, res.kind, res.attempts, fx.calls()], [false, 'billing', 1, 1]);
  }
  {
    const fx = scripted([{ status: 503, body: err('The server is overloaded') }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI(REQ, base(fx));
    eq('503: retried', [res.ok, res.attempts], [true, 2]);
  }
  {
    const fx = scripted([{ status: 500, body: err('boom') }, { status: 500, body: err('boom') }, { status: 500, body: err('boom') }]);
    const res = await callOpenAI(REQ, base(fx));
    eq('persistent 500: gives up after three attempts with the reason', [res.ok, res.attempts, res.kind, res.error], [false, 3, 'overloaded', 'boom']);
  }
  {
    // The hidden reasoning used the whole cap: billed, no text. One retry with a bigger cap.
    const used = { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [{ type: 'reasoning', id: 'rs' }], usage: { input_tokens: 3_000, output_tokens: 9_000, output_tokens_details: { reasoning_tokens: 9_000 } } };
    const fx = scripted([{ body: used }, { body: completed('{"done":true}', { out: 2_000, reasoning: 1_000, inTok: 3_000 }) }]);
    const events: UsageEvent[] = [];
    const res = await callOpenAI({ ...REQ, maxOutputTokens: 9_000 }, base(fx, { onUsage: (e: UsageEvent) => { events.push(e); } }));
    eq('incomplete: second try has a 1.7× cap', [fx.sent[0].max_output_tokens, fx.sent[1].max_output_tokens], [9_000, 15_300]);
    eq('incomplete: succeeds, both attempts are billed and reported', [res.ok, res.attempts, events.length], [true, 2, 2]);
    ok('incomplete: usage is the sum of the attempts', res.usage.outputTokens === 11_000 && res.usage.reasoningTokens === 10_000);
  }
  {
    const used = { status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [], usage: { output_tokens: 100 } };
    const fx = scripted([{ body: used }, { body: used }, { body: used }]);
    const res = await callOpenAI({ ...REQ, maxOutputTokens: 1_500 }, base(fx));
    eq('incomplete twice: reported as incomplete, not as an empty success', [res.ok, res.kind], [false, 'incomplete']);
  }
  {
    const fx = scripted([{ status: 400, body: err("Invalid schema for response_format 'core': nope") }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI({ ...REQ, json: { name: 'core', schema: { type: 'object' } } }, base(fx));
    eq('schema refused: falls back to JSON mode and succeeds', [res.ok, fx.sent[0].text.format.type, fx.sent[1].text.format.type], [true, 'json_schema', 'json_object']);
  }
  {
    const fx = scripted([{ status: 400, body: err("Unsupported value: 'reasoning.effort' does not support 'xhigh'") }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI({ ...REQ, effort: 'xhigh' }, base(fx));
    eq('effort refused: retried one level lower', [res.ok, fx.sent[0].reasoning.effort, fx.sent[1].reasoning.effort], [true, 'xhigh', 'high']);
  }
  {
    const fx = scripted([{ body: { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'I cannot help with that.' }] }], usage: { input_tokens: 10, output_tokens: 5 } } }]);
    const res = await callOpenAI(REQ, base(fx));
    eq('refusal is its own kind', [res.ok, res.kind], [false, 'refusal']);
  }
  {
    const fx = scripted([{ body: { status: 'completed', output: [{ type: 'message', content: [] }], usage: { input_tokens: 10, output_tokens: 5 } } }]);
    const res = await callOpenAI(REQ, base(fx));
    eq('completed but empty is an error, not a success', [res.ok, res.kind], [false, 'empty']);
  }
  {
    const fx = scripted([{ throws: { name: 'TimeoutError', message: 'The operation timed out' } }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI(REQ, base(fx));
    eq('timeout: no second try (it would only burn another window)', [res.ok, res.kind, fx.calls()], [false, 'timeout', 1]);
  }
  {
    const fx = scripted([{ throws: { name: 'TypeError', message: 'fetch failed' } }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI(REQ, base(fx));
    eq('a network error is retried', [res.ok, res.attempts], [true, 2]);
  }
  {
    const fx = scripted([{ body: completed('{"a":1}') }]);
    const t = 1_000_000;
    const res = await callOpenAI(REQ, base(fx, { now: () => t, deadlineAt: t + 500 }));
    eq('no time left: does not even start', [res.ok, res.kind, fx.calls()], [false, 'timeout', 0]);
  }
  {
    const fx = scripted([{ body: completed('{"a":1}') }]);
    const res = await callOpenAI({ ...REQ, model: 'gpt-5.5' }, base(fx));
    eq('gpt-5.5 is refused by the client itself: nothing is sent', [res.ok, res.kind, fx.calls()], [false, 'bad_request', 0]);
  }
  {
    const fx = scripted([{ body: completed('{"a":1}') }]);
    const res = await callOpenAI(REQ, { apiKey: '', fetch: fx.f });
    eq('no key: auth error, nothing sent', [res.ok, res.kind, fx.calls()], [false, 'auth', 0]);
  }
  {
    const fx = scripted([{ status: 401, body: err('Incorrect API key provided') }]);
    const res = await callOpenAI(REQ, base(fx));
    eq('bad key: final', [res.ok, res.kind, res.attempts], [false, 'auth', 1]);
  }
  {
    const fx = scripted([{ body: completed('{"a":1}') }]);
    await callOpenAI({ ...REQ, effort: null }, base(fx));
    ok('no effort: field omitted from the body', !('reasoning' in fx.sent[0]));
  }

  // ── effort step-down ───────────────────────────────────────────────────────────────────────────────────────────────
  {
    const refuse = { status: 400, body: err("Unsupported value: 'reasoning.effort'") };
    const fx = scripted([refuse, refuse, refuse, { body: completed('{"a":1}') }]);
    const res = await callOpenAI({ ...REQ, effort: 'max' }, base(fx, { maxAttempts: 6 }));
    eq('effort refused again and again: max → xhigh → high → medium', [res.ok, fx.sent.map((b) => b.reasoning?.effort)], [true, ['max', 'xhigh', 'high', 'medium']]);
    eq('the effort that finally worked is reported', res.effortUsed, 'medium');
  }
  {
    const refuse = { status: 400, body: err("Unsupported value: 'reasoning.effort'") };
    const fx = scripted([refuse, { body: completed('{"a":1}') }]);
    const res = await callOpenAI({ ...REQ, effort: 'low' }, base(fx, { maxAttempts: 4 }));
    eq('nothing lower than low: the field is dropped', [res.ok, 'reasoning' in fx.sent[1]], [true, false]);
  }

  // ── Flex ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const flexOk = { ...completed('{"a":1}', { inTok: 100_000, out: 10_000, reasoning: 0 }), service_tier: 'flex' };
    const fx = scripted([{ body: flexOk }]);
    const events: UsageEvent[] = [];
    const res = await callOpenAI({ ...REQ, serviceTier: 'flex' }, base(fx, { onUsage: (e: UsageEvent) => { events.push(e); } }));
    eq('flex: asks for the flex tier and is billed at half price', [fx.sent[0].service_tier, res.ok, res.usd, res.tierUsed], ['flex', true, 0.0075, 'flex']);
    eq('flex: the usage event carries the tier', events[0].usage.serviceTier, 'flex');
  }
  {
    slept.length = 0;
    const fx = scripted([{ status: 429, body: err('Resource Unavailable', 'resource_unavailable') }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI({ ...REQ, serviceTier: 'flex' }, base(fx));
    eq('flex unavailable (429): repeated at standard speed at once, without waiting', [res.ok, fx.sent[0].service_tier, 'service_tier' in fx.sent[1], slept.length], [true, 'flex', false, 0]);
  }
  {
    const fx = scripted([{ throws: { name: 'TimeoutError', message: 'timed out' } }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI({ ...REQ, serviceTier: 'flex', flexTimeoutMs: 5_000 }, base(fx));
    eq('flex too slow: falls back to standard and succeeds', [res.ok, res.attempts, 'service_tier' in fx.sent[1]], [true, 2, false]);
  }
  {
    const fx = scripted([{ status: 429, body: err('You exceeded your current quota', 'insufficient_quota') }, { body: completed('{"a":1}') }]);
    const res = await callOpenAI({ ...REQ, serviceTier: 'flex' }, base(fx));
    eq('flex but out of credit: stops, no pointless second request', [res.ok, res.kind, fx.calls()], [false, 'billing', 1]);
  }
  {
    const fx = scripted([{ body: completed('{"a":1}') }]);
    await callOpenAI(REQ, base(fx));
    ok('no flex unless asked', !('service_tier' in fx.sent[0]));
  }

  // ── web search ───────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    const withSearch = { status: 'completed', output: [{ type: 'web_search_call', id: 'ws_1' }, { type: 'web_search_call', id: 'ws_2' }, { type: 'message', content: [{ type: 'output_text', text: '{"ideas":[]}' }] }], usage: { input_tokens: 10_000, output_tokens: 2_000, output_tokens_details: { reasoning_tokens: 500 } } };
    const fx = scripted([{ body: withSearch }]);
    const events: UsageEvent[] = [];
    const res = await callOpenAI({ ...REQ, webSearch: true }, base(fx, { onUsage: (e: UsageEvent) => { events.push(e); } }));
    eq('web search: the tool is offered', fx.sent[0].tools, [{ type: 'web_search' }]);
    ok('web search: no forced output format next to the tool', !('text' in fx.sent[0]));
    eq('web search: two calls counted and priced (0.01 each) on top of the tokens', [res.ok, res.webSearchCalls, res.usd, events[0].webSearchCalls], [true, 2, 0.022, 2]);
    const dear = scripted([{ body: withSearch }]);
    const r2 = await callOpenAI({ ...REQ, webSearch: true }, base(dear, { env: { OPENAI_WEB_SEARCH_USD: '0.025' } }));
    eq('web search: the fee can be overridden', r2.usd, 0.052);
  }
  {
    const fx = scripted([{ body: completed('{"a":1}') }]);
    await callOpenAI({ ...REQ, json: 'object' }, base(fx));
    eq('without web search the JSON format is requested as before', fx.sent[0].text, { format: { type: 'json_object' } });
  }

  // ── JSON helper ────────────────────────────────────────────────────────────────────────────────────────────────────
  eq('strict JSON', parseJsonLoose('{"a":1}'), { a: 1 });
  eq('fenced JSON', parseJsonLoose('```json\n{"a":1}\n```'), { a: 1 });
  eq('JSON with chatter around it', parseJsonLoose('Here you go: {"a":{"b":2}} thanks'), { a: { b: 2 } });
  eq('hopeless input is null', [parseJsonLoose('no json here'), parseJsonLoose('')], [null, null]);

  report('journalism-openai');
}
main().catch((e) => { console.error(e); process.exit(1); });
export type { LlmResult };
