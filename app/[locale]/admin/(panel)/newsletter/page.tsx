'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { isoWeekId, UNSUB_PLACEHOLDER } from '@/lib/newsletterPlan';

type Campaign = {
  id: string; subject: string; content: string | null; status: string; target_language: string; edition_week: string | null;
  recipient_count: number | null; failed_count: number | null; created_at: string; sent_at: string | null; approved_at: string | null;
};

const EDITIONS = ['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'];
const PILL: Record<string, string> = { draft: 'draft', approved: 'info', sending: 'info', sent: 'ok', cancelled: 'failed' };

export default function NewsletterTab() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Campaign[]>([]);
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [preview, setPreview] = useState<Campaign | null>(null);
  const [subs, setSubs] = useState<Record<string, number>>({});
  const week = isoWeekId(new Date());

  const load = useCallback(async () => {
    const { data } = await sb.from('newsletter_campaigns')
      .select('id, subject, content, status, target_language, edition_week, recipient_count, failed_count, created_at, sent_at, approved_at')
      .order('created_at', { ascending: false }).limit(60);
    setRows((data as Campaign[]) || []);
    const { data: s } = await sb.from('newsletter_subscribers').select('language').eq('confirmed', true).eq('is_active', true);
    const by: Record<string, number> = {};
    for (const r of (s as { language: string }[] | null) || []) by[r.language] = (by[r.language] || 0) + 1;
    setSubs(by);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function call(body: Record<string, unknown>, key: string) {
    setBusy(key); setMsg(''); setErr('');
    const r = await fetch('/api/admin/newsletter', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => null);
    setBusy('');
    if (!r?.ok) { setErr(r?.error || 'Failed.'); return null; }
    await load();
    return r;
  }

  async function prepare(regenerate: boolean) {
    const r = await call({ action: regenerate ? 'regenerate' : 'prepare' }, 'prepare');
    if (!r) return;
    const skipped = Object.entries(r.skipped as Record<string, string>).map(([l, why]) => `${l}: ${why}`);
    setMsg(`Week ${r.week}: ${r.created.length} draft(s) created, ${r.refreshed.length} refreshed.${skipped.length ? ` Skipped — ${skipped.join('; ')}.` : ''}`);
  }
  async function test(c: Campaign) {
    const r = await call({ action: 'test', id: c.id }, `t${c.id}`);
    if (r) setMsg(`Test of the ${c.target_language.toUpperCase()} edition sent to ${r.to}.`);
  }
  async function approve(c: Campaign) {
    const n = subs[c.target_language] || 0;
    if (!confirm(`Send the ${c.target_language.toUpperCase()} edition to ${n} confirmed subscriber(s) now?\n\nThis cannot be undone.`)) return;
    const r = await call({ action: 'approve', id: c.id }, `a${c.id}`);
    if (r) setMsg(`Approved. ${r.sent ?? 0} sent so far${r.failed ? `, ${r.failed} failed` : ''}${r.note ? ` — ${r.note}` : ''}. Large lists finish automatically within minutes.`);
  }
  async function cancel(c: Campaign) {
    if (!confirm(`Discard the ${c.target_language.toUpperCase()} edition?`)) return;
    await call({ action: 'cancel', id: c.id }, `c${c.id}`);
  }

  const thisWeek = rows.filter((r) => r.edition_week === week);
  const waiting = thisWeek.filter((r) => r.status === 'draft').length;
  const older = rows.filter((r) => r.edition_week !== week);

  return (
    <>
      <h1>Newsletter · The Dispatch</h1>
      <p className="sub">
        Goes out <b>every Friday</b>. Drafts for all seven editions are prepared automatically on Friday morning (about 09:00 Cyprus time) — <b>nothing is sent until you approve each edition</b>.
        Preview it, send yourself a test, then press “Approve &amp; send”. Every e-mail carries a personal unsubscribe link.
      </p>

      <div className="row" style={{ marginBottom: 8 }}>
        <button className="abtn gold" disabled={!!busy} onClick={() => prepare(false)}>{busy === 'prepare' ? 'Working…' : `Prepare this week’s drafts (${week})`}</button>
        <button className="abtn ghost" disabled={!!busy || waiting === 0} onClick={() => prepare(true)} title="Rebuild the unsent drafts from the latest articles">Refresh drafts</button>
      </div>
      {waiting > 0 ? <p style={{ color: '#8a5b12' }}>⏳ {waiting} edition(s) waiting for your approval.</p> : null}
      {msg ? <p style={{ color: '#1c6b34' }}>{msg}</p> : null}
      {err ? <p style={{ color: '#9a2020' }}>⚠ {err}</p> : null}

      <h1 style={{ fontSize: 18 }}>This week · {week}</h1>
      <table className="adm-t">
        <thead><tr><th>Edition</th><th>Status</th><th>Readers</th><th>Articles</th><th></th></tr></thead>
        <tbody>
          {EDITIONS.map((l) => {
            const c = thisWeek.find((r) => r.target_language === l);
            return (
              <tr key={l}>
                <td><b>{l.toUpperCase()}</b></td>
                <td>{c ? <span className={`pill ${PILL[c.status] || 'draft'}`}>{c.status}</span> : <span style={{ opacity: .55 }}>no draft</span>}</td>
                <td>{c?.status === 'sent' ? `${c.recipient_count ?? 0} sent${c.failed_count ? ` · ${c.failed_count} failed` : ''}` : `${subs[l] || 0} confirmed`}</td>
                <td style={{ maxWidth: 360, fontSize: 12.5 }}>{c ? c.subject : ''}</td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  {c ? <button className="abtn ghost" onClick={() => setPreview(c)}>Preview</button> : null}
                  {c && (c.status === 'draft') ? (
                    <>
                      <button className="abtn ghost" disabled={!!busy} onClick={() => test(c)}>{busy === `t${c.id}` ? '…' : 'Send me a test'}</button>
                      <button className="abtn gold" disabled={!!busy || !(subs[l] > 0)} onClick={() => approve(c)}>{busy === `a${c.id}` ? 'Sending…' : 'Approve & send'}</button>
                      <button className="abtn ghost" disabled={!!busy} onClick={() => cancel(c)}>Discard</button>
                    </>
                  ) : null}
                  {c && (c.status === 'approved' || c.status === 'sending') ? <span style={{ fontSize: 12.5, opacity: .7 }}>delivering… <button className="abtn ghost" onClick={() => cancel(c)}>Stop</button></span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {preview ? (
        <div style={{ margin: '18px 0', border: '1px solid #e3ddcf', background: '#fff', borderRadius: 4 }}>
          <div className="row" style={{ padding: '8px 12px', borderBottom: '1px solid #e3ddcf', justifyContent: 'space-between' }}>
            <b>{preview.subject}</b>
            <button className="abtn ghost" onClick={() => setPreview(null)}>Close preview</button>
          </div>
          <iframe title="Newsletter preview" sandbox="" style={{ width: '100%', height: 680, border: 0 }} srcDoc={(preview.content || '').split(UNSUB_PLACEHOLDER).join('#')} />
        </div>
      ) : null}

      <h1 style={{ fontSize: 18, marginTop: 28 }}>History</h1>
      <table className="adm-t">
        <thead><tr><th>Week</th><th>Edition</th><th>Subject</th><th>Status</th><th>Sent</th><th>Failed</th><th>Date</th></tr></thead>
        <tbody>
          {older.map((r) => (
            <tr key={r.id}>
              <td>{r.edition_week || '—'}</td><td>{r.target_language}</td><td>{r.subject}</td>
              <td><span className={`pill ${PILL[r.status] || 'draft'}`}>{r.status}</span></td>
              <td>{r.recipient_count ?? 0}</td><td>{r.failed_count || '—'}</td>
              <td>{r.sent_at ? new Date(r.sent_at).toLocaleString('en-GB') : new Date(r.created_at).toLocaleDateString('en-GB')}</td>
            </tr>
          ))}
          {older.length === 0 ? <tr><td colSpan={7}>No earlier campaigns yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
