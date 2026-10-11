'use client';
// Interactive parts of the Business Hub: sign-in, link confirmation, sign-out, the proposal form, the proposal list and the
// enquiry status selector. All text comes from the `business` message namespace (L); the server decides everything that matters.
import { useEffect, useRef, useState } from 'react';

export type L = Record<string, string>;
const home = (locale: string, tab?: string) => `${locale === 'en' ? '' : `/${locale}`}/account/business${tab ? `?tab=${tab}` : ''}`;
const post = async (url: string, body: unknown) => {
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { status: r.status, d: await r.json().catch(() => ({} as Record<string, unknown>)) };
};

const css = `
.bz{font-family:var(--sans,sans-serif);display:flex;flex-direction:column;gap:12px;max-width:620px}
.bz-row{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.bz input[type=email],.bz input[type=text],.bz input[type=url],.bz textarea,.bz select{flex:1;min-width:200px;font:inherit;font-size:15px;padding:10px 12px;border:1px solid #e0d6c1;border-radius:6px;background:#fff;color:inherit}
.bz textarea{min-height:120px;width:100%}
.bz label{font-size:13.5px;color:#6b6555;display:flex;flex-direction:column;gap:4px}
.bz label.chk{flex-direction:row;gap:8px;align-items:flex-start;color:inherit}
.bz input:focus,.bz textarea:focus,.bz select:focus{outline:none;border-color:#C9A24C}
.bz-btn{font-size:14px;padding:11px 18px;border:1px solid #C9A24C;border-radius:6px;background:#C9A24C;color:#0B0E11;cursor:pointer;font-weight:600}
.bz-btn:disabled{opacity:.55;cursor:default}
.bz-ghost{font-size:13.5px;padding:9px 14px;border:1px solid #d8ceb4;border-radius:6px;background:#fff;color:#6a5a2a;cursor:pointer}
.bz-ghost:hover{border-color:#C9A24C}
.bz-ok{color:#1c6b34;font-size:14.5px;margin:0}.bz-err{color:#a3341f;font-size:14px;margin:0}
`;

export function BizSignIn({ L, locale, notice }: { L: L; locale: string; notice?: string }) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [msg, setMsg] = useState(notice || '');
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setMsg(L.invalid); return; }
    setBusy(true); setMsg('');
    try {
      const { status } = await post('/api/business/login', { email: email.trim(), locale });
      if (status === 200) setSent(true); else setMsg(status === 400 ? L.invalid : L.error);
    } catch { setMsg(L.error); } finally { setBusy(false); }
  }
  return (
    <form className="bz" onSubmit={submit} noValidate>
      {sent ? <p className="bz-ok" role="status">{L.sent}</p> : (
        <>
          <div className="bz-row">
            <input type="email" autoComplete="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={L.emailPh} aria-label={L.emailPh} />
            <button className="bz-btn" type="submit" disabled={busy}>{busy ? L.sending : L.send}</button>
          </div>
          {msg ? <p className="bz-err" role="alert">{msg}</p> : null}
        </>
      )}
      <style>{css}</style>
    </form>
  );
}

/** Opened from the e-mailed link: confirm with a POST (never a GET, so mail scanners cannot consume it). */
export function BizConfirm({ token, L, locale }: { token: string; L: L; locale: string }) {
  const [failed, setFailed] = useState(false);
  const [msg, setMsg] = useState('');
  const once = useRef(false);
  useEffect(() => {
    if (once.current) return;
    once.current = true;
    post('/api/business/confirm', { token, locale })
      .then(({ status, d }) => {
        if (status === 200 && d.ok) { window.location.replace(home(locale)); return; }   // the token leaves the address bar
        setMsg(d.error === 'expired' ? L.confirmExpired : d.error === 'unavailable' ? L.confirmError : L.confirmInvalid);
        setFailed(true);
      })
      .catch(() => { setMsg(L.confirmError); setFailed(true); });
  }, [token, L, locale]);
  if (!failed) return <p className="bz-ok" role="status" aria-live="polite">{L.confirming}<style>{css}</style></p>;
  return <BizSignIn L={L} locale={locale} notice={msg} />;
}

export function BizSignOut({ L, locale }: { L: L; locale: string }) {
  const [busy, setBusy] = useState(false);
  async function out(all: boolean) {
    setBusy(true);
    await post('/api/business/logout', { all }).catch(() => {});
    window.location.replace(home(locale));
  }
  return (
    <div className="bz-row" style={{ marginTop: 18 }}>
      <button className="bz-ghost" onClick={() => out(false)} disabled={busy}>{L.signOut}</button>
      <button className="bz-ghost" onClick={() => out(true)} disabled={busy}>{L.signOutAll}</button>
      <style>{css}</style>
    </div>
  );
}

