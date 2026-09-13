'use client';
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function SettingsTab() {
  const sb = supabaseBrowser();
  const [auto, setAuto] = useState<any>({ scraper_enabled: false, processor_enabled: false, auto_publish: false });
  const [social, setSocial] = useState<any>({ instagram: '', facebook: '', x: '', linkedin: '', youtube: '' });
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdmin, setNewAdmin] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const [{ data: a }, { data: s }, { data: roles }] = await Promise.all([
      sb.from('automation_settings').select('*').eq('id', 1).maybeSingle(),
      sb.from('site_settings').select('value').eq('key', 'social').maybeSingle(),
      sb.from('user_roles').select('user_id, role').eq('role', 'admin'),
    ]);
    if (a) setAuto(a);
    if (s?.value) setSocial({ ...social, ...(s.value as any) });
    // resolve admin emails from profiles
    const ids = (roles || []).map((r: any) => r.user_id);
    if (ids.length) {
      const { data: profs } = await sb.from('profiles').select('id, email, full_name').in('id', ids);
      setAdmins(profs || []);
    } else setAdmins([]);
  }, [sb]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  async function saveAuto(k: string) { const v = !auto[k]; setAuto({ ...auto, [k]: v }); await sb.from('automation_settings').update({ [k]: v, updated_at: new Date().toISOString() }).eq('id', 1); }
  async function saveSocial() { await sb.from('site_settings').upsert({ key: 'social', value: social, updated_at: new Date().toISOString() }, { onConflict: 'key' }); setMsg('Social handles saved.'); }
  async function addAdmin() {
    setMsg('');
    const { data: p } = await sb.from('profiles').select('id').eq('email', newAdmin.trim().toLowerCase()).maybeSingle();
    if (!p) { setMsg('No user with that email. They must sign up first.'); return; }
    const { error } = await sb.from('user_roles').insert({ user_id: (p as any).id, role: 'admin' });
    setMsg(error ? error.message : 'Admin added.'); setNewAdmin(''); load();
  }

  return (
    <>
      <h1>Settings</h1>
      <p className="sub">Automation, social handles and who can sign in.</p>

      <h1 style={{ fontSize: 18 }}>Automation</h1>
      {(['scraper_enabled', 'processor_enabled', 'auto_publish'] as const).map((k) => (
        <div className="toggle" key={k}><input type="checkbox" checked={auto[k]} onChange={() => saveAuto(k)} style={{ width: 'auto', margin: 0 }} /> {k.replace('_', ' ')}</div>
      ))}

      <h1 style={{ fontSize: 18, marginTop: 20 }}>Social handles</h1>
      <div style={{ maxWidth: 420 }}>
        {Object.keys(social).map((k) => (
          <div key={k}><label style={{ fontSize: 12, color: '#8a8371' }}>{k}</label><input value={social[k] || ''} onChange={(e) => setSocial({ ...social, [k]: e.target.value })} /></div>
        ))}
        <button className="abtn gold" onClick={saveSocial}>Save handles</button>
      </div>

      <h1 style={{ fontSize: 18, marginTop: 20 }}>Administrators</h1>
      <table className="adm-t"><thead><tr><th>Name</th><th>Email</th></tr></thead>
        <tbody>{admins.map((a) => <tr key={a.id}><td>{a.full_name || '—'}</td><td>{a.email}</td></tr>)}
          {admins.length === 0 ? <tr><td colSpan={2}>Only you.</td></tr> : null}</tbody>
      </table>
      <div className="row" style={{ marginTop: 10, maxWidth: 420 }}>
        <input placeholder="new-admin@email.com" value={newAdmin} onChange={(e) => setNewAdmin(e.target.value)} />
        <button className="abtn" onClick={addAdmin}>Grant admin</button>
      </div>
      {msg ? <p style={{ color: '#1c6b34' }}>{msg}</p> : null}
    </>
  );
}
