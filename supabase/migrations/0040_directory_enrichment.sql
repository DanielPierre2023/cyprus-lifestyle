-- ============================================================================
-- Cyprus Lifestyle — 0040 · Directory enrichment support
--   Columns the enrich-directory edge function writes to. The image/email/url/
--   phone columns already exist (0018/0020); this adds attribution + a cursor
--   so batched runs drain forward and never reprocess the same row.
--   Idempotent, non-destructive.
-- ============================================================================

alter table public.directory_listings add column if not exists image_credit text;      -- photo source/attribution
alter table public.directory_listings add column if not exists enriched_at  timestamptz; -- when the enricher last processed this row
alter table public.directory_listings add column if not exists enrich_status text;        -- 'ok' | 'partial' | 'none'

-- cursor index: the function pulls rows where enriched_at is null
create index if not exists directory_enriched_idx on public.directory_listings (enriched_at);

-- report: how much is left to enrich
select
  count(*)                                            as total_published,
  count(*) filter (where image is null)               as missing_image,
  count(*) filter (where email is null)               as missing_email,
  count(*) filter (where enriched_at is null)          as not_yet_enriched
from public.directory_listings
where status = 'published';