export interface ListingOpt { slug: string; name: string }
export interface Sub { id: string; listing_slug: string; listing_name: string; kind: 'description' | 'photos' | 'news'; payload: Record<string, unknown>; status: string; desk_note: string | null; created_at: string; applied: boolean }

const kindLabel = (L: L, k: string) => (k === 'description' ? L.kindDescription : k === 'photos' ? L.kindPhotos : L.kindNews);
const statusLabel = (L: L, s: string) => ({ submitted: L.stSubmitted, changes_requested: L.stChanges, approved: L.stApproved, rejected: L.stRejected, withdrawn: L.stWithdrawn } as Record<string, string>)[s] || s;

function errText(L: L, d: Record<string, unknown>): string {
  if (d.error === 'limit') return L.errLimit;
  if (d.error === 'invalid') return d.detail === 'invalid_url' ? L.errUrl : d.detail === 'rights' ? L.errRights : L.errInvalid;
  return L.errGeneric;
}

/** New proposal, or (with `revise`) the edit-and-resubmit form for a proposal the desk sent back. */
export function ProposalForm({ L, locale, listings, revise, onDone }: { L: L; locale: string; listings: ListingOpt[]; revise?: Sub; onDone?: () => void }) {
  const [slug, setSlug] = useState(listings[0]?.slug || '');
  const [kind, setKind] = useState<string>(revise?.kind || 'description');
  const p = revise?.payload || {};
  const [text, setText] = useState(String(p.text || ''));
  const [urls, setUrls] = useState(Array.isArray(p.urls) ? (p.urls as string[]).join('\n') : '');
  const [rights, setRights] = useState(false);
  const [title, setTitle] = useState(String(p.title || ''));
  const [body, setBody] = useState(String(p.body || ''));
  const [url, setUrl] = useState(String(p.url || ''));
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr(''); setOk(false);
    const payload = kind === 'description' ? { text } : kind === 'photos' ? { urls, rights } : { title, body, url };
    try {
      const { status, d } = await post('/api/business/submissions', revise ? { action: 'revise', id: revise.id, payload } : { action: 'create', listingSlug: slug, kind, payload });
      if (status === 401) { window.location.reload(); return; }
      if (status === 200 && d.ok) {
        setOk(true);
        if (revise) { window.location.replace(home(locale, 'proposals')); return; }
        setText(''); setUrls(''); setRights(false); setTitle(''); setBody(''); setUrl('');
        onDone?.();
      } else setErr(errText(L, d));
    } catch { setErr(L.errGeneric); } finally { setBusy(false); }
  }
  return (
    <form className="bz" onSubmit={submit}>
      {!revise ? (
        <div className="bz-row">
          {listings.length > 1 ? (
            <label>{L.subListing}<select value={slug} onChange={(e) => setSlug(e.target.value)}>{listings.map((l) => <option key={l.slug} value={l.slug}>{l.name}</option>)}</select></label>
          ) : null}
          <label>{L.subKind}<select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="description">{L.kindDescription}</option><option value="photos">{L.kindPhotos}</option><option value="news">{L.kindNews}</option>
          </select></label>
        </div>
      ) : null}
      {kind === 'description' ? <label>{L.fieldText}<textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={4000} required /></label> : null}
      {kind === 'photos' ? (
        <>
          <label>{L.fieldUrls}<textarea value={urls} onChange={(e) => setUrls(e.target.value)} required /></label>
          <label className="chk"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} required /><span>{L.fieldRights}</span></label>
        </>
      ) : null}
      {kind === 'news' ? (
        <>
          <label>{L.fieldTitle}<input type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} required /></label>
          <label>{L.fieldBody}<textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} required /></label>
          <label>{L.fieldUrl}<input type="url" value={url} onChange={(e) => setUrl(e.target.value)} /></label>
        </>
      ) : null}
      <div className="bz-row">
        <button className="bz-btn" type="submit" disabled={busy}>{busy ? L.submitting : revise ? L.resubmit : L.submit}</button>
        {revise && onDone ? <button type="button" className="bz-ghost" onClick={onDone}>{L.cancel}</button> : null}
      </div>
      {ok && !revise ? <p className="bz-ok" role="status">{L.submitted}</p> : null}
      {err ? <p className="bz-err" role="alert">{err}</p> : null}
      <style>{css}</style>
    </form>
  );
}

