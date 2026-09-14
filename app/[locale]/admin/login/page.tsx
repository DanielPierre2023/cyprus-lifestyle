'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    window.location.href = '/admin';
  }

  return (
    <div className="adm-login">
      <form className="box" onSubmit={submit}>
        <img src="/brand/monogram.svg" alt="" width={52} height={52} className="mono" aria-hidden="true" />
        <div className="brand">Cyprus Lifestyle</div>
        <div className="tag">Editorial Console</div>
        <input type="email" placeholder="Email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button className="abtn gold" style={{ width: '100%' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {err ? <div className="err">{err}</div> : null}
        <div className="hint">Authorised editors only</div>
      </form>
    </div>
  );
}
