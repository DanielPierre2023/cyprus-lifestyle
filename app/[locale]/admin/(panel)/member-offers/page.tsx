'use client';
import { useCallback, useEffect, useState } from 'react';

interface Offer {
  id: string; partner_name: string; offer_en: string; translations: Record<string, string> | null;
  valid_from: string | null; valid_to: string | null; active: boolean; live: boolean; redemptions: number; redemptions30d: number;
}
const TR = [['el', 'Greek'], ['ro', 'Romanian'], ['ar', 'Arabic'], ['de', 'German'], ['pl', 'Polish'], ['ru', 'Russian']] as const;
const EMPTY = { id: '', partner_name: '', offer_en: '', valid_from: '', valid_to: '', active: true, translations: {} as Record<string, string> };

export default function MemberOffersTab() {
  const [rows, setRows] = useState<Offer[]>([]);
  const [f, setF] = useState({ ...EMPTY });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/member-offers').then((x) => x.json()).catch(() => null);
    if (!r?.ok) { setErr(r?.error || 'Could not load offers (has migration 20261008100000_member_card_offers.sql been run?).'); return; }
    setRows(r.rows);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function post(body: Record<string, unknown>, done: string) {
    setBusy(true); setMsg(''); setErr('');
    const r = await fetch('/api/admin/member-offers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((x) => x.json()).catch(() => null);
    setBusy(false);
    if (!r?.ok) { setErr(r?.error || 'Failed.'); return false; }
    setMsg(done); await load(); return true;
  }
  const edit = (o: Offer) => { setF({ id: o.id, partner_name: o.partner_name, offer_en: o.offer_en, valid_from: o.valid_from || '', valid_to: o.valid_to || '', active: o.active, translations: { ...(o.translations || {}) } }); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const total = rows.reduce((s, o) => s + o.redemptions, 0);

  return (
    <>
      <h1>Member offers · partner offers on the member card</h1>
      <p className="sub">
        Offers shown on every member&apos;s card and on the verification page venue staff see. <b>There are none by default</b>, and while this list is empty the card says plainly that it only identifies the member and that offers are added over time.
        Only offers that are <b>active</b> and inside their dates are shown. Write only what the partner has agreed to honour: the site must never imply a discount that does not exist.
        Staff press <b>Redeem</b> on the verification page; the log keeps the offer and the time (one per member per offer per day), nothing personal.
      </p>
      {msg ? <p style={{ color: '#1c6b34' }}>{msg}</p> : null}
      {err ? <p style={{ color: '#9a2020' }}>⚠ {err}</p> : null}

      <h1 style={{ fontSize: 18 }}>{f.id ? 'Edit offer' : 'Add an offer'}</h1>
      <div className="row" style={{ marginBottom: 8 }}>
        <input placeholder="Partner name (e.g. Taverna Mylos)" maxLength={80} value={f.partner_name} onChange={(e) => setF({ ...f, partner_name: e.target.value })} style={{ flex: '1 1 240px' }} />
        <input placeholder="Valid from (YYYY-MM-DD, optional)" value={f.valid_from} onChange={(e) => setF({ ...f, valid_from: e.target.value })} style={{ flex: '0 1 200px' }} />
        <input placeholder="Valid to (YYYY-MM-DD, optional)" value={f.valid_to} onChange={(e) => setF({ ...f, valid_to: e.target.value })} style={{ flex: '0 1 200px' }} />
      </div>
      <div className="row" style={{ marginBottom: 8 }}>
        <textarea placeholder="The offer, in English (max 300 characters): exactly what the member gets, e.g. “A glass of local wine with a main course”" maxLength={300} rows={2} value={f.offer_en} onChange={(e) => setF({ ...f, offer_en: e.target.value })} style={{ flex: '1 1 100%' }} />
      </div>
      <details style={{ marginBottom: 8 }}>
        <summary>Translations (optional; a language without one shows the English text)</summary>
        {TR.map(([code, name]) => (
          <div className="row" key={code} style={{ margin: '6px 0' }}>
            <span style={{ width: 80 }}>{name}</span>
            <input maxLength={300} value={f.translations[code] || ''} onChange={(e) => setF({ ...f, translations: { ...f.translations, [code]: e.target.value } })} style={{ flex: '1 1 400px' }} />
          </div>
        ))}
      </details>
      <div className="row" style={{ marginBottom: 18 }}>
        <label><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> Active</label>
        <button className="abtn gold" disabled={busy || !f.partner_name || !f.offer_en}
          onClick={async () => { if (await post({ action: 'save', ...f }, f.id ? 'Offer saved.' : 'Offer added.')) setF({ ...EMPTY, translations: {} }); }}>{f.id ? 'Save changes' : 'Add offer'}</button>
        {f.id ? <button className="abtn ghost" onClick={() => setF({ ...EMPTY, translations: {} })}>Cancel</button> : null}
      </div>

      <table className="adm-t">
        <thead><tr><th>Partner</th><th>Offer</th><th>Valid</th><th>State</th><th>Redemptions</th><th>Last 30 days</th><th></th></tr></thead>
        <tbody>
          {rows.map((o) => (
            <tr key={o.id}>
              <td>{o.partner_name}</td>
              <td>{o.offer_en}{o.translations && Object.keys(o.translations).length ? <div style={{ fontSize: 11.5, opacity: .6 }}>+ {Object.keys(o.translations).join(', ')}</div> : null}</td>
              <td>{o.valid_from || '—'} → {o.valid_to || '—'}</td>
              <td><span className={`pill ${o.live ? 'ok' : 'failed'}`}>{o.live ? 'shown' : o.active ? 'outside dates' : 'off'}</span></td>
              <td>{o.redemptions}</td>
              <td>{o.redemptions30d}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button className="abtn ghost" onClick={() => edit(o)}>Edit</button>{' '}
                <button className="abtn ghost" disabled={busy} onClick={() => post({ action: 'toggle', id: o.id, active: !o.active }, o.active ? 'Offer switched off.' : 'Offer switched on.')}>{o.active ? 'Switch off' : 'Switch on'}</button>{' '}
                {o.redemptions === 0 ? <button className="abtn ghost" disabled={busy} onClick={() => confirm(`Delete the offer from ${o.partner_name}?`) && post({ action: 'delete', id: o.id }, 'Offer deleted.')}>Delete</button> : null}
              </td>
            </tr>
          ))}
          {rows.length === 0 ? <tr><td colSpan={7}>No offers yet. Members see a plain card that identifies them; nothing is promised.</td></tr> : null}
        </tbody>
      </table>
      {rows.length ? <p className="sub">{total} redemption(s) in total.</p> : null}
    </>
  );
}
