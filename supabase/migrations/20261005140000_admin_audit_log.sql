-- 20261005140000_admin_audit_log.sql
-- Phase 1 · Increment 1.3 — "who changed what": an append-only audit trail of administrator actions.
-- Idempotent; adds one table, two helper functions and triggers. Changes no existing data.
-- Run in: Supabase → SQL Editor.
--
-- HOW IT WORKS
--   • Everything an administrator edits through the admin screens (articles, listings, prices, orders, roles, settings …)
--     goes straight from the browser to the database, so the log is written by the DATABASE itself: a trigger on each
--     important table records who (auth.uid() + e-mail), what (insert/update/delete), which row, and for updates only
--     the columns that changed (long texts are clipped to 160 characters, so the log stays small).
--   • Only a signed-in ADMIN session is recorded. Background jobs and server code (service role, no user) and ordinary
--     visitors are not — they are not "an administrator doing something". Server routes that perform an admin action
--     write their own entry through lib/audit.ts (source = 'api').
--   • The log can be READ by admins only and cannot be edited or deleted through the app (no write policy at all).
--   • A failing audit write never blocks the edit itself: it raises a warning and the edit goes through.

create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  at          timestamptz not null default now(),
  actor       uuid,
  actor_email text,
  source      text not null default 'db',        -- db (trigger) | api (server route)
  action      text not null,                     -- insert | update | delete | or a verb such as newsletter.approve
  table_name  text,
  row_id      text,
  summary     text,
  changes     jsonb
);
create index if not exists admin_audit_log_at_idx    on public.admin_audit_log (at desc);
create index if not exists admin_audit_log_table_idx on public.admin_audit_log (table_name, at desc);
create index if not exists admin_audit_log_actor_idx on public.admin_audit_log (actor, at desc);

alter table public.admin_audit_log enable row level security;
drop policy if exists "audit log admin read" on public.admin_audit_log;
create policy "audit log admin read" on public.admin_audit_log
  as permissive for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

revoke all on public.admin_audit_log from public, anon, authenticated;
grant select on public.admin_audit_log to authenticated;      -- rows are still limited to admins by the policy above
grant all    on public.admin_audit_log to service_role;

-- Clip long text so one article save does not copy whole articles into the log.
create or replace function public.audit_clip(v jsonb) returns jsonb
language sql immutable
set search_path = public, pg_temp
as $$
  select case
    when v is null then null
    when jsonb_typeof(v) = 'string' and length(v #>> '{}') > 160
      then to_jsonb(left(v #>> '{}', 160) || '… (' || length(v #>> '{}') || ' characters)')
    when jsonb_typeof(v) in ('object', 'array') and length(v::text) > 400
      then to_jsonb(left(v::text, 160) || '… (' || length(v::text) || ' characters)')
    else v
  end
$$;

create or replace function public.audit_row_change() returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  uid  uuid := auth.uid();
  o    jsonb;
  n    jsonb;
  k    text;
  diff jsonb := '{}'::jsonb;
  rid  text;
  mail text;
begin
  -- Background jobs / service role (no user) and non-admin visitors are not administrator actions.
  if uid is null or not public.has_role(uid, 'admin'::public.app_role) then
    return coalesce(new, old);
  end if;

  begin
    if tg_op in ('UPDATE', 'DELETE') then o := to_jsonb(old); end if;
    if tg_op in ('INSERT', 'UPDATE') then n := to_jsonb(new); end if;
    rid := coalesce(coalesce(n, o) ->> coalesce(nullif(tg_argv[0], ''), 'id'), '');

    if tg_op = 'UPDATE' then
      for k in select jsonb_object_keys(n) loop
        if k <> 'updated_at' and (n -> k) is distinct from (o -> k) then
          diff := diff || jsonb_build_object(k, jsonb_build_object('from', public.audit_clip(o -> k), 'to', public.audit_clip(n -> k)));
        end if;
      end loop;
      if diff = '{}'::jsonb then return new; end if;          -- touched, but nothing meaningful changed
    else
      select coalesce(jsonb_object_agg(key, public.audit_clip(value)), '{}'::jsonb)
        into diff from jsonb_each(coalesce(n, o));
    end if;

    select email into mail from auth.users where id = uid;
    insert into public.admin_audit_log (actor, actor_email, source, action, table_name, row_id, changes)
    values (uid, mail, 'db', lower(tg_op), tg_table_name, rid, diff);
  exception when others then
    raise warning 'admin_audit_log: could not record % on %: %', tg_op, tg_table_name, sqlerrm;
  end;

  return coalesce(new, old);
end
$$;

-- Trigger functions are executed by the database, never by callers: nobody may call them through the API.
revoke all on function public.audit_row_change() from public, anon, authenticated;
revoke all on function public.audit_clip(jsonb)  from public, anon, authenticated;
grant execute on function public.audit_clip(jsonb) to service_role;

-- Attach to the tables administrators change from the admin screens (skipped when a table does not exist).
do $$
declare
  t text;
  tbls text[] := array[
    'blog_posts', 'user_roles', 'automation_settings', 'site_settings', 'directory_listings', 'crm_orgs', 'crm_settings',
    'crm_templates', 'events', 'rss_sources', 'comments', 'dsar_requests', 'ad_leads', 'ad_pricing', 'ad_orders',
    'sponsor_banners', 'newsletter_campaigns', 'newsletter_sponsors', 'concierge_members', 'fulfillment_tasks'
  ];
begin
  foreach t in array tbls loop
    if to_regclass('public.' || t) is not null then
      execute format('drop trigger if exists zz_audit_row_change on public.%I', t);
      execute format('create trigger zz_audit_row_change after insert or update or delete on public.%I for each row execute function public.audit_row_change()', t);
    end if;
  end loop;
end $$;

-- VERIFY (as an administrator, after editing any article in the admin):
--   select at, actor_email, action, table_name, row_id, changes from public.admin_audit_log order by at desc limit 10;
-- ROLLBACK (not part of the migration): drop trigger zz_audit_row_change on public.<table>;  — per table.
