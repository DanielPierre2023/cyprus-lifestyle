-- ============================================================================
-- Cyprus Lifestyle — COMPLETE SCHEMA (single-file)
-- Faithful port of Transilvania Times, extended to EN · EL · RO · AR (ar = RTL).
-- Reconciled against the live COLUMNS / constraints / index / policy exports.
-- ----------------------------------------------------------------------------
-- HOW TO RUN (no terminal needed):
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Paste this entire file → RUN
--   3. Re-runnable: policies/objects are guarded, so running again is safe.
-- Requires a Supabase project (auth schema, anon/authenticated roles and
-- auth.uid() already exist there). Studio/anchor/flights/weather are excluded.
-- ============================================================================

-- ####################################################################
-- # FILE: 0001_extensions_enums.sql
-- ####################################################################
-- ============================================================================
-- Cyprus Lifestyle — 0001 · Extensions & enums
-- Faithful port of Transilvania Times. Languages: EN · EL · RO · AR (ar = RTL).
-- ----------------------------------------------------------------------------
-- Adjustments vs TT: none here. app_role is copied verbatim.
-- The studio_version_state enum (video studio) is intentionally omitted —
-- the whole studio/anchor/flights/weather subsystem is out of scope.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()

-- Role enum — verbatim from TT.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

-- ####################################################################
-- # FILE: 0002_identity_roles.sql
-- ####################################################################
-- ============================================================================
-- Cyprus Lifestyle — 0002 · Identity, roles, shared trigger fns
-- Faithful port of TT: user_roles, has_role(), profiles, handle_new_user(),
-- update_updated_at(). No language changes needed here.
-- ============================================================================

-- ── user_roles ─────────────────────────────────────────────────────────────
create table if not exists public.user_roles (
  id       uuid primary key default gen_random_uuid(),
  user_id  uuid not null references auth.users(id) on delete cascade,
  role     app_role not null,
  unique (user_id, role)
);
alter table public.user_roles enable row level security;

-- Security-definer role check — verbatim from TT (prevents RLS recursion).
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

drop policy if exists "Admins can read all roles" on public.user_roles;
create policy "Admins can read all roles"   on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins can insert roles" on public.user_roles;
create policy "Admins can insert roles"     on public.user_roles for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins can update roles" on public.user_roles;
create policy "Admins can update roles"     on public.user_roles for update to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins can delete roles" on public.user_roles;
create policy "Admins can delete roles"     on public.user_roles for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role"     on public.user_roles for select to authenticated using (user_id = auth.uid());

-- ── profiles ───────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile"   on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles for update to authenticated using (id = auth.uid());
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Auto-create a profile row for every new auth user — verbatim from TT.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Generic updated_at bumper — verbatim from TT.
create or replace function public.update_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

-- ####################################################################
-- # FILE: 0003_content.sql
-- ####################################################################
-- ============================================================================
-- Cyprus Lifestyle — 0003 · Editorial content
--   authors · blog_posts (4-language) · comments · blog_comments (legacy)
--   editor_tokens · editor_drafts
-- ----------------------------------------------------------------------------
-- Language model: TT's column-pair pattern, extended EN·EL·RO·AR.
--   TT had *_en / *_ro   →   Cyprus has *_en / *_el / *_ro / *_ar
-- Per-language full-text search vectors are GENERATED columns:
--   en → 'english', ro → 'romanian' (both ship with Postgres),
--   el / ar → 'simple' (no stemmer ships for Greek/Arabic; 'simple'
--   still gives tokenised prefix/word search).
-- ============================================================================

-- ── authors ────────────────────────────────────────────────────────────────
create table if not exists public.authors (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  editor_key   text unique,
  -- names/titles/bios per language (name is kept per-script so Greek & Arabic
  -- editions can render the byline in-script; fall back to _en at read time)
  name_en      text,
  name_el      text,
  name_ro      text,
  name_ar      text,
  title_en     text,
  title_el     text,
  title_ro     text,
  title_ar     text,
  bio_en       text,
  bio_el       text,
  bio_ro       text,
  bio_ar       text,
  avatar_url   text,
  avatar_style text default 'illustrated',
  specialties  text[] default '{}',
  social_x     text,
  email        text,
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);
alter table public.authors enable row level security;

-- Verbatim from TT: the public reads only active authors.
drop policy if exists "authors_public_read" on public.authors;
create policy "authors_public_read" on public.authors for select to public using (active = true);
-- ADDED for Cyprus (TT moderates authors via service role): let the admin UI
-- manage authors with a normal admin JWT.
drop policy if exists "admins_manage_authors" on public.authors;
create policy "admins_manage_authors" on public.authors for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ── blog_posts (published articles) ──────────────────────────────────────────
create table if not exists public.blog_posts (
  id                 uuid primary key default gen_random_uuid(),
  slug               text unique not null,

  -- title / content / excerpt / summary / seo — one column per language
  title_en           text,
  title_el           text,
  title_ro           text,
  title_ar           text,
  content_en         text,
  content_el         text,
  content_ro         text,
  content_ar         text,
  excerpt_en         text,
  excerpt_el         text,
  excerpt_ro         text,
  excerpt_ar         text,
  summary_en         text,
  summary_el         text,
  summary_ro         text,
  summary_ar         text,
  seo_title_en       text,
  seo_title_el       text,
  seo_title_ro       text,
  seo_title_ar       text,
  seo_description_en text,
  seo_description_el text,
  seo_description_ro text,
  seo_description_ar text,
  tags               text[] default '{}',   -- legacy / language-neutral
  tags_en            text[] default '{}',
  tags_el            text[] default '{}',
  tags_ro            text[] default '{}',
  tags_ar            text[] default '{}',

  category           text,
  subcategory        text,
  county             text,                   -- Cyprus DISTRICT bucket (see comment)
  author_name        text,
  author_id          uuid references public.authors(id) on delete set null,
  ai_editor          text,
  cover_image        text,
  cover_image_credit text,
  source_url         text,
  sources            text[] default '{}',
  scraped_article_id uuid,                   -- FK added in 0004 (scraped_articles)
  status             text not null default 'draft',
  is_breaking        boolean default false,
  skip_facebook      boolean default false,
  layout_mode        text default 'auto' check (layout_mode in ('auto','rich')),
  reading_time_min   integer default 1,
  word_count         integer,
  ai_quality_score   integer,
  ai_review_reason   text,
  social_shares      jsonb default '{}'::jsonb,
  content_archive    jsonb,
  view_count         bigint not null default 0,
  last_viewed_at     timestamptz,
  correction_note    text,
  corrected_at       timestamptz,
  published_at       timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- generated per-language search vectors
  search_en tsvector generated always as (
    to_tsvector('english',  coalesce(title_en,'') || ' ' || coalesce(excerpt_en,'') || ' ' || coalesce(content_en,''))) stored,
  search_ro tsvector generated always as (
    to_tsvector('romanian', coalesce(title_ro,'') || ' ' || coalesce(excerpt_ro,'') || ' ' || coalesce(content_ro,''))) stored,
  search_el tsvector generated always as (
    to_tsvector('simple',   coalesce(title_el,'') || ' ' || coalesce(excerpt_el,'') || ' ' || coalesce(content_el,''))) stored,
  search_ar tsvector generated always as (
    to_tsvector('simple',   coalesce(title_ar,'') || ' ' || coalesce(excerpt_ar,'') || ' ' || coalesce(content_ar,''))) stored
);
comment on column public.blog_posts.county is
  'Cyprus district (επαρχία): nicosia | limassol | larnaca | famagusta | paphos | kyrenia. Column name kept as "county" so the TT pipeline functions port unchanged.';
alter table public.blog_posts enable row level security;

-- Verbatim from TT.
drop policy if exists "Public can read published posts" on public.blog_posts;
create policy "Public can read published posts" on public.blog_posts for select to anon, authenticated
  using (status = 'published');
drop policy if exists "Admins manage all posts" on public.blog_posts;
create policy "Admins manage all posts" on public.blog_posts for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.blog_posts;
create trigger set_updated_at before update on public.blog_posts
  for each row execute function public.update_updated_at();

