'use client';
// Admin → Bookings: the request queue (English). Members with an active entitlement come first (priority lane), then the
// standard lane; each row carries its first-reply SLA timer. Open a row to assign, reply, ask partners (magic links),
// share their answers with the guest, confirm, and record the commission (record only — nothing here pays anyone).
import { useCallback, useEffect, useState } from 'react';

interface Booking {
  id: string; ref: string; created_at: string; locale: string; guest_name: string | null; guest_email: string | null; guest_phone: string | null;
  query: string; note: string | null; category: string | null; district: string | null; tier: string; lane: 'member' | 'standard'; status: string;
  assigned_to: string | null; first_response_due_at: string; first_response_at: string | null; sla_state: string; sla_left: string;
}
interface Partner {
  id: string; partner_name: string; partner_email: string | null; partner_locale: string; status: string; email_status: string; sent_at: string | null; expires_at: string;
  quote_amount_cents: number | null; response_note: string | null; shared_with_guest: boolean; link: string; reminded_at: string | null; responded_at: string | null;
}
interface Ledger { id: string; partner_name: string; partner_request_id: string | null; gross_cents: number; rate_bps: number; commission_cents: number; status: string; note: string | null; void_reason: string | null; created_at: string }
interface Ev { id: string; at: string; actor: string; kind: string; detail: Record<string, unknown> | null }
interface Detail {
  booking: Booking; guestLink: string; partners: Partner[]; ledger: Ledger[]; events: Ev[];
  totals: { expectedCents: number; confirmedCents: number; grossCents: number; entries: number; voided: number };
}
interface Summary { open: number; memberOpen: number; standardOpen: number; unanswered: number; breached: number; standardBreached: number }

const STATUS_NEXT: Record<string, string[]> = {
  new: ['in_progress', 'awaiting_partner', 'cancelled', 'closed'], in_progress: ['awaiting_partner', 'quote_ready', 'confirmed', 'cancelled', 'closed'],
  awaiting_partner: ['in_progress', 'quote_ready', 'confirmed', 'cancelled', 'closed'], quote_ready: ['in_progress', 'awaiting_partner', 'confirmed', 'cancelled', 'closed'],
  confirmed: ['completed', 'cancelled', 'in_progress'], completed: [], cancelled: ['in_progress'], closed: ['in_progress'],
};
const eur = (c: number) => `€${(c / 100).toFixed(2)}`;
const SLA_COLOR: Record<string, string> = { breached: '#b3261e', due_soon: '#b26a00', on_track: '#1c6b34', met: '#1c6b34', met_late: '#8a6d00', not_applicable: '#8a8371' };
const SLA_TEXT: Record<string, string> = { breached: 'OVERDUE', due_soon: 'due soon', on_track: 'on track', met: 'replied in time', met_late: 'replied late', not_applicable: '—' };
const btn: React.CSSProperties = { padding: '5px 10px', borderRadius: 6, cursor: 'pointer', border: '1px solid var(--line,#e3d9c4)', background: 'transparent', color: 'inherit' };
const inp: React.CSSProperties = { padding: '6px 8px', borderRadius: 6, border: '1px solid var(--line,#e3d9c4)', background: 'transparent', color: 'inherit', font: 'inherit' };

