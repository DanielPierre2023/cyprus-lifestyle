-- 20261005150000_social_autopost.sql
-- Phase 1 · Social auto-posting (Facebook + Instagram): every article that becomes PUBLISHED — whoever or whatever
-- published it (editor, Articles list, interview/editorial pipeline, scraper desk, edge function) — is queued here.
-- Idempotent; adds one table, one trigger function + trigger and one function. Changes no existing data.
-- Run in: Supabase → SQL Editor.
--
-- HOW IT WORKS
--   • A trigger on blog_posts catches the moment status becomes 'published' (new row, or a draft being published) and
--     adds one queue row per platform. Because it lives in the database, no publishing path can forget to call it.
--   • The queue is worked by the site (every 3 minutes, from the same job that already drains the background queue):
--     it writes the post text, publishes, retries temporary failures, and respects the daily limits in the
--     site_settings row 'social_autopost' (editable in Admin → Social).
--   • Nothing is queued for articles published BEFORE this migration; posting those is a deliberate button in
--     Admin → Social ("Post earlier articles"), which drip-feeds them within the daily limits.
--   • An article with skip_facebook = true is never queued (that flag now means "no social posting").

create table if not exists public.social_outbox (
  id              uuid primary key default gen_random_uuid(),
  article_id      uuid not null references public.blog_posts (id) on delete cascade,
  platform        text not null check (platform in ('facebook', 'instagram')),
  status          text not null default 'pending' check (status in ('pending', 'processing', 'posted', 'failed', 'skipped')),
  backlog         boolean not null default false,        -- an older article queued on purpose from the admin page
  attempts        integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  error           text,
  copy            jsonb,                                  -- the post text that was generated (kept for audit and for retries)
  meta            jsonb not null default '{}'::jsonb,     -- e.g. the Instagram container id while it is being processed
  external_id     text,
  permalink       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  posted_at       timestamptz,
  unique (article_id, platform)
);
create index if not exists social_outbox_due_idx    on public.social_outbox (status, next_attempt_at);
create index if not exists social_outbox_posted_idx on public.social_outbox (platform, posted_at desc) where status = 'posted';

alter table public.social_outbox enable row level security;
drop policy if exists "social outbox admin read" on public.social_outbox;
create policy "social outbox admin read" on public.social_outbox
  as permissive for select to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));
revoke all on public.social_outbox from public, anon, authenticated;
grant select on public.social_outbox to authenticated;      -- limited to admins by the policy
grant all    on public.social_outbox to service_role;

-- Default settings (only if the row does not exist yet).  enabled = master switch.
insert into public.site_settings (key, value)
values ('social_autopost', jsonb_build_object(
  'enabled', true,
  'facebook', true,
  'instagram', true,
  'max_per_day', jsonb_build_object('facebook', 8, 'instagram', 4),
  'min_gap_minutes', 30,
  'max_age_hours', 36
))
on conflict (key) do nothing;

-- The trigger: queue a newly published article.
create or replace function public.social_enqueue_published() returns trigger
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare
  cfg jsonb;
  p   text;
begin
  if new.status is distinct from 'published' then return new; end if;
  if tg_op = 'UPDATE' and old.status is not distinct from 'published' then return new; end if;   -- already live: not news
  if coalesce(new.skip_facebook, false) then return new; end if;

  select value into cfg from public.site_settings where key = 'social_autopost';
  if cfg is null or coalesce((cfg ->> 'enabled')::boolean, false) is not true then return new; end if;

  foreach p in array array['facebook', 'instagram'] loop
    if coalesce((cfg ->> p)::boolean, true) then
      insert into public.social_outbox (article_id, platform) values (new.id, p) on conflict (article_id, platform) do nothing;
    end if;
  end loop;
  return new;
exception when others then
  raise warning 'social_enqueue_published: could not queue article %: %', new.id, sqlerrm;   -- never block publishing
  return new;
end
$$;
revoke all on function public.social_enqueue_published() from public, anon, authenticated;

drop trigger if exists social_enqueue_published on public.blog_posts;
create trigger social_enqueue_published
  after insert or update of status on public.blog_posts
  for each row execute function public.social_enqueue_published();

-- Queue EARLIER published articles (called by the admin page through the server, never by visitors).
-- Newest first; at most p_limit queue rows per call (article × platform); never an article/platform that already has a
-- queue row or a recorded post. Returns how many rows were added.
create or replace function public.social_enqueue_backlog(p_platforms text[], p_limit integer default 200) returns integer
language plpgsql security definer
set search_path = public, pg_temp
as $$
declare n integer;
begin
  with ins as (
    insert into public.social_outbox (article_id, platform, backlog, next_attempt_at)
    -- staggered by one second each, so the queue keeps the newest-first order
    select b.id, pl, true, now() + (row_number() over (order by b.published_at desc nulls last, pl)) * interval '1 second'
    from public.blog_posts b
    cross join unnest(p_platforms) as pl
    where b.status = 'published' and not coalesce(b.skip_facebook, false)
      and pl in ('facebook', 'instagram')
      and not exists (select 1 from public.social_outbox o where o.article_id = b.id and o.platform = pl)
      and not exists (select 1 from public.social_posts s where s.article_id = b.id and s.platform = pl and s.status = 'published')
    order by b.published_at desc nulls last
    limit greatest(1, least(coalesce(p_limit, 200), 2000))
    on conflict (article_id, platform) do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end
$$;
revoke all on function public.social_enqueue_backlog(text[], integer) from public, anon, authenticated;
grant execute on function public.social_enqueue_backlog(text[], integer) to service_role;

-- VERIFY:  select key, value from public.site_settings where key = 'social_autopost';
--          select tgname from pg_trigger where tgrelid = 'public.blog_posts'::regclass and tgname = 'social_enqueue_published';
-- SWITCH OFF at any time: Admin → Social → "Auto-post" switch (or update the 'enabled' flag in that settings row).
