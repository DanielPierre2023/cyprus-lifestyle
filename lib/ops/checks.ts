// lib/ops/checks.ts
// Pure rules (no I/O) that turn a SNAPSHOT of the system into a list of plain-English health checks, plus the rule for
// when to e-mail an alert. The snapshot is gathered by lib/ops/watchdog.ts. Unit-tested in scripts/tests/ops.checks.test.ts.
//
// Why this exists: on 2026-10-05 every Supabase scheduled job was failing silently for weeks (template placeholders never
// replaced) and nobody could tell, because nothing looked. This is the "looking".

export type Level = 'ok' | 'warn' | 'red' | 'info';
export interface Check { key: string; area: string; label: string; level: Level; detail: string; fix?: string }

export interface CronRow {
  jobname: string; schedule: string; active: boolean; last_status: string | null; last_start: string | null;
  last_message: string | null; last_success: string | null; runs_24h: number; failed_24h: number;
}

export interface Snapshot {
  now: Date;
  cron: CronRow[] | null;                       // null = the scheduler cannot be read (function/extension missing)
  dailyTickAt: string | null;                   // newest background job created by the daily Vercel job
  queue: { pending: number; oldestPendingAt: string | null; dead24h: number };
  toggles: Record<string, boolean> | null;
  newsletter: { waitingDrafts: number; stuck: number };
  social: { autopost: boolean; configured: boolean; failed: number; stalePending: number };
  billing: { stripeKeySet: boolean; liveKey: boolean; vatOff: boolean; webhookUnprocessed: number; vatAlerts: number };
  errors24h: number;
  mailConfigured: boolean;
  events: EventsSnapshot;
}

/** The automated agenda (increment 7.1): is the pipeline alive, and is there always something coming up? */
export interface EventsSnapshot {
  pipelineOn: boolean;                          // automation_settings.events_pipeline_enabled (default on)
  tablesReady: boolean;                         // migration 20261007120000 applied
  enabledSources: number;
  lastSuccessAt: string | null;                 // newest successful source run
  failingSources: number;                       // enabled sources with 3+ failed runs in a row
  upcoming30: number;                           // published, real events (public holidays not counted) starting in the next 30 days or running now
  draftsWaiting: number;                        // future drafts awaiting approval
}
export const EVENTS_MIN_UPCOMING_30D = 5;       // fewer than this: warn; none at all: red
export const EVENTS_MAX_SILENCE_H = 36;         // no successful pipeline run for this long: red

const MIN = 60_000, HOUR = 3_600_000;
const age = (iso: string | null, now: Date) => (iso ? now.getTime() - Date.parse(iso) : Infinity);
const human = (ms: number) => (!Number.isFinite(ms) ? 'never' : ms < HOUR ? `${Math.round(ms / MIN)} min ago` : ms < 48 * HOUR ? `${Math.round(ms / HOUR)} h ago` : `${Math.round(ms / (24 * HOUR))} days ago`);

/** Longest acceptable silence per scheduled job. */
export const JOB_MAX_SILENCE: Record<string, number> = { 'cl-worker': 15 * MIN, 'cl-process': 60 * MIN, 'cyprus-scrape-rss': 8 * HOUR, 'enrich-slow-all': 36 * HOUR, 'cl-events-ingest': 8 * HOUR, 'cl-booking-sla': 45 * MIN, 'cl-embed-sources': 36 * HOUR };

export const SCHEDULER_FIX = 'Supabase → SQL Editor: add the Vault secrets named at the top of supabase/pg_cron/install-jobs.sql, then run that file (docs/OPERATIONS.md).';

