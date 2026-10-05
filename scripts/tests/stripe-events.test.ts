// B1 Stripe webhook correctness: status mapping, order-safety, idempotency decision + ledger,
// and B2c onboarding-email escaping.
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CLAIM_LEASE_MS, PAYABLE_FROM, allowedFrom, claimDecision, escapeLike, invoiceSubscriptionId, isMissingSchema,
  isMoneyBackEvent, isPaidSession, mapSubscriptionStatus, subscriptionPeriod,
} from '@/lib/stripe/events';
import { claimEvent, markProcessed, releaseClaim } from '@/lib/stripe/ledger';
import { onboardingEmail } from '@/lib/fulfilment';
import { escapeHtml, safeHttpUrl } from '@/lib/util';
import { eq, ok, report } from './_harness';

// ── status mapping ───────────────────────────────────────────────────────────────────
eq('active→active', mapSubscriptionStatus('active'), 'active');
eq('trialing→active', mapSubscriptionStatus('trialing'), 'active');
eq('past_due→failed', mapSubscriptionStatus('past_due'), 'failed');
eq('unpaid→failed', mapSubscriptionStatus('unpaid'), 'failed');
eq('canceled→canceled', mapSubscriptionStatus('canceled'), 'canceled');
eq('incomplete_expired→canceled', mapSubscriptionStatus('incomplete_expired'), 'canceled');
eq('incomplete→untouched', mapSubscriptionStatus('incomplete'), null);
eq('paused→untouched', mapSubscriptionStatus('paused'), null);
eq('garbage→untouched', mapSubscriptionStatus(undefined), null);

// ── paid session ─────────────────────────────────────────────────────────────────────
ok('paid', isPaidSession('paid'));
ok('no_payment_required', isPaidSession('no_payment_required'));
ok('unpaid is NOT paid', !isPaidSession('unpaid'));
ok('missing is NOT paid', !isPaidSession(undefined));

// ── order-safety: canceled is terminal ───────────────────────────────────────────────
for (const t of ['active', 'failed'] as const) ok(`no transition to ${t} from canceled`, !allowedFrom(t).includes('canceled'));
eq('recovery only from failed', allowedFrom('active'), ['failed']);
eq('lapse only from active', allowedFrom('failed'), ['active']);
ok('cancel never from canceled (no-op)', !allowedFrom('canceled').includes('canceled'));
ok('late checkout never resurrects canceled/active/paid order', !PAYABLE_FROM.includes('canceled') && !PAYABLE_FROM.includes('active') && !PAYABLE_FROM.includes('paid'));

// ── payload helpers ──────────────────────────────────────────────────────────────────
eq('invoice sub (legacy)', invoiceSubscriptionId({ subscription: 'sub_1' }), 'sub_1');
eq('invoice sub (expanded)', invoiceSubscriptionId({ subscription: { id: 'sub_2' } }), 'sub_2');
eq('invoice sub (new API)', invoiceSubscriptionId({ parent: { subscription_details: { subscription: 'sub_3' } } }), 'sub_3');
eq('invoice without sub', invoiceSubscriptionId({ subscription: null }), null);
eq('period (top level)', subscriptionPeriod({ current_period_end: 1790000000, cancel_at_period_end: true }),
  { current_period_end: new Date(1790000000 * 1000).toISOString(), cancel_at_period_end: true });
eq('period (item level)', subscriptionPeriod({ items: { data: [{ current_period_end: 1790000000 }] } }).current_period_end, new Date(1790000000 * 1000).toISOString());
eq('period absent', subscriptionPeriod({}), { current_period_end: null, cancel_at_period_end: false });
ok('refund/dispute events recognised', isMoneyBackEvent('charge.refunded') && isMoneyBackEvent('charge.dispute.created') && !isMoneyBackEvent('invoice.paid'));
ok('missing table detected', isMissingSchema({ code: '42P01' }) && isMissingSchema({ code: 'PGRST205' }) && isMissingSchema({ message: 'column "x" does not exist' }) && !isMissingSchema({ code: '08006', message: 'down' }));
eq('LIKE wildcards escaped', escapeLike('a_b%c\\d@x.com'), 'a\\_b\\%c\\\\d@x.com');

