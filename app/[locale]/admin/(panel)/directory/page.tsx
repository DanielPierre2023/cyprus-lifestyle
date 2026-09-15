'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Directory CRUD — manage restaurants, wineries, developments, hotels, beaches
// and vendors without touching SQL. Writes are authorised by the admin's JWT
// against the "directory admin write" RLS policy (has_role admin).

const TYPES = ['restaurant', 'winery', 'development', 'hotel', 'beach', 'vendor'] as const;
const DISTRICTS = ['', 'nicosia', 'limassol', 'larnaca', 'famagusta', 'paphos', 'kyrenia'];
const PRICE_BANDS = ['', '€', '€€', '€€€', '€€€€'];
const LANGS = ['en', 'el', 'ro', 'ar'] as const;

type Row = Record<string, any>;

const BLANK: Row = {
  id: null, slug: '', type: 'restaurant', district: '',
  name_en: '', name_el: '', name_ro: '', name_ar: '',
  summary_en: '', summary_el: '', summary_ro: '', summary_ar: '',
  address: '', lat: '', lng: '', price_band: '', url: '', phone: '', image: '',
  tags: '', featured: false, status: 'published',
};

// Turn "a, b, c" into a Postgres text[] and vice-versa.
const parseTags = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean);
const num = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}

export default function DirectoryAdmin() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>(BLANK);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    const { data, error } = await sb.from('directory_listings').select('*').order('type').order('name_en');
    if (error) setMsg(error.message);
    setRows((data as Row[]) || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  function edit(r: Row) {
    setForm({ ...BLANK, ...r, tags: Array.isArray(r.tags) ? r.tags.join(', ') : '' });
    setMsg('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function reset() { setForm(BLANK); setMsg(''); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const slug = (form.slug || slugify(form.name_en)).trim();
    if (!slug || !form.name_en) { setBusy(false); setMsg('Slug and English name are required.'); return; }
    const payload: Row = {
      slug, type: form.type, district: form.district || null,
      name_en: form.name_en || null, name_el: form.name_el || null, name_ro: form.name_ro || null, name_ar: form.name_ar || null,
      summary_en: form.summary_en || null, summary_el: form.summary_el || null, summary_ro: form.summary_ro || null, summary_ar: form.summary_ar || null,
      address: form.address || null, lat: num(form.lat), lng: num(form.lng),
      price_band: form.price_band || null, url: form.url || null, phone: form.phone || null, image: form.image || null,
      tags: parseTags(form.tags || ''), featured: !!form.featured, status: form.status || 'published',
    };
    const res = form.id
      ? await sb.from('directory_listings').update(payload).eq('id', form.id)
      : await sb.from('directory_listings').insert(payload);
    setBusy(false);
    if (res.error) { setMsg(res.error.message); return; }
    setMsg(form.id ? 'Saved.' : 'Added.'); reset(); load();
  }

  async function remove(r: Row) {
    if (!confirm(`Delete “${r.name_en || r.slug}” permanently? This cannot be undone.`)) return;
    const { error } = await sb.from('directory_listings').delete().eq('id', r.id);
    if (error) { setMsg(error.message); return; }
    if (form.id === r.id) reset();
    load();
  }
  async function toggle(r: Row, field: 'featured' | 'status') {
    const patch = field === 'featured' ? { featured: !r.featured } : { status: r.status === 'published' ? 'draft' : 'published' };
    await sb.from('directory_listings').update(patch).eq('id', r.id); load();
  }

  const shown = filter === 'all' ? rows : rows.filter((r) => r.type === filter);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <>
      <h1>Directory · listings</h1>
      <p className="sub">{rows.length} listings. Add or edit restaurants, wineries, developments, hotels, beaches and services. Coordinates power the map on each directory page.</p>

      <form onSubmit={save} style={{ background: '#fff', border: '1px solid #e3ddcf', borderRadius: 4, padding: 18, marginBottom: 22 }}>
        <h1 style={{ fontSize: 18 }}>{form.id ? 'Edit listing' : 'New listing'}</h1>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '2 1 240px' }}>
            <label className="fl">English name *</label>
            <input value={form.name_en} onChange={(e) => set('name_en', e.target.value)} placeholder="Tsiakkas Winery" />
          </div>
          <div style={{ flex: '2 1 200px' }}>
            <label className="fl">Slug {form.id ? '' : '(auto from name if blank)'}</label>
            <input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="tsiakkas-winery" />
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label className="fl">Type</label>
            <select value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ flex: '1 1 140px' }}>
            <label className="fl">District</label>
            <select value={form.district} onChange={(e) => set('district', e.target.value)}>
              {DISTRICTS.map((d) => <option key={d} value={d}>{d || '—'}</option>)}
            </select>
          </div>
        </div>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          {LANGS.map((l) => (
            <div key={l} style={{ flex: '1 1 220px' }}>
              <label className="fl">Summary ({l.toUpperCase()})</label>
              <textarea rows={2} value={form[`summary_${l}`]} onChange={(e) => set(`summary_${l}`, e.target.value)}
                placeholder={l === 'en' ? 'One or two sentences.' : 'Optional — falls back to English.'} />
            </div>
          ))}
        </div>
        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', color: '#8a5b12', fontSize: 13 }}>Localised names (EL / RO / AR) — optional</summary>
          <div className="row" style={{ marginTop: 8, alignItems: 'flex-start' }}>
            {(['el', 'ro', 'ar'] as const).map((l) => (
              <div key={l} style={{ flex: '1 1 200px' }}>
                <label className="fl">Name ({l.toUpperCase()})</label>
                <input value={form[`name_${l}`]} onChange={(e) => set(`name_${l}`, e.target.value)} />
              </div>
            ))}
          </div>
        </details>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '2 1 220px' }}><label className="fl">Address</label><input value={form.address} onChange={(e) => set('address', e.target.value)} /></div>
          <div style={{ flex: '1 1 110px' }}><label className="fl">Lat</label><input value={form.lat} onChange={(e) => set('lat', e.target.value)} placeholder="34.900" inputMode="decimal" /></div>
          <div style={{ flex: '1 1 110px' }}><label className="fl">Lng</label><input value={form.lng} onChange={(e) => set('lng', e.target.value)} placeholder="32.985" inputMode="decimal" /></div>
          <div style={{ flex: '1 1 110px' }}>
            <label className="fl">Price band</label>
            <select value={form.price_band} onChange={(e) => set('price_band', e.target.value)}>
              {PRICE_BANDS.map((p) => <option key={p} value={p}>{p || '—'}</option>)}
            </select>
          </div>
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '2 1 220px' }}><label className="fl">Website URL</label><input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" /></div>
          <div style={{ flex: '1 1 160px' }}><label className="fl">Phone</label><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></div>
          <div style={{ flex: '2 1 220px' }}><label className="fl">Image URL</label><input value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="https://… (optional)" /></div>
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '3 1 260px' }}><label className="fl">Tags (comma-separated)</label><input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="wine, troodos, pelendri" /></div>
          <div style={{ flex: '1 1 140px' }}>
            <label className="fl">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="published">published</option><option value="draft">draft</option></select>
          </div>
          <label className="toggle" style={{ flex: '0 0 auto', marginTop: 22 }}>
            <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={!!form.featured} onChange={(e) => set('featured', e.target.checked)} /> Featured
          </label>
        </div>

        <div className="row">
          <button className="abtn gold" type="submit" disabled={busy}>{busy ? 'Saving…' : form.id ? 'Save changes' : 'Add listing'}</button>
          {form.id ? <button className="abtn ghost" type="button" onClick={reset}>Cancel / New</button> : null}
          {msg ? <span style={{ color: msg === 'Saved.' || msg === 'Added.' ? '#1c6b34' : '#9a2020', fontSize: 13 }}>{msg}</span> : null}
        </div>
      </form>

      <div className="row" style={{ marginBottom: 12 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 180 }}>
          <option value="all">All types ({rows.length})</option>
          {TYPES.map((t) => <option key={t} value={t}>{t} ({rows.filter((r) => r.type === t).length})</option>)}
        </select>
      </div>

      <table className="adm-t">
        <thead><tr><th>Name</th><th>Type</th><th>District</th><th>Coords</th><th>Status</th><th>Featured</th><th></th></tr></thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id} style={{ opacity: r.status === 'published' ? 1 : 0.55 }}>
              <td>{r.name_en || r.slug}<br /><span style={{ color: '#8a8371', fontSize: 12 }}>{r.slug}</span></td>
              <td>{r.type}</td>
              <td>{r.district || '—'}</td>
              <td>{typeof r.lat === 'number' && typeof r.lng === 'number' ? `${r.lat.toFixed(3)}, ${r.lng.toFixed(3)}` : <span className="pill draft">no map</span>}</td>
              <td><button className={`pill ${r.status === 'published' ? 'ok' : 'draft'}`} style={{ cursor: 'pointer', border: 'none' }} title="Toggle published/draft" onClick={() => toggle(r, 'status')}>{r.status}</button></td>
              <td><button className="abtn ghost" onClick={() => toggle(r, 'featured')}>{r.featured ? '★' : '☆'}</button></td>
              <td>
                <button className="abtn ghost" onClick={() => edit(r)}>Edit</button>
                <button className="abtn ghost" onClick={() => remove(r)} style={{ color: '#9a2020' }}>Delete</button>
              </td>
            </tr>
          ))}
          {shown.length === 0 ? <tr><td colSpan={7}>No listings.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
