// Cyprus Lifestyle — AI provider wrappers. Same interface across providers so the desk can
// route between them. Spend is logged to ai_spend_log (mirrors TT telemetry).
//
// TEXT PRODUCTION RUNS ON OPENAI gpt-6-luna (see lib/journalism/models.ts for the routing table and the price list): a simple job
// thinks at "medium", a demanding one at "xhigh", the hardest at "max". Call it with callAI({ task, complexity, ... }): the task
// decides model and reasoning effort; background: true asks for Flex processing (half price) with an automatic fall-back.
// callClaude below is kept only until the concierge family (chat, rerank, understand, memory, mail drafts) has moved over.
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { aiBudgetDeny } from '@/lib/spendGuard';
import { readClaudeReply, emptyReplyError, rejectsThinkingField } from '@/lib/aiReply';
import { callOpenAI as callOpenAIShared, parseJsonLoose, type ErrorKind, type JsonSpec } from '@/lib/journalism/openai';
import { route as routeModel, modelIds, effortForBudget, type Effort, type Task, type Complexity } from '@/lib/journalism/models';

// ── models ──────────────────────────────────────────────────────────────────
export const CLAUDE_HAIKU = 'claude-haiku-4-5-20251001';
// Current production Sonnet. The former 'claude-sonnet-4-6' was never a real API
// model id — Anthropic rejected every call, which is why the concierge said "busy".
export const CLAUDE_SONNET = 'claude-sonnet-5';
// OpenAI text desk. Ids come from the environment (OPENAI_MODEL_LUNA / _SOL / _ASTRA) with the ids shown on the account page as defaults.
export const MODEL_IDS = modelIds(process.env);
export const LUNA = MODEL_IDS.luna;
export const SOL = MODEL_IDS.sol;
export const ASTRA = MODEL_IDS.astra;
export const OPENAI_MODEL = LUNA;
export const GEMINI_MODEL = 'gemini-2.5-flash';
/** The model and reasoning effort for a job of the text desk (reads AI_MAX_EFFORT, AI_EFFORT_<TASK>, AI_FORCE_TIER, AI_PREMIUM_TIER, AI_SOL_ENABLED, AI_FLEX). */
export const aiRoute = (task: Task, complexity?: Complexity, attempt?: number, background?: boolean) => routeModel({ task, complexity, attempt, background }, process.env);
export const isOpenAIModel = (m: string | undefined) => /^(gpt-|o\d|chatgpt)/i.test(String(m || ''));
/**
 * What ONE model call may take inside the app. Every route is capped at 60 seconds (Vercel Hobby), so a call is given 48 and thinks
 * only as hard as that allows: medium effort at most (the levels above need more time than a route has). On Vercel Pro (routes up to
 * 300 s) set AI_APP_BUDGET_MS=240000 and the app unlocks the higher levels too. The Supabase edge function has its own, longer budget.
 */
export const appBudgetMs = (): number => (Number(process.env.AI_APP_BUDGET_MS) > 0 ? Number(process.env.AI_APP_BUDGET_MS) : 48_000);
/**
 * The clock of one route run (budget of a call + 10 s for the rest of the route). A function that may ask the model a second time
 * (a correction after a failed check) asks it only if `left()` still allows a full call, and passes `callBudget()` as the call's timeout.
 */
export function budgetClock(now: () => number = Date.now) {
  const t0 = now();
  const total = appBudgetMs() + 10_000;
  return {
    left: () => total - (now() - t0),
    /** The timeout for the next call: the app's per-call budget, or what is left of the route if that is less. */
    callBudget: () => Math.max(5_000, Math.min(appBudgetMs(), total - (now() - t0) - 2_000)),
    /** Whether another full call fits (at least 20 s). */
    canRetry: () => total - (now() - t0) - 2_000 >= 20_000,
  };
}

