import { supabaseServer } from '@/lib/supabase/server';
import { categoryLabel } from '@/lib/directory/taxonomy';

export const dynamic = 'force-dynamic';

type GroupRow = {
  category_group: string; total: number; published: number; listed: number; with_coords: number; with_contact: number; with_image: number; with_rating: number; verified: number;
  pct_coords: number; pct_contact: number; pct_image: number; pct_rating: number; pct_verified: number; median_age_days: number | null;
};
type DistrictRow = { district: string; total: number; with_coords: number; with_image: number; pct_coords: number; pct_image: number };
type Cell = { category_group: string; district: string; total: number; with_coords: number; with_image: number };

function pctCell(p: number) {
  // colour a percentage from red (0) to gold (100) for quick scanning
  const bg = p >= 80 ? '#1f7a3f' : p >= 50 ? '#C9A24C' : p >= 25 ? '#b8860b' : '#B00020';
  return <span style={{ color: bg, fontWeight: 700 }}>{p}%</span>;
}

const IMPORT_DISTRICTS = ['nicosia', 'limassol', 'larnaca', 'paphos', 'famagusta'];

export default async function CoverageTab() {
  const sb = await supabaseServer();

  // ── Imported directory ('listed' = concierge-visible, not on the website) + geocoding
  // progress. Queried directly (the coverage views below are published-only). ──────────
  const cnt = (build: (q: any) => any) => build(sb.from('directory_listings').select('id', { count: 'exact', head: true }));
  const [
    listedTotalQ, listedGeoQ, listedEmailQ, publishedTotalQ, geoQueueQ,
    ...districtQs
  ] = await Promise.all([
    cnt((q: any) => q.eq('status', 'listed')),
    cnt((q: any) => q.eq('status', 'listed').not('lat', 'is', null)),
    cnt((q: any) => q.eq('status', 'listed').not('email', 'is', null)),
    cnt((q: any) => q.eq('status', 'published')),
    sb.from('job_queue').select('id', { count: 'exact', head: true }).eq('kind', 'geocode_listing').in('status', ['pending', 'running']),
    ...IMPORT_DISTRICTS.flatMap((d) => [
      cnt((q: any) => q.eq('status', 'listed').eq('district', d)),
      cnt((q: any) => q.eq('status', 'listed').eq('district', d).not('lat', 'is', null)),
    ]),
    cnt((q: any) => q.eq('status', 'listed').is('district', null)),
  ]);
  const listedTotal = listedTotalQ.count || 0;
  const listedGeo = listedGeoQ.count || 0;
  const listedEmail = listedEmailQ.count || 0;
  const publishedTotal = publishedTotalQ.count || 0;
  const geoQueue = geoQueueQ.count || 0;
  const geoPct = listedTotal ? Math.round((100 * listedGeo) / listedTotal) : 0;
  const importDistricts = IMPORT_DISTRICTS.map((d, i) => ({
    district: d,
    total: (districtQs[i * 2] as { count: number | null }).count || 0,
    geo: (districtQs[i * 2 + 1] as { count: number | null }).count || 0,
  }));
  const noDistrict = (districtQs[IMPORT_DISTRICTS.length * 2] as { count: number | null } | undefined)?.count || 0;

  const [{ data: overall }, { data: byGroup }, { data: byDistrict }, { data: cells }] = await Promise.all([
    sb.from('directory_coverage_overall').select('*').maybeSingle(),
    sb.from('directory_coverage_by_group').select('*'),
    sb.from('directory_coverage_by_district').select('*'),
    sb.from('directory_coverage_cells').select('*'),
  ]);
  const o = (overall as { total: number; published: number; listed: number; pct_coords: number; pct_contact: number; pct_image: number; pct_rating: number; pct_verified: number } | null) || null;
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
      {/* Bulk-imported directory (concierge-only) + geocoding progress. */}
      <h1>Imported directory · concierge listings</h1>
      <p className="sub">Businesses bulk-imported for the concierge (status <code>listed</code>): visible to the concierge for &ldquo;what&rsquo;s near me&rdquo;, not shown on the public website. Near-me by town/category works as soon as they&rsquo;re imported; precise radius sharpens as the geocoder fills in coordinates. This section is empty until you run the import.</p>
      <div className="cards">
        <div className="stat"><div className="n">{listedTotal.toLocaleString('en-US')}</div><div className="k">Listed (concierge)</div></div>
        <div className="stat"><div className="n">{geoPct}%</div><div className="k">Geocoded</div></div>
        <div className="stat"><div className="n" style={listedTotal - listedGeo > 0 ? { color: '#b8860b' } : undefined}>{(listedTotal - listedGeo).toLocaleString('en-US')}</div><div className="k">Awaiting geocode</div></div>
        <div className="stat"><div className="n">{listedEmail.toLocaleString('en-US')}</div><div className="k">With email (outreach)</div></div>
        <div className="stat"><div className="n">{publishedTotal.toLocaleString('en-US')}</div><div className="k">Published (on website)</div></div>
      </div>
      {listedTotal > 0 ? (
        <>
          <div style={{ margin: '4px 0 14px' }}>
            <div style={{ height: 12, background: 'rgba(255,255,255,0.08)', borderRadius: 6, overflow: 'hidden', maxWidth: 520 }}>
              <div style={{ height: '100%', width: `${geoPct}%`, background: '#1f7a3f' }} />
            </div>
            <span className="sub" style={{ margin: '4px 0 0' }}>{listedGeo.toLocaleString('en-US')} of {listedTotal.toLocaleString('en-US')} geocoded · {geoQueue.toLocaleString('en-US')} geocode job(s) queued</span>
          </div>
          <table className="adm-t">
            <thead><tr><th>District</th><th>Listed</th><th>Geocoded</th><th>Progress</th></tr></thead>
            <tbody>
              {importDistricts.map((d) => (
                <tr key={d.district}>
                  <td style={{ textTransform: 'capitalize' }}>{d.district}</td>
                  <td>{d.total.toLocaleString('en-US')}</td>
                  <td>{d.geo.toLocaleString('en-US')}</td>
                  <td>{pctCell(d.total ? Math.round((100 * d.geo) / d.total) : 0)}</td>
                </tr>
              ))}
              {noDistrict > 0 ? <tr><td>(no district)</td><td>{noDistrict.toLocaleString('en-US')}</td><td>—</td><td>—</td></tr> : null}
            </tbody>
          </table>
        </>
      ) : null}

      <h1 style={{ marginTop: 8 }}>Directory coverage · Acoperire</h1>
      <p className="sub">The WHOLE directory — published (on the website) and listed (concierge-only) together — grouped by the canonical categories. A photo counts a curated image OR the imported source image. &ldquo;With a rating&rdquo; is the enrichment gap still to close.</p>

      <div className="cards">
        <div className="stat"><div className="n">{(o?.total ?? 0).toLocaleString('en-US')}</div><div className="k">Total (all)</div></div>
        <div className="stat"><div className="n">{(o?.published ?? 0).toLocaleString('en-US')}</div><div className="k">Published (on site)</div></div>
        <div className="stat"><div className="n">{(o?.listed ?? 0).toLocaleString('en-US')}</div><div className="k">Listed (concierge)</div></div>
        <div className="stat"><div className="n">{o?.pct_coords ?? 0}%</div><div className="k">With coordinates</div></div>
        <div className="stat"><div className="n">{o?.pct_contact ?? 0}%</div><div className="k">With a contact</div></div>
        <div className="stat"><div className="n">{o?.pct_image ?? 0}%</div><div className="k">With a photo</div></div>
        <div className="stat"><div className="n" style={(o?.pct_rating ?? 0) < 50 ? { color: '#b8860b' } : undefined}>{o?.pct_rating ?? 0}%</div><div className="k">With a rating</div></div>
      </div>

      <h1 style={{ fontSize: 18 }}>By category</h1>
      <table className="adm-t">
        <thead><tr><th>Category</th><th>Total</th><th>Pub</th><th>Listed</th><th>Coords</th><th>Contact</th><th>Photo</th><th>Rating</th><th>Verified</th></tr></thead>
        <tbody>
          {groups.map((g, i) => (
            <tr key={i}>
              <td>{categoryLabel(g.category_group)}</td>
              <td>{g.total.toLocaleString('en-US')}</td>
              <td>{g.published.toLocaleString('en-US')}</td>
              <td>{g.listed.toLocaleString('en-US')}</td>
              <td>{pctCell(g.pct_coords)}</td>
              <td>{pctCell(g.pct_contact)}</td>
              <td>{pctCell(g.pct_image)}</td>
              <td>{pctCell(g.pct_rating)}</td>
              <td>{pctCell(g.pct_verified)}</td>
            </tr>
          ))}
          {groups.length === 0 ? <tr><td colSpan={9}>No listings.</td></tr> : null}
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