// ── idempotency decision ─────────────────────────────────────────────────────────────
const NOW = Date.parse('2026-10-04T12:00:00Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();
eq('new event → process', claimDecision(null, NOW), 'process');
eq('processed → skip', claimDecision({ processed_at: iso(1000), claimed_at: iso(2000) }, NOW), 'skip');
eq('in flight → busy', claimDecision({ claimed_at: iso(1000) }, NOW), 'busy');
eq('lease expired → take', claimDecision({ claimed_at: iso(CLAIM_LEASE_MS + 1) }, NOW), 'take');
eq('released after failure → take', claimDecision({ claimed_at: null }, NOW), 'take');

// ── ledger over an in-memory stripe_events ───────────────────────────────────────────
type Row = Record<string, unknown>;
function fakeLedger(opts: { missing?: boolean } = {}) {
  const rows = new Map<string, Row>();
  const sb = {
    from(table: string) {
      if (table !== 'stripe_events') throw new Error(table);
      const missing = { data: null, error: { code: '42P01', message: 'relation "stripe_events" does not exist' } };
      return {
        insert(row: Row) {
          return { then(res: (x: unknown) => unknown) {
            if (opts.missing) return res(missing);
            if (rows.has(row.event_id as string)) return res({ data: null, error: { code: '23505', message: 'dup' } });
            rows.set(row.event_id as string, { ...row }); return res({ data: null, error: null });
          } };
        },
        select() { return { eq(_c: string, id: string) { return { maybeSingle: async () => ({ data: rows.get(id) ?? null, error: null }) }; } }; },
        update(patch: Row) {
          const f: Array<[string, 'eq' | 'null', unknown]> = [];
          const q = {
            eq(c: string, v: unknown) { f.push([c, 'eq', v]); return q; },
            is(c: string, _v: null) { f.push([c, 'null', null]); return q; },
            select() { return q; },
            then(res: (x: unknown) => unknown) {
              const hit = [...rows.values()].filter((r) => f.every(([c, k, v]) => (k === 'eq' ? r[c] === v : r[c] == null)));
              hit.forEach((r) => Object.assign(r, patch));
              return res({ data: hit.map((r) => ({ event_id: r.event_id })), error: null });
            },
          };
          return q;
        },
      };
    },
  };
  return { sb: sb as unknown as SupabaseClient, rows };
}
{
  const L = fakeLedger();
  const t0 = new Date(NOW).toISOString();
  eq('first delivery → process', await claimEvent(L.sb, 'evt_1', 'invoice.paid', t0), 'process');
  eq('concurrent duplicate while in flight → busy', await claimEvent(L.sb, 'evt_1', 'invoice.paid', t0), 'busy');
  await releaseClaim(L.sb, 'evt_1'); // handler failed → 500 → released
  eq('retry after failure runs again', await claimEvent(L.sb, 'evt_1', 'invoice.paid', t0), 'process');
  await markProcessed(L.sb, 'evt_1', t0);
  eq('redelivery after success → skip (no side effects)', await claimEvent(L.sb, 'evt_1', 'invoice.paid', t0), 'skip');
  eq('other event unaffected', await claimEvent(L.sb, 'evt_2', 'invoice.paid', t0), 'process');
  // crashed worker: lease expires → takeover wins exactly once
  const later = new Date(NOW + CLAIM_LEASE_MS + 1000).toISOString();
  eq('expired lease → takeover', await claimEvent(L.sb, 'evt_2', 'invoice.paid', later), 'process');
}
{
  const L = fakeLedger({ missing: true });
  eq('missing table → untracked (today\'s behaviour)', await claimEvent(L.sb, 'evt_9', 'x', new Date(NOW).toISOString()), 'untracked');
}

// ── B2c: onboarding email escaping ───────────────────────────────────────────────────
eq('escapeHtml', escapeHtml(`<script>"a" & 'b'`), '&lt;script&gt;&quot;a&quot; &amp; &#39;b&#39;');
eq('safeHttpUrl blocks javascript:', safeHttpUrl('javascript:alert(1)'), '');
eq('safeHttpUrl keeps https', safeHttpUrl('https://a.b/c'), 'https://a.b/c');
{
  const evil = `<script>alert(1)</script>"><img src=x onerror=1>'`;
  const m = onboardingEmail({ slot: 'tier-listed', label: evil, company: evil, customer_name: evil });
  ok('no raw <script> in html', !m.html.includes('<script>alert(1)'));
  ok('no raw injected <img>', !m.html.includes('<img src=x'));
  ok('escaped form present', m.html.includes('&lt;script&gt;alert(1)&lt;/script&gt;&quot;&gt;'));
  eq('subject is plain text (not entity-escaped)', m.subject, `Cyprus Lifestyle — next steps for ${evil}`);
}

report('stripe.events');
