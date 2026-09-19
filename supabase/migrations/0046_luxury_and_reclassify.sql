-- ============================================================================
-- Cyprus Lifestyle — 0046 · Luxury tier + taxonomy reclassify
--   1) A dedicated `luxury` flag (editor-owned), seeded from strong signals so
--      the tier is populated at once; editors refine it in Admin later.
--   2) Recover `subtype` for existing rows from the metadata already stored in
--      `notes` ("subtype=…"), and make sure every published row has a
--      `category_group`. Additive & idempotent.
-- ============================================================================

-- ── Luxury tier ─────────────────────────────────────────────────────────────
alter table public.directory_listings add column if not exists luxury boolean not null default false;
create index if not exists directory_luxury_idx on public.directory_listings (luxury) where status = 'published';

-- Seed the tier from the strongest signals we already hold (one-time; editors curate after).
update public.directory_listings set luxury = true
where luxury = false and status = 'published'
  and (price_band in ('€€€', '€€€€') or (rating >= 4.7 and featured = true));

-- ── Reclassify: recover subtype + ensure group ──────────────────────────────
-- Seed rows carry "subtype=xxx" inside notes — lift it into the real column.
update public.directory_listings
set subtype = lower(substring(notes from 'subtype=([A-Za-z][A-Za-z0-9_-]*)'))
where subtype is null and notes ~ 'subtype=';

-- Any row still without a group inherits it from its legacy type.
update public.directory_listings set category_group = case type
    when 'restaurant'  then 'hospitality'
    when 'winery'      then 'food'
    when 'hotel'       then 'stays'
    when 'development' then 'realestate'
    when 'beach'       then 'nature'
    when 'vendor'      then 'services'
    else category_group
  end
where category_group is null;

-- report
select
  count(*) filter (where luxury) as luxury_count,
  count(*) filter (where subtype is not null) as with_subtype,
  count(*) filter (where category_group is not null) as with_group
from public.directory_listings where status = 'published';
