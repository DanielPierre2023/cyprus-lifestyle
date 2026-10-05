// Stripe webhook — membership recording. Before: the webhook upserted with
// onConflict:'stripe_subscription_id' against a PARTIAL unique index (Postgres error
// 42P10 on every call), never read the result, and a blanket catch{} answered 200 — so a
// paid membership was silently never recorded and Stripe never retried.
// Here: (a) signature verification, (b) the idempotent writer — success, redelivery,
// DB failure → retried success, concurrent-delivery race, (c) static guards on the route.
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { verifyWebhook } from '@/lib/stripe';
import { recordMembershipCheckout, type MembershipCheckout } from '@/lib/concierge/membership';
import { eq, ok, report } from './_harness';

// ── (a) verifyWebhook — the signature gate ───────────────────────────────────────────
const SECRET = 'whsec_test_secret';
const nowSec = () => Math.floor(Date.now() / 1000);
const sign = (body: string, secret: string, t = nowSec()) =>
  `t=${t},v1=${createHmac('sha256', secret).update(`${t}.${body}`).digest('hex')}`;
const body = JSON.stringify({ id: 'evt_1', type: 'checkout.session.completed', data: { object: { id: 'cs_1' } } });

eq('valid signature → parsed event', verifyWebhook(body, sign(body, SECRET), SECRET)?.id, 'evt_1');
ok('tampered body rejected', verifyWebhook(`${body} `, sign(body, SECRET), SECRET) === null);
ok('signed with another secret rejected', verifyWebhook(body, sign(body, 'whsec_other'), SECRET) === null);
ok('missing signature header rejected', verifyWebhook(body, null, SECRET) === null);
ok('garbage signature header rejected', verifyWebhook(body, 'nonsense', SECRET) === null);
ok('stale timestamp (> 5 min) rejected', verifyWebhook(body, sign(body, SECRET, nowSec() - 301), SECRET) === null);
ok('empty secret rejected', verifyWebhook(body, sign(body, ''), '') === null);

// ── (b) recordMembershipCheckout ─────────────────────────────────────────────────────
type Row = Record<string, unknown>;
type Fault = { code?: string; message: string } | null;

// A tiny in-memory stand-in for the slice of supabase-js the writer uses (update→eq→select
// and insert) over ONE table, including the partial unique index on stripe_subscription_id
// (23505 on a duplicate non-null value). It deliberately has NO .upsert(): any regression
// to the old `.upsert(..., { onConflict })` call makes these tests fail.
function fakeDb() {
  const rows: Row[] = [];
  const faults: { update: Fault; insert: Fault; raceOnce: boolean; throwOnFrom: boolean } = { update: null, insert: null, raceOnce: false, throwOnFrom: false };
  const calls: string[] = [];
  let seq = 0;
  const sb = {
    from(table: string) {
      if (faults.throwOnFrom) throw new Error('connection reset');
      if (table !== 'concierge_members') throw new Error(`unexpected table ${table}`);
      return {
        update(patch: Row) {
          const filters: Array<[string, unknown]> = [];
          const q = {
            eq(c: string, v: unknown) { filters.push([c, v]); return q; },
            select(_cols?: string) { return q; },
            then(res: (x: unknown) => unknown) {
              calls.push('update');
              if (faults.update) return res({ data: null, error: faults.update });
              const hit = rows.filter((r) => filters.every(([c, v]) => r[c] === v));
              hit.forEach((r) => Object.assign(r, patch));
              return res({ data: hit.map((r) => ({ id: r.id })), error: null });
            },
          };
          return q;
        },
        insert(row: Row) {
          return {
            then(res: (x: unknown) => unknown) {
              calls.push('insert');
              if (faults.insert) return res({ data: null, error: faults.insert });
              const dup = row.stripe_subscription_id != null && rows.some((r) => r.stripe_subscription_id === row.stripe_subscription_id);
              if (faults.raceOnce || dup) {
                // a concurrent delivery got its row in first; the unique index rejects ours
                if (faults.raceOnce) { rows.push({ id: `m-${++seq}`, ...row }); faults.raceOnce = false; }
                return res({ data: null, error: { code: '23505', message: 'duplicate key value violates unique constraint "concierge_members_sub_idx"' } });
              }
              rows.push({ id: `m-${++seq}`, ...row });
              return res({ data: null, error: null });
            },
          };
        },
      };
    },
  };
  return { sb: sb as unknown as SupabaseClient, rows, faults, calls };
}

const NOW = '2026-10-01T10:00:00.000Z';
const EVT: MembershipCheckout = { sessionId: 'cs_1', subscriptionId: 'sub_1', customerId: 'cus_1', cid: 'cid-abc', email: 'member@example.com', tier: 'concierge' };
const view = (r: Row) => ({ cid: r.cid, email: r.email, tier: r.tier, status: r.status, cus: r.stripe_customer_id, sub: r.stripe_subscription_id, ses: r.stripe_session_id });

// 1. First delivery inserts exactly one active member carrying every Stripe id.
{
  const db = fakeDb();
  const r = await recordMembershipCheckout(db.sb, EVT, NOW);
  ok('first delivery → ok', r.ok === true);
  eq('first delivery → inserted', r.ok ? r.action : r.error, 'inserted');
  eq('one row written', db.rows.length, 1);
  eq('row = active member with all ids', view(db.rows[0]), { cid: 'cid-abc', email: 'member@example.com', tier: 'concierge', status: 'active', cus: 'cus_1', sub: 'sub_1', ses: 'cs_1' });
  eq('updated_at stamped from the event time', db.rows[0].updated_at, NOW);
}

