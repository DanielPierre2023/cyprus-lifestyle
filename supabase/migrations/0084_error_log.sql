-- 0084_error_log.sql
-- Roadmap item 03: durable, queryable error monitoring that costs nothing extra.
-- reportError() already logs to the console and (optionally) Sentry; this adds a
-- persistent sink so failures are visible in the admin panel without paying for a
-- third-party service. One row per occurrence; a fingerprint groups repeats.
-- Anonymous/operational data only. Additive & idempotent.

create table if not exists public.error_log (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  level       text not null default 'error',   -- error | warn
  source      text,                             -- e.g. 'cron-tick', 'mail-inbound', 'concierge-chat'
  message     text,                             -- short human message (usually error.message)
  fingerprint text,                             -- source + normalised message, for grouping
  detail      jsonb                             -- stack, context, ids — whatever the caller passes
);
create index if not exists error_log_created_idx     on public.error_log (created_at desc);
create index if not exists error_log_fingerprint_idx on public.error_log (fingerprint, created_at desc);
create index if not exists error_log_source_idx      on public.error_log (source, created_at desc);

alter table public.error_log enable row level security;
drop policy if exists "error_log admin" on public.error_log;
create policy "error_log admin" on public.error_log for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
-- (written by the server with the service role, which bypasses RLS)

-- Grouped view for the admin panel: distinct problems, most-frequent first,
-- over the last 30 days, with a sample message and first/last seen.
drop view if exists public.error_log_grouped;
create or replace view public.error_log_grouped as
select fingerprint,
       max(source)                          as source,
       max(level)                           as level,
       (array_agg(message order by created_at desc))[1] as sample_message,
       count(*)                             as occurrences,
       min(created_at)                      as first_seen,
       max(created_at)                      as last_seen
from public.error_log
where created_at > now() - interval '30 days'
group by fingerprint
order by count(*) desc, max(created_at) desc;

-- Optional retention helper (call from the daily cron): keep 90 days.
create or replace function public.prune_error_log() returns integer language sql as $$
  with d as (delete from public.error_log where created_at < now() - interval '90 days' returning 1)
  select count(*)::int from d;
$$;

-- report
select 'error_log' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name='error_log') as tbl,
       (select count(*) from information_schema.views  where table_schema='public' and table_name='error_log_grouped') as vw;
