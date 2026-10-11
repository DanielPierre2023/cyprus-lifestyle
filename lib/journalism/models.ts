// lib/journalism/models.ts — which model does which job, how hard it thinks and what it costs.
// Pure (no imports, no I/O): the SAME file is used by the Next app and, copied in by scripts/build-edge-journalism.mjs, by the
// Supabase edge functions, so the routing and the price table can never drift apart.
//
// The whole desk runs on OpenAI gpt-6-luna (verified against developers.openai.com, October 2026):
//   Luna  gpt-6-luna    reasoning none…max, default medium   $0.10 in / $0.01 cached / $0.125 cache write / $0.50 out per 1M tokens
//                       Build tier: 5,000 RPM, 2,000,000 TPM, 20,000,000 batch queue; Flex = half price, slower
//   Sol   gpt-6.1-sol   reasoning low…max   $2.00 / $0.10 / $10.00      (only if AI_SOL_ENABLED=true)
//   Astra gpt-6-astra   reasoning low…max   $10.00 / $1.00 / $50.00     (only if AI_PREMIUM_TIER=astra)
// gpt-5.5 is BLOCKED on the owner's instruction ("never, for nothing"): modelIds() ignores any setting that points at it and the
// client refuses to send it (see isBlockedModel). For the record: it costs 50x Luna per input token, and "long context" is only a
// price and rate-limit class for prompts above 272K tokens, which no job of ours reaches.
//
// Policy (owner's decision): simple recurring jobs run on Luna "medium"; demanding ones on "xhigh", the hardest on "max". Chat
// helpers that have to answer within seconds run on "low". Reasoning tokens are billed as output tokens.

export type Effort = 'none' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
export const EFFORT_ORDER: Effort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'];
export type Tier = 'luna' | 'sol' | 'astra';
export type EnvLike = Record<string, string | undefined>;

export const DEFAULT_MODEL_IDS: Record<Tier, string> = { luna: 'gpt-6-luna', sol: 'gpt-6.1-sol', astra: 'gpt-6-astra' };

/** USD per 1,000,000 tokens, standard processing, prompt up to 272K tokens (OpenAI pricing page). */
export interface Price { in: number; cachedIn: number; out: number; cacheWrite: number }
export const PRICES: Record<string, Price> = {
  // GPT-5.6 and later bill a cache WRITE at 1.25x the uncached input rate (implicit caching writes by default).
  'gpt-6-luna': { in: 0.10, cachedIn: 0.01, out: 0.50, cacheWrite: 0.125 },
  'gpt-6.1-sol': { in: 2.00, cachedIn: 0.10, out: 10.00, cacheWrite: 2.50 },
  'gpt-6-sol': { in: 2.00, cachedIn: 0.20, out: 10.00, cacheWrite: 2.50 },
  'gpt-6-astra': { in: 10.00, cachedIn: 1.00, out: 50.00, cacheWrite: 12.50 },
  'gpt-5.6-luna': { in: 0.20, cachedIn: 0.02, out: 1.20, cacheWrite: 0.25 },
  'gpt-5.6-sol': { in: 4.00, cachedIn: 0.40, out: 20.00, cacheWrite: 5.00 },
  'gpt-5.6-terra': { in: 2.00, cachedIn: 0.20, out: 12.00, cacheWrite: 2.50 },
  // Earlier generations: no cache-write fee.
  'gpt-4.1': { in: 2.00, cachedIn: 0.50, out: 8.00, cacheWrite: 2.00 },
  'gpt-4o': { in: 2.50, cachedIn: 1.25, out: 10.00, cacheWrite: 2.50 },
};
/** Unknown model: price it like Sol, so a mispriced model is over-reported, never understated. */
export const FALLBACK_PRICE: Price = { in: 2.00, cachedIn: 0.20, out: 10.00, cacheWrite: 2.50 };

/** A prompt above this many input tokens is "long context": 2x input / cached / cache-write rates and 1.5x output, for the whole request. */
export const LONG_CONTEXT_TOKENS = 272_000;

/** Models that must never be called, whatever a setting says. */
const BLOCKED_MODELS: RegExp[] = [/gpt-5\.5/i];
export const isBlockedModel = (model: string | undefined | null): boolean => BLOCKED_MODELS.some((re) => re.test(String(model || '')));

export function modelIds(env: EnvLike = {}): Record<Tier, string> {
  const pick = (v: string | undefined, d: string) => (v && v.trim() && !isBlockedModel(v) ? v.trim() : d);
  return {
    luna: pick(env.OPENAI_MODEL_LUNA, DEFAULT_MODEL_IDS.luna),
    sol: pick(env.OPENAI_MODEL_SOL, DEFAULT_MODEL_IDS.sol),
    astra: pick(env.OPENAI_MODEL_ASTRA, DEFAULT_MODEL_IDS.astra),
  };
}

