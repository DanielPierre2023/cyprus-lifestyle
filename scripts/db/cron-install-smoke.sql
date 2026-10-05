-- scripts/db/cron-install-smoke.sql
-- Tests supabase/pg_cron/install-jobs.sql and public.ops_cron_health() against STAND-INS for pg_cron, pg_net and Vault
-- (plain PostgreSQL has none of them). Proves: nothing to edit, jobs are only scheduled when their secrets exist, the helper
-- builds the right URL/headers from Vault, nobody but the server can use it, and re-running is harmless. Drill database only.
begin;

create schema if not exists cron;
create table cron.job (jobid serial primary key, jobname text, schedule text, command text, active boolean default true);
create table cron.job_run_details (jobid int, status text, start_time timestamptz default now(), return_message text);
create function cron.schedule(n text, s text, c text) returns bigint language sql as $$ insert into cron.job (jobname, schedule, command) values (n, s, c) returning jobid::bigint $$;
create function cron.unschedule(n text) returns boolean language sql as $$ with d as (delete from cron.job where jobname = n returning 1) select exists (select 1 from d) $$;
create schema if not exists vault;
create table vault.decrypted_secrets (name text primary key, decrypted_secret text);
create schema if not exists net;
create table net.calls (id bigserial primary key, url text, headers jsonb, body jsonb);
create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
  returns bigint language sql as $$ insert into net.calls (url, headers, body) values (url, headers, body) returning id $$;

-- 1. no secrets at all → nothing scheduled, nothing broken
\i supabase/pg_cron/install-jobs.sql
do $$ begin
  if (select count(*) from cron.job) <> 0 then raise exception 'CRON FAIL: jobs were scheduled without their secrets'; end if;
end $$;

-- 2. site secrets only → exactly the two site jobs
insert into vault.decrypted_secrets values ('cl_site_url', 'https://example.test/'), ('cl_cron_secret', 'cron-s3cret');
\i supabase/pg_cron/install-jobs.sql
do $$ begin
  if (select string_agg(jobname, ',' order by jobname) from cron.job) <> 'cl-process,cl-worker' then
    raise exception 'CRON FAIL: expected cl-process,cl-worker, got %', (select string_agg(jobname, ',' order by jobname) from cron.job);
  end if;
end $$;

-- 3. everything present → four jobs; running the installer again changes nothing (no duplicates)
insert into vault.decrypted_secrets values ('cl_service_role', 'service-key'), ('cl_enrich_secret', 'enrich-s3cret');
\i supabase/pg_cron/install-jobs.sql
\i supabase/pg_cron/install-jobs.sql
do $$
declare worker text; r record; n int;
begin
  select count(*) into n from cron.job;
  if n <> 4 then raise exception 'CRON FAIL: expected 4 jobs after two runs, got %', n; end if;
  select schedule into worker from cron.job where jobname = 'cl-worker';
  if worker <> '*/3 * * * *' then raise exception 'CRON FAIL: cl-worker schedule is %', worker; end if;
  if exists (select 1 from cron.job where command ~ '<<|<PROJECT|<SERVICE|PASTE_') then raise exception 'CRON FAIL: a job still carries a placeholder'; end if;

  -- 4. what the helper really sends
  perform ops.cron_post('site', '/api/cron/worker');
  select * into r from net.calls order by id desc limit 1;
  if r.url <> 'https://example.test/api/cron/worker' then raise exception 'CRON FAIL: site url is % (trailing slash not trimmed?)', r.url; end if;
  if r.headers ->> 'x-cron-secret' <> 'cron-s3cret' then raise exception 'CRON FAIL: cron secret header missing'; end if;

  perform ops.cron_post('edge', '/functions/v1/scrape-rss', '{"source":"cron"}'::jsonb);
  select * into r from net.calls order by id desc limit 1;
  if r.url <> 'https://htwaivnvabvpqkffllnc.supabase.co/functions/v1/scrape-rss' or r.headers ->> 'Authorization' <> 'Bearer service-key' or r.body ->> 'source' <> 'cron' then
    raise exception 'CRON FAIL: edge call wrong: % %', r.url, r.headers;
  end if;

  perform ops.cron_post('enrich', '/functions/v1/enrich-directory?entity=directory&limit=30');
  select * into r from net.calls order by id desc limit 1;
  if r.url not like '%/functions/v1/enrich-directory?entity=directory&limit=30' or r.headers ->> 'x-enrich-key' <> 'enrich-s3cret' or r.url like '%key=%' then
    raise exception 'CRON FAIL: enrich call wrong: % %', r.url, r.headers;
  end if;

  -- 5. a missing secret is a loud, readable failure (pg_cron records it as a failed run)
  delete from vault.decrypted_secrets where name = 'cl_cron_secret';
  begin perform ops.cron_post('site', '/x'); raise exception 'CRON FAIL: no error for a missing secret';
  exception when others then if sqlerrm not like '%cl_cron_secret is missing%' then raise; end if; end;
  begin perform ops.cron_post('bogus', '/x'); raise exception 'CRON FAIL: unknown kind accepted';
  exception when others then if sqlerrm not like '%unknown call kind%' then raise; end if; end;
end $$;

-- 6. only the server may use any of it
set local role anon;
do $$ begin
  begin perform ops.cron_post('site', '/x'); raise exception 'CRON FAIL: anon called ops.cron_post';
  exception when insufficient_privilege then null; end;
  begin perform * from public.ops_cron_health(); raise exception 'CRON FAIL: anon called ops_cron_health';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role authenticated;
do $$ begin
  begin perform ops.cron_post('site', '/x'); raise exception 'CRON FAIL: a signed-in user called ops.cron_post';
  exception when insufficient_privilege then null; end;
  begin perform * from public.ops_cron_health(); raise exception 'CRON FAIL: a signed-in user called ops_cron_health';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 7. the health function reports each job's last run
insert into cron.job_run_details (jobid, status, return_message)
  select jobid, 'failed', 'ERROR: invalid URL' from cron.job where jobname = 'cl-worker';
insert into cron.job_run_details (jobid, status, start_time) select jobid, 'succeeded', now() - interval '1 hour' from cron.job where jobname = 'cl-worker';
set local role service_role;
do $$
declare w record;
begin
  select * into w from public.ops_cron_health() where jobname = 'cl-worker';
  if w.last_status <> 'failed' or w.failed_24h <> 1 or w.runs_24h <> 2 or w.last_success is null then
    raise exception 'CRON FAIL: ops_cron_health wrong: %', w;
  end if;
  if (select count(*) from public.ops_cron_health()) <> 4 then raise exception 'CRON FAIL: ops_cron_health should list 4 jobs'; end if;
end $$;
reset role;

do $$ begin raise warning 'cron install smoke: all checks hold'; end $$;
rollback;
