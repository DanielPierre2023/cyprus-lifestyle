-- =============================================================================
-- cyprus_lifestyle - LIVE schema baseline (public schema)
-- Generated: 2026-10-05
-- Source: Supabase project ref htwaivnvabvpqkffllnc (read-only catalog queries)
-- Scope: SCHEMA ONLY, no data. Excludes the auth/storage/realtime/vault/cron schemas, except the
--        sign-up trigger on auth.users and the storage buckets + policies, added at the end (guarded).
-- State: production as inspected on 2026-10-05 BEFORE migration 20261005120000 (hotfix) — which is why
--        its function permissions and definer views still show the old, exposed state. Apply every
--        migration newer than supabase/baseline/BASELINE_VERSION after this file.
-- Idempotent: safe to re-run (create ... if not exists / create or replace /
--             drop ... if exists + create / guarded DO blocks).
-- Order: extensions, types, tables, foreign keys, functions, indexes, views,
--        triggers, row level security, policies, grants.
-- Run in the SQL editor of a FRESH Supabase project as the postgres role.
-- =============================================================================

set check_function_bodies = off;

-- ===== Extensions (name | schema | live version) =====
create schema if not exists extensions;
create extension if not exists "pg_stat_statements" with schema extensions;  -- 1.11
create extension if not exists "uuid-ossp" with schema extensions;           -- 1.1
create extension if not exists pgcrypto with schema extensions;              -- 1.3
create extension if not exists supabase_vault with schema vault;             -- 0.3.1 (preinstalled on Supabase; no-op there)
create extension if not exists pg_cron with schema pg_catalog;               -- 1.6.4
create extension if not exists pg_net with schema public;                    -- 0.20.4 (live: schema public)
create extension if not exists pg_trgm with schema public;                   -- 1.6
create extension if not exists vector with schema public;                    -- 0.8.2
create extension if not exists plpgsql with schema pg_catalog;               -- 1.0

-- ===== Types =====
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace where n.nspname = 'public' and t.typname = 'app_role') then
    create type public.app_role as enum ('admin', 'moderator', 'user');
  end if;
end $$;

-- ===== Sequences =====
-- Both public sequences (ai_spend_log_id_seq, activities_id_seq) are owned by identity columns
-- and are therefore created implicitly by the tables below.

-- ===== Tables (85) =====
create table if not exists public.activities (
  id bigint generated always as identity not null,
  provider text default 'getyourguide'::text not null,
  external_id text not null,
  slug text,
  title text not null,
  summary text,
  kind text not null,
  tags text[] default '{}'::text[] not null,
  district text,
  town text,
  landmark text,
  lat double precision,
  lng double precision,
  geo_precision text,
  duration_min integer,
  duration_label text,
  price_band text,
  price_basis text,
  group_max integer,
  booking_url text,
  priority smallint default 0 not null,
  visits_north boolean default false not null,
  north_site text,
  status text default 'active'::text not null,
  hidden_reason text,
  source text,
  curated_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint activities_pkey PRIMARY KEY (id),
  constraint activities_provider_external_id_key UNIQUE (provider, external_id),
  constraint activities_geo_precision_check CHECK (((geo_precision IS NULL) OR (geo_precision = ANY (ARRAY['landmark'::text, 'town'::text])))),
  constraint activities_price_band_check CHECK (((price_band IS NULL) OR (price_band = ANY (ARRAY['€'::text, '€€'::text, '€€€'::text, '€€€€'::text])))),
  constraint activities_price_basis_check CHECK (((price_basis IS NULL) OR (price_basis = ANY (ARRAY['person'::text, 'group'::text])))),
  constraint activities_priority_check CHECK (((priority >= 0) AND (priority <= 3))),
  constraint activities_status_check CHECK ((status = ANY (ARRAY['active'::text, 'hidden'::text])))
);

create table if not exists public.ad_inquiries (
  id uuid default gen_random_uuid() not null,
  recipient_name text not null,
  recipient_email text not null,
  language text default 'en'::text not null,
  slots_offered text,
  sent_at timestamp with time zone default now(),
  constraint ad_inquiries_pkey PRIMARY KEY (id)
);

create table if not exists public.ad_leads (
  id uuid default gen_random_uuid() not null,
  name text not null,
  email text not null,
  company text,
  slot text,
  label text,
  message text,
  locale text default 'en'::text not null,
  status text default 'new'::text not null,
  org_id uuid,
  created_at timestamp with time zone default now() not null,
  constraint ad_leads_pkey PRIMARY KEY (id)
);

create table if not exists public.ad_orders (
  id uuid default gen_random_uuid() not null,
  slot text,
  label text,
  mode text,
  amount numeric,
  currency text default 'eur'::text not null,
  customer_name text,
  customer_email text,
  company text,
  locale text default 'en'::text not null,
  status text default 'pending'::text not null,
  stripe_session_id text,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_payment_intent text,
  org_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  constraint ad_orders_pkey PRIMARY KEY (id),
  constraint ad_orders_stripe_session_id_key UNIQUE (stripe_session_id)
);

create table if not exists public.ad_pricing (
  id uuid default gen_random_uuid() not null,
  slot text not null,
  label_en text,
  label_el text,
  label_ro text,
  label_ar text,
  format text,
  weekly_eur numeric,
  monthly_eur numeric,
  yearly_eur numeric,
  updated_at timestamp with time zone default now() not null,
  unit text,
  price_from numeric,
  price_to numeric,
  kind text default 'alacarte'::text,
  blurb_en text,
  sort integer default 100,
  label_de text,
  label_pl text,
  label_ru text,
  self_serve boolean default false not null,
  list_price numeric,
  constraint ad_pricing_pkey PRIMARY KEY (id),
  constraint ad_pricing_slot_key UNIQUE (slot)
);

create table if not exists public.ai_spend_log (
  id bigint generated by default as identity not null,
  occurred_at timestamp with time zone default now() not null,
  job_id uuid,
  function_name text,
  provider text,
  model text,
  units numeric,
  unit_kind text,
  usd numeric,
  caller text,
  meta jsonb default '{}'::jsonb not null,
  constraint ai_spend_log_pkey PRIMARY KEY (id)
);

create table if not exists public.atlas_descriptions (
  slug text,
  description text,
  image text
);

create table if not exists public.atlas_import (
  slug text,
  name text,
  district text,
  type text,
  category_group text,
  subtype text,
  address text,
  phone text,
  email text,
  website text,
  source_url text
);

create table if not exists public.attribution_clicks (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  slug text not null,
  source text default 'concierge'::text not null,
  cid text,
  locale text,
  label text,
  constraint attribution_clicks_pkey PRIMARY KEY (id)
);

create table if not exists public.authors (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  editor_key text,
  name_en text,
  name_el text,
  name_ro text,
  name_ar text,
  title_en text,
  title_el text,
  title_ro text,
  title_ar text,
  bio_en text,
  bio_el text,
  bio_ro text,
  bio_ar text,
  avatar_url text,
  avatar_style text default 'illustrated'::text,
  specialties text[] default '{}'::text[],
  social_x text,
  email text,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  name_de text,
  name_pl text,
  name_ru text,
  title_de text,
  title_pl text,
  title_ru text,
  bio_de text,
  bio_pl text,
  bio_ru text,
  constraint authors_pkey PRIMARY KEY (id),
  constraint authors_editor_key_key UNIQUE (editor_key),
  constraint authors_slug_key UNIQUE (slug)
);

create table if not exists public.automation_settings (
  id integer default 1 not null,
  scraper_enabled boolean default false not null,
  processor_enabled boolean default false not null,
  auto_publish boolean default false not null,
  updated_at timestamp with time zone default now() not null,
  updated_by uuid,
  mail_autoack_enabled boolean default false not null,
  developments_enabled boolean default false not null,
  developments_autopublish boolean default false not null,
  regulation_watch_enabled boolean default false not null,
  events_watch_enabled boolean default false not null,
  mail_autoanswer_enabled boolean default false not null,
  constraint automation_settings_pkey PRIMARY KEY (id)
);

create table if not exists public.blog_comments (
  id uuid default gen_random_uuid() not null,
  post_id uuid not null,
  author_name text not null,
  author_email text,
  content text not null,
  status text default 'pending'::text not null,
  ai_reply text,
  created_at timestamp with time zone default now() not null,
  constraint blog_comments_pkey PRIMARY KEY (id)
);

create table if not exists public.blog_posts (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  title_en text,
  title_el text,
  title_ro text,
  title_ar text,
  content_en text,
  content_el text,
  content_ro text,
  content_ar text,
  excerpt_en text,
  excerpt_el text,
  excerpt_ro text,
  excerpt_ar text,
  summary_en text,
  summary_el text,
  summary_ro text,
  summary_ar text,
  seo_title_en text,
  seo_title_el text,
  seo_title_ro text,
  seo_title_ar text,
  seo_description_en text,
  seo_description_el text,
  seo_description_ro text,
  seo_description_ar text,
  tags text[] default '{}'::text[],
  tags_en text[] default '{}'::text[],
  tags_el text[] default '{}'::text[],
  tags_ro text[] default '{}'::text[],
  tags_ar text[] default '{}'::text[],
  category text,
  subcategory text,
  county text,
  author_name text,
  author_id uuid,
  ai_editor text,
  cover_image text,
  cover_image_credit text,
  source_url text,
  sources text[] default '{}'::text[],
  scraped_article_id uuid,
  status text default 'draft'::text not null,
  is_breaking boolean default false,
  skip_facebook boolean default false,
  layout_mode text default 'auto'::text,
  reading_time_min integer default 1,
  word_count integer,
  ai_quality_score integer,
  ai_review_reason text,
  social_shares jsonb default '{}'::jsonb,
  content_archive jsonb,
  view_count bigint default 0 not null,
  last_viewed_at timestamp with time zone,
  correction_note text,
  corrected_at timestamp with time zone,
  published_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  search_en tsvector generated always as (to_tsvector('english'::regconfig, ((((COALESCE(title_en, ''::text) || ' '::text) || COALESCE(excerpt_en, ''::text)) || ' '::text) || COALESCE(content_en, ''::text)))) stored,
  search_ro tsvector generated always as (to_tsvector('romanian'::regconfig, ((((COALESCE(title_ro, ''::text) || ' '::text) || COALESCE(excerpt_ro, ''::text)) || ' '::text) || COALESCE(content_ro, ''::text)))) stored,
  search_el tsvector generated always as (to_tsvector('simple'::regconfig, ((((COALESCE(title_el, ''::text) || ' '::text) || COALESCE(excerpt_el, ''::text)) || ' '::text) || COALESCE(content_el, ''::text)))) stored,
  search_ar tsvector generated always as (to_tsvector('simple'::regconfig, ((((COALESCE(title_ar, ''::text) || ' '::text) || COALESCE(excerpt_ar, ''::text)) || ' '::text) || COALESCE(content_ar, ''::text)))) stored,
  title_de text,
  title_pl text,
  title_ru text,
  content_de text,
  content_pl text,
  content_ru text,
  excerpt_de text,
  excerpt_pl text,
  excerpt_ru text,
  summary_de text,
  summary_pl text,
  summary_ru text,
  seo_title_de text,
  seo_title_pl text,
  seo_title_ru text,
  seo_description_de text,
  seo_description_pl text,
  seo_description_ru text,
  tags_de text[],
  tags_pl text[],
  tags_ru text[],
  search_de tsvector,
  search_pl tsvector,
  search_ru tsvector,
  sponsored boolean default false not null,
  sponsor_name text,
  sponsor_url text,
  sponsor_org_id uuid,
  search_document tsvector generated always as (to_tsvector('simple'::regconfig, ((((((((((((((((((((((((((((((((((((((((((((((((((((((COALESCE(title_en, ''::text) || ' '::text) || COALESCE(title_el, ''::text)) || ' '::text) || COALESCE(title_ro, ''::text)) || ' '::text) || COALESCE(title_ar, ''::text)) || ' '::text) || COALESCE(title_de, ''::text)) || ' '::text) || COALESCE(title_pl, ''::text)) || ' '::text) || COALESCE(title_ru, ''::text)) || ' '::text) || COALESCE(excerpt_en, ''::text)) || ' '::text) || COALESCE(excerpt_el, ''::text)) || ' '::text) || COALESCE(excerpt_ro, ''::text)) || ' '::text) || COALESCE(excerpt_ar, ''::text)) || ' '::text) || COALESCE(excerpt_de, ''::text)) || ' '::text) || COALESCE(excerpt_pl, ''::text)) || ' '::text) || COALESCE(excerpt_ru, ''::text)) || ' '::text) || COALESCE(summary_en, ''::text)) || ' '::text) || COALESCE(summary_el, ''::text)) || ' '::text) || COALESCE(summary_ro, ''::text)) || ' '::text) || COALESCE(summary_ar, ''::text)) || ' '::text) || COALESCE(summary_de, ''::text)) || ' '::text) || COALESCE(summary_pl, ''::text)) || ' '::text) || COALESCE(summary_ru, ''::text)) || ' '::text) || COALESCE(content_en, ''::text)) || ' '::text) || COALESCE(content_el, ''::text)) || ' '::text) || COALESCE(content_ro, ''::text)) || ' '::text) || COALESCE(content_ar, ''::text)) || ' '::text) || COALESCE(content_de, ''::text)) || ' '::text) || COALESCE(content_pl, ''::text)) || ' '::text) || COALESCE(content_ru, ''::text)))) stored,
  events_mined_at timestamp with time zone,
  kind text,
  franchise text,
  pipeline_status text,
  subject_listing_id uuid,
  dossier jsonb,
  questions jsonb,
  angle text,
  source_lang text,
  scheduled_at timestamp with time zone,
  faq_en jsonb default '[]'::jsonb not null,
  faq_el jsonb default '[]'::jsonb not null,
  faq_ro jsonb default '[]'::jsonb not null,
  faq_ar jsonb default '[]'::jsonb not null,
  faq_de jsonb default '[]'::jsonb not null,
  faq_pl jsonb default '[]'::jsonb not null,
  faq_ru jsonb default '[]'::jsonb not null,
  review_rating numeric,
  constraint blog_posts_pkey PRIMARY KEY (id),
  constraint blog_posts_slug_key UNIQUE (slug),
  constraint blog_posts_franchise_check CHECK (((franchise IS NULL) OR (franchise = ANY (ARRAY['tastemakers'::text, 'behind-the-business'::text, 'five-min'::text, 'maker'::text, 'at-the-table'::text, 'concierge-meets'::text, 'power-list'::text])))),
  constraint blog_posts_kind_check CHECK (((kind IS NULL) OR (kind = ANY (ARRAY['feature'::text, 'interview'::text, 'profile'::text, 'note'::text, 'edit'::text, 'picks'::text])))),
  constraint blog_posts_layout_mode_check CHECK ((layout_mode = ANY (ARRAY['auto'::text, 'rich'::text]))),
  constraint blog_posts_pipeline_status_check CHECK (((pipeline_status IS NULL) OR (pipeline_status = ANY (ARRAY['commissioned'::text, 'dossier'::text, 'drafting'::text, 'editing'::text, 'translating'::text, 'scheduled'::text, 'published'::text])))),
  constraint blog_posts_review_rating_range CHECK (((review_rating IS NULL) OR ((review_rating >= (1)::numeric) AND (review_rating <= (5)::numeric))))
);

create table if not exists public.column_jobs (
  id uuid default gen_random_uuid() not null,
  status text default 'queued'::text not null,
  phase integer default 0 not null,
  article_type text not null,
  editor_key text not null,
  category text,
  county text,
  draft_lang text default 'en'::text not null,
  word_count integer default 1200 not null,
  input jsonb not null,
  draft text,
  draft_title text,
  passes integer default 0 not null,
  max_passes integer default 3 not null,
  result jsonb,
  attempts integer default 0 not null,
  error text,
  est_cost numeric default 0 not null,
  claimed_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint column_jobs_pkey PRIMARY KEY (id),
  constraint column_jobs_draft_lang_check CHECK ((draft_lang = ANY (ARRAY['en'::text, 'el'::text, 'ro'::text, 'ar'::text])))
);

create table if not exists public.comments (
  id uuid default gen_random_uuid() not null,
  post_id uuid not null,
  author_name text not null,
  content text not null,
  is_approved boolean default false not null,
  created_at timestamp with time zone default now() not null,
  constraint comments_pkey PRIMARY KEY (id)
);

create table if not exists public.concierge_coverage (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  run_id text not null,
  topic text not null,
  locale text,
  question text,
  dir_count integer default 0 not null,
  kb_count integer default 0 not null,
  article_count integer default 0 not null,
  category text,
  district text,
  category_hit boolean,
  verdict text,
  constraint concierge_coverage_pkey PRIMARY KEY (id)
);

create table if not exists public.concierge_evals (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  run_id text not null,
  locale text,
  intent text,
  question text,
  answer text,
  grounded_score integer,
  language_score integer,
  helpful_score integer,
  overall numeric(4,2),
  verdict text,
  notes text,
  model text,
  constraint concierge_evals_pkey PRIMARY KEY (id)
);

create table if not exists public.concierge_events (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  cid text,
  locale text,
  channel text default 'web'::text not null,
  question text,
  answer_chars integer,
  picks integer default 0 not null,
  kb integer default 0 not null,
  near boolean default false not null,
  coverage text default 'full'::text not null,
  reason text,
  recommended text[] default '{}'::text[],
  latency_ms integer,
  meta jsonb,
  constraint concierge_events_pkey PRIMARY KEY (id)
);

create table if not exists public.concierge_members (
  id uuid default gen_random_uuid() not null,
  cid text,
  email text,
  tier text default 'concierge'::text not null,
  status text default 'active'::text not null,
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_session_id text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  profile jsonb default '{}'::jsonb not null,
  profile_updated_at timestamp with time zone,
  current_period_end timestamp with time zone,
  cancel_at_period_end boolean default false,
  constraint concierge_members_pkey PRIMARY KEY (id)
);

create table if not exists public.concierge_memory (
  cid text not null,
  profile jsonb default '{}'::jsonb not null,
  turns integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint concierge_memory_pkey PRIMARY KEY (cid)
);

create table if not exists public.concierge_requests (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  locale text default 'en'::text not null,
  query text not null,
  answer text,
  picks jsonb,
  name text,
  email text,
  note text,
  status text default 'new'::text not null,
  org_id uuid,
  phone text,
  category text,
  district text,
  handled_by text,
  handled_at timestamp with time zone,
  tier text default 'standard'::text not null,
  constraint concierge_requests_pkey PRIMARY KEY (id),
  constraint concierge_requests_tier_check CHECK ((tier = ANY (ARRAY['premium'::text, 'standard'::text])))
);

create table if not exists public.concierge_tg_threads (
  chat_id text not null,
  messages jsonb default '[]'::jsonb not null,
  locale text,
  updated_at timestamp with time zone default now(),
  constraint concierge_tg_threads_pkey PRIMARY KEY (chat_id)
);

create table if not exists public.concierge_wa_threads (
  wa_id text not null,
  locale text,
  messages jsonb default '[]'::jsonb not null,
  last_msg_id text,
  turns integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint concierge_wa_threads_pkey PRIMARY KEY (wa_id)
);

create table if not exists public.contact_messages (
  id uuid default gen_random_uuid() not null,
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text default 'unread'::text not null,
  admin_reply text,
  created_at timestamp with time zone default now() not null,
  replied_at timestamp with time zone,
  request_class text,
  phone text,
  district text,
  locale text,
  constraint contact_messages_pkey PRIMARY KEY (id)
);

create table if not exists public.contacts (
  id uuid default gen_random_uuid() not null,
  email text not null,
  name text,
  source text default 'manual'::text,
  notes text,
  language text default 'en'::text,
  tags text[] default '{}'::text[],
  newsletter_subscribed boolean default false,
  phone text,
  company text,
  contact_type text default 'general'::text,
  last_email_sent_at timestamp with time zone,
  last_email_type text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint contacts_pkey PRIMARY KEY (id),
  constraint contacts_email_key UNIQUE (email)
);

create table if not exists public.county_quotas (
  county text not null,
  daily_limit integer default 3 not null,
  priority integer default 1 not null,
  active boolean default true not null,
  created_at timestamp with time zone default now(),
  constraint county_quotas_pkey PRIMARY KEY (county)
);

create table if not exists public.crm_activities (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  deal_id uuid,
  contact_id uuid,
  type text not null,
  sequence_id text,
  subject text,
  body text,
  opened_at timestamp with time zone,
  clicked_at timestamp with time zone,
  replied_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint crm_activities_pkey PRIMARY KEY (id)
);

