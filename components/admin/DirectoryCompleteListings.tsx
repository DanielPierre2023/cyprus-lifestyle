'use client';
// Admin → Directory → Complete listings. 1) Download the Excel list (guide + "Fill in" +
// "Websites to scan") or just the scraper's CSV. 2) Upload what was found → CHECK shows
// what would be filled → APPLY writes it in chunks (only empty fields; re-checked server-side).
import { useState } from 'react';

const btn: React.CSSProperties = {
  fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 13, fontWeight: 600, letterSpacing: '.03em',
  color: '#0b0e11', background: '#C9A24C', border: 'none', borderRadius: 4, padding: '9px 16px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block',
};
const ghost: React.CSSProperties = { ...btn, background: 'transparent', color: 'inherit', border: '1px solid #C9A24C' };
const box: React.CSSProperties = { border: '1px solid rgba(201,162,76,.35)', borderRadius: 8, padding: '18px 20px', margin: '18px 0', maxWidth: 920 };
const field: React.CSSProperties = { padding: '7px 9px', border: '1px solid #ccc', borderRadius: 4, font: 'inherit', fontSize: 13 };
const NEEDS: [string, string][] = [['any', 'anything missing'], ['image', 'photo'], ['phone', 'phone'], ['email', 'email'], ['website', 'website'], ['hours', 'opening hours'], ['socials', 'social links']];
const DISTRICTS = ['', 'nicosia', 'limassol', 'larnaca', 'paphos', 'famagusta'];

interface PatchView { slug: string; fields: Record<string, unknown>; filled: string[] }
interface Check { rows: number; matched: number; unmatched: number; noNews: number; filled: Record<string, number>; unmatchedSamples: string[]; patches: PatchView[] }

