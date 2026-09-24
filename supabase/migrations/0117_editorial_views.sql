-- ============================================================================
-- Cyprus Lifestyle — 0117 · Editorial accountability views
-- ----------------------------------------------------------------------------
-- Two read-only views the admin cockpit reads:
--   • editorial_plan     — per subcategory: monthly target vs published-this-month
--                          vs open ideas in the backlog, and the resulting gap.
--   • editorial_coverage — per subcategory that draws from the directory: how many
--                          candidate businesses exist vs how many we've featured.
-- Together they give the exact view of redactional needs — per category, per
-- subcategory, per subject — and the base for the coming months' plan.
--
-- A piece maps to a subcategory when its blog_posts.subcategory = the key, OR
-- (legacy) its blog_posts.category = the key. security_invoker so the caller's RLS
-- applies (these are admin-cockpit reads). Idempotent (create or replace).
-- ============================================================================

create or replace view public.editorial_plan
with (security_invoker = on) as
with pub as (
  select s.key as section_key,
         count(bp.id) filter (
           where bp.status = 'published'
             and bp.published_at >= date_trunc('month', now())
             and bp.published_at <  date_trunc('month', now()) + interval '1 month'
         ) as published_mtd,
         count(bp.id) filter (where bp.status = 'published') as published_total
  from public.editorial_sections s
  left join public.blog_posts bp on (bp.subcategory = s.key or bp.category = s.key)
  where s.parent_key is not null and s.active
  group by s.key
),
idea as (
  select coalesce(subcategory_key, section_key) as section_key,
         count(*) filter (where status in ('suggested','approved','assigned','drafting','scheduled')) as ideas_open,
         count(*) filter (where status = 'suggested') as ideas_suggested
  from public.editorial_ideas
  group by 1
)
select
  s.key                                as section_key,
  s.name                               as section_name,
  s.parent_key                         as department_key,
  d.name                               as department_name,
  s.sort,
  s.monthly_target,
  s.franchise_key,
  coalesce(pub.published_mtd, 0)       as published_mtd,
  coalesce(pub.published_total, 0)     as published_total,
  coalesce(idea.ideas_open, 0)         as ideas_open,
  coalesce(idea.ideas_suggested, 0)    as ideas_suggested,
  greatest(s.monthly_target - coalesce(pub.published_mtd, 0) - coalesce(idea.ideas_open, 0), 0) as gap
from public.editorial_sections s
join public.editorial_sections d on d.key = s.parent_key
left join pub  on pub.section_key  = s.key
left join idea on idea.section_key = s.key
where s.parent_key is not null and s.active
order by s.sort;

create or replace view public.editorial_coverage
with (security_invoker = on) as
select
  s.key            as section_key,
  s.name           as section_name,
  s.parent_key     as department_key,
  s.dir_groups,
  (select count(*) from public.directory_listings dl
     where dl.canonical_category = any (s.dir_groups)
       and dl.status in ('published','listed')) as candidates,
  (select count(distinct bp.subject_listing_id) from public.blog_posts bp
     where bp.status = 'published'
       and bp.subject_listing_id is not null
       and (bp.subcategory = s.key or bp.category = s.key)) as featured
from public.editorial_sections s
where s.parent_key is not null and s.active
  and array_length(s.dir_groups, 1) is not null
order by s.sort;

select 'editorial views ready' as status,
  (select count(*) from public.editorial_plan) as plan_rows,
  (select count(*) from public.editorial_coverage) as coverage_rows;
