// lib/ops/watchdog.ts — gathers the snapshot from the database/environment, runs the checks, and e-mails an alert when
// something turns red. Called from the worker (every ~3 minutes, but it only does real work every 30 minutes) and from
// the daily job; Admin → System health runs it on demand without sending anything.
import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { brandedEmail, sendEmail } from '@/lib/email';
import { escapeHtml } from '@/lib/util';
import { logServerError } from '@/lib/monitor.server';
import { automaticTaxEnabled } from '@/lib/stripe';
import { stripeKeyMode } from '@/lib/vat/status';
import { loadSettings, configured } from '@/lib/socialAuto';
import { alertDecision, evaluate, toggleRows, type AlertState, type Check, type CronRow, type EventsSnapshot, type Snapshot, type ToggleRow } from '@/lib/ops/checks';
import { EVENT_SOURCES } from '@/lib/events/sources';

const STATE_KEY = 'ops_watchdog';
const CHECK_EVERY_MS = 30 * 60_000;

async function safe<T>(f: () => PromiseLike<T> | T, fallback: T): Promise<T> {
  try { return await f(); } catch { return fallback; }
}
async function count(q: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const r = await q; return r.error ? 0 : (r.count ?? 0);
}

export async function gatherSnapshot(sb: SupabaseClient, now: Date = new Date()): Promise<Snapshot> {
  const iso = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const H = 3_600_000;

  const cron = await safe(async () => {
    const { data, error } = await sb.rpc('ops_cron_health');
    return error ? null : ((data || []) as CronRow[]);
  }, null);

  const tickAt = await safe(async () => {
    const { data } = await sb.from('job_queue').select('created_at').in('kind', ['geocode_listing', 'developments', 'outreach', 'scrape', 'regulations', 'events_mine']).order('created_at', { ascending: false }).limit(1);
    return (data && data[0] ? String((data[0] as { created_at: string }).created_at) : null);
  }, null);

  const queue = await safe(async () => {
    const pending = await count(sb.from('job_queue').select('id', { count: 'exact', head: true }).eq('status', 'pending').lte('run_after', now.toISOString()));
    const { data } = await sb.from('job_queue').select('run_after').eq('status', 'pending').lte('run_after', now.toISOString()).order('run_after', { ascending: true }).limit(1);
    const dead24h = await count(sb.from('job_queue').select('id', { count: 'exact', head: true }).eq('status', 'dead').gte('updated_at', iso(24 * H)));
    return { pending, oldestPendingAt: data && data[0] ? String((data[0] as { run_after: string }).run_after) : null, dead24h };
  }, { pending: 0, oldestPendingAt: null as string | null, dead24h: 0 });

  const toggles = await safe(async () => {
    const { data } = await sb.from('automation_settings').select('*').eq('id', 1).maybeSingle();
    return data ? (Object.fromEntries(Object.entries(data as Record<string, unknown>).filter(([, v]) => typeof v === 'boolean')) as Record<string, boolean>) : null;
  }, null);

  const newsletter = await safe(async () => ({
    waitingDrafts: await count(sb.from('newsletter_campaigns').select('id', { count: 'exact', head: true }).eq('status', 'draft').gte('created_at', iso(7 * 24 * H))),
    stuck: await count(sb.from('newsletter_campaigns').select('id', { count: 'exact', head: true }).in('status', ['approved', 'sending']).lte('approved_at', iso(20 * 60_000))),
  }), { waitingDrafts: 0, stuck: 0 });

  const social = await safe(async () => {
    const st = await loadSettings(sb);
    const cfg = configured();
    return {
      autopost: st.enabled,
      configured: cfg.facebook || cfg.instagram,
      failed: await count(sb.from('social_outbox').select('id', { count: 'exact', head: true }).eq('status', 'failed')),
      stalePending: cfg.facebook || cfg.instagram ? await count(sb.from('social_outbox').select('id', { count: 'exact', head: true }).eq('status', 'pending').lte('next_attempt_at', iso(3 * H))) : 0,
    };
  }, { autopost: false, configured: false, failed: 0, stalePending: 0 });

  const key = process.env.STRIPE_SECRET_KEY;
  const billing = await safe(async () => ({
    stripeKeySet: !!(key && key.trim()),
    liveKey: stripeKeyMode(key) === 'live',
    vatOff: !automaticTaxEnabled(),
    webhookUnprocessed: await count(sb.from('stripe_events').select('event_id', { count: 'exact', head: true }).is('processed_at', null).lte('received_at', iso(15 * 60_000))),
    vatAlerts: await count(sb.from('ad_orders').select('id', { count: 'exact', head: true }).not('vat_alert', 'is', null)),
  }), { stripeKeySet: false, liveKey: false, vatOff: true, webhookUnprocessed: 0, vatAlerts: 0 });

  const events = await safe<EventsSnapshot>(async () => {
    const { data: rows, error } = await sb.from('events_sources').select('slug, enabled, last_success_at, consecutive_failures');
    if (error) return { pipelineOn: true, tablesReady: false, enabledSources: 0, lastSuccessAt: null, failingSources: 0, upcoming30: 0, draftsWaiting: 0 };
    const st = new Map(((rows || []) as { slug: string; enabled: boolean | null; last_success_at: string | null; consecutive_failures: number }[]).map((r) => [r.slug, r]));
    const enabled = EVENT_SOURCES.filter((s) => (st.get(s.slug)?.enabled ?? s.enabled));
    const nowIso = now.toISOString(), in30 = new Date(now.getTime() + 30 * 24 * H).toISOString();
    const upcoming30 = await count(sb.from('events').select('id', { count: 'exact', head: true }).eq('status', 'published').not('tags', 'cs', '{public-holiday}')
      .or(`and(starts_at.gte.${nowIso},starts_at.lte.${in30}),and(starts_at.lt.${nowIso},ends_at.gte.${nowIso})`));
    const draftsWaiting = await count(sb.from('events').select('id', { count: 'exact', head: true }).eq('status', 'draft').gte('starts_at', nowIso));
    const last = enabled.map((s) => st.get(s.slug)?.last_success_at).filter((x): x is string => !!x).sort().pop() ?? null;
    return {
      pipelineOn: (toggles ? toggles.events_pipeline_enabled : true) !== false, tablesReady: true, enabledSources: enabled.length, lastSuccessAt: last,
      failingSources: enabled.filter((s) => (st.get(s.slug)?.consecutive_failures ?? 0) >= 3).length, upcoming30, draftsWaiting,
    };
  }, { pipelineOn: true, tablesReady: false, enabledSources: 0, lastSuccessAt: null, failingSources: 0, upcoming30: 0, draftsWaiting: 0 });

  const errors24h = await safe(() => count(sb.from('error_log').select('id', { count: 'exact', head: true }).eq('level', 'error').gte('created_at', iso(24 * H))), 0);

  return { now, cron, dailyTickAt: tickAt, queue, toggles, newsletter, social, billing, errors24h, events, mailConfigured: !!(process.env.RESEND_API_KEY && process.env.EMAIL_FROM) };
}

