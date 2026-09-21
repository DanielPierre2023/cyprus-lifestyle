import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type GroupRow = {
  category_group: string; total: number; with_coords: number; with_contact: number; with_image: number; verified: number;
  pct_coords: number; pct_contact: number; pct_image: number; pct_verified: number; median_age_days: number | null;
};
type DistrictRow = { district: string; total: number; with_coords: number; with_image: number; pct_coords: number; pct_image: number };
type Cell = { category_group: string; district: string; total: number; with_coords: number; with_image: number };

function pctCell(p: number) {
  // colour a percentage from red (0) to gold (100) for quick scanning
  const bg = p >= 80 ? '#1f7a3f' : p >= 50 ? '#C9A24C' : p >= 25 ? '#b8860b' : '#B00020';
  return <span style={{ color: bg, fontWeight: 700 }}>{p}%</span>;
}

export default async function CoverageTab() {
  const sb = await supabaseServer();
  const [{ data: overall }, { data: byGroup }, { data: byDistrict }, { data: cells }] = await Promise.all([
    sb.from('directory_coverage_overall').select('*').maybeSingle(),
    sb.from('directory_coverage_by_group').select('*'),
    sb.from('directory_coverage_by_district').select('*'),
    sb.from('directory_coverage_cells').select('*'),
  ]);
  const o = (overall as { total: number; pct_coords: number; pct_contact: number; pct_image: number; pct_verified: number } | null) || null;
  const groups = (byGroup as GroupRow[] | null) || [];
  const districts = (byDistrict as DistrictRow[] | null) || [];
  const cellRows = (cells as Cell[] | null) || [];

  // Build the category × district matrix.
  const districtNames = districts.map((d) => d.district);
  const cellMap = new Map<string, Cell>();
  for (const c of cellRows) cellMap.set(`${c.category_group}|${c.district}`, c);

  // Gap list: the thinnest real category×district cells (fewest listings), the sprint targets.
  const gaps = [...cellRows].sort((a, b) => a.total - b.total).slice(0, 12);

  return (
    <>
      <h1>Directory coverage · Acoperire</h1>
      <p className="sub">What the directory has and where the holes are — the map/neighbourhood needs coordinates, the concierge needs contacts and photos. Published listings only. Pair this with the concierge backlog in Analytics to prioritise the scrape / enrich sprint.</p>

      <div className="cards">
        <div className="stat"><div className="n">{o?.total ?? 0}</div><div className="k">Published listings</div></div>
        <div className="stat"><div className="n">{o?.pct_coords ?? 0}%</div><div className="k">With coordinates</div></div>
        <div className="stat"><div className="n">{o?.pct_contact ?? 0}%</div><div className="k">With a contact</div></div>
        <div className="stat"><div className="n">{o?.pct_image ?? 0}%</div><div className="k">With a photo</div></div>
        <div className="stat"><div className="n">{o?.pct_verified ?? 0}%</div><div className="k">Verified</div></div>
      </div>

      <h1 style={{ fontSize: 18 }}>By category group</h1>
      <table className="adm-t">
        <thead><tr><th>Category group</th><th>Listings</th><th>Coords</th><th>Contact</th><th>Photo</th><th>Verified</th><th>Median age</th></tr></thead>
        <tbody>
          {groups.map((g, i) => (
            <tr key={i}>
              <td>{g.category_group}</td>
              <td>{g.total}</td>
              <td>{pctCell(g.pct_coords)}</td>
              <td>{pctCell(g.pct_contact)}</td>
              <td>{pctCell(g.pct_image)}</td>
              <td>{pctCell(g.pct_verified)}</td>
              <td>{g.median_age_days == null ? '—' : `${g.median_age_days}d`}</td>
            </tr>
          ))}
          {groups.length === 0 ? <tr><td colSpan={7}>No published listings.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18 }}>Category × district — the gap map</h1>
      <p className="sub">Listing count per cell (coordinate coverage in the tint). Empty or thin cells are where the directory needs filling.</p>
      <div style={{ overflowX: 'auto' }}>
        <table className="adm-t">
          <thead><tr><th>Category</th>{districtNames.map((d) => <th key={d} style={{ textAlign: 'center' }}>{d}</th>)}</tr></thead>
          <tbody>
            {groups.map((g) => (
              <tr key={g.category_group}>
                <td>{g.category_group}</td>
                {districtNames.map((d) => {
                  const c = cellMap.get(`${g.category_group}|${d}`);
                  const n = c?.total || 0;
                  const cov = n ? Math.round((100 * (c!.with_coords || 0)) / n) : 0;
                  const bg = n === 0 ? '#2a2a2a' : cov >= 60 ? 'rgba(31,122,63,0.35)' : cov >= 25 ? 'rgba(201,162,76,0.30)' : 'rgba(176,0,32,0.28)';
                  return <td key={d} style={{ textAlign: 'center', background: bg }}>{n || '·'}</td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h1 style={{ fontSize: 18 }}>Thinnest cells — sprint targets</h1>
      <table className="adm-t">
        <thead><tr><th style={{ width: 40 }}>#</th><th>Category</th><th>District</th><th>Listings</th><th>With coords</th><th>With photo</th></tr></thead>
        <tbody>
          {gaps.map((c, i) => (
            <tr key={i}>
              <td>{i + 1}</td><td>{c.category_group}</td><td>{c.district}</td>
              <td>{c.total}</td><td>{c.with_coords}</td><td>{c.with_image}</td>
            </tr>
          ))}
          {gaps.length === 0 ? <tr><td colSpan={6}>No data.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18 }}>By district</h1>
      <table className="adm-t">
        <thead><tr><th>District</th><th>Listings</th><th>Coords</th><th>Photo</th></tr></thead>
        <tbody>
          {districts.map((d, i) => (
            <tr key={i}><td>{d.district}</td><td>{d.total}</td><td>{pctCell(d.pct_coords)}</td><td>{pctCell(d.pct_image)}</td></tr>
          ))}
          {districts.length === 0 ? <tr><td colSpan={4}>No published listings.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
