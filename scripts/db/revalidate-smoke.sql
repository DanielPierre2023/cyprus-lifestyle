-- scripts/db/revalidate-smoke.sql
-- Tests supabase/migrations/20261007130000_revalidate_webhooks.sql against STAND-INS for pg_net and Vault (plain PostgreSQL has
-- neither). Proves: the migration applies twice cleanly, nothing is sent without Vault secrets, drafts and housekeeping-only
-- edits are silent, real edits send the exact Supabase-webhook payload to /api/revalidate/tags with the secret header,
-- a failing webhook NEVER blocks a write, and only the server-side owner can run the function. Drill database only (rolled back).
begin;

create schema if not exists vault;
create table if not exists vault.decrypted_secrets (name text primary key, decrypted_secret text);
create schema if not exists net;
create table if not exists net.calls (id bigserial primary key, url text, headers jsonb, body jsonb);
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
  returns bigint language sql as $$ insert into net.calls (url, headers, body) values (url, headers, body) returning id $$;
delete from net.calls;
delete from vault.decrypted_secrets;

-- 1. the migration applies twice cleanly and leaves exactly one trigger per table
\i supabase/migrations/20261007130000_revalidate_webhooks.sql
\i supabase/migrations/20261007130000_revalidate_webhooks.sql
do $$ begin
  if (select count(*) from pg_trigger where tgname = 'zz_cl_revalidate' and not tgisinternal) <> 3 then
    raise exception 'REVALIDATE FAIL: expected 3 triggers (blog_posts, directory_listings, events)';
  end if;
end $$;

-- 2. no Vault secrets yet -> the write works and nothing is sent
insert into public.events (slug, starts_at, status) values ('smoke-ev', now() + interval '1 day', 'published');
do $$ begin
  if (select count(*) from net.calls) <> 0 then raise exception 'REVALIDATE FAIL: sent a call without Vault secrets'; end if;
end $$;

-- 3. secrets present
insert into vault.decrypted_secrets values ('cl_site_url', 'https://example.test/'), ('cl_revalidate_secret', 'rv-s3cret');

do $$
declare r record; n int;
begin
  -- published insert
  insert into public.events (slug, starts_at, status) values ('smoke-ev2', now() + interval '1 day', 'published');
  select * into r from net.calls order by id desc limit 1;
  if r.url <> 'https://example.test/api/revalidate/tags' then raise exception 'REVALIDATE FAIL: url is % (trailing slash not trimmed?)', r.url; end if;
  if r.headers ->> 'x-revalidate-secret' <> 'rv-s3cret' then raise exception 'REVALIDATE FAIL: secret header missing'; end if;
  if r.body ->> 'type' <> 'INSERT' or r.body ->> 'table' <> 'events' or r.body -> 'record' ->> 'slug' <> 'smoke-ev2' or r.body -> 'old_record' <> 'null'::jsonb then
    raise exception 'REVALIDATE FAIL: insert payload wrong: %', r.body;
  end if;

  -- draft insert is silent
  select count(*) into n from net.calls;
  insert into public.events (slug, starts_at, status) values ('smoke-draft', now() + interval '1 day', 'draft');
  if (select count(*) from net.calls) <> n then raise exception 'REVALIDATE FAIL: a draft notified'; end if;

  -- housekeeping-only edit is silent (updated_at / enrichment stamps)
  update public.events set enriched_at = now(), enrich_status = 'done', updated_at = now() where slug = 'smoke-ev2';
  if (select count(*) from net.calls) <> n then raise exception 'REVALIDATE FAIL: a housekeeping-only update notified'; end if;

  -- real edit sends
  update public.events set summary_en = 'changed' where slug = 'smoke-ev2';
  if (select count(*) from net.calls) <> n + 1 then raise exception 'REVALIDATE FAIL: a content edit did not notify'; end if;

  -- unpublish (published -> draft) must notify so the page disappears
  update public.events set status = 'draft' where slug = 'smoke-ev2';
  if (select count(*) from net.calls) <> n + 2 then raise exception 'REVALIDATE FAIL: unpublish did not notify'; end if;

  -- delete of a published row sends old_record
  delete from public.events where slug = 'smoke-ev';
  select * into r from net.calls order by id desc limit 1;
  if r.body ->> 'type' <> 'DELETE' or r.body -> 'old_record' ->> 'slug' <> 'smoke-ev' or r.body -> 'record' <> 'null'::jsonb then
    raise exception 'REVALIDATE FAIL: delete payload wrong: %', r.body;
  end if;

  -- article moved between categories: both records carry their category
  insert into public.blog_posts (slug, category, status) values ('smoke-art', 'property', 'published');
  update public.blog_posts set category = 'style' where slug = 'smoke-art';
  select * into r from net.calls order by id desc limit 1;
  if r.body ->> 'table' <> 'blog_posts' or r.body -> 'record' ->> 'category' <> 'style' or r.body -> 'old_record' ->> 'category' <> 'property' then
    raise exception 'REVALIDATE FAIL: category move payload wrong: %', r.body;
  end if;
  -- a page view (counter bump) is silent
  select count(*) into n from net.calls;
  update public.blog_posts set view_count = view_count + 1, last_viewed_at = now() where slug = 'smoke-art';
  if (select count(*) from net.calls) <> n then raise exception 'REVALIDATE FAIL: a view-count bump notified'; end if;

  -- directory listing carries its type
  insert into public.directory_listings (slug, type, status) values ('smoke-dir', 'winery', 'published');
  select * into r from net.calls order by id desc limit 1;
  if r.body ->> 'table' <> 'directory_listings' or r.body -> 'record' ->> 'type' <> 'winery' then
    raise exception 'REVALIDATE FAIL: listing payload wrong: %', r.body;
  end if;
end $$;

-- 4. a failing webhook (pg_net down, Vault unreadable ...) never blocks or rolls back a write
create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds int default 5000)
  returns bigint language plpgsql as $$ begin raise exception 'pg_net is down'; end $$;
insert into public.events (slug, starts_at, status) values ('smoke-ev3', now() + interval '1 day', 'published');
do $$ begin
  if not exists (select 1 from public.events where slug = 'smoke-ev3') then raise exception 'REVALIDATE FAIL: a failing webhook blocked the write'; end if;
end $$;
drop table vault.decrypted_secrets cascade;   -- Vault unreadable altogether
insert into public.events (slug, starts_at, status) values ('smoke-ev4', now() + interval '1 day', 'published');
do $$ begin
  if not exists (select 1 from public.events where slug = 'smoke-ev4') then raise exception 'REVALIDATE FAIL: missing Vault blocked the write'; end if;
end $$;

-- 5. nobody but the owner / server may run the function
do $$ begin
  if has_function_privilege('anon', 'ops.revalidate_notify()', 'execute') or has_function_privilege('authenticated', 'ops.revalidate_notify()', 'execute') then
    raise exception 'REVALIDATE FAIL: ops.revalidate_notify is executable by anon/authenticated';
  end if;
end $$;

do $$ begin raise warning 'revalidate smoke: all checks hold'; end $$;
rollback;
