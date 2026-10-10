'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

// MODEL PIECES — the editor-in-chief's standard of a desk (table style_exemplars, read by the article desk; see lib/journalism/exemplars.ts).
// A piece reaches the writers only while it is switched on here. Everything goes through the admin session-gated route /api/admin/exemplars.
// The page shows (1) how many pieces are on per desk and language, (2) a form for a piece of your own, (3) a way to take a published
// article as seven pieces (one per edition), (4) the list, with reading, editing, switching on and off, and deleting.

export interface Piece {
  id: string; desk: string; lang: string; title: string; article_type: string | null; note: string | null; source_post_id: string | null;
  active: boolean; words: number; preview: string; created_at: string; updated_at: string;
}
interface Full { id: string; desk: string; lang: string; title: string; body: string; article_type: string | null; note: string | null; active: boolean }
export interface PostOption { id: string; slug: string; title: string; category: string }
interface Reply { ok: boolean; error?: string; note?: string; added?: number; pieces?: Piece[]; piece?: Full }

/** Aim per desk: this many ACTIVE pieces in English (other languages fall back to the English ones). */
const TARGET_MIN = 3;
const TARGET_MAX = 5;

async function call(method: string, url: string, body?: unknown): Promise<Reply> {
  try {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    const d = (await r.json().catch(() => ({}))) as Reply;
    return r.ok && d.ok !== false ? { ...d, ok: true } : { ok: false, error: d.error || `HTTP ${r.status}` };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

const chip: React.CSSProperties = { fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, color: '#0B0E11', background: 'transparent', border: '1px solid #cfc7b3', borderRadius: 4, padding: '3px 9px', cursor: 'pointer', lineHeight: 1.3 };
const box: React.CSSProperties = { background: '#fff', border: '1px solid #e3ddcf', borderRadius: 4, padding: '14px 16px', marginBottom: 16 };
const head: React.CSSProperties = { display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #C9A24C', paddingBottom: 6, margin: '22px 0 10px', gap: 16, flexWrap: 'wrap' };

export default function ExemplarManager({ desks, langs, types, posts }: { desks: readonly string[]; langs: readonly string[]; types: readonly string[]; posts: PostOption[] }) {
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState('');
  const [fDesk, setFDesk] = useState('');
  const [onlyActive, setOnlyActive] = useState(false);
  const [open, setOpen] = useState<Full | null>(null);
  const [openBusy, setOpenBusy] = useState(false);
  // the form for a piece of your own
  const [nDesk, setNDesk] = useState(desks[0] || 'cyprus');
  const [nLang, setNLang] = useState('en');
  const [nType, setNType] = useState('');
  const [nTitle, setNTitle] = useState('');
  const [nBody, setNBody] = useState('');
  const [nNote, setNNote] = useState('');
  // the form to take a published article
  const [postId, setPostId] = useState('');
  const [postDesk, setPostDesk] = useState('');

  const load = useCallback(async () => {
    const d = await call('GET', '/api/admin/exemplars');
    if (!d.ok) { setLoadError(d.error || 'Could not load the pieces.'); setPieces([]); return; }
    setLoadError(''); setPieces(d.pieces || []);
  }, []);
  useEffect(() => { void load(); }, [load]);

  const say = (ok: boolean, text: string) => setMsg({ ok, text });
  async function act(key: string, fn: () => Promise<Reply>, done: (d: Reply) => string): Promise<boolean> {
    setBusy(key); setMsg(null);
    const d = await fn();
    setBusy('');
    if (!d.ok) { say(false, d.error || 'Failed.'); return false; }
    say(true, done(d));
    await load();
    return true;
  }

  const toggle = (p: Piece) => act(`t${p.id}`, () => call('PATCH', '/api/admin/exemplars', { id: p.id, active: !p.active }),
    () => (p.active ? 'Switched off: the writers no longer see this piece.' : 'Switched on: the writers see this piece from the next article on.'));
  const remove = async (p: Piece) => {
    if (!window.confirm(`Delete the piece “${p.title}” for good?`)) return;
    if (await act(`d${p.id}`, () => call('DELETE', `/api/admin/exemplars?id=${encodeURIComponent(p.id)}`), () => 'Deleted.') && open?.id === p.id) setOpen(null);
  };
  const read = async (p: Piece) => {
    if (open?.id === p.id) { setOpen(null); return; }
    setOpenBusy(true); setMsg(null);
    const d = await call('GET', `/api/admin/exemplars?id=${encodeURIComponent(p.id)}`);
    setOpenBusy(false);
    if (!d.ok || !d.piece) { say(false, d.error || 'Could not load the piece.'); return; }
    setOpen(d.piece);
  };
  const saveOpen = () => open && act('save', () => call('PATCH', '/api/admin/exemplars', { id: open.id, title: open.title, body: open.body, desk: open.desk, note: open.note || '', articleType: open.article_type || '' }), () => 'Saved.');
  const addOwn = async () => {
    const ok = await act('add', () => call('POST', '/api/admin/exemplars', { action: 'create', desk: nDesk, lang: nLang, title: nTitle, body: nBody, articleType: nType, note: nNote }), (d) => d.note || 'Added.');
    if (ok) { setNTitle(''); setNBody(''); setNNote(''); }
  };
  const takePost = async () => {
    if (!postId) { say(false, 'Choose a published article first.'); return; }
    const ok = await act('post', () => call('POST', '/api/admin/exemplars', { action: 'from_post', postId, desk: postDesk }), (d) => `${d.added} edition${d.added === 1 ? '' : 's'} added as inactive pieces. ${d.note || ''}`);
    if (ok) setPostId('');
  };

  // how many pieces are on, per desk and language
  const matrix = useMemo(() => {
    const m = new Map<string, { on: number; all: number }>();
    for (const p of pieces || []) { const k = `${p.desk}|${p.lang}`; const c = m.get(k) || { on: 0, all: 0 }; c.all++; if (p.active) c.on++; m.set(k, c); }
    return m;
  }, [pieces]);
  const shown = useMemo(() => (pieces || []).filter((p) => (!fDesk || p.desk === fDesk) && (!onlyActive || p.active)), [pieces, fDesk, onlyActive]);
  const totalOn = (pieces || []).filter((p) => p.active).length;

  const status = (desk: string) => {
    const en = matrix.get(`${desk}|en`)?.on || 0;
    if (desk === '*') return null;
    if (en >= TARGET_MIN && en <= TARGET_MAX) return <span className="pill ok">ready</span>;
    if (en > TARGET_MAX) return <span className="pill info">{en} on, enough</span>;
    if (en > 0) return <span className="pill warn">{TARGET_MIN - en} more</span>;
    return <span className="pill pending">none yet</span>;
  };

  return (
    <>
      {msg && <div role="status" style={{ ...box, borderColor: msg.ok ? '#b9dcc2' : '#e8b9b9', background: msg.ok ? '#f1faf3' : '#fdf3f3', color: msg.ok ? '#1c6b34' : '#9a2020', padding: '10px 14px' }}>{msg.text}</div>}
      {loadError && <div style={{ ...box, borderColor: '#e8b9b9', background: '#fdf3f3', color: '#9a2020' }}>{loadError}</div>}

      <div style={head}>
        <h1 style={{ fontSize: 18, margin: 0 }}>What the writers see</h1>
        <span className="sub" style={{ margin: 0 }}>{pieces === null ? 'Loading…' : `${totalOn} piece${totalOn === 1 ? '' : 's'} switched on`}</span>
      </div>
      <table className="adm-t">
        <thead><tr><th>Desk</th>{langs.map((l) => <th key={l}>{l.toUpperCase()}</th>)}<th>English target</th></tr></thead>
        <tbody>
          {desks.map((d) => (
            <tr key={d}>
              <td style={{ fontWeight: 600 }}>{d === '*' ? 'every desk (*)' : d}</td>
              {langs.map((l) => {
                const c = matrix.get(`${d}|${l}`);
                return <td key={l} style={{ color: c?.on ? '#1c6b34' : '#8a8371', fontWeight: c?.on ? 600 : 400 }}>{c ? `${c.on}${c.all > c.on ? ` / ${c.all}` : ''}` : '–'}</td>;
              })}
              <td>{status(d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="sub" style={{ marginTop: 8, fontSize: 12.5 }}>
        Each cell shows the pieces switched on (and, after the slash, the pieces waiting). The aim is {TARGET_MIN}–{TARGET_MAX} switched-on pieces per desk, English at least:
        a desk without pieces in a language shows the writer the English ones, and only takes their quality, not their language.
        A piece with the desk “every desk (*)” is shown to all desks. The writers see up to two pieces per article, rotating, so the same two do not shape every story.
      </p>

      <div style={head}><h1 style={{ fontSize: 18, margin: 0 }}>Add a piece</h1><span className="sub" style={{ margin: 0 }}>It is added switched off. Read it once more, then switch it on in the list.</span></div>
      <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
        <div style={{ ...box, flex: '1 1 520px', marginBottom: 0 }}>
          <strong style={{ fontSize: 13.5 }}>A piece of your own</strong>
          <div className="row" style={{ marginTop: 10 }}>
            <div style={{ flex: '1 1 130px' }}><label className="fl">Desk</label>
              <select value={nDesk} onChange={(e) => setNDesk(e.target.value)}>{desks.map((d) => <option key={d} value={d}>{d === '*' ? 'every desk (*)' : d}</option>)}</select></div>
            <div style={{ flex: '1 1 110px' }}><label className="fl">Language</label>
              <select value={nLang} onChange={(e) => setNLang(e.target.value)}>{langs.map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}</select></div>
            <div style={{ flex: '1 1 130px' }}><label className="fl">Type (optional)</label>
              <select value={nType} onChange={(e) => setNType(e.target.value)}><option value="">any</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <label className="fl">Headline</label>
          <input value={nTitle} maxLength={300} onChange={(e) => setNTitle(e.target.value)} placeholder="The headline, as it would be published" />
          <label className="fl">Text (paragraphs separated by a blank line; at least 200 characters)</label>
          <textarea value={nBody} rows={9} onChange={(e) => setNBody(e.target.value)} placeholder="The finished piece, in the language chosen above" />
          <label className="fl">Why this piece sets the standard (optional, for you)</label>
          <input value={nNote} maxLength={600} onChange={(e) => setNNote(e.target.value)} placeholder="e.g. lead is the news plus the number; ends on a hard fact" />
          <button type="button" className="abtn gold" disabled={busy === 'add'} onClick={() => void addOwn()}>{busy === 'add' ? '…' : 'Add (switched off)'}</button>
        </div>
        <div style={{ ...box, flex: '1 1 320px', marginBottom: 0 }}>
          <strong style={{ fontSize: 13.5 }}>Take a published article</strong>
          <p className="sub" style={{ margin: '6px 0 10px', fontSize: 12.5 }}>Copies the editions of one of our published articles as pieces (switched off): the quickest way to set a standard from work you are proud of.</p>
          <label className="fl">Article</label>
          <select value={postId} onChange={(e) => { setPostId(e.target.value); setPostDesk(posts.find((p) => p.id === e.target.value)?.category || ''); }}>
            <option value="">Choose…</option>
            {posts.map((p) => <option key={p.id} value={p.id}>{p.title.length > 70 ? `${p.title.slice(0, 69)}…` : p.title}</option>)}
          </select>
          <label className="fl">Desk</label>
          <select value={postDesk} onChange={(e) => setPostDesk(e.target.value)}>
            <option value="">from the article’s category</option>
            {desks.map((d) => <option key={d} value={d}>{d === '*' ? 'every desk (*)' : d}</option>)}
          </select>
          <button type="button" className="abtn gold" disabled={busy === 'post' || !postId} onClick={() => void takePost()}>{busy === 'post' ? '…' : 'Add its editions (switched off)'}</button>
        </div>
      </div>

      <div style={head}>
        <h1 style={{ fontSize: 18, margin: 0 }}>The pieces</h1>
        <span className="row" style={{ margin: 0, gap: 14 }}>
          <select value={fDesk} onChange={(e) => setFDesk(e.target.value)} style={{ width: 'auto', margin: 0 }}>
            <option value="">all desks</option>{desks.map((d) => <option key={d} value={d}>{d === '*' ? 'every desk (*)' : d}</option>)}
          </select>
          <label style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}><input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} style={{ width: 'auto', margin: 0 }} /> only switched on</label>
        </span>
      </div>
      <table className="adm-t">
        <thead><tr><th>On</th><th>Desk</th><th>Lang</th><th>Headline</th><th>Type</th><th>Words</th><th></th></tr></thead>
        <tbody>
          {shown.map((p) => (
            <tr key={p.id}>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button type="button" style={{ ...chip, background: p.active ? '#dff2e3' : 'transparent', color: p.active ? '#1c6b34' : '#6b6552', borderColor: p.active ? '#b9dcc2' : '#cfc7b3' }} disabled={busy === `t${p.id}`} onClick={() => void toggle(p)}
                  title={p.active ? 'Switched on: the writers see this piece. Click to switch off.' : 'Switched off: the writers do not see this piece. Click to switch on.'}>
                  {busy === `t${p.id}` ? '…' : p.active ? 'ON' : 'off'}
                </button>
              </td>
              <td>{p.desk === '*' ? 'every desk' : p.desk}</td>
              <td>{p.lang.toUpperCase()}</td>
              <td style={{ maxWidth: 520 }}>
                <div style={{ fontWeight: 600 }}>{p.title}</div>
                <div className="sub" style={{ margin: '3px 0 0', fontSize: 12.5, fontWeight: 400 }}>{p.preview.length >= 400 ? `${p.preview.slice(0, 220)}…` : p.preview.slice(0, 220)}</div>
                {p.note ? <div className="sub" style={{ margin: '3px 0 0', fontSize: 12, color: '#8a6d1f' }}>{p.note}</div> : null}
              </td>
              <td>{p.article_type || '–'}</td>
              <td>{p.words}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button type="button" style={chip} disabled={openBusy} onClick={() => void read(p)}>{open?.id === p.id ? 'Close' : 'Read / edit'}</button>{' '}
                <button type="button" style={{ ...chip, color: '#9a2020', borderColor: '#e8b9b9' }} disabled={busy === `d${p.id}`} onClick={() => void remove(p)}>Delete</button>
              </td>
            </tr>
          ))}
          {pieces !== null && shown.length === 0 ? <tr><td colSpan={7} className="sub" style={{ margin: 0 }}>{pieces.length ? 'No piece matches this filter.' : 'No pieces yet. Add one above; until a piece is switched on, the writers work without model pieces.'}</td></tr> : null}
          {pieces === null ? <tr><td colSpan={7} className="sub" style={{ margin: 0 }}>Loading…</td></tr> : null}
        </tbody>
      </table>

      {open && (
        <div style={{ ...box, marginTop: 16, borderColor: '#C9A24C' }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>Read and edit · {open.lang.toUpperCase()} · {open.active ? 'switched on' : 'switched off'}</strong>
            <span className="sub" style={{ margin: 0, fontSize: 12 }}>Saving an edit keeps the on/off state. Switch a piece off before you rework it heavily.</span>
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <div style={{ flex: '1 1 140px' }}><label className="fl">Desk</label>
              <select value={open.desk} onChange={(e) => setOpen({ ...open, desk: e.target.value })}>{desks.map((d) => <option key={d} value={d}>{d === '*' ? 'every desk (*)' : d}</option>)}</select></div>
            <div style={{ flex: '1 1 140px' }}><label className="fl">Type</label>
              <select value={open.article_type || ''} onChange={(e) => setOpen({ ...open, article_type: e.target.value || null })}><option value="">any</option>{types.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <label className="fl">Headline</label>
          <input value={open.title} maxLength={300} onChange={(e) => setOpen({ ...open, title: e.target.value })} />
          <label className="fl">Text</label>
          <textarea value={open.body} rows={14} onChange={(e) => setOpen({ ...open, body: e.target.value })} dir={open.lang === 'ar' ? 'rtl' : 'ltr'} />
          <label className="fl">Note (for you)</label>
          <input value={open.note || ''} maxLength={600} onChange={(e) => setOpen({ ...open, note: e.target.value })} />
          <button type="button" className="abtn gold" disabled={busy === 'save'} onClick={() => void saveOpen()}>{busy === 'save' ? '…' : 'Save'}</button>
          <button type="button" className="abtn ghost" onClick={() => setOpen(null)}>Close</button>
        </div>
      )}
    </>
  );
}
