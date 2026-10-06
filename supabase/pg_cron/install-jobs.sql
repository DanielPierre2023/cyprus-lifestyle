-- supabase/pg_cron/install-jobs.sql
-- Installs (or repairs) every scheduled job of Cyprus Lifestyle in Supabase. Safe to run any number of times.
-- It replaces the placeholder-ridden supabase/pg_cron/schedule.sql: THIS FILE HAS NOTHING TO EDIT. The site address and the
-- secrets are read from Supabase Vault when each job runs, so a wrong value is fixed by updating the Vault entry, not the job.
--
-- BEFORE the first run (Supabase → SQL Editor, once; use YOUR values):
--   select vault.create_secret('https://cypruslifestyle.eu',       'cl_site_url');      -- public address of the site, no trailing slash
--   select vault.create_secret('<the CRON_SECRET set in Vercel>',  'cl_cron_secret');   -- long random string; the same value as in Vercel
--   select vault.create_secret('<the service_role key>',           'cl_service_role');  -- Supabase → Project settings → API → service_role
--   select vault.create_secret('<the ENRICH_SECRET>',              'cl_enrich_secret'); -- the same value as in Vercel AND in the edge functions' secrets
-- To CHANGE a value later:  select vault.update_secret((select id from vault.secrets where name = 'cl_site_url'), 'https://new-value');
--
-- Extensions needed (Database → Extensions): pg_cron, pg_net, supabase_vault.
--
-- Jobs:
--   cl-booking-sla     every 15 min  concierge booking: first-reply breach alerts and partner reminders
--   cl-embed-sources   daily 02:15   indexes new articles, events and activities for the concierge (a no-op without OPENAI_API_KEY)
--   cl-events-ingest   every 3 h     refreshes the Agenda from the event sources (only enqueues; needs no secret)
--   cl-worker          every 3 min   background queue + sends approved newsletter editions + Facebook/Instagram posts + health checks
--   cl-process         every 15 min  AI desk: rewrites queued articles (does nothing unless "AI processor" is switched on in Admin → AI)
--   cyprus-scrape-rss  every 3 h     RSS scraper edge function (does nothing unless "RSS scraper" is switched on)
--   enrich-slow-all    daily 03:00   slow directory enrichment edge function
-- A job whose secret is missing is NOT scheduled; the notice says which one. Check the result in Admin → System health.

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;

-- The one helper every job calls: it looks the address and the secret up in Vault and fires the HTTP request.
--   p_kind 'site'   → the website            (header x-cron-secret    = cl_cron_secret)
--   p_kind 'edge'   → a Supabase edge function (header Authorization   = Bearer cl_service_role)
--   p_kind 'enrich' → an edge function that takes the enrich key        (header x-enrich-key = cl_enrich_secret)
-- A missing Vault entry raises a readable error, which pg_cron records as a failed run (and Admin → System health shows).
create or replace function ops.cron_post(p_kind text, p_path text, p_body jsonb default '{}'::jsonb)
returns bigint
language plpgsql security definer
set search_path = pg_temp
as $$
declare
  v_base text;
  v_hdr  jsonb := jsonb_build_object('Content-Type', 'application/json');
  v_val  text;
begin
  if p_kind = 'site' then
    select decrypted_secret into v_base from vault.decrypted_secrets where name = 'cl_site_url';
    if v_base is null then raise exception 'Vault secret cl_site_url is missing'; end if;
    select decrypted_secret into v_val from vault.decrypted_secrets where name = 'cl_cron_secret';
    if v_val is null then raise exception 'Vault secret cl_cron_secret is missing'; end if;
    v_hdr := v_hdr || jsonb_build_object('x-cron-secret', v_val);
  elsif p_kind in ('edge', 'enrich') then
    v_base := 'https://htwaivnvabvpqkffllnc.supabase.co';
    if p_kind = 'edge' then
      select decrypted_secret into v_val from vault.decrypted_secrets where name = 'cl_service_role';
      if v_val is null then raise exception 'Vault secret cl_service_role is missing'; end if;
      v_hdr := v_hdr || jsonb_build_object('Authorization', 'Bearer ' || v_val);
    else
      select decrypted_secret into v_val from vault.decrypted_secrets where name = 'cl_enrich_secret';
      if v_val is null then raise exception 'Vault secret cl_enrich_secret is missing'; end if;
      v_hdr := v_hdr || jsonb_build_object('x-enrich-key', v_val);
    end if;
  else
    raise exception 'unknown call kind %', p_kind;
  end if;
  return net.http_post(url := rtrim(v_base, '/') || p_path, headers := v_hdr, body := p_body, timeout_milliseconds := 55000);
end
$$;
revoke all on function ops.cron_post(text, text, jsonb) from public, anon, authenticated;

-- (Re)schedule one job; skip it with a notice when a secret it needs is not in Vault yet.
create or replace function ops.schedule_job(p_name text, p_schedule text, p_command text, p_needs text[])
returns void
language plpgsql
set search_path = pg_temp
as $$
declare missing text;
begin
  if exists (select 1 from cron.job where jobname = p_name) then perform cron.unschedule(p_name); end if;
  select string_agg(n, ', ') into missing from unnest(p_needs) n
   where not exists (select 1 from vault.decrypted_secrets s where s.name = n);
  if missing is not null then
    raise notice 'NOT scheduled: % — add the Vault secret(s) %, then run this file again.', p_name, missing;
    return;
  end if;
  perform cron.schedule(p_name, p_schedule, p_command);
  raise notice 'scheduled: % (%)', p_name, p_schedule;
end
$$;
revoke all on function ops.schedule_job(text, text, text, text[]) from public, anon, authenticated;

select ops.schedule_job('cl-worker',         '*/3 * * * *', $c$select ops.cron_post('site', '/api/cron/worker')$c$,  array['cl_site_url', 'cl_cron_secret']);
select ops.schedule_job('cl-process',        '*/15 * * * *', $c$select ops.cron_post('site', '/api/cron/process')$c$, array['cl_site_url', 'cl_cron_secret']);
select ops.schedule_job('cyprus-scrape-rss', '0 */3 * * *', $c$select ops.cron_post('edge', '/functions/v1/scrape-rss', '{"source":"cron"}'::jsonb)$c$, array['cl_service_role']);
select ops.schedule_job('enrich-slow-all',   '0 3 * * *',   $c$select ops.cron_post('enrich', '/functions/v1/enrich-directory?entity=directory&status=all&limit=30&reviews=1')$c$, array['cl_enrich_secret']);

select ops.schedule_job('cl-booking-sla',   '*/15 * * * *', $c$select ops.cron_post('site', '/api/cron/booking-sla')$c$, array['cl_site_url', 'cl_cron_secret']);
select ops.schedule_job('cl-embed-sources', '15 2 * * *',   $c$select ops.cron_post('site', '/api/concierge/embed-sources?batch=1')$c$, array['cl_site_url', 'cl_cron_secret']);
select ops.schedule_job('cl-events-ingest', '17 */3 * * *',
  $c$select public.job_enqueue('events_ingest', '{"trigger":"cron"}'::jsonb, now(), 1, 3, 'events:' || to_char(now() at time zone 'utc', 'YYYY-MM-DD-HH24'))$c$,
  array[]::text[]);

-- Result:  select jobname, schedule, active from cron.job order by jobname;
--          select * from public.ops_cron_health();      -- last run of each job (migration 20261005170000)
