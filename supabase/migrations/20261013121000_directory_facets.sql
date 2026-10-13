-- 20261013121000_directory_facets.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- One small aggregate for the "best <type> in <district>" pages and the sitemap (plan item V1).
-- Why: getCollectionFacets() paged through every published listing (1,000 rows per request, hard stop at 12,000) just to count
-- (type, district) pairs. With 17.7k published businesses that is 18 requests per cold start and it silently dropped every row
-- after the 12,000th. This returns the few hundred counted pairs in one call. The app falls back to the old scan (now without the
-- ceiling) when this function is not applied yet. No data is changed. Safe to re-run.
-- ---------------------------------------------------------------------------------------------------------------------
create or replace function public.directory_facets()
returns table(type text, district text, n bigint)
language sql
stable
security definer
set search_path to 'public', 'pg_temp'
as $$
  select l.type, l.district, count(*)::bigint
  from public.directory_listings l
  where l.status = 'published' and l.type is not null and l.district is not null
  group by l.type, l.district
$$;

revoke all on function public.directory_facets() from public, anon, authenticated;
grant execute on function public.directory_facets() to service_role;

-- Quick check: select * from public.directory_facets() order by n desc limit 10;
