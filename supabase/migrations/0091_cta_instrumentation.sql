-- 0091_cta_instrumentation.sql
-- Roadmap item 11: CTA conversion instrumentation. The category × district landing
-- pages (/best/[slug]), group hubs, guides and market hubs already exist and are in the
-- sitemap (programmatic SEO at scale), and Core Web Vitals are monitored via Vercel
-- Speed Insights. What was missing is measuring what happens ON those pages: which
-- calls-to-action (website, phone, directions, email) visitors actually click. We reuse
-- attribution_clicks (item 08) and add a `label` for the specific CTA. Additive & idempotent.

alter table public.attribution_clicks add column if not exists label text;  -- website | phone | directions | email | …

-- CTA engagement per listing (last 90 days), broken down by which CTA.
create or replace view public.cta_by_listing as
select slug, coalesce(label, source) as cta, count(*) as clicks, max(created_at) as last_click
from public.attribution_clicks
where created_at > now() - interval '90 days'
group by slug, coalesce(label, source);

-- report
select 'cta_instrumentation' as check,
       (select count(*) from information_schema.columns where table_name='attribution_clicks' and column_name='label') as col,
       (select count(*) from information_schema.views where table_schema='public' and table_name='cta_by_listing') as vw;
