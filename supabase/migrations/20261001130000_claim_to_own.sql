-- ============================================================================
-- Cyprus Lifestyle — "Own the Data" · Phase 2  ·  CLAIM-TO-OWN  (additive, idempotent)
-- ----------------------------------------------------------------------------
-- Run in the Supabase Dashboard → SQL Editor (no CLI needed). Fully IDEMPOTENT
-- and safe to re-run: CREATE TABLE/INDEX IF NOT EXISTS + CREATE OR REPLACE only.
-- It never drops or destructively alters anything.
--
-- WHAT THIS ENABLES
--   A business can CLAIM its directory listing and prove it controls the BUSINESS
--   (not merely some inbox). On a verified claim the app flips the listing from
--   borrowed REFERENCE data to OWNED data: directory_listings.provenance →
--   'owner-verified', records claimed_at / verified_at / claim_contact, and the
--   desk is notified to complete the profile / upsell. (Those listing columns are
--   already live from Phase 1 — 20261001120000_own_the_data_phase1.sql.)
--
--   This migration adds ONLY the claims ledger. The self-serve owner profile
--   editor, the SMS provider wiring, and the claims admin/moderation view are the
--   NEXT increment (see the note at the foot of this file).
--
-- SECURITY MODEL (enforced in lib/directory/claims.ts, not in SQL)
--   • token_hash / code_hash store the SHA-256 of a crypto-random secret — the raw
--     token/OTP is NEVER stored or logged, only ever sent to the on-file owner (or,
--     for a website-domain match, to the matching claimant).
--   • Verification secrets are SINGLE-USE (cleared on success) and EXPIRE
--     (email link ~72h, phone OTP ~10min); the OTP has an attempt limit.
--   • RLS is ON with NO policies — exactly like public.directory_reviews (Phase 1)
--     and the concierge tables. The app reads/writes ONLY via supabaseAdmin()
--     (service role), which bypasses RLS; there is no anon/public access path.
-- ============================================================================

create extension if not exists pgcrypto;  -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- The claims ledger. One row per claim attempt. method records which honest-
-- verification channel was chosen for the claim (priority: on-file email →
-- website-domain email → phone OTP → manual review).
-- ----------------------------------------------------------------------------
create table if not exists public.directory_claims (
  id             uuid primary key default gen_random_uuid(),
  listing_slug   text not null,
  claimant_name  text,
  claimant_email text,
  claimant_phone text,
  method         text not null,                     -- 'onfile_email' | 'domain_email' | 'phone_otp' | 'manual'
  token_hash     text,                              -- sha256(email-verification token); single-use, cleared on verify
  code_hash      text,                              -- sha256(phone OTP); single-use, cleared on verify
  status         text not null default 'pending',   -- pending | verified | rejected | expired
  attempts       int  not null default 0,
  expires_at     timestamptz,
  verified_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists directory_claims_slug_idx       on public.directory_claims (listing_slug);
create index if not exists directory_claims_token_hash_idx on public.directory_claims (token_hash);
create index if not exists directory_claims_status_idx     on public.directory_claims (status);

alter table public.directory_claims enable row level security;
-- No policies: only the service role (API routes + lib/directory/claims.ts) touches this table.

-- ----------------------------------------------------------------------------
-- Verification (safe to run) — counts by status; all zeros on a fresh install.
-- ----------------------------------------------------------------------------
select
  (select count(*) from public.directory_claims)                          as claim_rows,
  (select count(*) from public.directory_claims where status = 'pending')  as pending,
  (select count(*) from public.directory_claims where status = 'verified') as verified,
  (select count(*) from public.directory_claims where status = 'rejected') as rejected,
  (select count(*) from public.directory_claims where status = 'expired')  as expired;

-- ----------------------------------------------------------------------------
-- NEXT INCREMENT (deliberately NOT in this migration):
--   • Self-serve OWNER PROFILE EDITOR for a verified owner (rewrite description,
--     upload owned_photos, set hours/socials/amenities) — for now verification
--     only flips provenance + records the contact + notifies the desk.
--   • SMS provider wiring (e.g. TWILIO_ACCOUNT_SID / SMS_PROVIDER) lights up the
--     phone-OTP channel; until then that channel is skipped cleanly.
--   • Moderation of the resulting owned content + a claims admin view.
-- ----------------------------------------------------------------------------
