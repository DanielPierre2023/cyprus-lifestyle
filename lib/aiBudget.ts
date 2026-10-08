// lib/aiBudget.ts
// ============================================================================
// AI spend protection — pure decision logic (no I/O, no server-only import, so it is
// unit-testable). The I/O half lives in lib/spendGuard.ts.
//
//   • Kill switch   AI_KILL_SWITCH=1  → every guarded model call is refused immediately.
//   • Daily cap     AI_DAILY_BUDGET_USD    (default 6)    — spend since 00:00 UTC.
//   • Monthly cap   AI_MONTHLY_BUDGET_USD  (default 60)   — spend since the 1st, 00:00 UTC. Matches the $60 organisation spend limit on the OpenAI account;
//                     the log includes the 25% markup, so this stops a little before OpenAI would.
//   A budget of 0 means "no cap" for that window. Spend is the sum of ai_spend_log.usd
//   (which already includes the COST_MARKUP_PCT markup).
// ============================================================================

export const DEFAULT_DAILY_USD = 6;
export const DEFAULT_MONTHLY_USD = 60;

export interface Budgets { dailyUsd: number; monthlyUsd: number }

function num(v: string | undefined, fallback: number): number {
  if (v == null || v.trim() === '') return fallback;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback; // junk or negative → safe default
}

export function parseBudgets(env: Record<string, string | undefined>): Budgets {
  return {
    dailyUsd: num(env.AI_DAILY_BUDGET_USD, DEFAULT_DAILY_USD),
    monthlyUsd: num(env.AI_MONTHLY_BUDGET_USD, DEFAULT_MONTHLY_USD),
  };
}

export function killSwitchOn(env: Record<string, string | undefined>): boolean {
  const v = (env.AI_KILL_SWITCH || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export type BudgetDecision = { allowed: true } | { allowed: false; reason: string };

/** Decide from the kill switch, the budgets and the spend so far. Pure. */
export function decideBudget(input: { killSwitch: boolean; budgets: Budgets; spentDayUsd: number; spentMonthUsd: number }): BudgetDecision {
  if (input.killSwitch) return { allowed: false, reason: 'AI is switched off (AI_KILL_SWITCH).' };
  const { dailyUsd, monthlyUsd } = input.budgets;
  if (dailyUsd > 0 && input.spentDayUsd >= dailyUsd) {
    return { allowed: false, reason: `Daily AI budget reached ($${input.spentDayUsd.toFixed(2)} of $${dailyUsd.toFixed(2)}). Raise AI_DAILY_BUDGET_USD or wait until 00:00 UTC.` };
  }
  if (monthlyUsd > 0 && input.spentMonthUsd >= monthlyUsd) {
    return { allowed: false, reason: `Monthly AI budget reached ($${input.spentMonthUsd.toFixed(2)} of $${monthlyUsd.toFixed(2)}). Raise AI_MONTHLY_BUDGET_USD or wait until the 1st (UTC).` };
  }
  return { allowed: true };
}

/** ISO start of the current UTC day / month. */
export function windowStarts(now: Date): { dayIso: string; monthIso: string } {
  const y = now.getUTCFullYear(), m = now.getUTCMonth(), d = now.getUTCDate();
  return { dayIso: new Date(Date.UTC(y, m, d)).toISOString(), monthIso: new Date(Date.UTC(y, m, 1)).toISOString() };
}

/** Sum a column of numeric-ish values, ignoring junk. */
export function sumUsd(rows: { usd?: unknown }[] | null | undefined): number {
  let t = 0;
  for (const r of rows || []) { const n = Number(r?.usd); if (Number.isFinite(n) && n > 0) t += n; }
  return +t.toFixed(6);
}