// 2. Redelivery of the SAME event refreshes the same row — no duplicate (idempotent).
{
  const db = fakeDb();
  await recordMembershipCheckout(db.sb, EVT, NOW);
  const again = await recordMembershipCheckout(db.sb, EVT, NOW);
  eq('redelivery → updated', again.ok ? again.action : again.error, 'updated');
  eq('still exactly one row', db.rows.length, 1);
  const thrice = await recordMembershipCheckout(db.sb, EVT, NOW);
  ok('third delivery also ok', thrice.ok === true);
  eq('still exactly one row after 3 deliveries', db.rows.length, 1);
}

// 3. A DB failure is REPORTED (route → 500, Stripe retries) and records nothing; the retry then succeeds.
{
  const db = fakeDb();
  db.faults.insert = { code: '08006', message: 'connection failure' };
  const first = await recordMembershipCheckout(db.sb, EVT, NOW);
  ok('DB failure → ok:false (webhook must answer 5xx)', first.ok === false);
  eq('DB error text surfaced', first.ok ? '' : first.error, 'connection failure');
  eq('nothing recorded on failure', db.rows.length, 0);
  db.faults.insert = null;
  const retry = await recordMembershipCheckout(db.sb, EVT, NOW);
  eq('Stripe retry after the outage → inserted', retry.ok ? retry.action : retry.error, 'inserted');
  eq('exactly one row after fail-then-retry', db.rows.length, 1);
}

// 4. The failure can be on the lookup/update step too — reported, and no blind insert follows it.
{
  const db = fakeDb();
  db.faults.update = { code: '42703', message: 'column does not exist' };
  const r = await recordMembershipCheckout(db.sb, EVT, NOW);
  ok('update error → ok:false', r.ok === false);
  eq('no insert attempted after a failed update', db.calls, ['update']);
  eq('nothing recorded', db.rows.length, 0);
}

// 5. Concurrent delivery: ours loses the insert race (23505) → refresh the winner, no duplicate.
{
  const db = fakeDb();
  db.faults.raceOnce = true;
  const r = await recordMembershipCheckout(db.sb, EVT, NOW);
  eq('race → resolved as updated', r.ok ? r.action : r.error, 'updated');
  eq('race → exactly one row', db.rows.length, 1);
  eq('race → update, insert, update', db.calls, ['update', 'insert', 'update']);
}

// 6. A non-race insert error (e.g. missing column) is surfaced, not swallowed.
{
  const db = fakeDb();
  db.faults.insert = { code: '42703', message: 'column "tier" does not exist' };
  const r = await recordMembershipCheckout(db.sb, EVT, NOW);
  eq('insert error surfaced', r.ok ? '' : r.error, 'column "tier" does not exist');
}

// 7. Without any stable Stripe id we cannot be idempotent → refuse (loud) rather than guess.
{
  const db = fakeDb();
  const r = await recordMembershipCheckout(db.sb, { ...EVT, subscriptionId: null, sessionId: null }, NOW);
  ok('no subscription/session id → ok:false', r.ok === false);
  eq('no DB call made', db.calls.length, 0);
}

// 8. Session id is the fallback identity when there is no subscription id.
{
  const db = fakeDb();
  const e: MembershipCheckout = { ...EVT, subscriptionId: null };
  const a = await recordMembershipCheckout(db.sb, e, NOW);
  const b = await recordMembershipCheckout(db.sb, e, NOW);
  eq('session-keyed: first inserted', a.ok ? a.action : a.error, 'inserted');
  eq('session-keyed: redelivery updated', b.ok ? b.action : b.error, 'updated');
  eq('session-keyed: one row', db.rows.length, 1);
}

// 9. A different subscription (a re-subscribe, another member) is its own row.
{
  const db = fakeDb();
  await recordMembershipCheckout(db.sb, EVT, NOW);
  await recordMembershipCheckout(db.sb, { ...EVT, sessionId: 'cs_2', subscriptionId: 'sub_2', email: 'other@example.com' }, NOW);
  eq('two subscriptions → two rows', db.rows.length, 2);
}

// 10. The writer never throws — an unexpected client error becomes ok:false (→ 500 → retry).
{
  const db = fakeDb();
  db.faults.throwOnFrom = true;
  const r = await recordMembershipCheckout(db.sb, EVT, NOW);
  ok('thrown client error → ok:false', r.ok === false);
  eq('thrown error text surfaced', r.ok ? '' : r.error, 'connection reset');
}

// ── (c) static guards on the route (it can't be bundled by this runner: next/server) ───
const route = (() => { try { return readFileSync(join(process.cwd(), 'app/api/advertise/webhook/route.ts'), 'utf8'); } catch { return ''; } })();
ok('webhook route readable', route.length > 0);
ok('route reads the RAW body for the signature', /await req\.text\(\)/.test(route) && !/req\.json\(\)/.test(route));
ok('route verifies the signature before any processing', route.indexOf('verifyWebhook(') > -1 && route.indexOf('verifyWebhook(') < route.indexOf('await claimEvent(') && route.indexOf('await claimEvent(') < route.indexOf('await processEvent('));
ok('route rejects a bad signature with 400', /invalid signature[^\n]*status: 400/.test(route));
ok('route no longer uses the broken .upsert() on concierge_members', !/\.upsert\(/.test(route));
ok('route answers 500 when a membership write fails', /status: 500/.test(route) && /if \(!rec\.ok\) return await retryLater/.test(route));
ok('route checks every status-transition write for errors', (route.match(/const err = await transition\(/g) || []).length >= 4 && /return ad\.error \|\| mem\.error/.test(route));
ok('route never logs the raw body or secret', !/console\.(log|error)\([^)]*\b(raw|secret)\b/.test(route));

report('stripe.webhook.membership');
