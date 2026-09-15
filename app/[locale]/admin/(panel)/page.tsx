import { supabaseServer } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  const sb = await supabaseServer();
  let q = sb.from(table).select('*', { count: 'exact', head: true });
  if (filter) q = filter(q);
  const { count } = await q;
  return count ?? 0;
}

export default async function Dashboard() {
  const sb = await supabaseServer();
  const [analyticsRes, spendRes] = await Promise.all([
    sb.rpc('get_analytics_data_admin', { p_period: '7d' }),
    sb.rpc('ai_spend_today'),
  ]);
  const a = (analyticsRes.data as any) || {};
  const overview = a.overview || {};
  const pages = (a.pages || []) as { label: string; value: number }[];
  const spendToday = Number(spendRes.data || 0);

  const [published, drafts, scraped, pendingComments, subscribers, unread] = await Promise.all([
    count('blog_posts', (q) => q.eq('status', 'published')),
    count('blog_posts', (q) => q.eq('status', 'draft')),
    count('scraped_articles', (q) => q.eq('status', 'scraped').eq('is_used', false)),
    count('comments', (q) => q.eq('is_approved', false)),
    count('newsletter_subscribers', (q) => q.eq('confirmed', true).eq('is_active', true)),
    count('contact_messages', (q) => q.eq('status', 'unread')),
  ]);

  return (
    <>
      <h1>Dashboard</h1>
      <p className="sub">The last 7 days, and what needs your attention.</p>
      <div className="cards">
        <div className="stat"><div className="n">{overview.views_7d ?? 0}</div><div className="k">Views · 7d</div></div>
        <div className="stat"><div className="n">{overview.visitors_7d ?? 0}</div><div className="k">Visitors · 7d</div></div>
        <div className="stat"><div className="n">{overview.live_5min ?? 0}</div><div className="k">Live now</div></div>
        <div className="stat"><div className="n">${spendToday.toFixed(2)}</div><div className="k">AI spend · today (USD, incl. admin)</div></div>
      </div>
      <div className="cards">
        <div className="stat"><div className="n">{published}</div><div className="k">Published</div></div>
        <div className="stat"><div className="n">{drafts}</div><div className="k">Drafts</div></div>
        <div className="stat"><div className="n">{scraped}</div><div className="k">In scrape queue</div></div>
        <div className="stat"><div className="n">{pendingComments}</div><div className="k">Comments to review</div></div>
        <div className="stat"><div className="n">{subscribers}</div><div className="k">Subscribers</div></div>
        <div className="stat"><div className="n">{unread}</div><div className="k">Unread inbox</div></div>
      </div>
      <h1 style={{ fontSize: 20, marginTop: 20 }}>Top pages · 7d</h1>
      <table className="adm-t">
        <thead><tr><th>Path</th><th>Views</th></tr></thead>
        <tbody>
          {pages.slice(0, 12).map((p, i) => <tr key={i}><td>{p.label}</td><td>{p.value}</td></tr>)}
          {pages.length === 0 ? <tr><td colSpan={2}>No traffic recorded yet.</td></tr> : null}
        </tbody>
      </table>
    </>
  );
}
