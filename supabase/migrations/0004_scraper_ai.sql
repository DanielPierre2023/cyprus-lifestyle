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
