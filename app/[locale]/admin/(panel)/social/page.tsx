'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

const PLATFORMS = ['facebook', 'instagram', 'x', 'linkedin'] as const;

export default function SocialTab() {
  const sb = supabaseBrowser();
  const [posts, setPosts] = useState<any[]>([]);
  const [log, setLog] = useState<any[]>([]);
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    const [{ data: p }, { data: l }] = await Promise.all([
      sb.from('blog_posts').select('id, slug, title_en, published_at').eq('status', 'published').order('published_at', { ascending: false }).limit(20),
      sb.from('social_posts').select('id, platform, lang, status, permalink, error, created_at, article_id').order('created_at', { ascending: false }).limit(25),
    ]);
    setPosts(p || []); setLog(l || []);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function publish(post_id: string) {
    setBusy(post_id);
    await fetch('/api/admin/social', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id, platforms: PLATFORMS }) });
    setBusy(''); load();
  }

  return (
    <>
      <h1>Social</h1>
      <p className="sub">Publish an article to Facebook, Instagram, X and LinkedIn (channels with tokens set). Copy is AI-written per platform.</p>
      <table className="adm-t">
        <thead><tr><th>Article</th><th></th></tr></thead>
        <tbody>
          {posts.map((p) => (
            <tr key={p.id}><td>{p.title_en}</td>
              <td><button className="abtn gold" disabled={busy === p.id} onClick={() => publish(p.id)}>{busy === p.id ? 'Posting…' : 'Publish to all'}</button></td></tr>
          ))}
          {posts.length === 0 ? <tr><td colSpan={2}>No published articles.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 20, marginTop: 22 }}>Recent posts</h1>
      <table className="adm-t">
        <thead><tr><th>When</th><th>Platform</th><th>Lang</th><th>Status</th><th>Link</th></tr></thead>
        <tbody>
          {log.map((s) => (
            <tr key={s.id}><td>{new Date(s.created_at).toLocaleString()}</td><td>{s.platform}</td><td>{s.lang}</td>
              <td><span className={`pill ${s.status === 'published' ? 'ok' : 'failed'}`}>{s.status}</span>{s.error ? <div style={{ fontSize: 11, color: '#9a2020' }}>{s.error}</div> : null}</td>
              <td>{s.permalink ? <a href={s.permalink} target="_blank" rel="noopener">open</a> : '—'}</td></tr>
          ))}
          {log.length === 0 ? <tr><td colSpan={5}>No posts yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
