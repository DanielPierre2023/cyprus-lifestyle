import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Row = { id: number; at: string; actor_email: string | null; source: string; action: string; table_name: string | null; row_id: string | null; summary: string | null; changes: Record<string, unknown> | null };

// What changed, in one readable line.
function describe(r: Row): string {
  const c = r.changes;
  if (r.summary) return r.summary;
  if (!c) return '';
  const keys = Object.keys(c);
  if (r.action === 'update') {
    return keys.slice(0, 4).map((k) => {
      const v = c[k] as { from?: unknown; to?: unknown };
      return `${k}: ${String(v?.from ?? '∅').slice(0, 40)} → ${String(v?.to ?? '∅').slice(0, 40)}`;
    }).join(' · ') + (keys.length > 4 ? ` · +${keys.length - 4} more` : '');
  }
  const label = c.title_en ?? c.name ?? c.key ?? c.subject ?? c.email ?? c.slug ?? c.label;
  return label ? String(label).slice(0, 80) : `${keys.length} fields`;
}

export default async function AuditTab({ searchParams }: { searchParams: Promise<{ table?: string; who?: string }> }) {
  const sp = await searchParams;
  const sb = await supabaseServer();
  let q = sb.from('admin_audit_log').select('id, at, actor_email, source, action, table_name, row_id, summary, changes').order('at', { ascending: false }).limit(300);
  if (sp.table) q = q.eq('table_name', sp.table);
  if (sp.who) q = q.eq('actor_email', sp.who);
  const { data, error } = await q;
  const rows = (data as Row[] | null) || [];
  const tables = Array.from(new Set(rows.map((r) => r.table_name).filter(Boolean))) as string[];

  return (
    <>
      <h1>Audit log</h1>
      <p className="sub">Who changed what, and when — every edit an administrator makes in the admin screens, plus server actions such as approving a newsletter or granting a membership. It cannot be edited or deleted from the app. The last 300 entries are shown.</p>
      {error ? <p className="sub">The audit log is not in the database yet. Run <code>supabase/migrations/20261005140000_admin_audit_log.sql</code> in the Supabase SQL editor. ({error.message})</p> : (
        <>
          <form method="get" className="row" style={{ marginBottom: 12 }}>
            <select name="table" defaultValue={sp.table || ''} style={{ width: 200 }}>
              <option value="">All tables</option>
              {[...new Set([...(sp.table ? [sp.table] : []), ...tables])].sort().map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input name="who" placeholder="Administrator e-mail" defaultValue={sp.who || ''} style={{ width: 240 }} />
            <button className="abtn gold" type="submit">Filter</button>
            <a className="abtn ghost" href="/admin/audit">Reset</a>
          </form>
          <table className="adm-t">
            <thead><tr><th>When</th><th>Who</th><th>Action</th><th>Where</th><th>What</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{new Date(r.at).toLocaleString('en-GB')}</td>
                  <td>{r.actor_email || '—'}</td>
                  <td><span className={`pill ${r.action === 'delete' ? 'failed' : r.action === 'insert' ? 'ok' : 'info'}`}>{r.action}</span></td>
                  <td>{r.table_name || '—'}{r.row_id ? <div style={{ fontSize: 11, opacity: .55 }}>{r.row_id.slice(0, 8)}</div> : null}</td>
                  <td style={{ fontSize: 12.5, maxWidth: 520, wordBreak: 'break-word' }}>{describe(r)}</td>
                </tr>
              ))}
              {rows.length === 0 ? <tr><td colSpan={5}>No entries yet.</td></tr> : null}
            </tbody>
          </table>
        </>
      )}
    </>
  );
}
