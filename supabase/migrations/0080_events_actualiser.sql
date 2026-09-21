-- 0080_events_actualiser.sql
-- Living knowledge Phase 3: keep the Agenda current, and connect articles to it.
-- • events.source_url / article_slug — provenance for events introduced INTO the
--   agenda from our own published journalism (so a culture article's events exist in
--   the agenda and can be linked, each traceable to the article that named them).
-- • blog_posts.events_mined_at — marks an article whose events we've already lifted
--   into the agenda, so mining is idempotent and cheap on the rotation.
-- • automation_settings.events_watch_enabled — opt-in switch for the daily refresh.
-- Additive & idempotent. The existing events-ingest edge function (external listings)
-- and the events table's ingest_key dedupe are reused unchanged.

alter table public.events add column if not exists source_url   text;   -- human citation (the article / listing page)
alter table public.events add column if not exists article_slug text;   -- when introduced from one of our articles
create index if not exists events_article_idx on public.events (article_slug) where article_slug is not null;

alter table public.blog_posts add column if not exists events_mined_at timestamptz;

alter table public.automation_settings add column if not exists events_watch_enabled boolean not null default false; -- opt-in, off

-- report
select 'events_actualiser' as check,
       (select count(*) from information_schema.columns where table_schema='public' and table_name='events' and column_name in ('source_url','article_slug')) as event_cols,
       (select count(*) from information_schema.columns where table_schema='public' and table_name='blog_posts' and column_name='events_mined_at') as blog_col,
       (select count(*) from information_schema.columns where table_schema='public' and table_name='automation_settings' and column_name='events_watch_enabled') as toggle;
