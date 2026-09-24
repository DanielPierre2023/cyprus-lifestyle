-- ============================================================================
-- Cyprus Lifestyle — 0113 · Publish gate for the imported directory
-- ----------------------------------------------------------------------------
-- The ~14.7k imported businesses live at status='listed': the concierge searches
-- them (CONCIERGE_STATUSES = published + listed), but the public/Google never see
-- them, because the 0018 RLS policy "directory public read" exposes ONLY
-- status='published' rows (using (status = 'published')). We want to make the GOOD
-- ones public — never dump thin rows — so this migration prepares the safe, gated
-- promotion driven by POST /api/concierge/publish-directory.
--
-- THE QUALITY GATE — a 'listed' row is publish-ready ONLY if ALL of:
--   • lat IS NOT NULL AND lng IS NOT NULL                    (mappable)
--   • (image <> '') OR (source_image <> '')                  (has a photo)
--   • (source_description <> '') OR (summary_en <> '')       (has text)
--   • canonical_category IS NOT NULL AND <> 'general-vendor' (properly classified)
--
-- This is additive & idempotent. It does NOT touch the RLS policies and does NOT
-- alter or drop any existing column — it only ADDS published_at (the flip stamps it)
-- and a partial index that lets the publisher find candidate rows fast.
-- ============================================================================

-- Visibility stamp: when a listed row is promoted to published, the route sets this
-- to now(). Directory listings had no published_at (see 0036); status stayed the only
-- gate. This adds an auditable "went public at" without changing what gates visibility.
alter table public.directory_listings
  add column if not exists published_at timestamptz;

-- Fast candidate lookup for the publisher's keyset scan: the index narrows 'listed'
-- rows to the geo- and category-qualified subset (the unambiguous, index-friendly part
-- of the gate) and is ordered by id, so the batched, re-runnable drain in
-- publish-directory pages through candidates cheaply. The route still confirms the
-- photo/text half of the gate per row in code before publishing, so nothing thin slips
-- through. Rows leave this index automatically as they flip to 'published'.
create index if not exists directory_publish_ready_idx
  on public.directory_listings (id)
  where status = 'listed'
    and lat is not null
    and lng is not null
    and canonical_category is not null
    and canonical_category <> 'general-vendor';

-- report: how many 'listed' rows are publish-ready under the FULL gate right now
-- (the number publish-directory will make public), plus context.
with gate as (
  select
    status,
    (    lat is not null and lng is not null
     and ((image is not null and image <> '') or (source_image is not null and source_image <> ''))
     and ((source_description is not null and source_description <> '') or (summary_en is not null and summary_en <> ''))
     and canonical_category is not null and canonical_category <> 'general-vendor'
    ) as publish_ready
  from public.directory_listings
)
select 'directory_publish_gate'                                        as check,
       count(*) filter (where status = 'listed')                      as listed_total,
       count(*) filter (where status = 'listed' and publish_ready)    as listed_publish_ready,
       count(*) filter (where status = 'listed' and not publish_ready) as listed_not_ready,
       count(*) filter (where status = 'published')                   as already_published
from gate;