create table if not exists public.crm_contacts (
  id uuid default gen_random_uuid() not null,
  org_id uuid not null,
  name text,
  role text,
  email text,
  phone text,
  is_role_address boolean default false not null,
  consent_status text default 'none'::text not null,
  opt_out_at timestamp with time zone,
  source_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  unsub_token uuid default gen_random_uuid() not null,
  constraint crm_contacts_pkey PRIMARY KEY (id)
);

create table if not exists public.crm_deals (
  id uuid default gen_random_uuid() not null,
  org_id uuid not null,
  stage text default 'prospect'::text not null,
  product text,
  value_eur numeric,
  owner text,
  probability integer default 0,
  next_action_at timestamp with time zone,
  lost_reason text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint crm_deals_pkey PRIMARY KEY (id)
);

create table if not exists public.crm_enrollments (
  id uuid default gen_random_uuid() not null,
  org_id uuid not null,
  sequence text default 'default'::text not null,
  step integer default 0 not null,
  status text default 'active'::text not null,
  next_send_at timestamp with time zone default now() not null,
  last_send_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint crm_enrollments_pkey PRIMARY KEY (id)
);

create table if not exists public.crm_hooks (
  category text not null,
  hook text not null,
  updated_at timestamp with time zone default now() not null,
  constraint crm_hooks_pkey PRIMARY KEY (category)
);

create table if not exists public.crm_orgs (
  id uuid default gen_random_uuid() not null,
  name text not null,
  category text,
  tier text default 'C'::text not null,
  district text,
  website text,
  email text,
  phone text,
  directory_listing_id uuid,
  status text default 'prospect'::text not null,
  notes text,
  source_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  outreach_locale text,
  constraint crm_orgs_pkey PRIMARY KEY (id),
  constraint crm_orgs_tier_check CHECK ((tier = ANY (ARRAY['A'::text, 'B'::text, 'C'::text])))
);

create table if not exists public.crm_settings (
  id integer default 1 not null,
  sending_enabled boolean default false not null,
  from_name text,
  from_email text,
  reply_to text,
  daily_cap integer default 40 not null,
  gap_days jsonb default '[4, 4, 6]'::jsonb not null,
  updated_at timestamp with time zone default now() not null,
  constraint crm_settings_pkey PRIMARY KEY (id),
  constraint crm_settings_singleton CHECK ((id = 1))
);

create table if not exists public.crm_suppression (
  id uuid default gen_random_uuid() not null,
  email text,
  domain text,
  reason text default 'opt-out'::text not null,
  created_at timestamp with time zone default now() not null,
  constraint crm_suppression_pkey PRIMARY KEY (id)
);

create table if not exists public.crm_templates (
  id uuid default gen_random_uuid() not null,
  step integer not null,
  name text not null,
  subject text not null,
  body text not null,
  active boolean default true not null,
  updated_at timestamp with time zone default now() not null,
  locale text default 'en'::text not null,
  constraint crm_templates_pkey PRIMARY KEY (id)
);

create table if not exists public.data_processing_register (
  id text not null,
  activity text not null,
  purpose text not null,
  lawful_basis text not null,
  data_categories text not null,
  subjects text not null,
  recipients text not null,
  retention text not null,
  updated_at timestamp with time zone default now() not null,
  constraint data_processing_register_pkey PRIMARY KEY (id)
);

create table if not exists public.directory_claims (
  id uuid default gen_random_uuid() not null,
  listing_slug text not null,
  claimant_name text,
  claimant_email text,
  claimant_phone text,
  method text not null,
  token_hash text,
  code_hash text,
  status text default 'pending'::text not null,
  attempts integer default 0 not null,
  expires_at timestamp with time zone,
  verified_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint directory_claims_pkey PRIMARY KEY (id)
);

create table if not exists public.directory_embeddings (
  slug text not null,
  embedding vector(1536),
  content_hash text,
  updated_at timestamp with time zone default now() not null,
  constraint directory_embeddings_pkey PRIMARY KEY (slug)
);

create table if not exists public.directory_leads (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  listing_slug text not null,
  listing_type text,
  listing_name text,
  name text not null,
  email text not null,
  message text,
  locale text default 'en'::text not null,
  status text default 'new'::text not null,
  org_id uuid,
  source text default 'directory'::text,
  constraint directory_leads_pkey PRIMARY KEY (id)
);

create table if not exists public.directory_listing_edits (
  id uuid default gen_random_uuid() not null,
  listing_slug text not null,
  field text not null,
  proposed_value jsonb,
  status text default 'pending'::text not null,
  submitted_by text,
  created_at timestamp with time zone default now() not null,
  reviewed_at timestamp with time zone,
  constraint directory_listing_edits_pkey PRIMARY KEY (id)
);

create table if not exists public.directory_listings (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  type text not null,
  district text,
  name_en text,
  name_el text,
  name_ro text,
  name_ar text,
  summary_en text,
  summary_el text,
  summary_ro text,
  summary_ar text,
  address text,
  lat double precision,
  lng double precision,
  price_band text,
  url text,
  phone text,
  image text,
  tags text[] default '{}'::text[],
  featured boolean default false not null,
  status text default 'published'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  email text,
  contact_person text,
  contact_role text,
  source_url text,
  coords_precision text default 'exact'::text,
  notes text,
  osm_id text,
  osm_type text,
  name_de text,
  name_pl text,
  name_ru text,
  summary_de text,
  summary_pl text,
  summary_ru text,
  verified boolean default false not null,
  image_credit text,
  enriched_at timestamp with time zone,
  enrich_status text,
  north boolean default false,
  rating real,
  rating_count integer,
  category_group text,
  subtype text,
  luxury boolean default false not null,
  price_from integer,
  price_to integer,
  price_currency text,
  dev_status text,
  bedrooms text,
  completion text,
  developer_slug text,
  fetched_at timestamp with time zone,
  partner_pitch text,
  partner_pitch_at timestamp with time zone,
  canonical_category text,
  canonical_subtype text,
  normalized_at timestamp with time zone,
  commercial_tier text,
  commercial_rank smallint generated always as (
CASE commercial_tier
    WHEN 'partner'::text THEN 3
    WHEN 'featured'::text THEN 2
    WHEN 'listed'::text THEN 1
    ELSE 0
END) stored,
  source_description text,
  source_image text,
  reviews jsonb,
  published_at timestamp with time zone,
  hours jsonb,
  gallery jsonb,
  amenities text[],
  socials jsonb,
  owned_photos jsonb,
  provenance text default 'reference'::text,
  verified_at timestamp with time zone,
  claimed_at timestamp with time zone,
  claim_contact text,
  text_status text,
  text_generated_at timestamp with time zone,
  constraint directory_listings_pkey PRIMARY KEY (id),
  constraint directory_listings_slug_key UNIQUE (slug),
  constraint directory_listings_commercial_tier_check CHECK (((commercial_tier IS NULL) OR (commercial_tier = ANY (ARRAY['partner'::text, 'featured'::text, 'listed'::text])))),
  constraint directory_listings_type_check CHECK ((type = ANY (ARRAY['restaurant'::text, 'winery'::text, 'development'::text, 'hotel'::text, 'beach'::text, 'vendor'::text])))
);

create table if not exists public.directory_listings_coords_backup_20260928 (
  id uuid,
  lat double precision,
  lng double precision,
  coords_precision text,
  backed_up_at timestamp with time zone
);

create table if not exists public.directory_owner_tokens (
  id uuid default gen_random_uuid() not null,
  listing_slug text not null,
  kind text default 'link'::text not null,
  token_hash text not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint directory_owner_tokens_pkey PRIMARY KEY (id)
);

create table if not exists public.directory_reviews (
  id uuid default gen_random_uuid() not null,
  listing_slug text not null,
  author_name text,
  author_contact text,
  rating integer not null,
  body text,
  verified_visit boolean default false not null,
  owner_reply text,
  owner_reply_at timestamp with time zone,
  status text default 'pending'::text not null,
  locale text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint directory_reviews_pkey PRIMARY KEY (id),
  constraint directory_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);

create table if not exists public.dsar_erasure_log (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  request_id uuid,
  email_sha256 text not null,
  email_masked text,
  actor text,
  counts jsonb default '{}'::jsonb not null,
  total integer default 0 not null,
  constraint dsar_erasure_log_pkey PRIMARY KEY (id)
);

create table if not exists public.dsar_requests (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  kind text default 'access'::text not null,
  name text,
  email text not null,
  details text,
  locale text,
  status text default 'new'::text not null,
  due_at timestamp with time zone default (now() + '30 days'::interval) not null,
  handled_by text,
  handled_at timestamp with time zone,
  constraint dsar_requests_pkey PRIMARY KEY (id)
);

create table if not exists public.editor_drafts (
  id uuid default gen_random_uuid() not null,
  author_id uuid not null,
  editor_key text not null,
  title text default ''::text not null,
  content text default ''::text not null,
  category text default 'opinion'::text not null,
  county text,
  language text default 'en'::text,
  image_url text,
  image_credit text,
  status text default 'draft'::text not null,
  proof_result jsonb,
  translate boolean default true not null,
  blog_post_id uuid,
  word_count integer default 0,
  layout_mode text default 'auto'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint editor_drafts_pkey PRIMARY KEY (id),
  constraint editor_drafts_language_check CHECK ((language = ANY (ARRAY['en'::text, 'el'::text, 'ro'::text, 'ar'::text]))),
  constraint editor_drafts_layout_mode_check CHECK ((layout_mode = ANY (ARRAY['auto'::text, 'rich'::text])))
);

create table if not exists public.editor_tokens (
  id uuid default gen_random_uuid() not null,
  token uuid default gen_random_uuid() not null,
  author_id uuid not null,
  editor_key text not null,
  label text default ''::text not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  expires_at timestamp with time zone default (now() + '30 days'::interval),
  last_used_at timestamp with time zone,
  constraint editor_tokens_pkey PRIMARY KEY (id),
  constraint editor_tokens_token_key UNIQUE (token)
);

create table if not exists public.editorial_field_notes (
  id uuid default gen_random_uuid() not null,
  idea_id uuid,
  kind text default 'visit'::text not null,
  subject_listing_id uuid,
  subject_name text,
  place text,
  visited_on date,
  rating integer,
  notes text not null,
  quotes text,
  media text[] default '{}'::text[] not null,
  author text,
  status text default 'captured'::text not null,
  blog_post_id uuid,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint editorial_field_notes_pkey PRIMARY KEY (id),
  constraint editorial_field_notes_kind_check CHECK ((kind = ANY (ARRAY['visit'::text, 'interview'::text, 'story'::text]))),
  constraint editorial_field_notes_rating_check CHECK (((rating IS NULL) OR ((rating >= 1) AND (rating <= 5)))),
  constraint editorial_field_notes_status_check CHECK ((status = ANY (ARRAY['captured'::text, 'drafted'::text, 'published'::text])))
);

create table if not exists public.editorial_ideas (
  id uuid default gen_random_uuid() not null,
  section_key text,
  subcategory_key text,
  working_title text not null,
  angle text,
  rationale text,
  status text default 'suggested'::text not null,
  source text default 'ai-planner'::text not null,
  priority integer default 0 not null,
  target_month date,
  subject_listing_id uuid,
  research_brief jsonb,
  signals jsonb,
  dedup_hash text,
  embedding vector(1536),
  assigned_to text,
  blog_post_id uuid,
  rejected_reason text,
  created_by text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint editorial_ideas_pkey PRIMARY KEY (id),
  constraint editorial_ideas_source_check CHECK ((source = ANY (ARRAY['ai-planner'::text, 'editor'::text, 'field-visit'::text, 'interview'::text, 'trend'::text]))),
  constraint editorial_ideas_status_check CHECK ((status = ANY (ARRAY['suggested'::text, 'approved'::text, 'assigned'::text, 'drafting'::text, 'scheduled'::text, 'published'::text, 'rejected'::text])))
);

create table if not exists public.editorial_pieces (
  id uuid default gen_random_uuid() not null,
  kind text not null,
  org_id uuid,
  business_name text,
  category text,
  title text,
  result jsonb default '{}'::jsonb not null,
  status text default 'draft'::text not null,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint editorial_pieces_pkey PRIMARY KEY (id)
);

create table if not exists public.editorial_sections (
  key text not null,
  name text not null,
  description text,
  parent_key text,
  sort integer default 0 not null,
  monthly_target integer default 0 not null,
  franchise_key text,
  dir_groups text[] default '{}'::text[] not null,
  active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint editorial_sections_pkey PRIMARY KEY (key)
);

create table if not exists public.error_log (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  level text default 'error'::text not null,
  source text,
  message text,
  fingerprint text,
  detail jsonb,
  constraint error_log_pkey PRIMARY KEY (id)
);

create table if not exists public.events (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  district text,
  title_en text,
  title_el text,
  title_ro text,
  title_ar text,
  summary_en text,
  summary_el text,
  summary_ro text,
  summary_ar text,
  venue text,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone,
  price text,
  url text,
  image text,
  lat double precision,
  lng double precision,
  tags text[] default '{}'::text[],
  status text default 'published'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  source_url text,
  organizer text,
  organizer_email text,
  coords_precision text default 'exact'::text,
  recurrence text default 'one-off'::text,
  date_confidence text default 'confirmed'::text,
  notes text,
  title_de text,
  title_pl text,
  title_ru text,
  summary_de text,
  summary_pl text,
  summary_ru text,
  featured boolean default false not null,
  image_credit text,
  enriched_at timestamp with time zone,
  enrich_status text,
  source text,
  ingest_key text,
  article_slug text,
  constraint events_pkey PRIMARY KEY (id),
  constraint events_slug_key UNIQUE (slug)
);

create table if not exists public.fulfillment_tasks (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  ad_order_id uuid,
  product_slot text,
  title text not null,
  steps jsonb default '[]'::jsonb not null,
  status text default 'open'::text not null,
  due_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint fulfillment_tasks_pkey PRIMARY KEY (id)
);

create table if not exists public.generation_logs (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  brief_excerpt text,
  article_type text,
  category text,
  word_count_req integer,
  desk1_ok boolean,
  desk1_ms integer,
  desk2a_ok boolean,
  desk2a_ms integer,
  desk2b_en_ok boolean,
  desk2b_el_ok boolean,
  desk2b_ro_ok boolean,
  desk2b_ar_ok boolean,
  desk2b_ms integer,
  el_retries integer default 0,
  ro_retries integer default 0,
  ar_retries integer default 0,
  el_lang_ok boolean,
  ro_lang_ok boolean,
  ar_lang_ok boolean,
  title_regen_en boolean default false,
  title_regen_el boolean default false,
  title_regen_ro boolean default false,
  title_regen_ar boolean default false,
  words_en integer,
  words_el integer,
  words_ro integer,
  words_ar integer,
  total_ms integer,
  est_cost_usd numeric,
  status text,
  error_msg text,
  editor text,
  word_count_effective integer,
  length_capped boolean default false,
  research_enriched boolean default false,
  research_atoms_chars integer default 0,
  en_polished boolean default false,
  en_extended boolean default false,
  en_title_swapped boolean default false,
  en_closer_swapped boolean default false,
  en_humanness integer default 0,
  el_polished boolean default false,
  el_extended boolean default false,
  el_title_swapped boolean default false,
  el_closer_swapped boolean default false,
  el_humanness integer default 0,
  ro_polished boolean default false,
  ro_extended boolean default false,
  ro_title_swapped boolean default false,
  ro_closer_swapped boolean default false,
  ro_humanness integer default 0,
  ar_polished boolean default false,
  ar_extended boolean default false,
  ar_title_swapped boolean default false,
  ar_closer_swapped boolean default false,
  ar_humanness integer default 0,
  error_stage text,
  title_regen_de boolean,
  title_regen_pl boolean,
  title_regen_ru boolean,
  words_de integer,
  words_pl integer,
  words_ru integer,
  constraint generation_logs_pkey PRIMARY KEY (id)
);

create table if not exists public.geocode_cache (
  q text not null,
  lat double precision,
  lng double precision,
  label text,
  provider text,
  created_at timestamp with time zone default now() not null,
  constraint geocode_cache_pkey PRIMARY KEY (q)
);

create table if not exists public.inbound_emails (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  received_at timestamp with time zone,
  message_id text,
  in_reply_to text,
  from_email text not null,
  from_name text,
  to_email text,
  cc text,
  subject text,
  text_body text,
  html_body text,
  headers jsonb,
  attachments jsonb,
  spam_score numeric,
  status text default 'new'::text not null,
  handled_by text,
  handled_at timestamp with time zone,
  suggested_reply text,
  suggested_at timestamp with time zone,
  auto_sent boolean default false not null,
  desk text,
  assignee text,
  priority text default 'normal'::text not null,
  sla_due timestamp with time zone,
  first_response_at timestamp with time zone,
  resolved_at timestamp with time zone,
  thread_key text,
  tags text[] default '{}'::text[] not null,
  constraint inbound_emails_pkey PRIMARY KEY (id)
);

create table if not exists public.job_queue (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  run_after timestamp with time zone default now() not null,
  kind text not null,
  payload jsonb default '{}'::jsonb not null,
  priority integer default 0 not null,
  status text default 'pending'::text not null,
  attempts integer default 0 not null,
  max_attempts integer default 5 not null,
  last_error text,
  locked_at timestamp with time zone,
  locked_by text,
  dedupe_key text,
  constraint job_queue_pkey PRIMARY KEY (id)
);

create table if not exists public.kb_candidates (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  source text default 'mailroom'::text not null,
  source_email_id uuid,
  locale text,
  question text not null,
  answer text not null,
  category text,
  status text default 'pending'::text not null,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  constraint kb_candidates_pkey PRIMARY KEY (id)
);

create table if not exists public.kb_docs (
  id uuid default gen_random_uuid() not null,
  source text not null,
  url text not null,
  lang text,
  category text,
  title text,
  description text,
  body text,
  image text,
  published boolean default false not null,
  content_hash text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint kb_docs_pkey PRIMARY KEY (id),
  constraint kb_docs_url_key UNIQUE (url)
);

create table if not exists public.kb_embeddings (
  id text not null,
  embedding vector(1536),
  updated_at timestamp with time zone default now() not null,
  constraint kb_embeddings_pkey PRIMARY KEY (id)
);

create table if not exists public.listing_claims (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  slug text not null,
  email text not null,
  token text not null,
  token_expires timestamp with time zone not null,
  status text default 'pending'::text not null,
  verified_at timestamp with time zone,
  approved_at timestamp with time zone,
  reviewed_by text,
  constraint listing_claims_pkey PRIMARY KEY (id)
);

create table if not exists public.listing_edit_requests (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  slug text not null,
  claim_id uuid,
  fields jsonb default '{}'::jsonb not null,
  status text default 'pending'::text not null,
  reviewed_by text,
  reviewed_at timestamp with time zone,
  note text,
  constraint listing_edit_requests_pkey PRIMARY KEY (id)
);

create table if not exists public.membership_restore_tokens (
  id uuid default gen_random_uuid() not null,
  member_id uuid not null,
  token_hash text not null,
  expires_at timestamp with time zone not null,
  used_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  constraint membership_restore_tokens_pkey PRIMARY KEY (id)
);

create table if not exists public.newsletter_campaigns (
  id uuid default gen_random_uuid() not null,
  subject text not null,
  content text,
  status text default 'draft'::text not null,
  target_language text default 'all'::text,
  sent_at timestamp with time zone,
  recipient_count integer default 0,
  created_at timestamp with time zone default now() not null,
  constraint newsletter_campaigns_pkey PRIMARY KEY (id)
);

create table if not exists public.newsletter_sponsors (
  id uuid default gen_random_uuid() not null,
  org_id uuid,
  ad_order_id uuid,
  advertiser_name text,
  headline text,
  body text,
  url text,
  image text,
  target_language text default 'all'::text not null,
  send_date date,
  status text default 'pending'::text not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint newsletter_sponsors_pkey PRIMARY KEY (id)
);

create table if not exists public.newsletter_subscribers (
  id uuid default gen_random_uuid() not null,
  email text not null,
  name text,
  is_active boolean default true not null,
  confirmed boolean default false not null,
  language text default 'en'::text,
  confirmation_token text,
  confirmation_sent_at timestamp with time zone,
  confirmed_at timestamp with time zone,
  unsubscribed_at timestamp with time zone,
  county text,
  weather_alerts boolean default false,
  created_at timestamp with time zone default now() not null,
  constraint newsletter_subscribers_pkey PRIMARY KEY (id),
  constraint newsletter_subscribers_email_key UNIQUE (email)
);

create table if not exists public.profiles (
  id uuid not null,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint profiles_pkey PRIMARY KEY (id)
);

