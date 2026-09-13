'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function SponsorsTab() {
  const sb = supabaseBrowser();
  const [banners, setBanners] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [kit, setKit] = useState({ recipient_name: '', recipient_email: '', language: 'en' });
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [{ data: b }, { data: p }] = await Promise.all([
      sb.from('sponsor_banners').select('id, advertiser_name, slot, is_active, impressions, clicks').order('created_at', { ascending: false }),
      sb.from('ad_pricing').select('slot, label_en, format, weekly_eur, monthly_eur, yearly_eur').order('weekly_eur', { ascending: false }),
    ]);
    setBanners(b || []); setPricing(p || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function sendKit(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    const res = await fetch('/api/admin/sponsors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kit) });
    const d = await res.json();
    setMsg(d.ok ? 'Rate card sent.' : (d.error || 'Failed'));
    if (d.ok) setKit({ recipient_name: '', recipient_email: '', language: 'en' });
  }

  return (
    <>
      <h1>Sponsors · Publicitate</h1>
      <p className="sub">Live banners, the rate card, and a one-click media kit.</p>

      <h1 style={{ fontSize: 20 }}>Banners</h1>
      <table className="adm-t">
        <thead><tr><th>Advertiser</th><th>Slot</th><th>Active</th><th>Impressions</th><th>Clicks</th><th>CTR</th></tr></thead>
        <tbody>
          {banners.map((b) => (
            <tr key={b.id}><td>{b.advertiser_name}</td><td>{b.slot}</td>
              <td><span className={`pill ${b.is_active ? 'ok' : 'draft'}`}>{b.is_active ? 'yes' : 'no'}</span></td>
              <td>{b.impressions}</td><td>{b.clicks}</td>
              <td>{b.impressions ? ((b.clicks / b.impressions) * 100).toFixed(1) + '%' : '—'}</td></tr>
          ))}
          {banners.length === 0 ? <tr><td colSpan={6}>No banners yet.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 20, marginTop: 22 }}>Rate card (EUR)</h1>
      <table className="adm-t">
        <thead><tr><th>Placement</th><th>Format</th><th>Weekly</th><th>Monthly</th><th>Yearly</th></tr></thead>
        <tbody>
          {pricing.map((p) => (
            <tr key={p.slot}><td>{p.label_en}</td><td>{p.format}</td>
              <td>€{p.weekly_eur}</td><td>€{p.monthly_eur}</td><td>€{p.yearly_eur}</td></tr>
          ))}
        </tbody>
      </table>

      <h1 style={{ fontSize: 20, marginTop: 22 }}>Send media kit</h1>
      <form onSubmit={sendKit} style={{ maxWidth: 420 }}>
        <input placeholder="Recipient name" value={kit.recipient_name} onChange={(e) => setKit({ ...kit, recipient_name: e.target.value })} required />
        <input type="email" placeholder="Recipient email" value={kit.recipient_email} onChange={(e) => setKit({ ...kit, recipient_email: e.target.value })} required />
        <select value={kit.language} onChange={(e) => setKit({ ...kit, language: e.target.value })}><option>en</option><option>el</option><option>ro</option><option>ar</option></select>
        <button className="abtn gold" type="submit">Send rate card</button>
        {msg ? <p style={{ color: '#1c6b34' }}>{msg}</p> : null}
      </form>
    </>
  );
}
