-- scripts/db/member-smoke.sql
-- Behaviour test for member sessions (migration 20261005160000_member_accounts.sql). Drill database only; rolls back.
begin;

do $mem$
declare
  user_id uuid := 'bbbbbbbb-0000-0000-0000-00000000b402';
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a401';
  m uuid; n bigint;
begin
  insert into auth.users (id, email) values (user_id, 'user@mem.invalid'), (admin_id, 'admin@mem.invalid');
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');
  insert into public.concierge_members (email, status) values ('m@mem.invalid', 'active') returning id into m;
  insert into public.member_sessions (member_id, token_hash, expires_at) values (m, 'hash-1', now() + interval '30 days');

  -- a token hash is unique
  begin
    insert into public.member_sessions (member_id, token_hash, expires_at) values (m, 'hash-1', now() + interval '1 day');
    raise exception 'MEMBER FAIL: a duplicate session token hash was accepted';
  exception when unique_violation then null;
  end;

  -- nobody but the server can read or write sessions (not visitors, not signed-in users, not even administrators)
  set local role anon;
  begin perform count(*) from public.member_sessions; raise exception 'MEMBER FAIL: a visitor can read sessions'; exception when insufficient_privilege then null; end;
  reset role;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  set local role authenticated;
  begin perform count(*) from public.member_sessions; raise exception 'MEMBER FAIL: a signed-in user can read sessions'; exception when insufficient_privilege then null; end;
  begin insert into public.member_sessions (member_id, token_hash, expires_at) values (m, 'forged', now()); raise exception 'MEMBER FAIL: a signed-in user created a session'; exception when insufficient_privilege then null; end;
  reset role;

  -- deleting a member removes the sessions
  delete from public.concierge_members where id = m;
  select count(*) into n from public.member_sessions where member_id = m;
  if n <> 0 then raise exception 'MEMBER FAIL: sessions survived their member'; end if;

  raise warning 'member smoke: all checks hold';
end
$mem$;

rollback;
