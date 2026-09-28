'use client';
import { useCallback, useEffect, useState } from 'react';
import { departments as editorialDepartments } from '@/lib/editorial/taxonomy';

// Banner Editor — admins create / edit / activate sponsor banners and map section
// sponsors, all from the UI (no manual SQL). Talks to the session-gated admin route
// (/api/admin/banners); the service role does the writes server-side.
type Row = Record<string, any>;

const LANGS: [string, string][] = [
  ['en', 'English'], ['el', 'Ελληνικά'], ['ro', 'Română'], ['ar', 'العربية'],
  ['de', 'Deutsch'], ['pl', 'Polski'], ['ru', 'Русский'],
];
const SLOTS: [string, string][] = [
  ['sidebar-homepage', 'Homepage sidebar'],
  ['in-article', 'In-article'],
  ['section-sponsorship', 'Section sponsorship'],
];
// The public section keys a category page renders (mirrors [category]/page.tsx CATS).
const SECTION_KEYS = [
  ...editorialDepartments().map((d) => d.key), 'cyprus', 'relocation', 'world',
].filter((c) => c !== 'agenda');

const BLANK: Row = {
  advertiser_name: '', contact_email: '', slot: 'sidebar-homepage', weight: 1,
  url: '', image_url: '', bg_color: '#0B0E11', accent_color: '#C9A24C',
  start_date: '', end_date: '', is_active: false,
};
const SS_BLANK: Row = { section_key: SECTION_KEYS[0], sponsor_name: '', sponsor_logo: '', sponsor_url: '', is_active: true };

const dateVal = (v: any) => (v ? String(v).slice(0, 10) : '');