create table if not exists public.regulation_alerts (
  id uuid default gen_random_uuid() not null,
  source_id uuid,
  url text,
  title text,
  summary text,
  severity text default 'info'::text not null,
  status text default 'new'::text not null,
  detected_at timestamp with time zone default now() not null,
  created_at timestamp with time zone default now() not null,
  constraint regulation_alerts_pkey PRIMARY KEY (id)
);

create table if not exists public.regulation_snapshots (
  source_id uuid not null,
  text text,
  hash text,
  fetched_at timestamp with time zone default now() not null,
  constraint regulation_snapshots_pkey PRIMARY KEY (source_id)
);

create table if not exists public.rewrite_jobs (
  id uuid default gen_random_uuid() not null,
  scraped_article_id uuid,
  article_id uuid,
  status text default 'pending'::text not null,
  result text,
  editor text,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  retry_count integer default 0,
  max_retries integer default 3,
  error_code text,
  error_message text,
  created_at timestamp with time zone default now() not null,
  constraint rewrite_jobs_pkey PRIMARY KEY (id)
);

create table if not exists public.rss_sources (
  id uuid default gen_random_uuid() not null,
  name text not null,
  url text not null,
  is_active boolean default true not null,
  last_scraped_at timestamp with time zone,
  created_at timestamp with time zone default now() not null,
  category text default 'news'::text,
  source_language text default 'en'::text,
  county text,
  city_focus text[] default '{}'::text[],
  scope text default 'regional'::text,
  output_limit integer default 10,
  source_type text default 'geographic'::text,
  target_category text,
  region text,
  tier text,
  error_count integer default 0,
  error_message text,
  constraint rss_sources_pkey PRIMARY KEY (id)
);

create table if not exists public.saved_items (
  id uuid default gen_random_uuid() not null,
  created_at timestamp with time zone default now() not null,
  cid text not null,
  slug text not null,
  kind text default 'saved'::text not null,
  note text,
  constraint saved_items_pkey PRIMARY KEY (id)
);

create table if not exists public.scrape_sources (
  id uuid default gen_random_uuid() not null,
  category text not null,
  name text,
  url text not null,
  developer_slug text,
  district text,
  cadence_days integer default 7 not null,
  enabled boolean default true not null,
  status text default 'active'::text not null,
  last_fetched_at timestamp with time zone,
  content_hash text,
  last_error text,
  last_found integer,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint scrape_sources_pkey PRIMARY KEY (id),
  constraint scrape_sources_category_url_key UNIQUE (category, url)
);

create table if not exists public.scraped_articles (
  id uuid default gen_random_uuid() not null,
  source_id uuid,
  original_title text,
  original_url text,
  original_content text,
  original_content_full text,
  rewritten_content text,
  status text default 'scraped'::text not null,
  created_at timestamp with time zone default now() not null,
  title_en text,
  title_el text,
  title_ro text,
  title_ar text,
  rewritten_en text,
  rewritten_el text,
  rewritten_ro text,
  rewritten_ar text,
  excerpt_en text,
  excerpt_el text,
  excerpt_ro text,
  excerpt_ar text,
  summary_en text,
  summary_el text,
  summary_ro text,
  summary_ar text,
  seo_title_en text,
  seo_title_el text,
  seo_title_ro text,
  seo_title_ar text,
  seo_description_en text,
  seo_description_el text,
  seo_description_ro text,
  seo_description_ar text,
  rewrite_tags text[] default '{}'::text[],
  rewrite_tags_en text[] default '{}'::text[],
  rewrite_tags_el text[] default '{}'::text[],
  rewrite_tags_ro text[] default '{}'::text[],
  rewrite_tags_ar text[] default '{}'::text[],
  rewrite_error text,
  ai_score real,
  last_rewrite_job_id uuid,
  rewrite_started_at timestamp with time zone,
  rewrite_finished_at timestamp with time zone,
  plagiarism_score real,
  quality_checked_at timestamp with time zone,
  cover_image text,
  category text,
  subcategory text,
  assigned_editor text,
  source_word_count integer,
  output_word_count integer,
  is_used boolean default false,
  marked_for_deletion boolean default false,
  error_message text,
  county text,
  scope text,
  source_type text,
  target_category text,
  sonnet_fallback_used boolean default false,
  title_de text,
  title_pl text,
  title_ru text,
  rewritten_de text,
  rewritten_pl text,
  rewritten_ru text,
  excerpt_de text,
  excerpt_pl text,
  excerpt_ru text,
  summary_de text,
  summary_pl text,
  summary_ru text,
  seo_title_de text,
  seo_title_pl text,
  seo_title_ru text,
  seo_description_de text,
  seo_description_pl text,
  seo_description_ru text,
  rewrite_tags_de text[],
  rewrite_tags_pl text[],
  rewrite_tags_ru text[],
  constraint scraped_articles_pkey PRIMARY KEY (id)
);

create table if not exists public.section_sponsors (
  id uuid default gen_random_uuid() not null,
  section_key text not null,
  sponsor_name text,
  sponsor_logo text,
  sponsor_url text,
  banner_id uuid,
  org_id uuid,
  is_active boolean default true not null,
  created_at timestamp with time zone default now() not null,
  constraint section_sponsors_pkey PRIMARY KEY (id),
  constraint section_sponsors_section_key_key UNIQUE (section_key)
);

create table if not exists public.section_views (
  id uuid default gen_random_uuid() not null,
  page_path text not null,
  section_id text not null,
  view_duration integer default 0,
  created_at timestamp with time zone default now() not null,
  constraint section_views_pkey PRIMARY KEY (id)
);

create table if not exists public.site_analytics (
  id uuid default gen_random_uuid() not null,
  page_path text not null,
  referrer text,
  user_agent text,
  country text,
  city text,
  device_type text,
  browser text,
  session_duration integer default 0,
  session_id text,
  visitor_id text,
  event_type text default 'pageview'::text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  screen_width integer,
  is_bot boolean default false,
  created_at timestamp with time zone default now() not null,
  constraint site_analytics_pkey PRIMARY KEY (id)
);

create table if not exists public.site_settings (
  id uuid default gen_random_uuid() not null,
  key text not null,
  value jsonb,
  updated_at timestamp with time zone default now() not null,
  constraint site_settings_pkey PRIMARY KEY (id),
  constraint site_settings_key_key UNIQUE (key)
);

create table if not exists public.social_posts (
  id uuid default gen_random_uuid() not null,
  article_id uuid,
  platform text,
  lang text default 'en'::text,
  format text,
  status text default 'published'::text,
  external_id text,
  permalink text,
  campaign text,
  variant text,
  image_url text,
  error text,
  payload jsonb,
  created_at timestamp with time zone default now() not null,
  constraint social_posts_pkey PRIMARY KEY (id)
);

create table if not exists public.sponsor_banners (
  id uuid default gen_random_uuid() not null,
  advertiser_name text,
  contact_email text,
  headline_en text,
  headline_el text,
  headline_ro text,
  headline_ar text,
  body_en text,
  body_el text,
  body_ro text,
  body_ar text,
  cta_en text default 'Discover →'::text,
  cta_el text default 'Ανακαλύψτε →'::text,
  cta_ro text default 'Descoperă →'::text,
  cta_ar text default 'اكتشف ←'::text,
  url text,
  image_url text,
  bg_color text default '#0B0E11'::text,
  accent_color text default '#C9A24C'::text,
  slot text default 'sidebar-homepage'::text,
  weight integer default 1,
  is_active boolean default true,
  start_date date,
  end_date date,
  impressions bigint default 0,
  clicks bigint default 0,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  headline_de text,
  headline_pl text,
  headline_ru text,
  body_de text,
  body_pl text,
  body_ru text,
  cta_de text,
  cta_pl text,
  cta_ru text,
  org_id uuid,
  ad_order_id uuid,
  constraint sponsor_banners_pkey PRIMARY KEY (id)
);

create table if not exists public.stripe_events (
  event_id text not null,
  type text not null,
  received_at timestamp with time zone default now() not null,
  claimed_at timestamp with time zone,
  processed_at timestamp with time zone,
  constraint stripe_events_pkey PRIMARY KEY (event_id)
);

create table if not exists public.user_roles (
  id uuid default gen_random_uuid() not null,
  user_id uuid not null,
  role app_role not null,
  constraint user_roles_pkey PRIMARY KEY (id),
  constraint user_roles_user_id_role_key UNIQUE (user_id, role)
);

create table if not exists public.webcams (
  id uuid default gen_random_uuid() not null,
  slug text not null,
  name_en text,
  name_el text,
  name_ro text,
  name_ar text,
  name_de text,
  name_pl text,
  name_ru text,
  provider text default 'link'::text not null,
  embed_ref text,
  external_url text,
  thumb_url text,
  lat double precision,
  lng double precision,
  district text,
  area text,
  category text default 'beach'::text not null,
  tags text[] default '{}'::text[] not null,
  listing_id uuid,
  status text default 'draft'::text not null,
  sort integer default 0 not null,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null,
  constraint webcams_pkey PRIMARY KEY (id),
  constraint webcams_slug_key UNIQUE (slug),
  constraint webcams_category_check CHECK ((category = ANY (ARRAY['beach'::text, 'mountain'::text, 'city'::text, 'village'::text]))),
  constraint webcams_provider_check CHECK ((provider = ANY (ARRAY['youtube'::text, 'windy'::text, 'iframe'::text, 'link'::text, 'snapshot'::text]))),
  constraint webcams_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);

-- ===== Foreign keys (guarded) =====
do $$ begin if not exists (select 1 from pg_constraint where conname='ad_leads_org_id_fkey' and conrelid='public.ad_leads'::regclass) then alter table public.ad_leads add constraint ad_leads_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='ad_orders_org_id_fkey' and conrelid='public.ad_orders'::regclass) then alter table public.ad_orders add constraint ad_orders_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='blog_comments_post_id_fkey' and conrelid='public.blog_comments'::regclass) then alter table public.blog_comments add constraint blog_comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='blog_posts_author_id_fkey' and conrelid='public.blog_posts'::regclass) then alter table public.blog_posts add constraint blog_posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='blog_posts_scraped_article_id_fkey' and conrelid='public.blog_posts'::regclass) then alter table public.blog_posts add constraint blog_posts_scraped_article_id_fkey FOREIGN KEY (scraped_article_id) REFERENCES scraped_articles(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='blog_posts_sponsor_org_id_fkey' and conrelid='public.blog_posts'::regclass) then alter table public.blog_posts add constraint blog_posts_sponsor_org_id_fkey FOREIGN KEY (sponsor_org_id) REFERENCES crm_orgs(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='blog_posts_subject_listing_id_fkey' and conrelid='public.blog_posts'::regclass) then alter table public.blog_posts add constraint blog_posts_subject_listing_id_fkey FOREIGN KEY (subject_listing_id) REFERENCES directory_listings(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='comments_post_id_fkey' and conrelid='public.comments'::regclass) then alter table public.comments add constraint comments_post_id_fkey FOREIGN KEY (post_id) REFERENCES blog_posts(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='crm_activities_contact_id_fkey' and conrelid='public.crm_activities'::regclass) then alter table public.crm_activities add constraint crm_activities_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES crm_contacts(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='crm_activities_deal_id_fkey' and conrelid='public.crm_activities'::regclass) then alter table public.crm_activities add constraint crm_activities_deal_id_fkey FOREIGN KEY (deal_id) REFERENCES crm_deals(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='crm_activities_org_id_fkey' and conrelid='public.crm_activities'::regclass) then alter table public.crm_activities add constraint crm_activities_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='crm_contacts_org_id_fkey' and conrelid='public.crm_contacts'::regclass) then alter table public.crm_contacts add constraint crm_contacts_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='crm_deals_org_id_fkey' and conrelid='public.crm_deals'::regclass) then alter table public.crm_deals add constraint crm_deals_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='crm_enrollments_org_id_fkey' and conrelid='public.crm_enrollments'::regclass) then alter table public.crm_enrollments add constraint crm_enrollments_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='crm_orgs_directory_listing_id_fkey' and conrelid='public.crm_orgs'::regclass) then alter table public.crm_orgs add constraint crm_orgs_directory_listing_id_fkey FOREIGN KEY (directory_listing_id) REFERENCES directory_listings(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='directory_embeddings_slug_fkey' and conrelid='public.directory_embeddings'::regclass) then alter table public.directory_embeddings add constraint directory_embeddings_slug_fkey FOREIGN KEY (slug) REFERENCES directory_listings(slug) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='dsar_erasure_log_request_id_fkey' and conrelid='public.dsar_erasure_log'::regclass) then alter table public.dsar_erasure_log add constraint dsar_erasure_log_request_id_fkey FOREIGN KEY (request_id) REFERENCES dsar_requests(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editor_drafts_author_id_fkey' and conrelid='public.editor_drafts'::regclass) then alter table public.editor_drafts add constraint editor_drafts_author_id_fkey FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editor_drafts_blog_post_id_fkey' and conrelid='public.editor_drafts'::regclass) then alter table public.editor_drafts add constraint editor_drafts_blog_post_id_fkey FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editor_tokens_author_id_fkey' and conrelid='public.editor_tokens'::regclass) then alter table public.editor_tokens add constraint editor_tokens_author_id_fkey FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editorial_field_notes_blog_post_id_fkey' and conrelid='public.editorial_field_notes'::regclass) then alter table public.editorial_field_notes add constraint editorial_field_notes_blog_post_id_fkey FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editorial_field_notes_idea_id_fkey' and conrelid='public.editorial_field_notes'::regclass) then alter table public.editorial_field_notes add constraint editorial_field_notes_idea_id_fkey FOREIGN KEY (idea_id) REFERENCES editorial_ideas(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editorial_field_notes_subject_listing_id_fkey' and conrelid='public.editorial_field_notes'::regclass) then alter table public.editorial_field_notes add constraint editorial_field_notes_subject_listing_id_fkey FOREIGN KEY (subject_listing_id) REFERENCES directory_listings(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editorial_ideas_blog_post_id_fkey' and conrelid='public.editorial_ideas'::regclass) then alter table public.editorial_ideas add constraint editorial_ideas_blog_post_id_fkey FOREIGN KEY (blog_post_id) REFERENCES blog_posts(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editorial_ideas_section_key_fkey' and conrelid='public.editorial_ideas'::regclass) then alter table public.editorial_ideas add constraint editorial_ideas_section_key_fkey FOREIGN KEY (section_key) REFERENCES editorial_sections(key) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editorial_ideas_subcategory_key_fkey' and conrelid='public.editorial_ideas'::regclass) then alter table public.editorial_ideas add constraint editorial_ideas_subcategory_key_fkey FOREIGN KEY (subcategory_key) REFERENCES editorial_sections(key) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editorial_ideas_subject_listing_id_fkey' and conrelid='public.editorial_ideas'::regclass) then alter table public.editorial_ideas add constraint editorial_ideas_subject_listing_id_fkey FOREIGN KEY (subject_listing_id) REFERENCES directory_listings(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editorial_pieces_org_id_fkey' and conrelid='public.editorial_pieces'::regclass) then alter table public.editorial_pieces add constraint editorial_pieces_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='editorial_sections_parent_key_fkey' and conrelid='public.editorial_sections'::regclass) then alter table public.editorial_sections add constraint editorial_sections_parent_key_fkey FOREIGN KEY (parent_key) REFERENCES editorial_sections(key) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='fulfillment_tasks_org_id_fkey' and conrelid='public.fulfillment_tasks'::regclass) then alter table public.fulfillment_tasks add constraint fulfillment_tasks_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='kb_candidates_source_email_id_fkey' and conrelid='public.kb_candidates'::regclass) then alter table public.kb_candidates add constraint kb_candidates_source_email_id_fkey FOREIGN KEY (source_email_id) REFERENCES inbound_emails(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='listing_edit_requests_claim_id_fkey' and conrelid='public.listing_edit_requests'::regclass) then alter table public.listing_edit_requests add constraint listing_edit_requests_claim_id_fkey FOREIGN KEY (claim_id) REFERENCES listing_claims(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='membership_restore_tokens_member_id_fkey' and conrelid='public.membership_restore_tokens'::regclass) then alter table public.membership_restore_tokens add constraint membership_restore_tokens_member_id_fkey FOREIGN KEY (member_id) REFERENCES concierge_members(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='newsletter_sponsors_org_id_fkey' and conrelid='public.newsletter_sponsors'::regclass) then alter table public.newsletter_sponsors add constraint newsletter_sponsors_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='profiles_id_fkey' and conrelid='public.profiles'::regclass) then alter table public.profiles add constraint profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='regulation_alerts_source_id_fkey' and conrelid='public.regulation_alerts'::regclass) then alter table public.regulation_alerts add constraint regulation_alerts_source_id_fkey FOREIGN KEY (source_id) REFERENCES scrape_sources(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='regulation_snapshots_source_id_fkey' and conrelid='public.regulation_snapshots'::regclass) then alter table public.regulation_snapshots add constraint regulation_snapshots_source_id_fkey FOREIGN KEY (source_id) REFERENCES scrape_sources(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='rewrite_jobs_article_id_fkey' and conrelid='public.rewrite_jobs'::regclass) then alter table public.rewrite_jobs add constraint rewrite_jobs_article_id_fkey FOREIGN KEY (article_id) REFERENCES scraped_articles(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='rewrite_jobs_scraped_article_id_fkey' and conrelid='public.rewrite_jobs'::regclass) then alter table public.rewrite_jobs add constraint rewrite_jobs_scraped_article_id_fkey FOREIGN KEY (scraped_article_id) REFERENCES scraped_articles(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='scraped_articles_last_rewrite_job_id_fkey' and conrelid='public.scraped_articles'::regclass) then alter table public.scraped_articles add constraint scraped_articles_last_rewrite_job_id_fkey FOREIGN KEY (last_rewrite_job_id) REFERENCES rewrite_jobs(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='scraped_articles_source_id_fkey' and conrelid='public.scraped_articles'::regclass) then alter table public.scraped_articles add constraint scraped_articles_source_id_fkey FOREIGN KEY (source_id) REFERENCES rss_sources(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='section_sponsors_banner_id_fkey' and conrelid='public.section_sponsors'::regclass) then alter table public.section_sponsors add constraint section_sponsors_banner_id_fkey FOREIGN KEY (banner_id) REFERENCES sponsor_banners(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='section_sponsors_org_id_fkey' and conrelid='public.section_sponsors'::regclass) then alter table public.section_sponsors add constraint section_sponsors_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='social_posts_article_id_fkey' and conrelid='public.social_posts'::regclass) then alter table public.social_posts add constraint social_posts_article_id_fkey FOREIGN KEY (article_id) REFERENCES blog_posts(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='sponsor_banners_ad_order_id_fkey' and conrelid='public.sponsor_banners'::regclass) then alter table public.sponsor_banners add constraint sponsor_banners_ad_order_id_fkey FOREIGN KEY (ad_order_id) REFERENCES ad_orders(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='sponsor_banners_org_id_fkey' and conrelid='public.sponsor_banners'::regclass) then alter table public.sponsor_banners add constraint sponsor_banners_org_id_fkey FOREIGN KEY (org_id) REFERENCES crm_orgs(id) ON DELETE SET NULL; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='user_roles_user_id_fkey' and conrelid='public.user_roles'::regclass) then alter table public.user_roles add constraint user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE; end if; end $$;
do $$ begin if not exists (select 1 from pg_constraint where conname='webcams_listing_id_fkey' and conrelid='public.webcams'::regclass) then alter table public.webcams add constraint webcams_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES directory_listings(id) ON DELETE SET NULL; end if; end $$;

-- ===== Functions (42) =====
-- NOTE: bodies were captured with pg_get_functiondef; the live bodies use CRLF line endings, normalised to LF here.

CREATE OR REPLACE FUNCTION public.ai_spend_month(p_provider text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(round(sum(coalesce(l.usd, 0)), 5), 0)::numeric
  from   public.ai_spend_log l
  where  to_char((l.occurred_at at time zone 'Europe/Nicosia'), 'YYYY-MM')
           = to_char((now() at time zone 'Europe/Nicosia'), 'YYYY-MM')
    and  (p_provider is null or l.provider = p_provider);
$function$;

CREATE OR REPLACE FUNCTION public.ai_spend_since(p_since timestamp with time zone)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(sum(usd), 0)::numeric
  from public.ai_spend_log
  where occurred_at >= p_since;
$function$;

CREATE OR REPLACE FUNCTION public.ai_spend_today(p_provider text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(round(sum(coalesce(l.usd, 0)), 5), 0)::numeric
  from   public.ai_spend_log l
  where  (l.occurred_at at time zone 'Europe/Nicosia')::date
           = (now() at time zone 'Europe/Nicosia')::date
    and  (p_provider is null or l.provider = p_provider);
$function$;

CREATE OR REPLACE FUNCTION public.ai_spend_total_usd(p_provider text DEFAULT NULL::text)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  select coalesce(round(sum(coalesce(l.usd, 0)), 5), 0)::numeric
  from   public.ai_spend_log l
  where  (p_provider is null or l.provider = p_provider);
$function$;

CREATE OR REPLACE FUNCTION public.apply_listing_edit(p_request_id uuid, p_reviewer text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare r public.listing_edit_requests; f jsonb; k text;
  allowed text[] := array['phone','email','url','partner_pitch',
    'summary_en','summary_el','summary_ro','summary_ar','summary_de','summary_pl','summary_ru'];
begin
  select * into r from public.listing_edit_requests where id = p_request_id;
  if not found or r.status <> 'pending' then return false; end if;
  f := coalesce(r.fields, '{}'::jsonb);
  foreach k in array allowed loop
    if f ? k then
      execute format('update public.directory_listings set %I = $1 where slug = $2', k)
        using nullif(btrim(f ->> k), ''), r.slug;
    end if;
  end loop;
  update public.listing_edit_requests
     set status = 'approved', reviewed_by = p_reviewer, reviewed_at = now() where id = p_request_id;
  return true;
end $function$;

CREATE OR REPLACE FUNCTION public.automation_settings_singleton()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.id <> 1 then
    raise exception 'automation_settings is a single-row table (id=1 only)';
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.commit_scraper_blog_post(p_blog_payload jsonb, p_scraped_id uuid, p_writeback jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_post_id uuid;
  v_updated int;
begin
  insert into public.blog_posts (
    title_en, title_el, title_ro, title_ar, title_de, title_pl, title_ru,
    content_en, content_el, content_ro, content_ar, content_de, content_pl, content_ru,
    excerpt_en, excerpt_el, excerpt_ro, excerpt_ar, excerpt_de, excerpt_pl, excerpt_ru,
    summary_en, summary_el, summary_ro, summary_ar, summary_de, summary_pl, summary_ru,
    tags_en, tags_el, tags_ro, tags_ar, tags_de, tags_pl, tags_ru,
    seo_title_en, seo_title_el, seo_title_ro, seo_title_ar, seo_title_de, seo_title_pl, seo_title_ru,
    seo_description_en, seo_description_el, seo_description_ro, seo_description_ar,
    seo_description_de, seo_description_pl, seo_description_ru,
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
    p_blog_payload->>'title_de',
    p_blog_payload->>'title_pl',
    p_blog_payload->>'title_ru',
    p_blog_payload->>'content_en',
    p_blog_payload->>'content_el',
    p_blog_payload->>'content_ro',
    p_blog_payload->>'content_ar',
    p_blog_payload->>'content_de',
    p_blog_payload->>'content_pl',
    p_blog_payload->>'content_ru',
    p_blog_payload->>'excerpt_en',
    p_blog_payload->>'excerpt_el',
    p_blog_payload->>'excerpt_ro',
    p_blog_payload->>'excerpt_ar',
    p_blog_payload->>'excerpt_de',
    p_blog_payload->>'excerpt_pl',
    p_blog_payload->>'excerpt_ru',
    p_blog_payload->>'summary_en',
    p_blog_payload->>'summary_el',
    p_blog_payload->>'summary_ro',
    p_blog_payload->>'summary_ar',
    p_blog_payload->>'summary_de',
    p_blog_payload->>'summary_pl',
    p_blog_payload->>'summary_ru',
    case when jsonb_typeof(p_blog_payload->'tags_en') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_en')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_el') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_el')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_ro') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_ro')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_ar') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_ar')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_de') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_de')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_pl') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_pl')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_ru') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_ru')) else '{}'::text[] end,
    p_blog_payload->>'seo_title_en',
    p_blog_payload->>'seo_title_el',
    p_blog_payload->>'seo_title_ro',
    p_blog_payload->>'seo_title_ar',
    p_blog_payload->>'seo_title_de',
    p_blog_payload->>'seo_title_pl',
    p_blog_payload->>'seo_title_ru',
    p_blog_payload->>'seo_description_en',
    p_blog_payload->>'seo_description_el',
    p_blog_payload->>'seo_description_ro',
    p_blog_payload->>'seo_description_ar',
    p_blog_payload->>'seo_description_de',
    p_blog_payload->>'seo_description_pl',
    p_blog_payload->>'seo_description_ru',
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
    rewritten_de        = p_writeback->>'rewritten_de',
    rewritten_pl        = p_writeback->>'rewritten_pl',
    rewritten_ru        = p_writeback->>'rewritten_ru',
    title_en            = p_writeback->>'title_en',
    title_el            = p_writeback->>'title_el',
    title_ro            = p_writeback->>'title_ro',
    title_ar            = p_writeback->>'title_ar',
    title_de            = p_writeback->>'title_de',
    title_pl            = p_writeback->>'title_pl',
    title_ru            = p_writeback->>'title_ru',
    excerpt_en          = p_writeback->>'excerpt_en',
    excerpt_el          = p_writeback->>'excerpt_el',
    excerpt_ro          = p_writeback->>'excerpt_ro',
    excerpt_ar          = p_writeback->>'excerpt_ar',
    excerpt_de          = p_writeback->>'excerpt_de',
    excerpt_pl          = p_writeback->>'excerpt_pl',
    excerpt_ru          = p_writeback->>'excerpt_ru',
    summary_en          = p_writeback->>'summary_en',
    summary_el          = p_writeback->>'summary_el',
    summary_ro          = p_writeback->>'summary_ro',
    summary_ar          = p_writeback->>'summary_ar',
    summary_de          = p_writeback->>'summary_de',
    summary_pl          = p_writeback->>'summary_pl',
    summary_ru          = p_writeback->>'summary_ru',
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
    rewrite_tags_de     = case when jsonb_typeof(p_writeback->'rewrite_tags_de') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_de')) else rewrite_tags_de end,
    rewrite_tags_pl     = case when jsonb_typeof(p_writeback->'rewrite_tags_pl') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_pl')) else rewrite_tags_pl end,
    rewrite_tags_ru     = case when jsonb_typeof(p_writeback->'rewrite_tags_ru') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_ru')) else rewrite_tags_ru end,
    seo_title_en        = p_writeback->>'seo_title_en',
    seo_title_el        = p_writeback->>'seo_title_el',
    seo_title_ro        = p_writeback->>'seo_title_ro',
    seo_title_ar        = p_writeback->>'seo_title_ar',
    seo_title_de        = p_writeback->>'seo_title_de',
    seo_title_pl        = p_writeback->>'seo_title_pl',
    seo_title_ru        = p_writeback->>'seo_title_ru',
    seo_description_en  = p_writeback->>'seo_description_en',
    seo_description_el  = p_writeback->>'seo_description_el',
    seo_description_ro  = p_writeback->>'seo_description_ro',
    seo_description_ar  = p_writeback->>'seo_description_ar',
    seo_description_de  = p_writeback->>'seo_description_de',
    seo_description_pl  = p_writeback->>'seo_description_pl',
    seo_description_ru  = p_writeback->>'seo_description_ru',
    category            = coalesce(p_writeback->>'category', category),
    subcategory         = p_writeback->>'subcategory',
    cover_image         = p_writeback->>'cover_image',
    output_word_count   = nullif(p_writeback->>'output_word_count', '')::int,
    rewrite_error       = null,
    rewrite_finished_at = now()
  where id = p_scraped_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'commit_scraper_blog_post: scraped_article % not found during writeback', p_scraped_id;
  end if;

  return v_post_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.crm_sync_directory_account()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.name_en is null or trim(new.name_en) = '' then return new; end if;
  if exists (select 1 from public.crm_orgs o where o.directory_listing_id = new.id) then
    return new;
  end if;
  update public.crm_orgs o
     set directory_listing_id = new.id, updated_at = now()
   where o.directory_listing_id is null
     and lower(trim(o.name)) = lower(trim(new.name_en));
  if not found then
    insert into public.crm_orgs (name, category, district, website, phone, directory_listing_id, tier, status, source_url)
    values (new.name_en, new.type, new.district, new.url, new.phone, new.id, 'C', 'prospect', new.url);
  end if;
  return new;
