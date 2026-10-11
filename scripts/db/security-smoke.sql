-- scripts/db/security-smoke.sql
-- Database security invariants. Run by scripts/db/restore-drill.sh (and CI) AFTER the whole
-- migration chain has been applied to a rebuilt database. Any broken invariant raises an exception
-- and fails the build — so a future migration that re-opens one of the holes found on 2026-10-05
-- (public RPCs, definer views, open write policies) cannot be merged unnoticed.
--
-- It uses the drill harness' auth.users stub (and rolls everything back), so it is for the drill
-- database only — never run it on Supabase.
begin;

do $smoke$
declare
  bad text;
  n   bigint;
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a001';
  user_id  uuid := 'bbbbbbbb-0000-0000-0000-00000000b002';
begin
  -- 1. Row level security on every table in public.
  select string_agg(c.relname, ', ' order by c.relname) into bad
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p') and not c.relrowsecurity
    and not exists (select 1 from pg_depend d where d.objid = c.oid and d.deptype = 'e');
  if bad is not null then raise exception 'SMOKE FAIL [rls]: tables without row level security: %', bad; end if;

  -- 2. SECURITY DEFINER functions run with their owner's rights, so they must not be callable
  --    by visitors. Allow-list: has_role (needed inside RLS policies), get_analytics_data_admin
  --    (checks has_role itself; signed-in users only).
  select string_agg(p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', ', ' order by p.proname) into bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and p.prosecdef
    and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
    and ( (p.proname <> 'has_role' and has_function_privilege('anon', p.oid, 'EXECUTE'))
       or (p.proname not in ('has_role', 'get_analytics_data_admin') and has_function_privilege('authenticated', p.oid, 'EXECUTE')) );
  if bad is not null then raise exception 'SMOKE FAIL [definer-functions]: callable by anon/authenticated: %', bad; end if;

  -- 3. Views must obey the caller's row level security (security_invoker), not their owner's.
  select string_agg(c.relname, ', ' order by c.relname) into bad
  from pg_class c
  where c.relnamespace = 'public'::regnamespace and c.relkind in ('v', 'm')
    and coalesce(array_to_string(c.reloptions, ','), '') !~ 'security_invoker=(on|true)';
  if bad is not null then raise exception 'SMOKE FAIL [views]: views running with owner rights: %', bad; end if;

  -- 4. No wide-open write policy for visitors/signed-in users (a policy whose condition is literally "true").
  select string_agg(tablename || '.' || policyname || ' (' || cmd || ')', ', ' order by tablename) into bad
  from pg_policies
  where schemaname = 'public' and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and roles && array['anon', 'authenticated', 'public']::name[]
    and (coalesce(with_check, '') = 'true' or (cmd in ('UPDATE', 'DELETE', 'ALL') and coalesce(qual, '') = 'true'));
  if bad is not null then raise exception 'SMOKE FAIL [open-write-policies]: %', bad; end if;

  -- 5. Behaviour: a visitor calling the privileged functions must be refused by Postgres itself.
  begin
    set local role anon;
    perform public.fulfil_ad_order(gen_random_uuid());
    reset role;
    raise exception 'SMOKE FAIL [behaviour]: anon executed fulfil_ad_order';
  exception when insufficient_privilege then reset role;
  end;
  begin
    set local role anon;
    perform public.crm_upsert_account('Smoke Ltd', 'smoke@smoke-test.invalid', null, null, null);
    reset role;
    raise exception 'SMOKE FAIL [behaviour]: anon executed crm_upsert_account';
  exception when insufficient_privilege then reset role;
  end;
  begin
    set local role anon;
    perform public.get_analytics_data('7d');
    reset role;
    raise exception 'SMOKE FAIL [behaviour]: anon executed get_analytics_data';
  exception when insufficient_privilege then reset role;
  end;

  -- 6. Behaviour: internal views are empty for an ordinary signed-in user, full for an admin.
  insert into auth.users (id, email) values (admin_id, 'admin@smoke.invalid'), (user_id, 'user@smoke.invalid');
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');
  insert into public.ai_spend_log (function_name, usd) values ('smoke', 2.5);

  perform set_config('request.jwt.claim.sub', user_id::text, true);
  set local role authenticated;
  select calls into n from public.ai_spend_total;
  reset role;
  if coalesce(n, 0) <> 0 then raise exception 'SMOKE FAIL [views]: an ordinary signed-in user can read ai_spend_total (calls=%)', n; end if;

  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  set local role authenticated;
  select calls into n from public.ai_spend_total;
  reset role;
  if coalesce(n, 0) < 1 then raise exception 'SMOKE FAIL [views]: an admin cannot read ai_spend_total (calls=%)', n; end if;

  raise warning 'security smoke: all invariants hold'; -- a WARNING so it stays visible when notices are muted
end
$smoke$;

rollback;