export function tierOf(model: string, env: EnvLike = {}): Tier | null {
  const ids = modelIds(env);
  for (const t of ['luna', 'sol', 'astra'] as Tier[]) if (ids[t] === model) return t;
  if (/luna/i.test(model)) return 'luna';
  if (/sol/i.test(model)) return 'sol';
  if (/astra/i.test(model)) return 'astra';
  return null;
}

/** Optional price override: OPENAI_PRICES_JSON='{"gpt-6-luna":{"in":0.1,"cachedIn":0.01,"out":0.5,"cacheWrite":0.125}}'. */
export function priceFor(model: string, env: EnvLike = {}): Price {
  const raw = env.OPENAI_PRICES_JSON;
  if (raw) {
    try {
      const o = JSON.parse(raw)?.[model];
      if (o && Number.isFinite(o.in) && Number.isFinite(o.out)) {
        const inn = Number(o.in);
        return { in: inn, cachedIn: Number.isFinite(o.cachedIn) ? Number(o.cachedIn) : inn, out: Number(o.out), cacheWrite: Number.isFinite(o.cacheWrite) ? Number(o.cacheWrite) : inn };
      }
    } catch { /* fall through to the table */ }
  }
  return PRICES[model] ?? FALLBACK_PRICE;
}

export interface Usage {
  inputTokens: number; cachedTokens: number; outputTokens: number; reasoningTokens: number;
  /** Input tokens written to the prompt cache on this call (billed at the cache-write rate). */
  cacheWriteTokens?: number;
  /** The processing tier the response reports ("default", "flex", "priority" …). Flex is billed at half price. */
  serviceTier?: string;
}

/**
 * Raw provider cost in USD (no markup). Reasoning tokens are already inside outputTokens. Cached input is billed at the cached rate,
 * cache writes at the write rate, prompts above 272K tokens at the long-context multipliers, Flex/Batch at half.
 */
export function costUsd(model: string, u: Usage, env: EnvLike = {}): number {
  const p = priceFor(model, env);
  const input = Math.max(0, u.inputTokens);
  const cached = Math.min(Math.max(0, u.cachedTokens), input);
  const written = Math.min(Math.max(0, u.cacheWriteTokens ?? 0), input - cached);
  const fresh = input - cached - written;
  const long = input > LONG_CONTEXT_TOKENS;
  let usd = ((fresh * p.in + cached * p.cachedIn + written * p.cacheWrite) * (long ? 2 : 1) + Math.max(0, u.outputTokens) * p.out * (long ? 1.5 : 1)) / 1_000_000;
  const tier = String(u.serviceTier || '').toLowerCase();
  if (tier === 'flex' || tier === 'batch') usd *= 0.5;
  else if (tier === 'priority') usd *= 2;
  return +usd.toFixed(6);
}

// ── effort ───────────────────────────────────────────────────────────────────
const rank = (e: Effort) => EFFORT_ORDER.indexOf(e);

/** Which effort values a tier accepts (Sol: no none/minimal; Astra: no none; Luna: all). */
export function supportsEffort(tier: Tier, e: Effort): boolean {
  if (tier === 'luna') return true;
  if (tier === 'sol') return e !== 'none' && e !== 'minimal';
  return e !== 'none';
}

/** The highest effort a model id accepts: the gpt-5.0 … 5.4 line stops at xhigh, the gpt-6 family goes to max. */
export function maxEffortOf(model: string): Effort {
  return /gpt-5(?:\.[0-4])?(?:-|$)/.test(model) ? 'xhigh' : 'max';
}

/** The effort to actually send: never above the cap, never one the tier rejects. */
export function clampEffort(tier: Tier, wanted: Effort, cap: Effort = 'max'): Effort {
  let e: Effort = rank(wanted) > rank(cap) ? cap : wanted;
  while (!supportsEffort(tier, e) && rank(e) < rank('max')) e = EFFORT_ORDER[rank(e) + 1];
  return rank(e) > rank(cap) && supportsEffort(tier, cap) ? cap : e;
}
export const effortCap = (env: EnvLike = {}): Effort => {
  const v = String(env.AI_MAX_EFFORT || '').trim().toLowerCase() as Effort;
  return EFFORT_ORDER.includes(v) ? v : 'max';
};

/**
 * Time a call needs at least before it is worth starting at this effort (ms). Reasoning is slow: a wall-clock-limited function must not
 * start a "max" call with 40 seconds left. Rough, deliberately generous figures; AI_EFFORT_MS_SCALE (default 1) scales them.
 */
