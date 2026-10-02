-- ============================================================================
-- Cyprus Lifestyle — STUB-ENRICHMENT · text_status flag   (additive, idempotent)
-- ----------------------------------------------------------------------------
-- Run in the Supabase Dashboard → SQL Editor (no CLI needed). Fully IDEMPOTENT
-- and safe to re-run: ADD COLUMN IF NOT EXISTS + CREATE INDEX IF NOT EXISTS only.
-- It never drops or destructively alters an existing column, and sets NO NOT NULL
-- and NO default that rewrites existing rows.
--
-- WHY
--   ~2,066 PUBLISHED directory_listings carry a HOLLOW "stub" summary (empty /
--   too short / boilerplate / placeholder). They are live and indexable, which
--   hurts SEO and trust. The enrichment job (scripts/enrich-stubs.ts and
--   /api/admin/enrich-stubs) writes a GROUNDED, model-generated description into
--   summary_en for those rows. This column records WHERE a listing's display text
--   came from, so generated copy stays DISTINGUISHABLE from first-party / owned
--   copy and the job stays idempotent + resumable.
--
--   text_status:
--     NULL        — not yet classified by the job (treat by text content).
--     'stub'      — classified hollow, not yet enriched.
--     'generated' — summary_en was written by the grounded generator (reference-
--                   grounded, NOT owner-authored). Distinct from owned text.
--     'review'    — generation ran but the output failed the grounding gate; held
--                   back for a human (summary_en left hollow → stays out of the
--                   sitemap). Conservative: never publish a hallucinated blurb.
--     'owned'     — first-party / owner-verified text (do not overwrite).
--
--   NOTE ON provenance: we deliberately do NOT overload directory_listings
--   .provenance ('reference' | 'owner-verified') for this. provenance is the
--   claim-to-own workstream's column (lib/directory/claims.ts, owner.ts); a
--   generated blurb is still reference data, so provenance stays 'reference' and
--   text_status carries the generated/owned/review marker instead. The two never
--   collide.
--
--   The SEO gate (sitemap exclusion + the noindex helper) does NOT depend on this
--   column — it reads the live summary text — so the gate works whether or not
--   this migration has been applied. The column only enriches tracking, idempotency
--   and the review hold-back. The job probes for the column at runtime and runs
--   fine without it.
-- ============================================================================

-- Where the listing's DISPLAY text (summary_*) came from. Nullable, additive; no
-- default backfill so existing rows are untouched (NULL = "classify by content").
alter table public.directory_listings
  add column if not exists text_status text;

-- When the grounded generator last wrote this listing's summary_en. Lets the desk
-- audit the enrichment run and lets the job report throughput.
alter table public.directory_listings
  add column if not exists text_generated_at timestamptz;

-- Fast candidate lookup for the enrichment job's keyset scan: narrow PUBLISHED rows
-- to those not yet marked generated/owned (the unambiguous part of the filter),
-- ordered by id, so the batched re-runnable drain pages cheaply. The job still
-- confirms the hollow-text half of the filter per row in code (isStub), so nothing
-- with real text is ever regenerated. Rows leave this index as they flip to
-- 'generated' / 'owned'.
create index if not exists directory_text_status_pending_idx
  on public.directory_listings (id)
  where status = 'published'
    and (text_status is null or text_status in ('stub', 'review'));

-- Partial index to count / find enriched rows quickly for reporting + rollback.
create index if not exists directory_text_status_generated_idx
  on public.directory_listings (text_generated_at)
  where text_status = 'generated';

-- ----------------------------------------------------------------------------
-- Verification (safe to run) — distribution of text_status among PUBLISHED rows.
-- On a fresh apply every row is NULL (classify-by-content); after a run the
-- 'generated' / 'review' buckets fill. This does NOT compute the content-based
-- stub count (that is what `scripts/enrich-stubs.ts --dry-run` reports).
-- ----------------------------------------------------------------------------
select
  count(*)                                              as published_total,
  count(*) filter (where text_status is null)           as unclassified,
  count(*) filter (where text_status = 'stub')          as marked_stub,
  count(*) filter (where text_status = 'generated')     as generated,
  count(*) filter (where text_status = 'review')        as needs_review,
  count(*) filter (where text_status = 'owned')         as owned
from public.directory_listings
where status = 'published';