export function evaluate(s: Snapshot): Check[] {
  const out: Check[] = [];
  const add = (c: Check) => out.push(c);
  const t = s.toggles || {};

  // ── scheduler (Supabase pg_cron) ──
  if (s.cron === null) {
    add({ key: 'scheduler', area: 'Scheduler', label: 'Supabase scheduled jobs', level: 'red', detail: 'The scheduler cannot be read — either pg_cron is not enabled or migration 20261005170000_ops_cron_health.sql has not been run.', fix: 'Run that migration in the SQL Editor; enable pg_cron under Database → Extensions.' });
  } else {
    const by = new Map(s.cron.map((j) => [j.jobname, j]));
    const need: [string, boolean, string][] = [
      ['cl-worker', true, 'drains the background queue, sends approved newsletters, posts to Facebook/Instagram'],
      ['cl-process', !!t.processor_enabled, 'AI desk (the “AI processor” switch is ON, so this job is required)'],
      ['cyprus-scrape-rss', !!t.scraper_enabled, 'RSS scraper (the “RSS scraper” switch is ON, so this job is required)'],
      ['enrich-slow-all', false, 'slow directory enrichment'],
      ['cl-booking-sla', true, 'booking first-reply breach alerts and partner reminders'],
      ['cl-embed-sources', false, 'nightly indexing of new articles, events and activities for the concierge'],
      ['cl-events-ingest', false, 'refreshes the Agenda from the event sources every 3 hours (without it the daily Vercel job still does it once a day)'],
    ];
    for (const [name, required, why] of need) {
      const j = by.get(name);
      const key = `job:${name}`;
      if (!j) { add({ key, area: 'Scheduler', label: name, level: required ? 'red' : 'info', detail: `Not scheduled — ${why}.`, fix: SCHEDULER_FIX }); continue; }
      if (!j.active) { add({ key, area: 'Scheduler', label: name, level: required ? 'red' : 'warn', detail: 'The job exists but is switched off.', fix: SCHEDULER_FIX }); continue; }
      if (j.last_status === 'failed') {
        add({ key, area: 'Scheduler', label: name, level: 'red', detail: `Last run FAILED (${human(age(j.last_start, s.now))}): ${(j.last_message || '').replace(/\s+/g, ' ').slice(0, 160)}`, fix: SCHEDULER_FIX });
        continue;
      }
      const silence = age(j.last_start, s.now);
      if (silence > (JOB_MAX_SILENCE[name] ?? 24 * HOUR)) { add({ key, area: 'Scheduler', label: name, level: 'red', detail: `Has not run for ${human(silence)}.`, fix: SCHEDULER_FIX }); continue; }
      add({ key, area: 'Scheduler', label: name, level: 'ok', detail: `Running (${j.schedule}); last run ${human(silence)}, ${j.failed_24h} failed in the last 24 h.` });
    }
  }

  // ── the daily Vercel job ──
  const tick = age(s.dailyTickAt, s.now);
  add(tick > 36 * HOUR
    ? { key: 'tick', area: 'Scheduler', label: 'Daily job (Vercel)', level: s.dailyTickAt ? 'red' : 'warn', detail: s.dailyTickAt ? `The daily job last queued work ${human(tick)}.` : 'The daily job has never queued work.', fix: 'Vercel → project → Settings → Cron Jobs must show /api/cron/tick, and CRON_SECRET must be set.' }
    : { key: 'tick', area: 'Scheduler', label: 'Daily job (Vercel)', level: 'ok', detail: `Last queued work ${human(tick)}.` });

  // ── background queue ──
  const wait = age(s.queue.oldestPendingAt, s.now);
  if (s.queue.pending > 0 && wait > 3 * HOUR) add({ key: 'queue', area: 'Queue', label: 'Background queue', level: 'red', detail: `${s.queue.pending} job(s) waiting; the oldest for ${human(wait)} — the worker is not draining the queue.`, fix: 'Check the cl-worker job above.' });
  else if (s.queue.pending > 0 && wait > 30 * MIN) add({ key: 'queue', area: 'Queue', label: 'Background queue', level: 'warn', detail: `${s.queue.pending} job(s) waiting; the oldest for ${human(wait)}.` });
  else add({ key: 'queue', area: 'Queue', label: 'Background queue', level: s.queue.dead24h > 0 ? 'warn' : 'ok', detail: `${s.queue.pending} waiting${s.queue.dead24h ? `, ${s.queue.dead24h} gave up in the last 24 h` : ''}.` });

  // ── newsletter ──
  const fridayLate = s.now.getUTCDay() === 5 && s.now.getUTCHours() >= 11;
  if (s.newsletter.stuck > 0) add({ key: 'newsletter', area: 'Newsletter', label: 'Newsletter delivery', level: 'red', detail: `${s.newsletter.stuck} approved edition(s) have been sending for over 20 minutes.`, fix: 'Admin → Newsletter; check the cl-worker job and the Resend settings.' });
  else if (s.newsletter.waitingDrafts > 0 && fridayLate) add({ key: 'newsletter', area: 'Newsletter', label: 'Newsletter', level: 'warn', detail: `${s.newsletter.waitingDrafts} edition(s) are waiting for your approval.`, fix: 'Admin → Newsletter → Approve & send.' });
  else add({ key: 'newsletter', area: 'Newsletter', label: 'Newsletter', level: 'ok', detail: s.newsletter.waitingDrafts ? `${s.newsletter.waitingDrafts} draft(s) prepared, awaiting approval.` : 'Nothing waiting.' });

  // ── social ──
  if (s.social.failed > 0) add({ key: 'social', area: 'Social', label: 'Facebook / Instagram posting', level: 'red', detail: `${s.social.failed} post(s) failed.`, fix: 'Admin → Social: read the problem, fix the Meta token if needed, press “Retry all failed”.' });
  else if (s.social.autopost && !s.social.configured) add({ key: 'social', area: 'Social', label: 'Facebook / Instagram posting', level: 'info', detail: 'Auto-posting is on but Meta is not connected yet; posts wait in the queue.', fix: 'Connect Meta (docs/SOCIAL-SETUP.md).' });
  else if (s.social.stalePending > 0) add({ key: 'social', area: 'Social', label: 'Facebook / Instagram posting', level: 'warn', detail: `${s.social.stalePending} post(s) have waited over 3 hours.`, fix: 'Admin → Social → Work the queue now; check the cl-worker job.' });
  else add({ key: 'social', area: 'Social', label: 'Facebook / Instagram posting', level: 'ok', detail: s.social.autopost ? 'Working.' : 'Auto-posting is switched off.' });

  // ── billing ──
  if (s.billing.webhookUnprocessed > 0) add({ key: 'webhook', area: 'Billing', label: 'Stripe webhook', level: 'red', detail: `${s.billing.webhookUnprocessed} Stripe event(s) received but not processed for over 15 minutes — a payment may not have been recorded.`, fix: 'Stripe → Developers → Webhooks → check the endpoint; Vercel logs for /api/advertise/webhook.' });
  else add({ key: 'webhook', area: 'Billing', label: 'Stripe webhook', level: 'ok', detail: 'All received events were processed.' });
  if (s.billing.stripeKeySet && s.billing.vatOff) add({ key: 'vat', area: 'Billing', label: 'VAT', level: s.billing.liveKey ? 'red' : 'warn', detail: s.billing.liveKey ? 'Live Stripe key but VAT calculation is OFF: customers are charged without VAT.' : 'VAT calculation is OFF (fine while testing).', fix: 'Finish docs/VAT-SETUP.md, then STRIPE_AUTOMATIC_TAX=1.' });
  else add({ key: 'vat', area: 'Billing', label: 'VAT', level: s.billing.vatAlerts > 0 ? 'warn' : 'ok', detail: s.billing.vatAlerts > 0 ? `${s.billing.vatAlerts} order(s) where Stripe's VAT differs from the expectation.` : s.billing.stripeKeySet ? 'VAT calculation is on; no alerts.' : 'Stripe is not configured.', fix: s.billing.vatAlerts > 0 ? 'Admin → VAT check.' : undefined });

  // ── errors / e-mail ──
  add({ key: 'errors', area: 'Errors', label: 'Errors in the last 24 h', level: s.errors24h >= 100 ? 'red' : s.errors24h >= 20 ? 'warn' : 'ok', detail: `${s.errors24h} logged error(s).`, fix: s.errors24h >= 20 ? 'Admin → Analytics → recent errors.' : undefined });
  add({ key: 'mail', area: 'E-mail', label: 'Outgoing e-mail', level: s.mailConfigured ? 'ok' : 'warn', detail: s.mailConfigured ? 'Resend is configured.' : 'RESEND_API_KEY is not set: no e-mail can be sent.', fix: s.mailConfigured ? undefined : 'Add RESEND_API_KEY and EMAIL_FROM in Vercel.' });

  // ── automated agenda: pipeline alive + freshness ──
  const ev = s.events;
  if (!ev.tablesReady) add({ key: 'events-pipeline', area: 'Agenda', label: 'Events pipeline', level: 'warn', detail: 'The events pipeline tables are missing — migration 20261007120000_events_pipeline.sql has not been run.', fix: 'Run that migration in the SQL Editor.' });
  else if (!ev.pipelineOn) add({ key: 'events-pipeline', area: 'Agenda', label: 'Events pipeline', level: 'info', detail: 'Switched off (automation_settings.events_pipeline_enabled = false): the Agenda is not refreshed automatically.', fix: 'Turn it back on in Admin → Events sources.' });
  else if (ev.enabledSources === 0) add({ key: 'events-pipeline', area: 'Agenda', label: 'Events pipeline', level: 'warn', detail: 'No event source is enabled, so nothing new can arrive.', fix: 'Admin → Events sources → enable at least one source.' });
  else {
    const silent = age(ev.lastSuccessAt, s.now);
    if (!ev.lastSuccessAt) add({ key: 'events-pipeline', area: 'Agenda', label: 'Events pipeline', level: 'warn', detail: 'The events pipeline has not completed a run yet.', fix: 'Admin → Events sources → “Run now”; check that the cl-worker job is running.' });
    else if (silent > EVENTS_MAX_SILENCE_H * HOUR) add({ key: 'events-pipeline', area: 'Agenda', label: 'Events pipeline', level: 'red', detail: `No successful events run for ${human(silent)} (limit ${EVENTS_MAX_SILENCE_H} h) — the Agenda is going stale.`, fix: 'Admin → Events sources: read the last error per source; check the cl-worker job and the daily Vercel job.' });
    else if (ev.failingSources > 0) add({ key: 'events-pipeline', area: 'Agenda', label: 'Events pipeline', level: 'warn', detail: `Last success ${human(silent)}, but ${ev.failingSources} source(s) failed 3+ times in a row.`, fix: 'Admin → Events sources: see the error of the failing source(s).' });
    else add({ key: 'events-pipeline', area: 'Agenda', label: 'Events pipeline', level: 'ok', detail: `Last successful run ${human(silent)}; ${ev.enabledSources} source(s) enabled.` });
  }
  if (ev.tablesReady) {
    const lowFix = 'Admin → Events sources: enable more sources or approve the drafts waiting in Admin → Agenda' + (ev.draftsWaiting ? ` (${ev.draftsWaiting} future draft(s) are waiting).` : '.');
    add(ev.upcoming30 === 0
      ? { key: 'events-fresh', area: 'Agenda', label: 'Upcoming events', level: 'red', detail: 'No event is scheduled in the next 30 days — the public Agenda looks empty.', fix: lowFix }
      : ev.upcoming30 < EVENTS_MIN_UPCOMING_30D
        ? { key: 'events-fresh', area: 'Agenda', label: 'Upcoming events', level: 'warn', detail: `Only ${ev.upcoming30} event(s) in the next 30 days (public holidays not counted; target ${EVENTS_MIN_UPCOMING_30D}+).`, fix: lowFix }
        : { key: 'events-fresh', area: 'Agenda', label: 'Upcoming events', level: 'ok', detail: `${ev.upcoming30} events in the next 30 days.` });
  }

  // ── switches that promise a job ──
  for (const row of toggleRows(s)) {
    if (row.on && row.state === 'broken') add({ key: `toggle:${row.key}`, area: 'Switches', label: row.label, level: 'red', detail: `Switched ON, but nothing is running it: ${row.how}.`, fix: row.fix });
  }
  return out;
}