export interface AiRequest {
  systemInstruction: string;
  userMessage: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  model?: string;
  timeoutMs?: number; // request abort deadline (default 120s); short for latency-sensitive calls
  webSearch?: boolean; // live web research: OpenAI's built-in web_search tool (Claude path: Anthropic's)
  maxSearches?: number; // cap web_search tool uses per call (Claude path only)
  noThinking?: boolean; // ask for no hidden reasoning (it is billed and counted against maxTokens); dropped automatically if the API rejects the field
  // ── OpenAI text desk (ignored by Claude/Gemini) ──
  task?: Task;               // callAI picks model + effort from the routing table when no model is given
  complexity?: Complexity;
  attempt?: number;          // rewrite attempt (1 = high, 2 = xhigh, 3+ = max)
  background?: boolean;      // not time-critical (cron, batch): eligible for Flex processing (half price, slower, falls back to standard)
  effort?: Effort;           // overrides the table; the cap AI_MAX_EFFORT still applies to table choices only
  expectTokens?: number;     // about how many visible tokens the answer has (sizes max_output_tokens together with the reasoning reserve); defaults to maxTokens
  schema?: { name: string; schema: Record<string, unknown> }; // strict structured output instead of plain JSON mode
  cacheKey?: string;         // same key on calls sharing a long prefix lets OpenAI reuse it
}
export interface AiResponse {
  text: string;
  error?: string;
  usd?: number;
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  kind?: ErrorKind;
  model?: string;
  effortUsed?: Effort | null;
  webSearchCalls?: number;
}

// Rough per-1M-token USD prices for the Claude and Gemini estimates (OpenAI is priced exactly by lib/journalism/models.ts).
const PRICE_PER_MTOK: Record<string, { in: number; out: number }> = {
  [CLAUDE_HAIKU]: { in: 1.0, out: 5.0 },
  [CLAUDE_SONNET]: { in: 3.0, out: 15.0 },
  [GEMINI_MODEL]: { in: 0.3, out: 2.5 },
};

// Markup on the raw provider cost. Default 25% (1.25x); change via the
// COST_MARKUP_PCT env var. Kept in step with the edge function so every
// ai_spend_log row, from either side, carries the same markup.
const COST_MARKUP_PCT = Number(process.env.COST_MARKUP_PCT || '25');
const COST_MULTIPLIER = 1 + (COST_MARKUP_PCT / 100);

// Raw provider cost (no markup). Callers apply COST_MULTIPLIER for the logged usd.
function estimateUsd(model: string, inTok: number, outTok: number): number {
  const p = PRICE_PER_MTOK[model] ?? { in: 2, out: 8 };
  return +(((inTok * p.in) + (outTok * p.out)) / 1_000_000).toFixed(6);
}

// ── spend logging (ai_spend_log) ──────────────────────────────────────────────
export async function logSpend(row: {
  provider: string; model: string; function_name: string;
  units?: number; unit_kind?: string; usd?: number; caller?: string; meta?: unknown;
}) {
  try {
    // provider/model are intentionally NOT persisted — every row is stored with a
    // neutral 'llm' so the spend log keeps no trace of which model was used.
    await supabaseAdmin().from('ai_spend_log').insert({
      provider: 'llm',
      model: 'llm',
      function_name: row.function_name,
      units: row.units ?? null,
      unit_kind: row.unit_kind ?? 'tokens',
      usd: row.usd ?? null,
      caller: row.caller ?? null,
      meta: row.meta ?? {},
    });
  } catch (e) {
    console.warn('[spend] log failed:', (e as Error).message);
  }
}

async function fetchWithRetry(url: string, init: RequestInit, attempt = 0): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 429 && attempt < 3) {
    const delay = Math.pow(2, attempt) * 2000;
    console.warn(`[ai] 429 — retry in ${delay}ms (${attempt + 1}/3)`);
    await new Promise((r) => setTimeout(r, delay));
    return fetchWithRetry(url, init, attempt + 1);
  }
  return res;
}

