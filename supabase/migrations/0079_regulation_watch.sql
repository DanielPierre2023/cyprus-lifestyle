-- 0079_regulation_watch.sql
-- Living knowledge Phase 2: regulation watch. Reuses the scrape_sources registry
-- (category='regulation'). We keep one text snapshot per source to diff against, and
-- when an official page changes we write a reviewable alert with an AI-summarised
-- "what changed" — so the concierge's tax / residency / buyer answers can be kept
-- current by a human, never silently rewritten by a scrape. Requires 0078.
-- Additive & idempotent.

-- One snapshot per source (the last text we saw), used to detect + summarise change.
create table if not exists public.regulation_snapshots (
  source_id  uuid primary key references public.scrape_sources(id) on delete cascade,
  text       text,
  hash       text,
  fetched_at timestamptz not null default now()
);

-- The change feed an admin reviews. status: new | reviewed | dismissed.
create table if not exists public.regulation_alerts (
  id          uuid primary key default gen_random_uuid(),
  source_id   uuid references public.scrape_sources(id) on delete set null,
  url         text,
  title       text,
  summary     text,                          -- AI "what changed" (old vs new)
  severity    text not null default 'info',  -- info | minor | major
  status      text not null default 'new',   -- new | reviewed | dismissed
  detected_at timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists regulation_alerts_status_idx on public.regulation_alerts (status, detected_at desc);

alter table public.regulation_snapshots enable row level security;
alter table public.regulation_alerts    enable row level security;
drop policy if exists "regulation_snapshots admin" on public.regulation_snapshots;
create policy "regulation_snapshots admin" on public.regulation_snapshots for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "regulation_alerts admin" on public.regulation_alerts;
create policy "regulation_alerts admin" on public.regulation_alerts for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

alter table public.automation_settings add column if not exists regulation_watch_enabled boolean not null default false; -- opt-in, off

-- report
select 'regulation_watch' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name in ('regulation_snapshots','regulation_alerts')) as tables,
       (select count(*) from information_schema.columns where table_schema='public' and table_name='automation_settings' and column_name='regulation_watch_enabled') as toggle;
