'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

// Editorial Studio — AI-assisted, at the magazine's standard.
//   • Interview questions: analyses a specific business, writes a tailored brief.
//   • Interview write-up: raw transcript → publication-grade article.
//   • Review: reviewer's notes → a considered review.
// Generation runs server-side (isAdmin route → edge function). Drafts are saved
// to editorial_pieces for editing before they become articles. Vendor-neutral.

type Row = Record<string, any>;
type Mode = 'questions' | 'interview' | 'review';

const MODES: [Mode, string, string][] = [
  ['questions', 'Interview questions', 'Analyse a business, then generate a tailored, top-tier interview brief.'],
  ['interview', 'Interview write-up', 'Paste a raw interview; get a finished, publication-grade article.'],
  ['review', 'Review', 'Turn your visit notes into a review at the highest journalistic level.'],
];
const BLANK_BIZ = { id: '', name: '', category: '', district: '', website: '', notes: '' };

export default function EditorialStudio() {
  const sb = supabaseBrowser();
  const [mode, setMode] = useState<Mode>('questions');
  const [orgs, setOrgs] = useState<Row[]>([]);
  const [orgFilter, setOrgFilter] = useState('');
  const [biz, setBiz] = useState<Row>({ ...BLANK_BIZ });
  const [transcript, setTranscript] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Row | null>(null);
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState<Row[]>([]);
  const [savedError, setSavedError] = useState('');

  const loadOrgs = useCallback(async () => {
    const { data } = await sb.from('crm_orgs').select('id, name, category, district, website, notes').order('name').limit(1000);
    setOrgs((data as Row[]) || []);
  }, [sb]);
  const loadSaved = useCallback(async () => {
    const { data, error } = await sb.from('editorial_pieces').select('id, kind, business_name, category, title, status, created_at').order('created_at', { ascending: false }).limit(40);
    if (error) { setSavedError(error.message); return; }
    setSavedError(''); setSaved((data as Row[]) || []);
  }, [sb]);
  useEffect(() => { loadOrgs(); loadSaved(); }, [loadOrgs, loadSaved]);

  function pickOrg(id: string) {
    const o = orgs.find((x) => x.id === id);
    if (!o) { setBiz({ ...BLANK_BIZ }); return; }
    setBiz({ id: o.id, name: o.name || '', category: o.category || '', district: o.district || '', website: o.website || '', notes: o.notes || '' });
  }
  const setB = (k: string, v: string) => setBiz((b) => ({ ...b, [k]: v }));

  async function generate() {
    if (!biz.name.trim()) { setMsg('Pick or name a business first.'); return; }
    if (mode === 'interview' && !transcript.trim()) { setMsg('Paste the raw interview first.'); return; }
    if (mode === 'review' && !notes.trim()) { setMsg('Add your review notes first.'); return; }
    setBusy(true); setMsg('Working — the studio is writing…'); setResult(null);
    try {
      const res = await fetch('/api/admin/editorial', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, business: biz, transcript, notes }),
      });
      const d = await res.json();
      if (!d.ok) { setMsg(d.error || 'Generation failed'); setBusy(false); return; }
      setResult(d.result || {}); setMsg('');
    } catch (e) { setMsg((e as Error).message); }
    setBusy(false);
  }

  async function save() {
    if (!result) return;
    const title = result.title || (mode === 'questions' ? `Interview brief — ${biz.name}` : biz.name);
    const { error } = await sb.from('editorial_pieces').insert({
      kind: mode, org_id: biz.id || null, business_name: biz.name || null,
      category: biz.category || null, title, result, status: 'draft',
    });
    if (error) { setMsg(error.message); return; }
    setMsg('Saved to drafts.'); loadSaved();
  }
  async function removeSaved(id: string) {
    if (!confirm('Delete this draft?')) return;
    await sb.from('editorial_pieces').delete().eq('id', id); loadSaved();
  }

  const shownOrgs = orgFilter.trim()
    ? orgs.filter((o) => (o.name || '').toLowerCase().includes(orgFilter.toLowerCase()))
    : orgs;

  return (
    <>
      <h1>Editorial Studio</h1>
      <p className="sub">AI-assisted, at the magazine's standard — interview briefs, interview write-ups and reviews. Everything is saved as a draft for your edit before it becomes an article.</p>

      <div className="row" style={{ gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {MODES.map(([m, label]) => (
          <button key={m} type="button" className={`abtn ${mode === m ? 'gold' : 'ghost'}`} onClick={() => { setMode(m); setResult(null); setMsg(''); }}>{label}</button>
        ))}
      </div>
      <p style={{ fontSize: 13, color: '#8a8371', marginTop: -8, marginBottom: 14 }}>{MODES.find(([m]) => m === mode)?.[2]}</p>

      <div style={{ background: '#fff', border: '1px solid #e3ddcf', borderRadius: 6, padding: 16, marginBottom: 18 }}>
        <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ flex: '2 1 260px' }}>
            <label className="fl">Business (from your contact book)</label>
            <input placeholder="filter by name…" value={orgFilter} onChange={(e) => setOrgFilter(e.target.value)} style={{ marginBottom: 6 }} />
            <select value={biz.id} onChange={(e) => pickOrg(e.target.value)}>
              <option value="">— pick a business, or type below —</option>
              {shownOrgs.slice(0, 300).map((o) => <option key={o.id} value={o.id}>{o.name}{o.category ? ` · ${o.category}` : ''}</option>)}
            </select>
          </div>
        </div>
        <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginTop: 8 }}>
          <div style={{ flex: '2 1 220px' }}><label className="fl">Business name *</label><input value={biz.name} onChange={(e) => setB('name', e.target.value)} /></div>
          <div style={{ flex: '1 1 150px' }}><label className="fl">Category</label><input value={biz.category} onChange={(e) => setB('category', e.target.value)} /></div>
          <div style={{ flex: '1 1 130px' }}><label className="fl">District</label><input value={biz.district} onChange={(e) => setB('district', e.target.value)} /></div>
          <div style={{ flex: '2 1 220px' }}><label className="fl">Website</label><input value={biz.website} onChange={(e) => setB('website', e.target.value)} placeholder="https://…" /></div>
        </div>

        {mode === 'interview' && (
          <div style={{ marginTop: 10 }}>
            <label className="fl">Raw interview (paste the questions & answers, or your notes)</label>
            <textarea rows={10} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Q: … A: …" style={{ fontFamily: 'ui-monospace, monospace', fontSize: 13 }} />
          </div>
        )}
        {mode === 'review' && (
          <div style={{ marginTop: 10 }}>
            <label className="fl">Your review notes (what you saw, ate, felt — the specifics)</label>
            <textarea rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="The room, the service, the standout dishes, the misses…" />
          </div>
        )}

        <div className="row" style={{ marginTop: 12, alignItems: 'center', gap: 10 }}>
          <button className="abtn gold" type="button" disabled={busy} onClick={generate}>{busy ? 'Writing…' : 'Generate'}</button>
          {result ? <button className="abtn" type="button" onClick={save}>Save to drafts</button> : null}
          {msg ? <span style={{ fontSize: 13, color: msg.includes('Saved') ? '#1c6b34' : '#9a2020' }}>{msg}</span> : null}
        </div>
      </div>

      {result && (
        <div style={{ background: '#fff', border: '1px solid #e3ddcf', borderRadius: 6, padding: 18, marginBottom: 22 }}>
          {mode === 'questions' ? (
            <>
              {result.analysis ? <p style={{ fontStyle: 'italic', color: '#5b5647', marginTop: 0 }}>{result.analysis}</p> : null}
              {Array.isArray(result.questions) && result.questions.length ? (
                <ol style={{ paddingLeft: 20, lineHeight: 1.7 }}>
                  {(result.questions as string[]).map((q, i) => <li key={i}>{q}</li>)}
                </ol>
              ) : result.body_html ? (
                <div style={{ lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: String(result.body_html) }} />
              ) : (
                <p style={{ color: '#9a2020' }}>No questions came back this time — please press Generate again.</p>
              )}
            </>
          ) : (
            <>
              {result.title ? <h1 style={{ fontSize: 24, marginTop: 0 }}>{result.title as string}</h1> : null}
              {result.standfirst ? <p style={{ fontSize: 17, color: '#5b5647' }}>{result.standfirst as string}</p> : null}
              {result.pull_quote ? <blockquote style={{ borderLeft: '3px solid #C9A24C', margin: '12px 0', padding: '4px 14px', color: '#8a5b12', fontSize: 18 }}>“{result.pull_quote as string}”</blockquote> : null}
              <div style={{ lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: String(result.body_html || '') }} />
              {result.verdict ? <p style={{ marginTop: 12, fontWeight: 700 }}>Verdict: {result.verdict as string}</p> : null}
            </>
          )}
        </div>
      )}

      <h1 style={{ fontSize: 20 }}>Recent drafts</h1>
      {savedError ? (
        <div style={{ background: '#fff8ec', border: '1px solid #e7d3a8', borderRadius: 6, padding: '12px 16px' }}>
          <strong>Studio storage not set up yet.</strong> <span style={{ fontSize: 14, color: '#6b6552' }}>Run <code>0030_editorial.sql</code> in Supabase to save drafts. <span style={{ color: '#9a7b2a' }}>({savedError})</span></span>
        </div>
      ) : (
        <table className="adm-t">
          <thead><tr><th>Title</th><th>Kind</th><th>Business</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {saved.map((p) => (
              <tr key={p.id}>
                <td>{p.title || '—'}</td>
                <td>{p.kind}</td>
                <td>{p.business_name || '—'}</td>
                <td><span className="pill draft">{p.status}</span></td>
                <td><button className="abtn ghost" onClick={() => removeSaved(p.id)} style={{ color: '#9a2020' }}>Delete</button></td>
              </tr>
            ))}
            {saved.length === 0 ? <tr><td colSpan={5}>No drafts yet.</td></tr> : null}
          </tbody>
        </table>
      )}
    </>
  );
}