export default function DirectoryCompleteListings() {
  const [status, setStatus] = useState('');
  const [district, setDistrict] = useState('');
  const [need, setNeed] = useState('any');
  const [limit, setLimit] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState('');
  const [check, setCheck] = useState<Check | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const qs = (format: string) => {
    const p = new URLSearchParams({ format });
    if (status) p.set('status', status); if (district) p.set('district', district); if (need !== 'any') p.set('need', need);
    if (Number(limit) > 0) p.set('limit', String(Number(limit)));
    return `/api/admin/directory/enrichment?${p.toString()}`;
  };

  async function runCheck() {
    if (!file) return;
    setBusy('Checking…'); setMsg(null); setCheck(null);
    try {
      const fd = new FormData(); fd.append('file', file);
      const r = await fetch('/api/admin/directory/enrichment', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
      setCheck(d as Check);
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy('');
  }

  async function apply() {
    if (!check?.patches.length) return;
    let updated = 0, fields = 0, skipped = 0; const errors: string[] = [];
    for (let i = 0; i < check.patches.length; i += 250) {
      setBusy(`Writing ${Math.min(i + 250, check.patches.length)} / ${check.patches.length}…`);
      try {
        const r = await fetch('/api/admin/directory/enrichment', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patches: check.patches.slice(i, i + 250) }),
        });
        const d = await r.json();
        if (!r.ok || !d.ok) throw new Error(d.error || `HTTP ${r.status}`);
        updated += d.updated; fields += d.fields; skipped += d.skipped; errors.push(...(d.errors || []));
      } catch (e) { errors.push((e as Error).message); break; }
    }
    setBusy(''); setCheck(null); setFile(null);
    setMsg({ ok: !errors.length, text: `${updated.toLocaleString('en')} businesses completed (${fields.toLocaleString('en')} fields)${skipped ? `, ${skipped} already complete` : ''}. The map shows it within ~10 minutes.${errors.length ? ` Errors: ${errors.slice(0, 3).join(' · ')}` : ''}` });
  }

  return (
    <div>
      <section style={box}>
        <h2 style={{ marginTop: 0 }}>1 · Download what is missing</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 14 }}>
          <label>Missing <select style={field} value={need} onChange={(e) => setNeed(e.target.value)}>{NEEDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label>Status <select style={field} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">all on the map</option><option value="published">published</option><option value="listed">listed (imported)</option></select></label>
          <label>District <select style={field} value={district} onChange={(e) => setDistrict(e.target.value)}>{DISTRICTS.map((d) => <option key={d} value={d}>{d || 'all'}</option>)}</select></label>
          <label>Max rows <input style={{ ...field, width: 90 }} inputMode="numeric" placeholder="all" value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ''))} /></label>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a style={btn} href={qs('xlsx')}>Download the list (Excel)</a>
          <a style={ghost} href={qs('csv')}>Websites to scan (CSV for the scraper)</a>
        </div>
        <p className="sub" style={{ marginBottom: 0 }}>
          The Excel file starts with a step-by-step guide (Google Places enrichment → Ultimate Web Scraper → by hand), then one row per
          business with the gaps named. Most important first: published pages, then the most-reviewed places.
        </p>
      </section>

      <section style={box}>
        <h2 style={{ marginTop: 0 }}>2 · Upload what you found</h2>
        <p className="sub" style={{ marginTop: 0 }}>
          The &ldquo;Fill in&rdquo; sheet, or the scraper&rsquo;s Excel/CSV export exactly as it comes (Email Extractor, Page Extractor,
          Social Link Extractor). Rows are matched by slug, else by website. Max 4 MB per file — upload batches one after another.
        </p>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => { setFile(e.target.files?.[0] || null); setCheck(null); setMsg(null); }} />
          <button type="button" style={{ ...btn, opacity: !file || !!busy ? 0.6 : 1 }} disabled={!file || !!busy} onClick={runCheck}>Check</button>
          {busy ? <span className="sub" style={{ margin: 0 }}>{busy}</span> : null}
        </div>

        {check ? (
          <div style={{ marginTop: 16 }}>
            <div className="cards">
              <div className="stat"><div className="n">{check.rows.toLocaleString('en')}</div><div className="k">Rows in the file</div></div>
              <div className="stat"><div className="n">{check.matched.toLocaleString('en')}</div><div className="k">Matched to a business</div></div>
              <div className="stat"><div className="n" style={{ color: check.patches.length ? '#1f7a3f' : undefined }}>{check.patches.length.toLocaleString('en')}</div><div className="k">Businesses to complete</div></div>
              <div className="stat"><div className="n" style={{ color: check.unmatched ? '#9a2020' : undefined }}>{check.unmatched.toLocaleString('en')}</div><div className="k">Not matched</div></div>
            </div>
            {Object.keys(check.filled).length ? (
              <p>Will fill: {Object.entries(check.filled).map(([k, n]) => `${n.toLocaleString('en')} × ${k}`).join(' · ')}</p>
            ) : <p>Nothing new — everything in this file is already on file (or empty).</p>}
            {check.unmatchedSamples.length ? <p className="sub">Not matched, e.g.: {check.unmatchedSamples.slice(0, 8).join(' · ')}</p> : null}
            {check.patches.length ? (
              <>
                <table style={{ fontSize: 13, borderCollapse: 'collapse', margin: '10px 0', width: '100%' }}>
                  <thead><tr><th style={{ textAlign: 'left' }}>business (slug)</th><th style={{ textAlign: 'left' }}>fills</th></tr></thead>
                  <tbody>{check.patches.slice(0, 12).map((p) => <tr key={p.slug}><td style={{ padding: '3px 8px 3px 0' }}>{p.slug}</td><td>{p.filled.join(', ')}</td></tr>)}</tbody>
                </table>
                <button type="button" style={{ ...btn, opacity: busy ? 0.6 : 1 }} disabled={!!busy} onClick={apply}>
                  Apply — complete {check.patches.length.toLocaleString('en')} businesses
                </button>
              </>
            ) : null}
          </div>
        ) : null}
        {msg ? <p style={{ color: msg.ok ? '#1f7a3f' : '#9a2020', fontWeight: 600 }}>{msg.text}</p> : null}
      </section>
    </div>
  );
}