// ── Claude (Anthropic) ─────────────────────────────────────────────────────────
export async function callClaude(req: AiRequest & { fn?: string }): Promise<AiResponse> {
  const {
    systemInstruction, userMessage, maxTokens = 4096,
    jsonMode = false, model = CLAUDE_HAIKU, fn = 'writer', timeoutMs = 120_000,
    webSearch = false, maxSearches = 5, noThinking = false,
  } = req;
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) return { text: '', error: 'CLAUDE_API_KEY not configured' };
  const budgetDeny = await aiBudgetDeny();
  if (budgetDeny) return { text: '', error: budgetDeny };

  const system = jsonMode
    ? `${systemInstruction}\n\nCRITICAL: Respond with ONLY a valid JSON object. No markdown, no backticks, no preamble, no explanation. Start with { and end with }.`
    : systemInstruction;

  try {
    // NOTE: newer Claude models (sonnet-5 / opus-5) reject the `temperature` field
    // with a 400, so it is intentionally not sent.
    const send = (withoutThinking: boolean) => fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': apiKey },
      body: JSON.stringify({
        model, max_tokens: maxTokens, system,
        messages: [{ role: 'user', content: userMessage }],
        ...(withoutThinking ? { thinking: { type: 'disabled' } } : {}),
        // Anthropic runs web_search server-side (searches, reads, then answers); we
        // extract only the final text blocks below, so the JSON contract still holds.
        ...(webSearch ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: maxSearches }] } : {}),
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    let res = await send(noThinking);
    let data = await res.json();
    // A model that does not know the optional field answers 400: repeat once without it (a rejected call is not billed).
    if (!res.ok && noThinking && rejectsThinkingField(res.status, data?.error?.message)) { res = await send(false); data = await res.json(); }
    if (!res.ok) return { text: '', error: data.error?.message || 'Claude API error' };
    const reply = readClaudeReply(data);
    const text = reply.text;
    const inTok = data.usage?.input_tokens ?? 0;
    const outTok = data.usage?.output_tokens ?? 0;
    const base = estimateUsd(model, inTok, outTok);
    const usd = +(base * COST_MULTIPLIER).toFixed(6); // raw provider cost + markup
    await logSpend({ provider: 'anthropic', model, function_name: fn, units: inTok + outTok, usd, meta: { in: inTok, out: outTok, base_usd: base, markup_pct: COST_MARKUP_PCT } });
    if (!text) return { text: '', error: emptyReplyError(reply), usd, inputTokens: inTok, outputTokens: outTok };
    return { text, usd, inputTokens: inTok, outputTokens: outTok };
  } catch (e) {
    return { text: '', error: (e as Error).message };
  }
}

// ── OpenAI (text desk) ───────────────────────────────────────────────────────────
// A credit / spend-limit refusal cannot be cured by retrying, so after one the desk stops calling for a while instead of
// hammering the API from every cron tick (per server instance; a restart or the pause running out clears it).
let billingPausedUntil = 0;
const BILLING_PAUSE_MS = 10 * 60_000;

