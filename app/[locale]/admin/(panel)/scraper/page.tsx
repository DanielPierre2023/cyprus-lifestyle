'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function ScraperTab() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState('');
  const [form, setForm] = useState({ name: '', url: '', category: 'news', source_language: 'en', region: 'cyprus', tier: 'news' });

  const load = useCallback(async () => {
    const { data } = await sb.from('rss_sources').select('*').order('name');
    setRows(data || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function scrape(source_id?: string) {
    setBusy(source_id || 'all');
    await fetch('/api/admin/scrape', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(source_id ? { source_id } : {}) });
    setBusy(''); load();
  }
  async function toggleActive(id: string, is_active: boolean) {
    await sb.from('rss_sources').update({ is_active: !is_active }).eq('id', id); load();
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.url) return;
    await sb.from('rss_sources').insert({ ...form, is_active: true });
    setForm({ name: '', url: '', category: 'news', source_language: 'en', region: 'cyprus', tier: 'news' });
    load();
  }

  return (
    <>
      <h1>Scraper · RSS sources</h1>
      <p className="sub">{rows.length} sources. Luxury feeds route to Property/Culture/Escapes/Table; news/business feed the Cyprus & Business desks.</p>
      <div className="row" style={{ marginBottom: 16 }}>
        <button className="abtn gold" disabled={busy === 'all'} onClick={() => scrape()}>{busy === 'all' ? 'Scraping…' : 'Scrape all active'}</button>
      </div>

      <form onSubmit={add} className="row" style={{ alignItems: 'flex-end', marginBottom: 18 }}>
        <div style={{ flex: '2 1 200px' }}><input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div style={{ flex: '3 1 260px' }}><input placeholder="Feed URL" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
        <select value={form.source_language} onChange={(e) => setForm({ ...form, source_language: e.target.value })} style={{ width: 90 }}>
          <option>en</option><option>el</option><option>ro</option><option>ar</option>
        </select>
        <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} style={{ width: 110 }}>
          <option>news</option><option>business</option><option>luxury</option>
        </select>
        <button className="abtn" type="submit">Add source</button>
      </form>

      <table className="adm-t">
        <thead><tr><th>Name</th><th>Lang</th><th>Region</th><th>Tier</th><th>Last scraped</th><th>Errors</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} style={{ opacity: r.is_active ? 1 : 0.5 }}>
              <td>{r.name}</td><td>{r.source_language}</td><td>{r.region || '—'}</td><td>{r.tier || '—'}</td>
              <td>{r.last_scraped_at ? new Date(r.last_scraped_at).toLocaleString() : '—'}</td>
              <td>{r.error_count ? <span className="pill error">{r.error_count}</span> : '0'}</td>
              <td>
                <button className="abtn ghost" disabled={busy === r.id} onClick={() => scrape(r.id)}>{busy === r.id ? '…' : 'Scrape'}</button>
                <button className="abtn ghost" onClick={() => toggleActive(r.id, r.is_active)}>{r.is_active ? 'Disable' : 'Enable'}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