export default function BannerEditor() {
  const [banners, setBanners] = useState<Row[]>([]);
  const [sponsors, setSponsors] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [lang, setLang] = useState('en');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [ss, setSs] = useState<Row>(SS_BLANK);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/admin/banners', { credentials: 'same-origin' });
      const d = await r.json();
      if (!d.ok) { setMsg(d.error || 'Failed to load'); return; }
      setBanners(d.banners || []);
      setSponsors(d.sectionSponsors || []);
    } catch (e) { setMsg((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function newBanner() { setEditing({ ...BLANK }); setLang('en'); setMsg(''); }
  function edit(b: Row) { setEditing({ ...b, start_date: dateVal(b.start_date), end_date: dateVal(b.end_date) }); setLang('en'); setMsg(''); }
  const set = (name: string, value: any) => setEditing((e) => (e ? { ...e, [name]: value } : e));

  async function save() {
    if (!editing) return;
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/banners', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      const d = await r.json();
      if (!d.ok) { setMsg(d.error || 'Save failed'); setBusy(false); return; }
      setMsg('Saved.');
      await load();
      if (d.banner) setEditing({ ...d.banner, start_date: dateVal(d.banner.start_date), end_date: dateVal(d.banner.end_date) });
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  // Flip is_active straight from the list (persists immediately).
  async function toggleActive(b: Row) {
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/banners', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...b, start_date: dateVal(b.start_date), end_date: dateVal(b.end_date), is_active: !b.is_active }),
      });
      const d = await r.json();
      if (!d.ok) setMsg(d.error || 'Failed'); else await load();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  async function remove(id: string) {
    if (!window.confirm('Delete this banner? This cannot be undone.')) return;
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/banners', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', id }),
      });
      const d = await r.json();
      if (!d.ok) { setMsg(d.error || 'Delete failed'); setBusy(false); return; }
      if (editing?.id === id) setEditing(null);
      await load();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  async function saveSponsor(e: React.FormEvent) {
    e.preventDefault();
    if (!ss.section_key) { setMsg('Pick a section.'); return; }
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/banners', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'section-sponsor', ...ss }),
      });
      const d = await r.json();
      if (!d.ok) { setMsg(d.error || 'Save failed'); setBusy(false); return; }
      setMsg('Section sponsor saved.'); setSs(SS_BLANK); await load();
    } catch (e2) { setMsg((e2 as Error).message); }
    setBusy(false);
  }

  async function removeSponsor(id: string) {
    if (!window.confirm('Remove this section sponsor?')) return;
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/admin/banners', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: 'section-sponsor', action: 'delete', id }),
      });
      const d = await r.json();
      if (!d.ok) setMsg(d.error || 'Failed'); else await load();
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  const ctr = (b: Row) => (b.impressions ? ((b.clicks / b.impressions) * 100).toFixed(1) + '%' : '—');
  const half: React.CSSProperties = { flex: '1 1 200px' };

  return (
    <>
      <h2 style={{ marginTop: 30, fontSize: 18 }}>Banners</h2>
      <p className="sub" style={{ marginBottom: 12 }}>Create, edit and activate sponsor banners across all seven languages.</p>

      <table className="adm-t">
        <thead><tr><th>Advertiser</th><th>Slot</th><th>Weight</th><th>Active</th><th>Impr.</th><th>Clicks</th><th>CTR</th><th></th></tr></thead>
        <tbody>
          {banners.map((b) => (
            <tr key={b.id}>
              <td><strong>{b.advertiser_name || '—'}</strong>{b.headline_en ? <><br /><span style={{ color: '#8a8371', fontSize: 12 }}>{b.headline_en}</span></> : null}</td>
              <td style={{ fontSize: 13 }}>{b.slot}</td>
              <td>{b.weight}</td>
              <td><span className={`pill ${b.is_active ? 'ok' : 'draft'}`}>{b.is_active ? 'yes' : 'no'}</span></td>
              <td>{b.impressions ?? 0}</td>
              <td>{b.clicks ?? 0}</td>
              <td>{ctr(b)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="abtn ghost" onClick={() => edit(b)}>Edit</button>
                <button className="abtn ghost" disabled={busy} onClick={() => toggleActive(b)}>{b.is_active ? 'Deactivate' : 'Activate'}</button>
                <button className="abtn ghost" disabled={busy} onClick={() => remove(b.id)} style={{ color: '#9a2020', borderColor: '#e0b4b4' }}>Delete</button>
              </td>
            </tr>
          ))}
          {banners.length === 0 ? <tr><td colSpan={8}>No banners yet.</td></tr> : null}
        </tbody>
      </table>

      <div className="row" style={{ marginTop: 12, gap: 10 }}>
        <button className="abtn gold" onClick={newBanner}>＋ New banner</button>
        {msg ? <span style={{ fontSize: 13, color: msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? '#9a2020' : '#1c6b34' }}>{msg}</span> : null}
      </div>

      {editing ? (
        <div style={{ background: '#fff', border: '1px solid #e3ddcf', borderRadius: 6, padding: 16, marginTop: 14 }}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>{editing.id ? 'Edit banner' : 'New banner'}</h3>
            <button className="abtn ghost" onClick={() => setEditing(null)}>Close</button>
          </div>

          <div className="row" style={{ alignItems: 'flex-start', marginTop: 12 }}>
            <div style={half}><label className="fl">Advertiser name</label><input value={editing.advertiser_name || ''} onChange={(e) => set('advertiser_name', e.target.value)} /></div>
            <div style={half}><label className="fl">Contact email</label><input value={editing.contact_email || ''} onChange={(e) => set('contact_email', e.target.value)} /></div>
          </div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={half}><label className="fl">Slot</label>
              <select value={editing.slot || 'sidebar-homepage'} onChange={(e) => set('slot', e.target.value)}>
                {SLOTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div style={{ flex: '0 1 120px' }}><label className="fl">Weight</label><input type="number" value={editing.weight ?? 1} onChange={(e) => set('weight', Number(e.target.value))} /></div>
            <label className="toggle" style={{ flex: '0 0 auto', marginTop: 18 }}>
              <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={!!editing.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Active
            </label>
          </div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={half}><label className="fl">Click-through URL</label><input value={editing.url || ''} onChange={(e) => set('url', e.target.value)} placeholder="https://…" /></div>
            <div style={half}><label className="fl">Image URL</label><input value={editing.image_url || ''} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" /></div>
          </div>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: '1 1 140px' }}><label className="fl">Background</label><input value={editing.bg_color || ''} onChange={(e) => set('bg_color', e.target.value)} placeholder="#0B0E11" /></div>
            <div style={{ flex: '1 1 140px' }}><label className="fl">Accent</label><input value={editing.accent_color || ''} onChange={(e) => set('accent_color', e.target.value)} placeholder="#C9A24C" /></div>
            <div style={{ flex: '1 1 140px' }}><label className="fl">Start date</label><input type="date" value={dateVal(editing.start_date)} onChange={(e) => set('start_date', e.target.value)} /></div>
            <div style={{ flex: '1 1 140px' }}><label className="fl">End date</label><input type="date" value={dateVal(editing.end_date)} onChange={(e) => set('end_date', e.target.value)} /></div>
          </div>

          <label className="fl" style={{ marginTop: 8 }}>Copy (per language)</label>
          <div className="row" style={{ gap: 6, margin: '4px 0 10px', flexWrap: 'wrap' }}>
            {LANGS.map(([code, lbl]) => (
              <button key={code} type="button" onClick={() => setLang(code)}
                style={{ padding: '5px 11px', borderRadius: 999, cursor: 'pointer', fontSize: 13, width: 'auto', marginBottom: 0,
                  border: `1px solid ${lang === code ? '#C9A24C' : '#cfc7b3'}`,
                  background: lang === code ? 'rgba(201,162,76,.15)' : 'transparent', color: 'inherit' }}>{lbl}</button>
            ))}
          </div>
          <div dir={lang === 'ar' ? 'rtl' : 'ltr'}>
            <label className="fl">Headline ({lang})</label>
            <input value={editing[`headline_${lang}`] || ''} onChange={(e) => set(`headline_${lang}`, e.target.value)} />
            <label className="fl">Body ({lang})</label>
            <textarea rows={2} value={editing[`body_${lang}`] || ''} onChange={(e) => set(`body_${lang}`, e.target.value)} />
            <label className="fl">Call to action ({lang})</label>
            <input value={editing[`cta_${lang}`] || ''} onChange={(e) => set(`cta_${lang}`, e.target.value)} placeholder="Discover →" />
          </div>

          {editing.id ? (
            <p style={{ fontSize: 12, color: '#8a8371', margin: '2px 0 10px' }}>
              Impressions <strong>{editing.impressions ?? 0}</strong> · Clicks <strong>{editing.clicks ?? 0}</strong> · CTR {ctr(editing)}
            </p>
          ) : null}

          <div className="row" style={{ gap: 8 }}>
            <button className="abtn gold" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save banner'}</button>
            {editing.id ? <button className="abtn ghost" disabled={busy} onClick={() => remove(editing.id)} style={{ color: '#9a2020', borderColor: '#e0b4b4' }}>Delete</button> : null}
          </div>
        </div>
      ) : null}

      {/* ─────────── SECTION SPONSORS ─────────── */}
      <h2 style={{ marginTop: 34, fontSize: 18 }}>Section sponsors</h2>
      <p className="sub" style={{ marginBottom: 12 }}>Map a “Presented by …” lockup onto a public section page.</p>

      <table className="adm-t">
        <thead><tr><th>Section</th><th>Sponsor</th><th>Link</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {sponsors.map((s) => (
            <tr key={s.id}>
              <td style={{ fontSize: 13 }}>{s.section_key}</td>
              <td><strong>{s.sponsor_name || '—'}</strong></td>
              <td>{s.sponsor_url ? <a href={s.sponsor_url} target="_blank" rel="noreferrer noopener">↗</a> : '—'}</td>
              <td><span className={`pill ${s.is_active ? 'ok' : 'draft'}`}>{s.is_active ? 'yes' : 'no'}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="abtn ghost" onClick={() => setSs({ section_key: s.section_key, sponsor_name: s.sponsor_name || '', sponsor_logo: s.sponsor_logo || '', sponsor_url: s.sponsor_url || '', is_active: !!s.is_active })}>Edit</button>
                <button className="abtn ghost" disabled={busy} onClick={() => removeSponsor(s.id)} style={{ color: '#9a2020', borderColor: '#e0b4b4' }}>Remove</button>
              </td>
            </tr>
          ))}
          {sponsors.length === 0 ? <tr><td colSpan={5}>No section sponsors yet.</td></tr> : null}
        </tbody>
      </table>

      <form onSubmit={saveSponsor} style={{ background: '#fff', border: '1px solid #e3ddcf', borderRadius: 6, padding: 16, marginTop: 14, maxWidth: 640 }}>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 180px' }}><label className="fl">Section</label>
            <select value={ss.section_key} onChange={(e) => setSs({ ...ss, section_key: e.target.value })}>
              {SECTION_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 200px' }}><label className="fl">Sponsor name</label><input value={ss.sponsor_name} onChange={(e) => setSs({ ...ss, sponsor_name: e.target.value })} /></div>
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 200px' }}><label className="fl">Logo URL (optional)</label><input value={ss.sponsor_logo} onChange={(e) => setSs({ ...ss, sponsor_logo: e.target.value })} placeholder="https://…" /></div>
          <div style={{ flex: '1 1 200px' }}><label className="fl">Sponsor URL</label><input value={ss.sponsor_url} onChange={(e) => setSs({ ...ss, sponsor_url: e.target.value })} placeholder="https://…" /></div>
        </div>
        <div className="row" style={{ gap: 12 }}>
          <label className="toggle" style={{ flex: '0 0 auto' }}>
            <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={!!ss.is_active} onChange={(e) => setSs({ ...ss, is_active: e.target.checked })} /> Active
          </label>
          <button className="abtn gold" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Save section sponsor'}</button>
        </div>
      </form>
    </>
  );
}
