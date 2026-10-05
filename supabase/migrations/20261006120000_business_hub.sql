-- 20261006120000_business_hub.sql
-- Phase 4 · Increment 4.1 — Business Hub: business accounts, listing links, submissions. Idempotent; additive only.
-- Run in: Supabase → SQL Editor (after 20261005170000_ops_cron_health.sql).
--
-- HOW IT WORKS (no Supabase Auth, no passwords — same approach as member accounts, 20261005160000)
--   A business asks for a sign-in link with the e-mail address that VERIFIED its listing claim (directory_listings.claim_contact,
--   provenance = 'owner-verified'). The single-use, 30-minute link proves control of that mailbox; the server then opens a SESSION:
--   a random token in an HttpOnly cookie, of which only the SHA-256 hash is stored here. Business users therefore never become
--   Supabase Auth users and can never reach admin data.
--
--   business_accounts        one row per business e-mail address (created on first successful sign-in)
--   business_listings        which listings an account may manage (derived from verified claims; re-derived at every sign-in)
--   business_login_tokens    emailed single-use links (hash only)
--   business_sessions        cookie sessions (hash only)
--   business_submissions     proposals from a business to the desk (edit / photos / news); the desk moderates them in Admin
--
--   Every table is written and read only by the server (RLS on, deliberately NO policies, no grants to anon/authenticated).
--   There are no SECURITY DEFINER functions and no triggers in this migration.

create table if not exists public.business_accounts (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,                                   -- stored lower-case by the application
  name          text,
  locale        text,                                            -- edition the business last signed in from (for e-mails)
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  last_login_at timestamptz,
  constraint business_accounts_status_chk check (status in ('active', 'disabled')),
  constraint business_accounts_email_chk  check (email = lower(email) and position('@' in email) > 1)
);
create unique index if not exists business_accounts_email_key on public.business_accounts (email);

create table if not exists public.business_listings (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.business_accounts (id) on delete cascade,
  listing_slug text not null,
  role         text not null default 'owner',
  created_at   timestamptz not null default now(),
  constraint business_listings_role_chk check (role in ('owner'))
);
create unique index if not exists business_listings_pair_key on public.business_listings (account_id, listing_slug);
create index        if not exists business_listings_slug_idx on public.business_listings (listing_slug);

create table if not exists public.business_login_tokens (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.business_accounts (id) on delete cascade,
  token_hash text not null,                                      -- hex sha256 of the emailed secret; never the secret itself
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists business_login_tokens_hash_key on public.business_login_tokens (token_hash);
create index        if not exists business_login_tokens_acct_idx on public.business_login_tokens (account_id, created_at desc);

create table if not exists public.business_sessions (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.business_accounts (id) on delete cascade,
  token_hash   text not null,                                    -- hex sha256 of the cookie value
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  user_agent   text                                              -- first 160 characters
);
create unique index if not exists business_sessions_hash_key    on public.business_sessions (token_hash);
create index        if not exists business_sessions_account_idx on public.business_sessions (account_id);
create index        if not exists business_sessions_expires_idx on public.business_sessions (expires_at);

-- A proposal from a business. kind: description | photos | news.
--   description : payload {"text": "..."}               approved → listing summary_en (same as the owner-edit queue)
--   photos      : payload {"urls": ["https://…", …]}    approved → listing owned_photos
--   news        : payload {"title","body","url"?}       approved → the desk will follow up; NOTHING is published automatically
-- status: submitted → approved | rejected | changes_requested ; changes_requested → submitted (resubmitted) ; submitted/changes_requested → withdrawn
create table if not exists public.business_submissions (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid not null references public.business_accounts (id) on delete cascade,
  listing_slug text not null,
  kind         text not null,
  payload      jsonb not null default '{}'::jsonb,
  status       text not null default 'submitted',
  desk_note    text,                                             -- the desk's reason / requested changes (English), shown to the business
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  reviewed_at  timestamptz,
  reviewed_by  text,                                             -- admin e-mail
  applied_at   timestamptz,                                      -- when an approved description/photos change was written to the listing
  constraint business_submissions_kind_chk   check (kind in ('description', 'photos', 'news')),
  constraint business_submissions_status_chk check (status in ('submitted', 'changes_requested', 'approved', 'rejected', 'withdrawn'))
);
create index if not exists business_submissions_status_idx  on public.business_submissions (status, created_at);
create index if not exists business_submissions_account_idx on public.business_submissions (account_id, created_at desc);
create index if not exists business_submissions_slug_idx    on public.business_submissions (listing_slug);

-- Server-only tables: RLS on, no policies, nothing granted to the public roles.
alter table public.business_accounts      enable row level security;
alter table public.business_listings      enable row level security;
alter table public.business_login_tokens  enable row level security;
alter table public.business_sessions      enable row level security;
alter table public.business_submissions   enable row level security;
revoke all on public.business_accounts, public.business_listings, public.business_login_tokens,
              public.business_sessions, public.business_submissions from public, anon, authenticated;
grant all on public.business_accounts, public.business_listings, public.business_login_tokens,
             public.business_sessions, public.business_submissions to service_role;

-- VERIFY:  select count(*) from information_schema.tables where table_schema = 'public' and table_name like 'business\_%';   -- 5
--          select relname from pg_class where relnamespace = 'public'::regnamespace and relname like 'business\_%' and relkind = 'r' and not relrowsecurity;   -- no rows
