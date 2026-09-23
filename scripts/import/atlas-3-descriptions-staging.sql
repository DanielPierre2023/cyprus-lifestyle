-- atlas-3-descriptions-staging.sql — STEP A (run once in the Supabase SQL editor).
-- Creates the staging table for the descriptions/images extract. Then import
-- atlas_descriptions.csv INTO it via Supabase → Table editor → atlas_descriptions →
-- Insert → Import data from CSV (headers match). After the CSV is loaded, run
-- atlas-4-descriptions-merge.sql. All text columns, no constraints — the import is forgiving.
drop table if exists public.atlas_descriptions;
create table public.atlas_descriptions (
  slug        text,
  description text,
  image       text
);
select 'atlas_descriptions ready — import atlas_descriptions.csv into it, then run atlas-4-descriptions-merge.sql' as next_step;
