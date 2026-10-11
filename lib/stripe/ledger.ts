// Stripe event-id ledger (table stripe_events, migration 20261004130200). Makes webhook
// redelivery safe: an event already processed is acknowledged with no side effects.
//   claim    — INSERT the event id (primary key ⇒ exactly one concurrent winner)
//   process  — the caller handles the event
//   mark     — processed_at is set ONLY after success, so a 500 is retried and re-runs
//   release  — on failure the lease is cleared so Stripe's retry can take over at once
// If the table does not exist yet (migration not run) or the ledger is unreachable, claim()
// answers 'untracked' and the webhook behaves exactly as before.
import type { SupabaseClient } from '@supabase/supabase-js';
import { logServerError } from '@/lib/monitor.server';
import { claimDecision, isMissingSchema, type EventRow } from '@/lib/stripe/events';

export type Claim = 'process' | 'skip' | 'busy' | 'untracked';

let warnedMissing = false;
async function degrade(err: { code?: string; message?: string }, eventId: string): Promise<Claim> {
  if (isMissingSchema(err)) {
    if (!warnedMissing) {
      warnedMissing = true;
      await logServerError('stripe-webhook:ledger', new Error('stripe_events table missing — run migration 20261004130200_stripe_events.sql; idempotency disabled'), {}, 'warn');
    }
  } else {
    await logServerError('stripe-webhook:ledger', new Error(`ledger unavailable: ${String(err.message || '').slice(0, 200)}`), { eventId }, 'warn');
  }
  return 'untracked';
}

export async function claimEvent(sb: SupabaseClient, eventId: string, type: string, nowIso: string): Promise<Claim> {
  try {
    const ins = await sb.from('stripe_events').insert({ event_id: eventId, type, received_at: nowIso, claimed_at: nowIso });
    if (!ins.error) return 'process';
    if (ins.error.code !== '23505') return await degrade(ins.error, eventId);

    const sel = await sb.from('stripe_events').select('processed_at, claimed_at').eq('event_id', eventId).maybeSingle();
    if (sel.error) return await degrade(sel.error, eventId);
    const row = (sel.data || null) as EventRow | null;
    const d = claimDecision(row, Date.parse(nowIso));
    if (d === 'skip') return 'skip';
    if (d === 'busy') return 'busy';
    if (d === 'process') return 'process';
    // 'take': atomically take over a failed / expired claim (compare-and-set on claimed_at)
    let q = sb.from('stripe_events').update({ claimed_at: nowIso }).eq('event_id', eventId).is('processed_at', null);
    q = row?.claimed_at ? q.eq('claimed_at', row.claimed_at) : q.is('claimed_at', null);
    const upd = await q.select('event_id');
    if (upd.error) return await degrade(upd.error, eventId);
    return upd.data && upd.data.length > 0 ? 'process' : 'busy';
  } catch (e) {
    return await degrade({ message: (e as Error).message }, eventId);
  }
}

export async function markProcessed(sb: SupabaseClient, eventId: string, nowIso: string): Promise<void> {
  try {
    const r = await sb.from('stripe_events').update({ processed_at: nowIso }).eq('event_id', eventId);
    if (r.error) await logServerError('stripe-webhook:ledger', new Error(`mark processed failed: ${r.error.message}`.slice(0, 300)), { eventId }, 'warn');
  } catch (e) { await logServerError('stripe-webhook:ledger', e, { eventId }, 'warn'); }
}

export async function releaseClaim(sb: SupabaseClient, eventId: string): Promise<void> {
  try { await sb.from('stripe_events').update({ claimed_at: null }).eq('event_id', eventId).is('processed_at', null); }
  catch { /* the lease simply expires */ }
}
