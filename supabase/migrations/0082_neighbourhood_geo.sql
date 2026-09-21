-- 0082_neighbourhood_geo.sql
-- True neighbourhood radius for the concierge. A guest gives a street, area or
-- postcode (no house number needed); we geocode it once, cache the point, and
-- find directory listings within a radius by coordinates. No PostGIS needed — the
-- app filters a lat/lng bounding box (index below) and ranks by real distance.
-- Additive & idempotent.

-- Resolved locations, cached so we never pay to geocode the same place twice.
create table if not exists public.geocode_cache (
  q          text primary key,          -- normalised query (lower-cased, trimmed)
  lat        double precision,          -- null = looked up, not found (don't retry hard)
  lng        double precision,
  label      text,                      -- provider's display name
  provider   text,
  created_at timestamptz not null default now()
);
alter table public.geocode_cache enable row level security;
drop policy if exists "geocode_cache admin" on public.geocode_cache;
create policy "geocode_cache admin" on public.geocode_cache for all to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
-- (the concierge reads/writes it with the service role, which bypasses RLS)

-- Bounding-box radius queries scan lat/lng — index the listings that have coordinates.
create index if not exists directory_coords_idx on public.directory_listings (lat, lng) where lat is not null and lng is not null;

-- report
select 'neighbourhood_geo' as check,
       (select count(*) from information_schema.tables where table_schema='public' and table_name='geocode_cache') as cache_table,
       (select count(*) from pg_indexes where schemaname='public' and indexname='directory_coords_idx') as coords_index;
