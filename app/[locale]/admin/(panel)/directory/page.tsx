'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Directory CRUD — manage restaurants, wineries, developments, hotels, beaches
// and vendors without touching SQL. Writes are authorised by the admin's JWT
// against the "directory admin write" RLS policy (has_role admin).
//
// The list is fetched SERVER-SIDE (filtered + paginated). Supabase/PostgREST
// returns at most 1000 rows per request, so an all-rows-then-filter-in-JS
// approach silently hid whatever sorted last (wineries) once the table grew
// past 1000. Here every filter is pushed to the database and results are
// paged, so any type is always reachable no matter how large the table is.

const TYPES = ['restaurant', 'winery', 'development', 'hotel', 'beach', 'vendor'] as const;
const DISTRICTS = ['', 'nicosia', 'limassol', 'larnaca', 'famagusta', 'paphos', 'kyrenia'];
const PRICE_BANDS = ['', '€', '€€', '€€€', '€€€€'];
const LANGS = ['en', 'el', 'ro', 'ar'] as const;
const PAGE = 100; // rows per page

type Row = Record<string, any>;
type Counts = { total: number; published: number; draft: number; byType: Record<string, number> };

const ZERO_COUNTS: Counts = { total: 0, published: 0, draft: 0, byType: {} };

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
  const [counts, setCounts] = useState<Counts>(ZERO_COUNTS);
  const [form, setForm] = useState<Row>(BLANK);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // View controls (all pushed to the server)
  const [filter, setFilter] = useState('all');       // type
  const [statusFilter, setStatusFilter] = useState('all'); // published | draft | all
  const [search, setSearch] = useState('');          // applied search term
  const [searchInput, setSearchInput] = useState(''); // the text box
  const [page, setPage] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

  // ── accurate counts, straight from the database (not capped by the 1000 window) ──
  const loadCounts = useCallback(async () => {
    const head = (build: (q: any) => any) =>
      build(sb.from('directory_listings').select('*', { count: 'exact', head: true }));
    const [total, published, draft, ...byTypeRes] = await Promise.all([
      head((q) => q),
      head((q) => q.eq('status', 'published')),
      head((q) => q.eq('status', 'draft')),
      ...TYPES.map((t) => head((q) => q.eq('type', t))),
    ]);
    const byType: Record<string, number> = {};
    TYPES.forEach((t, i) => { byType[t] = byTypeRes[i]?.count || 0; });
    setCounts({ total: total.count || 0, published: published.count || 0, draft: draft.count || 0, byType });
  }, [sb]);

  // ── the visible page of rows, filtered + ordered + paged on the server ──
  const load = useCallback(async () => {
    setLoading(true);
    let q = sb.from('directory_listings').select('*', { count: 'exact' }).order('type').order('name_en');
    if (filter !== 'all') q = q.eq('type', filter);
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    const term = search.trim().replace(/[,()*%]/g, ' ').trim();
    if (term) q = q.or(`name_en.ilike.*${term}*,slug.ilike.*${term}*,name_el.ilike.*${term}*`);
    q = q.range(page * PAGE, page * PAGE + PAGE - 1);
    const { data, count, error } = await q;
    setLoading(false);
    if (error) { setMsg(error.message); return; }
    setRows((data as Row[]) || []);
    setFilteredCount(count || 0);
  }, [sb, filter, statusFilter, search, page]);

  useEffect(() => { loadCounts(); }, [loadCounts]);
  useEffect(() => { load(); }, [load]);

  // Reset to the first page whenever the filters change.
  useEffect(() => { setPage(0); }, [filter, statusFilter, search]);

  async function refresh() { await Promise.all([load(), loadCounts()]); }

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
    setMsg(form.id ? 'Saved.' : 'Added.'); reset(); refresh();
  }

  async function remove(r: Row) {
    if (!confirm(`Delete "${r.name_en || r.slug}" permanently? This cannot be undone.`)) return;
    const { error } = await sb.from('directory_listings').delete().eq('id', r.id);
    if (error) { setMsg(error.message); return; }
    if (form.id === r.id) reset();
    refresh();
  }
  async function toggle(r: Row, field: 'featured' | 'status') {
    const patch = field === 'featured' ? { featured: !r.featured } : { status: r.status === 'published' ? 'draft' : 'published' };
    await sb.from('directory_listings').update(patch).eq('id', r.id);
    refresh();
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const pages = Math.max(1, Math.ceil(filteredCount / PAGE));
  const from = filteredCount === 0 ? 0 : page * PAGE + 1;
  const to = Math.min(page * PAGE + PAGE, filteredCount);

  return (
    <>
      <h1>Directory · listings</h1>
      <p className="sub">
        <strong>{counts.total}</strong> listings in total — {counts.published} published, {counts.draft} draft.
        Add or edit restaurants, wineries, developments, hotels, beaches and services. Coordinates power the map on each directory page.
      </p>

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

      {/* ── Filters: type · status · search (all server-side) ── */}
      <div className="row" style={{ marginBottom: 12, alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <label className="fl">Type</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ width: 200 }}>
            <option value="all">All types ({counts.total})</option>
            {TYPES.map((t) => <option key={t} value={t}>{t} ({counts.byType[t] ?? 0})</option>)}
          </select>
        </div>
        <div>
          <label className="fl">Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 170 }}>
            <option value="all">All ({counts.total})</option>
            <option value="published">published ({counts.published})</option>
            <option value="draft">draft ({counts.draft})</option>
          </select>
        </div>
        <form
          onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
          style={{ display: 'flex', gap: 6, alignItems: 'flex-end', flex: '1 1 260px' }}
        >
          <div style={{ flex: '1 1 auto' }}>
            <label className="fl">Search name or slug</label>
            <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="e.g. tsiakkas, winery, kyrenia…" />
          </div>
          <button className="abtn" type="submit">Search</button>
          {search ? <button className="abtn ghost" type="button" onClick={() => { setSearchInput(''); setSearch(''); }}>Clear</button> : null}
        </form>
      </div>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ color: '#8a8371', fontSize: 13 }}>
          {loading ? 'Loading…' : `Showing ${from}–${to} of ${filteredCount}`}
        </span>
        <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button className="abtn ghost" type="button" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</button>
          <span style={{ fontSize: 13, color: '#8a8371' }}>Page {page + 1} / {pages}</span>
          <button className="abtn ghost" type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </span>
      </div>

      <table className="adm-t">
        <thead><tr><th>Name</th><th>Type</th><th>District</th><th>Coords</th><th>Status</th><th>Featured</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
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
          {!loading && rows.length === 0 ? <tr><td colSpan={7}>No listings match these filters.</td></tr> : null}
        </tbody>
      </table>

      {pages > 1 ? (
        <div className="row" style={{ justifyContent: 'center', gap: 6, marginTop: 12 }}>
          <button className="abtn ghost" type="button" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</button>
          <span style={{ fontSize: 13, color: '#8a8371' }}>Page {page + 1} / {pages}</span>
          <button className="abtn ghost" type="button" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
        </div>
      ) : null}
    </>
  );
}
