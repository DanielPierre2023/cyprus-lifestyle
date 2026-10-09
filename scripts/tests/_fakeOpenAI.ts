// A scripted OpenAI for the tests of the app's text functions: install it, call the function under test, read what was asked.
// The real lib/ai.ts + lib/journalism/openai.ts (+ openaiStream.ts) run unchanged; only the network is replaced.
/* eslint-disable @typescript-eslint/no-explicit-any */
export interface FakeCall {
  system: string;
  /** The message to answer: the whole input when it is a string, otherwise the content of the last user message. */
  user: string;
  /** The raw `input` as sent: a string, or the messages of a conversation. */
  input: any;
  model: string; effort?: string; tools?: unknown; format?: any; cacheKey?: string;
  /** true when the call asked for a streamed answer. */
  stream: boolean;
  body: any;
}
export type FakeReply = string | { status: number; body: unknown } | { sse: string; chunkBytes?: number } | { stream: Record<string, unknown>[]; chunkBytes?: number };

export function responsesBody(text: string, usage: { in?: number; out?: number } = {}) {
  return { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: usage.in ?? 1500, output_tokens: usage.out ?? 400, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 100 } } };
}

/** The events of a streamed answer in the shape the Responses API sends them: the pieces as text deltas, then the closing message with the usage. */
export function streamEvents(pieces: string[], usage: { in?: number; out?: number; reasoning?: number } = {}): Record<string, unknown>[] {
  const text = pieces.join('');
  return [
    { type: 'response.created', response: { status: 'in_progress', usage: null } },
    ...pieces.map((delta) => ({ type: 'response.output_text.delta', item_id: 'msg_1', output_index: 0, content_index: 0, delta })),
    { type: 'response.completed', response: { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }], usage: { input_tokens: usage.in ?? 1500, output_tokens: usage.out ?? 400, input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: usage.reasoning ?? 100 } } } },
  ];
}

/** Server-sent events as text: one "event:" and one "data:" line per event, a blank line after each. */
export const sseText = (events: Record<string, unknown>[]): string => events.map((e) => `event: ${String(e.type)}\ndata: ${JSON.stringify(e)}\n\n`).join('');

/** A response body that arrives in pieces of `chunkBytes` bytes (0: all at once). Pieces cut through lines and through multi-byte letters, like a real network. */
export function chunkedBody(text: string, chunkBytes = 0): ReadableStream<Uint8Array> {
  const bytes = new TextEncoder().encode(text);
  const n = chunkBytes > 0 ? chunkBytes : Math.max(1, bytes.length);
  return new ReadableStream<Uint8Array>({ start(c) { for (let i = 0; i < bytes.length; i += n) c.enqueue(bytes.slice(i, i + n)); c.close(); } });
}

const userOf = (input: any): string => {
  if (typeof input === 'string') return input;
  if (Array.isArray(input)) { for (let i = input.length - 1; i >= 0; i--) if (input[i]?.role === 'user') return String(input[i].content ?? ''); }
  return String(input || '');
};

/** Replaces fetch and sets a key. `reply` gets every call (and its running number) and returns the model's text, an HTTP failure or a stream. */
export function installFakeOpenAI(reply: (c: FakeCall, n: number) => FakeReply) {
  const g = globalThis as any;
  const calls: FakeCall[] = [];
  const original = g.fetch;
  process.env.OPENAI_API_KEY = 'sk-test-0123456789';
  delete process.env.AI_KILL_SWITCH;
  g.fetch = async (url: string, init?: any) => {
    if (!String(url).includes('api.openai.com')) throw new Error(`unexpected fetch ${url}`);
    // Embeddings are not part of the scripted conversation: answer "no" so retrieval falls back to keywords.
    if (String(url).includes('/v1/embeddings')) return new Response(JSON.stringify({ error: { message: 'embeddings are not scripted in this test' } }), { status: 500, headers: { 'content-type': 'application/json' } });
    const body = JSON.parse(init.body);
    const c: FakeCall = { system: String(body.instructions || ''), user: userOf(body.input), input: body.input, model: body.model, effort: body.reasoning?.effort, tools: body.tools, format: body.text?.format, cacheKey: body.prompt_cache_key, stream: body.stream === true, body };
    calls.push(c);
    const r = reply(c, calls.length);
    if (typeof r === 'string') {
      if (c.stream) return new Response(chunkedBody(sseText(streamEvents([r]))), { status: 200, headers: { 'content-type': 'text/event-stream' } });
      return new Response(JSON.stringify(responsesBody(r)), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if ('sse' in r) return new Response(chunkedBody(r.sse, r.chunkBytes), { status: 200, headers: { 'content-type': 'text/event-stream' } });
    if ('stream' in r) return new Response(chunkedBody(sseText(r.stream), r.chunkBytes), { status: 200, headers: { 'content-type': 'text/event-stream' } });
    return new Response(JSON.stringify(r.body), { status: r.status, headers: { 'content-type': 'application/json' } });
  };
  return { calls, restore: () => { g.fetch = original; } };
}
