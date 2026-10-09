// lib/journalism/openaiStream.ts — the streaming half of the OpenAI client (Responses API, server-sent events).
//
// The one-shot client (./openai) waits for the whole answer. A guest in the concierge chat should read the answer while it is written,
// so this one hands on every piece of text as it arrives. Everything else is shared with the one-shot client on purpose: the request
// body (buildRequestBody), the error classes (classifyError), the reading of a finished response (parseResponse) and the price list
// (costUsd), so the chat can never drift away from the rest of the desk.
//
// Pure: fetch, setTimeout, TextDecoder and AbortSignal.timeout only, so a test can script the network.
//
// Rules it keeps:
//   • a failure BEFORE the first word is retried (a rate limit, an overloaded server, an effort or cache key the model refuses);
//   • a failure AFTER the first word is never retried (the guest has read it already) and ends the answer as "cut off";
//   • the billed usage is reported once, through deps.onUsage, whenever the stream says what it used;
//   • leaving the loop early (the guest closed the tab) closes the connection, which stops the model.
import {
  buildRequestBody, classifyError, parseResponse, waitFromHeaders, addUsage, defaultSleep, isTimeout, lowerEffort, ZERO_USAGE,
  type ErrorKind, type LlmDeps, type LlmRequest,
} from './openai';
import { costUsd, isBlockedModel, MAX_OUTPUT_CAP, type Effort, type Usage } from './models';

export interface StreamResult {
  /** The model finished its answer. */
  ok: boolean;
  /** Everything the guest was given (all deltas together). */
  text: string;
  /** "completed", "incomplete", "failed", or "cut" when the connection ended without a closing message. */
  status: string;
  incompleteReason?: string;
  /** Why the answer is not ok, for the log. */
  error?: string;
  usage: Usage;
  /** Raw provider cost in USD, all attempts together (no markup). */
  usd: number;
  ms: number;
  /** Milliseconds from the start of the call to the first word (null: no word came). */
  firstWordMs: number | null;
  attempts: number;
  model: string;
  effortUsed: Effort | null;
}

export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'end'; result: StreamResult }
  | { type: 'error'; kind: ErrorKind; message: string; attempts: number; ms: number };

/**
 * The JSON payloads of a server-sent-events body, one per "data:" line. Lines that are not JSON (keep-alive comments, "[DONE]", a
 * damaged line) are skipped. Closing the generator early cancels the body, which closes the connection.
 */
export async function* sseEvents(stream: ReadableStream<Uint8Array>): AsyncGenerator<Record<string, unknown>, void, undefined> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const parse = (line: string): Record<string, unknown> | null => {
    const s = line.trim();
    if (!s.startsWith('data:')) return null;
    const payload = s.slice(5).trim();
    if (!payload || payload === '[DONE]') return null;
    try { const v = JSON.parse(payload); return v && typeof v === 'object' ? (v as Record<string, unknown>) : null; } catch { return null; }
  };
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true }); // a multi-byte letter may be split between two chunks: the decoder keeps the half
      const lines = buf.split('\n');
      buf = lines.pop() ?? '';
      for (const line of lines) { const e = parse(line); if (e) yield e; }
    }
    buf += decoder.decode();
    const last = parse(buf);
    if (last) yield last;
  } finally {
    try { await reader.cancel(); } catch { /* already closed */ }
  }
}

/** A failure the stream reports itself ("error" event or a failed response): which class, and whether another try can help. */
function streamFailure(code: string, message: string): { kind: ErrorKind; retry: boolean } {
  const looksLikeLimit = /rate[ _-]?limit|quota|billing|credit|spend limit|hard limit/i.test(`${code} ${message}`);
  const c = classifyError(looksLikeLimit ? 429 : 500, { error: { message, code } });
  return { kind: c.kind, retry: c.retry };
}