-- View counter — verbatim from TT.
create or replace function public.increment_view_count(post_slug text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare new_count bigint;
begin
  update public.blog_posts
     set view_count = view_count + 1, last_viewed_at = now()
   where slug = post_slug and status = 'published'
   returning view_count into new_count;
  return coalesce(new_count, 0);
end;
$$;

-- ── comments (the table the site uses) ───────────────────────────────────────
create table if not exists public.comments (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.blog_posts(id) on delete cascade,
  author_name text not null,
  content     text not null,
  is_approved boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.comments enable row level security;

-- Verbatim from TT.
drop policy if exists "Anyone can insert comments" on public.comments;
create policy "Anyone can insert comments"        on public.comments for insert to anon, authenticated with check (true);
drop policy if exists "Anyone can read approved comments" on public.comments;
create policy "Anyone can read approved comments" on public.comments for select to anon, authenticated using (is_approved = true);
-- ADDED for Cyprus (TT's dump has no admin policy on `comments`; it moderates via
-- service role). This lets the Comentarii tab approve/delete with an admin JWT.
drop policy if exists "Admins manage comments" on public.comments;
create policy "Admins manage comments" on public.comments for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ── blog_comments (legacy, kept for parity with the live DB) ──────────────────
create table if not exists public.blog_comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references public.blog_posts(id) on delete cascade,
  author_name  text not null,
  author_email text,
  content      text not null,
  status       text not null default 'pending',
  ai_reply     text,
  created_at   timestamptz not null default now()
);
alter table public.blog_comments enable row level security;
drop policy if exists "Public can read approved comments" on public.blog_comments;
create policy "Public can read approved comments" on public.blog_comments for select to anon, authenticated using (status = 'approved');
drop policy if exists "Anyone can submit comments" on public.blog_comments;
create policy "Anyone can submit comments"        on public.blog_comments for insert to anon, authenticated with check (true);
drop policy if exists "Admins manage comments" on public.blog_comments;
create policy "Admins manage comments"            on public.blog_comments for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Public view of approved legacy comments (parity with live TT).
create or replace view public.blog_comments_public as
  select id, post_id, content, author_name, ai_reply, status, created_at
  from public.blog_comments
  where status = 'approved';

-- ── editor_tokens (external-editor magic links) ───────────────────────────────
-- Matches live TT columns verbatim.
create table if not exists public.editor_tokens (
  id           uuid primary key default gen_random_uuid(),
  token        uuid unique not null default gen_random_uuid(),
  author_id    uuid not null references public.authors(id) on delete cascade,
  editor_key   text not null,
  label        text not null default '',
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz default (now() + interval '30 days'),
  last_used_at timestamptz
);
alter table public.editor_tokens enable row level security;
drop policy if exists "admins_manage_editor_tokens" on public.editor_tokens;
create policy "admins_manage_editor_tokens" on public.editor_tokens for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Validate an editor magic-link token — ported from TT.
--   Adjustment: author_name now falls back across languages (name_en → name_ro).
create or replace function public.validate_editor_token(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare result jsonb;
begin
  select jsonb_build_object(
    'valid', true,
    'author_id',   a.id,
    'editor_key',  t.editor_key,
    'author_name', coalesce(a.name_en, a.name_ro, a.name_el, a.name_ar),
    'author_slug', a.slug,
    'avatar_url',  a.avatar_url
  ) into result
  from public.editor_tokens t
  join public.authors a on a.id = t.author_id
  where t.token = p_token
    and t.active = true
    and (t.expires_at is null or t.expires_at > now());

  if result is null then
    return jsonb_build_object('valid', false);
  end if;

  update public.editor_tokens set last_used_at = now() where token = p_token;
  return result;
end;
$$;

-- ── editor_drafts (external editor workspace) ─────────────────────────────────
-- Matches live TT columns verbatim. IMPORTANT: an editor drafts in ONE language
-- (title/content/language); when translate = true the AI desk renders the other
-- three. So this stays single-language — not column pairs. Default language for
-- Cyprus is 'en' (TT used 'ro'); language CHECK widened to the 4-language set.
create table if not exists public.editor_drafts (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null references public.authors(id) on delete cascade,
  editor_key   text not null,
  title        text not null default '',
  content      text not null default '',
  category     text not null default 'opinion',
  county       text,
  language     text default 'en' check (language in ('en','el','ro','ar')),
  image_url    text,
  image_credit text,
  status       text not null default 'draft',
  proof_result jsonb,
  translate    boolean not null default true,
  blog_post_id uuid references public.blog_posts(id) on delete set null,
  word_count   integer default 0,
  layout_mode  text not null default 'auto' check (layout_mode in ('auto','rich')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.editor_drafts enable row level security;
drop policy if exists "admins_manage_editor_drafts" on public.editor_drafts;
create policy "admins_manage_editor_drafts" on public.editor_drafts for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.editor_drafts;
create trigger set_updated_at before update on public.editor_drafts
  for each row execute function public.update_updated_at();

-- ####################################################################
-- # FILE: 0004_scraper_ai.sql
-- ####################################################################
-- ============================================================================
-- Cyprus Lifestyle — 0004 · Scraper & AI pipeline
--   rss_sources · scraped_articles (4-lang) · rewrite_jobs · column_jobs
--   automation_settings · county_quotas · generation_logs · ai_spend_log
--   commit_scraper_blog_post() [4-lang] · mark_scraped_article_processed()
--   sweep_stuck_rewrite_jobs() · ai_spend_today()
-- ----------------------------------------------------------------------------
-- Faithful port. The one substantive change is that commit_scraper_blog_post
-- and the scraped_articles writeback now carry EL and AR alongside EN and RO.
-- ============================================================================

-- ── rss_sources ──────────────────────────────────────────────────────────────
create table if not exists public.rss_sources (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  url             text not null,
  is_active       boolean not null default true,
  last_scraped_at timestamptz,
  created_at      timestamptz not null default now(),
  category        text default 'news',
  source_language text default 'en',       -- en | el | ro | ar
  county          text,                    -- Cyprus district focus (optional)
  city_focus      text[] default '{}',
  scope           text default 'regional', -- regional | national | international
  output_limit    integer default 10,
  source_type     text default 'geographic',
  target_category text,
  region          text,                    -- ADDED for Cyprus routing: cyprus|greece|international|gulf
  tier            text,                    -- ADDED for Cyprus routing: luxury|news|business
  error_count     integer default 0,
  error_message   text
);
alter table public.rss_sources enable row level security;
drop policy if exists "Admins manage rss sources" on public.rss_sources;
create policy "Admins manage rss sources" on public.rss_sources for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ── scraped_articles (raw feed items + AI rewrites) ──────────────────────────
create table if not exists public.scraped_articles (
  id                    uuid primary key default gen_random_uuid(),
  source_id             uuid references public.rss_sources(id) on delete cascade,
  original_title        text,
  original_url          text,
  original_content      text,
  original_content_full text,
  rewritten_content     text,
  status                text not null default 'scraped',
  created_at            timestamptz not null default now(),

  -- per-language rewrite outputs
  title_en              text,
  title_el              text,
  title_ro              text,
  title_ar              text,
  rewritten_en          text,
  rewritten_el          text,
  rewritten_ro          text,
  rewritten_ar          text,
  excerpt_en            text,
  excerpt_el            text,
  excerpt_ro            text,
  excerpt_ar            text,
  summary_en            text,
  summary_el            text,
  summary_ro            text,
  summary_ar            text,
  seo_title_en          text,
  seo_title_el          text,
  seo_title_ro          text,
  seo_title_ar          text,
  seo_description_en    text,
  seo_description_el    text,
  seo_description_ro    text,
  seo_description_ar    text,
  rewrite_tags          text[] default '{}',
  rewrite_tags_en       text[] default '{}',
  rewrite_tags_el       text[] default '{}',
  rewrite_tags_ro       text[] default '{}',
  rewrite_tags_ar       text[] default '{}',

  rewrite_error         text,
  ai_score              real,
  last_rewrite_job_id   uuid,               -- FK added after rewrite_jobs exists
  rewrite_started_at    timestamptz,
  rewrite_finished_at   timestamptz,
  plagiarism_score      real,
  quality_checked_at    timestamptz,
  cover_image           text,
  category              text,
  subcategory           text,
  assigned_editor       text,
  source_word_count     integer,
  output_word_count     integer,
  is_used               boolean default false,
  marked_for_deletion   boolean default false,
  error_message         text,
  county                text,
  scope                 text,
  source_type           text,
  target_category       text,
  sonnet_fallback_used  boolean default false
);
alter table public.scraped_articles enable row level security;
drop policy if exists "Admins manage scraped articles" on public.scraped_articles;
create policy "Admins manage scraped articles" on public.scraped_articles for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- now that scraped_articles exists, wire blog_posts.scraped_article_id FK
alter table public.blog_posts
  drop constraint if exists blog_posts_scraped_article_id_fkey;
alter table public.blog_posts
  add constraint blog_posts_scraped_article_id_fkey
  foreign key (scraped_article_id) references public.scraped_articles(id) on delete set null;

-- ── rewrite_jobs ─────────────────────────────────────────────────────────────
create table if not exists public.rewrite_jobs (
  id                 uuid primary key default gen_random_uuid(),
  scraped_article_id uuid references public.scraped_articles(id) on delete cascade,
  article_id         uuid references public.scraped_articles(id) on delete cascade,
  status             text not null default 'pending',
  result             text,
  editor             text,
  started_at         timestamptz,
  finished_at        timestamptz,
  retry_count        integer default 0,
  max_retries        integer default 3,
  error_code         text,
  error_message      text,
  created_at         timestamptz not null default now()
);
alter table public.rewrite_jobs enable row level security;
drop policy if exists "Admins manage rewrite jobs" on public.rewrite_jobs;
create policy "Admins manage rewrite jobs" on public.rewrite_jobs for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- close the circular ref: scraped_articles.last_rewrite_job_id → rewrite_jobs
alter table public.scraped_articles
  drop constraint if exists scraped_articles_last_rewrite_job_id_fkey;
alter table public.scraped_articles
  add constraint scraped_articles_last_rewrite_job_id_fkey
  foreign key (last_rewrite_job_id) references public.rewrite_jobs(id) on delete set null;

-- ── column_jobs (weekly opinion-column generator) ────────────────────────────
create table if not exists public.column_jobs (
  id          uuid primary key default gen_random_uuid(),
  status       text not null default 'queued',  -- states set by the column worker
  phase        integer not null default 0,
  article_type text not null,
  editor_key   text not null,
  category     text,
  county       text,
  draft_lang   text not null default 'en' check (draft_lang in ('en','el','ro','ar')),
  word_count   integer not null default 1200,
  input        jsonb not null,
  draft        text,
  draft_title  text,
  passes       integer not null default 0,
  max_passes   integer not null default 3,
  result       jsonb,
  attempts     integer not null default 0,
  error        text,
  est_cost     numeric not null default 0,
  claimed_at  timestamptz,
  created_by  uuid,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.column_jobs enable row level security;
drop policy if exists "Admins manage column jobs" on public.column_jobs;
create policy "Admins manage column jobs" on public.column_jobs for all to public
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.column_jobs;
create trigger set_updated_at before update on public.column_jobs
  for each row execute function public.update_updated_at();

-- ── automation_settings (single-row switchboard) ─────────────────────────────
create table if not exists public.automation_settings (
  id                integer primary key default 1,
  scraper_enabled   boolean not null default false,
  processor_enabled boolean not null default false,
  auto_publish      boolean not null default false,
  updated_at        timestamptz not null default now(),
  updated_by        uuid
);
alter table public.automation_settings enable row level security;
drop policy if exists "Admins manage automation_settings" on public.automation_settings;
create policy "Admins manage automation_settings" on public.automation_settings for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- Enforce the single row (id = 1) — verbatim from TT.
create or replace function public.automation_settings_singleton()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.id <> 1 then
    raise exception 'automation_settings is a single-row table (id=1 only)';
  end if;
  return new;
end $$;

drop trigger if exists automation_settings_singleton on public.automation_settings;
create trigger automation_settings_singleton before insert on public.automation_settings
  for each row execute function public.automation_settings_singleton();

-- ── county_quotas (per-district scraper cap) ─────────────────────────────────
-- Matches live TT columns (county = Cyprus district).
create table if not exists public.county_quotas (
  county      text primary key,
  daily_limit integer not null default 3,
  priority    integer not null default 1,
  active      boolean not null default true,
  created_at  timestamptz default now()
);
alter table public.county_quotas enable row level security;
drop policy if exists "admins_manage_county_quotas" on public.county_quotas;
create policy "admins_manage_county_quotas" on public.county_quotas for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ── generation_logs (AI desk telemetry) ──────────────────────────────────────
-- Live TT columns (verbatim) + EL/AR per-language siblings for the 4-language
-- desk. TT's base draft is EN; EL/RO/AR are translated passes.
create table if not exists public.generation_logs (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  brief_excerpt        text,
  article_type         text,
  category             text,
  word_count_req       integer,
  desk1_ok             boolean,
  desk1_ms             integer,
  desk2a_ok            boolean,
  desk2a_ms            integer,
  -- desk 2b = translation pass, one flag per target language
  desk2b_en_ok         boolean,
  desk2b_el_ok         boolean,
  desk2b_ro_ok         boolean,
  desk2b_ar_ok         boolean,
  desk2b_ms            integer,
  el_retries           integer default 0,
  ro_retries           integer default 0,
  ar_retries           integer default 0,
  el_lang_ok           boolean,
  ro_lang_ok           boolean,
  ar_lang_ok           boolean,
  title_regen_en       boolean default false,
  title_regen_el       boolean default false,
  title_regen_ro       boolean default false,
  title_regen_ar       boolean default false,
  words_en             integer,
  words_el             integer,
  words_ro             integer,
  words_ar             integer,
  total_ms             integer,
  est_cost_usd         numeric,
  status               text,
  error_msg            text,
  editor               text,
  word_count_effective integer,
  length_capped        boolean default false,
  research_enriched    boolean default false,
  research_atoms_chars integer default 0,
  -- per-language quality flags
  en_polished          boolean default false,
  en_extended          boolean default false,
  en_title_swapped     boolean default false,
  en_closer_swapped    boolean default false,
  en_humanness         integer default 0,
  el_polished          boolean default false,
  el_extended          boolean default false,
  el_title_swapped     boolean default false,
  el_closer_swapped    boolean default false,
  el_humanness         integer default 0,
  ro_polished          boolean default false,
  ro_extended          boolean default false,
  ro_title_swapped     boolean default false,
  ro_closer_swapped    boolean default false,
  ro_humanness         integer default 0,
  ar_polished          boolean default false,
  ar_extended          boolean default false,
  ar_title_swapped     boolean default false,
  ar_closer_swapped    boolean default false,
  ar_humanness         integer default 0,
  error_stage          text
);
alter table public.generation_logs enable row level security;
drop policy if exists "admins_read_genlogs" on public.generation_logs;
create policy "admins_read_genlogs" on public.generation_logs for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ── ai_spend_log (+ daily rollup views) ──────────────────────────────────────
-- Matches live TT columns verbatim (bigserial id, single `units`, `caller`,
-- meta not-null). Only the rollup views' timezone changes to Europe/Nicosia.
create table if not exists public.ai_spend_log (
  id            bigint generated by default as identity primary key,
  occurred_at   timestamptz not null default now(),
  job_id        uuid,
  function_name text,
  provider      text,
  model         text,
  units         numeric,
  unit_kind     text,
  usd           numeric,
  caller        text,
  meta          jsonb not null default '{}'::jsonb
);
alter table public.ai_spend_log enable row level security;
drop policy if exists "ai_spend_log admin read" on public.ai_spend_log;
create policy "ai_spend_log admin read" on public.ai_spend_log for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create or replace view public.ai_spend_daily as
  select (occurred_at at time zone 'Europe/Nicosia')::date as day,
         provider,
         round(sum(coalesce(usd,0)), 5) as usd,
         count(*)                        as calls
  from public.ai_spend_log
  group by 1, 2;

create or replace view public.ai_spend_by_function_daily as
  select (occurred_at at time zone 'Europe/Nicosia')::date as day,
         function_name,
         provider,
         model,
         count(*)                        as calls,
         round(sum(coalesce(usd,0)), 5) as usd
  from public.ai_spend_log
  group by 1, 2, 3, 4;

-- Today's spend — ported from TT; Europe/Bucharest → Europe/Nicosia.
create or replace function public.ai_spend_today(p_provider text default null)
returns numeric
language sql
stable
set search_path = public
as $$
  select coalesce(round(sum(coalesce(l.usd, 0)), 5), 0)::numeric
  from   public.ai_spend_log l
  where  (l.occurred_at at time zone 'Europe/Nicosia')::date
           = (now() at time zone 'Europe/Nicosia')::date
    and  (p_provider is null or l.provider = p_provider);
$$;

-- ── mark_scraped_article_processed (trigger on blog_posts) ───────────────────
-- Verbatim from TT.
create or replace function public.mark_scraped_article_processed()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.scraped_article_id is not null then
    update public.scraped_articles
       set status = 'processed',
           rewrite_finished_at = coalesce(rewrite_finished_at, now())
     where id = new.scraped_article_id and status <> 'processed';
  end if;
  return new;
end;
$$;

drop trigger if exists mark_scraped_article_processed on public.blog_posts;
create trigger mark_scraped_article_processed
  after insert on public.blog_posts
  for each row execute function public.mark_scraped_article_processed();

-- ── sweep_stuck_rewrite_jobs ─────────────────────────────────────────────────
-- Verbatim from TT.
create or replace function public.sweep_stuck_rewrite_jobs()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare swept integer;
begin
  with stuck as (
    update public.rewrite_jobs
       set status        = 'failed',
           retry_count   = coalesce(retry_count, 0) + 1,
           error_code    = 'stuck_swept',
           error_message = 'Reset by stuck-job sweeper: left in ' || status ||
                           ' for over 15 minutes (edge function timed out or crashed '
                           || 'mid-run). Freed the active-article lock so a new rewrite '
                           || 'can be queued.',
           finished_at   = now()
     where (status = 'processing' and coalesce(started_at, created_at) < now() - interval '15 minutes')
        or (status = 'queued'     and created_at                        < now() - interval '15 minutes')
    returning 1
  )
  select count(*) into swept from stuck;
  return swept;
end;
$$;

-- ── commit_scraper_blog_post (4-language) ────────────────────────────────────
-- Ported from TT, extended to EN·EL·RO·AR. Insert into blog_posts + writeback
-- to scraped_articles, transactionally. The v71.2 hotfix (do NOT write
-- last_rewrite_job_id) is preserved.
create or replace function public.commit_scraper_blog_post(
  p_blog_payload jsonb, p_scraped_id uuid, p_writeback jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_post_id uuid;
  v_updated int;
begin
  insert into public.blog_posts (
    title_en, title_el, title_ro, title_ar,
    content_en, content_el, content_ro, content_ar,
    excerpt_en, excerpt_el, excerpt_ro, excerpt_ar,
    summary_en, summary_el, summary_ro, summary_ar,
    tags_en, tags_el, tags_ro, tags_ar,
    seo_title_en, seo_title_el, seo_title_ro, seo_title_ar,
    seo_description_en, seo_description_el, seo_description_ro, seo_description_ar,
    slug, category, subcategory, county,
    cover_image, source_url, scraped_article_id,
    ai_editor, author_name, author_id,
    word_count, status, published_at
  )
  values (
    p_blog_payload->>'title_en',
    p_blog_payload->>'title_el',
    p_blog_payload->>'title_ro',
    p_blog_payload->>'title_ar',
    p_blog_payload->>'content_en',
    p_blog_payload->>'content_el',
    p_blog_payload->>'content_ro',
    p_blog_payload->>'content_ar',
    p_blog_payload->>'excerpt_en',
    p_blog_payload->>'excerpt_el',
    p_blog_payload->>'excerpt_ro',
    p_blog_payload->>'excerpt_ar',
    p_blog_payload->>'summary_en',
    p_blog_payload->>'summary_el',
    p_blog_payload->>'summary_ro',
    p_blog_payload->>'summary_ar',
    case when jsonb_typeof(p_blog_payload->'tags_en') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_en')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_el') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_el')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_ro') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_ro')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_ar') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_ar')) else '{}'::text[] end,
    p_blog_payload->>'seo_title_en',
    p_blog_payload->>'seo_title_el',
    p_blog_payload->>'seo_title_ro',
    p_blog_payload->>'seo_title_ar',
    p_blog_payload->>'seo_description_en',
    p_blog_payload->>'seo_description_el',
    p_blog_payload->>'seo_description_ro',
    p_blog_payload->>'seo_description_ar',
    p_blog_payload->>'slug',
    p_blog_payload->>'category',
    p_blog_payload->>'subcategory',
    p_blog_payload->>'county',
    p_blog_payload->>'cover_image',
    p_blog_payload->>'source_url',
    nullif(p_blog_payload->>'scraped_article_id', '')::uuid,
    p_blog_payload->>'ai_editor',
    p_blog_payload->>'author_name',
    nullif(p_blog_payload->>'author_id', '')::uuid,
    nullif(p_blog_payload->>'word_count', '')::int,
    coalesce(p_blog_payload->>'status', 'draft'),
    nullif(p_blog_payload->>'published_at', '')::timestamptz
  )
  returning id into v_post_id;

  update public.scraped_articles
  set
    status              = 'processed',
    assigned_editor     = p_writeback->>'assigned_editor',
    rewritten_en        = p_writeback->>'rewritten_en',
    rewritten_el        = p_writeback->>'rewritten_el',
    rewritten_ro        = p_writeback->>'rewritten_ro',
    rewritten_ar        = p_writeback->>'rewritten_ar',
    title_en            = p_writeback->>'title_en',
    title_el            = p_writeback->>'title_el',
    title_ro            = p_writeback->>'title_ro',
    title_ar            = p_writeback->>'title_ar',
    excerpt_en          = p_writeback->>'excerpt_en',
    excerpt_el          = p_writeback->>'excerpt_el',
    excerpt_ro          = p_writeback->>'excerpt_ro',
    excerpt_ar          = p_writeback->>'excerpt_ar',
    summary_en          = p_writeback->>'summary_en',
    summary_el          = p_writeback->>'summary_el',
    summary_ro          = p_writeback->>'summary_ro',
    summary_ar          = p_writeback->>'summary_ar',
    rewrite_tags        = case when jsonb_typeof(p_writeback->'rewrite_tags') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags')) else rewrite_tags end,
    rewrite_tags_en     = case when jsonb_typeof(p_writeback->'rewrite_tags_en') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_en')) else rewrite_tags_en end,
    rewrite_tags_el     = case when jsonb_typeof(p_writeback->'rewrite_tags_el') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_el')) else rewrite_tags_el end,
    rewrite_tags_ro     = case when jsonb_typeof(p_writeback->'rewrite_tags_ro') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_ro')) else rewrite_tags_ro end,
    rewrite_tags_ar     = case when jsonb_typeof(p_writeback->'rewrite_tags_ar') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_ar')) else rewrite_tags_ar end,
    seo_title_en        = p_writeback->>'seo_title_en',
    seo_title_el        = p_writeback->>'seo_title_el',
    seo_title_ro        = p_writeback->>'seo_title_ro',
    seo_title_ar        = p_writeback->>'seo_title_ar',
    seo_description_en  = p_writeback->>'seo_description_en',
    seo_description_el  = p_writeback->>'seo_description_el',
    seo_description_ro  = p_writeback->>'seo_description_ro',
    seo_description_ar  = p_writeback->>'seo_description_ar',
    category            = coalesce(p_writeback->>'category', category),
    subcategory         = p_writeback->>'subcategory',
    cover_image         = p_writeback->>'cover_image',
    output_word_count   = nullif(p_writeback->>'output_word_count', '')::int,
    rewrite_error       = null,
    rewrite_finished_at = now()
    -- v71.2 hotfix preserved: last_rewrite_job_id is NOT written here.
  where id = p_scraped_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'commit_scraper_blog_post: scraped_article % not found during writeback', p_scraped_id;
  end if;

  return v_post_id;
end;
$$;

-- ####################################################################
-- # FILE: 0005_engagement.sql
-- ####################################################################
-- ============================================================================
-- Cyprus Lifestyle — 0005 · Audience & engagement
--   contacts · newsletter_subscribers (+sync) · newsletter_campaigns
--   contact_messages (Inbox) · social_posts
-- Faithful port. Language defaults widened to the 4-language set where relevant.
-- ============================================================================

-- ── contacts (CRM) ───────────────────────────────────────────────────────────
create table if not exists public.contacts (
  id                   uuid primary key default gen_random_uuid(),
  email                text unique not null,
  name                 text,
  source               text default 'manual',
  notes                text,
  language             text default 'en',       -- en | el | ro | ar
  tags                 text[] default '{}',
  newsletter_subscribed boolean default false,
  phone                text,
  company              text,
  contact_type         text default 'general',
  last_email_sent_at   timestamptz,
  last_email_type      text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
alter table public.contacts enable row level security;
drop policy if exists "Admins manage contacts table" on public.contacts;
create policy "Admins manage contacts table" on public.contacts for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.contacts;
create trigger set_updated_at before update on public.contacts
  for each row execute function public.update_updated_at();

-- ── newsletter_subscribers ───────────────────────────────────────────────────
create table if not exists public.newsletter_subscribers (
  id                  uuid primary key default gen_random_uuid(),
  email               text unique not null,
  name                text,
  is_active           boolean not null default true,
  confirmed           boolean not null default false,
  language            text default 'en',        -- edition the subscriber wants
  confirmation_token  text,
  confirmation_sent_at timestamptz,
  confirmed_at        timestamptz,
  unsubscribed_at     timestamptz,
  county              text,                      -- Cyprus district (optional)
  weather_alerts      boolean default false,     -- carried for parity; unused in Cyprus
  created_at          timestamptz not null default now()
);
alter table public.newsletter_subscribers enable row level security;
drop policy if exists "Anyone can subscribe" on public.newsletter_subscribers;
create policy "Anyone can subscribe"        on public.newsletter_subscribers for insert to anon, authenticated with check (true);
drop policy if exists "Admins manage subscribers" on public.newsletter_subscribers;
create policy "Admins manage subscribers"   on public.newsletter_subscribers for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Mirror every new subscriber into contacts — verbatim from TT.
create or replace function public.sync_subscriber_to_contacts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.contacts (email, name, source)
  values (new.email, split_part(new.email, '@', 1), 'newsletter')
  on conflict (email) do nothing;
  return new;
end;
$$;

drop trigger if exists on_subscriber_created on public.newsletter_subscribers;
create trigger on_subscriber_created
  after insert on public.newsletter_subscribers
  for each row execute function public.sync_subscriber_to_contacts();

-- ── newsletter_campaigns ─────────────────────────────────────────────────────
create table if not exists public.newsletter_campaigns (
  id              uuid primary key default gen_random_uuid(),
  subject         text not null,
  content         text,
  status          text not null default 'draft',
  target_language text default 'all',            -- all | en | el | ro | ar
  sent_at         timestamptz,
  recipient_count integer default 0,
  created_at      timestamptz not null default now()
);
alter table public.newsletter_campaigns enable row level security;
drop policy if exists "Admins manage campaigns" on public.newsletter_campaigns;
create policy "Admins manage campaigns" on public.newsletter_campaigns for all to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- ── contact_messages (Inbox) ─────────────────────────────────────────────────
create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  subject     text,
  message     text not null,
  status      text not null default 'unread',    -- unread | read | replied
  admin_reply text,
  created_at  timestamptz not null default now(),
  replied_at  timestamptz
);
alter table public.contact_messages enable row level security;
drop policy if exists "Anyone can submit contact" on public.contact_messages;
create policy "Anyone can submit contact" on public.contact_messages for insert to anon, authenticated with check (true);
drop policy if exists "Admins manage contacts" on public.contact_messages;
create policy "Admins manage contacts"    on public.contact_messages for all to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ── social_posts (publishing ledger) ─────────────────────────────────────────
create table if not exists public.social_posts (
  id          uuid primary key default gen_random_uuid(),
  article_id  uuid references public.blog_posts(id) on delete cascade,
  platform    text,                              -- facebook | instagram | x | linkedin | youtube
  lang        text default 'en',                 -- language of the post copy
  format      text,
  status      text default 'published',
  external_id text,
  permalink   text,
  campaign    text,
  variant     text,
  image_url   text,
  error       text,
  payload     jsonb,
  created_at  timestamptz not null default now()
);
alter table public.social_posts enable row level security;
-- Live used an inline EXISTS(user_roles) test; has_role() is the equivalent.
drop policy if exists "social_posts_admin_all" on public.social_posts;
create policy "social_posts_admin_all" on public.social_posts for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ####################################################################
-- # FILE: 0006_advertising.sql
-- ####################################################################
-- ============================================================================
-- Cyprus Lifestyle — 0006 · Advertising
--   sponsor_banners (4-lang) · ad_pricing (4-lang) · ad_inquiries
--   increment_banner_impressions() · increment_banner_clicks()
-- Adjustments: EL/AR copy columns added; colour defaults set to the Cyprus
-- Lifestyle palette (obsidian ground, gold accent); currency already EUR in TT.
-- ============================================================================

-- ── sponsor_banners ──────────────────────────────────────────────────────────
create table if not exists public.sponsor_banners (
  id             uuid primary key default gen_random_uuid(),
  advertiser_name text,
  contact_email  text,
  headline_en    text,
  headline_el    text,
  headline_ro    text,
  headline_ar    text,
  body_en        text,
  body_el        text,
  body_ro        text,
  body_ar        text,
  cta_en         text default 'Discover →',
  cta_el         text default 'Ανακαλύψτε →',
  cta_ro         text default 'Descoperă →',
  cta_ar         text default 'اكتشف ←',
  url            text,
  image_url      text,
  bg_color       text default '#0B0E11',   -- Cyprus Lifestyle obsidian
  accent_color   text default '#C9A24C',   -- Cyprus Lifestyle gold
  slot           text default 'sidebar-homepage',
  weight         integer default 1,
  is_active      boolean default true,
  start_date     date,
  end_date       date,
  impressions    bigint default 0,
  clicks         bigint default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
alter table public.sponsor_banners enable row level security;

-- Verbatim from TT.
drop policy if exists "Public can read active banners" on public.sponsor_banners;
create policy "Public can read active banners" on public.sponsor_banners for select to anon, authenticated
  using (is_active = true
         and (start_date is null or start_date <= current_date)
         and (end_date   is null or end_date   >= current_date));
drop policy if exists "admins_manage_sponsor_banners" on public.sponsor_banners;
create policy "admins_manage_sponsor_banners" on public.sponsor_banners for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.sponsor_banners;
create trigger set_updated_at before update on public.sponsor_banners
  for each row execute function public.update_updated_at();

-- Counters — verbatim from TT.
create or replace function public.increment_banner_impressions(banner_id uuid)
returns void language sql security definer set search_path = public, pg_temp
as $$ update public.sponsor_banners set impressions = impressions + 1 where id = banner_id; $$;

create or replace function public.increment_banner_clicks(banner_id uuid)
returns void language sql security definer set search_path = public, pg_temp
as $$ update public.sponsor_banners set clicks = clicks + 1 where id = banner_id; $$;

-- ── ad_pricing (public rate card) ────────────────────────────────────────────
create table if not exists public.ad_pricing (
  id          uuid primary key default gen_random_uuid(),
  slot        text unique not null,
  label_en    text,
  label_el    text,
  label_ro    text,
  label_ar    text,
  format      text,
  weekly_eur  numeric,
  monthly_eur numeric,
  yearly_eur  numeric,
  updated_at  timestamptz not null default now()
);
alter table public.ad_pricing enable row level security;
drop policy if exists "Public can read pricing" on public.ad_pricing;
create policy "Public can read pricing"    on public.ad_pricing for select to anon, authenticated using (true);
drop policy if exists "admins_manage_ad_pricing" on public.ad_pricing;
create policy "admins_manage_ad_pricing"    on public.ad_pricing for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.ad_pricing;
create trigger set_updated_at before update on public.ad_pricing
  for each row execute function public.update_updated_at();

-- ── ad_inquiries (outbound rate-card sends) ──────────────────────────────────
create table if not exists public.ad_inquiries (
  id              uuid primary key default gen_random_uuid(),
  recipient_name  text not null,
  recipient_email text not null,
  language        text not null default 'en',   -- TT default was 'ro'
  slots_offered   text,                          -- scalar text in live TT
  sent_at         timestamptz default now()
);
alter table public.ad_inquiries enable row level security;
drop policy if exists "admins_manage_ad_inquiries" on public.ad_inquiries;
create policy "admins_manage_ad_inquiries" on public.ad_inquiries for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ####################################################################
-- # FILE: 0007_analytics_settings.sql
-- ####################################################################
-- ============================================================================
-- Cyprus Lifestyle — 0007 · Analytics & settings
--   site_analytics · section_views · site_settings
--   get_analytics_data() · get_analytics_data_admin() · update_view_geo()
-- Adjustments vs TT: internal-referrer match → cypruslifestyle domains;
-- Romanian display labels → English (Internal / Other / unknown).
-- ============================================================================

-- ── site_analytics ───────────────────────────────────────────────────────────
create table if not exists public.site_analytics (
  id               uuid primary key default gen_random_uuid(),
  page_path        text not null,
  referrer         text,
  user_agent       text,
  country          text,
  city             text,
  device_type      text,
  browser          text,
  session_duration integer default 0,
  session_id       text,
  visitor_id       text,
  event_type       text default 'pageview',
  utm_source       text,
  utm_medium       text,
  utm_campaign     text,
  utm_content      text,
  screen_width     integer,
  is_bot           boolean default false,
  created_at       timestamptz not null default now()
);
alter table public.site_analytics enable row level security;
drop policy if exists "Anyone can insert analytics" on public.site_analytics;
create policy "Anyone can insert analytics" on public.site_analytics for insert to anon, authenticated with check (true);
drop policy if exists "Admins read analytics" on public.site_analytics;
create policy "Admins read analytics"       on public.site_analytics for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ── section_views ────────────────────────────────────────────────────────────
create table if not exists public.section_views (
  id            uuid primary key default gen_random_uuid(),
  page_path     text not null,
  section_id    text not null,
  view_duration integer default 0,
  created_at    timestamptz not null default now()
);
alter table public.section_views enable row level security;
drop policy if exists "Anyone can insert section views" on public.section_views;
create policy "Anyone can insert section views" on public.section_views for insert to anon, authenticated with check (true);
drop policy if exists "Admins read section views" on public.section_views;
create policy "Admins read section views"       on public.section_views for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ── site_settings ────────────────────────────────────────────────────────────
create table if not exists public.site_settings (
  id         uuid primary key default gen_random_uuid(),
  key        text unique not null,
  value      jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_settings enable row level security;
drop policy if exists "Public can read settings" on public.site_settings;
create policy "Public can read settings" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "Admins manage settings" on public.site_settings;
create policy "Admins manage settings"   on public.site_settings for all to authenticated using (public.has_role(auth.uid(), 'admin'));

drop trigger if exists set_updated_at on public.site_settings;
create trigger set_updated_at before update on public.site_settings
  for each row execute function public.update_updated_at();

-- ── update_view_geo ──────────────────────────────────────────────────────────
-- Verbatim from TT.
create or replace function public.update_view_geo(p_slug text, p_country text default null, p_city text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update site_analytics
     set country = p_country, city = p_city
   where id = (
     select id from site_analytics
      where page_path like '%' || p_slug || '%'
        and country is null
        and created_at > now() - interval '2 minutes'
      order by created_at desc
      limit 1
   );
end;
$$;

-- ── get_analytics_data ───────────────────────────────────────────────────────
-- Ported from TT. Adjustments: internal domain match + English display labels.
create or replace function public.get_analytics_data(p_period text default '7d')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  period_interval interval;
  now_ts timestamptz := now();
begin
  period_interval := case p_period
    when '24h' then interval '24 hours'
    when '7d'  then interval '7 days'
    when '30d' then interval '30 days'
    else interval '7 days'
  end;

  with
  period_rows as (
    select * from site_analytics
    where created_at > now_ts - period_interval
      and (is_bot is null or is_bot = false)
      and page_path not like '/admin%'
  ),
  all_rows as (
    select * from site_analytics
    where created_at > now_ts - interval '30 days'
      and (is_bot is null or is_bot = false)
      and page_path not like '/admin%'
  ),
  overview as (
    select jsonb_build_object(
      'views_24h',    count(*) filter (where created_at > now_ts - interval '24 hours'),
      'visitors_24h', count(distinct visitor_id) filter (where created_at > now_ts - interval '24 hours'),
      'views_7d',     count(*) filter (where created_at > now_ts - interval '7 days'),
      'visitors_7d',  count(distinct visitor_id) filter (where created_at > now_ts - interval '7 days'),
      'views_30d',    count(*),
      'visitors_30d', count(distinct visitor_id),
      'live_5min',    count(distinct visitor_id) filter (where created_at > now_ts - interval '5 minutes')
    ) as data
    from all_rows
  ),
  top_pages as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', page_path, 'value', count(*)::int,
                                'extra', count(distinct visitor_id)::int) as row_obj, count(*) as cnt
      from period_rows group by page_path order by cnt desc limit 15
    ) sub
  ),
  traffic_sources as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', case
          when referrer is null or lower(trim(referrer)) = '' or lower(trim(referrer)) = 'direct' then 'Direct'
          when lower(referrer) like '%facebook%' or lower(referrer) like '%fb.com%' or lower(referrer) like '%fbclid%' then 'Facebook'
          when lower(referrer) like '%news.google%' then 'Google News'
          when lower(referrer) like '%google%' then 'Google Search'
          when lower(referrer) like '%t.co%' or lower(referrer) like '%twitter%' or lower(referrer) like '%x.com%' then 'Twitter / X'
          when lower(referrer) like '%linkedin%' or lower(referrer) like '%lnkd.in%' then 'LinkedIn'
          when lower(referrer) like '%instagram%' then 'Instagram'
          when lower(referrer) like '%whatsapp%' or lower(referrer) like '%wa.me%' then 'WhatsApp'
          when lower(referrer) like '%reddit%' then 'Reddit'
          when lower(referrer) like '%bing%' then 'Bing'
          when lower(referrer) like '%yahoo%' then 'Yahoo'
          when lower(referrer) like '%duckduckgo%' then 'DuckDuckGo'
          when lower(referrer) like '%cypruslifestyle%' or lower(referrer) like '%cyprus-lifestyle%' then 'Internal'
          else 'Other'
        end, 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows
      group by case
          when referrer is null or lower(trim(referrer)) = '' or lower(trim(referrer)) = 'direct' then 'Direct'
          when lower(referrer) like '%facebook%' or lower(referrer) like '%fb.com%' or lower(referrer) like '%fbclid%' then 'Facebook'
          when lower(referrer) like '%news.google%' then 'Google News'
          when lower(referrer) like '%google%' then 'Google Search'
          when lower(referrer) like '%t.co%' or lower(referrer) like '%twitter%' or lower(referrer) like '%x.com%' then 'Twitter / X'
          when lower(referrer) like '%linkedin%' or lower(referrer) like '%lnkd.in%' then 'LinkedIn'
          when lower(referrer) like '%instagram%' then 'Instagram'
          when lower(referrer) like '%whatsapp%' or lower(referrer) like '%wa.me%' then 'WhatsApp'
          when lower(referrer) like '%reddit%' then 'Reddit'
          when lower(referrer) like '%bing%' then 'Bing'
          when lower(referrer) like '%yahoo%' then 'Yahoo'
          when lower(referrer) like '%duckduckgo%' then 'DuckDuckGo'
          when lower(referrer) like '%cypruslifestyle%' or lower(referrer) like '%cyprus-lifestyle%' then 'Internal'
          else 'Other'
        end
      order by cnt desc
    ) sub
  ),
  top_countries as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', coalesce(country, 'unknown'), 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows where country is not null group by country order by cnt desc limit 15
    ) sub
  ),
  top_cities as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', coalesce(city, 'unknown'), 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows where city is not null group by city order by cnt desc limit 15
    ) sub
  ),
  device_breakdown as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', coalesce(device_type, 'unknown'), 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows where device_type is not null group by device_type order by cnt desc
    ) sub
  ),
  browser_breakdown as (
    select jsonb_agg(row_obj order by cnt desc) as data
    from (
      select jsonb_build_object('label', coalesce(browser, 'unknown'), 'value', count(*)::int) as row_obj, count(*) as cnt
      from period_rows where browser is not null group by browser order by cnt desc limit 10
    ) sub
  ),
  daily_series as (
    select jsonb_agg(jsonb_build_object('day', d::text, 'views', coalesce(v.views,0), 'uniques', coalesce(v.uniques,0)) order by d) as data
    from generate_series((now_ts - period_interval)::date, now_ts::date, '1 day') as d
    left join (
      select created_at::date as day, count(*)::int as views, count(distinct visitor_id)::int as uniques
      from period_rows group by created_at::date
    ) v on v.day = d
  ),
  fb_organic as (
    select jsonb_build_object(
      'facebook', count(*) filter (where lower(coalesce(referrer,'')) like '%facebook%' or lower(coalesce(referrer,'')) like '%fb.com%' or lower(coalesce(referrer,'')) like '%fbclid%'),
      'google',   count(*) filter (where (lower(coalesce(referrer,'')) like '%google%' and lower(coalesce(referrer,'')) not like '%news.google%') or lower(coalesce(referrer,'')) like '%news.google%'),
      'direct',   count(*) filter (where referrer is null or lower(trim(referrer)) = '' or lower(trim(referrer)) = 'direct'),
      'other',    count(*) filter (where referrer is not null and lower(trim(referrer)) != '' and lower(trim(referrer)) != 'direct'
                    and lower(referrer) not like '%facebook%' and lower(referrer) not like '%fb.com%' and lower(referrer) not like '%fbclid%'
                    and lower(referrer) not like '%google%')
    ) as data
    from period_rows
  )
  select jsonb_build_object(
    'overview',  (select data from overview),
    'pages',     coalesce((select data from top_pages), '[]'::jsonb),
    'sources',   coalesce((select data from traffic_sources), '[]'::jsonb),
    'countries', coalesce((select data from top_countries), '[]'::jsonb),
    'cities',    coalesce((select data from top_cities), '[]'::jsonb),
    'devices',   coalesce((select data from device_breakdown), '[]'::jsonb),
    'browsers',  coalesce((select data from browser_breakdown), '[]'::jsonb),
    'daily',     coalesce((select data from daily_series), '[]'::jsonb),
    'fb_organic', (select data from fb_organic)
  ) into result;

  return result;
