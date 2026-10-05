'use client';
import { useCallback, useEffect, useState } from 'react';
import { isComp, membersCsv, type MemberRow, type MemberStats } from '@/lib/membersAdmin';

const d = (s: string | null) => (s ? new Date(s).toLocaleDateString('en-GB') : '—');

export default function MembersTab() {
  const [rows, setRows] = useState<MemberRow[]>([]);
  const [stats, setStats] = useState<MemberStats | null>(null);
  const [price, setPrice] = useState(19);
  const [interval, setIntervalName] = useState<'month' | 'year'>('month');
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/members').then((x) => x.json()).catch(() => null);
    if (!r?.ok) { setErr(r?.error || 'Could not load members.'); return; }
    setRows(r.rows); setStats(r.stats); setPrice(r.price); setIntervalName(r.interval);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function act(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(''); setErr('');
    const r = await fetch('/api/admin/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setErr(r?.error || 'Failed.'); return; }
    setMsg(done); await load();
  }

  function exportCsv() {
    const blob = new Blob([membersCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `members-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(a.href);
  }

  const shown = rows.filter((r) => filter === 'all' || r.status === 'active');

  return (
    <>
      <h1>Members · Concierge</h1>
      <p className="sub">Everyone with a Concierge membership: paying members (managed in Stripe) and complimentary ones you grant here. Granting needs only the e-mail address — the person opens <b>/membership</b> and uses “Email me a link” to switch the membership on in their browser.</p>

      {stats ? (
        <div className="cards">
          <div className="stat"><div className="n">{stats.activePaid}</div><div className="k">Paying members</div></div>
          <div className="stat"><div className="n">{stats.activeComp}</div><div className="k">Complimentary</div></div>
          <div className="stat"><div className="n">€{stats.mrrGross.toFixed(2)}</div><div className="k">Monthly revenue (gross, incl. VAT)</div></div>
          <div className="stat"><div className="n">{stats.cancelling}</div><div className="k">Cancelling at period end</div></div>
          <div className="stat"><div className="n">{stats.new30d}</div><div className="k">New · 30 days</div></div>
        </div>
      ) : null}
      {stats ? <p className="sub" style={{ marginTop: -12 }}>Price: €{price} per {interval} (VAT included). Revenue is gross; the VAT inside it is reported by Stripe Tax.</p> : null}

      <h1 style={{ fontSize: 18 }}>Grant a complimentary membership</h1>
      <div className="row" style={{ marginBottom: 8 }}>
        <input type="email" placeholder="member@example.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ flex: '1 1 240px' }} />
        <input placeholder="Why? (e.g. partner, press, gift)" value={note} onChange={(e) => setNote(e.target.value)} style={{ flex: '1 1 240px' }} />
        <button className="abtn gold" disabled={busy || !email} onClick={() => act({ action: 'grant', email, note }, `Membership granted to ${email}.`).then(() => { setEmail(''); setNote(''); })}>Grant</button>
      </div>
      {msg ? <p style={{ color: '#1c6b34' }}>{msg}</p> : null}
      {err ? <p style={{ color: '#9a2020' }}>⚠ {err}</p> : null}

      <div className="row" style={{ margin: '18px 0 10px' }}>
        {(['active', 'all'] as const).map((f) => <button key={f} className={`abtn ${filter === f ? 'gold' : 'ghost'}`} onClick={() => setFilter(f)}>{f}</button>)}
        <button className="abtn ghost" onClick={exportCsv} disabled={!rows.length}>Export CSV</button>
      </div>
      <table className="adm-t">
        <thead><tr><th>E-mail</th><th>Type</th><th>Status</th><th>Since</th><th>Renews / ends</th><th></th></tr></thead>
        <tbody>
          {shown.map((m) => (
            <tr key={m.id}>
              <td>{m.email || '—'}{m.profile?.comp?.note ? <div style={{ fontSize: 11.5, opacity: .6 }}>{m.profile.comp.note}</div> : null}</td>
              <td>{isComp(m) ? 'Complimentary' : 'Paid'}</td>
              <td><span className={`pill ${m.status === 'active' ? 'ok' : 'failed'}`}>{m.status}</span>{m.cancel_at_period_end ? <span className="pill warn" style={{ marginInlineStart: 6 }}>cancels</span> : null}</td>
              <td>{d(m.created_at)}</td>
              <td>{d(m.current_period_end)}</td>
              <td>
                {isComp(m)
                  ? (m.status === 'active'
                    ? <button className="abtn ghost" disabled={busy} onClick={() => confirm(`End the complimentary membership of ${m.email}?`) && act({ action: 'revoke', id: m.id }, 'Membership ended.')}>End</button>
                    : <button className="abtn ghost" disabled={busy} onClick={() => act({ action: 'reinstate', id: m.id }, 'Membership reinstated.')}>Reinstate</button>)
                  : m.stripe_subscription_id ? <a className="abtn ghost" href={`https://dashboard.stripe.com/subscriptions/${m.stripe_subscription_id}`} target="_blank" rel="noreferrer">Stripe ↗</a> : null}
              </td>
            </tr>
          ))}
          {shown.length === 0 ? <tr><td colSpan={6}>No members yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
