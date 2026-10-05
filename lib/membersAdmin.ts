// lib/membersAdmin.ts — pure helpers for Admin → Members (unit-tested).

export interface MemberRow {
  id: string; email: string | null; tier: string; status: string;
  created_at: string; current_period_end: string | null; cancel_at_period_end: boolean | null;
  stripe_subscription_id: string | null; last_login_at?: string | null; profile?: { comp?: { by?: string; note?: string; at?: string } } | null;
}

/** A member we did not charge: granted by an administrator (no Stripe subscription). */
export const isComp = (m: Pick<MemberRow, 'stripe_subscription_id'>) => !m.stripe_subscription_id;

export interface MemberStats { activePaid: number; activeComp: number; cancelling: number; canceled: number; new30d: number; mrrGross: number }

/** `price` = what a member pays per billing period (VAT included); `interval` normalises yearly plans to a month. */
export function memberStats(rows: MemberRow[], price: number, interval: 'month' | 'year', now: Date = new Date()): MemberStats {
  const since = now.getTime() - 30 * 86400_000;
  const active = rows.filter((r) => r.status === 'active');
  const paid = active.filter((r) => !isComp(r));
  const monthly = interval === 'year' ? price / 12 : price;
  return {
    activePaid: paid.length,
    activeComp: active.length - paid.length,
    cancelling: paid.filter((r) => r.cancel_at_period_end).length,
    canceled: rows.filter((r) => r.status === 'canceled').length,
    new30d: rows.filter((r) => new Date(r.created_at).getTime() >= since).length,
    // Members who already cancelled (but are paid until period end) still count until the period ends.
    mrrGross: Math.round(paid.length * monthly * 100) / 100,
  };
}

export type GrantCheck = { ok: true; email: string } | { ok: false; error: string };
export function checkGrant(rawEmail: unknown, existing: Pick<MemberRow, 'email' | 'status'>[]): GrantCheck {
  const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase().slice(0, 254) : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Enter a valid e-mail address.' };
  if (existing.some((m) => (m.email || '').toLowerCase() === email && m.status === 'active')) return { ok: false, error: 'This address already has an active membership.' };
  return { ok: true, email };
}

/** CSV with every cell quoted and formula-injection neutralised (cells starting = + - @ get a leading apostrophe). */
export function membersCsv(rows: MemberRow[]): string {
  const cell = (v: unknown) => {
    let s = v == null ? '' : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const head = ['email', 'status', 'type', 'since', 'renews_or_ends', 'cancels_at_period_end', 'stripe_subscription'];
  const lines = rows.map((m) => [m.email, m.status, isComp(m) ? 'complimentary' : 'paid', m.created_at?.slice(0, 10), m.current_period_end?.slice(0, 10), m.cancel_at_period_end ? 'yes' : '', m.stripe_subscription_id].map(cell).join(','));
  return [head.map(cell).join(','), ...lines].join('\n');
}