end;
$$;

-- Admin-guarded wrapper — verbatim from TT.
create or replace function public.get_analytics_data_admin(p_period text default '7d')
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.get_analytics_data(p_period);
end;
$$;

-- ####################################################################
-- # FILE: 0008_indexes.sql
-- ####################################################################
-- ============================================================================
-- Cyprus Lifestyle — 0008 · Indexes
-- Mirrors the live Transilvania Times index set for every ported table
-- (verbatim, made idempotent), plus:
--   • GIN indexes for search_el / search_ar (the 4-language extension)
--   • rss_sources region/tier/lang/url indexes (Cyprus feed routing)
-- Three of these are behaviourally important, not just performance:
--   • uq_rewrite_jobs_active_article  → the "one active rewrite per article" lock
--   • scraped_articles_original_url_uniq → de-dupes re-scraped URLs
--   • uq_blog_posts_scraped_article_id → one published post per scraped item
-- ============================================================================

-- ai_spend_log
create index if not exists ai_spend_log_function_idx          on public.ai_spend_log using btree (function_name, occurred_at desc);
create index if not exists ai_spend_log_job_idx               on public.ai_spend_log using btree (job_id) where (job_id is not null);
create index if not exists ai_spend_log_occurred_idx          on public.ai_spend_log using btree (occurred_at desc);
create index if not exists ai_spend_log_provider_occurred_idx on public.ai_spend_log using btree (provider, occurred_at desc);

