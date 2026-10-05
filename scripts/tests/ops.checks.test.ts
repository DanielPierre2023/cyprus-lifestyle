// System-health rules: scheduler/job checks, switch↔job truthfulness, alert de-duplication, admin-request audit entry.
import { evaluate, toggleRows, alertDecision, ALERT_REPEAT_MS, type Snapshot, type CronRow } from '@/lib/ops/checks';
import { requestAuditEntry } from '@/lib/auditRequestEntry';
import { eq, ok, report } from './_harness';

const NOW = new Date('2026-10-07T10:00:00Z');
const ago = (min: number) => new Date(NOW.getTime() - min * 60_000).toISOString();
const job = (jobname: string, o: Partial<CronRow> = {}): CronRow => ({ jobname, schedule: '*/3 * * * *', active: true, last_status: 'succeeded', last_start: ago(2), last_message: null, last_success: ago(2), runs_24h: 480, failed_24h: 0, ...o });
const allJobs = () => [job('cl-worker'), job('cl-process', { last_start: ago(10) }), job('cyprus-scrape-rss', { last_start: ago(60) }), job('enrich-slow-all', { last_start: ago(600) })];
const snap = (o: Partial<Snapshot> = {}): Snapshot => ({
  now: NOW, cron: allJobs(), dailyTickAt: ago(300), queue: { pending: 0, oldestPendingAt: null, dead24h: 0 },
  toggles: { scraper_enabled: false, processor_enabled: false, auto_publish: false },
  newsletter: { waitingDrafts: 0, stuck: 0 }, social: { autopost: true, configured: true, failed: 0, stalePending: 0 },
  billing: { stripeKeySet: true, liveKey: false, vatOff: false, webhookUnprocessed: 0, vatAlerts: 0 }, errors24h: 0, mailConfigured: true, ...o,
});
const lvl = (cs: ReturnType<typeof evaluate>, key: string) => cs.find((c) => c.key === key)?.level;

// ── healthy ──
{
  const cs = evaluate(snap());
  eq('healthy snapshot has no red', cs.filter((c) => c.level === 'red').length, 0);
  eq('worker job ok', lvl(cs, 'job:cl-worker'), 'ok');
}
// ── scheduler unreadable ──
eq('unreadable scheduler is red', lvl(evaluate(snap({ cron: null })), 'scheduler'), 'red');
// ── failing / silent / missing worker ──
eq('failed worker run is red', lvl(evaluate(snap({ cron: [job('cl-worker', { last_status: 'failed', last_message: 'invalid URL' })] })), 'job:cl-worker'), 'red');
eq('silent worker (20 min) is red', lvl(evaluate(snap({ cron: [job('cl-worker', { last_start: ago(20) })] })), 'job:cl-worker'), 'red');
eq('missing worker is red', lvl(evaluate(snap({ cron: [] })), 'job:cl-worker'), 'red');
eq('inactive worker is red', lvl(evaluate(snap({ cron: [job('cl-worker', { active: false })] })), 'job:cl-worker'), 'red');
// ── optional jobs only matter when their switch is on ──
eq('missing process job is info when switch off', lvl(evaluate(snap({ cron: [job('cl-worker')] })), 'job:cl-process'), 'info');
eq('missing process job is red when processor ON', lvl(evaluate(snap({ cron: [job('cl-worker')], toggles: { processor_enabled: true } })), 'job:cl-process'), 'red');
eq('missing scraper job is red when scraper ON', lvl(evaluate(snap({ cron: [job('cl-worker')], toggles: { scraper_enabled: true } })), 'job:cyprus-scrape-rss'), 'red');
// ── switches ──
{
  const rows = toggleRows(snap({ cron: [job('cl-worker')], toggles: { processor_enabled: true, auto_publish: true, scraper_enabled: false } }));
  const proc = rows.find((r) => r.key === 'processor_enabled')!;
  eq('processor ON without job is broken', proc.state, 'broken');
  eq('switch OFF is idle', rows.find((r) => r.key === 'scraper_enabled')!.state, 'idle');
  const cs = evaluate(snap({ cron: [job('cl-worker')], toggles: { processor_enabled: true } }));
  eq('broken switch surfaces as red check', lvl(cs, 'toggle:processor_enabled'), 'red');
  const ok1 = toggleRows(snap({ toggles: { processor_enabled: true } })).find((r) => r.key === 'processor_enabled')!;
  eq('processor ON with healthy job is ok', ok1.state, 'ok');
  const dep = toggleRows(snap({ toggles: { auto_publish: true, processor_enabled: false } })).find((r) => r.key === 'auto_publish')!;
  eq('auto_publish without processor only waits', dep.state, 'idle');
}
// ── tick ──
eq('stale daily tick is red', lvl(evaluate(snap({ dailyTickAt: ago(60 * 40) })), 'tick'), 'red');
eq('never-run daily tick is only a warning', lvl(evaluate(snap({ dailyTickAt: null })), 'tick'), 'warn');
// ── queue / newsletter / social / billing ──
eq('queue stuck 4 h is red', lvl(evaluate(snap({ queue: { pending: 5, oldestPendingAt: ago(240), dead24h: 0 } })), 'queue'), 'red');
eq('queue 45 min is warn', lvl(evaluate(snap({ queue: { pending: 5, oldestPendingAt: ago(45), dead24h: 0 } })), 'queue'), 'warn');
eq('stuck newsletter is red', lvl(evaluate(snap({ newsletter: { waitingDrafts: 0, stuck: 1 } })), 'newsletter'), 'red');
eq('failed social post is red', lvl(evaluate(snap({ social: { autopost: true, configured: true, failed: 2, stalePending: 0 } })), 'social'), 'red');
eq('social not connected is info, not red', lvl(evaluate(snap({ social: { autopost: true, configured: false, failed: 0, stalePending: 0 } })), 'social'), 'info');
eq('unprocessed webhook is red', lvl(evaluate(snap({ billing: { stripeKeySet: true, liveKey: false, vatOff: false, webhookUnprocessed: 1, vatAlerts: 0 } })), 'webhook'), 'red');
eq('VAT off on live key is red', lvl(evaluate(snap({ billing: { stripeKeySet: true, liveKey: true, vatOff: true, webhookUnprocessed: 0, vatAlerts: 0 } })), 'vat'), 'red');
eq('VAT off on test key is warn', lvl(evaluate(snap({ billing: { stripeKeySet: true, liveKey: false, vatOff: true, webhookUnprocessed: 0, vatAlerts: 0 } })), 'vat'), 'warn');

