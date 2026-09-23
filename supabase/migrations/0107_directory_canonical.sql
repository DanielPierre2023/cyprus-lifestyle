-- 0107_directory_canonical.sql
-- Phase 1 (data foundation): a clean, canonical category on every listing, so the raw
-- import slugs ('health-clubs', 'sports-clubs', 'solar-energy' …) stop being what the
-- system filters, ranks, sells and reports on. Populated by the one-time normalize job
-- (POST /api/concierge/normalize-directory), which classifies each business into the
-- taxonomy in lib/directory/taxonomy.ts. Additive & idempotent — labels existing rows
-- only, invents no data.

alter table public.directory_listings
  add column if not exists canonical_category text,
  add column if not exists canonical_subtype  text,
  add column if not exists tags               text[],
  add column if not exists normalized_at      timestamptz;

-- Fast faceting by canonical category (only the normalised rows), and a cheap way for
-- the backfill to find what's left to do.
create index if not exists directory_canonical_cat_idx
  on public.directory_listings (canonical_category) where canonical_category is not null;
create index if not exists directory_norm_pending_idx
  on public.directory_listings (id) where normalized_at is null;

-- report
select 'directory_canonical' as check,
       count(*) filter (where canonical_category is not null) as normalized,
       count(*)                                               as total
from public.directory_listings;