-- authors
create index if not exists idx_authors_active     on public.authors using btree (active);
create index if not exists idx_authors_editor_key on public.authors using btree (editor_key);
create index if not exists idx_authors_slug       on public.authors using btree (slug);

-- comments
create index if not exists idx_blog_comments_post_id on public.blog_comments using btree (post_id);
create index if not exists idx_comments_post_id      on public.comments using btree (post_id);

-- blog_posts (live partial indexes + 4-language search GIN)
create index if not exists blog_posts_view_count_idx           on public.blog_posts using btree (view_count desc, published_at desc) where (status = 'published');
create index if not exists idx_blog_posts_author_id            on public.blog_posts using btree (author_id);
create index if not exists idx_blog_posts_breaking             on public.blog_posts using btree (published_at desc) where ((status = 'published') and (is_breaking = true));
create index if not exists idx_blog_posts_category_published   on public.blog_posts using btree (category, published_at desc) where (status = 'published');
create index if not exists idx_blog_posts_corrected            on public.blog_posts using btree (corrected_at desc) where (corrected_at is not null);
create index if not exists idx_blog_posts_county_published     on public.blog_posts using btree (county, published_at desc) where ((status = 'published') and (county is not null));
create index if not exists idx_blog_posts_scraped_article_id   on public.blog_posts using btree (scraped_article_id);
create index if not exists idx_blog_posts_status_published     on public.blog_posts using btree (published_at desc) where (status = 'published');
create unique index if not exists uq_blog_posts_scraped_article_id on public.blog_posts using btree (scraped_article_id) where (scraped_article_id is not null);
create index if not exists idx_blog_posts_search_en on public.blog_posts using gin (search_en);
create index if not exists idx_blog_posts_search_el on public.blog_posts using gin (search_el);
create index if not exists idx_blog_posts_search_ro on public.blog_posts using gin (search_ro);
create index if not exists idx_blog_posts_search_ar on public.blog_posts using gin (search_ar);