export default function BookingsDesk() {
  const [queue, setQueue] = useState<Booking[]>([]);
  const [others, setOthers] = useState<Booking[]>([]);
  const [sum, setSum] = useState<Summary | null>(null);
  const [view, setView] = useState<'queue' | 'finished'>('queue');
  const [open, setOpen] = useState<string | null>(null);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const r = await fetch('/api/admin/bookings', { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (j.ok) { setQueue(j.queue); setOthers(j.others); setSum(j.summary); } else setMsg(j.error || 'Could not load the queue.');
    setLoading(false);
  }, []);
  const loadDetail = useCallback(async (id: string) => {
    const r = await fetch(`/api/admin/bookings?id=${id}`, { cache: 'no-store' });
    const j = await r.json().catch(() => ({}));
    if (j.ok) setDetail(j as Detail); else setMsg(j.error || 'Could not load the booking.');
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (open) loadDetail(open); else setDetail(null); }, [open, loadDetail]);

  async function act(body: Record<string, unknown>, okText = 'Saved.'): Promise<boolean> {
    setMsg('');
    const r = await fetch('/api/admin/bookings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!j.ok) { setMsg(j.error || 'Failed.'); return false; }
    setMsg(j.emailed === false ? 'Saved — the e-mail did NOT go out; copy the link below and send it yourself.' : okText);
    await Promise.all([load(), open ? loadDetail(open) : Promise.resolve()]);
    return true;
  }

  const rows = view === 'queue' ? queue : others;
  return (
    <>
      <h1>Bookings</h1>
      <p className="sub">Concierge requests that left a way to reach the guest. <b>Signed-in members with an active entitlement are always listed first</b> (priority lane); within a lane, requests still waiting for a first personal reply come first, earliest deadline first.</p>

      {sum ? (
        <div className="cards">
          <div className="stat"><div className="n">{sum.open}</div><div className="k">open</div></div>
          <div className="stat"><div className="n" style={{ color: '#C9A24C' }}>{sum.memberOpen}</div><div className="k">member lane</div></div>
          <div className="stat"><div className="n">{sum.standardOpen}</div><div className="k">standard lane</div></div>
          <div className="stat"><div className="n">{sum.unanswered}</div><div className="k">no first reply yet</div></div>
          <div className="stat"><div className="n" style={{ color: sum.breached ? '#b3261e' : undefined }}>{sum.breached}</div><div className="k">overdue</div></div>
        </div>
      ) : null}
      {sum && sum.standardBreached > 0 ? (
        <p style={{ margin: '10px 0', padding: '8px 12px', border: '1px solid #b3261e', borderRadius: 6, color: '#b3261e' }}>
          {sum.standardBreached} standard request(s) are past their first-reply target. Members are served first by design — check that nothing is being neglected.
        </p>
      ) : null}

      <div style={{ display: 'flex', gap: 8, margin: '14px 0', flexWrap: 'wrap', alignItems: 'center' }}>
        {(['queue', 'finished'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)} style={{ ...btn, borderRadius: 999, padding: '6px 12px', textTransform: 'capitalize', borderColor: view === v ? '#C9A24C' : undefined, background: view === v ? 'rgba(201,162,76,.12)' : 'transparent' }}>{v === 'queue' ? 'Queue' : 'Confirmed / finished'}</button>
        ))}
        <button onClick={load} style={{ ...btn, marginInlineStart: 'auto', borderRadius: 999 }}>↻ Refresh</button>
        {msg ? <span role="status" style={{ fontSize: 13 }}>{msg}</span> : null}
      </div>

      <table className="adm-t">
        <thead><tr><th>#</th><th>Lane</th><th>Request</th><th>Guest</th><th>Status</th><th>First reply</th><th>Assigned</th><th></th></tr></thead>
        <tbody>
          {rows.map((b, i) => (
            <tr key={b.id} style={b.lane === 'member' ? { background: 'rgba(201,162,76,.06)' } : undefined}>
              <td>{view === 'queue' ? i + 1 : ''}<div style={{ fontSize: 11, opacity: .6 }}>{b.ref}</div></td>
              <td>{b.lane === 'member'
                ? <span style={{ padding: '1px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#0B0E11', background: 'linear-gradient(180deg,#E4D2AC,#C9A24C)' }}>★ MEMBER</span>
                : <span style={{ fontSize: 12, opacity: .7 }}>standard</span>}</td>
              <td style={{ maxWidth: 340 }}><div style={{ fontWeight: 600 }}>{b.query}</div><div style={{ fontSize: 11, opacity: .6 }}>{[b.category, b.district, b.tier === 'premium' ? 'premium' : ''].filter(Boolean).join(' · ')}</div></td>
              <td style={{ fontSize: 13 }}>{b.guest_name || '—'}<div style={{ opacity: .7 }}>{b.guest_email || b.guest_phone}</div></td>
              <td><span className="pill pending">{b.status.replace('_', ' ')}</span></td>
              <td style={{ whiteSpace: 'nowrap', color: SLA_COLOR[b.sla_state], fontWeight: b.sla_state === 'breached' ? 700 : 400 }}>{SLA_TEXT[b.sla_state]}<div style={{ fontSize: 12 }}>{b.sla_state === 'on_track' || b.sla_state === 'due_soon' || b.sla_state === 'breached' ? b.sla_left : ''}</div></td>
              <td style={{ fontSize: 13 }}>{b.assigned_to || <span style={{ opacity: .5 }}>—</span>}</td>
              <td><button style={btn} onClick={() => setOpen(open === b.id ? null : b.id)}>{open === b.id ? 'Close' : 'Work'}</button></td>
            </tr>
          ))}
          {!loading && rows.length === 0 ? <tr><td colSpan={8}>Nothing here.</td></tr> : null}
          {loading ? <tr><td colSpan={8}>Loading…</td></tr> : null}
        </tbody>
      </table>

      {open && detail ? <DetailPanel d={detail} act={act} /> : null}
    </>
  );
}