export interface HealthReport { at: string; checks: Check[]; toggles: ToggleRow[]; cron: CronRow[] | null }

export async function runChecks(sb: SupabaseClient, now: Date = new Date()): Promise<HealthReport> {
  const snap = await gatherSnapshot(sb, now);
  return { at: now.toISOString(), checks: evaluate(snap), toggles: toggleRows(snap), cron: snap.cron };
}

const site = () => (process.env.NEXT_PUBLIC_SITE_URL || 'https://cypruslifestyle.eu').replace(/\/+$/, '');

function alertHtml(kind: 'alert' | 'recovered', checks: Check[]): { subject: string; html: string } {
  if (kind === 'recovered') {
    return { subject: 'Cyprus Lifestyle: everything is running again', html: brandedEmail({ locale: 'en', heading: 'All clear', bodyHtml: '<p>The problems reported earlier are resolved; every check is green or informational.</p>', ctaLabel: 'Open System health', ctaUrl: `${site()}/admin/health` }) };
  }
  const reds = checks.filter((c) => c.level === 'red');
  const items = reds.map((c) => `<li style="margin:0 0 12px"><b>${escapeHtml(c.label)}</b> <span style="color:#8a8371">(${escapeHtml(c.area)})</span><br>${escapeHtml(c.detail)}${c.fix ? `<br><i>What to do:</i> ${escapeHtml(c.fix)}` : ''}</li>`).join('');
  return {
    subject: `Cyprus Lifestyle: ${reds.length} problem${reds.length > 1 ? 's' : ''} need attention`,
    html: brandedEmail({ locale: 'en', heading: `${reds.length} problem${reds.length > 1 ? 's' : ''} need attention`, bodyHtml: `<ul style="padding-inline-start:18px">${items}</ul>`, ctaLabel: 'Open System health', ctaUrl: `${site()}/admin/health` }),
  };
}

/** Run the checks if 30 minutes have passed (or `force`), and send an alert / all-clear e-mail when the situation changed. */
export async function watchdogIfDue(sb: SupabaseClient, opts: { force?: boolean; now?: Date } = {}): Promise<{ ran: boolean; sent?: 'alert' | 'recovered'; reds?: number }> {
  const now = opts.now ?? new Date();
  const { data: row } = await sb.from('site_settings').select('value').eq('key', STATE_KEY).maybeSingle();
  const st = ((row?.value && typeof row.value === 'object') ? row.value : {}) as { checkedAt?: string } & Partial<AlertState>;
  if (!opts.force && st.checkedAt && now.getTime() - Date.parse(st.checkedAt) < CHECK_EVERY_MS) return { ran: false };

  const report = await runChecks(sb, now);
  const decision = alertDecision(report.checks, st.hash !== undefined ? { hash: st.hash, sentAt: st.sentAt ?? null } : null, now);

  let sent: 'alert' | 'recovered' | undefined;
  const to = (process.env.OPS_ALERT_EMAIL || process.env.NEWSLETTER_APPROVER_EMAIL || '').trim();
  if (decision.send && decision.kind && to) {
    const m = alertHtml(decision.kind, report.checks);
    const r = await sendEmail({ to, subject: m.subject, html: m.html });
    if (r.ok) sent = decision.kind; else await logServerError('ops-watchdog', new Error(`alert e-mail not sent: ${r.error}`), {}, 'warn');
  }
  const next = { checkedAt: now.toISOString(), hash: decision.send && !sent && to ? st.hash ?? '' : decision.hash, sentAt: sent ? now.toISOString() : (decision.reds.length ? st.sentAt ?? null : null) };
  await sb.from('site_settings').upsert({ key: STATE_KEY, value: next, updated_at: now.toISOString() }, { onConflict: 'key' });
  return { ran: true, sent, reds: decision.reds.length };
}
