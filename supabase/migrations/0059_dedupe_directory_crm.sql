-- 0059_dedupe_directory_crm.sql
-- Remove redundant / duplicate businesses — no compromise, but safe and reviewable.
--
-- A DUPLICATE = the SAME business in the SAME district listed more than once,
-- matched on a normalised name (lower-cased, stripped of spaces & punctuation)
-- plus district. IMPORTANT: the same chain in DIFFERENT districts (e.g. EKA Group
-- in Larnaca and in Limassol) is NOT a duplicate — those are real, separate
-- locations and are kept. Only same-name + same-district collapses.
--
-- For each duplicate group it keeps ONE canonical row — the published, most
-- complete (most languages filled), verified/luxury, lowest-id one — re-points the
-- CRM link to that keeper, then DELETES the extras, in the directory AND the CRM.
-- directory_embeddings rows cascade-delete with the listings they belong to.
--
-- Idempotent: re-running finds nothing to remove. Runs as one Supabase SQL editor
-- script (temp tables are session-scoped). Read the BEFORE / AFTER report it prints.

-- ── report BEFORE ──────────────────────────────────────────────────────────
select 'directory rows (before)'        as check, count(*)::text as n from public.directory_listings
union all select 'directory duplicate groups', count(*)::text from (
  select 1 from public.directory_listings
  group by lower(regexp_replace(coalesce(name_en,''),'[^a-z0-9]','','g')), coalesce(lower(district),'')
  having count(*) > 1) g
union all select 'crm_orgs (before)', count(*)::text from public.crm_orgs;

-- ── 1. rank directory rows within each business+district ────────────────────
drop table if exists tmp_dir_rank;
create temp table tmp_dir_rank as
select id,
  lower(regexp_replace(coalesce(name_en,''),'[^a-z0-9]','','g')) as nn,
  coalesce(lower(district),'') as dd,
  row_number() over (
    partition by lower(regexp_replace(coalesce(name_en,''),'[^a-z0-9]','','g')), coalesce(lower(district),'')
    order by
      (status = 'published') desc,
      ( (name_el is not null)::int + (name_ro is not null)::int + (name_ar is not null)::int
      + (name_de is not null)::int + (name_pl is not null)::int + (name_ru is not null)::int
      + (summary_en is not null)::int + (summary_el is not null)::int + (summary_ro is not null)::int
      + (summary_ar is not null)::int + (summary_de is not null)::int + (summary_pl is not null)::int
      + (summary_ru is not null)::int ) desc,
      (url is not null) desc,
      coalesce(verified, false) desc,
      coalesce(luxury, false) desc,
      id asc
  ) as rn
from public.directory_listings;

-- ── 2. map each loser → its keeper ──────────────────────────────────────────
drop table if exists tmp_dir_map;
create temp table tmp_dir_map as
select l.id as loser_id, k.id as keeper_id
from tmp_dir_rank l
join tmp_dir_rank k on k.nn = l.nn and k.dd = l.dd and k.rn = 1
where l.rn > 1;

-- ── 3. re-point CRM links to the keeper, then delete the loser listings ──────
update public.crm_orgs o set directory_listing_id = m.keeper_id, updated_at = now()
from tmp_dir_map m where o.directory_listing_id = m.loser_id;

delete from public.directory_listings where id in (select loser_id from tmp_dir_map);
-- (directory_embeddings.slug references listings ON DELETE CASCADE — cleaned automatically.)

-- ── 4. de-duplicate the CRM itself (same business+district) ─────────────────
drop table if exists tmp_crm_rank;
create temp table tmp_crm_rank as
select id,
  row_number() over (
    partition by lower(regexp_replace(coalesce(name,''),'[^a-z0-9]','','g')), coalesce(lower(district),'')
    order by (directory_listing_id is not null) desc, (status <> 'prospect') desc, id asc
  ) as rn
from public.crm_orgs;

delete from public.crm_orgs where id in (select id from tmp_crm_rank where rn > 1);

-- ── report AFTER ────────────────────────────────────────────────────────────
select 'directory rows (after)'         as check, count(*)::text as n from public.directory_listings
union all select 'directory duplicate groups (after)', count(*)::text from (
  select 1 from public.directory_listings
  group by lower(regexp_replace(coalesce(name_en,''),'[^a-z0-9]','','g')), coalesce(lower(district),'')
  having count(*) > 1) g
union all select 'crm_orgs (after)', count(*)::text from public.crm_orgs
union all select 'crm duplicate groups (after)', count(*)::text from (
  select 1 from public.crm_orgs
  group by lower(regexp_replace(coalesce(name,''),'[^a-z0-9]','','g')), coalesce(lower(district),'')
  having count(*) > 1) g;
