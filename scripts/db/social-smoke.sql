-- scripts/db/social-smoke.sql
-- Behaviour test for the social auto-post queue (migration 20261005150000_social_autopost.sql). Drill database only; rolls back.
begin;

do $soc$
declare
  admin_id uuid := 'aaaaaaaa-0000-0000-0000-00000000a301';
  user_id  uuid := 'bbbbbbbb-0000-0000-0000-00000000b302';
  a1 uuid; a2 uuid; a3 uuid; a4 uuid; n bigint;
begin
  insert into auth.users (id, email) values (admin_id, 'admin@soc.invalid'), (user_id, 'user@soc.invalid');
  insert into public.user_roles (user_id, role) values (admin_id, 'admin');

  -- 1. a draft queues nothing; publishing it queues exactly one row per platform
  insert into public.blog_posts (slug, title_en, status) values ('soc-draft', 'Draft', 'draft') returning id into a1;
  select count(*) into n from public.social_outbox where article_id = a1;
  if n <> 0 then raise exception 'SOCIAL FAIL: a draft was queued'; end if;
  update public.blog_posts set status = 'published', published_at = now() where id = a1;
  select count(*) into n from public.social_outbox where article_id = a1 and status = 'pending';
  if n <> 2 then raise exception 'SOCIAL FAIL: publishing a draft queued % rows, expected 2', n; end if;

  -- 2. editing an already published article does not queue again; neither does re-saving the status
  update public.blog_posts set title_en = 'Edited', status = 'published' where id = a1;
  select count(*) into n from public.social_outbox where article_id = a1;
  if n <> 2 then raise exception 'SOCIAL FAIL: an edit re-queued the article (% rows)', n; end if;

  -- 3. inserting an article directly as published queues it; skip_facebook keeps an article out
  insert into public.blog_posts (slug, title_en, status) values ('soc-direct', 'Direct', 'published') returning id into a2;
  select count(*) into n from public.social_outbox where article_id = a2;
  if n <> 2 then raise exception 'SOCIAL FAIL: a directly published article queued % rows', n; end if;
  insert into public.blog_posts (slug, title_en, status, skip_facebook) values ('soc-skip', 'Skip', 'published', true) returning id into a3;
  select count(*) into n from public.social_outbox where article_id = a3;
  if n <> 0 then raise exception 'SOCIAL FAIL: an article with skip_facebook was queued'; end if;

  -- 4. the master switch and per-platform switches
  update public.site_settings set value = jsonb_set(value, '{enabled}', 'false') where key = 'social_autopost';
  insert into public.blog_posts (slug, title_en, status) values ('soc-off', 'Off', 'published') returning id into a4;
  select count(*) into n from public.social_outbox where article_id = a4;
  if n <> 0 then raise exception 'SOCIAL FAIL: queued while the master switch was off'; end if;
  update public.site_settings set value = jsonb_set(jsonb_set(value, '{enabled}', 'true'), '{instagram}', 'false') where key = 'social_autopost';
  insert into public.blog_posts (slug, title_en, status) values ('soc-fb-only', 'FB only', 'published') returning id into a4;
  select count(*) into n from public.social_outbox where article_id = a4 and platform = 'facebook';
  if n <> 1 then raise exception 'SOCIAL FAIL: facebook was not queued'; end if;
  select count(*) into n from public.social_outbox where article_id = a4 and platform = 'instagram';
  if n <> 0 then raise exception 'SOCIAL FAIL: instagram queued although switched off'; end if;
  update public.site_settings set value = jsonb_set(value, '{instagram}', 'true') where key = 'social_autopost';

  -- 5. a failing queue must never block publishing (simulate by making the insert fail)
  alter table public.social_outbox add constraint soc_smoke_block check (false) not valid;
  insert into public.blog_posts (slug, title_en, status) values ('soc-blocked', 'Blocked', 'published');
  alter table public.social_outbox drop constraint soc_smoke_block;

  -- 6. backlog: queues earlier articles once, newest first, skipping those already queued or already posted
  insert into public.blog_posts (slug, title_en, status, published_at) values ('soc-old-1', 'Old 1', 'draft', now() - interval '10 days') returning id into a4;
  alter table public.blog_posts disable trigger social_enqueue_published;
  update public.blog_posts set status = 'published' where id = a4;
  alter table public.blog_posts enable trigger social_enqueue_published;
  select count(*) into n from public.social_outbox where article_id = a4;
  if n <> 0 then raise exception 'SOCIAL FAIL: setup of the backlog article is wrong'; end if;
  insert into public.social_posts (article_id, platform, status) values (a4, 'instagram', 'published');   -- already on Instagram
  n := public.social_enqueue_backlog(array['facebook', 'instagram'], 100);
  select count(*) into n from public.social_outbox where article_id = a4 and backlog;
  if n <> 1 then raise exception 'SOCIAL FAIL: backlog queued % rows for an article already on Instagram (expected 1: facebook)', n; end if;
  if public.social_enqueue_backlog(array['facebook', 'instagram'], 100) <> 0 then raise exception 'SOCIAL FAIL: backlog queued the same articles twice'; end if;
  if public.social_enqueue_backlog(array['twitter'], 100) <> 0 then raise exception 'SOCIAL FAIL: backlog accepted an unknown platform'; end if;

  -- 7. permissions: the queue is readable by administrators only; visitors cannot call the functions
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  set local role authenticated;
  select count(*) into n from public.social_outbox; reset role;
  if n <> 0 then raise exception 'SOCIAL FAIL: an ordinary user can read the queue (%)', n; end if;
  perform set_config('request.jwt.claim.sub', admin_id::text, true);
  set local role authenticated;
  select count(*) into n from public.social_outbox; reset role;
  if n < 1 then raise exception 'SOCIAL FAIL: an administrator cannot read the queue'; end if;
  begin
    set local role anon; perform public.social_enqueue_backlog(array['facebook'], 1); reset role;
    raise exception 'SOCIAL FAIL: anon called social_enqueue_backlog';
  exception when insufficient_privilege then reset role;
  end;
  begin
    set local role authenticated; perform public.social_enqueue_backlog(array['facebook'], 1); reset role;
    raise exception 'SOCIAL FAIL: a signed-in user called social_enqueue_backlog';
  exception when insufficient_privilege then reset role;
  end;
  begin
    set local role authenticated; insert into public.social_outbox (article_id, platform) values (a1, 'facebook'); reset role;
    raise exception 'SOCIAL FAIL: a signed-in user wrote to the queue';
  exception when insufficient_privilege then reset role;
  end;

  raise warning 'social smoke: all checks hold';
end
$soc$;

rollback;
