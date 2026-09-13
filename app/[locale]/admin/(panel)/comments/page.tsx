'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function CommentsTab() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<any[]>([]);
  const [pendingOnly, setPendingOnly] = useState(true);

  const load = useCallback(async () => {
    let q = sb.from('comments').select('id, post_id, author_name, content, is_approved, created_at').order('created_at', { ascending: false }).limit(100);
    if (pendingOnly) q = q.eq('is_approved', false);
    const { data } = await q; setRows(data || []);
  }, [sb, pendingOnly]);
  useEffect(() => { load(); }, [load]);

  async function approve(id: string) { await sb.from('comments').update({ is_approved: true }).eq('id', id); load(); }
  async function del(id: string) { await sb.from('comments').delete().eq('id', id); load(); }
  async function suggest(c: any) {
    const res = await fetch('/api/admin/comment-reply', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: c.content, lang: 'en' }) });
    const d = await res.json();
    if (d.ok) alert(d.reply);
  }

  return (
    <>
      <h1>Comments</h1>
      <p className="sub">Approve, remove, or draft a reply.</p>
      <div className="toggle"><input type="checkbox" checked={pendingOnly} onChange={() => setPendingOnly((v) => !v)} style={{ width: 'auto', margin: 0 }} /> Show only pending</div>
      <table className="adm-t">
        <thead><tr><th>Author</th><th>Comment</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id}>
              <td>{c.author_name}</td><td>{c.content}</td>
              <td><span className={`pill ${c.is_approved ? 'ok' : 'pending'}`}>{c.is_approved ? 'approved' : 'pending'}</span></td>
              <td>
                {!c.is_approved ? <button className="abtn gold" onClick={() => approve(c.id)}>Approve</button> : null}
                <button className="abtn ghost" onClick={() => suggest(c)}>AI reply</button>
                <button className="abtn ghost" onClick={() => del(c.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={4}>Nothing to moderate.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
