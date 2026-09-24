'use client';
import { useState } from 'react';

// Cockpit controls: run the planner on demand, and flip autonomy suggest ⇄ auto-draft.
// Admin session-gated routes — no secret in the browser.
type Settings = { autonomy: 'suggest' | 'auto-draft'; webSearch: boolean };

const btn: React.CSSProperties = {
  fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 12, fontWeight: 600, letterSpacing: '.06em',
  textTransform: 'uppercase', color: '#0b0e11', background: '#C9A24C', border: 'none', borderRadius: 4,
  padding: '9px 16px', cursor: 'pointer',
};

export default function PlannerControls({ settings }: { settings: Settings }) {
  const [autonomy, setAutonomy] = useState<Settings['autonomy']>(settings.autonomy);
  const [web, setWeb] = useState<boolean>(settings.webSearch);
  const [busy, setBusy] = useState<'' | 'run' | 'dry' | 'save'>('');
  const [msg, setMsg] = useState('');

  async function runPlanner(dryRun: boolean) {
    setBusy(dryRun ? 'dry' : 'run'); setMsg('Planning…');
    try {
      const r = await fetch('/api/admin/editorial/plan-run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dryRun }),
      });
      const d = await r.json();
      if (d.ok) {
        setMsg(`${dryRun ? 'Dry run' : 'Planned'}: ${d.ideasCreated} idea(s) across ${d.sectionsProcessed} section(s)${d.remainingGaps ? ` · ${d.remainingGaps} sections still with gaps` : ''}.`);
        if (!dryRun && d.ideasCreated) setTimeout(() => location.reload(), 1200);
      } else setMsg(d.error || 'Planner failed.');
    } catch (e) { setMsg((e as Error).message); }
    setBusy('');
  }

  async function saveSettings(next: Partial<Settings>) {
    setBusy('save');
    try {
      const r = await fetch('/api/admin/editorial/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next),
      });
      const d = await r.json();
      if (d.ok) { setAutonomy(d.settings.autonomy); setWeb(d.settings.webSearch); setMsg('Settings saved.'); }
      else setMsg(d.error || 'Could not save.');
    } catch (e) { setMsg((e as Error).message); }
    setBusy('');
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '14px 16px', margin: '6px 0 18px' }}>
      <button style={btn} disabled={!!busy} onClick={() => runPlanner(false)}>{busy === 'run' ? 'Running…' : 'Run planner'}</button>
      <button style={{ ...btn, background: 'transparent', color: '#C9A24C', border: '1px solid #C9A24C' }} disabled={!!busy} onClick={() => runPlanner(true)}>{busy === 'dry' ? '…' : 'Dry run'}</button>

      <label style={{ fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        Autonomy
        <select value={autonomy} onChange={(e) => saveSettings({ autonomy: e.target.value as Settings['autonomy'] })}
          style={{ fontFamily: 'inherit', fontSize: 12, padding: '6px 8px', background: '#12161b', color: '#EDEBE4', border: '1px solid #2a2e35', borderRadius: 4 }}>
          <option value="suggest">Suggest-only</option>
          <option value="auto-draft">Approve → auto-draft</option>
        </select>
      </label>

      <label style={{ fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
        <input type="checkbox" checked={web} onChange={(e) => saveSettings({ webSearch: e.target.checked })} /> Web-search research
      </label>

      {msg && <span style={{ fontFamily: 'var(--sans, Jost, sans-serif)', fontSize: 12, color: '#C9A24C' }}>{msg}</span>}
    </div>
  );
}
