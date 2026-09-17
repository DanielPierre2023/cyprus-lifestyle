'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Fulfilment queue — every paid order raises a task here automatically (via the
// fulfil_ad_order() provisioning function called from the Stripe webhook). This
// is the single screen that answers "what must we build for this sale?".

type Step = { label: string; done: boolean };
type Row = Record<string, any>;

const STATUSES = ['open', 'in_progress', 'done', 'blocked'] as const;
const STATUS_PILL: Record<string, string> = { open: 'warn', in_progress: 'info', done: 'ok', blocked: 'no' };
const SLOT_LABEL: Record<string, string> = {
  'tier-listed': 'Listed', 'premium-listing': 'Premium listing', 'tier-featured': 'Featured',
  'sidebar-leaderboard': 'Homepage banner', 'section-sponsorship': 'Section sponsorship',
  'sponsored-feature': 'Sponsored feature', 'newsletter-sole': 'Newsletter sponsor',
  'directory-exclusive': 'Category exclusive', 'agenda-event': 'Agenda event', 'tier-partner': 'Partner',
};

export default function FulfilmentTab() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [filter, setFilter] = useState<'active' | 'all' | 'done'>('active');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let q = sb.from('fulfillment_tasks')
      .select('id, ad_order_id, product_slot, title, steps, status, due_at, notes, org:crm_orgs(name)')
      .order('due_at', { ascending: true, nullsFirst: false });
    if (filter === 'active') q = q.in('status', ['open', 'in_progress', 'blocked']);
    if (filter === 'done') q = q.eq('status', 'done');
    const { data, error } = await q.limit(500);
    setLoading(false);
    if (error) { setErr(error.message); setRows([]); return; }
    setErr(''); setRows((data as Row[]) || []);
  }, [sb, filter]);

  useEffect(() => { load(); }, [load]);

  async function toggleStep(task: Row, idx: number) {
    const steps: Step[] = Array.isArray(task.steps) ? task.steps.map((s: Step) => ({ ...s })) : [];
    if (!steps[idx]) return;
    steps[idx].done = !steps[idx].done;
    const allDone = steps.length > 0 && steps.every((s) => s.done);
    const nextStatus = allDone ? 'done' : (task.status === 'open' ? 'in_progress' : task.status);
    setRows((prev) => prev.map((r) => (r.id === task.id ? { ...r, steps, status: nextStatus } : r)));
    const { error } = await sb.from('fulfillment_tasks').update({ steps, status: nextStatus }).eq('id', task.id);
    if (error) { setMsg(error.message); load(); }
  }

  async function setStatus(id: string, status: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    const { error } = await sb.from('fulfillment_tasks').update({ status }).eq('id', id);
    if (error) { setMsg(error.message); load(); }
  }

  const openCount = rows.filter((r) => r.status !== 'done').length;
  const fmtDue = (d: string | null) => {
    if (!d) return '';
    const due = new Date(d); const now = new Date();
    const days = Math.round((due.getTime() - now.getTime()) / 86400000);
    const s = due.toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
    return days < 0 ? `${s} · overdue` : days === 0 ? `${s} · today` : `${s} · in ${days}d`;
  };

  return (
    <>
      <h1>Fulfilment</h1>
      <p className="sub">Every paid order lands here automatically with a checklist. Tick the steps as you deliver; a task closes itself when every step is done. Provisioning (listing flags, draft banner, draft article, newsletter slot) is already applied — this tracks the human work that remains.</p>

      {err ? (
        <div style={{ background: '#fff8ec', border: '1px solid #e7d3a8', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
          <strong>The fulfilment queue isn’t set up yet.</strong>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b6552' }}>Run <code>0038_fulfilment.sql</code> in the Supabase SQL editor. <span style={{ color: '#9a7b2a' }}>({err})</span></p>
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 8, margin: '0 0 14px', alignItems: 'center' }}>
            {(['active', 'all', 'done'] as const).map((f) => (
              <button key={f} className={`abtn ${filter === f ? 'gold' : 'ghost'}`} onClick={() => setFilter(f)}>
                {f === 'active' ? 'Active' : f === 'done' ? 'Done' : 'All'}
              </button>
            ))}
            <span style={{ fontSize: 13, color: '#8a8371', marginLeft: 6 }}>{openCount} open{msg ? <span style={{ color: '#9a2020' }}> · {msg}</span> : null}</span>
          </div>

          {rows.map((t) => {
            const steps: Step[] = Array.isArray(t.steps) ? t.steps : [];
            const done = steps.filter((s) => s.done).length;
            return (
              <div key={t.id} style={{ background: '#fff', border: '1px solid #e3ddcf', borderRadius: 8, padding: '14px 16px', marginBottom: 12 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#26221b' }}>{t.title}</div>
                    <div style={{ fontSize: 12, color: '#8a8371', marginTop: 2 }}>
                      {SLOT_LABEL[t.product_slot] || t.product_slot}
                      {t.org?.name ? ` · ${t.org.name}` : ''}
                      {t.due_at ? ` · ${fmtDue(t.due_at)}` : ''}
                    </div>
                  </div>
                  <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}
                    className={`pill ${STATUS_PILL[t.status] || 'draft'}`} style={{ border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                  </select>
                </div>
                <div style={{ marginTop: 10 }}>
                  {steps.map((s, i) => (
                    <label key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0', cursor: 'pointer', fontSize: 14, color: s.done ? '#8a8371' : '#26221b' }}>
                      <input type="checkbox" checked={!!s.done} onChange={() => toggleStep(t, i)} style={{ width: 'auto', margin: '3px 0 0' }} />
                      <span style={{ textDecoration: s.done ? 'line-through' : 'none' }}>{s.label}</span>
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 11, color: '#b8b0a0', marginTop: 6 }}>{done}/{steps.length} done</div>
              </div>
            );
          })}
          {!loading && rows.length === 0 ? <p style={{ color: '#8a8371' }}>Nothing here yet — paid orders will appear automatically.</p> : null}
          {loading ? <p style={{ color: '#8a8371' }}>Loading…</p> : null}
        </>
      )}
    </>
  );
}
