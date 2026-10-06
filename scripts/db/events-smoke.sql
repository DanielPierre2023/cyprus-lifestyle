-- scripts/db/events-smoke.sql
-- Behaviour test for the automated Agenda (migration 20261007120000_events_pipeline.sql). Drill database only; rolls back.
-- Run after the migration chain:  psql -v ON_ERROR_STOP=1 -d <drill db> -f scripts/db/events-smoke.sql
begin;

do $ev$
declare
  user_id  uuid := 'bbbbbbbb-0000-0000-0000-00000000b702';
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a701';
  n bigint; j1 uuid; j2 uuid;
begin
  insert into auth.users (id, email) values (user_id, 'user@ev.invalid'), (admin_id, 'admin@ev.invalid');
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');

  -- the exact row shape lib/events/pipeline.ts inserts
  insert into public.events (slug, ingest_key, source, source_name, source_lang, source_url, url, title_en, title_el, summary_en, venue, district,
                             starts_at, ends_at, price, image, lat, lng, coords_precision, tags, organizer, status, auto_published, date_confidence, recurrence, last_seen_at)
  values ('ohi-day-20261028-abc123', 'cy-public-holidays:2026-10-28|Ohi Day', 'cy-public-holidays', 'Nager.Date public holidays', 'en',
          'https://date.nager.at/PublicHoliday/Country/CY#2026-10-28', 'https://date.nager.at/PublicHoliday/Country/CY#2026-10-28',
          'Ohi Day (public holiday in Cyprus)', 'Ημέρα του Όχι (αργία)', null, null, null, '2026-10-27T22:00:00Z', null, 'Free', null, null, null, null,
          array['public-holiday'], null, 'published', true, 'confirmed', 'annual', now());

  -- the unique keys are what makes the pipeline idempotent
  begin
    insert into public.events (slug, ingest_key, source_url, title_en, starts_at) values ('other-slug', 'cy-public-holidays:2026-10-28|Ohi Day', 'https://x.invalid/1', 'dup', now());
    raise exception 'EVENTS FAIL: a duplicate ingest_key was accepted';
  exception when unique_violation then null; end;
  -- source_url is deliberately NOT unique: production already holds duplicate source_url values from older imports
  -- (the unique index could not be created there). The pipeline dedupes by ingest_key and in code, so a repeated URL is accepted.
  insert into public.events (slug, ingest_key, source_url, title_en, starts_at) values ('other-slug-2', 'k2', 'https://date.nager.at/PublicHoliday/Country/CY#2026-10-28', 'same url, other key', now());
  delete from public.events where slug = 'other-slug-2';

  insert into public.events_sources (slug, enabled, last_status, last_found, last_added) values ('cy-public-holidays', true, 'ok', 32, 1);
  insert into public.events_ingest_runs (trigger, found, added) values ('queue', 32, 1);
  insert into public.automation_settings (id) values (1) on conflict (id) do nothing;      -- a fresh drill database has no settings row yet
  select count(*) into n from public.automation_settings where events_pipeline_enabled;
  if n < 1 then raise exception 'EVENTS FAIL: master switch column missing or not defaulting on'; end if;

  -- visitors and ordinary signed-in users cannot touch the registry state or the run log
  set local role anon;
  begin perform count(*) from public.events_sources; raise exception 'EVENTS FAIL: a visitor can read events_sources'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.events_ingest_runs; raise exception 'EVENTS FAIL: a visitor can read events_ingest_runs'; exception when insufficient_privilege then null; end;
  reset role;

  perform set_config('request.jwt.claim.sub', user_id::text, true);
  set local role authenticated;
  select count(*) into n from public.events_sources;
  if n <> 0 then raise exception 'EVENTS FAIL: an ordinary signed-in user sees % events_sources row(s)', n; end if;
  begin update public.events_sources set enabled = false; raise exception 'EVENTS FAIL: a signed-in user can switch sources'; exception when insufficient_privilege then null; end;
  reset role;

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  set local role authenticated;
  select count(*) into n from public.events_sources;
  if n <> 1 then raise exception 'EVENTS FAIL: an administrator sees % events_sources row(s), expected 1', n; end if;
  select count(*) into n from public.events_ingest_runs;
  if n <> 1 then raise exception 'EVENTS FAIL: an administrator sees % run row(s), expected 1', n; end if;
  begin update public.events_sources set enabled = false; raise exception 'EVENTS FAIL: even an administrator wrote directly (writes go through the audited route)'; exception when insufficient_privilege then null; end;
  reset role;

  -- the public Agenda still sees only published rows
  set local role anon;
  select count(*) into n from public.events where slug = 'ohi-day-20261028-abc123';
  if n <> 1 then raise exception 'EVENTS FAIL: a published pipeline event is not publicly readable'; end if;
  reset role;

  -- the schedule line from docs/EVENTS-PIPELINE.md: enqueueing from pg_cron, de-duplicated within the same slot
  j1 := public.job_enqueue('events_ingest', '{"trigger":"cron"}'::jsonb, now(), 1, 3, 'events:smoke-slot');
  j2 := public.job_enqueue('events_ingest', '{"trigger":"cron"}'::jsonb, now(), 1, 3, 'events:smoke-slot');
  if j1 is null or j1 <> j2 then raise exception 'EVENTS FAIL: the cron enqueue is not de-duplicated per slot'; end if;
end
$ev$;

rollback;
select 'events smoke: all checks hold' as result;
