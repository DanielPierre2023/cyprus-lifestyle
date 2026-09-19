-- ============================================================================
-- Cyprus Lifestyle — 0045 · Connector inbox + taxonomy foundation
--   Two additive, idempotent changes that underpin the "connector" phase:
--     1) concierge_requests — where an "Ask the island" request LANDS, so the
--        desk (and later, matched vendors) can act on it. Nothing is a dead end.
--     2) category_group / subtype on directory_listings — the structure for the
--        12-group taxonomy. Backfilled from the existing 6 types; the data engine
--        fills the finer detail later. RLS on concierge_requests stays closed —
--        only the server routes (service role) read/write it.
-- ============================================================================

-- ── 1 · Concierge request inbox ─────────────────────────────────────────────
create table if not exists public.concierge_requests (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  locale      text not null default 'en',
  query       text not null,            -- the guest's natural-language request
  answer      text,                     -- the concierge answer shown to them
  picks       jsonb,                    -- recommended listings (slug + why)
  name        text,                     -- optional, if the guest leaves contact
  email       text,
  note        text,                     -- optional extra detail from the guest
  status      text not null default 'new',   -- new | routed | fulfilled | closed
  org_id      uuid
);
create index if not exists concierge_requests_created_idx on public.concierge_requests (created_at desc);
create index if not exists concierge_requests_status_idx  on public.concierge_requests (status);
alter table public.concierge_requests enable row level security;  -- server-only (service role)

-- ── 2 · Taxonomy foundation (additive) ──────────────────────────────────────
alter table public.directory_listings add column if not exists category_group text;  -- one of the 12 groups
alter table public.directory_listings add column if not exists subtype text;          -- fine sub-category (data engine fills)
create index if not exists directory_group_idx on public.directory_listings (category_group) where status = 'published';

-- Backfill the group from the existing six types so nothing is uncategorised.
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
select category_group, count(*) from public.directory_listings
where status = 'published' group by category_group order by 2 desc;
