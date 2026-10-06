-- scripts/db/business-erase-smoke.sql
-- Behaviour test for migration 20261008110000_privacy_erase_business.sql: public.erase_personal_data now removes AND reports the
-- Business Hub account of the person (sessions, sign-in links, listing links, proposals) and nobody else's. Drill database only; rolls back.
begin;

do $be$
declare
  a uuid; a_other uuid; r jsonb; r2 jsonb; n bigint;
begin
  insert into public.business_accounts (email, status) values ('erase-biz@bk.invalid', 'active') returning id into a;
  insert into public.business_accounts (email, status) values ('keep-biz@bk.invalid', 'active') returning id into a_other;
  insert into public.business_listings (account_id, listing_slug) values (a, 'erase-biz-cafe'), (a, 'erase-biz-bar'), (a_other, 'keep-biz-shop');
  insert into public.business_login_tokens (account_id, token_hash, expires_at) values (a, 'be-t1', now() + interval '30 minutes'), (a_other, 'be-t2', now() + interval '30 minutes');
  insert into public.business_sessions (account_id, token_hash, expires_at) values (a, 'be-s1', now() + interval '14 days'), (a_other, 'be-s2', now() + interval '14 days');
  insert into public.business_submissions (account_id, listing_slug, kind, payload) values
    (a, 'erase-biz-cafe', 'news', '{"title":"t","body":"b"}'::jsonb), (a_other, 'keep-biz-shop', 'news', '{"title":"t","body":"b"}'::jsonb);

  r := public.erase_personal_data('  Erase-BIZ@bk.invalid ', 'smoke');
  if (r -> 'counts' ->> 'business_accounts')::int <> 1 then raise exception 'BIZ ERASE FAIL: account not reported: %', r; end if;
  if (r -> 'counts' ->> 'business_sessions')::int <> 1 then raise exception 'BIZ ERASE FAIL: sessions not reported: %', r; end if;
  if (r -> 'counts' ->> 'business_login_tokens')::int <> 1 then raise exception 'BIZ ERASE FAIL: sign-in links not reported: %', r; end if;
  if (r -> 'counts' ->> 'business_listings')::int <> 2 then raise exception 'BIZ ERASE FAIL: listing links not reported: %', r; end if;
  if (r -> 'counts' ->> 'business_submissions')::int <> 1 then raise exception 'BIZ ERASE FAIL: proposals not reported: %', r; end if;
  if (r ->> 'total')::int < 6 then raise exception 'BIZ ERASE FAIL: total does not include the business rows: %', r; end if;
  if not (r -> 'counts' ? 'bookings') then raise exception 'BIZ ERASE FAIL: the booking counts disappeared: %', r; end if;

  select count(*) into n from public.business_accounts where id = a;                         if n <> 0 then raise exception 'BIZ ERASE FAIL: account survived'; end if;
  select (select count(*) from public.business_listings where account_id = a) + (select count(*) from public.business_login_tokens where account_id = a)
       + (select count(*) from public.business_sessions where account_id = a) + (select count(*) from public.business_submissions where account_id = a) into n;
  if n <> 0 then raise exception 'BIZ ERASE FAIL: % rows survived their account', n; end if;
  select (select count(*) from public.business_accounts where id = a_other) + (select count(*) from public.business_listings where account_id = a_other)
       + (select count(*) from public.business_login_tokens where account_id = a_other) + (select count(*) from public.business_sessions where account_id = a_other)
       + (select count(*) from public.business_submissions where account_id = a_other) into n;
  if n <> 5 then raise exception 'BIZ ERASE FAIL: somebody else''s business data was touched (% of 5 left)', n; end if;
  select count(*) into n from public.crm_suppression where lower(email) = 'erase-biz@bk.invalid'; if n < 1 then raise exception 'BIZ ERASE FAIL: suppression record missing'; end if;
  select count(*) into n from public.dsar_erasure_log where counts ? 'business_accounts';          if n <> 1 then raise exception 'BIZ ERASE FAIL: audit row lacks the business counts'; end if;

  -- idempotent
  r2 := public.erase_personal_data('erase-biz@bk.invalid', 'smoke');
  if (r2 -> 'counts' ->> 'business_accounts')::int <> 0 or (r2 -> 'counts' ->> 'business_submissions')::int <> 0 then raise exception 'BIZ ERASE FAIL: second run not idempotent: %', r2; end if;

  -- grants unchanged: server only
  set local role anon;
  begin perform public.erase_personal_data('x@bk.invalid'); raise exception 'BIZ ERASE FAIL: a visitor can run the erasure'; exception when insufficient_privilege then null; end;
  reset role;
  set local role authenticated;
  begin perform public.erase_personal_data('x@bk.invalid'); raise exception 'BIZ ERASE FAIL: a signed-in user can run the erasure'; exception when insufficient_privilege then null; end;
  reset role;
  raise warning 'business erase smoke: all checks hold';
end
$be$;

rollback;
