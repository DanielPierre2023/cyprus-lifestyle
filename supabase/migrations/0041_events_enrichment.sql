-- ============================================================================
-- Cyprus Lifestyle — 0041 · Events (Agenda) enrichment support
--   Mirrors 0040 for the events table so the enrich-directory function can also
--   fill event photos (?entity=events). image/url/source_url/venue already exist
--   (0019/0020); this adds attribution + the drain-forward cursor.
--   Idempotent, non-destructive.
-- ============================================================================

alter table public.events add column if not exists image_credit  text;
alter table public.events add column if not exists enriched_at   timestamptz;
alter table public.events add column if not exists enrich_status text;

create index if not exists events_enriched_idx on public.events (enriched_at);

-- report
select
  count(*)                                   as total_published,
  count(*) filter (where image is null)      as missing_image,
  count(*) filter (where enriched_at is null) as not_yet_enriched
from public.events
where status = 'published';
