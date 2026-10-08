// A scripted OpenAI for the tests of the app's text functions: install it, call the function under test, read what was asked.
// The real lib/ai.ts + lib/journalism/openai.ts run unchanged; only the network is replaced.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FakeCall { system: string; user: string; model: string; effort?: string; tools?: unknown; format?: any; cacheKey?: string; body: any }
export type FakeReply = string | { status: number; body: unknown };

export function responsesBody(text: string, usage: { in?: number; out?: number } = {}) {
  return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: usage.in ?? 1500, output_tokens: usage.out ?? 400, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 100 } } };
}

/** Replaces fetch and sets a key. `reply` gets every call (and its running number) and returns the model's text or an HTTP failure. */
export function installFakeOpenAI(reply: (c: FakeCall, n: number) => FakeReply) {
  const g = globalThis as any;
  const calls: FakeCall[] = [];
  const original = g.fetch;
  process.env.OPENAI_API_KEY = 'sk-test-0123456789';
  delete process.env.AI_KILL_SWITCH;
  g.fetch = async (url: string, init?: any) => {
    if (!String(url).includes('api.openai.com')) throw new Error(`unexpected fetch ${url}`);
    const body = JSON.parse(init.body);
    const c: FakeCall = { system: String(body.instructions || ''), user: String(body.input || ''), model: body.model, effort: body.reasoning?.effort, tools: body.tools, format: body.text?.format, cacheKey: body.prompt_cache_key, body };
    calls.push(c);
    const r = reply(c, calls.length);
    if (typeof r === 'string') return new Response(JSON.stringify(responsesBody(r)), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  };
  return { calls, restore: () => { g.fetch = original; } };
}