-- column_jobs
create index if not exists column_jobs_created_idx on public.column_jobs using btree (created_at desc);
create index if not exists column_jobs_worker_idx  on public.column_jobs using btree (status, claimed_at);

-- editor_drafts / editor_tokens
create index if not exists idx_editor_drafts_author on public.editor_drafts using btree (author_id);
create index if not exists idx_editor_drafts_status on public.editor_drafts using btree (status);
create index if not exists idx_editor_tokens_author on public.editor_tokens using btree (author_id);
create index if not exists idx_editor_tokens_token  on public.editor_tokens using btree (token) where (active = true);

-- generation_logs
create index if not exists idx_genlogs_created on public.generation_logs using btree (created_at desc);
create index if not exists idx_genlogs_status  on public.generation_logs using btree (status);

-- newsletter
create unique index if not exists newsletter_subscribers_confirmation_token_idx
  on public.newsletter_subscribers using btree (confirmation_token) where (confirmation_token is not null);

-- rewrite_jobs — the active-article lock
create unique index if not exists uq_rewrite_jobs_active_article
  on public.rewrite_jobs using btree (article_id) where (status = any (array['queued','processing']));

-- scraped_articles
create index if not exists idx_scraped_articles_sonnet_fallback on public.scraped_articles using btree (sonnet_fallback_used) where (sonnet_fallback_used = true);
create index if not exists idx_scraped_cleanup on public.scraped_articles using btree (is_used, marked_for_deletion, created_at);
create index if not exists idx_scraped_pending on public.scraped_articles using btree (status, is_used, created_at);
create unique index if not exists scraped_articles_original_url_uniq
  on public.scraped_articles using btree (original_url)
  where ((original_url is not null) and ((marked_for_deletion is null) or (marked_for_deletion = false)));

