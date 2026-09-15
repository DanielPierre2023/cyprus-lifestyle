'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Agenda CRUD — manage dated events for the /agenda calendar and Event rich
// results. Writes are authorised by the admin's JWT against the "events admin
// write" RLS policy (has_role admin). Datetimes are entered in the admin's local
// time and stored as UTC (timestamptz).

const DISTRICTS = ['', 'nicosia', 'limassol', 'larnaca', 'famagusta', 'paphos', 'kyrenia'];
const LANGS = ['en', 'el', 'ro', 'ar'] as const;

type Row = Record<string, any>;

const BLANK: Row = {
  id: null, slug: '', district: '',
  title_en: '', title_el: '', title_ro: '', title_ar: '',
  summary_en: '', summary_el: '', summary_ro: '', summary_ar: '',
  venue: '', starts_at: '', ends_at: '', price: '', url: '', image: '',
  lat: '', lng: '', tags: '', status: 'published',
};

const parseTags = (s: string) => s.split(',').map((t) => t.trim()).filter(Boolean);
const num = (v: any) => (v === '' || v === null || v === undefined ? null : Number(v));

function slugify(s: string) {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
}
// timestamptz (ISO/UTC) → the value a <input type="datetime-local"> expects (local wall time).
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

export default function AgendaAdmin() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState<Row>(BLANK);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [showPast, setShowPast] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await sb.from('events').select('*').order('starts_at', { ascending: true });
    if (error) setMsg(error.message);
    setRows((data as Row[]) || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  function edit(r: Row) {
    setForm({ ...BLANK, ...r, tags: Array.isArray(r.tags) ? r.tags.join(', ') : '', starts_at: toLocalInput(r.starts_at), ends_at: toLocalInput(r.ends_at) });
    setMsg('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function reset() { setForm(BLANK); setMsg(''); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg('');
    const slug = (form.slug || slugify(form.title_en)).trim();
    if (!slug || !form.title_en) { setBusy(false); setMsg('Slug and English title are required.'); return; }
    if (!form.starts_at) { setBusy(false); setMsg('A start date & time is required.'); return; }
    const payload: Row = {
      slug, district: form.district || null,
      title_en: form.title_en || null, title_el: form.title_el || null, title_ro: form.title_ro || null, title_ar: form.title_ar || null,
      summary_en: form.summary_en || null, summary_el: form.summary_el || null, summary_ro: form.summary_ro || null, summary_ar: form.summary_ar || null,
      venue: form.venue || null, starts_at: fromLocalInput(form.starts_at), ends_at: fromLocalInput(form.ends_at),
      price: form.price || null, url: form.url || null, image: form.image || null,
      lat: num(form.lat), lng: num(form.lng), tags: parseTags(form.tags || ''), status: form.status || 'published',
    };
    const res = form.id
      ? await sb.from('events').update(payload).eq('id', form.id)
      : await sb.from('events').insert(payload);
    setBusy(false);
    if (res.error) { setMsg(res.error.message); return; }
    setMsg(form.id ? 'Saved.' : 'Added.'); reset(); load();
  }

  async function remove(r: Row) {
    if (!confirm(`Delete “${r.title_en || r.slug}” permanently? This cannot be undone.`)) return;
    const { error } = await sb.from('events').delete().eq('id', r.id);
    if (error) { setMsg(error.message); return; }
    if (form.id === r.id) reset();
    load();
  }
  async function toggleStatus(r: Row) {
    await sb.from('events').update({ status: r.status === 'published' ? 'draft' : 'published' }).eq('id', r.id); load();
  }

  const now = Date.now();
  const shown = showPast ? rows : rows.filter((r) => new Date(r.ends_at || r.starts_at).getTime() >= now - 864e5);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

  return (
    <>
      <h1>Agenda · events</h1>
      <p className="sub">{rows.length} events. Add festivals, exhibitions, concerts and openings. Each published, upcoming event appears on the /agenda calendar and is emitted as Event structured data. Times are entered and shown in your local timezone.</p>

      <form onSubmit={save} style={{ background: '#fff', border: '1px solid #e3ddcf', borderRadius: 4, padding: 18, marginBottom: 22 }}>
        <h1 style={{ fontSize: 18 }}>{form.id ? 'Edit event' : 'New event'}</h1>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '2 1 240px' }}><label className="fl">English title *</label><input value={form.title_en} onChange={(e) => set('title_en', e.target.value)} placeholder="Limassol Wine Festival" /></div>
          <div style={{ flex: '2 1 200px' }}><label className="fl">Slug {form.id ? '' : '(auto if blank)'}</label><input value={form.slug} onChange={(e) => set('slug', e.target.value)} placeholder="limassol-wine-festival-2026" /></div>
          <div style={{ flex: '1 1 140px' }}>
            <label className="fl">District</label>
            <select value={form.district} onChange={(e) => set('district', e.target.value)}>{DISTRICTS.map((d) => <option key={d} value={d}>{d || '—'}</option>)}</select>
          </div>
        </div>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '1 1 200px' }}><label className="fl">Starts *</label><input type="datetime-local" value={form.starts_at} onChange={(e) => set('starts_at', e.target.value)} /></div>
          <div style={{ flex: '1 1 200px' }}><label className="fl">Ends (optional)</label><input type="datetime-local" value={form.ends_at} onChange={(e) => set('ends_at', e.target.value)} /></div>
          <div style={{ flex: '2 1 200px' }}><label className="fl">Venue</label><input value={form.venue} onChange={(e) => set('venue', e.target.value)} placeholder="Molos Promenade" /></div>
          <div style={{ flex: '1 1 130px' }}><label className="fl">Price</label><input value={form.price} onChange={(e) => set('price', e.target.value)} placeholder="Free · €20 · €15–€40" /></div>
        </div>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          {LANGS.map((l) => (
            <div key={l} style={{ flex: '1 1 220px' }}>
              <label className="fl">Summary ({l.toUpperCase()})</label>
              <textarea rows={2} value={form[`summary_${l}`]} onChange={(e) => set(`summary_${l}`, e.target.value)} placeholder={l === 'en' ? 'One or two sentences.' : 'Optional — falls back to English.'} />
            </div>
          ))}
        </div>
        <details style={{ marginBottom: 10 }}>
          <summary style={{ cursor: 'pointer', color: '#8a5b12', fontSize: 13 }}>Localised titles (EL / RO / AR) — optional</summary>
          <div className="row" style={{ marginTop: 8, alignItems: 'flex-start' }}>
            {(['el', 'ro', 'ar'] as const).map((l) => (
              <div key={l} style={{ flex: '1 1 200px' }}><label className="fl">Title ({l.toUpperCase()})</label><input value={form[`title_${l}`]} onChange={(e) => set(`title_${l}`, e.target.value)} /></div>
            ))}
          </div>
        </details>

        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '2 1 220px' }}><label className="fl">Ticket / info URL</label><input value={form.url} onChange={(e) => set('url', e.target.value)} placeholder="https://…" /></div>
          <div style={{ flex: '2 1 220px' }}><label className="fl">Image URL</label><input value={form.image} onChange={(e) => set('image', e.target.value)} placeholder="https://… (optional)" /></div>
          <div style={{ flex: '1 1 110px' }}><label className="fl">Lat</label><input value={form.lat} onChange={(e) => set('lat', e.target.value)} inputMode="decimal" /></div>
          <div style={{ flex: '1 1 110px' }}><label className="fl">Lng</label><input value={form.lng} onChange={(e) => set('lng', e.target.value)} inputMode="decimal" /></div>
        </div>
        <div className="row" style={{ alignItems: 'flex-start' }}>
          <div style={{ flex: '3 1 260px' }}><label className="fl">Tags (comma-separated)</label><input value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="wine, festival, limassol" /></div>
          <div style={{ flex: '1 1 140px' }}>
            <label className="fl">Status</label>
            <select value={form.status} onChange={(e) => set('status', e.target.value)}><option value="published">published</option><option value="draft">draft</option></select>
          </div>
        </div>

        <div className="row">
          <button className="abtn gold" type="submit" disabled={busy}>{busy ? 'Saving…' : form.id ? 'Save changes' : 'Add event'}</button>
          {form.id ? <button className="abtn ghost" type="button" onClick={reset}>Cancel / New</button> : null}
          {msg ? <span style={{ color: msg === 'Saved.' || msg === 'Added.' ? '#1c6b34' : '#9a2020', fontSize: 13 }}>{msg}</span> : null}
        </div>
      </form>

      <label className="toggle" style={{ display: 'inline-flex', marginBottom: 12 }}>
        <input type="checkbox" style={{ width: 'auto', margin: 0 }} checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Show past events
      </label>

      <table className="adm-t">
        <thead><tr><th>Starts</th><th>Title</th><th>Venue / district</th><th>Price</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.id} style={{ opacity: r.status === 'published' ? 1 : 0.55 }}>
              <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.starts_at)}</td>
              <td>{r.title_en || r.slug}<br /><span style={{ color: '#8a8371', fontSize: 12 }}>{r.slug}</span></td>
              <td>{r.venue || '—'}{r.district ? ` · ${r.district}` : ''}</td>
              <td>{r.price || '—'}</td>
              <td><button className={`pill ${r.status === 'published' ? 'ok' : 'draft'}`} style={{ cursor: 'pointer', border: 'none' }} title="Toggle published/draft" onClick={() => toggleStatus(r)}>{r.status}</button></td>
              <td>
                <button className="abtn ghost" onClick={() => edit(r)}>Edit</button>
                <button className="abtn ghost" onClick={() => remove(r)} style={{ color: '#9a2020' }}>Delete</button>
              </td>
            </tr>
          ))}
          {shown.length === 0 ? <tr><td colSpan={6}>No events{showPast ? '' : ' upcoming'}.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
