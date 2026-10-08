// scripts/edge/shared.ts — what every OpenAI-backed edge function needs: the environment, the database client, the spend log with its
// markup, the budget guard and kill switch, the routed model call, and the scrubber that keeps vendor, model and key names out of what an
// admin can read. Bundled into each generated function by scripts/build-edge-journalism.mjs.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { callOpenAI, type LlmResult, type UsageEvent } from '@/lib/journalism/openai';
import { route, effortForBudget, type EnvLike, type Task, type Complexity } from '@/lib/journalism/models';
import { parseBudgets, killSwitchOn, decideBudget, windowStarts, sumUsd } from '@/lib/aiBudget';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SupaClient = ReturnType<typeof createClient<any, any, any>>;

/** The environment as the shared modules read it (models, prices, budgets). Lazy: only the keys they ask for are looked up. */
export const ENV: EnvLike = new Proxy({} as EnvLike, { get: (_t, k) => (typeof k === 'string' ? Deno.env.get(k) : undefined) });
export const numEnv = (k: string, d: number) => { const v = Number(Deno.env.get(k)); return Number.isFinite(v) && v > 0 ? v : d; };
export const markupPct = (): number => { const v = Number(Deno.env.get('COST_MARKUP_PCT') ?? '25'); return Number.isFinite(v) && v >= 0 ? v : 25; };

let _admin: SupaClient | null = null;
export function adminClient(): SupaClient {
  if (!_admin) _admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  return _admin;
}
export { createClient };

// ── errors that reach an admin must not carry vendor, model or key names ───────────────────────────────────────────────
export function scrubModelNames(s: string): string {
  if (!s) return s;
  return s
    .replace(/\b(?:sk|rk|pk)-[A-Za-z0-9_*\-]{6,}/g, 'the key')
    .replace(/\borg-[A-Za-z0-9]{6,}/g, 'the organisation')
    .replace(/claude-[\w.\-]+/gi, 'the model').replace(/gemini-[\w.\-]+/gi, 'the model').replace(/gpt-[\w.\-]+/gi, 'the model')
    .replace(/\b(?:sonnet|opus|haiku|gpt4o|gpt|gemini|anthropic|openai|luna|astra)\b/gi, 'the model')
    .replace(/\bthe model(?:[ ,/|]+the model)+\b/gi, 'the model');
}

// ── spend log ───────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Cost { calls: number; baseUsd: number; usd: number }
export const newCost = (): Cost => ({ calls: 0, baseUsd: 0, usd: 0 });

/** One row per billed model call, priced from the real token counts (reasoning, cache and tier included) plus the house markup. */
export async function logSpend(supabase: SupaClient, caller: string, e: UsageEvent, cost: Cost): Promise<void> {
  const pct = markupPct();
  const usd = +(e.usd * (1 + pct / 100)).toFixed(6);
  cost.calls++; cost.baseUsd += e.usd; cost.usd += usd;
  try {
    // provider and model are not persisted: every row carries a neutral 'llm', so the spend log keeps no trace of which model was used.
    await supabase.from('ai_spend_log').insert({
      provider: 'llm', model: 'llm', function_name: e.fn, units: e.usage.inputTokens + e.usage.outputTokens, unit_kind: 'tokens', usd, caller,
      meta: { in: e.usage.inputTokens, cached: e.usage.cachedTokens, cache_write: e.usage.cacheWriteTokens ?? 0, out: e.usage.outputTokens, reasoning: e.usage.reasoningTokens, effort: e.effort ?? null, tier: e.usage.serviceTier ?? null, searches: e.webSearchCalls ?? 0, status: e.status, base_usd: e.usd, markup_pct: pct },
    });
  } catch { /* telemetry never breaks a call */ }
}

// ── budget guard ────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function spendSince(supabase: SupaClient, iso: string): Promise<number> {
  const rpc = await supabase.rpc('ai_spend_since', { p_since: iso });
  if (!rpc.error && rpc.data != null) { const n = Number(rpc.data); if (Number.isFinite(n)) return n; }
  const { data, error } = await supabase.from('ai_spend_log').select('usd').gte('occurred_at', iso).limit(20000);
  if (error) throw new Error(error.message);
  return sumUsd(data as { usd?: unknown }[]);
}
/** null = go ahead; otherwise the reason not to. Same switches and limits as the app (lib/spendGuard.ts); a failing meter never stops the desk. */
export async function budgetDeny(supabase: SupaClient): Promise<string | null> {
  if (killSwitchOn(ENV)) return 'AI is switched off (AI_KILL_SWITCH).';
  const budgets = parseBudgets(ENV);
  if (budgets.dailyUsd === 0 && budgets.monthlyUsd === 0) return null;
  try {
    const { dayIso, monthIso } = windowStarts(new Date());
    const [day, month] = await Promise.all([spendSince(supabase, dayIso), spendSince(supabase, monthIso)]);
    const d = decideBudget({ killSwitch: false, budgets, spentDayUsd: day, spentMonthUsd: month });
    return d.allowed ? null : d.reason;
  } catch (e) {
    console.error('[budget] cannot read ai_spend_log, continuing:', (e as Error).message);
    return null;
  }
}

// ── the routed model call ───────────────────────────────────────────────────────────────────────────────────────────────
export interface AskSpec {
  fn: string; task: Task; complexity?: Complexity; attempt?: number; system: string; user: string;
  json?: 'object' | { name: string; schema: Record<string, unknown> }; expectTokens?: number; cacheKey?: string; timeoutMs?: number; deadlineAt?: number;
}
/**
 * Routes the job (model and effort from the table), lowers the effort to the time that is left, calls the model, bills the call.
 * `flex` asks for half-price Flex processing; a function with a wall clock to keep leaves it off.
 */
export function makeAsk(supabase: SupaClient, caller: string, deadlineAt: number, cost: Cost, flex = false) {
  return (spec: AskSpec): Promise<LlmResult> => {
    const r = route({ task: spec.task, complexity: spec.complexity, attempt: spec.attempt, background: flex }, ENV);
    const dl = spec.deadlineAt ?? deadlineAt;
    const effort = effortForBudget(r.effort, dl - Date.now(), r.tier, ENV);
    return callOpenAI(
      { model: r.model, system: spec.system, user: spec.user, effort, expectTokens: spec.expectTokens, json: spec.json, fn: spec.fn, cacheKey: spec.cacheKey, timeoutMs: spec.timeoutMs ?? 120_000, serviceTier: r.flex ? 'flex' : undefined },
      { apiKey: Deno.env.get('OPENAI_API_KEY') || '', env: ENV, deadlineAt: dl, onUsage: (e) => logSpend(supabase, caller, e, cost) },
    );
  };
}
