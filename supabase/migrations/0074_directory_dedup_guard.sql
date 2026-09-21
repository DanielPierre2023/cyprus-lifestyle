-- 0074_directory_dedup_guard.sql
-- Make directory de-duplication DURABLE (CTO audit P1). The cleanup passes
-- (0059–0061) removed the duplicates that had accumulated; this migration stops
-- them ever coming back, by turning the same "same place = same row" rule into a
-- database-level guard:
--
--   1. An IMMUTABLE key function, directory_dedup_key(type,name,lat,lng), encoding
--      exactly the 0061 rule:
--        • a beach at a coordinate is keyed by coordinate alone;
--        • any other business is keyed by coordinate + type + normalised name
--          (so a real chain, each branch at its own coordinate, is NOT merged,
--           and two different businesses in one building are NOT merged);
--        • a row without coordinates falls back to type + normalised name.
--   2. A final idempotent collapse using that key (a no-op if 0061 already ran),
--      so the unique index below can be created without error.
--   3. A UNIQUE index on the key — the durable guard. A future import that tries
--      to re-insert the same place now fails loudly instead of silently duplicating.
--
-- Normalisation matches 0061 verbatim: lowercase, &→and, ph→f, strip non-alphanumerics.
-- DELETES only residual duplicates (Supabase keeps automatic backups). Idempotent.
-- One Supabase SQL editor script.

-- ── 1 · the immutable identity key ───────────────────────────────────────────
create or replace function public.directory_dedup_key(
  p_type text, p_name text, p_lat double precision, p_lng double precision
) returns text
language sql immutable
as $$
  select case
    when p_lat is not null and p_lng is not null and p_type = 'beach'
      then 'geo:'||round(p_lat::numeric,4)||','||round(p_lng::numeric,4)||':beach'
    when p_lat is not null and p_lng is not null
      then 'geo:'||round(p_lat::numeric,4)||','||round(p_lng::numeric,4)||':'||coalesce(p_type,'')||':'
           || regexp_replace(replace(replace(lower(coalesce(p_name,'')),'&','and'),'ph','f'),'[^a-z0-9]','','g')
    else
      'name:'||coalesce(p_type,'')||':'
           || regexp_replace(replace(replace(lower(coalesce(p_name,'')),'&','and'),'ph','f'),'[^a-z0-9]','','g')
  end
$$;

-- ── 2 · final idempotent collapse (keeper = published, most-complete, verified/
--        luxury, highest-rated, lowest id) — a no-op once the data is clean ─────
drop table if exists tmp_dedup_rank;
create temp table tmp_dedup_rank as
select id,
  public.directory_dedup_key(type, name_en, lat, lng) as gk,
  row_number() over (
    partition by public.directory_dedup_key(type, name_en, lat, lng)
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

drop table if exists tmp_dedup_map;
create temp table tmp_dedup_map as
select l.id as loser_id, k.id as keeper_id
from tmp_dedup_rank l join tmp_dedup_rank k on k.gk = l.gk and k.rn = 1
where l.rn > 1;

-- re-point CRM links to the surviving row, then remove the residual duplicates
update public.crm_orgs o set directory_listing_id = m.keeper_id, updated_at = now()
from tmp_dedup_map m where o.directory_listing_id = m.loser_id;

delete from public.directory_listings where id in (select loser_id from tmp_dedup_map);

-- ── 3 · the durable guard ────────────────────────────────────────────────────
create unique index if not exists directory_dedup_uidx
  on public.directory_listings (public.directory_dedup_key(type, name_en, lat, lng));

-- ── report ───────────────────────────────────────────────────────────────────
select 'residual duplicates removed' as check, count(*)::text as n from tmp_dedup_map
union all select 'directory rows (after)', count(*)::text from public.directory_listings;