function DetailPanel({ d, act }: { d: Detail; act: (b: Record<string, unknown>, ok?: string) => Promise<boolean> }) {
  const b = d.booking;
  const [assignee, setAssignee] = useState(b.assigned_to || '');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [channel, setChannel] = useState('phone');
  const [p, setP] = useState({ partnerName: '', partnerEmail: '', partnerLocale: 'en', directorySlug: '' });
  const [com, setCom] = useState<Record<string, { gross: string; rate: string }>>({});
  const id = b.id;
  const box: React.CSSProperties = { border: '1px solid var(--line,#e3d9c4)', borderRadius: 8, padding: '14px 16px', marginTop: 14 };
  const copy = (t: string) => navigator.clipboard?.writeText(t).catch(() => undefined);
  const canCommission = b.status === 'confirmed' || b.status === 'completed';

  return (
    <div style={{ marginTop: 22 }}>
      <h2 style={{ marginBottom: 4 }}>{b.ref} {b.lane === 'member' ? '· ★ member priority lane' : '· standard lane'}</h2>
      <p style={{ margin: 0, fontSize: 14 }}>{b.query}{b.note ? ` — ${b.note}` : ''}</p>
      <p style={{ margin: '4px 0', fontSize: 13, opacity: .75 }}>
        {[b.guest_name, b.guest_email, b.guest_phone].filter(Boolean).join(' · ')} · language {b.locale} · target first reply by {new Date(b.first_response_due_at).toLocaleString()}
        {b.first_response_at ? ` · replied ${new Date(b.first_response_at).toLocaleString()}` : ''}
      </p>

      <div style={box}>
        <b>Handling</b>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, alignItems: 'center' }}>
          <input style={inp} value={assignee} onChange={(e) => setAssignee(e.target.value)} placeholder="Assigned to (name / e-mail)" />
          <button style={btn} onClick={() => act({ action: 'assign', id, assignee })}>Assign</button>
          <select style={inp} value="" onChange={(e) => e.target.value && act({ action: 'status', id, status: e.target.value }, 'Status updated.')}>
            <option value="">Status: {b.status.replace('_', ' ')} → …</option>
            {(STATUS_NEXT[b.status] || []).map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
          {!b.first_response_at ? (
            <>
              <select style={inp} value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option value="phone">phone</option><option value="whatsapp">WhatsApp</option><option value="email">e-mail (outside the panel)</option><option value="other">other</option>
              </select>
              <button style={btn} onClick={() => act({ action: 'first_reply', id, channel })}>Mark first reply done</button>
            </>
          ) : null}
        </div>
        <div style={{ marginTop: 10 }}>
          <textarea style={{ ...inp, width: '100%', boxSizing: 'border-box' }} rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={b.guest_email ? `Message to the guest (e-mailed in ${b.locale} template with a link to their status page; write it in their language). Counts as the first personal reply.` : 'This guest left no e-mail — reply by phone/WhatsApp and press “Mark first reply done”.'} />
          <button style={btn} disabled={!b.guest_email} onClick={async () => { if (await act({ action: 'message_guest', id, message }, 'Sent to the guest.')) setMessage(''); }}>Send to guest</button>
          <span style={{ fontSize: 12, opacity: .6, marginInlineStart: 10 }}>Guest status page: <a href={d.guestLink} target="_blank" rel="noreferrer">open</a> · <a href="#" onClick={(e) => { e.preventDefault(); copy(d.guestLink); }}>copy link</a></span>
        </div>
        <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
          <input style={{ ...inp, flex: 1 }} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Internal note (never shown to guest or partner)" />
          <button style={btn} onClick={async () => { if (await act({ action: 'note', id, text: note }, 'Note added.')) setNote(''); }}>Add note</button>
        </div>
      </div>

      <div style={box}>
        <b>Partners</b> <span style={{ fontSize: 12, opacity: .6 }}>— each gets a private reply link (no login). They see the request text, never the guest’s contact details. Answers reach the guest only when you tick “show to guest”.</span>
        {d.partners.map((x) => (
          <div key={x.id} style={{ borderTop: '1px solid var(--line,#e3d9c4)', marginTop: 10, paddingTop: 10, fontSize: 14 }}>
            <b>{x.partner_name}</b> <span className="pill pending">{x.status}</span>
            {x.quote_amount_cents ? <> · <b>{eur(x.quote_amount_cents)}</b></> : null}
            <span style={{ fontSize: 12, opacity: .65 }}> · {x.partner_email ? `e-mail ${x.email_status}` : 'no e-mail (paste the link)'} · expires {new Date(x.expires_at).toLocaleDateString()}{x.reminded_at ? ' · reminded' : ''}</span>
            {x.response_note ? <div style={{ fontSize: 13, margin: '4px 0', whiteSpace: 'pre-wrap' }}>“{x.response_note}”</div> : null}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4 }}>
              <button style={btn} onClick={() => copy(x.link)}>Copy reply link</button>
              {['accepted', 'quoted', 'alternative'].includes(x.status)
                ? <button style={btn} onClick={() => act({ action: 'share', id, partnerId: x.id, share: !x.shared_with_guest }, x.shared_with_guest ? 'Hidden from guest.' : 'Now visible on the guest’s status page.')}>{x.shared_with_guest ? '✓ shown to guest — hide' : 'Show to guest'}</button> : null}
            </div>
            {canCommission && ['accepted', 'quoted', 'alternative'].includes(x.status) && !d.ledger.some((l) => l.partner_request_id === x.id && l.status !== 'void') ? (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12 }}>Record commission:</span>
                <input style={{ ...inp, width: 110 }} placeholder={x.quote_amount_cents ? `gross € (${(x.quote_amount_cents / 100).toFixed(2)})` : 'gross €'} value={com[x.id]?.gross || ''} onChange={(e) => setCom({ ...com, [x.id]: { gross: e.target.value, rate: com[x.id]?.rate || '' } })} />
                <input style={{ ...inp, width: 80 }} placeholder="rate %" value={com[x.id]?.rate || ''} onChange={(e) => setCom({ ...com, [x.id]: { gross: com[x.id]?.gross || '', rate: e.target.value } })} />
                <button style={btn} onClick={() => act({ action: 'commission', id, partnerId: x.id, gross: com[x.id]?.gross || '', ratePercent: com[x.id]?.rate || '' }, 'Commission recorded.')}>Record</button>
              </div>
            ) : null}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12, alignItems: 'center' }}>
          <input style={inp} placeholder="Partner name" value={p.partnerName} onChange={(e) => setP({ ...p, partnerName: e.target.value })} />
          <input style={inp} placeholder="Partner e-mail (optional)" value={p.partnerEmail} onChange={(e) => setP({ ...p, partnerEmail: e.target.value })} />
          <select style={inp} value={p.partnerLocale} onChange={(e) => setP({ ...p, partnerLocale: e.target.value })}>
            {['en', 'el', 'ro', 'ar', 'de', 'pl', 'ru'].map((l) => <option key={l} value={l}>mail in {l}</option>)}
          </select>
          <input style={inp} placeholder="Directory slug (optional)" value={p.directorySlug} onChange={(e) => setP({ ...p, directorySlug: e.target.value })} />
          <button style={btn} onClick={async () => { if (await act({ action: 'partner_add', id, ...p }, 'Partner asked.')) setP({ ...p, partnerName: '', partnerEmail: '', directorySlug: '' }); }}>Ask partner</button>
        </div>
      </div>

      <div style={box}>
        <b>Commission ledger</b> <span style={{ fontSize: 12, opacity: .6 }}>— a record of what Cyprus Lifestyle expects to earn. Nothing here invoices, collects or pays anything.</span>
        {d.ledger.length === 0 ? <p style={{ fontSize: 13, opacity: .7 }}>No entries. {canCommission ? '' : 'Entries can be recorded once the booking is confirmed.'}</p> : (
          <table className="adm-t" style={{ marginTop: 8 }}>
            <thead><tr><th>Partner</th><th>Gross</th><th>Rate</th><th>Commission</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {d.ledger.map((l) => (
                <tr key={l.id} style={l.status === 'void' ? { opacity: .5, textDecoration: 'line-through' } : undefined}>
                  <td>{l.partner_name}</td><td>{eur(l.gross_cents)}</td><td>{(l.rate_bps / 100).toFixed(2)} %</td><td><b>{eur(l.commission_cents)}</b></td>
                  <td>{l.status}{l.void_reason ? ` (${l.void_reason})` : ''}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {l.status === 'expected' ? <button style={btn} onClick={() => act({ action: 'commission_confirm', id, ledgerId: l.id }, 'Confirmed.')}>Confirm</button> : null}{' '}
                    {l.status !== 'void' ? <button style={btn} onClick={() => { const reason = window.prompt('Reason for voiding this entry?'); if (reason) act({ action: 'commission_void', id, ledgerId: l.id, reason }, 'Voided.'); }}>Void</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p style={{ fontSize: 13, margin: '8px 0 0' }}>Expected {eur(d.totals.expectedCents)} · confirmed {eur(d.totals.confirmedCents)} · gross {eur(d.totals.grossCents)}</p>
      </div>

      <div style={box}>
        <b>History</b>
        <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0 0', fontSize: 13 }}>
          {d.events.map((e) => (
            <li key={e.id} style={{ padding: '3px 0', borderTop: '1px solid var(--line,#eee6d2)' }}>
              <span style={{ opacity: .6 }}>{new Date(e.at).toLocaleString()}</span> · <b>{e.kind.replace(/_/g, ' ')}</b> · {e.actor}
              {e.detail && Object.keys(e.detail).length ? <span style={{ opacity: .7 }}> — {Object.entries(e.detail).map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`).join(', ').slice(0, 220)}</span> : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
