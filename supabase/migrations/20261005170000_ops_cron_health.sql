-- 20261005170000_ops_cron_health.sql
-- Phase 1 · close-out — let the site SEE whether its scheduled jobs (Supabase pg_cron) really run.
-- Idempotent; adds one read-only function. Changes no data. Run in: Supabase → SQL Editor.
--
-- Why: on 2026-10-05 all three scheduled jobs were found failing silently — two still contained the template
-- placeholders from supabase/pg_cron/schedule.sql ("<<SITE_URL>>", "<PROJECT_REF>") and the third sent a placeholder
-- secret and was refused with HTTP 401. Nothing noticed. The site now asks this function (server side only) and shows /
-- e-mails the result (Admin → System health).
--
-- Works whether or not pg_cron exists: without it the function simply returns no rows.

create or replace function public.ops_cron_health()
returns table (
  jobname      text,
  schedule     text,
  active       boolean,
  last_status  text,
  last_start   timestamptz,
  last_message text,
  last_success timestamptz,
  runs_24h     integer,
  failed_24h   integer
)
language plpgsql security definer
set search_path = public, pg_temp
as $$
begin
  if to_regclass('cron.job') is null then return; end if;
  return query execute $q$
    select j.jobname::text, j.schedule::text, j.active,
           l.status::text, l.start_time, left(coalesce(l.return_message, ''), 300),
           s.start_time,
           coalesce(c.runs, 0)::int, coalesce(c.failed, 0)::int
    from cron.job j
    left join lateral (select d.status, d.start_time, d.return_message from cron.job_run_details d
                       where d.jobid = j.jobid order by d.start_time desc limit 1) l on true
    left join lateral (select d.start_time from cron.job_run_details d
                       where d.jobid = j.jobid and d.status = 'succeeded' order by d.start_time desc limit 1) s on true
    left join lateral (select count(*) as runs, count(*) filter (where d.status = 'failed') as failed
                       from cron.job_run_details d
                       where d.jobid = j.jobid and d.start_time > now() - interval '24 hours') c on true
    order by j.jobname
  $q$;
end
$$;
revoke all on function public.ops_cron_health() from public, anon, authenticated;
grant execute on function public.ops_cron_health() to service_role;

-- VERIFY (SQL editor):  select * from public.ops_cron_health();
