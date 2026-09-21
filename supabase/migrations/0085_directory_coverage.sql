-- 0085_directory_coverage.sql
-- Roadmap item 04: make directory coverage measurable so the scrape/enrich sprint
-- is driven by data, not guesswork. Views over published listings: overall, by
-- category group, by district, and a category × district matrix to spot thin cells.
-- Coverage dimensions: coordinates (for the map + neighbourhood radius), a contact
-- channel, a real photo (placeholders are render-time, so a non-null image column IS
-- a real image), verification, and data age (how stale the record is).
-- Views only — additive, idempotent, no data change.

-- Overall (one row) — the headline numbers.
create or replace view public.directory_coverage_overall as
select count(*)                                                                    as total,
       count(*) filter (where lat is not null and lng is not null)                 as with_coords,
       count(*) filter (where coalesce(phone, email, url) is not null)             as with_contact,
       count(*) filter (where image is not null and image <> '')                   as with_image,
       count(*) filter (where verified)                                            as verified,
       count(*) filter (where featured)                                            as featured,
       round(100.0 * count(*) filter (where lat is not null and lng is not null)     / greatest(count(*), 1), 0) as pct_coords,
       round(100.0 * count(*) filter (where coalesce(phone, email, url) is not null) / greatest(count(*), 1), 0) as pct_contact,
       round(100.0 * count(*) filter (where image is not null and image <> '')       / greatest(count(*), 1), 0) as pct_image,
       round(100.0 * count(*) filter (where verified)                               / greatest(count(*), 1), 0) as pct_verified
from public.directory_listings
where status = 'published';

-- By category group — where to point the enricher next.
create or replace view public.directory_coverage_by_group as
select coalesce(category_group, '(uncategorised)') as category_group,
       count(*)                                                                    as total,
       count(*) filter (where lat is not null and lng is not null)                 as with_coords,
       count(*) filter (where coalesce(phone, email, url) is not null)             as with_contact,
       count(*) filter (where image is not null and image <> '')                   as with_image,
       count(*) filter (where verified)                                            as verified,
       round(100.0 * count(*) filter (where lat is not null and lng is not null)     / greatest(count(*), 1), 0) as pct_coords,
       round(100.0 * count(*) filter (where coalesce(phone, email, url) is not null) / greatest(count(*), 1), 0) as pct_contact,
       round(100.0 * count(*) filter (where image is not null and image <> '')       / greatest(count(*), 1), 0) as pct_image,
       round(100.0 * count(*) filter (where verified)                               / greatest(count(*), 1), 0) as pct_verified,
       (percentile_cont(0.5) within group (order by extract(epoch from now() - coalesce(fetched_at, updated_at, created_at)) / 86400))::int as median_age_days
from public.directory_listings
where status = 'published'
group by 1
order by count(*) desc;

-- By district.
create or replace view public.directory_coverage_by_district as
select coalesce(district, '(unknown)') as district,
       count(*)                                                                    as total,
       count(*) filter (where lat is not null and lng is not null)                 as with_coords,
       count(*) filter (where image is not null and image <> '')                   as with_image,
       round(100.0 * count(*) filter (where lat is not null and lng is not null)     / greatest(count(*), 1), 0) as pct_coords,
       round(100.0 * count(*) filter (where image is not null and image <> '')       / greatest(count(*), 1), 0) as pct_image
from public.directory_listings
where status = 'published'
group by 1
order by count(*) desc;

-- Category × district matrix — the gap finder (thin or empty cells to fill).
create or replace view public.directory_coverage_cells as
select coalesce(category_group, '(uncategorised)') as category_group,
       coalesce(district, '(unknown)')             as district,
       count(*)                                                        as total,
       count(*) filter (where lat is not null and lng is not null)     as with_coords,
       count(*) filter (where image is not null and image <> '')       as with_image
from public.directory_listings
where status = 'published'
group by 1, 2;

-- report
select 'directory_coverage' as check,
       (select count(*) from information_schema.views where table_schema='public'
         and table_name in ('directory_coverage_overall','directory_coverage_by_group','directory_coverage_by_district','directory_coverage_cells')) as views;
