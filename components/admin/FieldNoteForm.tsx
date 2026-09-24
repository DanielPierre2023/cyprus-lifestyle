'use client';
import { useState } from 'react';
import { FRANCHISES } from '@/lib/editorial/pipeline';

// Log a visit / interview / story. On submit (admin session-gated), optionally has
// the AI editor redact a house-voice article from the notes on the spot.
const field: React.CSSProperties = {
  width: '100%', fontFamily: 'var(--body, Lora, serif)', fontSize: 14, color: '#EDEBE4',
  background: '#12161b', border: '1px solid #2a2e35', borderRadius: 4, padding: '9px 11px', marginTop: 4,
};
const label: React.CSSProperties = { fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: '#9aa0a0' };

export default function FieldNoteForm() {
  const [f, setF] = useState({ kind: 'visit', subjectName: '', subjectListingId: '', place: '', visitedOn: '', rating: '', notes: '', quotes: '', franchise: '', autoDraft: true });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const set = (k: string, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.notes.trim()) { setMsg('Add what you saw / tasted / heard first.'); return; }
    setBusy(true); setMsg('Saving…');
    try {
      const r = await fetch('/api/admin/editorial/field-note', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, rating: f.rating || undefined }),
      });
      const d = await r.json();
      if (d.ok) { setMsg(`✓ ${d.note || 'Saved.'}`); if (d.queuedDraft) setTimeout(() => location.reload(), 1600); }
      else setMsg(d.error || 'Failed to save.');
    } catch (e2) { setMsg((e2 as Error).message); }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 18, display: 'grid', gap: 12, maxWidth: 760 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <label><span style={label}>Kind</span>
          <select style={field} value={f.kind} onChange={(e) => set('kind', e.target.value)}>
            <option value="visit">Visit</option><option value="interview">Interview</option><option value="story">Story</option>
          </select>
        </label>
        <label><span style={label}>Subject name</span><input style={field} value={f.subjectName} onChange={(e) => set('subjectName', e.target.value)} placeholder="e.g. The Fish Room" /></label>
        <label><span style={label}>Place / district</span><input style={field} value={f.place} onChange={(e) => set('place', e.target.value)} placeholder="Kato Paphos" /></label>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <label><span style={label}>Directory listing id (optional)</span><input style={field} value={f.subjectListingId} onChange={(e) => set('subjectListingId', e.target.value)} placeholder="uuid — elevates the listing" /></label>
        <label><span style={label}>Date</span><input type="date" style={field} value={f.visitedOn} onChange={(e) => set('visitedOn', e.target.value)} /></label>
        <label><span style={label}>Rating (1–5)</span><input type="number" min={1} max={5} style={field} value={f.rating} onChange={(e) => set('rating', e.target.value)} /></label>
      </div>
      <label><span style={label}>What you saw / tasted / experienced</span>
        <textarea style={{ ...field, minHeight: 120, resize: 'vertical' }} value={f.notes} onChange={(e) => set('notes', e.target.value)} placeholder="The room, the welcome, the dishes and how they tasted, the wine, the service, the details worth remembering…" />
      </label>
      <label><span style={label}>Direct quotes (kept verbatim)</span>
        <textarea style={{ ...field, minHeight: 64, resize: 'vertical' }} value={f.quotes} onChange={(e) => set('quotes', e.target.value)} placeholder='"We grow everything within an hour of the kitchen." — the chef' />
      </label>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <label><span style={label}>Franchise</span>
          <select style={{ ...field, width: 'auto' }} value={f.franchise} onChange={(e) => set('franchise', e.target.value)}>
            <option value="">Auto</option>
            {FRANCHISES.map((fr) => <option key={fr.key} value={fr.key}>{fr.name}</option>)}
          </select>
        </label>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 13, marginTop: 16 }}>
          <input type="checkbox" checked={f.autoDraft} onChange={(e) => set('autoDraft', e.target.checked)} /> Let the AI editor draft it now
        </label>
      </div>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <button type="submit" disabled={busy} style={{ fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '.08em', textTransform: 'uppercase', color: '#0b0e11', background: '#C9A24C', border: 'none', borderRadius: 4, padding: '11px 22px', cursor: 'pointer' }}>{busy ? 'Working…' : 'Save field note'}</button>
        {msg && <span style={{ fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 13, color: '#C9A24C' }}>{msg}</span>}
      </div>
    </form>
  );
}
