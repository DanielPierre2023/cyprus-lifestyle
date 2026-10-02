-- ============================================================================
-- Cyprus Lifestyle — "Own the Data" · Phase 3  ·  OWNER PROFILE EDITOR  (additive, idempotent)
-- ----------------------------------------------------------------------------
-- Run in the Supabase Dashboard → SQL Editor (no CLI needed). Fully IDEMPOTENT
-- and safe to re-run: CREATE TABLE/INDEX IF NOT EXISTS only. It never drops or
-- destructively alters anything.
--
-- WHAT THIS ENABLES
--   A business that is ALREADY owner-verified (provenance='owner-verified' with a
--   claim_contact email on file — set by Phase 2, 20261001130000_claim_to_own.sql)
--   can edit its own listing WITHOUT any owner-login system. We authenticate the
--   owner with a secure, emailed, per-listing MANAGEMENT TOKEN that is issued ONLY
--   to the listing's recorded claim_contact (the proven owner), then exchanged for
--   a short-lived editing SESSION. On save, low-risk structured fields are written
--   straight to the listing's owned columns; free-text / high-display-risk content
--   (the description, photo URLs) is queued for moderation instead of going live.
--
--   Those owned listing columns (hours jsonb, socials jsonb, amenities text[],
--   gallery jsonb, owned_photos jsonb) and the url/provenance/claim_contact columns
--   already exist from Phase 1/2 — this migration adds ONLY the two tables the
--   editor needs: the management-token ledger and the edit-moderation queue.
--
-- SECURITY MODEL (enforced in lib/directory/owner.ts, not in SQL)
--   • directory_owner_tokens stores ONLY the SHA-256 of a crypto-random secret in
--     token_hash — the raw token is never stored or logged, and is sent only to the
--     on-file claim_contact. 'link' tokens are SINGLE-USE (used_at set on verify)
--     and short-lived (~60 min); on a successful verify a 'session' token is minted
--     (~60 min) and carried in an httpOnly cookie. Sessions are revoked by setting
--     used_at. Nothing about a listing is revealed to an unauthenticated caller
--     (the request endpoint is anti-enumerating).
--   • directory_listing_edits is the moderation queue. The owner editor writes
--     free-text (description) and photo URLs here as status='pending'; an admin
--     approves/rejects them later (by SQL today, or a future admin UI). Live
--     listing copy is never overwritten directly by owner free-text.
--   • RLS is ON with NO policies on both tables — exactly like public.directory_claims
--     (Phase 2), public.directory_reviews (Phase 1) and the concierge tables. The app
--     reads/writes ONLY via supabaseAdmin() (service role), which bypasses RLS; there
--     is no anon/public access path.
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- The management-token ledger. One row per issued secret.
--   kind='link'    — the emailed, single-use management link (consumed on verify).
--   kind='session' — the editing session minted after a link is verified; it is
--                    carried in an httpOnly cookie and revoked by setting used_at.
-- token_hash = sha256(raw secret); the raw secret is NEVER stored or logged.
-- ----------------------------------------------------------------------------
create table if not exists public.directory_owner_tokens (
  id            uuid primary key default gen_random_uuid(),
  listing_slug  text not null,
  kind          text not null default 'link',      -- 'link' | 'session'
  token_hash    text not null,                      -- sha256(raw token); single-use link, or revocable session
  expires_at    timestamptz not null,
  used_at       timestamptz,                        -- link: consumed on verify; session: revoked
  created_at    timestamptz not null default now()
);

create index if not exists directory_owner_tokens_hash_idx    on public.directory_owner_tokens (token_hash);
create index if not exists directory_owner_tokens_slug_idx    on public.directory_owner_tokens (listing_slug);
create index if not exists directory_owner_tokens_expires_idx on public.directory_owner_tokens (expires_at);

alter table public.directory_owner_tokens enable row level security;
-- No policies: only the service role (API routes + lib/directory/owner.ts) touches this table.

-- ----------------------------------------------------------------------------
-- The edit-moderation queue. One row per proposed change to a field that we do
-- NOT auto-publish (free-text description, photo URLs). Structured low-risk fields
-- (hours, socials, amenities, website) are written straight to the listing and do
-- NOT appear here. An admin flips status pending → approved/rejected (by SQL today,
-- or a future moderation UI) and sets reviewed_at.
-- ----------------------------------------------------------------------------
create table if not exists public.directory_listing_edits (
  id             uuid primary key default gen_random_uuid(),
  listing_slug   text not null,
  field          text not null,                     -- e.g. 'description' | 'photos'
  proposed_value jsonb,                             -- free-text stored as a JSON string; photos as a JSON array of URLs
  status         text not null default 'pending',   -- pending | approved | rejected
  submitted_by   text,                              -- the owner's on-file claim_contact that submitted this
  created_at     timestamptz not null default now(),
  reviewed_at    timestamptz
);

create index if not exists directory_listing_edits_slug_status_idx on public.directory_listing_edits (listing_slug, status);
create index if not exists directory_listing_edits_status_idx      on public.directory_listing_edits (status);

alter table public.directory_listing_edits enable row level security;
-- No policies: only the service role (API route + lib) reads/writes this table.

-- ----------------------------------------------------------------------------
-- Verification (safe to run) — counts by status; all zeros on a fresh install.
-- ----------------------------------------------------------------------------
select
  (select count(*) from public.directory_owner_tokens)                                   as token_rows,
  (select count(*) from public.directory_owner_tokens where kind = 'link'  and used_at is null) as active_links,
  (select count(*) from public.directory_owner_tokens where kind = 'session' and used_at is null) as active_sessions,
  (select count(*) from public.directory_listing_edits)                                  as edit_rows,
  (select count(*) from public.directory_listing_edits where status = 'pending')          as pending_edits,
  (select count(*) from public.directory_listing_edits where status = 'approved')         as approved_edits,
  (select count(*) from public.directory_listing_edits where status = 'rejected')         as rejected_edits;

-- ----------------------------------------------------------------------------
-- DEFERRED (deliberately NOT in this migration — see lib/directory/owner.ts notes):
--   • Real photo UPLOAD/STORAGE (Supabase Storage). For now the editor accepts photo
--     URLs, which land in directory_listing_edits as pending for moderation.
--   • An ADMIN MODERATION UI for directory_listing_edits. For now an admin approves an
--     edit by SQL, e.g. to publish an approved description onto the displayed copy:
--       update public.directory_listing_edits
--         set status='approved', reviewed_at=now()
--         where id = '<edit-id>';
--       -- then apply it (description → the displayed summary_en), e.g.:
--       update public.directory_listings
--         set summary_en = (select proposed_value #>> '{}' from public.directory_listing_edits where id='<edit-id>'),
--             updated_at = now()
--         where slug = '<listing-slug>';
--   • Any owner-LOGIN / password system. Ownership is proven per-listing by the
--     emailed management token (issued only to the verified claim_contact).
-- ----------------------------------------------------------------------------
