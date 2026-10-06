-- 20261007120000_events_pipeline.sql
-- Increment 7.1 — AUTOMATED, ALWAYS-PRESENT EVENTS. Idempotent; changes no existing rows.
-- Run in: Supabase → SQL Editor, project cyprus_lifestyle (htwaivnvabvpqkffllnc).
--
-- Why: the Agenda had 31 events, only 1 upcoming. The old "Agenda actualiser" switch (events_watch_enabled) was OFF, and even when ON
-- its queue job only mined our own articles with a paid AI model — external listings came from a hand-run edge function
-- (last run 2026-09-17). Now a free, rule-based pipeline (lib/events/*) runs from the job queue every few hours.
--
-- Adds:
--   events.*                      provenance + pipeline bookkeeping columns (source_name, source_lang, auto_published, last_seen_at, geocoded_at)
--   events_sources                one row per registered source: enabled switch, last run, items found/added/duplicates/errors
--   events_ingest_runs            one row per pipeline run (kept 60 days)
--   automation_settings.events_pipeline_enabled   master switch (default ON: the owner asked for this to be automatic)
-- Security: RLS on both new tables; admins can read them; all writes use the service role (pipeline + audited admin route).

-- ── events: columns the pipeline relies on (the first three exist in production already; "if not exists" keeps rebuilds identical)
alter table public.events add column if not exists ingest_key      text;
alter table public.events add column if not exists date_confidence text default 'confirmed';   -- confirmed | approximate
alter table public.events add column if not exists recurrence      text default 'one-off';     -- one-off | annual
alter table public.events add column if not exists source          text;
alter table public.events add column if not exists source_url      text;
alter table public.events add column if not exists organizer       text;
alter table public.events add column if not exists coords_precision text default 'exact';      -- exact | town
alter table public.events add column if not exists source_name     text;                       -- who to credit ("Limassol Tourism")
alter table public.events add column if not exists source_lang     text default 'en';          -- language the title/summary were written in
alter table public.events add column if not exists auto_published  boolean not null default false;
alter table public.events add column if not exists last_seen_at    timestamptz;                -- last time the pipeline touched the row (human-edit guard)
alter table public.events add column if not exists geocoded_at     timestamptz;                -- venue geocoding attempted (once)

create unique index if not exists events_ingest_key_uidx on public.events (ingest_key);
-- NOT unique: production already holds duplicate source_url values (older imports); the pipeline dedupes in code, never by constraint.
create index if not exists events_source_url_idx on public.events (source_url);
create index if not exists events_source_idx on public.events (source);
create index if not exists events_geocode_todo_idx on public.events (created_at desc) where source is not null and geocoded_at is null;
create index if not exists events_upcoming_idx on public.events (status, starts_at, ends_at);

-- ── master switch
alter table public.automation_settings add column if not exists events_pipeline_enabled boolean not null default true;

-- ── source registry state (the list of sources itself lives in lib/events/sources.ts; this table holds what changes at run time)
create table if not exists public.events_sources (
  slug                 text primary key,
  enabled              boolean,                       -- null = use the registry default; true/false = an administrator's choice
  publish_mode         text check (publish_mode in ('auto', 'draft')),   -- null = registry default; 'draft' = never auto-publish this source
  last_run_at          timestamptz,
  last_success_at      timestamptz,
  last_status          text,                          -- ok | not-modified | error | blocked
  last_found           integer not null default 0,
  last_added           integer not null default 0,
  last_duplicates      integer not null default 0,
  last_errors          integer not null default 0,
  last_error           text,
  consecutive_failures integer not null default 0,
  etag                 text,
  cursor               jsonb,                         -- event pages that repeatedly failed (so they are not retried forever)
  updated_at           timestamptz not null default now()
);

create table if not exists public.events_ingest_runs (
  id           bigint generated always as identity primary key,
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  trigger      text,                                  -- queue | admin | tick
  ms           integer,
  found        integer not null default 0,
  added        integer not null default 0,
  updated      integer not null default 0,
  duplicates   integer not null default 0,
  errors       integer not null default 0,
  published    integer not null default 0,
  drafted      integer not null default 0,
  stopped_early boolean not null default false,
  detail       jsonb                                  -- per-source results
);
create index if not exists events_ingest_runs_started_idx on public.events_ingest_runs (started_at desc);

alter table public.events_sources     enable row level security;
alter table public.events_ingest_runs enable row level security;

drop policy if exists "events sources admin read" on public.events_sources;
create policy "events sources admin read" on public.events_sources
  as permissive for select to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role));
drop policy if exists "events runs admin read" on public.events_ingest_runs;
create policy "events runs admin read" on public.events_ingest_runs
  as permissive for select to authenticated using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Admins may READ both tables. Every write (the pipeline, and the admin switches via /api/admin/events/pipeline, which is audited)
-- goes through the service role, so no write grant or policy exists for signed-in users.
revoke all on public.events_sources     from public, anon, authenticated;
revoke all on public.events_ingest_runs from public, anon, authenticated;
grant select on public.events_sources     to authenticated;
grant select on public.events_ingest_runs to authenticated;

-- report
select 'events_pipeline' as check,
       (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'events'
          and column_name in ('source_name', 'source_lang', 'auto_published', 'last_seen_at', 'geocoded_at', 'ingest_key')) as event_cols,
       (select count(*) from information_schema.tables where table_schema = 'public' and table_name in ('events_sources', 'events_ingest_runs')) as tables,
       (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'automation_settings' and column_name = 'events_pipeline_enabled') as switch;
