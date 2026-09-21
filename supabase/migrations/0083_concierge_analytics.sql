-- 0083_concierge_analytics.sql
-- Roadmap item 02 (the audit's highest-leverage build): measure what the concierge
-- can and cannot answer. Every turn is logged with its retrieval facts and a coverage
-- verdict, so we get (a) an honest answer-coverage rate and (b) an auto-generated
-- backlog of the exact questions we couldn't fully answer — the list of what to
-- scrape, write and enrich next. Anonymous (cid only); no sensitive data.
-- Additive & idempotent.

create table if not exists public.concierge_events (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  cid          text,                              -- anonymous browser id, if any
  locale       text,
  channel      text not null default 'web',       -- web | whatsapp | email | request
  question     text,                              -- the guest's question (for the backlog)
  answer_chars integer,                           -- length of the answer produced
  picks        integer not null default 0,        -- directory candidates grounded on
  kb           integer not null default 0,        -- knowledge-base hits grounded on
  near         boolean not null default false,    -- a neighbourhood point was resolved
  coverage     text not null default 'full',      -- full | partial | deferred
  reason       text,                              -- ok | thin | no_data
  recommended  text[] default '{}',               -- listing slugs surfaced (attribution, item 08)
  latency_ms   integer,
  meta         jsonb
);
create index if not exists concierge_events_created_idx  on public.concierge_events (created_at desc);
create index if not exists concierge_events_coverage_idx on public.concierge_events (coverage, created_at desc);

alter table public.concierge_events enable row level security;
drop policy if exists "concierge_events admin" on public.concierge_events;
create policy "concierge_events admin" on public.concierge_events for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
-- (written by the concierge with the service role, which bypasses RLS)

-- Daily coverage rate for the admin analytics panel.
-- Note: column names avoid the reserved word "full" so consumers never need to quote.
drop view if exists public.concierge_coverage_daily;
create or replace view public.concierge_coverage_daily as
select (created_at at time zone 'UTC')::date as day,
       count(*)                                             as total,
       count(*) filter (where coverage = 'full')            as full_ct,
       count(*) filter (where coverage = 'partial')         as partial_ct,
       count(*) filter (where coverage = 'deferred')        as deferred_ct,
       round(100.0 * count(*) filter (where coverage in ('full','partial')) / greatest(count(*), 1), 1) as coverage_rate
from public.concierge_events
group by 1 order by 1 desc;

-- report
select 'concierge_analytics' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name='concierge_events') as tbl,
       (select count(*) from information_schema.views  where table_schema='public' and table_name='concierge_coverage_daily') as vw;
