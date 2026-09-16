'use client';
import { Fragment, useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// CRM console — the accounts hub. Every business (directory + prospects + inbound)
// is one account here. Server-side search / filter / pagination so it stays fast at
// thousands of records; inline tier + stage editing; each account expands to its
// activity timeline and deals.
type Row = Record<string, any>;
const STAGES = ['prospect', 'contacted', 'engaged', 'proposal', 'won', 'live', 'lost', 'dormant'];
const TIERS = ['A', 'B', 'C'];
const PAGE = 50;
const eur = (n: number | null) => (n == null ? '' : `€${Number(n).toLocaleString('en-IE')}`);

export default function CrmConsole() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [tier, setTier] = useState('all');
  const [stage, setStage] = useState('all');
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [timeline, setTimeline] = useState<Row[]>([]);
  const [deals, setDeals] = useState<Row[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    let query = sb.from('crm_orgs').select('id, name, category, tier, district, website, status, directory_listing_id, email', { count: 'exact' });
    if (q.trim()) query = query.ilike('name', `%${q.trim()}%`);
    if (tier !== 'all') query = query.eq('tier', tier);
    if (stage !== 'all') query = query.eq('status', stage);
    const { data, count, error } = await query.order('name').range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) setMsg(error.message); else setMsg('');
    setRows((data as Row[]) || []);
    setTotal(count || 0);
    setLoading(false);
  }, [sb, q, tier, stage, page]);
  useEffect(() => { load(); }, [load]);

  const loadStats = useCallback(async () => {
    const mk = async (st?: string) => {
      let query = sb.from('crm_orgs').select('id', { count: 'exact', head: true });
      if (st) query = query.eq('status', st);
      const { count } = await query; return count || 0;
    };
    const [tot, contacted, won, live] = await Promise.all([mk(), mk('contacted'), mk('won'), mk('live')]);
    setStats({ total: tot, contacted, won, live });
  }, [sb]);
  useEffect(() => { loadStats(); }, [loadStats]);

  async function setField(id: string, field: string, value: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    const { error } = await sb.from('crm_orgs').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) setMsg(error.message);
  }

  async function toggleExpand(id: string) {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    setTimeline([]); setDeals([]);
    const [{ data: acts }, { data: dl }] = await Promise.all([
      sb.from('crm_activities').select('type, subject, body, created_at').eq('org_id', id).order('created_at', { ascending: false }).limit(20),
      sb.from('crm_deals').select('stage, product, value_eur, created_at').eq('org_id', id).order('created_at', { ascending: false }).limit(10),
    ]);
    setTimeline((acts as Row[]) || []);
    setDeals((dl as Row[]) || []);
  }

  function applySearch() { setPage(0); setQ(qInput); }
  function resetPageThen(fn: () => void) { setPage(0); fn(); }
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const sel: React.CSSProperties = { padding: '4px 6px', fontSize: 13 };

  return (
    <>
      <h1>CRM</h1>
      <p className="sub">Every business is an account here — directory, prospects and inbound. Edit tier and stage inline; open a row for its timeline.</p>

      <div className="cards">
        <div className="stat"><div className="n">{stats.total ?? '—'}</div><div className="k">accounts</div></div>
        <div className="stat"><div className="n">{stats.contacted ?? '—'}</div><div className="k">contacted</div></div>
        <div className="stat"><div className="n">{stats.won ?? '—'}</div><div className="k">won</div></div>
        <div className="stat"><div className="n">{stats.live ?? '—'}</div><div className="k">live</div></div>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center', margin: '14px 0' }}>
        <input placeholder="Search accounts by name…" value={qInput}
          onChange={(e) => setQInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') applySearch(); }}
          style={{ flex: '2 1 260px', padding: '8px 10px' }} />
        <button className="abtn gold" onClick={applySearch}>Search</button>
        <select value={tier} onChange={(e) => resetPageThen(() => setTier(e.target.value))} style={sel}>
          <option value="all">All tiers</option>{TIERS.map((t) => <option key={t} value={t}>Tier {t}</option>)}
        </select>
        <select value={stage} onChange={(e) => resetPageThen(() => setStage(e.target.value))} style={sel}>
          <option value="all">All stages</option>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span style={{ fontSize: 13, color: '#8a8371' }}>{loading ? 'loading…' : `${total.toLocaleString()} accounts`}</span>
        {msg ? <span style={{ fontSize: 13, color: '#9a2020' }}>{msg}</span> : null}
      </div>

      <table className="adm-t">
        <thead><tr><th></th><th>Account</th><th>Tier</th><th>Stage</th><th>Web</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <Fragment key={r.id}>
              <tr>
                <td style={{ width: 24 }}><button className="abtn ghost" style={{ padding: '2px 7px' }} onClick={() => toggleExpand(r.id)}>{expanded === r.id ? '▾' : '▸'}</button></td>
                <td>
                  <strong>{r.name}</strong>
                  {r.directory_listing_id ? <span className="pill info" style={{ marginLeft: 6 }}>directory</span> : null}
                  <br /><span style={{ color: '#8a8371', fontSize: 12 }}>{[r.category, r.district].filter(Boolean).join(' · ') || '—'}</span>
                </td>
                <td><select value={r.tier || 'C'} onChange={(e) => setField(r.id, 'tier', e.target.value)} style={sel}>{TIERS.map((t) => <option key={t} value={t}>{t}</option>)}</select></td>
                <td><select value={r.status || 'prospect'} onChange={(e) => setField(r.id, 'status', e.target.value)} style={sel}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                <td>{r.website ? <a href={r.website} target="_blank" rel="noreferrer noopener">↗</a> : '—'}</td>
                <td>{r.email || ''}</td>
              </tr>
              {expanded === r.id ? (
                <tr>
                  <td></td>
                  <td colSpan={5} style={{ background: '#faf7f0' }}>
                    {deals.length ? (
                      <div style={{ marginBottom: 8 }}>
                        <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8a8371' }}>Deals</strong>
                        {deals.map((d, i) => <div key={i} style={{ fontSize: 13 }}>{d.stage}{d.product ? ` · ${d.product}` : ''}{d.value_eur ? ` · ${eur(d.value_eur)}` : ''}</div>)}
                      </div>
                    ) : null}
                    <strong style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '.06em', color: '#8a8371' }}>Timeline</strong>
                    {timeline.length ? timeline.map((a, i) => (
                      <div key={i} style={{ fontSize: 13, padding: '3px 0', borderBottom: '1px solid #efe9dc' }}>
                        <span style={{ color: '#8a8371' }}>{new Date(a.created_at).toLocaleDateString()} · {a.type}</span>{a.subject ? ` — ${a.subject}` : ''}
                        {a.body ? <div style={{ color: '#5b5647', whiteSpace: 'pre-wrap' }}>{a.body}</div> : null}
                      </div>
                    )) : <div style={{ fontSize: 13, color: '#8a8371' }}>No activity yet.</div>}
                  </td>
                </tr>
              ) : null}
            </Fragment>
          ))}
          {rows.length === 0 && !loading ? <tr><td colSpan={6}>No accounts match.</td></tr> : null}
        </tbody>
      </table>

      <div className="row" style={{ gap: 10, alignItems: 'center', marginTop: 12 }}>
        <button className="abtn ghost" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</button>
        <span style={{ fontSize: 13, color: '#8a8371' }}>Page {page + 1} of {pages}</span>
        <button className="abtn ghost" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
      </div>
    </>
  );
}
