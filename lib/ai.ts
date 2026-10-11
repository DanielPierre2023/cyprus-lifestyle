// Cyprus Lifestyle — the app's door to the text model. ONE provider: OpenAI gpt-6-luna, through lib/journalism/openai.ts (the same client the
// Supabase edge functions use). Spend is logged to ai_spend_log.
//
// See lib/journalism/models.ts for the routing table and the price list: a simple job thinks at "medium", a demanding one at "xhigh", the
// hardest at "max", a chat helper at "low". Call it with callAI({ task, complexity, ... }): the task decides model and reasoning effort;
// background: true asks for Flex processing (half price) with an automatic fall-back. streamAI is the same door for an answer that is read
// while it is written (the concierge chat).
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { aiBudgetDeny } from '@/lib/spendGuard';
import { callOpenAI as callOpenAIShared, parseJsonLoose, type ChatTurn, type ErrorKind, type JsonSpec, type UsageEvent } from '@/lib/journalism/openai';
import { streamOpenAI, type StreamEvent } from '@/lib/journalism/openaiStream';
import { route as routeModel, modelIds, effortForBudget, type Effort, type Task, type Complexity } from '@/lib/journalism/models';

// ── models ──────────────────────────────────────────────────────────────────
// Ids come from the environment (OPENAI_MODEL_LUNA / _SOL / _ASTRA) with the ids shown on the OpenAI account page as defaults.
export const MODEL_IDS = modelIds(process.env);
export const LUNA = MODEL_IDS.luna;
export const SOL = MODEL_IDS.sol;
export const ASTRA = MODEL_IDS.astra;
export const OPENAI_MODEL = LUNA;
/** The model and reasoning effort for a job of the text desk (reads AI_MAX_EFFORT, AI_EFFORT_<TASK>, AI_FORCE_TIER, AI_PREMIUM_TIER, AI_SOL_ENABLED, AI_FLEX). */
export const aiRoute = (task: Task, complexity?: Complexity, attempt?: number, background?: boolean) => routeModel({ task, complexity, attempt, background }, process.env);
export const isOpenAIModel = (m: string | undefined) => /^(gpt-|o\d|chatgpt)/i.test(String(m || ''));
/**
 * What ONE model call may take inside the app. Every route is capped at 60 seconds, so a call is given 48 and thinks only as hard as that
 * allows: medium effort at most (the levels above need more time than a route has). Where routes may run longer (Vercel with Fluid compute
 * allows up to 300 s), set AI_APP_BUDGET_MS=240000 and the app unlocks the higher levels too. The Supabase edge function has its own, longer budget.
 */
export const appBudgetMs = (): number => (Number(process.env.AI_APP_BUDGET_MS) > 0 ? Number(process.env.AI_APP_BUDGET_MS) : 48_000);
/**
 * The clock of one route run (budget of a call + 10 s for the rest of the route, or `totalMs` when the run has less time than that). A function
 * that may ask the model a second time (a correction after a failed check) asks it only if `left()` still allows a full call, and passes
 * `callBudget()` as the call's timeout.
 */
