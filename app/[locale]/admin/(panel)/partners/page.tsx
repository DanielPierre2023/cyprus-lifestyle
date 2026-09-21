'use client';
// Partner portal moderation (roadmap item 09) — review ownership claims and proposed
// listing edits. Approving an edit writes only whitelisted fields to the live listing.
import { useEffect, useState, useCallback } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

interface Claim { id: string; created_at: string; slug: string; email: string; status: string; verified_at: string | null }
interface EditReq { id: string; created_at: string; slug: string; status: string; fields: Record<string, string>; note: string | null }

export default function PartnersModeration() {
  const sb = supabaseBrowser();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [edits, setEdits] = useState<EditReq[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: c }, { data: e }] = await Promise.all([
      sb.from('listing_claims').select('id, created_at, slug, email, status, verified_at').order('created_at', { ascending: false }).limit(200),
      sb.from('listing_edit_requests').select('id, created_at, slug, status, fields, note').order('created_at', { ascending: false }).limit(200),
    ]);
    setClaims((c as Claim[]) || []); setEdits((e as EditReq[]) || []); setLoading(false);
  }, [sb]);
  useEffect(() => { load(); }, [load]);

  async function moderate(kind: 'claim' | 'edit', id: string, action: 'approve' | 'reject') {
    setMsg('');
    const res = await fetch('/api/admin/partner/moderate', {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id, action }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.ok) setMsg('Error: ' + (d.error || res.status));
    else { setMsg(kind === 'edit' && action === 'approve' ? '✓ Applied to the live listing.' : '✓ Done.'); load(); }
  }

  const pendingClaims = claims.filter((c) => c.status === 'verified' || c.status === 'pending');
  const pendingEdits = edits.filter((e) => e.status === 'pending');

  return (
    <>
      <h1>Partners · Self-service moderation</h1>
      <p className="sub">Business owners claim their listing (verified by the email on file) and propose edits. Approve a claim to trust the owner; approve an edit to publish only the whitelisted fields (contact details, descriptions, their pitch) to the live listing.</p>
      {msg ? <p className="sub" style={{ color: '#1f7a3f' }}>{msg}</p> : null}

      <h1 style={{ fontSize: 18 }}>Pending edit requests{pendingEdits.length ? ` · ${pendingEdits.length}` : ''}</h1>
      <table className="adm-t">
        <thead><tr><th>When</th><th>Listing</th><th>Proposed changes</th><th></th></tr></thead>
        <tbody>
          {pendingEdits.map((e) => (
            <tr key={e.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{new Date(e.created_at).toLocaleDateString()}</td>
              <td>{e.slug}</td>
              <td style={{ fontSize: 13 }}>{Object.entries(e.fields || {}).map(([k, v]) => <div key={k}><strong>{k}:</strong> {String(v).slice(0, 160)}</div>)}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button onClick={() => moderate('edit', e.id, 'approve')} style={btn(true)}>Approve &amp; publish</button>{' '}
                <button onClick={() => moderate('edit', e.id, 'reject')} style={btn(false)}>Reject</button>
              </td>
            </tr>
          ))}
          {!loading && pendingEdits.length === 0 ? <tr><td colSpan={4}>No pending edits.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18 }}>Claims{pendingClaims.length ? ` · ${pendingClaims.length} awaiting` : ''}</h1>
      <table className="adm-t">
        <thead><tr><th>When</th><th>Listing</th><th>Claimant</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c.id}>
              <td style={{ whiteSpace: 'nowrap' }}>{new Date(c.created_at).toLocaleDateString()}</td>
              <td>{c.slug}</td>
              <td style={{ fontSize: 13 }}>{c.email}</td>
              <td><span className={`pill ${c.status === 'approved' ? 'confirmed' : 'pending'}`}>{c.status}</span></td>
              <td style={{ whiteSpace: 'nowrap' }}>
                {c.status !== 'approved' && c.status !== 'rejected' ? (
                  <>
                    <button onClick={() => moderate('claim', c.id, 'approve')} style={btn(true)}>Approve</button>{' '}
                    <button onClick={() => moderate('claim', c.id, 'reject')} style={btn(false)}>Reject</button>
                  </>
                ) : null}
              </td>
            </tr>
          ))}
          {!loading && claims.length === 0 ? <tr><td colSpan={5}>No claims yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}

function btn(primary: boolean): React.CSSProperties {
  return { padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12,
    border: `1px solid ${primary ? '#C9A24C' : 'var(--line,#e3d9c4)'}`,
    background: primary ? 'rgba(201,162,76,.15)' : 'transparent', color: 'inherit' };
}
