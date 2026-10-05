// The Friday newsletter workflow: week ids, recipient bookkeeping, the delivery loop's guarantees,
// signed unsubscribe links. (The database side — one campaign per week, claims — is exercised by
// scripts/db/newsletter-smoke.sql in the restore drill.)
import {
  isoWeekId, isFridayUtc, chunk, pendingRecipients, sameSlugSet, isTransientSendError, deliver, personalise, UNSUB_PLACEHOLDER,
  type DeliveryPorts,
} from '@/lib/newsletterPlan';
import {
  unsubscribeToken, verifyUnsubscribeToken, encodeEmailParam, decodeEmailParam, unsubscribeUrl, unsubscribeHeaders, unsubscribeSecret,
} from '@/lib/newsletterUnsub';
import { eq, ok, report } from './_harness';

// ── ISO weeks / Friday ───────────────────────────────────────────────────────
eq('2026-10-05 (Mon) is week 41', isoWeekId(new Date('2026-10-05T12:00:00Z')), '2026-W41');
eq('2026-10-09 (Fri) is still week 41', isoWeekId(new Date('2026-10-09T23:59:00Z')), '2026-W41');
eq('2026-10-11 (Sun) is still week 41', isoWeekId(new Date('2026-10-11T23:59:00Z')), '2026-W41');
eq('2026-10-12 (Mon) starts week 42', isoWeekId(new Date('2026-10-12T00:00:00Z')), '2026-W42');
eq('1 Jan 2026 belongs to 2026-W01', isoWeekId(new Date('2026-01-01T10:00:00Z')), '2026-W01');
eq('30 Dec 2024 belongs to 2025-W01', isoWeekId(new Date('2024-12-30T10:00:00Z')), '2025-W01');
eq('3 Jan 2021 belongs to 2020-W53', isoWeekId(new Date('2021-01-03T10:00:00Z')), '2020-W53');
ok('Friday detected', isFridayUtc(new Date('2026-10-09T06:00:00Z')));
ok('Thursday/Saturday are not Friday', !isFridayUtc(new Date('2026-10-08T06:00:00Z')) && !isFridayUtc(new Date('2026-10-10T06:00:00Z')));

