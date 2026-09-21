-- 0086_job_queue.sql
-- Roadmap item 01: lift the infra ceiling. The Vercel Hobby plan gives ONE cron a
-- day, which caps everything downstream. This adds a durable Postgres job queue with
-- atomic claim (FOR UPDATE SKIP LOCKED), retries with exponential backoff, dead-
-- lettering, dedupe and stuck-job reaping. A small /api/cron/worker drains it, and
-- Supabase pg_cron + pg_net can call that worker every few minutes for free (see
-- supabase/pg_cron/schedule.sql) — so work runs continuously instead of once a day.
-- Additive & idempotent. Inert until something enqueues jobs, so it is safe to ship.

create table if not exists public.job_queue (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  run_after    timestamptz not null default now(),   -- earliest time to run (backoff/scheduling)
  kind         text not null,                         -- dispatch key (see lib/jobs.ts)
  payload      jsonb not null default '{}',
  priority     int  not null default 0,               -- higher runs first
  status       text not null default 'pending',       -- pending | running | done | error | dead
  attempts     int  not null default 0,
  max_attempts int  not null default 5,
  last_error   text,
  locked_at    timestamptz,
  locked_by    text,
  dedupe_key   text                                   -- optional: no duplicate live job with this key
);

-- Claim path: pending & due, best priority first.
create index if not exists job_queue_claim_idx on public.job_queue (priority desc, run_after)
  where status = 'pending';
create index if not exists job_queue_status_idx on public.job_queue (status, updated_at desc);
-- At most one live (pending/running) job per dedupe_key.
create unique index if not exists job_queue_dedupe_uidx on public.job_queue (dedupe_key)
  where dedupe_key is not null and status in ('pending', 'running');

alter table public.job_queue enable row level security;
drop policy if exists "job_queue admin" on public.job_queue;
create policy "job_queue admin" on public.job_queue for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
-- (the worker uses the service role, which bypasses RLS)

-- ── Enqueue (dedupe-aware) ────────────────────────────────────────────────────
create or replace function public.job_enqueue(
  p_kind text, p_payload jsonb default '{}', p_run_after timestamptz default now(),
  p_priority int default 0, p_max_attempts int default 5, p_dedupe_key text default null
) returns uuid language plpgsql as $$
declare v_id uuid;
begin
  if p_dedupe_key is not null then
    select id into v_id from public.job_queue
      where dedupe_key = p_dedupe_key and status in ('pending', 'running') limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  insert into public.job_queue (kind, payload, run_after, priority, max_attempts, dedupe_key)
  values (p_kind, coalesce(p_payload, '{}'), coalesce(p_run_after, now()),
          coalesce(p_priority, 0), coalesce(p_max_attempts, 5), p_dedupe_key)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  -- a concurrent enqueue won the dedupe race; return the live one
  select id into v_id from public.job_queue
    where dedupe_key = p_dedupe_key and status in ('pending', 'running') limit 1;
  return v_id;
end $$;

-- ── Atomic claim ──────────────────────────────────────────────────────────────
create or replace function public.job_dequeue(p_worker text, p_limit int default 5)
returns setof public.job_queue language plpgsql as $$
begin
  return query
  with claimed as (
    select id from public.job_queue
    where status = 'pending' and run_after <= now()
    order by priority desc, run_after
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 5), 50))
  )
  update public.job_queue j
  set status = 'running', locked_at = now(), locked_by = p_worker,
      attempts = attempts + 1, updated_at = now()
  from claimed where j.id = claimed.id
  returning j.*;
end $$;

-- ── Complete / fail (with capped exponential backoff → dead-letter) ────────────
create or replace function public.job_complete(p_id uuid) returns void language sql as $$
  update public.job_queue
     set status = 'done', last_error = null, locked_at = null, locked_by = null, updated_at = now()
   where id = p_id;
$$;

create or replace function public.job_fail(p_id uuid, p_error text) returns void language plpgsql as $$
declare j public.job_queue;
begin
  select * into j from public.job_queue where id = p_id;
  if not found then return; end if;
  if j.attempts >= j.max_attempts then
    update public.job_queue
       set status = 'dead', last_error = left(coalesce(p_error, ''), 2000),
           locked_at = null, locked_by = null, updated_at = now()
     where id = p_id;
  else
    update public.job_queue
       set status = 'pending', last_error = left(coalesce(p_error, ''), 2000),
           run_after = now() + (interval '30 seconds' * power(2, least(j.attempts, 8))),
           locked_at = null, locked_by = null, updated_at = now()
     where id = p_id;
  end if;
end $$;

-- ── Reap stuck 'running' jobs (worker crashed mid-job) ────────────────────────
create or replace function public.job_reap_stuck(p_timeout interval default interval '5 minutes')
returns int language plpgsql as $$
declare n int;
begin
  with r as (
    update public.job_queue
       set status = case when attempts >= max_attempts then 'dead' else 'pending' end,
           last_error = left(coalesce(last_error, '') || ' [reaped: stuck running]', 2000),
           locked_at = null, locked_by = null, updated_at = now()
     where status = 'running' and locked_at < now() - p_timeout
     returning 1)
  select count(*) into n from r;
  return n;
end $$;

-- ── Retention ─────────────────────────────────────────────────────────────────
create or replace function public.job_prune(p_keep interval default interval '7 days')
returns int language plpgsql as $$
declare n int;
begin
  with d as (
    delete from public.job_queue
     where status in ('done', 'dead') and updated_at < now() - p_keep
     returning 1)
  select count(*) into n from d;
  return n;
end $$;

-- ── Admin dashboard view ──────────────────────────────────────────────────────
create or replace view public.job_queue_stats as
select status, count(*) as n, min(run_after) filter (where status = 'pending') as next_due,
       max(updated_at) as last_update
from public.job_queue group by status;

-- report
select 'job_queue' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name='job_queue') as tbl,
       (select count(*) from information_schema.routines where routine_schema='public'
         and routine_name in ('job_enqueue','job_dequeue','job_complete','job_fail','job_reap_stuck','job_prune')) as fns;