// ── alert de-duplication ──
{
  const red = (key: string) => ({ key, area: 'x', label: key, level: 'red' as const, detail: '' });
  const green = [{ key: 'a', area: 'x', label: 'a', level: 'ok' as const, detail: '' }];
  const d1 = alertDecision([red('a'), red('b')], null, NOW);
  eq('first red set sends', d1.send, true);
  eq('hash is sorted keys', d1.hash, 'a|b');
  const d2 = alertDecision([red('b'), red('a')], { hash: 'a|b', sentAt: NOW.toISOString() }, new Date(NOW.getTime() + 60 * 60_000));
  eq('same reds within 12 h: silent', d2.send, false);
  const d3 = alertDecision([red('a'), red('b')], { hash: 'a|b', sentAt: NOW.toISOString() }, new Date(NOW.getTime() + ALERT_REPEAT_MS + 1000));
  eq('same reds after 12 h: reminder', d3.send, true);
  const d4 = alertDecision([red('a'), red('b'), red('c')], { hash: 'a|b', sentAt: NOW.toISOString() }, new Date(NOW.getTime() + 60_000));
  eq('a new red sends immediately', d4.send, true);
  const d5 = alertDecision(green, { hash: 'a|b', sentAt: NOW.toISOString() }, NOW);
  eq('recovery sends once', d5.kind, 'recovered');
  eq('all green and was green: silent', alertDecision(green, { hash: '', sentAt: null }, NOW).send, false);
}

// ── admin-request audit entry ──
{
  const e = requestAuditEntry('post', 'https://x.eu/api/admin/scrape?source=abc&dry=1&source=def', 'scrape', { id: 'u1', email: 'a@b.eu' });
  eq('action prefixed', e.action, 'api.scrape');
  eq('actor kept', e.actorEmail, 'a@b.eu');
  ok('summary has method and path, no query values', e.summary === 'POST /api/admin/scrape');
  eq('only query keys recorded, deduplicated', JSON.stringify(e.changes), JSON.stringify({ query: ['source', 'dry'] }));
  ok('access-key call is labelled', (requestAuditEntry('POST', '/api/admin/x', 'x', null).summary || '').includes('access key'));
}
report('ops.checks');
