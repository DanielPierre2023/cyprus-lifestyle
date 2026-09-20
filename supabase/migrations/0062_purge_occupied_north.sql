-- 0062_purge_occupied_north.sql
-- Remove businesses located in the OCCUPIED NORTH (they must never appear in a
-- Republic-of-Cyprus / south-only directory). The bulk import pulled in hundreds of
-- them — all of Kyrenia (Girne), northern Famagusta (Varosha, Boğaz, İskele, Karpaz)
-- and northern Nicosia.
--
-- Classification is by GEOGRAPHY, never by name — so southern businesses with
-- northern-sounding names are KEPT (e.g. "Kyrenia Tavern" in Limassol, "Kantara"
-- restaurant in Larnaca, "Atlantica Golden Beach" in Paphos, "Landa Beach" in Ayia
-- Napa). A row is treated as occupied-north when:
--   • district = 'kyrenia'                         → Kyrenia district is entirely occupied;
--   • district = 'famagusta' and lat ≥ 35.10       → south is only the Ayia Napa/Paralimni/
--                                                     Deryneia corner (lat ≤ ~35.08);
--   • district = 'nicosia'   and lat ≥ 35.185      → the Green Line runs at ~35.177; the
--                                                     southern capital sits below it;
--   • district in ('larnaca','limassol') and lat ≥ 35.10 → catches mislabelled northern
--                                                     points (e.g. Lefke); southern towns
--                                                     here are well below 35.10.
--   • paphos is entirely in the Republic (incl. Pomos/Pachyammos) → never purged.
--
-- DELETES data (Supabase keeps automatic backups). Also removes the matching CRM
-- organisations; map embeddings cascade. Idempotent. Read the BEFORE/AFTER report.

-- ── report BEFORE (what will be removed, by district) ────────────────────────
select 'occupied-north rows to remove' as check, count(*)::text as n from public.directory_listings
where district='kyrenia'
   or (district='famagusta' and lat is not null and lat>=35.10)
   or (district='nicosia'   and lat is not null and lat>=35.185)
   or (district in ('larnaca','limassol') and lat is not null and lat>=35.10)
union all
select 'by district → '||coalesce(district,'(null)'), count(*)::text from public.directory_listings
where district='kyrenia'
   or (district='famagusta' and lat is not null and lat>=35.10)
   or (district='nicosia'   and lat is not null and lat>=35.185)
   or (district in ('larnaca','limassol') and lat is not null and lat>=35.10)
group by district
union all select 'directory total (before)', count(*)::text from public.directory_listings;

-- ── collect the occupied-north ids ───────────────────────────────────────────
drop table if exists tmp_north;
create temp table tmp_north as
select id from public.directory_listings
where district='kyrenia'
   or (district='famagusta' and lat is not null and lat>=35.10)
   or (district='nicosia'   and lat is not null and lat>=35.185)
   or (district in ('larnaca','limassol') and lat is not null and lat>=35.10);

-- ── remove their CRM organisations, then the listings ────────────────────────
delete from public.crm_orgs
 where directory_listing_id in (select id from tmp_north)
    or lower(coalesce(district,''))='kyrenia';

delete from public.directory_listings where id in (select id from tmp_north);
-- directory_embeddings (slug FK) cascade automatically.

-- ── report AFTER ─────────────────────────────────────────────────────────────
select 'directory total (after)' as check, count(*)::text as n from public.directory_listings
union all select 'remaining kyrenia rows (expect 0)', count(*)::text from public.directory_listings where district='kyrenia'
union all select 'crm_orgs (after)', count(*)::text from public.crm_orgs;
