'use client';
// "Request your management link" — the entry panel on the owner manage page when the
// visitor has no active editing session. It posts the listing slug to
// /api/directory/owner/request, which (only if the listing is an owner-verified profile)
// emails a secure, single-use management link to the owner contact ON FILE. The response
// is ANTI-ENUMERATING: the visitor always sees the same generic "check your inbox" message,
// and the on-file address is never revealed. Markup/styling mirror ClaimListing.tsx.
import { useState } from 'react';
import HoneypotField from '@/components/HoneypotField';
import { HONEYPOT_FIELD } from '@/lib/honeypot';

export default function OwnerRequestLink({ slug, name }: { slug: string; name?: string }) {
  const [hp, setHp] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr('');
    try {
      const res = await fetch('/api/directory/owner/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, [HONEYPOT_FIELD]: hp }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) { setErr(d.error || 'Something went wrong — please try again.'); return; }
      setMsg(d.message || 'If this listing is a verified owner profile, we’ve emailed a secure link to the contact on file.');
    } catch {
      setErr('Something went wrong — please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (msg) {
    return (
      <div className="orl">
        <h2 className="orl-t">Check your inbox</h2>
        <p className="orl-i">{msg}</p>
        <p className="orl-fine">The link is valid for 60 minutes and can be used once. For your security, it goes only to the verified owner contact we hold on file — not to any address entered here.</p>
        <style>{ORL_CSS}</style>
      </div>
    );
  }

  return (
    <form className="orl" onSubmit={onSubmit}>
      <h2 className="orl-t">Manage{name ? ` ${name}` : ' your listing'}</h2>
      <p className="orl-i">
        To keep your listing safe, we’ll email a secure, single-use management link to the
        verified owner contact we hold on file for this business. Click below to send it.
      </p>
      <HoneypotField value={hp} onChange={setHp} />
      {err ? <p className="orl-err">{err}</p> : null}
      <button className="btn orl-btn" type="submit" disabled={busy}>{busy ? 'Sending…' : 'Email my management link'}</button>
      <p className="orl-fine">We never reveal the address on file. If you’re not sure which contact that is, or it has changed, our team can help.</p>
      <style>{ORL_CSS}</style>
    </form>
  );
}

const ORL_CSS = `
  .orl{background:#fff;border:1px solid var(--line,#e0d6c1);border-radius:6px;padding:22px 24px;display:flex;flex-direction:column;gap:12px;max-width:560px}
  .orl-t{font-family:var(--disp);font-weight:600;font-size:24px;margin:0}
  .orl-i{font-family:var(--body);font-size:16px;line-height:1.6;color:var(--ink,#171310);margin:0}
  .orl-fine{font-family:var(--sans);font-size:13px;line-height:1.5;color:var(--ink-soft,#5b5346);margin:0}
  .orl-err{font-family:var(--sans);font-size:14px;color:#9b2d1f;margin:0}
  .orl-btn{align-self:flex-start;text-align:center}
`;
