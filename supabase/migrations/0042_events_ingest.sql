-- ============================================================================
-- Cyprus Lifestyle — 0042 · Events ingestion support
--   Lets the events-ingest edge function aggregate Cyprus events (with posters)
--   from external sources as DRAFTS for editorial approval.
--     • source        — which feed a row came from (e.g. 'allevents')
--     • unique(source_url) — dedupe: never import the same event twice
--   image/url/venue/starts_at/lat/lng/source_url already exist (0019/0020).
--   Idempotent, non-destructive.
-- ============================================================================

alter table public.events add column if not exists source text;

-- One row per external event. NON-partial on purpose: the ingest upserts with
-- ON CONFLICT (source_url), and Postgres can only use a NON-partial unique index
-- as the conflict arbiter. Manually-added events keep source_url = NULL, and NULLs
-- are distinct in a unique index, so any number of them coexist freely.
create unique index if not exists events_source_url_uidx on public.events (source_url);
create index if not exists events_source_idx on public.events (source);

-- ── 7-language parity ───────────────────────────────────────────────────────
-- The events table shipped (0019) with title/summary in EN/EL/RO/AR only, but the
-- Admin → Agenda form and the 7-language reader already expect DE/PL/RU too. Add
-- them here so: (a) saving an event no longer errors on the missing columns, (b)
-- the /agenda pages render in all seven editions, and (c) translate-on-approve can
-- fill every edition for the events this pipeline ingests. Idempotent.
alter table public.events add column if not exists title_de   text;
alter table public.events add column if not exists title_pl   text;
alter table public.events add column if not exists title_ru   text;
alter table public.events add column if not exists summary_de text;
alter table public.events add column if not exists summary_pl text;
alter table public.events add column if not exists summary_ru text;

-- report
select
  count(*)                                    as total,
  count(*) filter (where status = 'draft')    as drafts,
  count(*) filter (where status = 'published') as published,
  count(*) filter (where source is not null)   as imported
from public.events;
