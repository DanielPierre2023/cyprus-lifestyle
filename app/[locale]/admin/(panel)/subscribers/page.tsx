'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function SubscribersTab() {
  const sb = supabaseBrowser();
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const { data } = await sb.from('newsletter_subscribers').select('id, email, language, confirmed, is_active, created_at').order('created_at', { ascending: false }).limit(200);
    setRows(data || []);
    const c: Record<string, number> = {};
    (data || []).forEach((r: any) => { if (r.confirmed && r.is_active) c[r.language] = (c[r.language] || 0) + 1; });
    setCounts(c);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  return (
    <>
      <h1>Subscribers</h1>
      <p className="sub">Confirmed subscribers by edition.</p>
      <div className="cards">
        {['en', 'el', 'ro', 'ar'].map((l) => <div className="stat" key={l}><div className="n">{counts[l] || 0}</div><div className="k">{l}</div></div>)}
      </div>
      <table className="adm-t">
        <thead><tr><th>Email</th><th>Edition</th><th>Confirmed</th><th>Joined</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}><td>{r.email}</td><td>{r.language}</td>
              <td><span className={`pill ${r.confirmed ? 'confirmed' : 'pending'}`}>{r.confirmed ? 'yes' : 'pending'}</span></td>
              <td>{new Date(r.created_at).toLocaleDateString()}</td></tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={4}>No subscribers yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