-- site_analytics
create index if not exists idx_analytics_country     on public.site_analytics using btree (country);
create index if not exists idx_analytics_created_at  on public.site_analytics using btree (created_at desc);
create index if not exists idx_analytics_is_bot      on public.site_analytics using btree (is_bot);
create index if not exists idx_analytics_page_path   on public.site_analytics using btree (page_path);
create index if not exists idx_analytics_referrer    on public.site_analytics using btree (referrer);
create index if not exists idx_analytics_visitor_id  on public.site_analytics using btree (visitor_id);
create index if not exists site_analytics_campaign_content_idx
  on public.site_analytics using btree (utm_campaign, utm_content, created_at desc) where (utm_campaign is not null);

-- social_posts
create index if not exists social_posts_article_idx  on public.social_posts using btree (article_id, created_at desc);
create index if not exists social_posts_campaign_idx on public.social_posts using btree (campaign);
create index if not exists social_posts_created_idx  on public.social_posts using btree (created_at desc);

-- rss_sources — Cyprus feed routing (live has only the pkey; these are additions)
create index if not exists idx_rss_active      on public.rss_sources using btree (is_active);
create index if not exists idx_rss_region_tier on public.rss_sources using btree (region, tier);
create index if not exists idx_rss_lang        on public.rss_sources using btree (source_language);

