import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Attr = { slug: string; name: string | null; district: string | null; type: string | null; featured: boolean; impressions: number; clicks: number; ctr_pct: number; last_recommended: string | null };
type Roi = { org_id: string; name: string | null; status: string | null; revenue_eur: number; orders: number; leads: number; revenue_per_lead: number | null; last_order_at: string | null };

export default async function AttributionTab() {
  const sb = await supabaseServer();
  const [{ data: attrData }, { data: roiData }, { data: ctaData }] = await Promise.all([
    sb.from('listing_attribution').select('*').order('impressions', { ascending: false }).limit(50),
    sb.from('advertiser_roi').select('*').limit(50),
    sb.from('cta_by_listing').select('*').order('clicks', { ascending: false }).limit(25),
  ]);
  const attr = (attrData as Attr[] | null) || [];
  const roi = (roiData as Roi[] | null) || [];
  const cta = (ctaData as { slug: string; cta: string; clicks: number; last_click: string }[] | null) || [];
  const totalImpr = attr.reduce((s, a) => s + (a.impressions || 0), 0);
  const totalClicks = attr.reduce((s, a) => s + (a.clicks || 0), 0);
  const totalRev = roi.reduce((s, r) => s + Number(r.revenue_eur || 0), 0);
  const featured = attr.filter((a) => a.featured);

  return (
    <>
      <h1>Attribution &amp; advertiser ROI</h1>
      <p className="sub">The funnel we can measure honestly: the concierge recommends a listing → the guest opens it → (for advertisers) leads and revenue. Recommendation impressions come from the concierge turn log; clicks from tracked opens; revenue and leads from the CRM.</p>

      <div className="cards">
        <div className="stat"><div className="n">{totalImpr}</div><div className="k">Recs · 90d</div></div>
        <div className="stat"><div className="n">{totalClicks}</div><div className="k">Clicks · 90d</div></div>
        <div className="stat"><div className="n">{totalImpr > 0 ? Math.round((1000 * totalClicks) / totalImpr) / 10 : 0}%</div><div className="k">Overall CTR</div></div>
        <div className="stat"><div className="n">€{Math.round(totalRev).toLocaleString('en-US')}</div><div className="k">Advertiser revenue</div></div>
      </div>

      <h1 style={{ fontSize: 18 }}>Advertiser ROI</h1>
      <p className="sub">Each account that has spent — revenue, orders, the leads the concierge has routed to them, and revenue per lead.</p>
      <table className="adm-t">
        <thead><tr><th>Advertiser</th><th>Status</th><th>Revenue</th><th>Orders</th><th>Leads</th><th>€ / lead</th><th>Last order</th></tr></thead>
        <tbody>
          {roi.map((r, i) => (
            <tr key={i}>
              <td>{r.name || '—'}</td>
              <td>{r.status || '—'}</td>
              <td>€{Math.round(Number(r.revenue_eur || 0)).toLocaleString('en-US')}</td>
              <td>{r.orders}</td>
              <td>{r.leads}</td>
              <td>{r.revenue_per_lead != null ? `€${Math.round(r.revenue_per_lead).toLocaleString('en-US')}` : '—'}</td>
              <td>{r.last_order_at ? new Date(r.last_order_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
          {roi.length === 0 ? <tr><td colSpan={7}>No paid advertisers yet.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18 }}>Featured listings — exposure the concierge gave them</h1>
      <p className="sub">What our paying (featured) listings got from the concierge: how often surfaced, opened, and the click-through rate.</p>
      <table className="adm-t">
        <thead><tr><th>Listing</th><th>District</th><th>Recs</th><th>Clicks</th><th>CTR</th><th>Last surfaced</th></tr></thead>
        <tbody>
          {featured.map((a, i) => (
            <tr key={i}>
              <td>{a.name || a.slug}</td>
              <td>{a.district || '—'}</td>
              <td>{a.impressions}</td>
              <td>{a.clicks}</td>
              <td>{a.ctr_pct}%</td>
              <td>{a.last_recommended ? new Date(a.last_recommended).toLocaleDateString() : '—'}</td>
            </tr>
          ))}
          {featured.length === 0 ? <tr><td colSpan={6}>No featured listings with concierge exposure yet.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18 }}>CTA conversions — what visitors clicked</h1>
      <p className="sub">Actions taken on listing pages (website, phone, directions) — the SEO → action signal, last 90 days.</p>
      <table className="adm-t">
        <thead><tr><th>Listing</th><th>CTA</th><th>Clicks</th><th>Last</th></tr></thead>
        <tbody>
          {cta.map((c, i) => (
            <tr key={i}><td>{c.slug}</td><td>{c.cta}</td><td>{c.clicks}</td><td>{c.last_click ? new Date(c.last_click).toLocaleDateString() : '—'}</td></tr>
          ))}
          {cta.length === 0 ? <tr><td colSpan={4}>No CTA clicks logged yet.</td></tr> : null}
        </tbody>
      </table>

      <h1 style={{ fontSize: 18 }}>Most-recommended listings (all)</h1>
      <p className="sub">The listings the concierge surfaces most — a mix of merit and opportunity: a high-recommendation listing that isn't featured is an upsell candidate.</p>
      <table className="adm-t">
        <thead><tr><th>Listing</th><th>Type</th><th>District</th><th>Recs</th><th>Clicks</th><th>CTR</th><th>Featured?</th></tr></thead>
        <tbody>
          {attr.slice(0, 25).map((a, i) => (
            <tr key={i}>
              <td>{a.name || a.slug}</td>
              <td>{a.type || '—'}</td>
              <td>{a.district || '—'}</td>
              <td>{a.impressions}</td>
              <td>{a.clicks}</td>
              <td>{a.ctr_pct}%</td>
              <td>{a.featured ? '★' : <span style={{ color: '#C9A24C' }}>upsell?</span>}</td>
            </tr>
          ))}
          {attr.length === 0 ? <tr><td colSpan={7}>No recommendation data yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
