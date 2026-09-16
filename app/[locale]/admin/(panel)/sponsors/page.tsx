'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Sponsors / Publicitate — the revenue cockpit.
//   1. Contact book (CRM): every prospect, with contact details, tier, pipeline
//      stage, and an outreach sequence you can start/stop per business.
//   2. Outreach engine: sending settings (the on-switch), preview / send, and
//      editable email templates. Sending stays OFF until you set a from-address
//      and switch it on — until then everything runs in preview.
//   3. Live banners, rate card, media kit.
// Reads crm_orgs / crm_contacts (0025+) and crm_settings / crm_enrollments /
// crm_templates (0027). Missing tables degrade to a friendly setup hint.

type Row = Record<string, any>;

const CRM_CATEGORIES = [
  ['all', 'All verticals'],
  ['law-relocation', 'Relocation & law'],
  ['car-rental-prestige', 'Prestige car rental'],
  ['beauty-spa', 'Beauty & spa'],
  ['luxury-retail', 'Luxury retail'],
  ['fine-dining', 'Fine dining'],
  ['luxury-realestate', 'Luxury real estate'],
  ['interior-design', 'Interior design & architecture'],
  ['yacht-marine', 'Yachting & marine'],
  ['art-culture', 'Art & galleries'],
  ['private-health', 'Private healthcare'],
  ['gourmet', 'Gourmet & fine wine'],
] as const;

const STAGES = ['prospect', 'contacted', 'engaged', 'proposal', 'won', 'live', 'lost', 'dormant'] as const;
const STAGE_PILL: Record<string, string> = {
  prospect: 'draft', contacted: 'info', engaged: 'info', proposal: 'warn',
  won: 'ok', live: 'ok', lost: 'no', dormant: 'draft',
};
const SEQ_PILL: Record<string, string> = {
  active: 'info', paused: 'draft', replied: 'ok', done: 'ok', unsubscribed: 'no', bounced: 'no',
};
const TIERS = ['A', 'B', 'C'] as const;
const catLabel = (c: string) => (CRM_CATEGORIES.find(([v]) => v === c)?.[1]) || c;

