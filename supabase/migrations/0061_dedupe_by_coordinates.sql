-- 0061_dedupe_by_coordinates.sql
-- Coordinate-based de-duplication — the right key for Google Places data.
-- Rule: same spot = same place → keep ONE. It collapses to a single row when:
--   • BEACHES sit at the same coordinate (any name variant — Finikoudes/Phinikoudes,
--     Lara/North Lara if truly co-located, "X Beach"/"X Beach / Y Beach"); and
--   • any BUSINESS sits at the same coordinate AND has the same name (the same shop
--     imported twice) — while a real chain, whose branches each have their OWN
--     coordinate, is correctly kept, and two different businesses that happen to
--     share a coordinate (same building) are NOT merged.
-- Rows without coordinates fall back to same-type + same-name de-duplication.
-- Coordinates are rounded to 4 decimals (~11 m) so near-identical points still match.
--
-- The keeper is the published, most-complete, verified/luxury, highest-rated, lowest-id
-- row; CRM links are re-pointed to it; map embeddings cascade. Idempotent. DELETES
-- data (Supabase keeps automatic backups). One Supabase SQL editor script.

-- ── report BEFORE ────────────────────────────────────────────────────────────
select 'directory rows (before)' as check, count(*)::text as n from public.directory_listings
union all select 'rows with coordinates', count(*)::text from public.directory_listings where lat is not null and lng is not null
union all select 'crm_orgs (before)', count(*)::text from public.crm_orgs;

-- ── 1. rank rows within each "same place" group ──────────────────────────────
drop table if exists tmp_geo_rank;
create temp table tmp_geo_rank as
select id,
  case
    when lat is not null and lng is not null and type = 'beach'
      then 'geo:'||round(lat::numeric,4)||','||round(lng::numeric,4)||':beach'
    when lat is not null and lng is not null
      then 'geo:'||round(lat::numeric,4)||','||round(lng::numeric,4)||':'||type||':'
           || regexp_replace(replace(replace(lower(coalesce(name_en,'')),'&','and'),'ph','f'),'[^a-z0-9]','','g')
    else
      'name:'||type||':'|| regexp_replace(replace(replace(lower(coalesce(name_en,'')),'&','and'),'ph','f'),'[^a-z0-9]','','g')
  end as gk,
  row_number() over (
    partition by
      case
        when lat is not null and lng is not null and type = 'beach'
          then 'geo:'||round(lat::numeric,4)||','||round(lng::numeric,4)||':beach'
        when lat is not null and lng is not null
          then 'geo:'||round(lat::numeric,4)||','||round(lng::numeric,4)||':'||type||':'
               || regexp_replace(replace(replace(lower(coalesce(name_en,'')),'&','and'),'ph','f'),'[^a-z0-9]','','g')
        else
          'name:'||type||':'|| regexp_replace(replace(replace(lower(coalesce(name_en,'')),'&','and'),'ph','f'),'[^a-z0-9]','','g')
      end
    order by
      (status = 'published') desc,
      ( (name_el is not null)::int + (name_ro is not null)::int + (name_ar is not null)::int
      + (name_de is not null)::int + (name_pl is not null)::int + (name_ru is not null)::int
      + (summary_en is not null)::int + (summary_el is not null)::int + (summary_ro is not null)::int
      + (summary_ar is not null)::int + (summary_de is not null)::int + (summary_pl is not null)::int
      + (summary_ru is not null)::int ) desc,
      (url is not null) desc, coalesce(verified,false) desc, coalesce(luxury,false) desc,
      coalesce(rating,0) desc, id asc
  ) as rn
from public.directory_listings;

drop table if exists tmp_geo_map;
create temp table tmp_geo_map as
select l.id as loser_id, k.id as keeper_id
from tmp_geo_rank l join tmp_geo_rank k on k.gk = l.gk and k.rn = 1
where l.rn > 1;

update public.crm_orgs o set directory_listing_id = m.keeper_id, updated_at = now()
from tmp_geo_map m where o.directory_listing_id = m.loser_id;

delete from public.directory_listings where id in (select loser_id from tmp_geo_map);

-- ── 2. de-duplicate the CRM by business name ─────────────────────────────────
drop table if exists tmp_crm_rank;
create temp table tmp_crm_rank as
select id, row_number() over (
    partition by regexp_replace(replace(replace(lower(coalesce(name,'')),'&','and'),'ph','f'),'[^a-z0-9]','','g'), coalesce(lower(district),'')
    order by (directory_listing_id is not null) desc, (status <> 'prospect') desc, id asc
  ) as rn
from public.crm_orgs;
delete from public.crm_orgs where id in (select id from tmp_crm_rank where rn > 1);

-- ── report AFTER ─────────────────────────────────────────────────────────────
select 'directory rows (after)' as check, count(*)::text as n from public.directory_listings
union all select 'crm_orgs (after)', count(*)::text from public.crm_orgs;

-- ── ⚠ suspected OCCUPIED-NORTH rows (should not be in a South-Cyprus directory) ──
-- Review these; if you confirm, I will ship a precise purge. Not auto-deleted here.
select 'suspected NORTH (review)' as note, name_en, district, round(lat::numeric,4) as lat, round(lng::numeric,4) as lng
from public.directory_listings
where name_en ~* '(alagadi|nangomi|karpa[sz]|kyrenia|girne|escape beach|five mile|bafra|g[uü]zelyurt|morphou|lefke|varosha|salamis|famagusta gate|bellapais|st ?hilarion|kantara|golden beach)'
   or (lat is not null and lat > 35.20)          -- most points north of ~35.20° are in the occupied area
order by name_en;
