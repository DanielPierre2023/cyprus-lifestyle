-- 20261004130100_membership_restore_tokens.sql
-- Email-verified restore of a paid Concierge membership on a new browser/device.
--
-- Replaces the old "type the member's email and your browser is linked" flow, which let
-- anyone who knew a member's address take over the paid membership. Now: a single-use,
-- 30-minute token is emailed to the member; only its SHA-256 hash is stored here. The
-- member opens the link, and the confirming browser's cid is bound to the membership.
-- Idempotent. Written/read only by the service role (RLS on, deliberately no policies).

create table if not exists public.membership_restore_tokens (
  id          uuid primary key default gen_random_uuid(),
  member_id   uuid not null references public.concierge_members(id) on delete cascade,
  token_hash  text not null,                       -- hex sha256 of the emailed token; never the token itself
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);

create unique index if not exists membership_restore_tokens_hash_key
  on public.membership_restore_tokens (token_hash);
create index if not exists membership_restore_tokens_member_idx
  on public.membership_restore_tokens (member_id, created_at desc);
create index if not exists membership_restore_tokens_expires_idx
  on public.membership_restore_tokens (expires_at);

alter table public.membership_restore_tokens enable row level security;
revoke all on public.membership_restore_tokens from anon, authenticated;
-- No policies: only the service role (membership routes) reads/writes.
