'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Sponsors / Publicitate — the revenue cockpit.
//   1. Contact book (CRM): every prospective advertiser & feature subject, with
//      public contact details, tier, district and a movable pipeline stage.
//   2. Live banners + performance.
//   3. Rate card + one-click media kit.
// The contact book reads crm_orgs / crm_contacts (migration 0023 + seed 0025).
// If those tables aren't there yet, it shows a friendly setup hint instead of
// crashing.

type Org = Record<string, any>;

const CRM_CATEGORIES = [
  ['all', 'All verticals'],
  ['law-relocation', 'Relocation & law'],
  ['car-rental-prestige', 'Prestige car rental'],
  ['beauty-spa', 'Beauty & spa'],
  ['luxury-retail', 'Luxury retail'],
  ['fine-dining', 'Fine dining'],
] as const;

// Sales pipeline, in order. Colours map to the .pill classes in globals.css.
const STAGES = ['prospect', 'contacted', 'engaged', 'proposal', 'won', 'live', 'lost', 'dormant'] as const;
const STAGE_PILL: Record<string, string> = {
  prospect: 'draft', contacted: 'info', engaged: 'info', proposal: 'warn',
  won: 'ok', live: 'ok', lost: 'no', dormant: 'draft',
};
const TIERS = ['A', 'B', 'C'] as const;
const catLabel = (c: string) => (CRM_CATEGORIES.find(([v]) => v === c)?.[1]) || c;

