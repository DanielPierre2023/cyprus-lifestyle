'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function ArticlesTab() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft'>('all');

  const load = useCallback(async () => {
    let q = sb.from('blog_posts').select('id, slug, title_en, cover_image, category, county, status, ai_editor, published_at, created_at').order('created_at', { ascending: false }).limit(80);
    if (filter !== 'all') q = q.eq('status', filter);
    const { data } = await q;
    setRows(data || []);
  }, [sb, filter]);
  useEffect(() => { load(); }, [load]);

  async function setStatus(id: string, status: string) {
    const row = rows.find((r) => r.id === id);
    const { error } = await sb.from('blog_posts').update({ status, published_at: status === 'published' ? new Date().toISOString() : null }).eq('id', id);
    // Instant on-demand ISR on both publish and unpublish, so the reader pages
    // reflect the change immediately instead of after the time-based window.
    if (!error && row) {
      try {
        await fetch('/api/admin/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: row.slug, category: row.category }),
        });
      } catch { /* non-fatal */ }
    }
    load();
  }
  async function del(id: string) {
    if (!confirm('Delete this article? This cannot be undone.')) return;
    await sb.from('blog_posts').delete().eq('id', id); load();
  }

  return (
    <>
      <h1>Articles</h1>
      <p className="sub">Every story, in all seven languages. Publish, unpublish or edit.</p>
      <div className="row" style={{ marginBottom: 14 }}>
        {(['all', 'published', 'draft'] as const).map((f) => (
          <button key={f} className={`abtn ${filter === f ? 'gold' : 'ghost'}`} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>
      <table className="adm-t">
        <thead><tr><th style={{ width: 64 }}></th><th>Title (EN)</th><th>Category</th><th>Editor</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>
                {r.cover_image
                  ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={r.cover_image} alt="" style={{ width: 56, height: 34, objectFit: 'cover', borderRadius: 2, display: 'block', border: '1px solid #e3ddcf' }} />
                  : <span title="No cover" style={{ display: 'inline-block', width: 56, height: 34, background: '#faf7f0', border: '1px dashed #cfc7b3', borderRadius: 2 }} />}
              </td>
              <td>{r.title_en || <em>untitled</em>}</td>
              <td>{r.category || '—'}{r.county ? ` · ${r.county}` : ''}</td>
              <td>{r.ai_editor || '—'}</td>
              <td><span className={`pill ${r.status}`}>{r.status}</span></td>
              <td>
                <a className="abtn ghost" href={`/admin/editor?id=${r.id}`}>Edit</a>
                {r.status === 'published'
                  ? <button className="abtn ghost" onClick={() => setStatus(r.id, 'draft')}>Unpublish</button>
                  : <button className="abtn gold" onClick={() => setStatus(r.id, 'published')}>Publish</button>}
                <button className="abtn ghost" onClick={() => del(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={6}>No articles.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