end $function$;

CREATE OR REPLACE FUNCTION public.crm_upsert_account(p_name text, p_email text, p_website text, p_category text, p_district text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_id uuid; v_domain text;
begin
  v_domain := nullif(lower(split_part(coalesce(p_email, ''), '@', 2)), '');
  if v_domain is not null and v_domain not in ('gmail.com','googlemail.com','yahoo.com','hotmail.com','outlook.com','icloud.com','proton.me','protonmail.com') then
    select o.id into v_id from public.crm_orgs o
     where o.website is not null and lower(o.website) like '%' || v_domain || '%'
     order by o.updated_at desc limit 1;
    if v_id is null then
      select o.id into v_id from public.crm_orgs o
       where o.email is not null and lower(o.email) like '%' || v_domain || '%'
       order by o.updated_at desc limit 1;
    end if;
  end if;
  if v_id is null and coalesce(trim(p_name), '') <> '' then
    select id into v_id from public.crm_orgs
     where lower(trim(name)) = lower(trim(p_name)) order by updated_at desc limit 1;
  end if;
  if v_id is null then
    insert into public.crm_orgs (name, email, website, category, district, tier, status)
    values (coalesce(nullif(trim(p_name), ''), nullif(split_part(coalesce(p_email, ''), '@', 1), ''), 'Unknown'),
            nullif(p_email, ''), nullif(p_website, ''), nullif(p_category, ''), nullif(p_district, ''), 'C', 'contacted')
    returning id into v_id;
  end if;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.directory_dedup_key(p_type text, p_name text, p_lat double precision, p_lng double precision)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select case
    when p_lat is not null and p_lng is not null and p_type = 'beach'
      then 'geo:'||round(p_lat::numeric,4)||','||round(p_lng::numeric,4)||':beach'
    when p_lat is not null and p_lng is not null
      then 'geo:'||round(p_lat::numeric,4)||','||round(p_lng::numeric,4)||':'||coalesce(p_type,'')||':'
           || regexp_replace(replace(replace(lower(coalesce(p_name,'')),'&','and'),'ph','f'), '[[:space:][:punct:]]', '', 'g')
    else
      'name:'||coalesce(p_type,'')||':'
           || regexp_replace(replace(replace(lower(coalesce(p_name,'')),'&','and'),'ph','f'), '[[:space:][:punct:]]', '', 'g')
  end
$function$;

CREATE OR REPLACE FUNCTION public.directory_first_party_rating(slug text)
 RETURNS TABLE(avg numeric, count bigint)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with prior as (
    select 4.2::numeric as m, 12::numeric as c   -- m = PRIOR_MEAN, c = PRIOR_WEIGHT
  ),
  agg as (
    select
      count(*)::numeric            as n,
      coalesce(sum(r.rating), 0)::numeric as s
    from public.directory_reviews r
    -- `slug` here is the function parameter (directory_reviews has no `slug`
    -- column — its column is `listing_slug` — so this reference is unambiguous).
    where r.listing_slug = slug
      and r.status = 'approved'
  )
  select
    case when agg.n = 0 then null
         else round((prior.c * prior.m + agg.s) / (prior.c + agg.n), 2)
    end          as avg,
    agg.n::bigint as count
  from agg, prior;
$function$;

CREATE OR REPLACE FUNCTION public.enroll_prospects_bulk(p_category text DEFAULT NULL::text, p_tier text DEFAULT NULL::text, p_stage text DEFAULT NULL::text, p_q text DEFAULT NULL::text, p_locale text DEFAULT NULL::text)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare n integer;
begin
  if p_locale is not null and p_locale <> '' then
    update public.crm_orgs o set outreach_locale = p_locale
    where (p_category is null or p_category = 'all' or o.category = p_category)
      and (p_tier     is null or p_tier = 'all'     or o.tier = p_tier)
      and (p_stage    is null or p_stage = 'all'    or o.status = p_stage)
      and (p_q is null or p_q = '' or o.name ilike '%' || p_q || '%' or o.district ilike '%' || p_q || '%');
  end if;
  with ins as (
    insert into public.crm_enrollments (org_id, status, step, next_send_at)
    select o.id, 'active', 0, now()
    from public.crm_orgs o
    where (p_category is null or p_category = 'all' or o.category = p_category)
      and (p_tier     is null or p_tier = 'all'     or o.tier = p_tier)
      and (p_stage    is null or p_stage = 'all'    or o.status = p_stage)
      and (p_q is null or p_q = '' or o.name ilike '%' || p_q || '%' or o.district ilike '%' || p_q || '%')
      and exists (
        select 1 from public.crm_contacts c
        where c.org_id = o.id and c.email is not null
          and coalesce(c.consent_status, '') not in ('opted_out', 'unsubscribed')
          and not exists (select 1 from public.crm_suppression s
                          where s.email = c.email or s.domain = split_part(c.email, '@', 2))
      )
      and not exists (select 1 from public.crm_enrollments e where e.org_id = o.id)
    on conflict (org_id) do nothing
    returning 1
  )
  select count(*) into n from ins;
  return n;
end $function$;

CREATE OR REPLACE FUNCTION public.erase_personal_data(p_email text, p_actor text DEFAULT 'admin'::text, p_request_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  e         text := lower(trim(coalesce(p_email, '')));
  counts    jsonb := '{}'::jsonb;
  total     int := 0;
  c         int;
  cids      text[];
  ib_ids    uuid[];
  masked    text;
begin
  if e = '' or position('@' in e) = 0 then
    raise exception 'erase_personal_data: a valid email is required';
  end if;

  -- Link the anonymous concierge data (keyed by cid) to this person via their
  -- membership, so a "delete my data" also clears their saved trips, memory and turns.
  select array_agg(distinct cid) into cids
    from public.concierge_members where lower(email) = e and cid is not null;
  select array_agg(id) into ib_ids
    from public.inbound_emails where lower(from_email) = e;

  -- Derived KB rows built from this person's inbound mail (their question text).
  if ib_ids is not null and array_length(ib_ids, 1) > 0 then
    with d as (delete from public.kb_candidates where source_email_id = any(ib_ids) returning 1)
      select count(*) into c from d;
    counts := counts || jsonb_build_object('kb_candidates', c); total := total + c;
  end if;

  -- Straight deletes — the person's own records, keyed by their email.
  with d as (delete from public.contacts               where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('contacts', c); total := total + c;
  with d as (delete from public.newsletter_subscribers where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('newsletter_subscribers', c); total := total + c;
  with d as (delete from public.contact_messages       where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('contact_messages', c); total := total + c;
  with d as (delete from public.blog_comments          where lower(author_email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('blog_comments', c); total := total + c;
  with d as (delete from public.crm_contacts           where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('crm_contacts', c); total := total + c;
  with d as (delete from public.ad_leads               where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('ad_leads', c); total := total + c;
  with d as (delete from public.directory_leads        where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('directory_leads', c); total := total + c;
  with d as (delete from public.concierge_requests     where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('concierge_requests', c); total := total + c;
  with d as (delete from public.concierge_members      where lower(email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('concierge_members', c); total := total + c;
  with d as (delete from public.inbound_emails         where lower(from_email) = e returning 1) select count(*) into c from d;
  counts := counts || jsonb_build_object('inbound_emails', c); total := total + c;

  -- Anonymise (do NOT delete) the accounting records we must retain for tax law:
  -- strip the personal identifiers, keep the financial row + Stripe references.
  with u as (
    update public.ad_orders
       set customer_email = null, customer_name = null, company = null
     where lower(customer_email) = e returning 1
  ) select count(*) into c from u;
  counts := counts || jsonb_build_object('ad_orders_anonymised', c); total := total + c;

  -- Cascade to the anonymous concierge tables via the linked cid(s).
  if cids is not null and array_length(cids, 1) > 0 then
    with d as (delete from public.concierge_events where cid = any(cids) returning 1) select count(*) into c from d;
    counts := counts || jsonb_build_object('concierge_events', c); total := total + c;
    with d as (delete from public.saved_items      where cid = any(cids) returning 1) select count(*) into c from d;
    counts := counts || jsonb_build_object('saved_items', c); total := total + c;
    with d as (delete from public.concierge_memory where cid = any(cids) returning 1) select count(*) into c from d;
    counts := counts || jsonb_build_object('concierge_memory', c); total := total + c;
  end if;

  -- KEEP them opted-out forever: reinforce the suppression record (legal basis to
  -- retain, so an erasure can never accidentally re-open the door to contact them).
  if not exists (select 1 from public.crm_suppression where lower(email) = e) then
    insert into public.crm_suppression (email, reason) values (e, 'erasure');
    counts := counts || jsonb_build_object('crm_suppression_added', 1);
  else
    counts := counts || jsonb_build_object('crm_suppression_added', 0);
  end if;

  -- Human-readable mask + one-way hash for the audit row (no plaintext identifier).
  masked := left(e, 1) || '***@' || split_part(e, '@', 2);
  insert into public.dsar_erasure_log (request_id, email_sha256, email_masked, actor, counts, total)
    values (p_request_id, encode(sha256(convert_to(e, 'UTF8')), 'hex'), masked, p_actor, counts, total);

  return jsonb_build_object('email_masked', masked, 'total', total, 'counts', counts);
end;
$function$;

CREATE OR REPLACE FUNCTION public.fulfil_ad_order(p_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  o        record;
  v_org    uuid;
  v_listing uuid;
  v_adv    text;
  v_title  text;
  v_steps  jsonb;
  v_due    interval := interval '3 days';
begin
  select * into o from public.ad_orders where id = p_order_id;
  if not found then return; end if;

  -- idempotent: one fulfilment task per order (also guards duplicate webhooks)
  if exists (select 1 from public.fulfillment_tasks where ad_order_id = p_order_id) then
    return;
  end if;

  v_org := o.org_id;
  v_adv := coalesce(nullif(o.company,''), nullif(o.customer_name,''), 'New advertiser');
  if v_org is not null then
    select directory_listing_id into v_listing from public.crm_orgs where id = v_org;
  end if;

  if o.slot in ('tier-listed','premium-listing') then
    v_title := 'Onboard listing — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Confirm or create the directory listing','done',false),
      jsonb_build_object('label','Collect logo, photo, summary, website, phone','done',false),
      jsonb_build_object('label','Publish; confirm featured + verified','done',false),
      jsonb_build_object('label','QA the seven translations','done',false));
    if v_listing is not null then
      update public.directory_listings set featured = true, verified = true, commercial_tier = 'listed', updated_at = now() where id = v_listing;
    end if;

  elsif o.slot = 'tier-featured' then
    v_title := 'Onboard Featured — ' || v_adv;
    v_due := interval '5 days';
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Listing: publish, set featured + verified','done',false),
      jsonb_build_object('label','Banner: design + activate (draft created)','done',false),
      jsonb_build_object('label','Schedule the first quarterly sponsored feature','done',false),
      jsonb_build_object('label','Add to next newsletter mention block','done',false));
    if v_listing is not null then
      update public.directory_listings set featured = true, verified = true, commercial_tier = 'featured', updated_at = now() where id = v_listing;
    end if;
    insert into public.sponsor_banners (advertiser_name, contact_email, slot, is_active, weight, org_id, ad_order_id)
    values (v_adv, nullif(o.customer_email,''), 'sidebar-homepage', false, 1, v_org, p_order_id);

  elsif o.slot = 'sidebar-leaderboard' then
    v_title := 'Set up homepage banner — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Design/collect banner creative (7 languages)','done',false),
      jsonb_build_object('label','Fill headline, body, CTA, URL, image, colours','done',false),
      jsonb_build_object('label','Activate the banner','done',false));
    insert into public.sponsor_banners (advertiser_name, contact_email, slot, is_active, weight, org_id, ad_order_id)
    values (v_adv, nullif(o.customer_email,''), 'sidebar-homepage', false, 1, v_org, p_order_id);

  elsif o.slot = 'section-sponsorship' then
    v_title := 'Set up section sponsorship — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree the section','done',false),
      jsonb_build_object('label','Design the "presented by" lockup + banner','done',false),
      jsonb_build_object('label','Map sponsor to the section + activate','done',false));
    insert into public.sponsor_banners (advertiser_name, contact_email, slot, is_active, weight, org_id, ad_order_id)
    values (v_adv, nullif(o.customer_email,''), 'section-sponsorship', false, 1, v_org, p_order_id);

  elsif o.slot = 'sponsored-feature' then
    v_title := 'Produce sponsored feature — ' || v_adv;
    v_due := interval '10 days';
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree angle; send interview questions / gather notes','done',false),
      jsonb_build_object('label','Draft in Editorial Studio','done',false),
      jsonb_build_object('label','Edit; confirm sponsored ("presented by")','done',false),
      jsonb_build_object('label','Translate to seven languages','done',false),
      jsonb_build_object('label','Publish + add to newsletter/social','done',false));
    insert into public.blog_posts (slug, title_en, status, sponsored, sponsor_name, sponsor_org_id)
    values ('sponsored-' || substr(p_order_id::text,1,8), '(Draft) Sponsored feature — ' || v_adv, 'draft', true, v_adv, v_org);

  elsif o.slot = 'newsletter-sole' then
    v_title := 'Schedule newsletter sponsor — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree the Saturday send date','done',false),
      jsonb_build_object('label','Collect headline, copy, image, URL','done',false),
      jsonb_build_object('label','Attach sponsor to that send','done',false));
    insert into public.newsletter_sponsors (org_id, ad_order_id, advertiser_name, target_language, status)
    values (v_org, p_order_id, v_adv, coalesce(nullif(o.locale,''),'all'), 'pending');

  elsif o.slot = 'directory-exclusive' then
    v_title := 'Set category exclusivity — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Confirm the category','done',false),
      jsonb_build_object('label','Mark account exclusive; remove competing promotion','done',false));

  elsif o.slot = 'agenda-event' then
    v_title := 'Spotlight event — ' || v_adv;
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Collect event details + image','done',false),
      jsonb_build_object('label','Create the event; set featured','done',false),
      jsonb_build_object('label','Social push near the date','done',false));

  elsif o.slot = 'tier-partner' then
    v_title := 'Onboard Partner — ' || v_adv;
    v_due := interval '7 days';
    v_steps := jsonb_build_array(
      jsonb_build_object('label','Agree annual plan + exclusivity','done',false),
      jsonb_build_object('label','Build series calendar + placements','done',false),
      jsonb_build_object('label','Kick off first deliverables','done',false));
    -- Partner is our top tier: stamp the listing so the concierge can lead with it (0038 set nothing here).
    if v_listing is not null then
      update public.directory_listings set featured = true, verified = true, commercial_tier = 'partner', updated_at = now() where id = v_listing;
    end if;

  else
    v_title := 'Fulfil order — ' || v_adv || ' (' || coalesce(o.slot,'?') || ')';
    v_steps := jsonb_build_array(jsonb_build_object('label','Review and fulfil this order','done',false));
  end if;

  insert into public.fulfillment_tasks (org_id, ad_order_id, product_slot, title, steps, status, due_at)
  values (v_org, p_order_id, o.slot, v_title, v_steps, 'open', now() + v_due);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_data(p_period text DEFAULT '7d'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_analytics_data_admin(p_period text DEFAULT '7d'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if not public.has_role(auth.uid(), 'admin'::app_role) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return public.get_analytics_data(p_period);
end;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$function$;

CREATE OR REPLACE FUNCTION public.increment_banner_clicks(banner_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ update public.sponsor_banners set clicks = clicks + 1 where id = banner_id; $function$;

CREATE OR REPLACE FUNCTION public.increment_banner_impressions(banner_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$ update public.sponsor_banners set impressions = impressions + 1 where id = banner_id; $function$;

CREATE OR REPLACE FUNCTION public.increment_view_count(post_slug text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare new_count bigint;
begin
  update public.blog_posts
     set view_count = view_count + 1, last_viewed_at = now()
   where slug = post_slug and status = 'published'
   returning view_count into new_count;
  return coalesce(new_count, 0);
end;
$function$;

CREATE OR REPLACE FUNCTION public.job_complete(p_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public', 'pg_temp'
AS $function$
  update public.job_queue
     set status = 'done', last_error = null, locked_at = null, locked_by = null, updated_at = now()
   where id = p_id;
$function$;

CREATE OR REPLACE FUNCTION public.job_dequeue(p_worker text, p_limit integer DEFAULT 5)
 RETURNS SETOF job_queue
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  return query
  with claimed as (
    select id from public.job_queue
    where status = 'pending' and run_after <= now()
    order by priority desc, run_after
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 5), 50))
  )
  update public.job_queue j
  set status = 'running', locked_at = now(), locked_by = p_worker,
      attempts = attempts + 1, updated_at = now()
  from claimed where j.id = claimed.id
  returning j.*;
end $function$;

CREATE OR REPLACE FUNCTION public.job_enqueue(p_kind text, p_payload jsonb DEFAULT '{}'::jsonb, p_run_after timestamp with time zone DEFAULT now(), p_priority integer DEFAULT 0, p_max_attempts integer DEFAULT 5, p_dedupe_key text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare v_id uuid;
begin
  if p_dedupe_key is not null then
    select id into v_id from public.job_queue
      where dedupe_key = p_dedupe_key and status in ('pending', 'running') limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  insert into public.job_queue (kind, payload, run_after, priority, max_attempts, dedupe_key)
  values (p_kind, coalesce(p_payload, '{}'), coalesce(p_run_after, now()),
          coalesce(p_priority, 0), coalesce(p_max_attempts, 5), p_dedupe_key)
  returning id into v_id;
  return v_id;
exception when unique_violation then
  -- a concurrent enqueue won the dedupe race; return the live one
  select id into v_id from public.job_queue
    where dedupe_key = p_dedupe_key and status in ('pending', 'running') limit 1;
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.job_fail(p_id uuid, p_error text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare j public.job_queue;
begin
  select * into j from public.job_queue where id = p_id;
  if not found then return; end if;
  if j.attempts >= j.max_attempts then
    update public.job_queue
       set status = 'dead', last_error = left(coalesce(p_error, ''), 2000),
           locked_at = null, locked_by = null, updated_at = now()
     where id = p_id;
  else
    update public.job_queue
       set status = 'pending', last_error = left(coalesce(p_error, ''), 2000),
           run_after = now() + (interval '30 seconds' * power(2, least(j.attempts, 8))),
           locked_at = null, locked_by = null, updated_at = now()
     where id = p_id;
  end if;
end $function$;

CREATE OR REPLACE FUNCTION public.job_prune(p_keep interval DEFAULT '7 days'::interval)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare n int;
begin
  with d as (
    delete from public.job_queue
     where status in ('done', 'dead') and updated_at < now() - p_keep
     returning 1)
  select count(*) into n from d;
  return n;
end $function$;

CREATE OR REPLACE FUNCTION public.job_reap_stuck(p_timeout interval DEFAULT '00:05:00'::interval)
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare n int;
begin
  with r as (
    update public.job_queue
       set status = case when attempts >= max_attempts then 'dead' else 'pending' end,
           last_error = left(coalesce(last_error, '') || ' [reaped: stuck running]', 2000),
           locked_at = null, locked_by = null, updated_at = now()
     where status = 'running' and locked_at < now() - p_timeout
     returning 1)
  select count(*) into n from r;
  return n;
end $function$;

CREATE OR REPLACE FUNCTION public.kb_docs_needing_embedding(match_count integer DEFAULT 50)
 RETURNS TABLE(id uuid, text text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select d.id,
    left(
      coalesce(d.title,'')
      || case when coalesce(d.description,'') <> '' then ' — ' || d.description else '' end
      || case when coalesce(d.body,'') <> '' then E'\n' || d.body else '' end,
    1800) as text
  from public.kb_docs d
  left join public.kb_embeddings e on e.id = d.id::text
  where e.id is null or d.updated_at > e.updated_at
  order by d.created_at
  limit greatest(1, match_count);
$function$;

CREATE OR REPLACE FUNCTION public.mark_scraped_article_processed()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if new.scraped_article_id is not null then
    update public.scraped_articles
       set status = 'processed',
           rewrite_finished_at = coalesce(rewrite_finished_at, now())
     where id = new.scraped_article_id and status <> 'processed';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.match_directory(query_embedding vector, match_count integer DEFAULT 8, filter_type text DEFAULT NULL::text, filter_district text DEFAULT NULL::text)
 RETURNS TABLE(slug text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select e.slug, 1 - (e.embedding <=> query_embedding) as similarity
  from public.directory_embeddings e
  join public.directory_listings l on l.slug = e.slug
  where e.embedding is not null
    and l.status in ('published', 'listed')
    and (filter_type is null or l.type = filter_type)
    and (filter_district is null or l.district = filter_district)
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$function$;

CREATE OR REPLACE FUNCTION public.match_directory_name(q text, match_count integer DEFAULT 12)
 RETURNS TABLE(slug text, score real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with scored as (
    select
      l.slug,
      greatest(
        word_similarity(q, coalesce(l.name_en, '')),
        word_similarity(q, coalesce(l.name_el, '')),
        word_similarity(q, coalesce(l.name_ru, '')),
        word_similarity(q, coalesce(l.name_ro, '')),
        word_similarity(q, coalesce(l.name_de, '')),
        word_similarity(q, coalesce(l.name_ar, '')),
        word_similarity(q, coalesce(l.name_pl, ''))
      )::real as sim,
      (coalesce(l.name_en, '') ilike '%' || q || '%') as substr_hit
    from public.directory_listings l
    where l.status = 'published'
  )
  select
    slug,
    (case when substr_hit then greatest(sim, 0.95::real) else sim end) as score
  from scored
  where sim > 0.30 or substr_hit
  order by score desc
  limit greatest(1, match_count);
$function$;

CREATE OR REPLACE FUNCTION public.match_editorial_ideas(query_embedding vector, match_count integer DEFAULT 8)
 RETURNS TABLE(id uuid, working_title text, status text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select i.id, i.working_title, i.status, 1 - (i.embedding <=> query_embedding) as similarity
  from public.editorial_ideas i
  where i.embedding is not null and i.status <> 'rejected'
  order by i.embedding <=> query_embedding
  limit match_count
$function$;

CREATE OR REPLACE FUNCTION public.match_kb(query_embedding vector, match_count integer DEFAULT 6)
 RETURNS TABLE(id text, similarity double precision)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select e.id, 1 - (e.embedding <=> query_embedding) as similarity
  from public.kb_embeddings e
  where e.embedding is not null
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$function$;

CREATE OR REPLACE FUNCTION public.match_kb_docs(query_embedding vector, match_count integer DEFAULT 6)
 RETURNS TABLE(id text, url text, title text, description text, source text, image text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  select d.id::text, d.url, d.title, d.description, d.source, d.image,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.kb_embeddings e
  join public.kb_docs d on d.id::text = e.id
  where d.published = true
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$function$;

CREATE OR REPLACE FUNCTION public.prune_error_log()
 RETURNS integer
 LANGUAGE sql
 SET search_path TO 'public', 'pg_temp'
AS $function$
  with d as (delete from public.error_log where created_at < now() - interval '90 days' returning 1)
  select count(*)::int from d;
$function$;

CREATE OR REPLACE FUNCTION public.search_kb_docs(q text, match_count integer DEFAULT 6)
 RETURNS TABLE(id text, url text, title text, description text, source text, image text, similarity double precision)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  with terms as (
    select string_agg(w, ' | ') as orq
    from (
      select distinct w
      from regexp_split_to_table(lower(regexp_replace(coalesce(q,''), '[^a-z0-9]+', ' ', 'gi')), '\s+') w
      where length(w) > 2
    ) t
  ),
  tq as (select case when orq is null or orq = '' then null else to_tsquery('simple', orq) end as query from terms)
  select d.id::text, d.url, d.title, d.description, d.source, d.image,
         ts_rank(to_tsvector('simple', coalesce(d.title,'')||' '||coalesce(d.description,'')||' '||coalesce(d.body,'')), tq.query)::double precision as similarity
  from public.kb_docs d, tq
  where tq.query is not null
    and d.published = true
    and to_tsvector('simple', coalesce(d.title,'')||' '||coalesce(d.description,'')||' '||coalesce(d.body,'')) @@ tq.query
  order by similarity desc
  limit greatest(1, match_count);
$function$;

CREATE OR REPLACE FUNCTION public.set_reading_time()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  stripped text;
  w int;
begin
  stripped := btrim(regexp_replace(coalesce(new.content_en, ''), '<[^>]+>', ' ', 'g'));
  if stripped = '' then
    return new; -- no body yet: leave whatever is there
  end if;
  w := coalesce(array_length(regexp_split_to_array(stripped, '\s+'), 1), 0);
  if w > 0 then
    new.reading_time_min := greatest(1, ceil(w / 220.0));
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.sweep_stuck_rewrite_jobs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.sync_subscriber_to_contacts()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.contacts (email, name, source)
  values (new.email, split_part(new.email, '@', 1), 'newsletter')
  on conflict (email) do nothing;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_view_geo(p_slug text, p_country text DEFAULT NULL::text, p_city text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_editor_token(p_token uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
$function$;

-- ===== Indexes (non-constraint) =====
create index if not exists activities_active_idx on public.activities USING btree (status, district) WHERE (status = 'active'::text);
create index if not exists activities_coords_idx on public.activities USING btree (lat, lng) WHERE (lat IS NOT NULL);
create index if not exists activities_kind_idx on public.activities USING btree (kind) WHERE (status = 'active'::text);
create index if not exists ad_leads_created_idx on public.ad_leads USING btree (created_at DESC);
create index if not exists ad_orders_created_idx on public.ad_orders USING btree (created_at DESC);
create index if not exists ad_orders_status_idx on public.ad_orders USING btree (status);
create index if not exists ad_orders_sub_idx on public.ad_orders USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);
create index if not exists ai_spend_log_function_idx on public.ai_spend_log USING btree (function_name, occurred_at DESC);
create index if not exists ai_spend_log_job_idx on public.ai_spend_log USING btree (job_id) WHERE (job_id IS NOT NULL);
create index if not exists ai_spend_log_occurred_idx on public.ai_spend_log USING btree (occurred_at DESC);
create index if not exists ai_spend_log_provider_occurred_idx on public.ai_spend_log USING btree (provider, occurred_at DESC);
create index if not exists attribution_clicks_created_idx on public.attribution_clicks USING btree (created_at DESC);
create index if not exists attribution_clicks_slug_idx on public.attribution_clicks USING btree (slug, created_at DESC);
create index if not exists idx_authors_active on public.authors USING btree (active);
create index if not exists idx_authors_editor_key on public.authors USING btree (editor_key);
create index if not exists idx_authors_slug on public.authors USING btree (slug);
create index if not exists idx_blog_comments_post_id on public.blog_comments USING btree (post_id);
create index if not exists blog_posts_franchise_idx on public.blog_posts USING btree (franchise) WHERE (franchise IS NOT NULL);
create index if not exists blog_posts_pipeline_status_idx on public.blog_posts USING btree (pipeline_status, updated_at DESC) WHERE (pipeline_status IS NOT NULL);
create index if not exists blog_posts_scheduled_at_idx on public.blog_posts USING btree (scheduled_at) WHERE (scheduled_at IS NOT NULL);
create index if not exists blog_posts_search_idx on public.blog_posts USING gin (search_document);
create index if not exists blog_posts_subject_listing_idx on public.blog_posts USING btree (subject_listing_id) WHERE (subject_listing_id IS NOT NULL);
create index if not exists blog_posts_view_count_idx on public.blog_posts USING btree (view_count DESC, published_at DESC) WHERE (status = 'published'::text);
create index if not exists idx_blog_posts_author_id on public.blog_posts USING btree (author_id);
create index if not exists idx_blog_posts_breaking on public.blog_posts USING btree (published_at DESC) WHERE ((status = 'published'::text) AND (is_breaking = true));
create index if not exists idx_blog_posts_category_published on public.blog_posts USING btree (category, published_at DESC) WHERE (status = 'published'::text);
create index if not exists idx_blog_posts_corrected on public.blog_posts USING btree (corrected_at DESC) WHERE (corrected_at IS NOT NULL);
create index if not exists idx_blog_posts_county_published on public.blog_posts USING btree (county, published_at DESC) WHERE ((status = 'published'::text) AND (county IS NOT NULL));
create index if not exists idx_blog_posts_scraped_article_id on public.blog_posts USING btree (scraped_article_id);
create index if not exists idx_blog_posts_search_ar on public.blog_posts USING gin (search_ar);
create index if not exists idx_blog_posts_search_el on public.blog_posts USING gin (search_el);
create index if not exists idx_blog_posts_search_en on public.blog_posts USING gin (search_en);
create index if not exists idx_blog_posts_search_ro on public.blog_posts USING gin (search_ro);
create index if not exists idx_blog_posts_status_published on public.blog_posts USING btree (published_at DESC) WHERE (status = 'published'::text);
create unique index if not exists uq_blog_posts_scraped_article_id on public.blog_posts USING btree (scraped_article_id) WHERE (scraped_article_id IS NOT NULL);
create index if not exists column_jobs_created_idx on public.column_jobs USING btree (created_at DESC);
create index if not exists column_jobs_worker_idx on public.column_jobs USING btree (status, claimed_at);
create index if not exists idx_comments_post_id on public.comments USING btree (post_id);
create index if not exists concierge_coverage_created_idx on public.concierge_coverage USING btree (created_at DESC);
create index if not exists concierge_coverage_run_idx on public.concierge_coverage USING btree (run_id, created_at DESC);
create index if not exists concierge_coverage_topic_idx on public.concierge_coverage USING btree (topic, verdict);
create index if not exists concierge_evals_created_idx on public.concierge_evals USING btree (created_at DESC);
create index if not exists concierge_evals_run_idx on public.concierge_evals USING btree (run_id, created_at DESC);
create index if not exists concierge_evals_verdict_idx on public.concierge_evals USING btree (verdict, created_at DESC);
create index if not exists concierge_events_coverage_idx on public.concierge_events USING btree (coverage, created_at DESC);
create index if not exists concierge_events_created_idx on public.concierge_events USING btree (created_at DESC);
create index if not exists concierge_members_cid_idx on public.concierge_members USING btree (cid);
create index if not exists concierge_members_email_idx on public.concierge_members USING btree (lower(email));
create unique index if not exists concierge_members_sub_idx on public.concierge_members USING btree (stripe_subscription_id) WHERE (stripe_subscription_id IS NOT NULL);
create index if not exists concierge_memory_updated_idx on public.concierge_memory USING btree (updated_at DESC);
create index if not exists concierge_requests_created_idx on public.concierge_requests USING btree (created_at DESC);
create index if not exists concierge_requests_status_idx on public.concierge_requests USING btree (status);
create index if not exists concierge_requests_tier_idx on public.concierge_requests USING btree (tier, created_at DESC);
create index if not exists concierge_tg_threads_updated_idx on public.concierge_tg_threads USING btree (updated_at DESC);
create index if not exists concierge_wa_threads_updated_idx on public.concierge_wa_threads USING btree (updated_at DESC);
create index if not exists contact_messages_request_class_idx on public.contact_messages USING btree (request_class, created_at DESC);
create index if not exists crm_activities_deal_idx on public.crm_activities USING btree (deal_id);
create index if not exists crm_activities_org_idx on public.crm_activities USING btree (org_id, created_at DESC);
create index if not exists crm_contacts_email_idx on public.crm_contacts USING btree (lower(email));
create index if not exists crm_contacts_org_idx on public.crm_contacts USING btree (org_id);
create index if not exists crm_deals_next_idx on public.crm_deals USING btree (next_action_at) WHERE (next_action_at IS NOT NULL);
create index if not exists crm_deals_org_idx on public.crm_deals USING btree (org_id);
create index if not exists crm_deals_stage_idx on public.crm_deals USING btree (stage);
create index if not exists crm_enrollments_due_idx on public.crm_enrollments USING btree (status, next_send_at);
create unique index if not exists crm_enrollments_org_uidx on public.crm_enrollments USING btree (org_id);
create index if not exists crm_orgs_cat_idx on public.crm_orgs USING btree (category, tier, status);
create index if not exists crm_orgs_listing_idx on public.crm_orgs USING btree (directory_listing_id);
create index if not exists crm_orgs_status_idx on public.crm_orgs USING btree (status);
create index if not exists crm_suppression_domain_idx on public.crm_suppression USING btree (lower(domain));
create unique index if not exists crm_suppression_email_uidx on public.crm_suppression USING btree (lower(email)) WHERE (email IS NOT NULL);
create unique index if not exists crm_templates_locale_step_uidx on public.crm_templates USING btree (locale, step);
create index if not exists directory_claims_slug_idx on public.directory_claims USING btree (listing_slug);
create index if not exists directory_claims_status_idx on public.directory_claims USING btree (status);
create index if not exists directory_claims_token_hash_idx on public.directory_claims USING btree (token_hash);
create index if not exists directory_embeddings_embedding_idx on public.directory_embeddings USING hnsw (embedding vector_cosine_ops);
create index if not exists directory_leads_created_idx on public.directory_leads USING btree (created_at DESC);
create index if not exists directory_leads_slug_idx on public.directory_leads USING btree (listing_slug);
create index if not exists directory_leads_status_idx on public.directory_leads USING btree (status);
create index if not exists directory_listing_edits_slug_status_idx on public.directory_listing_edits USING btree (listing_slug, status);
create index if not exists directory_listing_edits_status_idx on public.directory_listing_edits USING btree (status);
create index if not exists directory_canonical_cat_idx on public.directory_listings USING btree (canonical_category) WHERE (canonical_category IS NOT NULL);
create index if not exists directory_commercial_rank_idx on public.directory_listings USING btree (commercial_rank DESC);
create index if not exists directory_coords_idx on public.directory_listings USING btree (lat, lng) WHERE ((lat IS NOT NULL) AND (lng IS NOT NULL));
create unique index if not exists directory_dedup_uidx on public.directory_listings USING btree (directory_dedup_key(type, name_en, lat, lng));
create index if not exists directory_dev_price_idx on public.directory_listings USING btree (type, price_from) WHERE (type = 'development'::text);
create index if not exists directory_developer_idx on public.directory_listings USING btree (developer_slug) WHERE (developer_slug IS NOT NULL);
create index if not exists directory_district_idx on public.directory_listings USING btree (district);
create index if not exists directory_enriched_idx on public.directory_listings USING btree (enriched_at);
create index if not exists directory_group_idx on public.directory_listings USING btree (category_group) WHERE (status = 'published'::text);
create index if not exists directory_latlng_idx on public.directory_listings USING btree (lat, lng) WHERE (status = 'published'::text);
create index if not exists directory_luxury_idx on public.directory_listings USING btree (luxury) WHERE (status = 'published'::text);
create index if not exists directory_name_ar_trgm on public.directory_listings USING gin (name_ar gin_trgm_ops);
create index if not exists directory_name_de_trgm on public.directory_listings USING gin (name_de gin_trgm_ops);
create index if not exists directory_name_el_trgm on public.directory_listings USING gin (name_el gin_trgm_ops);
create index if not exists directory_name_en_trgm on public.directory_listings USING gin (name_en gin_trgm_ops);
create index if not exists directory_name_pl_trgm on public.directory_listings USING gin (name_pl gin_trgm_ops);
create index if not exists directory_name_ro_trgm on public.directory_listings USING gin (name_ro gin_trgm_ops);
create index if not exists directory_name_ru_trgm on public.directory_listings USING gin (name_ru gin_trgm_ops);
create index if not exists directory_norm_pending_idx on public.directory_listings USING btree (id) WHERE (normalized_at IS NULL);
create unique index if not exists directory_osm_id_uidx on public.directory_listings USING btree (osm_id);
create index if not exists directory_publish_ready_idx on public.directory_listings USING btree (id) WHERE ((status = 'listed'::text) AND (lat IS NOT NULL) AND (lng IS NOT NULL) AND (canonical_category IS NOT NULL) AND (canonical_category <> 'general-vendor'::text));
create index if not exists directory_source_desc_null_idx on public.directory_listings USING btree (id) WHERE (source_description IS NULL);
create index if not exists directory_text_status_generated_idx on public.directory_listings USING btree (text_generated_at) WHERE (text_status = 'generated'::text);
create index if not exists directory_text_status_pending_idx on public.directory_listings USING btree (id) WHERE ((status = 'published'::text) AND ((text_status IS NULL) OR (text_status = ANY (ARRAY['stub'::text, 'review'::text]))));
create index if not exists directory_type_district_idx on public.directory_listings USING btree (type, district) WHERE (status = 'published'::text);
create index if not exists directory_type_idx on public.directory_listings USING btree (type, status);
create index if not exists directory_owner_tokens_expires_idx on public.directory_owner_tokens USING btree (expires_at);
create index if not exists directory_owner_tokens_hash_idx on public.directory_owner_tokens USING btree (token_hash);
create index if not exists directory_owner_tokens_slug_idx on public.directory_owner_tokens USING btree (listing_slug);
create index if not exists directory_reviews_slug_status_idx on public.directory_reviews USING btree (listing_slug, status);
create index if not exists dsar_erasure_log_created_idx on public.dsar_erasure_log USING btree (created_at DESC);
create index if not exists dsar_erasure_log_hash_idx on public.dsar_erasure_log USING btree (email_sha256);
create index if not exists dsar_requests_due_idx on public.dsar_requests USING btree (due_at) WHERE (status = ANY (ARRAY['new'::text, 'in_progress'::text]));
create index if not exists dsar_requests_status_idx on public.dsar_requests USING btree (status, created_at DESC);
create index if not exists idx_editor_drafts_author on public.editor_drafts USING btree (author_id);
create index if not exists idx_editor_drafts_status on public.editor_drafts USING btree (status);
create index if not exists idx_editor_tokens_author on public.editor_tokens USING btree (author_id);
create index if not exists idx_editor_tokens_token on public.editor_tokens USING btree (token) WHERE (active = true);
create index if not exists editorial_field_notes_idea_idx on public.editorial_field_notes USING btree (idea_id) WHERE (idea_id IS NOT NULL);
create index if not exists editorial_field_notes_status_idx on public.editorial_field_notes USING btree (status, created_at DESC);
create index if not exists editorial_field_notes_subject_idx on public.editorial_field_notes USING btree (subject_listing_id) WHERE (subject_listing_id IS NOT NULL);
create index if not exists editorial_ideas_dedup_idx on public.editorial_ideas USING btree (dedup_hash) WHERE (dedup_hash IS NOT NULL);
create index if not exists editorial_ideas_embedding_idx on public.editorial_ideas USING hnsw (embedding vector_cosine_ops);
create index if not exists editorial_ideas_section_idx on public.editorial_ideas USING btree (section_key);
create index if not exists editorial_ideas_status_idx on public.editorial_ideas USING btree (status, target_month);
create index if not exists editorial_ideas_subcat_idx on public.editorial_ideas USING btree (subcategory_key);
create index if not exists editorial_pieces_kind_idx on public.editorial_pieces USING btree (kind, created_at DESC);
create index if not exists editorial_pieces_org_idx on public.editorial_pieces USING btree (org_id);
create index if not exists editorial_sections_active_idx on public.editorial_sections USING btree (active, sort);
create index if not exists editorial_sections_parent_idx on public.editorial_sections USING btree (parent_key) WHERE (parent_key IS NOT NULL);
create index if not exists error_log_created_idx on public.error_log USING btree (created_at DESC);
create index if not exists error_log_fingerprint_idx on public.error_log USING btree (fingerprint, created_at DESC);
create index if not exists error_log_source_idx on public.error_log USING btree (source, created_at DESC);
create index if not exists events_article_idx on public.events USING btree (article_slug) WHERE (article_slug IS NOT NULL);
create index if not exists events_district_idx on public.events USING btree (district);
create index if not exists events_enriched_idx on public.events USING btree (enriched_at);
create unique index if not exists events_ingest_key_uidx on public.events USING btree (ingest_key);
create index if not exists events_source_idx on public.events USING btree (source);
create index if not exists events_source_url_idx on public.events USING btree (source_url);
create index if not exists events_when_idx on public.events USING btree (status, starts_at);
create unique index if not exists fulfillment_tasks_order_uidx on public.fulfillment_tasks USING btree (ad_order_id) WHERE (ad_order_id IS NOT NULL);
create index if not exists fulfillment_tasks_status_idx on public.fulfillment_tasks USING btree (status, due_at);
create index if not exists idx_genlogs_created on public.generation_logs USING btree (created_at DESC);
create index if not exists idx_genlogs_status on public.generation_logs USING btree (status);
create index if not exists inbound_emails_assignee_idx on public.inbound_emails USING btree (assignee) WHERE (resolved_at IS NULL);
create index if not exists inbound_emails_created_idx on public.inbound_emails USING btree (created_at DESC);
create unique index if not exists inbound_emails_message_id_uidx on public.inbound_emails USING btree (message_id) WHERE (message_id IS NOT NULL);
create index if not exists inbound_emails_open_idx on public.inbound_emails USING btree (sla_due) WHERE (resolved_at IS NULL);
create index if not exists inbound_emails_status_idx on public.inbound_emails USING btree (status);
create index if not exists inbound_emails_thread_idx on public.inbound_emails USING btree (thread_key, created_at);
create index if not exists inbound_emails_to_idx on public.inbound_emails USING btree (to_email);
create index if not exists job_queue_claim_idx on public.job_queue USING btree (priority DESC, run_after) WHERE (status = 'pending'::text);
create unique index if not exists job_queue_dedupe_uidx on public.job_queue USING btree (dedupe_key) WHERE ((dedupe_key IS NOT NULL) AND (status = ANY (ARRAY['pending'::text, 'running'::text])));
create index if not exists job_queue_status_idx on public.job_queue USING btree (status, updated_at DESC);
create index if not exists kb_candidates_status_idx on public.kb_candidates USING btree (status, created_at DESC);
create index if not exists kb_docs_published_idx on public.kb_docs USING btree (published);
create index if not exists kb_docs_source_idx on public.kb_docs USING btree (source);
create index if not exists kb_docs_title_trgm on public.kb_docs USING gin (title gin_trgm_ops);
create index if not exists kb_embeddings_embedding_idx on public.kb_embeddings USING hnsw (embedding vector_cosine_ops);
create index if not exists listing_claims_slug_idx on public.listing_claims USING btree (slug, created_at DESC);
create unique index if not exists listing_claims_token_uidx on public.listing_claims USING btree (token);
create index if not exists listing_edit_requests_slug_idx on public.listing_edit_requests USING btree (slug, created_at DESC);
create index if not exists listing_edit_requests_status_idx on public.listing_edit_requests USING btree (status, created_at DESC);
create index if not exists membership_restore_tokens_expires_idx on public.membership_restore_tokens USING btree (expires_at);
create unique index if not exists membership_restore_tokens_hash_key on public.membership_restore_tokens USING btree (token_hash);
create index if not exists membership_restore_tokens_member_idx on public.membership_restore_tokens USING btree (member_id, created_at DESC);
create unique index if not exists newsletter_sponsors_send_uidx on public.newsletter_sponsors USING btree (send_date, target_language) WHERE ((status = 'scheduled'::text) AND (send_date IS NOT NULL));
create unique index if not exists newsletter_subscribers_confirmation_token_idx on public.newsletter_subscribers USING btree (confirmation_token) WHERE (confirmation_token IS NOT NULL);
create index if not exists regulation_alerts_status_idx on public.regulation_alerts USING btree (status, detected_at DESC);
create unique index if not exists uq_rewrite_jobs_active_article on public.rewrite_jobs USING btree (article_id) WHERE (status = ANY (ARRAY['queued'::text, 'processing'::text]));
create index if not exists idx_rss_active on public.rss_sources USING btree (is_active);
create index if not exists idx_rss_lang on public.rss_sources USING btree (source_language);
create index if not exists idx_rss_region_tier on public.rss_sources USING btree (region, tier);
create unique index if not exists rss_sources_url_key on public.rss_sources USING btree (url);
create index if not exists saved_items_cid_idx on public.saved_items USING btree (cid, kind, created_at DESC);
create unique index if not exists saved_items_uidx on public.saved_items USING btree (cid, slug, kind);
create index if not exists scrape_sources_due_idx on public.scrape_sources USING btree (category, enabled, last_fetched_at);
create index if not exists idx_scraped_articles_sonnet_fallback on public.scraped_articles USING btree (sonnet_fallback_used) WHERE (sonnet_fallback_used = true);
create index if not exists idx_scraped_cleanup on public.scraped_articles USING btree (is_used, marked_for_deletion, created_at);
create index if not exists idx_scraped_pending on public.scraped_articles USING btree (status, is_used, created_at);
create unique index if not exists scraped_articles_original_url_uniq on public.scraped_articles USING btree (original_url) WHERE ((original_url IS NOT NULL) AND ((marked_for_deletion IS NULL) OR (marked_for_deletion = false)));
create index if not exists section_sponsors_active_idx on public.section_sponsors USING btree (section_key) WHERE is_active;
create index if not exists idx_analytics_country on public.site_analytics USING btree (country);
create index if not exists idx_analytics_created_at on public.site_analytics USING btree (created_at DESC);
create index if not exists idx_analytics_is_bot on public.site_analytics USING btree (is_bot);
create index if not exists idx_analytics_page_path on public.site_analytics USING btree (page_path);
create index if not exists idx_analytics_referrer on public.site_analytics USING btree (referrer);
create index if not exists idx_analytics_visitor_id on public.site_analytics USING btree (visitor_id);
create index if not exists site_analytics_campaign_content_idx on public.site_analytics USING btree (utm_campaign, utm_content, created_at DESC) WHERE (utm_campaign IS NOT NULL);
create index if not exists social_posts_article_idx on public.social_posts USING btree (article_id, created_at DESC);
create index if not exists social_posts_campaign_idx on public.social_posts USING btree (campaign);
create index if not exists social_posts_created_idx on public.social_posts USING btree (created_at DESC);
create index if not exists stripe_events_received_idx on public.stripe_events USING btree (received_at DESC);
create index if not exists webcams_category_idx on public.webcams USING btree (category) WHERE (status = 'published'::text);
create index if not exists webcams_district_idx on public.webcams USING btree (district) WHERE (status = 'published'::text);
create index if not exists webcams_geo_idx on public.webcams USING btree (lat, lng) WHERE (status = 'published'::text);
create index if not exists webcams_listing_idx on public.webcams USING btree (listing_id);
create index if not exists webcams_published_idx on public.webcams USING btree (status, sort) WHERE (status = 'published'::text);

-- ===== Views (dependency order: listing_recommendations before listing_attribution / listing_revenue) =====
-- NOTE: only crm_prospect_scores, editorial_coverage, editorial_plan carry security_invoker=on in the live DB;
-- all other views run with their owner's privileges (see README "Known gaps").

create or replace view public.advertiser_roi as
 SELECT o.id AS org_id,
    o.name,
    o.status,
    COALESCE(rev.revenue_eur, 0::numeric) AS revenue_eur,
    COALESCE(rev.orders, 0::bigint) AS orders,
    COALESCE(ld.leads, 0::bigint) AS leads,
        CASE
            WHEN COALESCE(ld.leads, 0::bigint) > 0 THEN round(COALESCE(rev.revenue_eur, 0::numeric) / ld.leads::numeric, 0)
            ELSE NULL::numeric
        END AS revenue_per_lead,
    rev.last_order_at
   FROM crm_orgs o
     JOIN ( SELECT ad_orders.org_id,
            sum(COALESCE(ad_orders.amount, 0::numeric)) AS revenue_eur,
            count(*) AS orders,
            max(ad_orders.created_at) AS last_order_at
           FROM ad_orders
          WHERE (ad_orders.status = ANY (ARRAY['paid'::text, 'active'::text])) AND ad_orders.org_id IS NOT NULL
          GROUP BY ad_orders.org_id) rev ON rev.org_id = o.id
     LEFT JOIN ( SELECT concierge_requests.org_id,
            count(*) AS leads
           FROM concierge_requests
          WHERE concierge_requests.org_id IS NOT NULL
          GROUP BY concierge_requests.org_id) ld ON ld.org_id = o.id
  ORDER BY (COALESCE(rev.revenue_eur, 0::numeric)) DESC;

create or replace view public.ai_spend_by_function_daily as
 SELECT (occurred_at AT TIME ZONE 'Europe/Nicosia'::text)::date AS day,
    function_name,
    count(*) AS calls,
    round(sum(COALESCE(usd, 0::numeric)), 5) AS usd
   FROM ai_spend_log
  GROUP BY ((occurred_at AT TIME ZONE 'Europe/Nicosia'::text)::date), function_name;

create or replace view public.ai_spend_by_month as
 SELECT to_char((occurred_at AT TIME ZONE 'Europe/Nicosia'::text), 'YYYY-MM'::text) AS month,
    count(*) AS calls,
    round(sum(COALESCE(usd, 0::numeric)), 4) AS usd
   FROM ai_spend_log
  GROUP BY (to_char((occurred_at AT TIME ZONE 'Europe/Nicosia'::text), 'YYYY-MM'::text))
  ORDER BY (to_char((occurred_at AT TIME ZONE 'Europe/Nicosia'::text), 'YYYY-MM'::text)) DESC;

create or replace view public.ai_spend_daily as
 SELECT (occurred_at AT TIME ZONE 'Europe/Nicosia'::text)::date AS day,
    round(sum(COALESCE(usd, 0::numeric)), 5) AS usd,
    count(*) AS calls
   FROM ai_spend_log
  GROUP BY ((occurred_at AT TIME ZONE 'Europe/Nicosia'::text)::date);

create or replace view public.ai_spend_total as
 SELECT count(*) AS calls,
    round(sum(COALESCE(usd, 0::numeric)), 4) AS usd
   FROM ai_spend_log;

create or replace view public.blog_comments_public as
 SELECT id,
    post_id,
    content,
    author_name,
    ai_reply,
    status,
    created_at
   FROM blog_comments
  WHERE status = 'approved'::text;

create or replace view public.concierge_coverage_daily as
 SELECT (created_at AT TIME ZONE 'UTC'::text)::date AS day,
    count(*) AS total,
    count(*) FILTER (WHERE coverage = 'full'::text) AS full_ct,
    count(*) FILTER (WHERE coverage = 'partial'::text) AS partial_ct,
    count(*) FILTER (WHERE coverage = 'deferred'::text) AS deferred_ct,
    round(100.0 * count(*) FILTER (WHERE coverage = ANY (ARRAY['full'::text, 'partial'::text]))::numeric / GREATEST(count(*), 1::bigint)::numeric, 1) AS coverage_rate
   FROM concierge_events
  GROUP BY ((created_at AT TIME ZONE 'UTC'::text)::date)
  ORDER BY ((created_at AT TIME ZONE 'UTC'::text)::date) DESC;

create or replace view public.concierge_coverage_summary as
 SELECT run_id,
    min(created_at) AS run_at,
    count(*) AS n,
    count(*) FILTER (WHERE verdict = 'blind'::text) AS blind,
    count(*) FILTER (WHERE verdict = 'thin'::text) AS thin,
    count(*) FILTER (WHERE verdict = 'ok'::text) AS ok,
    count(*) FILTER (WHERE verdict = 'strong'::text) AS strong,
    round(avg(
        CASE verdict
            WHEN 'strong'::text THEN 1.0
            WHEN 'ok'::text THEN 0.70
            WHEN 'thin'::text THEN 0.34
            ELSE 0::numeric
        END) * 100::numeric, 1) AS score,
    round(avg(dir_count), 2) AS avg_dir,
    round(avg(kb_count), 2) AS avg_kb,
    round(avg(article_count), 2) AS avg_article
   FROM concierge_coverage
  GROUP BY run_id
  ORDER BY (min(created_at)) DESC;

create or replace view public.concierge_coverage_topics as
 SELECT run_id,
    topic,
    count(*) AS n,
    count(*) FILTER (WHERE verdict = 'blind'::text) AS blind,
    count(*) FILTER (WHERE verdict = 'thin'::text) AS thin,
    count(*) FILTER (WHERE verdict = ANY (ARRAY['ok'::text, 'strong'::text])) AS covered,
    round(avg(
        CASE verdict
            WHEN 'strong'::text THEN 1.0
            WHEN 'ok'::text THEN 0.70
            WHEN 'thin'::text THEN 0.34
            ELSE 0::numeric
        END) * 100::numeric, 1) AS score
   FROM concierge_coverage
  GROUP BY run_id, topic
  ORDER BY run_id, (round(avg(
        CASE verdict
            WHEN 'strong'::text THEN 1.0
            WHEN 'ok'::text THEN 0.70
            WHEN 'thin'::text THEN 0.34
            ELSE 0::numeric
        END) * 100::numeric, 1));

create or replace view public.concierge_eval_summary as
 SELECT run_id,
    min(created_at) AS run_at,
    count(*) AS n,
    round(avg(grounded_score), 2) AS avg_grounded,
    round(avg(language_score), 2) AS avg_language,
    round(avg(helpful_score), 2) AS avg_helpful,
    round(avg(overall), 2) AS avg_overall,
    count(*) FILTER (WHERE verdict = 'fail'::text) AS fails,
    count(*) FILTER (WHERE verdict = 'weak'::text) AS weak
   FROM concierge_evals
  GROUP BY run_id
  ORDER BY (min(created_at)) DESC;

create or replace view public.crm_prospect_scores with (security_invoker=on) as
 SELECT o.id,
    o.name,
    o.category,
    o.district,
    o.status,
    o.website,
    o.tier,
    d.rating,
    d.commercial_tier,
        CASE
            WHEN o.status = ANY (ARRAY['won'::text, 'live'::text]) THEN 0
            ELSE
            CASE
                WHEN o.category ~~* '%law%'::text OR o.category ~~* '%reloc%'::text OR o.category ~~* '%real%estate%'::text OR o.category ~~* '%immigration%'::text OR o.category ~~* '%clinic%'::text OR o.category ~~* '%health%'::text OR o.category ~~* '%hotel%'::text OR o.category ~~* '%bank%'::text THEN 40
                WHEN o.category ~~* '%restaurant%'::text OR o.category ~~* '%dining%'::text OR o.category ~~* '%beauty%'::text OR o.category ~~* '%spa%'::text OR o.category ~~* '%retail%'::text THEN 20
                ELSE 10
            END +
            CASE
                WHEN o.website IS NULL THEN 20
                ELSE 0
            END +
            CASE
                WHEN d.commercial_tier IS NULL THEN 15
                ELSE 0
            END +
            CASE
                WHEN d.rating >= 4.5::double precision THEN 15
                WHEN d.rating >= 4.0::double precision THEN 8
                ELSE 0
            END
        END AS lead_score,
        CASE
            WHEN o.status = ANY (ARRAY['won'::text, 'live'::text]) THEN 'Already a customer'::text
            ELSE NULLIF(TRIM(BOTH FROM concat_ws(' · '::text,
            CASE
                WHEN o.category ~~* '%law%'::text OR o.category ~~* '%reloc%'::text OR o.category ~~* '%real%estate%'::text OR o.category ~~* '%immigration%'::text OR o.category ~~* '%clinic%'::text OR o.category ~~* '%health%'::text OR o.category ~~* '%hotel%'::text OR o.category ~~* '%bank%'::text THEN 'High-value category'::text
                WHEN o.category ~~* '%restaurant%'::text OR o.category ~~* '%dining%'::text OR o.category ~~* '%beauty%'::text OR o.category ~~* '%spa%'::text OR o.category ~~* '%retail%'::text THEN 'Mid-value category'::text
                ELSE 'Standard category'::text
            END,
            CASE
                WHEN o.website IS NULL THEN 'no website yet'::text
                ELSE NULL::text
            END,
            CASE
                WHEN d.commercial_tier IS NULL THEN 'not a paying tier'::text
                ELSE NULL::text
            END,
            CASE
                WHEN d.rating >= 4.5::double precision THEN 'top-rated'::text
                WHEN d.rating >= 4.0::double precision THEN 'well-rated'::text
                ELSE NULL::text
            END)), ''::text)
        END AS reason
   FROM crm_orgs o
     LEFT JOIN directory_listings d ON d.id = o.directory_listing_id;

create or replace view public.cta_by_listing as
 SELECT slug,
    COALESCE(label, source) AS cta,
    count(*) AS clicks,
    max(created_at) AS last_click
   FROM attribution_clicks
  WHERE created_at > (now() - '90 days'::interval)
  GROUP BY slug, (COALESCE(label, source));

create or replace view public.directory_coverage_by_district as
 SELECT COALESCE(district, '(unknown)'::text) AS district,
    count(*) AS total,
    count(*) FILTER (WHERE status = 'published'::text) AS published,
    count(*) FILTER (WHERE status = 'listed'::text) AS listed,
    count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL) AS with_coords,
    count(*) FILTER (WHERE image IS NOT NULL AND image <> ''::text OR source_image IS NOT NULL AND source_image <> ''::text) AS with_image,
    count(*) FILTER (WHERE rating IS NOT NULL) AS with_rating,
    round(100.0 * count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_coords,
    round(100.0 * count(*) FILTER (WHERE image IS NOT NULL AND image <> ''::text OR source_image IS NOT NULL AND source_image <> ''::text)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_image,
    round(100.0 * count(*) FILTER (WHERE rating IS NOT NULL)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_rating
   FROM directory_listings
  WHERE status = ANY (ARRAY['published'::text, 'listed'::text])
  GROUP BY (COALESCE(district, '(unknown)'::text))
  ORDER BY (count(*)) DESC;

create or replace view public.directory_coverage_by_group as
 SELECT COALESCE(canonical_category, category_group, '(uncategorised)'::text) AS category_group,
    count(*) AS total,
    count(*) FILTER (WHERE status = 'published'::text) AS published,
    count(*) FILTER (WHERE status = 'listed'::text) AS listed,
    count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL) AS with_coords,
    count(*) FILTER (WHERE COALESCE(phone, email, url) IS NOT NULL) AS with_contact,
    count(*) FILTER (WHERE image IS NOT NULL AND image <> ''::text OR source_image IS NOT NULL AND source_image <> ''::text) AS with_image,
    count(*) FILTER (WHERE rating IS NOT NULL) AS with_rating,
    count(*) FILTER (WHERE verified) AS verified,
    round(100.0 * count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_coords,
    round(100.0 * count(*) FILTER (WHERE COALESCE(phone, email, url) IS NOT NULL)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_contact,
    round(100.0 * count(*) FILTER (WHERE image IS NOT NULL AND image <> ''::text OR source_image IS NOT NULL AND source_image <> ''::text)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_image,
    round(100.0 * count(*) FILTER (WHERE rating IS NOT NULL)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_rating,
    round(100.0 * count(*) FILTER (WHERE verified)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_verified,
    percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY ((EXTRACT(epoch FROM now() - COALESCE(fetched_at, updated_at, created_at)) / 86400::numeric)::double precision))::integer AS median_age_days
   FROM directory_listings
  WHERE status = ANY (ARRAY['published'::text, 'listed'::text])
  GROUP BY (COALESCE(canonical_category, category_group, '(uncategorised)'::text))
  ORDER BY (count(*)) DESC;

create or replace view public.directory_coverage_cells as
 SELECT COALESCE(canonical_category, category_group, '(uncategorised)'::text) AS category_group,
    COALESCE(district, '(unknown)'::text) AS district,
    count(*) AS total,
    count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL) AS with_coords,
    count(*) FILTER (WHERE image IS NOT NULL AND image <> ''::text OR source_image IS NOT NULL AND source_image <> ''::text) AS with_image
   FROM directory_listings
  WHERE status = ANY (ARRAY['published'::text, 'listed'::text])
  GROUP BY (COALESCE(canonical_category, category_group, '(uncategorised)'::text)), (COALESCE(district, '(unknown)'::text));

create or replace view public.directory_coverage_overall as
 SELECT count(*) AS total,
    count(*) FILTER (WHERE status = 'published'::text) AS published,
    count(*) FILTER (WHERE status = 'listed'::text) AS listed,
    count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL) AS with_coords,
    count(*) FILTER (WHERE COALESCE(phone, email, url) IS NOT NULL) AS with_contact,
    count(*) FILTER (WHERE image IS NOT NULL AND image <> ''::text OR source_image IS NOT NULL AND source_image <> ''::text) AS with_image,
    count(*) FILTER (WHERE rating IS NOT NULL) AS with_rating,
    count(*) FILTER (WHERE verified) AS verified,
    count(*) FILTER (WHERE featured) AS featured,
    round(100.0 * count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_coords,
    round(100.0 * count(*) FILTER (WHERE COALESCE(phone, email, url) IS NOT NULL)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_contact,
    round(100.0 * count(*) FILTER (WHERE image IS NOT NULL AND image <> ''::text OR source_image IS NOT NULL AND source_image <> ''::text)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_image,
    round(100.0 * count(*) FILTER (WHERE rating IS NOT NULL)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_rating,
    round(100.0 * count(*) FILTER (WHERE verified)::numeric / GREATEST(count(*), 1::bigint)::numeric, 0) AS pct_verified
   FROM directory_listings
  WHERE status = ANY (ARRAY['published'::text, 'listed'::text]);

create or replace view public.editorial_coverage with (security_invoker=on) as
 SELECT key AS section_key,
    name AS section_name,
    parent_key AS department_key,
    dir_groups,
    ( SELECT count(*) AS count
           FROM directory_listings dl
          WHERE (dl.canonical_category = ANY (s.dir_groups)) AND (dl.status = ANY (ARRAY['published'::text, 'listed'::text]))) AS candidates,
    ( SELECT count(DISTINCT bp.subject_listing_id) AS count
           FROM blog_posts bp
          WHERE bp.status = 'published'::text AND bp.subject_listing_id IS NOT NULL AND (bp.subcategory = s.key OR bp.category = s.key)) AS featured
   FROM editorial_sections s
  WHERE parent_key IS NOT NULL AND active AND array_length(dir_groups, 1) IS NOT NULL
  ORDER BY sort;

create or replace view public.editorial_plan with (security_invoker=on) as
 WITH pub AS (
         SELECT s_1.key AS section_key,
            count(bp.id) FILTER (WHERE bp.status = 'published'::text AND bp.published_at >= date_trunc('month'::text, now()) AND bp.published_at < (date_trunc('month'::text, now()) + '1 mon'::interval)) AS published_mtd,
            count(bp.id) FILTER (WHERE bp.status = 'published'::text) AS published_total
           FROM editorial_sections s_1
             LEFT JOIN blog_posts bp ON bp.subcategory = s_1.key OR bp.category = s_1.key
          WHERE s_1.parent_key IS NOT NULL AND s_1.active
          GROUP BY s_1.key
        ), idea AS (
         SELECT COALESCE(editorial_ideas.subcategory_key, editorial_ideas.section_key) AS section_key,
            count(*) FILTER (WHERE editorial_ideas.status = ANY (ARRAY['suggested'::text, 'approved'::text, 'assigned'::text, 'drafting'::text, 'scheduled'::text])) AS ideas_open,
            count(*) FILTER (WHERE editorial_ideas.status = 'suggested'::text) AS ideas_suggested
           FROM editorial_ideas
          GROUP BY (COALESCE(editorial_ideas.subcategory_key, editorial_ideas.section_key))
        )
 SELECT s.key AS section_key,
    s.name AS section_name,
    s.parent_key AS department_key,
    d.name AS department_name,
    s.sort,
    s.monthly_target,
    s.franchise_key,
    COALESCE(pub.published_mtd, 0::bigint) AS published_mtd,
    COALESCE(pub.published_total, 0::bigint) AS published_total,
    COALESCE(idea.ideas_open, 0::bigint) AS ideas_open,
    COALESCE(idea.ideas_suggested, 0::bigint) AS ideas_suggested,
    GREATEST(s.monthly_target - COALESCE(pub.published_mtd, 0::bigint) - COALESCE(idea.ideas_open, 0::bigint), 0::bigint) AS gap
   FROM editorial_sections s
     JOIN editorial_sections d ON d.key = s.parent_key
     LEFT JOIN pub ON pub.section_key = s.key
     LEFT JOIN idea ON idea.section_key = s.key
  WHERE s.parent_key IS NOT NULL AND s.active
  ORDER BY s.sort;

create or replace view public.error_log_grouped as
 SELECT fingerprint,
    max(source) AS source,
    max(level) AS level,
    (array_agg(message ORDER BY created_at DESC))[1] AS sample_message,
    count(*) AS occurrences,
    min(created_at) AS first_seen,
    max(created_at) AS last_seen
   FROM error_log
  WHERE created_at > (now() - '30 days'::interval)
  GROUP BY fingerprint
  ORDER BY (count(*)) DESC, (max(created_at)) DESC;

create or replace view public.job_queue_stats as
 SELECT status,
    count(*) AS n,
    min(run_after) FILTER (WHERE status = 'pending'::text) AS next_due,
    max(updated_at) AS last_update
   FROM job_queue
  GROUP BY status;

create or replace view public.listing_recommendations as
 SELECT slug,
    count(*) AS impressions,
    max(created_at) AS last_recommended
   FROM ( SELECT unnest(concierge_events.recommended) AS slug,
            concierge_events.created_at
           FROM concierge_events
          WHERE concierge_events.created_at > (now() - '90 days'::interval) AND concierge_events.recommended IS NOT NULL) s
  WHERE slug IS NOT NULL AND slug <> ''::text
  GROUP BY slug;

create or replace view public.listing_attribution as
 SELECT d.slug,
    d.name_en AS name,
    d.district,
    d.type,
    d.featured,
    COALESCE(r.impressions, 0::bigint) AS impressions,
    COALESCE(c.clicks, 0::bigint) AS clicks,
        CASE
            WHEN COALESCE(r.impressions, 0::bigint) > 0 THEN round(100.0 * COALESCE(c.clicks, 0::bigint)::numeric / r.impressions::numeric, 1)
            ELSE 0::numeric
        END AS ctr_pct,
    r.last_recommended
   FROM directory_listings d
     LEFT JOIN listing_recommendations r ON r.slug = d.slug
     LEFT JOIN ( SELECT attribution_clicks.slug,
            count(*) AS clicks
           FROM attribution_clicks
          WHERE attribution_clicks.created_at > (now() - '90 days'::interval)
          GROUP BY attribution_clicks.slug) c ON c.slug = d.slug
  WHERE d.status = 'published'::text AND (COALESCE(r.impressions, 0::bigint) > 0 OR COALESCE(c.clicks, 0::bigint) > 0 OR d.featured);

create or replace view public.listing_revenue as
 SELECT d.slug,
    d.name_en AS name,
    d.district,
    d.type,
    d.featured,
    o.id AS org_id,
    o.name AS advertiser,
    o.tier AS advertiser_tier,
    o.status AS advertiser_status,
    COALESCE(rev.revenue_eur, 0::numeric) AS revenue_eur,
    COALESCE(rev.orders, 0::bigint) AS orders,
    rev.last_order_at,
    COALESCE(deal.won_eur, 0::numeric) AS won_eur,
    COALESCE(deal.pipeline_eur, 0::numeric) AS pipeline_eur,
    COALESCE(pl.active_placements, 0::bigint) AS active_placements,
    COALESCE(rec.impressions, 0::bigint) AS impressions,
    COALESCE(clk.clicks, 0::bigint) AS clicks,
        CASE
            WHEN COALESCE(clk.clicks, 0::bigint) > 0 THEN round(COALESCE(rev.revenue_eur, 0::numeric) / clk.clicks::numeric, 2)
            ELSE NULL::numeric
        END AS revenue_per_click
   FROM directory_listings d
     JOIN crm_orgs o ON o.directory_listing_id = d.id
     LEFT JOIN ( SELECT ad_orders.org_id,
            sum(COALESCE(ad_orders.amount, 0::numeric)) AS revenue_eur,
            count(*) AS orders,
            max(ad_orders.created_at) AS last_order_at
           FROM ad_orders
          WHERE (ad_orders.status = ANY (ARRAY['paid'::text, 'active'::text])) AND ad_orders.org_id IS NOT NULL
          GROUP BY ad_orders.org_id) rev ON rev.org_id = o.id
     LEFT JOIN ( SELECT crm_deals.org_id,
            sum(COALESCE(crm_deals.value_eur, 0::numeric)) FILTER (WHERE crm_deals.stage = ANY (ARRAY['won'::text, 'live'::text, 'renewal'::text])) AS won_eur,
            sum(COALESCE(crm_deals.value_eur, 0::numeric)) FILTER (WHERE crm_deals.stage = ANY (ARRAY['prospect'::text, 'contacted'::text, 'engaged'::text, 'proposal'::text])) AS pipeline_eur
           FROM crm_deals
          WHERE crm_deals.org_id IS NOT NULL
          GROUP BY crm_deals.org_id) deal ON deal.org_id = o.id
     LEFT JOIN ( SELECT sponsor_banners.org_id,
            count(*) AS active_placements
           FROM sponsor_banners
          WHERE sponsor_banners.is_active AND sponsor_banners.org_id IS NOT NULL
          GROUP BY sponsor_banners.org_id) pl ON pl.org_id = o.id
     LEFT JOIN listing_recommendations rec ON rec.slug = d.slug
     LEFT JOIN ( SELECT attribution_clicks.slug,
            count(*) AS clicks
           FROM attribution_clicks
          WHERE attribution_clicks.created_at > (now() - '90 days'::interval)
          GROUP BY attribution_clicks.slug) clk ON clk.slug = d.slug
  WHERE d.status = 'published'::text
  ORDER BY (COALESCE(rev.revenue_eur, 0::numeric)) DESC, (COALESCE(deal.won_eur, 0::numeric)) DESC, (COALESCE(clk.clicks, 0::bigint)) DESC;

create or replace view public.mailroom_stats as
 SELECT count(*) FILTER (WHERE resolved_at IS NULL AND status <> 'archived'::text) AS open,
    count(*) FILTER (WHERE resolved_at IS NULL AND status <> 'archived'::text AND first_response_at IS NULL AND sla_due < now()) AS breached,
    count(*) FILTER (WHERE resolved_at IS NULL AND status <> 'archived'::text AND first_response_at IS NULL AND sla_due >= now() AND sla_due < (now() + '04:00:00'::interval)) AS due_soon,
    count(*) FILTER (WHERE resolved_at >= (now() - '7 days'::interval)) AS resolved_7d,
    count(*) FILTER (WHERE first_response_at IS NOT NULL AND created_at >= (now() - '30 days'::interval)) AS responded_30d,
    percentile_cont(0.5::double precision) WITHIN GROUP (ORDER BY ((EXTRACT(epoch FROM first_response_at - created_at) / 3600.0)::double precision)) FILTER (WHERE first_response_at IS NOT NULL AND created_at >= (now() - '30 days'::interval))::numeric(10,1) AS median_first_response_h
   FROM inbound_emails;

create or replace view public.mailroom_tickets as
 SELECT id,
    created_at,
    from_email,
    from_name,
    to_email,
    subject,
    desk,
    assignee,
    priority,
    sla_due,
    first_response_at,
    thread_key,
    status,
        CASE
            WHEN first_response_at IS NOT NULL THEN 'responded'::text
            WHEN sla_due < now() THEN 'breached'::text
            WHEN sla_due < (now() + '04:00:00'::interval) THEN 'due_soon'::text
            ELSE 'on_track'::text
        END AS sla_state
   FROM inbound_emails
  WHERE resolved_at IS NULL AND status <> 'archived'::text
  ORDER BY (
        CASE priority
            WHEN 'urgent'::text THEN 0
            WHEN 'high'::text THEN 1
            WHEN 'normal'::text THEN 2
            ELSE 3
        END), sla_due;

-- ===== Triggers (all enabled, tgenabled='O') =====
drop trigger if exists set_updated_at on public.ad_pricing;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.ad_pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists automation_settings_singleton on public.automation_settings;
CREATE TRIGGER automation_settings_singleton BEFORE INSERT ON public.automation_settings FOR EACH ROW EXECUTE FUNCTION automation_settings_singleton();
drop trigger if exists mark_scraped_article_processed on public.blog_posts;
CREATE TRIGGER mark_scraped_article_processed AFTER INSERT ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION mark_scraped_article_processed();
drop trigger if exists set_updated_at on public.blog_posts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists trg_set_reading_time on public.blog_posts;
CREATE TRIGGER trg_set_reading_time BEFORE INSERT OR UPDATE OF content_en ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION set_reading_time();
drop trigger if exists set_updated_at on public.column_jobs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.column_jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at on public.contacts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_crm_contacts on public.crm_contacts;
CREATE TRIGGER set_updated_at_crm_contacts BEFORE UPDATE ON public.crm_contacts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_crm_deals on public.crm_deals;
CREATE TRIGGER set_updated_at_crm_deals BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_crm_enrollments on public.crm_enrollments;
CREATE TRIGGER set_updated_at_crm_enrollments BEFORE UPDATE ON public.crm_enrollments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_crm_orgs on public.crm_orgs;
CREATE TRIGGER set_updated_at_crm_orgs BEFORE UPDATE ON public.crm_orgs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_crm_settings on public.crm_settings;
CREATE TRIGGER set_updated_at_crm_settings BEFORE UPDATE ON public.crm_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_crm_templates on public.crm_templates;
CREATE TRIGGER set_updated_at_crm_templates BEFORE UPDATE ON public.crm_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_directory on public.directory_listings;
CREATE TRIGGER set_updated_at_directory BEFORE UPDATE ON public.directory_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists trg_crm_sync_dir on public.directory_listings;
CREATE TRIGGER trg_crm_sync_dir AFTER INSERT ON public.directory_listings FOR EACH ROW EXECUTE FUNCTION crm_sync_directory_account();
drop trigger if exists set_updated_at on public.editor_drafts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.editor_drafts FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at on public.editorial_field_notes;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.editorial_field_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at on public.editorial_ideas;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.editorial_ideas FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_editorial on public.editorial_pieces;
CREATE TRIGGER set_updated_at_editorial BEFORE UPDATE ON public.editorial_pieces FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at on public.editorial_sections;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.editorial_sections FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_events on public.events;
CREATE TRIGGER set_updated_at_events BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_fulfillment_tasks on public.fulfillment_tasks;
CREATE TRIGGER set_updated_at_fulfillment_tasks BEFORE UPDATE ON public.fulfillment_tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at_newsletter_sponsors on public.newsletter_sponsors;
CREATE TRIGGER set_updated_at_newsletter_sponsors BEFORE UPDATE ON public.newsletter_sponsors FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists on_subscriber_created on public.newsletter_subscribers;
CREATE TRIGGER on_subscriber_created AFTER INSERT ON public.newsletter_subscribers FOR EACH ROW EXECUTE FUNCTION sync_subscriber_to_contacts();
drop trigger if exists set_updated_at on public.profiles;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at on public.site_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
drop trigger if exists set_updated_at on public.sponsor_banners;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.sponsor_banners FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ===== Row level security (enabled on all 85 tables; none FORCEd) =====
alter table public.activities enable row level security;
alter table public.ad_inquiries enable row level security;
alter table public.ad_leads enable row level security;
alter table public.ad_orders enable row level security;
alter table public.ad_pricing enable row level security;
alter table public.ai_spend_log enable row level security;
alter table public.atlas_descriptions enable row level security;
alter table public.atlas_import enable row level security;
alter table public.attribution_clicks enable row level security;
alter table public.authors enable row level security;
alter table public.automation_settings enable row level security;
alter table public.blog_comments enable row level security;
alter table public.blog_posts enable row level security;
alter table public.column_jobs enable row level security;
alter table public.comments enable row level security;
alter table public.concierge_coverage enable row level security;
alter table public.concierge_evals enable row level security;
alter table public.concierge_events enable row level security;
alter table public.concierge_members enable row level security;
alter table public.concierge_memory enable row level security;
alter table public.concierge_requests enable row level security;
alter table public.concierge_tg_threads enable row level security;
alter table public.concierge_wa_threads enable row level security;
alter table public.contact_messages enable row level security;
alter table public.contacts enable row level security;
alter table public.county_quotas enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.crm_deals enable row level security;
alter table public.crm_enrollments enable row level security;
alter table public.crm_hooks enable row level security;
alter table public.crm_orgs enable row level security;
alter table public.crm_settings enable row level security;
alter table public.crm_suppression enable row level security;
alter table public.crm_templates enable row level security;
alter table public.data_processing_register enable row level security;
alter table public.directory_claims enable row level security;
alter table public.directory_embeddings enable row level security;
alter table public.directory_leads enable row level security;
alter table public.directory_listing_edits enable row level security;
alter table public.directory_listings enable row level security;
alter table public.directory_listings_coords_backup_20260928 enable row level security;
alter table public.directory_owner_tokens enable row level security;
alter table public.directory_reviews enable row level security;
alter table public.dsar_erasure_log enable row level security;
alter table public.dsar_requests enable row level security;
alter table public.editor_drafts enable row level security;
alter table public.editor_tokens enable row level security;
alter table public.editorial_field_notes enable row level security;
alter table public.editorial_ideas enable row level security;
alter table public.editorial_pieces enable row level security;
alter table public.editorial_sections enable row level security;
alter table public.error_log enable row level security;
alter table public.events enable row level security;
alter table public.fulfillment_tasks enable row level security;
alter table public.generation_logs enable row level security;
alter table public.geocode_cache enable row level security;
alter table public.inbound_emails enable row level security;
alter table public.job_queue enable row level security;
alter table public.kb_candidates enable row level security;
alter table public.kb_docs enable row level security;
alter table public.kb_embeddings enable row level security;
alter table public.listing_claims enable row level security;
alter table public.listing_edit_requests enable row level security;
alter table public.membership_restore_tokens enable row level security;
alter table public.newsletter_campaigns enable row level security;
alter table public.newsletter_sponsors enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.profiles enable row level security;
alter table public.regulation_alerts enable row level security;
alter table public.regulation_snapshots enable row level security;
alter table public.rewrite_jobs enable row level security;
alter table public.rss_sources enable row level security;
alter table public.saved_items enable row level security;
alter table public.scrape_sources enable row level security;
alter table public.scraped_articles enable row level security;
alter table public.section_sponsors enable row level security;
alter table public.section_views enable row level security;
alter table public.site_analytics enable row level security;
alter table public.site_settings enable row level security;
alter table public.social_posts enable row level security;
alter table public.sponsor_banners enable row level security;
alter table public.stripe_events enable row level security;
alter table public.user_roles enable row level security;
alter table public.webcams enable row level security;

-- ===== Policies =====
drop policy if exists "activities admin all" on public.activities;
create policy "activities admin all" on public.activities as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "activities public read active" on public.activities;
create policy "activities public read active" on public.activities as permissive for select to anon,authenticated using (status = 'active'::text);
drop policy if exists "admins_manage_ad_inquiries" on public.ad_inquiries;
create policy "admins_manage_ad_inquiries" on public.ad_inquiries as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "admins_manage_ad_leads" on public.ad_leads;
create policy "admins_manage_ad_leads" on public.ad_leads as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "admins_manage_ad_orders" on public.ad_orders;
create policy "admins_manage_ad_orders" on public.ad_orders as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Public can read pricing" on public.ad_pricing;
create policy "Public can read pricing" on public.ad_pricing as permissive for select to anon,authenticated using (true);
drop policy if exists "admins_manage_ad_pricing" on public.ad_pricing;
create policy "admins_manage_ad_pricing" on public.ad_pricing as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "ai_spend_log admin read" on public.ai_spend_log;
create policy "ai_spend_log admin read" on public.ai_spend_log as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "attribution_clicks admin read" on public.attribution_clicks;
create policy "attribution_clicks admin read" on public.attribution_clicks as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "attribution_clicks insert" on public.attribution_clicks;
create policy "attribution_clicks insert" on public.attribution_clicks as permissive for insert to anon,authenticated with check (true);
drop policy if exists "admins_manage_authors" on public.authors;
create policy "admins_manage_authors" on public.authors as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "authors_public_read" on public.authors;
create policy "authors_public_read" on public.authors as permissive for select to public using (active = true);
drop policy if exists "Admins manage automation_settings" on public.automation_settings;
create policy "Admins manage automation_settings" on public.automation_settings as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage comments" on public.blog_comments;
create policy "Admins manage comments" on public.blog_comments as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Public can read approved blog comments" on public.blog_comments;
create policy "Public can read approved blog comments" on public.blog_comments as permissive for select to anon,authenticated using (status = 'approved'::text);
drop policy if exists "Public can read approved comments" on public.blog_comments;
create policy "Public can read approved comments" on public.blog_comments as permissive for select to anon,authenticated using (status = 'approved'::text);
drop policy if exists "Admins manage all posts" on public.blog_posts;
create policy "Admins manage all posts" on public.blog_posts as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Public can read published posts" on public.blog_posts;
create policy "Public can read published posts" on public.blog_posts as permissive for select to anon,authenticated using (status = 'published'::text);
drop policy if exists "Admins manage column jobs" on public.column_jobs;
create policy "Admins manage column jobs" on public.column_jobs as permissive for all to public using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage comments" on public.comments;
create policy "Admins manage comments" on public.comments as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Anyone can read approved comments" on public.comments;
create policy "Anyone can read approved comments" on public.comments as permissive for select to anon,authenticated using (is_approved = true);
drop policy if exists "concierge_coverage admin" on public.concierge_coverage;
create policy "concierge_coverage admin" on public.concierge_coverage as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "concierge_evals admin" on public.concierge_evals;
create policy "concierge_evals admin" on public.concierge_evals as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "concierge_events admin" on public.concierge_events;
create policy "concierge_events admin" on public.concierge_events as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "concierge_requests admin read" on public.concierge_requests;
create policy "concierge_requests admin read" on public.concierge_requests as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "concierge_requests admin update" on public.concierge_requests;
create policy "concierge_requests admin update" on public.concierge_requests as permissive for update to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage contacts" on public.contact_messages;
create policy "Admins manage contacts" on public.contact_messages as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage contacts table" on public.contacts;
create policy "Admins manage contacts table" on public.contacts as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "admins_manage_county_quotas" on public.county_quotas;
create policy "admins_manage_county_quotas" on public.county_quotas as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "crm admin all" on public.crm_activities;
create policy "crm admin all" on public.crm_activities as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "crm admin all" on public.crm_contacts;
create policy "crm admin all" on public.crm_contacts as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "crm admin all" on public.crm_deals;
create policy "crm admin all" on public.crm_deals as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "crm admin all" on public.crm_enrollments;
create policy "crm admin all" on public.crm_enrollments as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "crm admin all" on public.crm_hooks;
create policy "crm admin all" on public.crm_hooks as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "crm admin all" on public.crm_orgs;
create policy "crm admin all" on public.crm_orgs as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "crm admin all" on public.crm_settings;
create policy "crm admin all" on public.crm_settings as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "crm admin all" on public.crm_suppression;
create policy "crm admin all" on public.crm_suppression as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "crm admin all" on public.crm_templates;
create policy "crm admin all" on public.crm_templates as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "dpr admin write" on public.data_processing_register;
create policy "dpr admin write" on public.data_processing_register as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "dpr read all" on public.data_processing_register;
create policy "dpr read all" on public.data_processing_register as permissive for select to anon,authenticated using (true);
drop policy if exists "directory admin write" on public.directory_listings;
create policy "directory admin write" on public.directory_listings as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "directory public read" on public.directory_listings;
create policy "directory public read" on public.directory_listings as permissive for select to anon,authenticated using (status = 'published'::text);
drop policy if exists "dsar_erasure_log admin" on public.dsar_erasure_log;
create policy "dsar_erasure_log admin" on public.dsar_erasure_log as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "dsar_requests admin" on public.dsar_requests;
create policy "dsar_requests admin" on public.dsar_requests as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "admins_manage_editor_drafts" on public.editor_drafts;
create policy "admins_manage_editor_drafts" on public.editor_drafts as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "admins_manage_editor_tokens" on public.editor_tokens;
create policy "admins_manage_editor_tokens" on public.editor_tokens as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage field notes" on public.editorial_field_notes;
create policy "Admins manage field notes" on public.editorial_field_notes as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage ideas" on public.editorial_ideas;
create policy "Admins manage ideas" on public.editorial_ideas as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "editorial admin all" on public.editorial_pieces;
create policy "editorial admin all" on public.editorial_pieces as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage sections" on public.editorial_sections;
create policy "Admins manage sections" on public.editorial_sections as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Public can read active sections" on public.editorial_sections;
create policy "Public can read active sections" on public.editorial_sections as permissive for select to anon,authenticated using (active OR has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "error_log admin" on public.error_log;
create policy "error_log admin" on public.error_log as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "events admin write" on public.events;
create policy "events admin write" on public.events as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "events public read" on public.events;
create policy "events public read" on public.events as permissive for select to anon,authenticated using (status = 'published'::text);
drop policy if exists "fulfil admin all" on public.fulfillment_tasks;
create policy "fulfil admin all" on public.fulfillment_tasks as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "admins_read_genlogs" on public.generation_logs;
create policy "admins_read_genlogs" on public.generation_logs as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "geocode_cache admin" on public.geocode_cache;
create policy "geocode_cache admin" on public.geocode_cache as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "inbound_emails admin read" on public.inbound_emails;
create policy "inbound_emails admin read" on public.inbound_emails as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "inbound_emails admin update" on public.inbound_emails;
create policy "inbound_emails admin update" on public.inbound_emails as permissive for update to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "job_queue admin" on public.job_queue;
create policy "job_queue admin" on public.job_queue as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "kb_candidates admin" on public.kb_candidates;
create policy "kb_candidates admin" on public.kb_candidates as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "listing_claims admin" on public.listing_claims;
create policy "listing_claims admin" on public.listing_claims as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "listing_edit_requests admin" on public.listing_edit_requests;
create policy "listing_edit_requests admin" on public.listing_edit_requests as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage campaigns" on public.newsletter_campaigns;
create policy "Admins manage campaigns" on public.newsletter_campaigns as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "fulfil admin all" on public.newsletter_sponsors;
create policy "fulfil admin all" on public.newsletter_sponsors as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage subscribers" on public.newsletter_subscribers;
create policy "Admins manage subscribers" on public.newsletter_subscribers as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins read all profiles" on public.profiles;
create policy "Admins read all profiles" on public.profiles as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles as permissive for select to authenticated using (id = auth.uid());
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile" on public.profiles as permissive for update to authenticated using (id = auth.uid());
drop policy if exists "regulation_alerts admin" on public.regulation_alerts;
create policy "regulation_alerts admin" on public.regulation_alerts as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "regulation_snapshots admin" on public.regulation_snapshots;
create policy "regulation_snapshots admin" on public.regulation_snapshots as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage rewrite jobs" on public.rewrite_jobs;
create policy "Admins manage rewrite jobs" on public.rewrite_jobs as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage rss sources" on public.rss_sources;
create policy "Admins manage rss sources" on public.rss_sources as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "saved_items admin" on public.saved_items;
create policy "saved_items admin" on public.saved_items as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "scrape_sources admin" on public.scrape_sources;
create policy "scrape_sources admin" on public.scrape_sources as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage scraped articles" on public.scraped_articles;
create policy "Admins manage scraped articles" on public.scraped_articles as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage section sponsors" on public.section_sponsors;
create policy "Admins manage section sponsors" on public.section_sponsors as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins read section views" on public.section_views;
create policy "Admins read section views" on public.section_views as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins read analytics" on public.site_analytics;
create policy "Admins read analytics" on public.site_analytics as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins manage settings" on public.site_settings;
create policy "Admins manage settings" on public.site_settings as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Public can read settings" on public.site_settings;
create policy "Public can read settings" on public.site_settings as permissive for select to anon,authenticated using (true);
drop policy if exists "social_posts_admin_all" on public.social_posts;
create policy "social_posts_admin_all" on public.social_posts as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Public can read active banners" on public.sponsor_banners;
create policy "Public can read active banners" on public.sponsor_banners as permissive for select to anon,authenticated using ((is_active = true) AND ((start_date IS NULL) OR (start_date <= CURRENT_DATE)) AND ((end_date IS NULL) OR (end_date >= CURRENT_DATE)));
drop policy if exists "admins_manage_sponsor_banners" on public.sponsor_banners;
create policy "admins_manage_sponsor_banners" on public.sponsor_banners as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins can delete roles" on public.user_roles;
create policy "Admins can delete roles" on public.user_roles as permissive for delete to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins can insert roles" on public.user_roles;
create policy "Admins can insert roles" on public.user_roles as permissive for insert to authenticated with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins can read all roles" on public.user_roles;
create policy "Admins can read all roles" on public.user_roles as permissive for select to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Admins can update roles" on public.user_roles;
create policy "Admins can update roles" on public.user_roles as permissive for update to authenticated using (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "Users can read own role" on public.user_roles;
create policy "Users can read own role" on public.user_roles as permissive for select to authenticated using (user_id = auth.uid());
drop policy if exists "webcams admin all" on public.webcams;
create policy "webcams admin all" on public.webcams as permissive for all to authenticated using (has_role(auth.uid(), 'admin'::app_role)) with check (has_role(auth.uid(), 'admin'::app_role));
drop policy if exists "webcams public read published" on public.webcams;
create policy "webcams public read published" on public.webcams as permissive for select to anon,authenticated using (status = 'published'::text);

-- ===== Grants (only deviations from Supabase default privileges) =====
-- Supabase default privileges give anon/authenticated/service_role ALL on new tables/views and
-- EXECUTE (via PUBLIC and explicit grants) on new functions. Below is the CURRENT LIVE state as of 2026-10-05.
-- NOTE: a hotfix migration that REVOKEs EXECUTE on many functions from anon/authenticated may or may not
-- be applied yet; the live DB shows it is NOT applied (only ai_spend_since is locked down; 7 functions had
-- anon/authenticated revoked but still carry the implicit PUBLIC execute grant). This file records the live state as-is.

-- Tables
revoke all on table public.membership_restore_tokens from anon, authenticated;

-- Views: anon has no privileges on any view except blog_comments_public
revoke all on table public.advertiser_roi from anon;
revoke all on table public.ai_spend_by_function_daily from anon;
revoke all on table public.ai_spend_by_month from anon;
revoke all on table public.ai_spend_daily from anon;
revoke all on table public.ai_spend_total from anon;
revoke all on table public.concierge_coverage_daily from anon;
revoke all on table public.concierge_coverage_summary from anon;
revoke all on table public.concierge_coverage_topics from anon;
revoke all on table public.concierge_eval_summary from anon;
revoke all on table public.crm_prospect_scores from anon;
revoke all on table public.cta_by_listing from anon;
revoke all on table public.directory_coverage_by_district from anon;
revoke all on table public.directory_coverage_by_group from anon;
revoke all on table public.directory_coverage_cells from anon;
revoke all on table public.directory_coverage_overall from anon;
revoke all on table public.editorial_coverage from anon;
revoke all on table public.editorial_plan from anon;
revoke all on table public.error_log_grouped from anon;
revoke all on table public.job_queue_stats from anon;
revoke all on table public.listing_recommendations from anon;
revoke all on table public.listing_attribution from anon;
revoke all on table public.listing_revenue from anon;
revoke all on table public.mailroom_stats from anon;
revoke all on table public.mailroom_tickets from anon;

-- Functions
-- Fully locked down (PUBLIC, anon, authenticated revoked; postgres + service_role keep EXECUTE):
revoke execute on function public.ai_spend_since(timestamp with time zone) from public, anon, authenticated;
-- anon + authenticated revoked, but PUBLIC EXECUTE still granted live (so still callable by anon/authenticated through PUBLIC):
revoke execute on function public.crm_sync_directory_account() from anon, authenticated;
revoke execute on function public.crm_upsert_account(text, text, text, text, text) from anon, authenticated;
revoke execute on function public.fulfil_ad_order(uuid) from anon, authenticated;
revoke execute on function public.get_analytics_data(text) from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
revoke execute on function public.sweep_stuck_rewrite_jobs() from anon, authenticated;
revoke execute on function public.sync_subscriber_to_contacts() from anon, authenticated;
-- All other 34 functions: Supabase defaults (PUBLIC + anon + authenticated + service_role may EXECUTE).

-- ===== Cross-schema objects (captured from the live project; guarded so the file still runs on plain PostgreSQL) =====

-- Sign-up -> profiles: the trigger lives in the auth schema, which this file otherwise does not touch.
do $$ begin
  if to_regclass('auth.users') is not null
     and not exists (select 1 from pg_trigger where tgrelid = 'auth.users'::regclass and tgname = 'on_auth_user_created') then
    create trigger on_auth_user_created after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end $$;

-- Storage buckets (public image buckets) and the access policies on storage.objects.
-- Only the `blog-images` bucket has object policies: public read, admin-only write/update/delete.
-- Uploads to `listings` go through the server (service role), which bypasses RLS.
do $$ begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
      ('blog-images', 'blog-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif','image/avif']),
      ('listings',    'listings',    true, null,     null)
    on conflict (id) do update
      set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
  end if;
  if to_regclass('storage.objects') is not null then
    drop policy if exists "blog-images public read"  on storage.objects;
    drop policy if exists "blog-images admin insert" on storage.objects;
    drop policy if exists "blog-images admin update" on storage.objects;
    drop policy if exists "blog-images admin delete" on storage.objects;
    create policy "blog-images public read" on storage.objects as permissive for select to public
      using (bucket_id = 'blog-images');
    create policy "blog-images admin insert" on storage.objects as permissive for insert to authenticated
      with check (bucket_id = 'blog-images' and public.has_role(auth.uid(), 'admin'::public.app_role));
    create policy "blog-images admin update" on storage.objects as permissive for update to authenticated
      using (bucket_id = 'blog-images' and public.has_role(auth.uid(), 'admin'::public.app_role))
      with check (bucket_id = 'blog-images' and public.has_role(auth.uid(), 'admin'::public.app_role));
    create policy "blog-images admin delete" on storage.objects as permissive for delete to authenticated
      using (bucket_id = 'blog-images' and public.has_role(auth.uid(), 'admin'::public.app_role));
  end if;
end $$;

-- pg_cron jobs are NOT created here (they contain the site URL and a secret): see supabase/pg_cron/schedule.sql.
-- End of baseline.
