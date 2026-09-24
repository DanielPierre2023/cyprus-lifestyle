-- ============================================================================
-- Cyprus Lifestyle — 0112 · Editorial & interview pipeline
-- ----------------------------------------------------------------------------
-- The premium magazine runs on a commission→publish pipeline whose engine is the
-- interview: we approach a business, interview its people, publish a beautiful
-- multilingual piece, and — when it goes live — elevate that business in the
-- directory. That whole flow needs a small amount of state ON THE ARTICLE, so this
-- migration EXTENDS the existing, already-multilingual content model (blog_posts,
-- 7 editions via the *_en/_el/_ro/_ar/_de/_pl/_ru column families from 0003 + 0031)
-- rather than duplicating it. Because blog_posts is multilingual, translations keep
-- living in its content_<locale> columns — NO companion translations table is needed.
--
-- What a pipeline piece adds to an article row:
--   • kind            — the article shape (feature | interview | profile | note | edit | picks)
--   • franchise       — the recurring column it belongs to (see lib/editorial/pipeline.ts)
--   • pipeline_status — the editorial workflow stage (commissioned … published)
--   • subject_listing_id — the directory business the piece is ABOUT (the client-acquisition link)
--   • dossier         — the AI briefing that grounds the interview (jsonb)
--   • questions       — the tailored interview questions (jsonb)
--   • angle           — the one-line editorial angle
--   • source_lang     — the locale the piece is WRITTEN in (translations derive from it)
--   • scheduled_at    — when a 'scheduled' piece should go live
--
-- A pipeline piece is simply a blog_posts row whose status stays 'draft' (so the
-- public never sees it) until publish flips it to 'published'; pipeline_status is the
-- FINE workflow the desk drives, orthogonal to the coarse public-visibility `status`.
-- Legacy articles keep pipeline_status = NULL and are untouched.
--
-- Additive & idempotent (add column if not exists), non-destructive; does not alter
-- any earlier migration. Admin-only writes are already enforced by the blog_posts
-- policies from 0003 ("Admins manage all posts" / "Public can read published posts").
-- ============================================================================

-- ── 1. the pipeline columns on the article row ───────────────────────────────
alter table public.blog_posts
  add column if not exists kind text
    check (kind is null or kind in ('feature','interview','profile','note','edit','picks'));

alter table public.blog_posts
  add column if not exists franchise text
    check (franchise is null or franchise in
      ('tastemakers','behind-the-business','five-min','maker','at-the-table','concierge-meets','power-list'));

alter table public.blog_posts
  add column if not exists pipeline_status text
    check (pipeline_status is null or pipeline_status in
      ('commissioned','dossier','drafting','editing','translating','scheduled','published'));

alter table public.blog_posts
  add column if not exists subject_listing_id uuid
    references public.directory_listings(id) on delete set null;

alter table public.blog_posts add column if not exists dossier      jsonb;
alter table public.blog_posts add column if not exists questions    jsonb;
alter table public.blog_posts add column if not exists angle        text;
alter table public.blog_posts add column if not exists source_lang  text;
alter table public.blog_posts add column if not exists scheduled_at timestamptz;

-- ── 2. indexes for the pipeline board & interview queue ───────────────────────
-- The board groups by pipeline_status; the queue lists interview-kind pieces by
-- subject; scheduling reads the soonest scheduled_at. Partial indexes keep them
-- tiny — only rows actually in the pipeline (pipeline_status not null) are indexed,
-- so the hundreds of legacy published articles add nothing.
create index if not exists blog_posts_pipeline_status_idx
  on public.blog_posts (pipeline_status, updated_at desc)
  where pipeline_status is not null;
create index if not exists blog_posts_franchise_idx
  on public.blog_posts (franchise)
  where franchise is not null;
create index if not exists blog_posts_subject_listing_idx
  on public.blog_posts (subject_listing_id)
  where subject_listing_id is not null;
create index if not exists blog_posts_scheduled_at_idx
  on public.blog_posts (scheduled_at)
  where scheduled_at is not null;

-- ── 3. final report ───────────────────────────────────────────────────────────
select
  'editorial pipeline ready' as status,
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'blog_posts'
       and column_name in
         ('kind','franchise','pipeline_status','subject_listing_id',
          'dossier','questions','angle','source_lang','scheduled_at')) as pipeline_columns_present,
  (select count(*) from public.blog_posts where pipeline_status is not null) as pieces_in_pipeline,
  (select count(*) from public.blog_posts) as total_articles;
