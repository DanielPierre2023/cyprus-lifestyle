-- ============================================================================
-- Cyprus Lifestyle — 0043 · Directory richness (descriptions, rating, standard)
--   Backs the "discovery engine" hub page and peer comparison. All additive &
--   idempotent — nothing dropped, nothing rewritten.
--     • rating / rating_count — Google rating powers comparison + rich results
--     • north / prev_status already added earlier (0-day North hide)
--   Descriptions live in the existing summary_<lang> columns (enricher fills EN;
--   editors can refine any language in Admin → Directory).
-- ============================================================================

alter table public.directory_listings add column if not exists rating       real;
alter table public.directory_listings add column if not exists rating_count  integer;

-- fast "around this place" bounding-box scans + comparison ordering
create index if not exists directory_latlng_idx on public.directory_listings (lat, lng) where status = 'published';
create index if not exists directory_type_district_idx on public.directory_listings (type, district) where status = 'published';

-- report: how much richness we have so far
select
  count(*)                                     as published,
  count(*) filter (where image is not null)    as with_photo,
  count(*) filter (where summary_en is not null and summary_en <> '') as with_description,
  count(*) filter (where rating is not null)   as with_rating
from public.directory_listings
where status = 'published';
