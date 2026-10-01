-- ============================================================================
-- Cyprus Lifestyle — "Own the Data" · Phase 1  (additive, non-destructive)
-- ----------------------------------------------------------------------------
-- Run in the Supabase Dashboard → SQL Editor (no CLI needed). Fully IDEMPOTENT
-- and safe to re-run: every statement uses ADD COLUMN IF NOT EXISTS / CREATE
-- TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / CREATE OR REPLACE. It never
-- drops or destructively alters an existing column, and sets no NOT NULL on any
-- new column on directory_listings.
--
-- Goal of this phase: begin turning bulk-imported REFERENCE rows into first-party,
-- OWNED data. It adds (B1) owned-data columns on the listing, (B2) a first-party
-- reviews table, and (B3) a Bayesian first-party rating aggregate. It does NOT
-- build the claim/verification flow (OTP/phone/postcard) or the moderation UI —
-- those are the NEXT phase; the columns/table here are the scaffold for them.
-- ============================================================================

create extension if not exists pgcrypto;  -- provides gen_random_uuid()

-- ----------------------------------------------------------------------------
-- B1 · Owned fields on the listing (first-party data we author / verify).
--      All nullable, all additive. `provenance` defaults to 'reference' so every
--      existing row keeps reading as reference data until explicitly promoted to
--      'owner-verified' by the (future) claim flow.
-- ----------------------------------------------------------------------------
alter table public.directory_listings add column if not exists hours         jsonb;
alter table public.directory_listings add column if not exists gallery       jsonb;
alter table public.directory_listings add column if not exists amenities     text[];
alter table public.directory_listings add column if not exists socials       jsonb;
alter table public.directory_listings add column if not exists owned_photos  jsonb;
alter table public.directory_listings add column if not exists provenance    text default 'reference';
alter table public.directory_listings add column if not exists verified_at   timestamptz;
alter table public.directory_listings add column if not exists claimed_at    timestamptz;
alter table public.directory_listings add column if not exists claim_contact text;

-- `ADD COLUMN ... DEFAULT` backfills existing rows, but guard against any NULLs
-- left by a partial/earlier run. Non-destructive (only fills NULLs).
update public.directory_listings set provenance = 'reference' where provenance is null;

-- ----------------------------------------------------------------------------
-- B2 · First-party reviews (guest-submitted, owner-moderated).
--      Written ONLY by the service role (the /api/directory/reviews route via
--      lib/directory/reviews.ts). RLS is ON with NO public policies — exactly the
--      pattern of public.concierge_wa_threads (0047) and public.concierge_memory
--      (0048).
--
--      READ-POLICY CHOICE: no public SELECT policy. The whole public site reads
--      directory data through the SERVICE ROLE (lib/queries.ts and
--      lib/directory/reviews.ts both use supabaseAdmin(), which bypasses RLS), so
--      an anon SELECT policy is unnecessary and would only widen exposure. If a
--      client-side/anon read path is ever introduced, add the narrow
--      status='approved' policy shown at the bottom of this file instead.
-- ----------------------------------------------------------------------------
create table if not exists public.directory_reviews (
  id             uuid primary key default gen_random_uuid(),
  listing_slug   text not null,
  author_name    text,
  author_contact text,
  rating         int  not null check (rating between 1 and 5),
  body           text,
  verified_visit boolean not null default false,
  owner_reply    text,
  owner_reply_at timestamptz,
  status         text not null default 'pending',   -- pending | approved | rejected
  locale         text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists directory_reviews_slug_status_idx
  on public.directory_reviews (listing_slug, status);

alter table public.directory_reviews enable row level security;
-- No policies: only the service role (API route + lib) reads/writes this table.

-- ----------------------------------------------------------------------------
-- B3 · First-party rating aggregate — a Bayesian-smoothed average + count over
--      APPROVED reviews only. Smoothing stops a lone 5★ review from reading as a
--      perfect score; a listing needs ~C reviews before its own mean dominates:
--
--          score = (C * m + sum(rating)) / (C + n)
--
--        PRIOR_MEAN   m = 4.2   -- neutral-positive island-hospitality prior
--        PRIOR_WEIGHT C = 12    -- ~12 approved reviews to outweigh the prior
--
--      Returns { avg (2dp), count }. count = 0 and avg = NULL when a listing has
--      no approved reviews yet (true for every row today).
-- ----------------------------------------------------------------------------
create or replace function public.directory_first_party_rating(slug text)
returns table(avg numeric, count bigint)
language sql
stable
as $function$
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

-- Mirror the grants on existing directory RPCs (e.g. match_directory_name, 0105+).
grant execute on function public.directory_first_party_rating(text) to anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- Verification (safe to run) — shape + sanity, all zeros on a fresh install.
-- ----------------------------------------------------------------------------
select
  (select count(*) from public.directory_reviews)                                        as review_rows,
  (select count(*) from public.directory_listings where provenance = 'owner-verified')   as owner_verified_listings,
  (select count(*) from public.directory_listings where provenance = 'reference')        as reference_listings;

-- ----------------------------------------------------------------------------
-- NEXT PHASE (deliberately NOT in this migration):
--   • Claim / verification flow (OTP / phone / postcard) that sets
--     claimed_at, claim_contact, verified_at and flips provenance → 'owner-verified'.
--   • Moderation UI that flips directory_reviews.status pending → approved/rejected
--     and writes owner_reply / owner_reply_at.
--   • IF/when a client-side (anon) read path is added, replace the "no policies"
--     stance above with this narrow, approved-only public read:
--
--       create policy directory_reviews_public_read on public.directory_reviews
--         for select to anon, authenticated using (status = 'approved');
-- ----------------------------------------------------------------------------