-- ####################################################################
-- # FILE: 0009_seed_cyprus.sql
-- ####################################################################
-- ============================================================================
-- Cyprus Lifestyle — 0009 · Cyprus seed data
--   districts · editorial desks (authors) · rate card · settings · feeds
-- Idempotent (on conflict do nothing / upserts). Safe to re-run.
-- ============================================================================

-- ── Districts (the "county" bucket) ──────────────────────────────────────────
insert into public.county_quotas (county, daily_limit, priority, active) values
  ('nicosia',   4, 1, true),   -- Λευκωσία — capital district
  ('limassol',  4, 1, true),   -- Λεμεσός — business & marina
  ('larnaca',   3, 2, true),   -- Λάρνακα — airport gateway
  ('famagusta', 3, 2, true),   -- Αμμόχωστος — free area / Ayia Napa
  ('paphos',    3, 2, true),   -- Πάφος — heritage coast
  ('kyrenia',   2, 3, true)    -- Κερύνεια
on conflict (county) do nothing;

-- ── Editorial desks as author personas ───────────────────────────────────────
-- editor_key is the routing key the AI desk uses to pick a voice.
insert into public.authors (slug, editor_key, name_en, name_el, name_ro, name_ar,
                            title_en, title_el, title_ro, title_ar,
                            bio_en, avatar_style, specialties, active)
values
 ('cyprus-desk','cyprus',
   'The Cyprus Desk','Το Δελτίο Κύπρου','Redacția Cipru','مكتب قبرص',
   'Cyprus & Politics','Κύπρος & Πολιτική','Cipru & Politică','قبرص والسياسة',
   'The house desk for Cypriot affairs — governance, the economy of the island, and the stories shaping the Republic.',
   'illustrated', array['cyprus','politics','economy'], true),
 ('business-desk','business',
   'The Business Desk','Το Οικονομικό Δελτίο','Redacția Economică','المكتب الاقتصادي',
   'Business & Investment','Οικονομία & Επενδύσεις','Afaceri & Investiții','الأعمال والاستثمار',
   'Markets, funds, shipping, tax residency and the money that moves through Limassol and Nicosia.',
   'illustrated', array['business','investment','property'], true),
 ('property-desk','property',
   'The Property Desk','Το Δελτίο Ακινήτων','Redacția Imobiliare','مكتب العقارات',
   'Property & Architecture','Ακίνητα & Αρχιτεκτονική','Imobiliare & Arhitectură','العقارات والعمارة',
   'Villas, marinas and the new architecture of the coast — the island as an address.',
   'illustrated', array['property','architecture','design'], true),
 ('culture-desk','culture',
   'The Culture Desk','Το Πολιτιστικό Δελτίο','Redacția Culturală','المكتب الثقافي',
   'Culture & Society','Πολιτισμός & Κοινωνία','Cultură & Societate','الثقافة والمجتمع',
   'Art, heritage, music and the social calendar — from ancient Paphos to opening night.',
   'illustrated', array['culture','art','society'], true),
 ('escapes-desk','escapes',
   'The Escapes Desk','Το Δελτίο Ταξιδιών','Redacția Călătorii','مكتب الأسفار',
   'Travel & Escapes','Ταξίδια & Αποδράσεις','Călătorii & Escapade','السفر والوجهات',
   'Where to go and how to arrive — the Mediterranean read through a Cypriot lens.',
   'illustrated', array['travel','hospitality','yachting'], true),
 ('table-desk','table',
   'The Table','Το Τραπέζι','Masa','المائدة',
   'Gastronomy & Wine','Γαστρονομία & Οίνος','Gastronomie & Vin','فن الطهي والنبيذ',
   'Restaurants, vineyards and the Cypriot table — commandaria to the new island kitchen.',
   'illustrated', array['gastronomy','wine','restaurants'], true)
on conflict (slug) do nothing;

