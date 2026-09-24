-- ============================================================================
-- Cyprus Lifestyle — 0110 · Coverage over the FULL directory (not just published)
-- ----------------------------------------------------------------------------
-- The 0085 coverage views counted status='published' only (~3k), hiding the ~14.7k
-- imported ('listed') businesses the concierge actually searches. And they grouped by the
-- old 6-value category_group, not the canonical taxonomy. This recreates the four views to:
--   • cover BOTH published + listed, with a published/listed split so nothing is hidden;
--   • group by canonical_category (the ~80 real categories from lib/directory/taxonomy.ts);
--   • count a photo as image OR source_image (the CSV image loaded in 0109);
--   • add with_rating, so the enrichment gap (reviews/ratings) is visible.
-- Views only — additive, idempotent, no data change.
-- ============================================================================

-- Photo = a curated image OR the imported source image.
-- (kept inline in each view; Postgres has no shared expression across views)

-- Drop first: CREATE OR REPLACE VIEW cannot reorder/rename existing columns, and we are
-- inserting published/listed columns, so the old 0085 definitions must go.
drop view if exists public.directory_coverage_overall;
drop view if exists public.directory_coverage_by_group;
drop view if exists public.directory_coverage_by_district;
drop view if exists public.directory_coverage_cells;

create view public.directory_coverage_overall as
select count(*)                                                                     as total,
       count(*) filter (where status = 'published')                                 as published,
       count(*) filter (where status = 'listed')                                    as listed,
       count(*) filter (where lat is not null and lng is not null)                  as with_coords,
       count(*) filter (where coalesce(phone, email, url) is not null)              as with_contact,
       count(*) filter (where (image is not null and image <> '') or (source_image is not null and source_image <> '')) as with_image,
       count(*) filter (where rating is not null)                                   as with_rating,
       count(*) filter (where verified)                                             as verified,
       count(*) filter (where featured)                                             as featured,
       round(100.0 * count(*) filter (where lat is not null and lng is not null)     / greatest(count(*), 1), 0) as pct_coords,
       round(100.0 * count(*) filter (where coalesce(phone, email, url) is not null) / greatest(count(*), 1), 0) as pct_contact,
       round(100.0 * count(*) filter (where (image is not null and image <> '') or (source_image is not null and source_image <> '')) / greatest(count(*), 1), 0) as pct_image,
       round(100.0 * count(*) filter (where rating is not null)                      / greatest(count(*), 1), 0) as pct_rating,
       round(100.0 * count(*) filter (where verified)                               / greatest(count(*), 1), 0) as pct_verified
from public.directory_listings
where status in ('published', 'listed');

create or replace view public.directory_coverage_by_group as
select coalesce(canonical_category, category_group, '(uncategorised)')              as category_group,
       count(*)                                                                     as total,
       count(*) filter (where status = 'published')                                 as published,
       count(*) filter (where status = 'listed')                                    as listed,
       count(*) filter (where lat is not null and lng is not null)                  as with_coords,
       count(*) filter (where coalesce(phone, email, url) is not null)              as with_contact,
       count(*) filter (where (image is not null and image <> '') or (source_image is not null and source_image <> '')) as with_image,
       count(*) filter (where rating is not null)                                   as with_rating,
       count(*) filter (where verified)                                             as verified,
       round(100.0 * count(*) filter (where lat is not null and lng is not null)     / greatest(count(*), 1), 0) as pct_coords,
       round(100.0 * count(*) filter (where coalesce(phone, email, url) is not null) / greatest(count(*), 1), 0) as pct_contact,
       round(100.0 * count(*) filter (where (image is not null and image <> '') or (source_image is not null and source_image <> '')) / greatest(count(*), 1), 0) as pct_image,
       round(100.0 * count(*) filter (where rating is not null)                      / greatest(count(*), 1), 0) as pct_rating,
       round(100.0 * count(*) filter (where verified)                               / greatest(count(*), 1), 0) as pct_verified,
       (percentile_cont(0.5) within group (order by extract(epoch from now() - coalesce(fetched_at, updated_at, created_at)) / 86400))::int as median_age_days
from public.directory_listings
where status in ('published', 'listed')
group by 1
order by count(*) desc;

create or replace view public.directory_coverage_by_district as
select coalesce(district, '(unknown)')                                             as district,
       count(*)                                                                     as total,
       count(*) filter (where status = 'published')                                 as published,
       count(*) filter (where status = 'listed')                                    as listed,
       count(*) filter (where lat is not null and lng is not null)                  as with_coords,
       count(*) filter (where (image is not null and image <> '') or (source_image is not null and source_image <> '')) as with_image,
       count(*) filter (where rating is not null)                                   as with_rating,
       round(100.0 * count(*) filter (where lat is not null and lng is not null)     / greatest(count(*), 1), 0) as pct_coords,
       round(100.0 * count(*) filter (where (image is not null and image <> '') or (source_image is not null and source_image <> '')) / greatest(count(*), 1), 0) as pct_image,
       round(100.0 * count(*) filter (where rating is not null)                      / greatest(count(*), 1), 0) as pct_rating
from public.directory_listings
where status in ('published', 'listed')
group by 1
order by count(*) desc;

create or replace view public.directory_coverage_cells as
select coalesce(canonical_category, category_group, '(uncategorised)')              as category_group,
       coalesce(district, '(unknown)')                                             as district,
       count(*)                                                                     as total,
       count(*) filter (where lat is not null and lng is not null)                  as with_coords,
       count(*) filter (where (image is not null and image <> '') or (source_image is not null and source_image <> '')) as with_image
from public.directory_listings
where status in ('published', 'listed')
group by 1, 2;

-- report
select 'directory_coverage_full' as check,
       (select total from public.directory_coverage_overall)     as total,
       (select published from public.directory_coverage_overall) as published,
       (select listed from public.directory_coverage_overall)    as listed;
