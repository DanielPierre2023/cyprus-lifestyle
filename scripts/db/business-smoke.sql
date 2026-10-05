-- Smoke test for the Business Hub tables (migration 20261006120000_business_hub.sql). Drill database only; rolls back.
begin;

do $biz$
declare
  user_id  uuid := 'bbbbbbbb-0000-0000-0000-00000000b501';
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a501';
  a uuid; a2 uuid; s uuid; n bigint; t text;
begin
  insert into auth.users (id, email) values (user_id, 'user@biz.invalid'), (admin_id, 'admin@biz.invalid');
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');

  -- every table exists, has RLS on and no policy
  foreach t in array array['business_accounts', 'business_listings', 'business_login_tokens', 'business_sessions', 'business_submissions'] loop
    if not exists (select 1 from pg_class c where c.relnamespace = 'public'::regnamespace and c.relname = t and c.relrowsecurity) then
      raise exception 'BUSINESS FAIL: % is missing or has no row level security', t;
    end if;
    if exists (select 1 from pg_policies where schemaname = 'public' and tablename = t) then
      raise exception 'BUSINESS FAIL: % has a policy (server-only tables must have none)', t;
    end if;
  end loop;

  insert into public.business_accounts (email) values ('owner@biz.invalid') returning id into a;
  insert into public.business_accounts (email) values ('other@biz.invalid') returning id into a2;

  -- e-mail is unique and must be lower-case
  begin insert into public.business_accounts (email) values ('owner@biz.invalid'); raise exception 'BUSINESS FAIL: duplicate e-mail accepted'; exception when unique_violation then null; end;
  begin insert into public.business_accounts (email) values ('Mixed@Biz.invalid'); raise exception 'BUSINESS FAIL: upper-case e-mail accepted'; exception when check_violation then null; end;
  begin insert into public.business_accounts (email, status) values ('x@biz.invalid', 'banana'); raise exception 'BUSINESS FAIL: unknown account status accepted'; exception when check_violation then null; end;

  -- listing links: one per (account, listing)
  insert into public.business_listings (account_id, listing_slug) values (a, 'some-listing');
  begin insert into public.business_listings (account_id, listing_slug) values (a, 'some-listing'); raise exception 'BUSINESS FAIL: duplicate listing link accepted'; exception when unique_violation then null; end;
  begin insert into public.business_listings (account_id, listing_slug, role) values (a, 'other-listing', 'god'); raise exception 'BUSINESS FAIL: unknown role accepted'; exception when check_violation then null; end;

  -- token and session hashes are unique
  insert into public.business_login_tokens (account_id, token_hash, expires_at) values (a, 'th-1', now() + interval '30 minutes');
  begin insert into public.business_login_tokens (account_id, token_hash, expires_at) values (a, 'th-1', now()); raise exception 'BUSINESS FAIL: duplicate login token hash accepted'; exception when unique_violation then null; end;
  insert into public.business_sessions (account_id, token_hash, expires_at) values (a, 'sh-1', now() + interval '14 days');
  begin insert into public.business_sessions (account_id, token_hash, expires_at) values (a, 'sh-1', now()); raise exception 'BUSINESS FAIL: duplicate session hash accepted'; exception when unique_violation then null; end;

  -- submissions: kind and status are constrained, default is 'submitted'
  insert into public.business_submissions (account_id, listing_slug, kind, payload) values (a, 'some-listing', 'description', '{"text":"hello"}') returning id into s;
  if (select status from public.business_submissions where id = s) <> 'submitted' then raise exception 'BUSINESS FAIL: default status is not submitted'; end if;
  begin insert into public.business_submissions (account_id, listing_slug, kind) values (a, 'x', 'banner'); raise exception 'BUSINESS FAIL: unknown submission kind accepted'; exception when check_violation then null; end;
  begin update public.business_submissions set status = 'published' where id = s; raise exception 'BUSINESS FAIL: unknown submission status accepted'; exception when check_violation then null; end;

  -- nobody but the server can read or write these tables (not visitors, not signed-in users, not even administrators)
  set local role anon;
  begin perform count(*) from public.business_accounts; raise exception 'BUSINESS FAIL: a visitor can read accounts'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.business_sessions; raise exception 'BUSINESS FAIL: a visitor can read sessions'; exception when insufficient_privilege then null; end;
  reset role;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  set local role authenticated;
  begin perform count(*) from public.business_accounts;     raise exception 'BUSINESS FAIL: a signed-in user can read accounts';     exception when insufficient_privilege then null; end;
  begin perform count(*) from public.business_login_tokens; raise exception 'BUSINESS FAIL: a signed-in user can read login tokens'; exception when insufficient_privilege then null; end;
  begin perform count(*) from public.business_submissions;  raise exception 'BUSINESS FAIL: a signed-in user can read submissions';  exception when insufficient_privilege then null; end;
  begin insert into public.business_submissions (account_id, listing_slug, kind) values (a, 'x', 'news'); raise exception 'BUSINESS FAIL: a signed-in user created a submission'; exception when insufficient_privilege then null; end;
  begin update public.business_submissions set status = 'approved'; raise exception 'BUSINESS FAIL: a signed-in user approved a submission'; exception when insufficient_privilege then null; end;
  reset role;

  -- the server role (service_role) does have access
  set local role service_role;
  perform count(*) from public.business_submissions;
  reset role;

  -- deleting an account removes everything that hangs off it
  delete from public.business_accounts where id = a;
  select (select count(*) from public.business_listings where account_id = a) + (select count(*) from public.business_login_tokens where account_id = a)
       + (select count(*) from public.business_sessions where account_id = a) + (select count(*) from public.business_submissions where account_id = a) into n;
  if n <> 0 then raise exception 'BUSINESS FAIL: % rows survived their account', n; end if;
  if not exists (select 1 from public.business_accounts where id = a2) then raise exception 'BUSINESS FAIL: another account was deleted'; end if;

  raise warning 'business smoke: all checks hold';
end
$biz$;

rollback;
