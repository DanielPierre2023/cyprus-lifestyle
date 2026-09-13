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
