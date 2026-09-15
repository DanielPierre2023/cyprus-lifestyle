import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

function Bars({ title, rows }: { title: string; rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div style={{ marginBottom: 26 }}>
      <h1 style={{ fontSize: 18 }}>{title}</h1>
      <table className="adm-t">
        <tbody>
          {rows.slice(0, 10).map((r, i) => (
            <tr key={i}><td style={{ width: 220 }}>{r.label}</td>
              <td><div style={{ background: '#C9A24C', height: 12, width: `${(r.value / max) * 100}%`, minWidth: 2, display: 'inline-block', verticalAlign: 'middle' }} /> <span style={{ marginInlineStart: 8 }}>{r.value}</span></td></tr>
          ))}
          {rows.length === 0 ? <tr><td>No data.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

export default async function AnalyticsTab() {
  const sb = await supabaseServer();
  const { data } = await sb.rpc('get_analytics_data_admin', { p_period: '30d' });
  const a = (data as any) || {};
  const { data: spend } = await sb.from('ai_spend_by_function_daily').select('*').order('day', { ascending: false }).limit(12);
  const { data: months } = await sb.from('ai_spend_by_month').select('*').order('month', { ascending: false }).limit(36);
  const monthRows = (months as { month: string; calls: number; usd: number }[] | null) || [];
  const totalUsd = monthRows.reduce((sum, m) => sum + Number(m.usd || 0), 0);
  const totalCalls = monthRows.reduce((sum, m) => sum + Number(m.calls || 0), 0);

  return (
    <>
      <h1>Analytics · Observabilitate</h1>
      <p className="sub">Traffic (last 30 days) and AI spend.</p>
      <div className="cards">
        <div className="stat"><div className="n">{a.overview?.views_30d ?? 0}</div><div className="k">Views · 30d</div></div>
        <div className="stat"><div className="n">{a.overview?.visitors_30d ?? 0}</div><div className="k">Visitors · 30d</div></div>
        <div className="stat"><div className="n">{a.overview?.views_24h ?? 0}</div><div className="k">Views · 24h</div></div>
      </div>
      <Bars title="Top pages" rows={a.pages || []} />
      <Bars title="Traffic sources" rows={a.sources || []} />
      <Bars title="Countries" rows={a.countries || []} />
      <Bars title="Devices" rows={a.devices || []} />
      <h1 style={{ fontSize: 18 }}>AI spend by month</h1>
      <table className="adm-t">
        <thead><tr><th>Month</th><th>Calls</th><th>USD</th></tr></thead>
        <tbody>
          {monthRows.map((m, i) => (
            <tr key={i}><td>{m.month}</td><td>{m.calls}</td><td>${Number(m.usd || 0).toFixed(2)}</td></tr>
          ))}
          {monthRows.length === 0 ? <tr><td colSpan={3}>No spend logged yet.</td></tr> : (
            <tr style={{ fontWeight: 700, borderTop: '2px solid #C9A24C' }}>
              <td>Total</td><td>{totalCalls}</td><td>${totalUsd.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18 }}>AI spend by function (recent)</h1>
      <table className="adm-t">
        <thead><tr><th>Day</th><th>Function</th><th>Provider</th><th>Calls</th><th>USD</th></tr></thead>
        <tbody>
          {((spend as any[]) || []).map((s, i) => (
            <tr key={i}><td>{s.day}</td><td>{s.function_name}</td><td>{s.provider}</td><td>{s.calls}</td><td>${Number(s.usd || 0).toFixed(4)}</td></tr>
          ))}
          {(!spend || spend.length === 0) ? <tr><td colSpan={5}>No spend logged yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
