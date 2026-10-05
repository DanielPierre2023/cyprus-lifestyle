-- scripts/db/newsletter-smoke.sql
-- Behaviour test for the Friday newsletter tables (migration 20261005140100_newsletter_workflow.sql):
-- one campaign per (week, edition); an address can be claimed only once per campaign; who may read the delivery log.
-- Run by scripts/db/restore-drill.sh; drill database only; rolls back.
begin;

do $nl$
declare
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a201';
  user_id  uuid := 'bbbbbbbb-0000-0000-0000-00000000b202';
  c1 uuid; n bigint;
begin
  insert into auth.users (id, email) values (admin_id, 'admin@nl.invalid'), (user_id, 'user@nl.invalid');
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');

  -- 1. one campaign per (ISO week, edition)
  insert into public.newsletter_campaigns (subject, status, target_language, edition_week) values ('Smoke', 'draft', 'de', '2026-W41') returning id into c1;
  begin
    insert into public.newsletter_campaigns (subject, status, target_language, edition_week) values ('Smoke again', 'draft', 'de', '2026-W41');
    raise exception 'NEWSLETTER FAIL: a second campaign for the same week and edition was accepted';
  exception when unique_violation then null;
  end;
  insert into public.newsletter_campaigns (subject, status, target_language, edition_week) values ('Smoke fr', 'draft', 'en', '2026-W41');   -- another edition: fine
  insert into public.newsletter_campaigns (subject, status, target_language) values ('Legacy 1', 'sent', 'de'), ('Legacy 2', 'sent', 'de');  -- old rows have no week: no clash

  -- 2. claiming an address: the first pass gets it, a second pass gets nothing (this is what stops double sends)
  with a as (insert into public.newsletter_deliveries (campaign_id, email, status) values (c1, 'x@y.co', 'queued') on conflict do nothing returning 1)
  select count(*) into n from a;
  if n <> 1 then raise exception 'NEWSLETTER FAIL: first claim returned % rows', n; end if;
  with b as (insert into public.newsletter_deliveries (campaign_id, email, status) values (c1, 'x@y.co', 'queued') on conflict do nothing returning 1)
  select count(*) into n from b;
  if n <> 0 then raise exception 'NEWSLETTER FAIL: the same address was claimable twice (%)', n; end if;
  begin
    insert into public.newsletter_deliveries (campaign_id, email, status) values (c1, 'z@y.co', 'bogus');
    raise exception 'NEWSLETTER FAIL: an invalid delivery status was accepted';
  exception when check_violation then null;
  end;

  -- 3. the delivery log is for administrators only
  set local role anon;
  begin perform count(*) from public.newsletter_deliveries; raise exception 'NEWSLETTER FAIL: a visitor can read deliveries';
  exception when insufficient_privilege then null; end;
  reset role;
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  set local role authenticated;
  select count(*) into n from public.newsletter_deliveries; reset role;
  if n <> 0 then raise exception 'NEWSLETTER FAIL: an ordinary user can read deliveries (%)', n; end if;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  set local role authenticated;
  select count(*) into n from public.newsletter_deliveries; reset role;
  if n < 1 then raise exception 'NEWSLETTER FAIL: an administrator cannot read deliveries'; end if;

  -- 4. deleting a campaign removes its delivery rows
  delete from public.newsletter_campaigns where id = c1;
  select count(*) into n from public.newsletter_deliveries where campaign_id = c1;
  if n <> 0 then raise exception 'NEWSLETTER FAIL: deliveries survived their campaign'; end if;

  raise warning 'newsletter smoke: all checks hold';
end
$nl$;

rollback;
