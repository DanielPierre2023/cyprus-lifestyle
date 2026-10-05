-- 20261005160000_member_accounts.sql
-- Phase 1 · Increment 1.4 — member accounts (email-link sign-in), lapse bookkeeping.
-- Idempotent; adds one table and three nullable columns. Changes no existing data.
-- Run in: Supabase → SQL Editor.
--
-- HOW SIGN-IN WORKS (no Supabase Auth, no passwords)
--   A member asks for a sign-in link; the single-use, 30-minute link (the same mechanism as the existing "restore membership"
--   link, table membership_restore_tokens) proves they control the mailbox, and the server then opens a SESSION: a random
--   token in an HttpOnly cookie, of which only the SHA-256 hash is stored here. Members therefore never become Supabase
--   Auth users, so "Allow new users to sign up" can stay OFF and no member can ever touch admin data.
--   The table is written and read only by the server (RLS on, deliberately no policy).

create table if not exists public.member_sessions (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid not null references public.concierge_members (id) on delete cascade,
  token_hash   text not null,                           -- hex sha256 of the cookie value; never the value itself
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at   timestamptz not null,
  user_agent   text                                      -- first 160 characters, so a member can recognise their devices
);
create unique index if not exists member_sessions_hash_key   on public.member_sessions (token_hash);
create index        if not exists member_sessions_member_idx  on public.member_sessions (member_id);
create index        if not exists member_sessions_expires_idx on public.member_sessions (expires_at);

alter table public.member_sessions enable row level security;
revoke all on public.member_sessions from public, anon, authenticated;
grant all on public.member_sessions to service_role;

alter table public.concierge_members
  add column if not exists last_login_at timestamptz,    -- last time the member signed in to /account
  add column if not exists lapsed_at     timestamptz,    -- when the membership stopped giving benefits (cancelled / unpaid)
  add column if not exists locale        text;           -- the edition the member joined from (for e-mails)

-- VERIFY:  select column_name from information_schema.columns where table_name = 'concierge_members' and column_name in ('last_login_at','lapsed_at','locale');   -- 3 rows
