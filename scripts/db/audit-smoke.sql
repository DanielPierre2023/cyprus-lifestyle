-- scripts/db/audit-smoke.sql
-- Behaviour test for the administrator audit trail (migration 20261005140000_admin_audit_log.sql).
-- Run by scripts/db/restore-drill.sh after the whole migration chain. Uses the drill harness' auth stub and rolls
-- everything back — drill database only, never Supabase.
begin;

do $audit$
declare
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a101';
  user_id  uuid := 'bbbbbbbb-0000-0000-0000-00000000b102';
  n bigint;
  r record;
  long_text text := repeat('x', 1000);
begin
  insert into auth.users (id, email) values (admin_id, 'admin@audit.invalid'), (user_id, 'user@audit.invalid');
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');     -- no session → not an administrator action

  select count(*) into n from public.admin_audit_log;
  if n <> 0 then raise exception 'AUDIT FAIL: setup (superuser, no session) must not be logged, got % rows', n; end if;

  -- 1. an administrator session is recorded: insert, a real update, a no-op update, a delete
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  insert into public.site_settings (key, value) values ('audit-smoke', '"one"'::jsonb);
  update public.site_settings set value = '"two"'::jsonb where key = 'audit-smoke';
  update public.site_settings set updated_at = now() + interval '1 second' where key = 'audit-smoke';   -- only updated_at → not logged
  update public.site_settings set value = to_jsonb(long_text) where key = 'audit-smoke';
  delete from public.site_settings where key = 'audit-smoke';

  select count(*) into n from public.admin_audit_log where table_name = 'site_settings';
  if n <> 4 then raise exception 'AUDIT FAIL: expected 4 entries (insert, 2 updates, delete), got %', n; end if;

  select * into r from public.admin_audit_log where table_name = 'site_settings' and action = 'update' order by id limit 1;
  if r.actor <> admin_id or r.actor_email <> 'admin@audit.invalid' or r.source <> 'db' then
    raise exception 'AUDIT FAIL: actor/source not recorded (% / % / %)', r.actor, r.actor_email, r.source;
  end if;
  if r.changes -> 'value' ->> 'from' <> 'one' or r.changes -> 'value' ->> 'to' <> 'two' then
    raise exception 'AUDIT FAIL: update diff wrong: %', r.changes;
  end if;
  if r.changes ? 'updated_at' then raise exception 'AUDIT FAIL: updated_at must not be listed as a change'; end if;

  select * into r from public.admin_audit_log where table_name = 'site_settings' and action = 'update' order by id desc limit 1;
  if length(r.changes -> 'value' ->> 'to') > 200 then raise exception 'AUDIT FAIL: long text was not clipped'; end if;

  -- 2. a signed-in non-admin and a background job (no session) are not recorded
  delete from public.admin_audit_log;
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  insert into public.site_settings (key, value) values ('audit-smoke-user', '1'::jsonb);
  perform set_config('request.jwt.claim.sub', '', true);
  insert into public.site_settings (key, value) values ('audit-smoke-job', '1'::jsonb);
  select count(*) into n from public.admin_audit_log;
  if n <> 0 then raise exception 'AUDIT FAIL: non-admin / job writes must not be logged, got %', n; end if;

  -- 3. who can read / write the log
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  insert into public.site_settings (key, value) values ('audit-smoke-2', '1'::jsonb);   -- one entry to read

  set local role authenticated;
  select count(*) into n from public.admin_audit_log;
  if n < 1 then raise exception 'AUDIT FAIL: an administrator cannot read the log'; end if;
  begin
    insert into public.admin_audit_log (action) values ('forged');
    raise exception 'AUDIT FAIL: an administrator could write a log entry directly';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.admin_audit_log;
    raise exception 'AUDIT FAIL: an administrator could delete log entries';
  exception when insufficient_privilege then null;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', user_id::text, true);
  set local role authenticated;
  select count(*) into n from public.admin_audit_log;
  reset role;
  if n <> 0 then raise exception 'AUDIT FAIL: an ordinary signed-in user can read the log (% rows)', n; end if;

  set local role anon;
  begin
    perform count(*) from public.admin_audit_log;
    raise exception 'AUDIT FAIL: a visitor can read the log';
  exception when insufficient_privilege then null;
  end;
  reset role;

  raise warning 'audit smoke: all checks hold';
end
$audit$;

rollback;