// ── toggles ↔ the job that runs each ─────────────────────────────────────────

export interface ToggleDef { key: string; label: string; via: 'cron' | 'tick' | 'event'; job?: string; needs?: string; note: string }
export const TOGGLES: ToggleDef[] = [
  { key: 'scraper_enabled', label: 'RSS scraper', via: 'cron', job: 'cyprus-scrape-rss', note: 'Supabase job every 3 h (and the daily Vercel job queues one run).' },
  { key: 'processor_enabled', label: 'AI processor', via: 'cron', job: 'cl-process', note: 'Supabase job every 15 min rewrites queued articles.' },
  { key: 'auto_publish', label: 'Auto-publish articles', via: 'cron', job: 'cl-process', needs: 'processor_enabled', note: 'Only acts through the AI processor.' },
  { key: 'developments_enabled', label: 'Developer-projects scraper', via: 'tick', note: 'Queued daily by the Vercel job, worked by the worker.' },
  { key: 'developments_autopublish', label: 'Publish scraped projects live', via: 'tick', needs: 'developments_enabled', note: 'Only acts through the developer-projects scraper.' },
  { key: 'regulation_watch_enabled', label: 'Regulation watch', via: 'tick', note: 'Queued daily by the Vercel job, worked by the worker.' },
  { key: 'events_watch_enabled', label: 'Agenda actualiser', via: 'tick', note: 'Queued daily by the Vercel job, worked by the worker.' },
  { key: 'events_pipeline_enabled', label: 'Events pipeline (automatic Agenda)', via: 'tick', note: 'Queued daily by the Vercel job and every 3 h by the Supabase job cl-events-ingest; worked by the worker.' },
  { key: 'mail_autoack_enabled', label: 'Auto-acknowledge e-mail', via: 'event', note: 'Runs when an e-mail arrives; no schedule needed.' },
];

