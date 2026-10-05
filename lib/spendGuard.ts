// lib/spendGuard.ts
// ============================================================================
// Runtime AI spend protection (I/O half; decision logic is in lib/aiBudget.ts).
//
//   aiBudgetDeny()        → null when a model call may proceed, else the reason it may not.
//                           Used by lib/ai.ts and by the routes that front the Supabase edge
//                           functions (which log into the SAME ai_spend_log table).
//   publicAiCeilingDeny() → a GLOBAL daily ceiling on calls to the public, anonymous
//                           endpoints (concierge chat/voice) — they are exposed to abuse and
//                           their provider cost is not tracked in ai_spend_log.
//
// Failure policy: the kill switch always blocks. If the spend read itself fails we fail OPEN
// (and log once) — a broken monitor must not take the site down — but never silently.
// Spend is cached for 60s per server instance.
// ============================================================================
import 'server-only';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { rateLimitKey } from '@/lib/ratelimit';
import { decideBudget, killSwitchOn, parseBudgets, sumUsd, windowStarts } from '@/lib/aiBudget';

const CACHE_MS = 60_000;
let cache: { at: number; day: number; month: number } | null = null;
let warned = false;

async function spendSince(iso: string): Promise<number> {
  const sb = supabaseAdmin();
  // Preferred: server-side SUM via the ai_spend_since() function (migration 20261004130400).
  const rpc = await sb.rpc('ai_spend_since', { p_since: iso });
  if (!rpc.error && rpc.data != null) { const n = Number(rpc.data); if (Number.isFinite(n)) return n; }
  // Fallback until the migration is applied: sum the rows (capped, so it stays cheap).
  const { data, error } = await sb.from('ai_spend_log').select('usd').gte('occurred_at', iso).limit(20000);
  if (error) throw new Error(error.message);
  return sumUsd(data as { usd?: unknown }[]);
}

async function currentSpend(): Promise<{ day: number; month: number }> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache;
  const { dayIso, monthIso } = windowStarts(new Date());
  const [day, month] = await Promise.all([spendSince(dayIso), spendSince(monthIso)]);
  cache = { at: Date.now(), day, month };
  return cache;
}

/** null = allowed; otherwise the human-readable reason the call must not be made. */
export async function aiBudgetDeny(): Promise<string | null> {
  if (killSwitchOn(process.env)) return 'AI is switched off (AI_KILL_SWITCH).';
  const budgets = parseBudgets(process.env);
  if (budgets.dailyUsd === 0 && budgets.monthlyUsd === 0) return null; // caps explicitly disabled
  try {
    const s = await currentSpend();
    const d = decideBudget({ killSwitch: false, budgets, spentDayUsd: s.day, spentMonthUsd: s.month });
    return d.allowed ? null : d.reason;
  } catch (e) {
    if (!warned) { warned = true; console.error('[spend-guard] cannot read ai_spend_log — failing open:', (e as Error).message); }
    return null;
  }
}

/**
 * Global ceiling on anonymous AI endpoints (calls per UTC day, all visitors together).
 * Defaults: chat 6000/day, voice 600/day — override with AI_PUBLIC_DAILY_CALLS / AI_PUBLIC_DAILY_TTS.
 * 0 disables the ceiling. Distributed when Upstash is configured, per-instance otherwise.
 */
export async function publicAiCeilingDeny(kind: 'chat' | 'tts'): Promise<string | null> {
  if (killSwitchOn(process.env)) return 'AI is switched off (AI_KILL_SWITCH).';
  const raw = kind === 'tts' ? process.env.AI_PUBLIC_DAILY_TTS : process.env.AI_PUBLIC_DAILY_CALLS;
  const fallback = kind === 'tts' ? 600 : 6000;
  const n = raw != null && raw.trim() !== '' && Number.isFinite(Number(raw)) && Number(raw) >= 0 ? Number(raw) : fallback;
  if (n === 0) return null;
  const ok = await rateLimitKey('global', `ai-public-${kind}`, n, 86_400);
  return ok ? null : `Daily public ${kind} ceiling (${n}) reached.`;
}