export function budgetClock(now: () => number = Date.now, totalMs?: number) {
  const t0 = now();
  const total = totalMs && totalMs > 0 ? totalMs : appBudgetMs() + 10_000;
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
  /** Earlier messages of a conversation (oldest first). They go to the model as real messages in front of userMessage. */
  history?: ChatTurn[];
  maxTokens?: number;
  jsonMode?: boolean;
  /** An explicit model id (OpenAI only). Leave it out and the routing table picks the model and the reasoning effort for `task`. */
  model?: string;
  timeoutMs?: number; // request abort deadline (default: appBudgetMs()); short for latency-sensitive calls
  deadlineAt?: number; // absolute time (Date.now() scale) after which no new attempt is started
  webSearch?: boolean; // live web research: OpenAI's built-in web_search tool
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

// Markup on the raw provider cost. Default 25% (1.25x); change via the COST_MARKUP_PCT env var. Kept in step with the edge
// functions so every ai_spend_log row, from either side, carries the same markup.
const COST_MARKUP_PCT = Number(process.env.COST_MARKUP_PCT || '25');
const COST_MULTIPLIER = 1 + (COST_MARKUP_PCT / 100);

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

/** Writes one billed response into the spend log (raw provider cost + markup). */
const logUsage = async (e: UsageEvent): Promise<void> => {
  const usd = +(e.usd * COST_MULTIPLIER).toFixed(6);
  await logSpend({ provider: 'openai', model: e.model, function_name: e.fn, units: e.usage.inputTokens + e.usage.outputTokens, usd,
    meta: { in: e.usage.inputTokens, cached: e.usage.cachedTokens, cache_write: e.usage.cacheWriteTokens ?? 0, out: e.usage.outputTokens, reasoning: e.usage.reasoningTokens,
      effort: e.effort ?? null, tier: e.usage.serviceTier ?? null, searches: e.webSearchCalls ?? 0, status: e.status, base_usd: e.usd, markup_pct: COST_MARKUP_PCT } });
};

// ── OpenAI (text desk) ───────────────────────────────────────────────────────────
// A credit / spend-limit refusal cannot be cured by retrying, so after one the desk stops calling for a while instead of
// hammering the API from every cron tick (per server instance; a restart or the pause running out clears it).
let billingPausedUntil = 0;
const BILLING_PAUSE_MS = 10 * 60_000;
const BILLING_PAUSED_MESSAGE = 'OpenAI credit or spend limit reached: top up the balance or raise the limit in the OpenAI dashboard (calls are paused for a few minutes).';

/** The model and effort for a request: an explicit model id wins, otherwise the routing table decides. The effort is lowered to what the time allows, never raised. */
function plan(req: AiRequest, defaultTask?: Task) {
  const task = req.task ?? defaultTask;
  const routed = task ? aiRoute(task, req.complexity, req.attempt, req.background) : null;
  const model = req.model || routed?.model || LUNA;
  const budgetMs = req.timeoutMs ?? appBudgetMs();
  const wanted: Effort | null = req.effort ?? (req.model ? null : routed?.effort ?? null);
  const effort: Effort | null = wanted ? effortForBudget(wanted, budgetMs, routed?.tier ?? 'luna', process.env) : null;
  return { routed, model, budgetMs, effort };
}

export async function callOpenAI(req: AiRequest & { fn?: string }): Promise<AiResponse> {
  const fn = req.fn || 'writer';
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return { text: '', error: 'OPENAI_API_KEY not configured' };
  if (Date.now() < billingPausedUntil) return { text: '', kind: 'billing', error: BILLING_PAUSED_MESSAGE };
  const budgetDeny = await aiBudgetDeny();
  if (budgetDeny) return { text: '', error: budgetDeny };

  const { routed, model, budgetMs, effort } = plan(req);
  const json: JsonSpec | undefined = req.schema ? req.schema : req.jsonMode ? 'object' : undefined;

  const r = await callOpenAIShared(
    {
      model, system: req.systemInstruction, user: req.userMessage, history: req.history, effort, expectTokens: req.expectTokens ?? req.maxTokens ?? 3_000, json,
      timeoutMs: budgetMs, fn, cacheKey: req.cacheKey, webSearch: req.webSearch,
      // Flex (half price) is slower and may be refused; it only pays when the call has time for a fall-back to standard speed.
      serviceTier: routed?.flex && !req.webSearch && budgetMs >= 90_000 ? 'flex' : undefined,
    },
    { apiKey, env: process.env, deadlineAt: req.deadlineAt, onUsage: logUsage },
  );
  if (r.kind === 'billing') billingPausedUntil = Date.now() + BILLING_PAUSE_MS;
  const usd = +(r.usd * COST_MULTIPLIER).toFixed(6);
  const base = { usd, inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens, reasoningTokens: r.usage.reasoningTokens, model, effortUsed: r.effortUsed ?? null, webSearchCalls: r.webSearchCalls ?? 0 };
  return r.ok ? { text: r.text, ...base } : { text: r.text, error: r.error || 'OpenAI error', kind: r.kind, ...base };
}

/**
 * The text desk's entry point. With a task and no model, the routing table picks the model and the reasoning effort. Only OpenAI models
 * exist here: an explicit model id of another vendor is refused instead of being sent to the wrong API.
 */
export async function callAI(req: AiRequest & { fn?: string }): Promise<AiResponse> {
  if (req.model && !isOpenAIModel(req.model)) return { text: '', error: `"${req.model}" is not an OpenAI model: the text desk calls OpenAI only`, kind: 'bad_request' };
  return callOpenAI(req);
}

/**
 * The same door for an answer that is shown while it is written (the concierge chat). Yields the text in pieces and ends with one
 * `end` event (or one `error` event when nothing could be said). Same key, budget guard, billing pause, price list and spend log as callOpenAI.
 * Defaults to the routing table's "chat" task: gpt-6-luna at "low", because the guest is waiting.
 */
export async function* streamAI(req: AiRequest & { fn?: string }): AsyncGenerator<StreamEvent, void, undefined> {
  const fn = req.fn || 'chat';
  const refuse = (kind: ErrorKind, message: string): StreamEvent => ({ type: 'error', kind, message, attempts: 0, ms: 0 });
  if (req.model && !isOpenAIModel(req.model)) { yield refuse('bad_request', `"${req.model}" is not an OpenAI model: the text desk calls OpenAI only`); return; }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { yield refuse('auth', 'OPENAI_API_KEY not configured'); return; }
  if (Date.now() < billingPausedUntil) { yield refuse('billing', BILLING_PAUSED_MESSAGE); return; }
  const budgetDeny = await aiBudgetDeny();
  if (budgetDeny) { yield refuse('billing', budgetDeny); return; }

  const { model, budgetMs, effort } = plan(req, 'chat');
  for await (const ev of streamOpenAI(
    { model, system: req.systemInstruction, user: req.userMessage, history: req.history, effort, expectTokens: req.expectTokens ?? req.maxTokens ?? 900, timeoutMs: budgetMs, fn, cacheKey: req.cacheKey },
    { apiKey, env: process.env, deadlineAt: req.deadlineAt, onUsage: logUsage },
  )) {
    if (ev.type === 'error' && ev.kind === 'billing') billingPausedUntil = Date.now() + BILLING_PAUSE_MS;
    yield ev;
  }
}

// Safe JSON parser for model responses.
export function parseAiJson<T = Record<string, unknown>>(raw: string): T {
  return (parseJsonLoose<T>(raw) ?? ({} as T));
}