export default function SponsorsTab() {
  const sb = supabaseBrowser();

  // contact book
  const [orgs, setOrgs] = useState<Row[]>([]);
  const [crmError, setCrmError] = useState('');
  const [crmLoading, setCrmLoading] = useState(true);
  const [cat, setCat] = useState('all');
  const [tier, setTier] = useState('all');
  const [stage, setStage] = useState('all');
  const [search, setSearch] = useState('');

  // outreach
  const [settings, setSettings] = useState<Row | null>(null);
  const [outreachMissing, setOutreachMissing] = useState(false);
  const [enroll, setEnroll] = useState<Record<string, Row>>({}); // org_id -> enrollment
  const [templates, setTemplates] = useState<Row[]>([]);
  const [runResult, setRunResult] = useState<Row | null>(null);
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState('');

  // advertising (existing)
  const [banners, setBanners] = useState<Row[]>([]);
  const [pricing, setPricing] = useState<Row[]>([]);
  const [kit, setKit] = useState({ recipient_name: '', recipient_email: '', language: 'en' });

  const loadCrm = useCallback(async () => {
    setCrmLoading(true);
    const { data, error } = await sb
      .from('crm_orgs')
      .select('id, name, category, tier, district, website, email, phone, status, notes, source_url')
      .order('tier').order('name').limit(1000);
    setCrmLoading(false);
    if (error) { setCrmError(error.message); setOrgs([]); return; }
    setCrmError(''); setOrgs((data as Row[]) || []);
  }, [sb]);

  const loadOutreach = useCallback(async () => {
    const { data: s, error: se } = await sb.from('crm_settings').select('*').eq('id', 1).maybeSingle();
    if (se) { setOutreachMissing(true); return; }
    setOutreachMissing(false);
    setSettings(s as Row);
    const [{ data: en }, { data: tp }] = await Promise.all([
      sb.from('crm_enrollments').select('*'),
      sb.from('crm_templates').select('*').order('step'),
    ]);
    const map: Record<string, Row> = {};
    (en as Row[] | null)?.forEach((e) => { map[e.org_id] = e; });
    setEnroll(map);
    setTemplates((tp as Row[]) || []);
  }, [sb]);

  const loadAds = useCallback(async () => {
    const [{ data: b }, { data: p }] = await Promise.all([
      sb.from('sponsor_banners').select('id, advertiser_name, slot, is_active, impressions, clicks').order('created_at', { ascending: false }),
      sb.from('ad_pricing').select('slot, label_en, format, unit, price_from, price_to, kind, blurb_en, sort').order('sort'),
    ]);
    setBanners((b as Row[]) || []); setPricing((p as Row[]) || []);
  }, [sb]);

  async function sendKitTo(org: Row) {
    if (!org.email) { setMsg(`No email on file for ${org.name}.`); return; }
    setMsg(`Sending rate card to ${org.name}…`);
    const res = await fetch('/api/admin/sponsors', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient_name: org.name, recipient_email: org.email, language: 'en' }),
    });
    const d = await res.json();
    setMsg(d.ok ? `Rate card sent to ${org.name}.` : (d.error || 'Failed to send'));
  }

  useEffect(() => { loadCrm(); loadOutreach(); loadAds(); }, [loadCrm, loadOutreach, loadAds]);

  async function setField(id: string, patch: Row) {
    setOrgs((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)));
    const { error } = await sb.from('crm_orgs').update(patch).eq('id', id);
    if (error) { setMsg(error.message); loadCrm(); }
  }

  async function saveSettings(patch: Row) {
    setSettings((s) => ({ ...(s || {}), ...patch }));
    const { error } = await sb.from('crm_settings').update(patch).eq('id', 1);
    if (error) setMsg(error.message);
  }

  async function startSeq(orgId: string) {
    const { data, error } = await sb.from('crm_enrollments')
      .upsert({ org_id: orgId, status: 'active', step: 0, next_send_at: new Date().toISOString() }, { onConflict: 'org_id' })
      .select().maybeSingle();
    if (error) { setMsg(error.message); return; }
    if (data) setEnroll((m) => ({ ...m, [orgId]: data as Row }));
  }
  async function setSeqStatus(orgId: string, status: string) {
    const { data, error } = await sb.from('crm_enrollments').update({ status }).eq('org_id', orgId).select().maybeSingle();
    if (error) { setMsg(error.message); return; }
    if (data) setEnroll((m) => ({ ...m, [orgId]: data as Row }));
  }

  async function saveTemplate(id: string, patch: Row) {
    setTemplates((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    const { error } = await sb.from('crm_templates').update(patch).eq('id', id);
    if (error) setMsg(error.message);
  }

  async function runNow(commit: boolean) {
    setRunning(true); setRunResult(null); setMsg('');
    try {
      const res = await fetch('/api/admin/outreach/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ commit }),
      });
      const d = await res.json();
      if (!d.ok) setMsg(d.error || 'Run failed'); else setRunResult(d);
      if (commit) { loadOutreach(); }
    } catch (e) { setMsg((e as Error).message); }
    setRunning(false);
  }

  async function sendKit(e: React.FormEvent) {
    e.preventDefault(); setMsg('');
    const res = await fetch('/api/admin/sponsors', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kit) });
    const d = await res.json();
    setMsg(d.ok ? 'Rate card sent.' : (d.error || 'Failed'));
    if (d.ok) setKit({ recipient_name: '', recipient_email: '', language: 'en' });
  }

  const shown = orgs.filter((o) =>
    (cat === 'all' || o.category === cat) &&
    (tier === 'all' || o.tier === tier) &&
    (stage === 'all' || o.status === stage) &&
    (!search.trim() ||
      (o.name || '').toLowerCase().includes(search.toLowerCase()) ||
      (o.district || '').toLowerCase().includes(search.toLowerCase())));
  const count = (pred: (o: Row) => boolean) => orgs.filter(pred).length;
  const enrolledCount = Object.values(enroll).filter((e) => e.status === 'active').length;
  const sending = !!settings?.sending_enabled && !!settings?.from_email;

  const fmtEur = (n: number) => `€${Number(n).toLocaleString('en-IE')}`;
  const priceText = (p: Row) => {
    const from = p.price_from != null ? fmtEur(p.price_from) : '';
    const to = p.price_to != null ? `–${fmtEur(p.price_to)}` : '';
    return from ? `${p.slot === 'tier-partner' ? 'from ' : ''}${from}${to}` : '—';
  };
  const packages = pricing.filter((p) => p.kind === 'package');
  const alacarte = pricing.filter((p) => p.kind !== 'package');

  return (
    <>
      <h1>Sponsors · Publicitate</h1>
      <p className="sub">Your revenue cockpit — the advertiser contact book, an outreach engine that works the list for you, plus banners, the rate card and media kit.</p>

      {/* ─────────── OUTREACH ENGINE ─────────── */}
      {!outreachMissing && (
        <div style={{ background: sending ? '#eef7ee' : '#fff8ec', border: `1px solid ${sending ? '#bfe0bf' : '#e7d3a8'}`, borderRadius: 6, padding: '12px 16px', marginBottom: 14 }}>
          <strong>Outreach: {sending ? 'sending is ON' : 'preview mode — sending is OFF'}.</strong>{' '}
          <span style={{ fontSize: 14, color: '#6b6552' }}>
            {sending
              ? `Emails go from ${settings?.from_email}. ${enrolledCount} businesses in an active sequence.`
              : `Nothing is emailed yet. Set a from-address and switch sending on below when your domain is ready. ${enrolledCount} businesses queued.`}
          </span>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="abtn" type="button" disabled={running} onClick={() => runNow(false)}>{running ? 'Working…' : 'Run preview'}</button>
            <button className="abtn gold" type="button" disabled={running || !sending} title={sending ? '' : 'Turn sending on first'} onClick={() => runNow(true)}>Send due now</button>
          </div>
          {runResult && (
            <div style={{ marginTop: 10, fontSize: 13, background: '#fff', border: '1px solid #e3ddcf', borderRadius: 4, padding: 10 }}>
              <div style={{ marginBottom: 6 }}>
                <strong>{runResult.commit ? 'Sent' : 'Preview'}:</strong> processed {runResult.processed} · {runResult.commit ? `sent ${runResult.sent}` : `to send ${runResult.previewed}`} · skipped {runResult.skipped} · done {runResult.done}
                {runResult.note ? <span style={{ color: '#9a7b2a' }}> — {runResult.note}</span> : null}
              </div>
              {(runResult.preview as Row[] | undefined)?.slice(0, 12).map((p, i) => (
                <div key={i} style={{ color: '#6b6552', borderTop: '1px solid #f0ece0', padding: '3px 0' }}>
                  <span style={{ color: '#8a5b12' }}>step {p.step}</span> · {p.business} · <span style={{ color: '#8a8371' }}>{p.email}</span> — “{p.subject}”
                </div>
              ))}
            </div>
          )}

          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', color: '#8a5b12', fontSize: 13 }}>Sending settings</summary>
            <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
              <label className="toggle" style={{ flex: '0 0 auto' }}>
                <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={!!settings?.sending_enabled} onChange={(e) => saveSettings({ sending_enabled: e.target.checked })} /> Sending enabled
              </label>
              <div style={{ flex: '1 1 200px' }}><label className="fl">From name</label><input value={settings?.from_name || ''} onChange={(e) => setSettings((s) => ({ ...(s || {}), from_name: e.target.value }))} onBlur={(e) => saveSettings({ from_name: e.target.value })} placeholder="Cyprus Lifestyle — Partnerships" /></div>
              <div style={{ flex: '1 1 220px' }}><label className="fl">From email (set when domain is ready)</label><input value={settings?.from_email || ''} onChange={(e) => setSettings((s) => ({ ...(s || {}), from_email: e.target.value }))} onBlur={(e) => saveSettings({ from_email: e.target.value })} placeholder="partnerships@yourdomain.com" /></div>
              <div style={{ flex: '1 1 200px' }}><label className="fl">Reply-to</label><input value={settings?.reply_to || ''} onChange={(e) => setSettings((s) => ({ ...(s || {}), reply_to: e.target.value }))} onBlur={(e) => saveSettings({ reply_to: e.target.value })} placeholder="you@yourdomain.com" /></div>
              <div style={{ flex: '0 1 120px' }}><label className="fl">Daily cap</label><input type="number" value={settings?.daily_cap ?? 40} onChange={(e) => setSettings((s) => ({ ...(s || {}), daily_cap: Number(e.target.value) }))} onBlur={(e) => saveSettings({ daily_cap: Number(e.target.value) })} /></div>
            </div>
            <p style={{ fontSize: 12, color: '#8a8371', marginTop: 6 }}>Sending also needs RESEND_API_KEY on the server and a verified domain. Preview works without any of that.</p>
          </details>

          <details style={{ marginTop: 6 }}>
            <summary style={{ cursor: 'pointer', color: '#8a5b12', fontSize: 13 }}>Email templates ({templates.length})</summary>
            {templates.map((t) => (
              <div key={t.id} style={{ marginTop: 10, background: '#fff', border: '1px solid #e3ddcf', borderRadius: 4, padding: 10 }}>
                <div style={{ fontSize: 12, color: '#8a8371', marginBottom: 4 }}>Step {t.step} · {t.name}</div>
                <label className="fl">Subject</label>
                <input defaultValue={t.subject} onBlur={(e) => saveTemplate(t.id, { subject: e.target.value })} />
                <label className="fl" style={{ marginTop: 6 }}>Body (HTML · merge fields like {'{{first_name}}'}, {'{{business}}'}, {'{{hook}}'})</label>
                <textarea rows={6} defaultValue={t.body} onBlur={(e) => saveTemplate(t.id, { body: e.target.value })} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12 }} />
              </div>
            ))}
          </details>
        </div>
      )}

      {outreachMissing && (
        <div style={{ background: '#fff8ec', border: '1px solid #e7d3a8', borderRadius: 6, padding: '12px 16px', marginBottom: 14 }}>
          <strong>Outreach engine not enabled yet.</strong>{' '}
          <span style={{ fontSize: 14, color: '#6b6552' }}>Run <code>0027_outreach.sql</code> in the Supabase SQL editor (and make sure this build is deployed) to unlock enrolment, preview and sending here — the <em>Run preview</em> button lives in this banner once it’s on.</span>
        </div>
      )}

      {/* ─────────── CONTACT BOOK ─────────── */}
      <h1 style={{ fontSize: 20 }}>Contact book</h1>

      {crmError ? (
        <div style={{ background: '#fff8ec', border: '1px solid #e7d3a8', borderRadius: 6, padding: '14px 16px', marginBottom: 16 }}>
          <strong>The contact book isn’t set up yet.</strong>
          <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b6552' }}>
            Run <code>0026_lifestyle_prospects_all.sql</code> (and <code>0027_outreach.sql</code> for the engine) in the Supabase SQL editor. <span style={{ color: '#9a7b2a' }}>({crmError})</span>
          </p>
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
            {[
              ['Businesses', orgs.length],
              ['Tier A', count((o) => o.tier === 'A')],
              ['In sequence', enrolledCount],
              ['Won / live', count((o) => o.status === 'won' || o.status === 'live')],
            ].map(([label, n]) => (
              <div key={label as string} style={{ flex: '1 1 120px', background: '#fff', border: '1px solid #e3ddcf', borderRadius: 6, padding: '10px 14px' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#26221b' }}>{n as number}</div>
                <div style={{ fontSize: 12, color: '#8a8371', textTransform: 'uppercase', letterSpacing: '.04em' }}>{label as string}</div>
              </div>
            ))}
          </div>

          <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 12, alignItems: 'flex-end' }}>
            <div><label className="fl">Vertical</label>
              <select value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 190 }}>
                {CRM_CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}{v !== 'all' ? ` (${count((o) => o.category === v)})` : ''}</option>)}
              </select>
            </div>
            <div><label className="fl">Tier</label>
              <select value={tier} onChange={(e) => setTier(e.target.value)} style={{ width: 100 }}>
                <option value="all">All</option>{TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="fl">Stage</label>
              <select value={stage} onChange={(e) => setStage(e.target.value)} style={{ width: 130 }}>
                <option value="all">All stages</option>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: '1 1 180px' }}><label className="fl">Search</label>
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="name or district…" />
            </div>
          </div>

          <table className="adm-t">
            <thead><tr><th>Business</th><th>Vertical</th><th>Tier</th><th>Contact</th><th>Stage</th><th>Sequence</th></tr></thead>
            <tbody>
              {shown.map((o) => {
                const e = enroll[o.id];
                return (
                  <tr key={o.id}>
                    <td>
                      {o.website ? <a href={o.website} target="_blank" rel="noreferrer" style={{ color: '#8a5b12', fontWeight: 600 }}>{o.name}</a> : <strong>{o.name}</strong>}
                      {o.district ? <><br /><span style={{ color: '#8a8371', fontSize: 12 }}>{o.district}</span></> : null}
                    </td>
                    <td style={{ fontSize: 13 }}>{catLabel(o.category)}</td>
                    <td>
                      <select value={o.tier || 'C'} onChange={(ev) => setField(o.id, { tier: ev.target.value })} style={{ width: 54, padding: '3px 4px' }}>
                        {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {o.email ? <a href={`mailto:${o.email}`} style={{ color: '#8a5b12' }}>{o.email}</a> : <span style={{ color: '#b8b0a0' }}>no email</span>}
                      {o.email ? <><br /><button className="abtn ghost" style={{ fontSize: 11, padding: '1px 6px', marginTop: 2 }} onClick={() => sendKitTo(o)}>Send rate card</button></> : null}
                    </td>
                    <td>
                      <select value={o.status || 'prospect'} onChange={(ev) => setField(o.id, { status: ev.target.value })}
                        className={`pill ${STAGE_PILL[o.status] || 'draft'}`} style={{ border: 'none', cursor: 'pointer', padding: '4px 8px' }}>
                        {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ fontSize: 13 }}>
                      {outreachMissing ? <span style={{ color: '#b8b0a0' }}>—</span>
                        : !e ? <button className="abtn ghost" onClick={() => startSeq(o.id)} disabled={!o.email} title={o.email ? 'Enrol in the cadence' : 'No email on file'}>Start</button>
                        : (
                          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                            <span className={`pill ${SEQ_PILL[e.status] || 'draft'}`}>{e.status}{e.status === 'active' ? ` · ${e.step}/4` : ''}</span>
                            {e.status === 'active' ? <button className="abtn ghost" onClick={() => setSeqStatus(o.id, 'paused')}>Stop</button>
                              : e.status === 'paused' ? <button className="abtn ghost" onClick={() => setSeqStatus(o.id, 'active')}>Resume</button> : null}
                          </span>
                        )}
                    </td>
                  </tr>
                );
              })}
              {!crmLoading && shown.length === 0 ? <tr><td colSpan={6}>No businesses match these filters.</td></tr> : null}
              {crmLoading ? <tr><td colSpan={6}>Loading…</td></tr> : null}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: '#8a8371', marginTop: 6 }}>Showing {shown.length} of {orgs.length}. Tier, stage and sequence save instantly. {msg ? <span style={{ color: msg.includes('sent') || msg.includes('Saved') ? '#1c6b34' : '#9a2020' }}>· {msg}</span> : null}</p>
        </>
      )}

      {/* ─────────── BANNERS ─────────── */}
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

      {/* ─────────── RATE CARD ─────────── */}
      <h1 style={{ fontSize: 20, marginTop: 22 }}>Rate card</h1>
      {packages.length > 0 && (
        <div className="row" style={{ gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          {packages.map((p) => (
            <div key={p.slot} style={{ flex: '1 1 220px', background: '#fff', border: `1px solid ${p.slot === 'tier-featured' ? '#C9A24C' : '#e3ddcf'}`, borderRadius: 6, padding: 14 }}>
              <div style={{ fontWeight: 700, color: '#26221b', fontSize: 16 }}>{p.label_en}{p.slot === 'tier-featured' ? <span style={{ fontSize: 11, color: '#8a5b12' }}> · most popular</span> : null}</div>
              <div style={{ fontSize: 22, color: '#8a5b12', fontWeight: 700, margin: '4px 0' }}>{priceText(p)} <span style={{ fontSize: 12, color: '#8a8371', fontWeight: 400 }}>{p.unit}</span></div>
              <div style={{ fontSize: 13, color: '#6b6552', lineHeight: 1.5 }}>{p.blurb_en}</div>
            </div>
          ))}
        </div>
      )}
      <table className="adm-t">
        <thead><tr><th>Placement</th><th>Format</th><th>Price</th><th>Basis</th></tr></thead>
        <tbody>
          {alacarte.map((p) => (
            <tr key={p.slot}><td>{p.label_en}</td><td style={{ fontSize: 13 }}>{p.format}</td>
              <td style={{ fontWeight: 600 }}>{priceText(p)}</td><td style={{ fontSize: 13, color: '#8a8371' }}>{p.unit}</td></tr>
          ))}
          {pricing.length === 0 ? <tr><td colSpan={4}>No rate card yet — run 0028_ratecard.sql.</td></tr> : null}
        </tbody>
      </table>

      {/* ─────────── MEDIA KIT ─────────── */}
      <h1 style={{ fontSize: 20, marginTop: 22 }}>Send media kit</h1>
      <form onSubmit={sendKit} style={{ maxWidth: 420 }}>
        <input placeholder="Recipient name" value={kit.recipient_name} onChange={(e) => setKit({ ...kit, recipient_name: e.target.value })} required />
        <input type="email" placeholder="Recipient email" value={kit.recipient_email} onChange={(e) => setKit({ ...kit, recipient_email: e.target.value })} required />
        <select value={kit.language} onChange={(e) => setKit({ ...kit, language: e.target.value })}><option>en</option><option>el</option><option>ro</option><option>ar</option></select>
        <button className="abtn gold" type="submit">Send rate card</button>
      </form>
    </>
  );
}