export default function SponsorsTab() {
  const sb = supabaseBrowser();

  // ── contact book (CRM) ──
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [crmError, setCrmError] = useState('');
  const [crmLoading, setCrmLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [tier, setTier] = useState('all');
  const [stage, setStage] = useState('all');
  const [search, setSearch] = useState('');

  // ── advertising (existing) ──
  const [banners, setBanners] = useState<any[]>([]);
  const [pricing, setPricing] = useState<any[]>([]);
  const [kit, setKit] = useState({ recipient_name: '', recipient_email: '', language: 'en' });
  const [msg, setMsg] = useState('');

  const loadCrm = useCallback(async () => {
    setCrmLoading(true);
    // Curated contact book stays well under the 1000-row API window; fetch and
    // filter in memory for snappy tier/stage switching.
    const { data, error } = await sb
      .from('crm_orgs')
      .select('id, name, category, tier, district, website, email, phone, status, notes, source_url')
      .order('tier').order('name')
      .limit(1000);
    setCrmLoading(false);
    if (error) { setCrmError(error.message); setOrgs([]); return; }
    setCrmError(''); setOrgs((data as Org[]) || []);
  }, [sb]);

  const loadAds = useCallback(async () => {
    const [{ data: b }, { data: p }] = await Promise.all([
      sb.from('sponsor_banners').select('id, advertiser_name, slot, is_active, impressions, clicks').order('created_at', { ascending: false }),
      sb.from('ad_pricing').select('slot, label_en, format, weekly_eur, monthly_eur, yearly_eur').order('weekly_eur', { ascending: false }),
    ]);
    setBanners(b || []); setPricing(p || []);
  }, [sb]);

  useEffect(() => { loadCrm(); loadAds(); }, [loadCrm, loadAds]);

  async function setField(id: string, patch: Org) {
    setOrgs((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o))); // optimistic
    const { error } = await sb.from('crm_orgs').update(patch).eq('id', id);
    if (error) { setMsg(error.message); loadCrm(); }
  }

  async function sendKit(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    const res = await fetch('/api/admin/sponsors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kit) });
    const d = await res.json();
    setMsg(d.ok ? 'Rate card sent.' : (d.error || 'Failed'));
    if (d.ok) setKit({ recipient_name: '', recipient_email: '', language: 'en' });
  }

  // derived
  const shown = orgs.filter((o) =>
    (cat === 'all' || o.category === cat) &&
    (tier === 'all' || o.tier === tier) &&
    (stage === 'all' || o.status === stage) &&
    (!search.trim() ||
      (o.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.district || '').toLowerCase().includes(search.toLowerCase())));
  const count = (pred: (o: Org) => boolean) => orgs.filter(pred).length;
  const won = count((o) => o.status === 'won' || o.status === 'live');

  return (
    <>
      <h1>Sponsors · Publicitate</h1>
      <p className="sub">The revenue cockpit — your advertiser & feature contact book, live banners, the rate card and a one-click media kit.</p>

      {/* ─────────────── CONTACT BOOK ─────────────── */}
      <h1 style={{ fontSize: 20 }}>Contact book</h1>

      {crmError ? (
        <div style={{ background: '#fff8ec', border: '1px solid #e7d3a8', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
          <strong>The contact book isn’t set up yet.</strong>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b6552' }}>
            Run <code>0023_crm.sql</code> then <code>0025_lifestyle_prospects.sql</code> in the Supabase SQL editor to create
            and fill the contact book. It will appear here automatically. <span style={{ color: '#9a7b2a' }}>({crmError})</span>
          </p>
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              ['Businesses', orgs.length],
              ['Tier A', count((o) => o.tier === 'A')],
              ['Prospects', count((o) => o.status === 'prospect')],
              ['In progress', count((o) => ['contacted', 'engaged', 'proposal'].includes(o.status))],
              ['Won / live', won],
            ].map(([label, n]) => (
              <div key={label as string} style={{ flex: '1 1 120px', background: '#fff', border: '1px solid #e3ddcf', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#26221b' }}>{n as number}</div>
                <div style={{ fontSize: 12, color: '#8a8371', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label as string}</div>
              </div>
            ))}
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
            <div>
              <label className="fl">Vertical</label>
              <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 190 }}>
                {CRM_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}{v !== 'all' ? ` (${count((o) => o.category === v)})` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Tier</label>
              <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ width: 110 }}>
                <option value="all">All</option>{TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="fl">Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ width: 140 }}>
                <option value="all">All stages</option>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label className="fl">Search</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name or district…" />
            </div>
          </div>

          <table className="adm-t">
            <thead><tr><th>Business</th><th>Vertical</th><th>Tier</th><th>District</th><th>Contact</th><th>Stage</th></tr></thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id}>
                  <td>
                    {o.website ? <a href={o.website} target="_blank" rel="noreferrer" style={{ color: '#8a5b12', fontWeight: 600 }}>{o.name}</a> : <strong>{o.name}</strong>}
                    {o.notes ? <><br /><span style={{ color: '#8a8371', fontSize: 12 }}>{o.notes}</span></> : null}
                  </td>
                  <td style={{ fontSize: 13 }}>{catLabel(o.category)}</td>
                  <td>
                    <select value={o.tier || 'C'} onChange={(e) => setField(o.id, { tier: e.target.value })} style={{ width: 56, padding: '3px 4px' }}>
                      {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>
                  <td style={{ fontSize: 13 }}>{o.district || '—'}</td>
                  <td style={{ fontSize: 13 }}>
                    {o.email ? <a href={`mailto:${o.email}`} style={{ color: '#8a5b12' }}>{o.email}</a> : <span style={{ color: '#b8b0a0' }}>no email</span>}
                    {o.phone ? <><br /><span style={{ color: '#6b6552' }}>{o.phone}</span></> : null}
                  </td>
                  <td>
                    <select value={o.status || 'prospect'} onChange={(e) => setField(o.id, { status: e.target.value })}
                      className={`pill ${STAGE_PILL[o.status] || 'draft'}`} style={{ border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
              {!crmLoading && shown.length === 0 ? <tr><td colSpan={6}>No businesses match these filters.</td></tr> : null}
              {crmLoading ? <tr><td colSpan={6}>Loading…</td></tr> : null}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: '#8a8371', marginTop: 6 }}>
            Showing {shown.length} of {orgs.length}. Change a tier or stage inline — it saves instantly.
          </p>
        </>
      )}

      {/* ─────────────── BANNERS ─────────────── */}
      <h1 style={{ fontSize: 20, marginTop: 26 }}>Banners</h1>
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

      {/* ─────────────── RATE CARD ─────────────── */}
      <h1 style={{ fontSize: 20, marginTop: 22 }}>Rate card (EUR)</h1>
      <table className="adm-t">
        <thead><tr><th>Placement</th><th>Format</th><th>Weekly</th><th>Monthly</th><th>Yearly</th></tr></thead>
        <tbody>
          {pricing.map((p) => (
            <tr key={p.slot}><td>{p.label_en}</td><td>{p.format}</td>
              <td>€{p.weekly_eur}</td><td>€{p.monthly_eur}</td><td>€{p.yearly_eur}</td></tr>
          ))}
          {pricing.length === 0 ? <tr><td colSpan={5}>No rate card yet.</td></tr> : null}
        </tbody>
      </table>

      {/* ─────────────── MEDIA KIT ─────────────── */}
      <h1 style={{ fontSize: 20, marginTop: 22 }}>Send media kit</h1>
      <form onSubmit={sendKit} style={{ maxWidth: 420 }}>
        <input placeholder="Recipient name" value={kit.recipient_name} onChange={(e) => setKit({ ...kit, recipient_name: e.target.value })} required />
        <input type="email" placeholder="Recipient email" value={kit.recipient_email} onChange={(e) => setKit({ ...kit, recipient_email: e.target.value })} required />
        <select value={kit.language} onChange={(e) => setKit({ ...kit, language: e.target.value })}><option>en</option><option>el</option><option>ro</option><option>ar</option></select>
        <button className="abtn gold" type="submit">Send rate card</button>
        {msg ? <p style={{ color: msg.includes('sent') ? '#1c6b34' : '#9a2020' }}>{msg}</p> : null}
      </form>
    </>
  );
}