export async function* streamOpenAI(req: LlmRequest, deps: LlmDeps): AsyncGenerator<StreamEvent, void, undefined> {
  const now = deps.now ?? (() => Date.now());
  const sleep = deps.sleep ?? defaultSleep;
  const doFetch = deps.fetch ?? fetch;
  const url = `${(deps.baseUrl || 'https://api.openai.com').replace(/\/+$/, '')}/v1/responses`;
  const maxAttempts = Math.max(1, deps.maxAttempts ?? 3);
  const fn = req.fn || 'stream';
  const t0 = now();
  let attempts = 0;
  const body: Record<string, unknown> = { ...buildRequestBody(req), stream: true };
  const effortNow = (): Effort | null => (body.reasoning as { effort?: Effort } | undefined)?.effort ?? null;
  const fail = (kind: ErrorKind, message: string): StreamEvent => ({ type: 'error', kind, message, attempts, ms: now() - t0 });

  if (isBlockedModel(req.model)) { yield fail('bad_request', `model ${req.model} is blocked by policy and is never called`); return; }
  if (!deps.apiKey) { yield fail('auth', 'OPENAI_API_KEY not configured'); return; }

  let text = ''; // what the guest has been given: empty at the start of every attempt, because a later attempt happens only if nothing was
  let firstWordMs: number | null = null;
  let usage: Usage = ZERO_USAGE; let usd = 0; let bumped = false;
  let last: { kind: ErrorKind; message: string } = { kind: 'unknown', message: 'no attempt made' };
  const end = (r: { ok: boolean; status: string; error?: string; incompleteReason?: string }): StreamEvent => ({
    type: 'end',
    result: { ...r, text, usage, usd: +usd.toFixed(6), ms: now() - t0, firstWordMs, attempts, model: req.model, effortUsed: effortNow() },
  });

  while (attempts < maxAttempts) {
    if (deps.deadlineAt !== undefined && now() >= deps.deadlineAt - 1_500) { yield fail('timeout', `out of time before attempt ${attempts + 1}`); return; }
    attempts++;
    const budget = deps.deadlineAt !== undefined ? Math.max(2_000, deps.deadlineAt - now()) : Infinity;
    const timeoutMs = Math.min(req.timeoutMs ?? 90_000, budget);
    const tStart = now();
    let res: Response;
    try {
      res = await doFetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deps.apiKey}` },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      // A call that timed out was already slow: a second try would only burn another full window.
      if (isTimeout(e)) { yield fail('timeout', `${fn}: no answer after ${Math.round(timeoutMs / 1000)}s`); return; }
      last = { kind: 'network', message: (e as Error)?.message || 'network error' };
      await sleep(700 * attempts);
      continue;
    }

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      let data: unknown = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
      const c = classifyError(res.status, data);
      last = { kind: c.kind, message: c.message };
      if (c.kind === 'bad_request' && body.reasoning && /reasoning|effort/i.test(c.message)) {
        // The model refuses this effort: one level lower, and so on; when nothing is left, no effort at all (the model's default).
        const lower = lowerEffort((body.reasoning as { effort: Effort }).effort);
        if (lower) body.reasoning = { effort: lower }; else delete body.reasoning;
        continue;
      }
      if (c.kind === 'bad_request' && body.prompt_cache_key && /prompt_cache_key/i.test(c.message)) { delete body.prompt_cache_key; continue; }
      if (!c.retry || attempts >= maxAttempts) { yield fail(c.kind, c.message); return; }
      const headerWait = waitFromHeaders((n) => res.headers.get(n), now());
      // A guest is waiting: a server that asks for a long pause is answered with an error, not with a long silence.
      if (headerWait !== null && headerWait > 6_000) { yield fail(c.kind, `${c.message} (asked to wait ${Math.round(headerWait / 1000)}s)`); return; }
      await sleep(Math.min(4_000, headerWait ?? 800 * 2 ** (attempts - 1)));
      continue;
    }
    if (!res.body) { last = { kind: 'empty', message: 'the answer had no body' }; continue; }

    let final: ReturnType<typeof parseResponse> | null = null; let finalType = '';
    let refusal = ''; let streamError: { code: string; message: string } | null = null; let broken = '';
    try {
      for await (const evt of sseEvents(res.body)) {
        const type = typeof evt.type === 'string' ? evt.type : '';
        if (type === 'response.output_text.delta') {
          const d = typeof evt.delta === 'string' ? evt.delta : '';
          if (d) { if (firstWordMs === null) firstWordMs = now() - t0; text += d; yield { type: 'delta', text: d }; }
        } else if (type === 'response.refusal.delta') {
          refusal += typeof evt.delta === 'string' ? evt.delta : '';
        } else if (type === 'response.completed' || type === 'response.incomplete' || type === 'response.failed') {
          final = parseResponse(evt.response); finalType = type;
        } else if (type === 'error') {
          streamError = { code: String(evt.code ?? ''), message: String(evt.message ?? 'stream error') };
        }
      }
    } catch (e) {
      broken = isTimeout(e) ? `no complete answer after ${Math.round(timeoutMs / 1000)}s` : ((e as Error)?.message || 'the connection broke');
    }

    if (final) {
      usage = addUsage(usage, final.usage);
      const spent = costUsd(req.model, final.usage, deps.env ?? {});
      usd += spent;
      if (deps.onUsage && final.usage.inputTokens + final.usage.outputTokens > 0) {
        try { await deps.onUsage({ fn, model: req.model, usage: final.usage, usd: spent, ms: now() - tStart, status: final.status, effort: effortNow() ?? req.effort ?? null, webSearchCalls: 0 }); } catch { /* telemetry never breaks a call */ }
      }
      if (finalType === 'response.failed' || final.status === 'failed') {
        const msg = final.errorMessage || 'the model reported a failure';
        const f = streamFailure('', msg);
        if (text) { yield end({ ok: false, status: 'failed', error: msg }); return; }
        last = { kind: f.kind, message: msg };
        if (!f.retry || attempts >= maxAttempts) { yield fail(f.kind, msg); return; }
        await sleep(Math.min(4_000, 800 * 2 ** (attempts - 1)));
        continue;
      }
      if (finalType === 'response.incomplete' || final.status === 'incomplete') {
        const cap = Number(body.max_output_tokens) || 0;
        if (!text && final.incompleteReason === 'max_output_tokens' && !bumped && cap < MAX_OUTPUT_CAP && attempts < maxAttempts) {
          // The cap was used up by hidden reasoning before any word. Billed already; once more with room to finish.
          bumped = true; body.max_output_tokens = Math.min(MAX_OUTPUT_CAP, Math.ceil(cap * 1.7));
          last = { kind: 'incomplete', message: `cap ${cap} used up (${final.usage.reasoningTokens} reasoning tokens)` };
          continue;
        }
        if (!text) { yield fail('incomplete', `incomplete: ${final.incompleteReason || 'unknown reason'} (cap ${cap}, ${final.usage.reasoningTokens} reasoning tokens)`); return; }
        yield end({ ok: false, status: 'incomplete', incompleteReason: final.incompleteReason, error: `incomplete: ${final.incompleteReason || 'unknown reason'}` });
        return;
      }
      if (!text) {
        yield refusal ? fail('refusal', `refused: ${refusal.slice(0, 160)}`) : fail('empty', 'empty reply (no visible text)');
        return;
      }
      yield end({ ok: true, status: final.status });
      return;
    }

    // No closing message: the stream reported an error, or the connection ended early.
    if (text) { yield end({ ok: false, status: 'cut', error: broken || streamError?.message || 'the connection ended before the answer was complete' }); return; }
    if (streamError) {
      const f = streamFailure(streamError.code, streamError.message);
      last = { kind: f.kind, message: streamError.message };
      if (!f.retry || attempts >= maxAttempts) { yield fail(f.kind, streamError.message); return; }
      await sleep(Math.min(4_000, 800 * 2 ** (attempts - 1)));
      continue;
    }
    last = { kind: 'network', message: broken || 'the stream ended without an answer' };
    await sleep(700 * attempts);
  }
  yield fail(last.kind, last.message);
}
