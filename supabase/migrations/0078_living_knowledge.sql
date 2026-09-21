-- 0078_living_knowledge.sql
-- The "living knowledge" foundation: a generic source registry the daily cron
-- drains on a rotation, plus the provenance + structured fields that let us store
-- REAL, dated developer projects in the directory (Phase 1). Phases 2 (regulation
-- watch) and 3 (events actualiser) reuse the SAME scrape_sources registry.
-- Additive & idempotent. Every scraped fact carries its source_url + fetched_at,
-- so the concierge is fully informed AND auditable — never invented.

-- ── Source registry (all phases) ──────────────────────────────────────────────
create table if not exists public.scrape_sources (
  id              uuid primary key default gen_random_uuid(),
  category        text not null,                     -- 'development' | 'regulation' | 'events' | …
  name            text,                              -- human label (e.g. the developer's name)
  url             text not null,                     -- the page we fetch
  developer_slug  text,                              -- for developments: the parent developer's directory slug
  district        text,                              -- optional routing hint
  cadence_days    integer not null default 7,        -- how often this source is due
  enabled         boolean not null default true,
  status          text not null default 'active',    -- active | error | disabled
  last_fetched_at timestamptz,
  content_hash    text,                              -- fingerprint of last fetch (skip AI when unchanged → cost)
  last_error      text,
  last_found      integer,                           -- items found on the last successful run
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (category, url)
);
create index if not exists scrape_sources_due_idx on public.scrape_sources (category, enabled, last_fetched_at);

alter table public.scrape_sources enable row level security;
drop policy if exists "scrape_sources admin" on public.scrape_sources;
create policy "scrape_sources admin" on public.scrape_sources for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ── Structured project + provenance fields on the directory ───────────────────
-- Projects are stored as ordinary directory_listings of type='development', so they
-- inherit the whole existing stack (concierge grounding, contacts, directory pages,
-- map, dedup guard 0074). These columns add the structured facts a buyer needs.
alter table public.directory_listings add column if not exists price_from     integer;      -- EUR, numeric
alter table public.directory_listings add column if not exists price_to       integer;      -- EUR, numeric
alter table public.directory_listings add column if not exists price_currency text;         -- 'EUR' (default in app)
alter table public.directory_listings add column if not exists dev_status     text;         -- planning | under-construction | ready | sold-out
alter table public.directory_listings add column if not exists bedrooms       text;         -- e.g. '1–3'
alter table public.directory_listings add column if not exists completion      text;         -- e.g. 'Q4 2026'
alter table public.directory_listings add column if not exists developer_slug  text;         -- parent developer listing slug
alter table public.directory_listings add column if not exists source_url      text;         -- provenance: the exact page scraped
alter table public.directory_listings add column if not exists fetched_at      timestamptz;  -- provenance: when we scraped it

create index if not exists directory_developer_idx on public.directory_listings (developer_slug) where developer_slug is not null;
create index if not exists directory_dev_price_idx on public.directory_listings (type, price_from) where type = 'development';

-- ── Automation switches (opt-in, OFF by default) ──────────────────────────────
alter table public.automation_settings add column if not exists developments_enabled     boolean not null default false; -- run the scraper on the daily rotation
alter table public.automation_settings add column if not exists developments_autopublish boolean not null default false; -- publish scraped projects immediately vs. leave as drafts for review

-- report
select 'scrape_sources' as check,
       (select count(*) from information_schema.columns where table_schema='public' and table_name='scrape_sources') as source_cols,
       (select count(*) from information_schema.columns
         where table_schema='public' and table_name='directory_listings'
           and column_name in ('price_from','price_to','dev_status','bedrooms','completion','developer_slug','source_url','fetched_at')) as dir_cols_added,
       (select count(*) from information_schema.columns
         where table_schema='public' and table_name='automation_settings'
           and column_name in ('developments_enabled','developments_autopublish')) as auto_cols_added;
