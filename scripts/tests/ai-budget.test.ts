// AI spend protection — pure decision logic (kill switch, daily/monthly caps, parsing).
import { parseBudgets, killSwitchOn, decideBudget, windowStarts, sumUsd, DEFAULT_DAILY_USD, DEFAULT_MONTHLY_USD } from '@/lib/aiBudget';
import { eq, ok, report } from './_harness';

// parseBudgets
eq('defaults when unset', parseBudgets({}), { dailyUsd: DEFAULT_DAILY_USD, monthlyUsd: DEFAULT_MONTHLY_USD });
eq('env overrides', parseBudgets({ AI_DAILY_BUDGET_USD: '10', AI_MONTHLY_BUDGET_USD: '120.5' }), { dailyUsd: 10, monthlyUsd: 120.5 });
eq('0 means uncapped (kept as 0)', parseBudgets({ AI_DAILY_BUDGET_USD: '0' }).dailyUsd, 0);
eq('junk falls back to default', parseBudgets({ AI_DAILY_BUDGET_USD: 'abc' }).dailyUsd, DEFAULT_DAILY_USD);
eq('negative falls back to default', parseBudgets({ AI_MONTHLY_BUDGET_USD: '-5' }).monthlyUsd, DEFAULT_MONTHLY_USD);
eq('blank falls back to default', parseBudgets({ AI_DAILY_BUDGET_USD: '  ' }).dailyUsd, DEFAULT_DAILY_USD);

// killSwitchOn
ok('kill switch off by default', !killSwitchOn({}));
ok('1 turns it on', killSwitchOn({ AI_KILL_SWITCH: '1' }));
ok('true / ON (case-insens.) turn it on', killSwitchOn({ AI_KILL_SWITCH: 'TRUE' }) && killSwitchOn({ AI_KILL_SWITCH: ' on ' }));
ok('0 / false keep it off', !killSwitchOn({ AI_KILL_SWITCH: '0' }) && !killSwitchOn({ AI_KILL_SWITCH: 'false' }));

// decideBudget
const B = { dailyUsd: 40, monthlyUsd: 400 };
ok('under both caps → allowed', decideBudget({ killSwitch: false, budgets: B, spentDayUsd: 10, spentMonthUsd: 100 }).allowed);
ok('exactly at the daily cap → blocked', !decideBudget({ killSwitch: false, budgets: B, spentDayUsd: 40, spentMonthUsd: 40 }).allowed);
ok('over the monthly cap → blocked', !decideBudget({ killSwitch: false, budgets: B, spentDayUsd: 1, spentMonthUsd: 400.01 }).allowed);
ok('kill switch blocks even with zero spend', !decideBudget({ killSwitch: true, budgets: B, spentDayUsd: 0, spentMonthUsd: 0 }).allowed);
ok('uncapped daily + under monthly → allowed', decideBudget({ killSwitch: false, budgets: { dailyUsd: 0, monthlyUsd: 400 }, spentDayUsd: 9999, spentMonthUsd: 5 }).allowed);
ok('both uncapped → always allowed', decideBudget({ killSwitch: false, budgets: { dailyUsd: 0, monthlyUsd: 0 }, spentDayUsd: 1e6, spentMonthUsd: 1e6 }).allowed);
{
  const d = decideBudget({ killSwitch: false, budgets: B, spentDayUsd: 41.234, spentMonthUsd: 41.234 });
  ok('blocked reason names the daily cap and the env var', !d.allowed && /Daily/.test(d.reason) && /AI_DAILY_BUDGET_USD/.test(d.reason));
}

// windowStarts (UTC)
eq('UTC day / month start', windowStarts(new Date('2026-10-04T15:30:00Z')), { dayIso: '2026-10-04T00:00:00.000Z', monthIso: '2026-10-01T00:00:00.000Z' });
eq('month boundary', windowStarts(new Date('2026-12-31T23:59:59Z')).monthIso, '2026-12-01T00:00:00.000Z');

// sumUsd
eq('sums numeric and numeric-string values', sumUsd([{ usd: 1.5 }, { usd: '2.25' }]), 3.75);
eq('ignores null / junk / negatives', sumUsd([{ usd: null }, { usd: 'x' }, { usd: -3 }, {}, { usd: 1 }]), 1);
eq('null / empty → 0', sumUsd(null) + sumUsd([]), 0);

report('ai-budget');