export const EFFORT_NEEDS_MS: Record<Effort, number> = { none: 4_000, minimal: 6_000, low: 10_000, medium: 25_000, high: 50_000, xhigh: 100_000, max: 160_000 };
export function effortForBudget(wanted: Effort, msLeft: number, tier: Tier = 'luna', env: EnvLike = {}): Effort {
  const scale = Number(env.AI_EFFORT_MS_SCALE) > 0 ? Number(env.AI_EFFORT_MS_SCALE) : 1;
  let e = wanted;
  while (rank(e) > rank('low') && msLeft < EFFORT_NEEDS_MS[e] * scale) e = EFFORT_ORDER[rank(e) - 1];
  return supportsEffort(tier, e) ? e : clampEffort(tier, e);
}

// ── routing ──────────────────────────────────────────────────────────────────
export type Complexity = 'routine' | 'complex' | 'demanding' | 'investigative';
export const COMPLEXITIES: Complexity[] = ['routine', 'complex', 'demanding', 'investigative'];
export type Task =
  | 'core' | 'write' | 'edit' | 'check' | 'repair' | 'rewrite' | 'translate' | 'extract' | 'short'
  | 'classify' | 'plan' | 'mail' | 'chat' | 'helper' | 'selftest';

/** Flags the fact-core step may raise. They only ever raise the complexity, never lower it. */
export const STORY_FLAGS = ['political', 'controversial', 'multi_source', 'conflicting_sources', 'allegations', 'legal_risk', 'numbers_heavy', 'quotes_heavy', 'breaking'] as const;
export type StoryFlag = (typeof STORY_FLAGS)[number];

const cx = (c: Complexity) => COMPLEXITIES.indexOf(c);
const maxC = (a: Complexity, b: Complexity): Complexity => (cx(a) >= cx(b) ? a : b);

/** The story's real complexity: what the model judged, raised by the article type, the desk and the flags. Pure and deterministic. */
export function complexityFrom(o: { declared?: string | null; articleType?: string | null; desk?: string | null; flags?: string[] | null }): Complexity {
  let c: Complexity = (COMPLEXITIES as string[]).includes(String(o.declared)) ? (o.declared as Complexity) : 'routine';
  const t = String(o.articleType || '').toLowerCase();
  if (['reportaj', 'reportage', 'feature', 'interview', 'analiza', 'analysis', 'editorial', 'commentary', 'opinion'].includes(t)) c = maxC(c, 'complex');
  if (t === 'investigation' || t === 'investigative') c = maxC(c, 'investigative');
  const d = String(o.desk || '').toLowerCase();
  if (['property_legal', 'relocation_guide', 'property', 'relocation'].includes(d)) c = maxC(c, 'complex');
  const f = new Set((o.flags || []).map((x) => String(x)));
  if (['political', 'controversial', 'multi_source', 'conflicting_sources'].some((x) => f.has(x))) c = maxC(c, 'complex');
  if (f.has('allegations') || f.has('legal_risk')) c = maxC(c, 'demanding');
  if (f.has('allegations') && f.has('conflicting_sources')) c = maxC(c, 'investigative');
  return c;
}

export interface Route {
  model: string; tier: Tier; effort: Effort;
  /** true: ask for Flex processing (half price, slower, may be unavailable; the caller falls back to standard). Background jobs only. */
  flex: boolean;
}
export interface RouteInput {
  task: Task; complexity?: Complexity; attempt?: number;
  /** Not time-critical (cron, batch): eligible for Flex. */
  background?: boolean;
}

type Pair = [Tier, Effort];
type Row = Record<Complexity, Pair>;
// Default: Luna only. A harder job thinks harder instead of switching to a dearer model.
const LUNA: Record<'write' | 'check' | 'edit', Row> = {
  write: { routine: ['luna', 'medium'], complex: ['luna', 'high'], demanding: ['luna', 'xhigh'], investigative: ['luna', 'max'] },
  check: { routine: ['luna', 'medium'], complex: ['luna', 'high'], demanding: ['luna', 'xhigh'], investigative: ['luna', 'max'] },
  edit: { routine: ['luna', 'medium'], complex: ['luna', 'medium'], demanding: ['luna', 'high'], investigative: ['luna', 'high'] },
};
// Only with AI_SOL_ENABLED=true: the demanding and investigative jobs go to Sol.
const SOL: Record<'write' | 'check' | 'edit', Row> = {
  write: { routine: ['luna', 'medium'], complex: ['luna', 'high'], demanding: ['sol', 'medium'], investigative: ['sol', 'high'] },
  check: { routine: ['luna', 'medium'], complex: ['luna', 'high'], demanding: ['luna', 'xhigh'], investigative: ['sol', 'medium'] },
  edit: { routine: ['luna', 'medium'], complex: ['luna', 'medium'], demanding: ['luna', 'high'], investigative: ['sol', 'medium'] },
};

