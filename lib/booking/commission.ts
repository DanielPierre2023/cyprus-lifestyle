// lib/booking/commission.ts
// Pure commission-ledger rules. RECORD ONLY: nothing here moves money, invoices a partner or pays anyone.
// Amounts are integer cents; rate is in basis points (100 bps = 1 %). Rounding: half up, to the cent.

export const MAX_RATE_BPS = 5000;                         // 50 % — anything above is almost certainly a typo
export const MAX_GROSS_CENTS = 100_000_000;               // €1,000,000.00 sanity cap
export const CURRENCIES = ['EUR'] as const;               // the site trades in euro only

export function computeCommissionCents(grossCents: number, rateBps: number): number {
  return Math.floor((grossCents * rateBps + 5000) / 10000);
}

export type LedgerStatus = 'expected' | 'confirmed' | 'void';
export interface LedgerInput { grossCents: unknown; rateBps: unknown; currency?: unknown }
export type LedgerCheck = { ok: true; grossCents: number; rateBps: number; commissionCents: number; currency: string } | { ok: false; error: string };

export function checkLedgerInput(i: LedgerInput): LedgerCheck {
  const gross = Number(i.grossCents), rate = Number(i.rateBps);
  if (!Number.isInteger(gross) || gross <= 0) return { ok: false, error: 'Gross amount must be a positive whole number of cents.' };
  if (gross > MAX_GROSS_CENTS) return { ok: false, error: 'Gross amount is unrealistically large.' };
  if (!Number.isInteger(rate) || rate < 0 || rate > MAX_RATE_BPS) return { ok: false, error: `Rate must be 0–${MAX_RATE_BPS / 100} %.` };
  const currency = String(i.currency ?? 'EUR').toUpperCase();
  if (!(CURRENCIES as readonly string[]).includes(currency)) return { ok: false, error: 'Only EUR is supported.' };
  return { ok: true, grossCents: gross, rateBps: rate, commissionCents: computeCommissionCents(gross, rate), currency };
}

/** "12.50" → 1250 ; rejects anything that is not a plain amount with at most 2 decimals. */
export function eurosToCents(raw: unknown): number | null {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}
/** "12.5" (percent) → 1250 bps */
export function percentToBps(raw: unknown): number | null {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  return Math.round(parseFloat(s) * 100);
}
export const formatCents = (c: number, currency = 'EUR') => `${currency === 'EUR' ? '€' : currency + ' '}${(c / 100).toFixed(2)}`;

export interface LedgerRow { status: string; gross_cents: number; commission_cents: number; currency: string }
export function ledgerTotals(rows: readonly LedgerRow[]) {
  const live = rows.filter((r) => r.status !== 'void' && r.currency === 'EUR');
  const sum = (s: string) => live.filter((r) => r.status === s).reduce((n, r) => n + r.commission_cents, 0);
  return { expectedCents: sum('expected'), confirmedCents: sum('confirmed'), grossCents: live.reduce((n, r) => n + r.gross_cents, 0), entries: live.length, voided: rows.length - live.length };
}
