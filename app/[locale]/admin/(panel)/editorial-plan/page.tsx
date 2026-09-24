import { supabaseServer } from '@/lib/supabase/server';
import { getEditorialSettings } from '@/lib/editorial/settings';
import { getFranchise } from '@/lib/editorial/pipeline';
import PlannerControls from '@/components/admin/PlannerControls';

export const dynamic = 'force-dynamic';

// The editorial accountability cockpit: target vs published-this-month vs open ideas,
// per department and subcategory, with the directory coverage each draws from. This is
// the exact view of redactional needs — and the base for the coming months' plan.

type PlanRow = {
  section_key: string; section_name: string; department_key: string; department_name: string;
  monthly_target: number; franchise_key: string | null; published_mtd: number; published_total: number;
  ideas_open: number; ideas_suggested: number; gap: number;
};
type CovRow = { section_key: string; candidates: number; featured: number };

export default async function EditorialPlanTab() {
  const sb = await supabaseServer();
  const [{ data: planData }, { data: covData }, settings] = await Promise.all([
    sb.from('editorial_plan').select('*'),
    sb.from('editorial_coverage').select('section_key, candidates, featured'),
    getEditorialSettings(),
  ]);
  const rows = (planData as PlanRow[] | null) || [];
  const cov = new Map(((covData as CovRow[] | null) || []).map((c) => [c.section_key, c]));

  const tTarget = rows.reduce((a, r) => a + r.monthly_target, 0);
  const tPub = rows.reduce((a, r) => a + r.published_mtd, 0);
  const tOpen = rows.reduce((a, r) => a + r.ideas_open, 0);
  const tGap = rows.reduce((a, r) => a + r.gap, 0);
  const tSuggested = rows.reduce((a, r) => a + r.ideas_suggested, 0);

  // Group subcategories under their department, preserving the view's sort order.
  const depts: { key: string; name: string; rows: PlanRow[] }[] = [];
  for (const r of rows) {
    let d = depts.find((x) => x.key === r.department_key);
    if (!d) { d = { key: r.department_key, name: r.department_name, rows: [] }; depts.push(d); }
    d.rows.push(r);
  }

  return (
    <>
      <h1>Editorial plan</h1>
      <p className="sub">
        What the magazine owes itself this month, and where the gaps are — per department, subcategory and subject.
        Run the AI planner to fill the gaps with grounded, non-redundant ideas; approve them on the <a href="/admin/ideas" style={{ color: '#C9A24C' }}>Idea Board</a>.
      </p>

      <PlannerControls settings={{ autonomy: settings.autonomy, webSearch: settings.webSearch, autoCover: settings.autoCover, imageSource: settings.imageSource }} />

      <div className="cards">
        <div className="stat"><div className="n">{tTarget.toLocaleString('en-US')}</div><div className="k">Target / month</div></div>
        <div className="stat"><div className="n" style={{ color: '#1f7a3f' }}>{tPub.toLocaleString('en-US')}</div><div className="k">Published this month</div></div>
        <div className="stat"><div className="n" style={{ color: '#C9A24C' }}>{tOpen.toLocaleString('en-US')}</div><div className="k">Ideas in the backlog</div></div>
        <div className="stat"><div className="n" style={{ color: '#C9A24C' }}>{tSuggested.toLocaleString('en-US')}</div><div className="k">Awaiting approval</div></div>
        <div className="stat"><div className="n" style={{ color: tGap ? '#b3654f' : '#1f7a3f' }}>{tGap.toLocaleString('en-US')}</div><div className="k">Still to fill</div></div>
      </div>

      {depts.map((d) => {
        const dTarget = d.rows.reduce((a, r) => a + r.monthly_target, 0);
        const dGap = d.rows.reduce((a, r) => a + r.gap, 0);
        return (
          <div key={d.key} style={{ marginTop: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #C9A24C', paddingBottom: 6 }}>
              <h1 style={{ fontSize: 18, margin: 0 }}>{d.name}</h1>
              <span className="sub" style={{ margin: 0 }}>{dTarget}/mo · {dGap ? `${dGap} to fill` : 'on plan'}</span>
            </div>
            <table className="adm-t" style={{ marginTop: 10 }}>
              <thead><tr><th>Subcategory</th><th>Franchise</th><th>Target</th><th>Published (mo)</th><th>Backlog</th><th>Gap</th><th>Directory: featured / candidates</th></tr></thead>
              <tbody>
                {d.rows.map((r) => {
                  const c = cov.get(r.section_key);
                  return (
                    <tr key={r.section_key}>
                      <td style={{ fontWeight: 600 }}>{r.section_name}</td>
                      <td className="sub" style={{ margin: 0 }}>{r.franchise_key ? (getFranchise(r.franchise_key)?.name ?? r.franchise_key) : '—'}</td>
                      <td>{r.monthly_target}</td>
                      <td style={{ color: '#1f7a3f' }}>{r.published_mtd}</td>
                      <td style={{ color: '#C9A24C' }}>{r.ideas_open}{r.ideas_suggested ? ` (${r.ideas_suggested} new)` : ''}</td>
                      <td style={{ color: r.gap ? '#b3654f' : '#1f7a3f', fontWeight: 700 }}>{r.gap}</td>
                      <td className="sub" style={{ margin: 0 }}>{c ? `${c.featured.toLocaleString('en-US')} / ${c.candidates.toLocaleString('en-US')}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
      {rows.length === 0 ? <p className="sub">No sections found — run Increment 1&apos;s migrations to seed the taxonomy.</p> : null}
    </>
  );
}