// ── recipient bookkeeping ────────────────────────────────────────────────────
eq('pending = all − handled, de-duplicated, lower-cased', pendingRecipients(['A@x.com', 'b@x.com', 'a@X.com', ' c@x.com ', ''], ['B@x.com']), ['a@x.com', 'c@x.com']);
eq('chunk', chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
ok('same article set regardless of order', sameSlugSet(['a', 'b'], ['b', 'a']));
ok('different or empty sets are not "the same"', !sameSlugSet(['a', 'b'], ['a', 'c']) && !sameSlugSet([], []));
ok('transient errors', ['Rate limit exceeded', 'fetch failed', 'Resend error 503', 'timeout', 'RESEND_API_KEY not configured'].every(isTransientSendError));
ok('address errors are not transient', !isTransientSendError('Invalid `to` field') && !isTransientSendError('The recipient address is not valid'));

// ── the delivery loop ────────────────────────────────────────────────────────
function ports(over: Partial<DeliveryPorts> & { owned?: Set<string> } = {}) {
  const log = { batches: [] as string[][], singles: [] as string[], recorded: [] as { email: string; status: string; error?: string }[], released: [] as string[] };
  let t = 0;
  const p: DeliveryPorts = {
    claim: async (emails) => emails.filter((e) => !(over.owned || new Set()).has(e)),
    sendBatch: async (emails) => { log.batches.push(emails); return { ok: true }; },
    sendOne: async (email) => { log.singles.push(email); return { ok: true }; },
    record: async (rows) => { log.recorded.push(...rows); },
    release: async (emails) => { log.released.push(...emails); },
    now: () => t++,
    ...over,
  };
  return { p, log };
}
const addrs = (n: number) => Array.from({ length: n }, (_, i) => `u${i}@x.com`);

{
  const { p, log } = ports();
  const r = await deliver(addrs(120), p, { deadline: 1e9, batchSize: 50 });
  eq('120 readers → batches of 50, 50, 20', log.batches.map((b) => b.length), [50, 50, 20]);
  eq('all sent, nothing left', [r.sent, r.failed, r.remaining, r.stoppedBy], [120, 0, 0, 'done']);
  eq('every address recorded as sent exactly once', [log.recorded.length, new Set(log.recorded.map((x) => x.email)).size], [120, 120]);
}
{ // another pass already owns some addresses: they are neither mailed nor counted
  const { p, log } = ports({ owned: new Set(['u1@x.com', 'u2@x.com']) });
  const r = await deliver(addrs(5), p, { deadline: 1e9 });
  ok('claimed-by-someone-else addresses are not mailed', !log.batches.flat().includes('u1@x.com') && !log.batches.flat().includes('u2@x.com'));
  eq('only our 3 are sent', [r.sent, r.remaining, r.stoppedBy], [3, 0, 'done']);
}
{ // a temporary outage: nothing is written off, the claims are given back, the next pass resumes
  const { p, log } = ports({ sendBatch: async () => ({ ok: false, error: 'Resend error 503' }) });
  const r = await deliver(addrs(60), p, { deadline: 1e9, batchSize: 50 });
  eq('stops at once', [r.stoppedBy, r.sent, r.failed], ['transient', 0, 0]);
  eq('the 50 claimed addresses are released', log.released.length, 50);
  eq('nothing recorded as failed', log.recorded.length, 0);
  eq('all 60 are still to do', r.remaining, 60);
}
{ // one bad address spoils a batch → found one by one, the rest still go out
  const { p, log } = ports({
    sendBatch: async () => ({ ok: false, error: 'Invalid `to` field' }),
    sendOne: async (e) => (e === 'u3@x.com' ? { ok: false, error: 'The recipient address is not valid' } : { ok: true }),
  });
  const r = await deliver(addrs(6), p, { deadline: 1e9 });
  eq('5 sent, 1 failed', [r.sent, r.failed, r.remaining, r.stoppedBy], [5, 1, 0, 'done']);
  eq('the bad one is recorded as failed with its reason', log.recorded.filter((x) => x.status === 'failed'), [{ email: 'u3@x.com', status: 'failed', error: 'The recipient address is not valid' }]);
}
{ // time is up: unfinished claims are released and the rest is left for the next pass
  let calls = 0;
  const { p, log } = ports({ now: () => (calls++ < 1 ? 0 : 100) });
  const r = await deliver(addrs(150), p, { deadline: 50, batchSize: 50 });
  eq('stopped by the deadline after the first batch', [r.stoppedBy, r.sent, r.remaining], ['deadline', 50, 100]);
  eq('sent + remaining = total', r.sent + r.failed + r.remaining, 150);
  ok('nobody was mailed twice', new Set(log.batches.flat()).size === log.batches.flat().length);
}
{ const r = await deliver([], ports().p, { deadline: 1e9 }); eq('empty list is simply done', [r.sent, r.remaining, r.stoppedBy], [0, 0, 'done']); }

// ── signed unsubscribe links ─────────────────────────────────────────────────
{
  const secret = 'test-secret-1';
  const t = unsubscribeToken('Reader@Example.com', secret);
  ok('token verifies for the same address (case-insensitive)', verifyUnsubscribeToken('reader@example.com', t, secret));
  ok('token fails for another address', !verifyUnsubscribeToken('other@example.com', t, secret));
  ok('token fails with another secret', !verifyUnsubscribeToken('reader@example.com', t, 'test-secret-2'));
  ok('tampered / empty / missing-secret tokens fail', !verifyUnsubscribeToken('reader@example.com', t.slice(0, -1) + (t.endsWith('A') ? 'B' : 'A'), secret) && !verifyUnsubscribeToken('reader@example.com', '', secret) && !verifyUnsubscribeToken('reader@example.com', t, ''));
  eq('address survives the URL round trip', decodeEmailParam(encodeEmailParam('Reader+news@Example.com')), 'reader+news@example.com');
  eq('garbage decodes to nothing', [decodeEmailParam('!!!'), decodeEmailParam(Buffer.from('no-at-sign').toString('base64url'))], ['', '']);
  const url = unsubscribeUrl('https://example.com/', 'a@b.co', 'de', secret);
  ok('link shape', url.startsWith('https://example.com/api/newsletter/unsubscribe?e=') && url.includes('&l=de') && !url.includes('//api'));
  const q = new URL(url).searchParams;
  ok('link verifies', verifyUnsubscribeToken(decodeEmailParam(q.get('e')!), q.get('t')!, secret));
  eq('one-click headers', unsubscribeHeaders(url), { 'List-Unsubscribe': `<${url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' });
  eq('placeholder is replaced everywhere', personalise(`a ${UNSUB_PLACEHOLDER} b ${UNSUB_PLACEHOLDER}`, 'U'), 'a U b U');
  eq('secret falls back NEWSLETTER_UNSUB_SECRET → CRON_SECRET → ENRICH_SECRET → none', [
    unsubscribeSecret({ NEWSLETTER_UNSUB_SECRET: 'a', CRON_SECRET: 'b' }), unsubscribeSecret({ CRON_SECRET: 'b' }), unsubscribeSecret({ ENRICH_SECRET: 'c' }), unsubscribeSecret({}),
  ], ['a', 'b', 'c', '']);
}

report('newsletter.workflow');