-- ── Rate card (EUR) ──────────────────────────────────────────────────────────
insert into public.ad_pricing (slot, label_en, label_el, label_ro, label_ar, format, weekly_eur, monthly_eur, yearly_eur) values
 ('leaderboard-homepage','Homepage Leaderboard','Κεντρικό Banner','Banner Principal','بانر الصفحة الرئيسية','970×250', 900, 3000, 30000),
 ('sidebar-homepage','Homepage Sidebar','Πλαϊνό Banner','Banner Lateral','بانر جانبي','300×600', 600, 2000, 20000),
 ('in-article','In-Article','Εντός Άρθρου','În Articol','داخل المقال','728×90', 450, 1500, 15000),
 ('newsletter-banner','Newsletter Banner','Banner Newsletter','Banner Newsletter','بانر النشرة','600×200', 500, 1800, 18000),
 ('sponsored-article','Sponsored Feature','Χορηγούμενο Άρθρο','Articol Sponsorizat','مقال برعاية','editorial', 1500, 5000, 50000)
on conflict (slot) do update set
  label_en=excluded.label_en, label_el=excluded.label_el, label_ro=excluded.label_ro, label_ar=excluded.label_ar,
  format=excluded.format, weekly_eur=excluded.weekly_eur, monthly_eur=excluded.monthly_eur, yearly_eur=excluded.yearly_eur,
  updated_at=now();

-- ── Automation switchboard (single row) ──────────────────────────────────────
insert into public.automation_settings (id, scraper_enabled, processor_enabled, auto_publish)
values (1, false, false, false)
on conflict (id) do nothing;

-- ── Site settings ────────────────────────────────────────────────────────────
insert into public.site_settings (key, value) values
 ('brand', jsonb_build_object(
    'name','Cyprus Lifestyle',
    'tagline','The island, in full colour',
    'palette', jsonb_build_object('obsidian','#0B0E11','alabaster','#F4EFE6','paper','#F6F1E7',
                                  'ink','#16181C','copper','#B0703A','gold','#C9A24C',
                                  'champagne','#E4D2AC','aegean','#123A4A'))),
 ('locales', jsonb_build_object('list', jsonb_build_array('en','el','ro','ar'),
                                'default','en',
                                'rtl', jsonb_build_array('ar'),
                                'labels', jsonb_build_object('en','English','el','Ελληνικά','ro','Română','ar','العربية'))),
 ('timezone', to_jsonb('Europe/Nicosia'::text)),
 ('currency',  to_jsonb('EUR'::text)),
 ('districts', jsonb_build_array('nicosia','limassol','larnaca','famagusta','paphos','kyrenia')),
 ('categories', jsonb_build_array('cyprus','business','property','culture','escapes','table','world')),
 ('social', jsonb_build_object('instagram','','facebook','','x','','linkedin','','youtube',''))
on conflict (key) do update set value = excluded.value, updated_at = now();

-- ── Curated RSS / feed sources ───────────────────────────────────────────────
create unique index if not exists rss_sources_url_key on public.rss_sources(url);

insert into public.rss_sources (name, url, category, source_language, region, tier, is_active) values
-- A · High-end lifestyle & luxury (international, EN)
('Robb Report',                 'https://robbreport.com/feed/',                                  'lifestyle', 'en', 'international', 'luxury', true),
('Architectural Digest',        'https://www.architecturaldigest.com/feed/rss',                  'property',  'en', 'international', 'luxury', true),
('Condé Nast Traveler (US)',    'https://www.cntraveler.com/feed/rss',                           'escapes',   'en', 'international', 'luxury', true),
('Condé Nast Traveller (UK)',   'https://www.cntraveller.com/feed/rss',                          'escapes',   'en', 'international', 'luxury', true),
('Wallpaper*',                  'https://www.wallpaper.com/feed',                                'culture',   'en', 'international', 'luxury', true),
('Vogue',                       'https://www.vogue.com/feed/rss',                                'culture',   'en', 'international', 'luxury', true),
('Harper''s Bazaar',            'https://www.harpersbazaar.com/rss/all.xml/',                    'culture',   'en', 'international', 'luxury', true),
('Tatler',                      'https://www.tatler.com/feed/rss',                               'culture',   'en', 'international', 'luxury', true),
('Town & Country',              'https://www.townandcountrymag.com/rss/all.xml/',                'culture',   'en', 'international', 'luxury', true),
('Elle Decor',                  'https://www.elledecor.com/rss/all.xml/',                        'property',  'en', 'international', 'luxury', true),
('Luxury London',               'https://luxurylondon.co.uk/feed/',                              'lifestyle', 'en', 'international', 'luxury', true),
('The Guardian — Life & Style', 'https://www.theguardian.com/lifeandstyle/rss',                  'lifestyle', 'en', 'international', 'luxury', true),
('The Guardian — Travel',       'https://www.theguardian.com/travel/rss',                        'escapes',   'en', 'international', 'luxury', true),
('The Guardian — Art & Design', 'https://www.theguardian.com/artanddesign/rss',                  'culture',   'en', 'international', 'luxury', true),
('The Guardian — Food',         'https://www.theguardian.com/food/rss',                          'table',     'en', 'international', 'luxury', true),
('NYT — Travel',                'https://rss.nytimes.com/services/xml/rss/nyt/Travel.xml',        'escapes',   'en', 'international', 'luxury', true),
('NYT — Real Estate',           'https://rss.nytimes.com/services/xml/rss/nyt/RealEstate.xml',    'property',  'en', 'international', 'luxury', true),
('NYT — Arts',                  'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml',          'culture',   'en', 'international', 'luxury', true),
-- B · Cyprus (English)
('Cyprus Mail',                 'https://cyprus-mail.com/feed/',                                 'cyprus',    'en', 'cyprus',        'news',    true),
('in-cyprus (Philenews EN)',    'https://in-cyprus.philenews.com/feed/',                         'cyprus',    'en', 'cyprus',        'news',    true),
('Financial Mirror',            'https://www.financialmirror.com/feed/',                         'business',  'en', 'cyprus',        'business',true),
('Cyprus Business News',        'https://cbn.com.cy/feed/',                                      'business',  'en', 'cyprus',        'business',true),
('Cyprus Property News',        'https://www.news.cyprus-property-buyers.com/feed',              'property',  'en', 'cyprus',        'business',true),
-- C · Cyprus (Greek)
('Philenews',                   'https://www.philenews.com/feed/',                               'cyprus',    'el', 'cyprus',        'news',    true),
('Politis',                     'https://politis.com.cy/feed/',                                  'cyprus',    'el', 'cyprus',        'news',    true),
('Sigmalive',                   'https://www.sigmalive.com/rss/news',                            'cyprus',    'el', 'cyprus',        'news',    true),
('Reporter',                    'https://www.reporter.com.cy/feed/',                             'business',  'el', 'cyprus',        'business',true),
('StockWatch',                  'https://www.stockwatch.com.cy/en/rss',                          'business',  'el', 'cyprus',        'business',true),
-- D · Greece (context for the Greek edition)
('eKathimerini (EN)',           'https://www.ekathimerini.com/feed/',                            'world',     'en', 'greece',        'news',    true),
('Kathimerini (GR)',            'https://www.kathimerini.gr/feed/',                              'world',     'el', 'greece',        'news',    true),
('Greece Is',                   'https://www.greece-is.com/feed/',                               'escapes',   'en', 'greece',        'luxury',  true),
-- E · International news / business
('BBC — World',                 'https://feeds.bbci.co.uk/news/world/rss.xml',                   'world',     'en', 'international', 'news',    true),
('BBC — Business',              'https://feeds.bbci.co.uk/news/business/rss.xml',                'business',  'en', 'international', 'business',true),
('The Guardian — World',        'https://www.theguardian.com/world/rss',                         'world',     'en', 'international', 'news',    true),
('NYT — World',                 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',         'world',     'en', 'international', 'news',    true),
('FT — Home',                   'https://www.ft.com/rss/home',                                   'business',  'en', 'international', 'business',true),
-- F · Gulf & MENA (Arabic edition + Gulf audience)
('Al Jazeera (EN)',             'https://www.aljazeera.com/xml/rss/all.xml',                     'world',     'en', 'gulf',          'news',    true),
('Al Arabiya (EN)',             'https://english.alarabiya.net/.mrss/en.xml',                    'world',     'en', 'gulf',          'news',    true),
('Al Arabiya (AR)',             'https://www.alarabiya.net/.mrss/ar.xml',                        'world',     'ar', 'gulf',          'news',    true),
('Arab News (EN)',              'https://www.arabnews.com/rss.xml',                              'world',     'en', 'gulf',          'news',    true),
('Gulf News (EN)',              'https://gulfnews.com/rss',                                      'world',     'en', 'gulf',          'news',    true),
('Asharq Al-Awsat (AR)',        'https://aawsat.com/feed',                                       'world',     'ar', 'gulf',          'news',    true)
on conflict (url) do nothing;