const truthy = (v: string | undefined) => /^(1|true|on|yes)$/i.test(String(v || '').trim());

/**
 * One place that decides model and effort for every job of the text desk.
 *   core        reads the source into the fact core                      Luna, high (the base of seven articles)
 *   write       composes one language edition                            by complexity: medium / high / xhigh / max
 *   check       fact-checks one edition against the core                 by complexity: medium / high / xhigh / max
 *   edit/repair editorial pass / fixing what the check found             medium … high
 *   rewrite     the voice engine's rewrite of a finished article         attempt 1 high, attempt 2 xhigh, attempt 3+ max
 *   translate   a translation (localisation of existing text)            medium
 *   extract     structured extraction (events, regulations …)            medium
 *   short       captions, comment replies, small copy                    medium
 *   classify    tagging and judging (directory, quality judge)           medium
 *   mail        a drafted reply to a guest's e-mail                      medium
 *   plan        editorial ideas with live web research                   high
 *   chat        the concierge's streamed answer                          low (the guest is waiting)
 *   helper      concierge helpers with a hard time limit                 low
 * Environment: AI_MAX_EFFORT (default max) caps the effort; AI_EFFORT_<TASK> (e.g. AI_EFFORT_CHAT=medium) sets one task;
 * AI_FORCE_TIER forces one tier everywhere; AI_SOL_ENABLED=true lets demanding jobs use Sol; AI_PREMIUM_TIER=astra sends the
 * investigative ones to Astra; AI_FLEX=off disables Flex.
 */
export function route(i: RouteInput, env: EnvLike = {}): Route {
  const ids = modelIds(env);
  const complexity = i.complexity ?? 'routine';
  const table = truthy(env.AI_SOL_ENABLED) ? SOL : LUNA;
  let pair: Pair;
  switch (i.task) {
    case 'core': pair = ['luna', 'high']; break;
    case 'write': pair = table.write[complexity]; break;
    case 'check': pair = table.check[complexity]; break;
    case 'edit': case 'repair': pair = table.edit[complexity]; break;
    case 'rewrite': {
      const n = i.attempt ?? 1;
      pair = n <= 1 ? ['luna', 'high'] : n === 2 ? ['luna', 'xhigh'] : ['luna', 'max'];
      if (n >= 2 && truthy(env.AI_SOL_ENABLED)) pair = ['sol', 'medium'];
      break;
    }
    case 'plan': pair = ['luna', 'high']; break;
    case 'chat': case 'helper': case 'selftest': pair = ['luna', 'low']; break;
    case 'translate': case 'extract': case 'short': case 'classify': case 'mail': default: pair = ['luna', complexity === 'routine' ? 'medium' : 'high']; break;
  }
  let [tier, effort] = pair;
  const override = String(env[`AI_EFFORT_${String(i.task).toUpperCase()}`] || '').trim().toLowerCase() as Effort;
  if (EFFORT_ORDER.includes(override)) effort = override;
  const premium = String(env.AI_PREMIUM_TIER || '').trim().toLowerCase();
  if (tier === 'sol' && complexity === 'investigative' && premium === 'astra') tier = 'astra';
  const forced = String(env.AI_FORCE_TIER || '').trim().toLowerCase();
  if (forced === 'luna' || forced === 'sol' || forced === 'astra') tier = forced;
  const model = ids[tier];
  const cap = rank(maxEffortOf(model)) < rank(effortCap(env)) ? maxEffortOf(model) : effortCap(env);
  const flex = i.background === true && String(env.AI_FLEX || 'on').trim().toLowerCase() !== 'off';
  return { model, tier, effort: clampEffort(tier, effort, cap), flex };
}

/** Reasoning tokens to reserve inside max_output_tokens, per effort (hidden reasoning is billed and counted against the cap). */
export const REASONING_RESERVE: Record<Effort, number> = { none: 0, minimal: 600, low: 2_500, medium: 7_000, high: 16_000, xhigh: 32_000, max: 56_000 };
export const MAX_OUTPUT_CAP = 64_000;

/** max_output_tokens for a call that should produce about `visibleTokens` of text. */
export function outputCap(visibleTokens: number, effort: Effort): number {
  const visible = Math.ceil(Math.max(0, visibleTokens) * 1.25);
  return Math.min(MAX_OUTPUT_CAP, Math.max(1_024, visible + REASONING_RESERVE[effort]));
}

/** Tokens per character by script, used to size the cap from a text length (Arabic, Greek and Russian cost about twice as many tokens). */
export function tokensForChars(chars: number, lang: string): number {
  const perToken = ['ar', 'el', 'ru'].includes(lang) ? 2 : ['ro', 'pl', 'de'].includes(lang) ? 3 : 3.8;
  return Math.ceil(Math.max(0, chars) / perToken);
}
