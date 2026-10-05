import { supabaseAdmin } from '@/lib/supabase/admin';
import { runChecks } from '@/lib/ops/watchdog';
import type { Level } from '@/lib/ops/checks';

export const dynamic = 'force-dynamic';

const COLOR: Record<Level, string> = { ok: '#2f7d4f', warn: '#b7791f', red: '#b42318', info: '#6b7280' };
const WORD: Record<Level, string> = { ok: 'OK', warn: 'Watch', red: 'Problem', info: 'Info' };
const when = (s: string | null) => (s ? new Date(s).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export default async function HealthTab() {
  const r = await runChecks(supabaseAdmin());
  const order: Level[] = ['red', 'warn', 'info', 'ok'];
  const checks = [...r.checks].sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
  const reds = checks.filter((c) => c.level === 'red').length;
  const warns = checks.filter((c) => c.level === 'warn').length;

  return (
    <>
      <h1>System health</h1>
      <p className="sub">
        {reds ? <b style={{ color: COLOR.red }}>{reds} problem{reds > 1 ? 's' : ''} need attention.</b> : <b style={{ color: COLOR.ok }}>Everything that matters is running.</b>}
        {warns ? ` ${warns} item${warns > 1 ? 's' : ''} to watch.` : ''} Checked {when(r.at)}. The same checks run every 30 minutes in the background and you get one e-mail when something turns red (and one when it recovers) — not one per check.
      </p>

      <table className="adm-t">
        <thead><tr><th style={{ width: 90 }}>Status</th><th style={{ width: 150 }}>Area</th><th>Check</th></tr></thead>
        <tbody>
          {checks.map((c) => (
            <tr key={c.key}>
              <td><b style={{ color: COLOR[c.level] }}>{WORD[c.level]}</b></td>
              <td>{c.area}</td>
              <td><b>{c.label}</b><br /><span style={{ opacity: 0.8 }}>{c.detail}</span>{c.fix && c.level !== 'ok' ? <><br /><i>What to do:</i> {c.fix}</> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 28 }}>Switches and the job behind each</h2>
      <p className="sub">A switch that is ON but has no working job behind it would silently do nothing — that is flagged here (and above).</p>
      <table className="adm-t">
        <thead><tr><th style={{ width: 90 }}>State</th><th>Switch</th><th>Runs through</th></tr></thead>
        <tbody>
          {r.toggles.map((t) => (
            <tr key={t.key}>
              <td><b style={{ color: t.state === 'ok' ? COLOR.ok : t.state === 'broken' ? COLOR.red : COLOR.info }}>{t.state === 'ok' ? 'Working' : t.state === 'broken' ? 'Not running' : t.on ? 'Waiting' : 'Off'}</b></td>
              <td>{t.label}</td>
              <td>{t.how}{t.fix ? <><br /><i>What to do:</i> {t.fix}</> : null}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 28 }}>Scheduled jobs (Supabase)</h2>
      {r.cron ? (
        <table className="adm-t">
          <thead><tr><th>Job</th><th>Schedule</th><th>Active</th><th>Last run</th><th>Result</th></tr></thead>
          <tbody>
            {r.cron.length === 0 ? <tr><td colSpan={5}>No jobs are scheduled. Run supabase/pg_cron/install-jobs.sql.</td></tr> : r.cron.map((j) => (
              <tr key={j.jobname}><td>{j.jobname}</td><td><code>{j.schedule}</code></td><td>{j.active ? 'yes' : 'no'}</td><td>{when(j.last_start)}</td><td>{j.last_status || '—'}{j.last_message ? ` — ${String(j.last_message).slice(0, 140)}` : ''}</td></tr>
            ))}
          </tbody>
        </table>
      ) : <p className="sub">The scheduler health function is not in the database yet. Run <code>supabase/migrations/20261005170000_ops_cron_health.sql</code> in the Supabase SQL editor.</p>}
    </>
  );
}
