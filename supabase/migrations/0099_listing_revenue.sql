-- 0099_listing_revenue.sql
-- Roadmap item 17: PER-LISTING revenue attribution. Item 08 gave us revenue per
-- advertiser ORG and engagement per LISTING, but nothing tied the money to the
-- listing — so we could see which advertisers spend and which listings get clicked,
-- but not "which listings actually earn". This view closes that: it joins each
-- published directory listing to its advertiser account (crm_orgs.directory_listing_id,
-- kept in sync by the CRM-unify trigger from 0035) and brings together, per listing:
--   • booked revenue   — paid/active ad_orders (same definition as advertiser_roi)
--   • won / pipeline    — crm_deals value by stage
--   • active placements — live sponsor banners
--   • engagement        — concierge recommendations + tracked opens (90d)
-- so the desk can rank listings by € earned and by € per click. Read-only view over
-- existing tables; additive & idempotent; no new writes anywhere.

create or replace view public.listing_revenue as
select
  d.slug,
  d.name_en                              as name,
  d.district,
  d.type,
  d.featured,
  o.id                                   as org_id,
  o.name                                 as advertiser,
  o.tier                                 as advertiser_tier,
  o.status                               as advertiser_status,
  coalesce(rev.revenue_eur, 0)           as revenue_eur,
  coalesce(rev.orders, 0)                as orders,
  rev.last_order_at,
  coalesce(deal.won_eur, 0)              as won_eur,
  coalesce(deal.pipeline_eur, 0)         as pipeline_eur,
  coalesce(pl.active_placements, 0)      as active_placements,
  coalesce(rec.impressions, 0)           as impressions,
  coalesce(clk.clicks, 0)                as clicks,
  case when coalesce(clk.clicks, 0) > 0
       then round(coalesce(rev.revenue_eur, 0) / clk.clicks, 2) else null end as revenue_per_click
from public.directory_listings d
join public.crm_orgs o
  on o.directory_listing_id = d.id
left join (
  select org_id,
         sum(coalesce(amount, 0)) as revenue_eur,
         count(*)                 as orders,
         max(created_at)          as last_order_at
  from public.ad_orders
  where status in ('paid', 'active') and org_id is not null
  group by org_id
) rev on rev.org_id = o.id
left join (
  select org_id,
         sum(coalesce(value_eur, 0)) filter (where stage in ('won', 'live', 'renewal'))                    as won_eur,
         sum(coalesce(value_eur, 0)) filter (where stage in ('prospect', 'contacted', 'engaged', 'proposal')) as pipeline_eur
  from public.crm_deals
  where org_id is not null
  group by org_id
) deal on deal.org_id = o.id
left join (
  select org_id, count(*) as active_placements
  from public.sponsor_banners
  where is_active and org_id is not null
  group by org_id
) pl on pl.org_id = o.id
left join public.listing_recommendations rec on rec.slug = d.slug
left join (
  select slug, count(*) as clicks
  from public.attribution_clicks
  where created_at > now() - interval '90 days'
  group by slug
) clk on clk.slug = d.slug
where d.status = 'published'
order by coalesce(rev.revenue_eur, 0) desc, coalesce(deal.won_eur, 0) desc, coalesce(clk.clicks, 0) desc;

-- report
select 'listing_revenue' as check,
       (select count(*) from information_schema.views where table_schema='public' and table_name='listing_revenue') as vw;