export function SubmissionList({ L, locale, subs, listings, dateFmt }: { L: L; locale: string; subs: Sub[]; listings: ListingOpt[]; dateFmt: Record<string, string> }) {
  const [editing, setEditing] = useState('');
  const [busy, setBusy] = useState('');
  async function withdraw(id: string) {
    setBusy(id);
    await post('/api/business/submissions', { action: 'withdraw', id }).catch(() => {});
    window.location.reload();
  }
  if (!subs.length) return <p style={{ margin: 0, color: '#6b6555' }}>{L.noSubs}<style>{css}</style></p>;
  return (
    <div className="bz" style={{ maxWidth: 720 }}>
      {subs.map((s) => (
        <div key={s.id} style={{ border: '1px solid #e6e0d2', borderRadius: 6, padding: '14px 16px', background: '#fff' }}>
          <div style={{ fontSize: 13.5, color: '#6b6555' }}>{s.listing_name} · {kindLabel(L, s.kind)} · {dateFmt[s.id]}</div>
          <div style={{ margin: '4px 0 8px', fontWeight: 600, color: s.status === 'approved' ? '#1c6b34' : s.status === 'rejected' ? '#a3341f' : s.status === 'changes_requested' ? '#9a5a12' : '#4a463d' }}>{statusLabel(L, s.status)}</div>
          <div style={{ fontSize: 14.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
            {s.kind === 'description' ? String(s.payload.text || '')
              : s.kind === 'photos' ? ((s.payload.urls as string[]) || []).join('\n')
              : <><b>{String(s.payload.title || '')}</b>{'\n'}{String(s.payload.body || '')}</>}
          </div>
          {s.desk_note ? <p style={{ fontSize: 14, margin: '10px 0 0' }}><b>{L.deskNote}:</b> {s.desk_note}</p> : null}
          {s.status === 'approved' ? <p className="bz-ok" style={{ marginTop: 8 }}>{s.applied ? L.applied : L.newsApproved}</p> : null}
          {editing === s.id ? <div style={{ marginTop: 12 }}><ProposalForm L={L} locale={locale} listings={listings} revise={s} onDone={() => setEditing('')} /></div> : (
            <div className="bz-row" style={{ marginTop: 10 }}>
              {s.status === 'changes_requested' ? <button className="bz-btn" onClick={() => setEditing(s.id)}>{L.revise}</button> : null}
              {s.status === 'submitted' || s.status === 'changes_requested' ? <button className="bz-ghost" disabled={busy === s.id} onClick={() => withdraw(s.id)}>{L.withdraw}</button> : null}
            </div>
          )}
        </div>
      ))}
      <style>{css}</style>
    </div>
  );
}

export interface Lead { id: string; listing_name: string | null; listing_slug: string; name: string; email: string; message: string | null; status: string; date: string }
export function LeadList({ L, leads }: { L: L; leads: Lead[] }) {
  const [status, setStatus] = useState<Record<string, string>>(Object.fromEntries(leads.map((l) => [l.id, l.status])));
  const [err, setErr] = useState('');
  async function change(id: string, next: string) {
    const prev = status[id];
    setStatus({ ...status, [id]: next }); setErr('');
    const { status: code, d } = await post('/api/business/leads', { id, status: next }).catch(() => ({ status: 500, d: {} as Record<string, unknown> }));
    if (code === 401) { window.location.reload(); return; }
    if (!(code === 200 && d.ok)) { setStatus((s) => ({ ...s, [id]: prev })); setErr(L.errGeneric); }
  }
  if (!leads.length) return <p style={{ margin: 0, color: '#6b6555' }}>{L.noLeads}<style>{css}</style></p>;
  return (
    <div className="bz" style={{ maxWidth: 720 }}>
      {err ? <p className="bz-err" role="alert">{err}</p> : null}
      {leads.map((l) => (
        <div key={l.id} style={{ border: '1px solid #e6e0d2', borderRadius: 6, padding: '14px 16px', background: '#fff' }}>
          <div style={{ fontSize: 13.5, color: '#6b6555' }}>{l.listing_name || l.listing_slug} · {l.date}</div>
          <div style={{ margin: '4px 0' }}><b>{l.name}</b> · <a href={`mailto:${l.email}`} style={{ color: '#8a7a4a' }}>{l.email}</a></div>
          {l.message ? <div style={{ fontSize: 14.5, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{l.message}</div> : null}
          <div className="bz-row" style={{ marginTop: 10 }}>
            <a className="bz-ghost" style={{ textDecoration: 'none' }} href={`mailto:${l.email}`}>{L.leadReply}</a>
            <label style={{ flexDirection: 'row', alignItems: 'center' }}>{L.leadStatus}
              <select value={status[l.id]} onChange={(e) => change(l.id, e.target.value)} style={{ minWidth: 0 }}>
                <option value="new">{L.stNew}</option><option value="seen">{L.stSeen}</option><option value="replied">{L.stReplied}</option><option value="closed">{L.stClosed}</option>
              </select>
            </label>
          </div>
        </div>
      ))}
      <style>{css}</style>
    </div>
  );
}