export interface ToggleRow { key: string; label: string; on: boolean; state: 'ok' | 'broken' | 'idle'; how: string; fix?: string }

export function toggleRows(s: Snapshot): ToggleRow[] {
  const t = s.toggles || {};
  const jobs = new Map((s.cron || []).map((j) => [j.jobname, j]));
  const tickOk = age(s.dailyTickAt, s.now) <= 36 * HOUR;
  const workerOk = (() => { const w = jobs.get('cl-worker'); return !!w && w.active && w.last_status !== 'failed' && age(w.last_start, s.now) <= JOB_MAX_SILENCE['cl-worker']; })();
  return TOGGLES.map((d) => {
    const on = !!t[d.key];
    if (!on) return { key: d.key, label: d.label, on, state: 'idle', how: 'switched off' };
    if (d.needs && !t[d.needs]) return { key: d.key, label: d.label, on, state: 'idle', how: `waits for “${TOGGLES.find((x) => x.key === d.needs)?.label}”` };
    if (d.via === 'event') return { key: d.key, label: d.label, on, state: 'ok', how: d.note };
    if (d.via === 'tick') {
      const good = tickOk && workerOk;
      return { key: d.key, label: d.label, on, state: good ? 'ok' : 'broken', how: good ? d.note : `the ${!tickOk ? 'daily Vercel job' : 'Supabase worker job'} is not running`, fix: good ? undefined : SCHEDULER_FIX };
    }
    const j = jobs.get(d.job!);
    const good = !!j && j.active && j.last_status !== 'failed' && age(j.last_start, s.now) <= (JOB_MAX_SILENCE[d.job!] ?? 24 * HOUR);
    return { key: d.key, label: d.label, on, state: good ? 'ok' : 'broken', how: good ? d.note : `the Supabase job “${d.job}” is ${j ? 'failing or silent' : 'not scheduled'}`, fix: good ? undefined : SCHEDULER_FIX };
  });
}

// ── alerts ───────────────────────────────────────────────────────────────────

export interface AlertState { hash: string; sentAt: string | null }
export const ALERT_REPEAT_MS = 12 * HOUR;

/** E-mail when the set of RED checks changes (or every 12 h while it persists); one note when everything is green again. */
export function alertDecision(checks: Check[], prev: AlertState | null, now: Date): { send: boolean; kind: 'alert' | 'recovered' | null; hash: string; reds: Check[] } {
  const reds = checks.filter((c) => c.level === 'red');
  const hash = reds.map((c) => c.key).sort().join('|');
  const was = prev?.hash || '';
  if (reds.length > 0) {
    const due = hash !== was || !prev?.sentAt || now.getTime() - Date.parse(prev.sentAt) >= ALERT_REPEAT_MS;
    return { send: due, kind: due ? 'alert' : null, hash, reds };
  }
  return { send: !!was, kind: was ? 'recovered' : null, hash: '', reds };
}
