-- directory-gap-analysis.sql  (DIAGNOSTIC — read-only, run in the Supabase SQL editor)
-- "Where is the directory thin versus what actually exists?" Run these to get a
-- concrete target list for a VERIFIED enrichment pass (Google Places + the
-- Registrar of Companies), instead of scraping anyone. Nothing here changes data.
--
-- Benchmarks to compare against (from public sources, Sept 2026):
--   • Cyprus Atlas lists ~30,000 businesses across ~2,000 categories (e.g. 975 in
--     "accountants" alone) — a MAP of what exists, not a source to copy.
--   • The government portal lists ~180 regulated activities across 13 sectors —
--     now in the concierge KB (REGULATED_ACTIVITIES) as the authority reference.
-- The gap = your published count per category/district vs those benchmarks.

-- 1 · Coverage by canonical category group (the 12 groups) --------------------
select coalesce(category_group, '(none)') as category_group,
       count(*)                              as listings,
       count(*) filter (where verified)      as verified,
       count(*) filter (where luxury)        as luxury,
       count(*) filter (where image is not null) as with_photo
from public.directory_listings
where status = 'published'
group by category_group
order by listings asc;   -- thinnest groups first = fill these

-- 2 · Coverage by subtype (the precise service the concierge matches on) ------
select coalesce(category_group,'(none)') as category_group,
       coalesce(subtype,'(no subtype)')  as subtype,
       count(*) as listings
from public.directory_listings
where status = 'published'
group by category_group, subtype
order by listings asc
limit 60;                -- the 60 thinnest service niches to enrich next

-- 3 · Coverage by district × group (find blank cells to fill) -----------------
select coalesce(district,'(none)') as district,
       coalesce(category_group,'(none)') as category_group,
       count(*) as listings
from public.directory_listings
where status = 'published'
group by district, category_group
order by district, listings asc;

-- 4 · Professional-services depth vs demand (these are the highest-value,
--     premium-lane categories; compare with Cyprus Atlas category sizes) ------
select coalesce(subtype,'(no subtype)') as service,
       count(*) filter (where district = 'nicosia')  as nicosia,
       count(*) filter (where district = 'limassol') as limassol,
       count(*) filter (where district = 'larnaca')  as larnaca,
       count(*) filter (where district = 'paphos')   as paphos,
       count(*) filter (where district = 'famagusta')as famagusta,
       count(*) as total
from public.directory_listings
where status = 'published' and category_group in ('professional','realestate','health','services')
group by subtype
order by total asc;

-- 5 · Enrichment backlog: published rows still missing a photo or contact -----
select category_group,
       count(*) filter (where image is null)                 as no_photo,
       count(*) filter (where phone is null and url is null) as no_contact
from public.directory_listings
where status = 'published'
group by category_group
order by no_photo desc;

-- HOW TO FILL THE GAPS (verified, licensed — no scraping):
--   • Admin → Directory: add the target businesses (names surfaced by browsing
--     Cyprus Atlas as a map), then run enrich-directory, which pulls name,
--     address, phone, coordinates and a photo from Google Places / the business's
--     own og:image INTO your storage — every fact independently re-sourced.
--   • Verify existence/status against the Registrar eSearch (companies.gov.cy)
--     for professional listings before flagging them "verified".
