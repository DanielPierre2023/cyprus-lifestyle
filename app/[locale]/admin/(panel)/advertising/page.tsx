'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

type Row = Record<string, any>;
const eur = (n: number | null) => (n == null ? '—' : `€${Number(n).toLocaleString('en-IE')}`);
const LEAD_STATUS = ['new', 'contacted', 'won', 'lost'];

export default function AdvertisingTab() {
  const sb = supabaseBrowser();
  const [orders, setOrders] = useState<Row[]>([]);
  const [leads, setLeads] = useState<Row[]>([]);

  const load = useCallback(async () => {
    const [{ data: o }, { data: l }] = await Promise.all([
      sb.from('ad_orders').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('ad_leads').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    setOrders(o || []);
    setLeads(l || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function setLeadStatus(id: string, status: string) {
    setLeads((rows) => rows.map((r) => (r.id === id ? { ...r, status } : r)));
    await sb.from('ad_leads').update({ status }).eq('id', id);
  }

  const confirmedRevenue = orders.filter((o) => ['active', 'paid'].includes(o.status)).reduce((s, o) => s + Number(o.amount || 0), 0);
  const newLeads = leads.filter((l) => l.status === 'new').length;
  const activeOrders = orders.filter((o) => ['active', 'paid'].includes(o.status)).length;

  return (
    <>
      <h1>Advertising</h1>
      <p className="sub">Self-serve purchases and inbound enquiries from the Advertise page.</p>

      <div className="cards">
        <div className="stat"><div className="n">{newLeads}</div><div className="k">new enquiries</div></div>
        <div className="stat"><div className="n">{activeOrders}</div><div className="k">active orders</div></div>
        <div className="stat"><div className="n">{eur(confirmedRevenue)}</div><div className="k">confirmed value</div></div>
      </div>

      <h2 style={{ marginTop: 26, fontSize: 18 }}>Enquiries</h2>
      <table className="adm-t">
        <thead><tr><th>When</th><th>Who</th><th>Interest</th><th>Message</th><th>Status</th></tr></thead>
        <tbody>
          {leads.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.created_at).toLocaleDateString()}</td>
              <td><strong>{r.name}</strong>{r.company ? <><br /><span style={{ color: '#8a8371', fontSize: 12 }}>{r.company}</span></> : null}<br /><a href={`mailto:${r.email}`} style={{ fontSize: 12 }}>{r.email}</a></td>
              <td>{r.label || r.slot || '—'}</td>
              <td style={{ maxWidth: 280, fontSize: 13, color: '#5b5647' }}>{r.message || '—'}</td>
              <td>
                <select value={r.status} onChange={(e) => setLeadStatus(r.id, e.target.value)}>
                  {LEAD_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
            </tr>
          ))}
          {leads.length === 0 ? <tr><td colSpan={5}>No enquiries yet.</td></tr> : null}
        </tbody>
      </table>

      <h2 style={{ marginTop: 30, fontSize: 18 }}>Orders</h2>
      <table className="adm-t">
        <thead><tr><th>When</th><th>Item</th><th>Customer</th><th>Amount</th><th>Type</th><th>Status</th></tr></thead>
        <tbody>
          {orders.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.created_at).toLocaleDateString()}</td>
              <td>{r.label || r.slot || '—'}</td>
              <td>{r.customer_email || '—'}{r.company ? <><br /><span style={{ color: '#8a8371', fontSize: 12 }}>{r.company}</span></> : null}</td>
              <td>{eur(r.amount)}{r.mode === 'subscription' ? <span style={{ color: '#8a8371', fontSize: 12 }}> /rec</span> : null}</td>
              <td>{r.mode || '—'}</td>
              <td><span className={`pill ${['active', 'paid'].includes(r.status) ? 'confirmed' : r.status === 'pending' ? 'pending' : 'no'}`}>{r.status}</span></td>
            </tr>
          ))}
          {orders.length === 0 ? <tr><td colSpan={6}>No orders yet. Self-serve orders appear here once Stripe is live.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