export async function callOpenAI(req: AiRequest & { fn?: string }): Promise<AiResponse> {
  const fn = req.fn || 'writer';
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { text: '', error: 'OPENAI_API_KEY not configured' };
  if (Date.now() < billingPausedUntil) return { text: '', kind: 'billing', error: 'OpenAI credit or spend limit reached: top up the balance or raise the limit in the OpenAI dashboard (calls are paused for a few minutes).' };
  const budgetDeny = await aiBudgetDeny();
  if (budgetDeny) return { text: '', error: budgetDeny };

  const routed = req.task ? aiRoute(req.task, req.complexity, req.attempt, req.background) : null;
  const model = req.model || routed?.model || LUNA;
  const budgetMs = req.timeoutMs ?? appBudgetMs();
  const wanted: Effort | null = req.effort ?? (req.model ? null : routed?.effort ?? null);
  // The effort is lowered to what the time allows (a route has 60 s), never raised.
  const effort: Effort | null = wanted ? effortForBudget(wanted, budgetMs, routed?.tier ?? 'luna', process.env) : null;
  const json: JsonSpec | undefined = req.schema ? req.schema : req.jsonMode ? 'object' : undefined;

  const r = await callOpenAIShared(
    {
      model, system: req.systemInstruction, user: req.userMessage, effort, expectTokens: req.expectTokens ?? req.maxTokens ?? 3_000, json,
      timeoutMs: budgetMs, fn, cacheKey: req.cacheKey, webSearch: req.webSearch,
      // Flex (half price) is slower and may be refused; it only pays when the call has time for a fall-back to standard speed.
      serviceTier: routed?.flex && !req.webSearch && budgetMs >= 90_000 ? 'flex' : undefined,
    },
    {
      apiKey, env: process.env,
      onUsage: async (e) => {
        const usd = +(e.usd * COST_MULTIPLIER).toFixed(6); // raw provider cost + markup
        await logSpend({ provider: 'openai', model: e.model, function_name: e.fn, units: e.usage.inputTokens + e.usage.outputTokens, usd,
          meta: { in: e.usage.inputTokens, cached: e.usage.cachedTokens, cache_write: e.usage.cacheWriteTokens ?? 0, out: e.usage.outputTokens, reasoning: e.usage.reasoningTokens,
            effort: e.effort ?? null, tier: e.usage.serviceTier ?? null, searches: e.webSearchCalls ?? 0, status: e.status, base_usd: e.usd, markup_pct: COST_MARKUP_PCT } });
      },
    },
  );
  if (r.kind === 'billing') billingPausedUntil = Date.now() + BILLING_PAUSE_MS;
  const usd = +(r.usd * COST_MULTIPLIER).toFixed(6);
  const base = { usd, inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens, reasoningTokens: r.usage.reasoningTokens, model, effortUsed: r.effortUsed ?? null, webSearchCalls: r.webSearchCalls ?? 0 };
  return r.ok ? { text: r.text, ...base } : { text: r.text, error: r.error || 'OpenAI error', kind: r.kind, ...base };
}

/**
 * The text desk's entry point: routes by model id (gpt-… → OpenAI, claude-… → Anthropic, gemini-… → Google). With a task and no
 * model, the routing table picks the model and the reasoning effort.
 */
export async function callAI(req: AiRequest & { fn?: string }): Promise<AiResponse> {
  const m = req.model;
  if (!m || isOpenAIModel(m)) return callOpenAI(req);
  if (/^gemini/i.test(m)) return callGemini(req);
  return callClaude(req);
}

// ── Gemini (Google) ─────────────────────────────────────────────────────────
export async function callGemini(req: AiRequest & { fn?: string }): Promise<AiResponse> {
  const {
    systemInstruction, userMessage, temperature = 0.7, maxTokens = 2000,
    jsonMode = false, model = GEMINI_MODEL, fn = 'research',
  } = req;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { text: '', error: 'GEMINI_API_KEY not configured' };
  const budgetDeny = await aiBudgetDeny();
  if (budgetDeny) return { text: '', error: budgetDeny };
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  try {
    const res = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { temperature, maxOutputTokens: maxTokens, ...(jsonMode ? { responseMimeType: 'application/json' } : {}) },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const data = await res.json();
    if (!res.ok) return { text: '', error: data.error?.message || 'Gemini API error' };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const inTok = data.usageMetadata?.promptTokenCount ?? 0;
    const outTok = data.usageMetadata?.candidatesTokenCount ?? 0;
    const base = estimateUsd(model, inTok, outTok);
    const usd = +(base * COST_MULTIPLIER).toFixed(6); // raw provider cost + markup
    await logSpend({ provider: 'google', model, function_name: fn, units: inTok + outTok, usd, meta: { in: inTok, out: outTok, base_usd: base, markup_pct: COST_MARKUP_PCT } });
    return { text, usd, inputTokens: inTok, outputTokens: outTok };
  } catch (e) {
    return { text: '', error: (e as Error).message };
  }
}

// Safe JSON parser for model responses.
export function parseAiJson<T = Record<string, unknown>>(raw: string): T {
  return (parseJsonLoose<T>(raw) ?? ({} as T));
}
