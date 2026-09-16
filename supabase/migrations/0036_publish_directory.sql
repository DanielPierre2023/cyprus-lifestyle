-- 0036_publish_directory.sql
-- The OSM import saved businesses as 'draft', so they never appeared on the public
-- directory or its map — only the ~139 originally-curated listings showed. This
-- publishes them so the directory reflects all ~3,600 businesses.
--
-- Reversible: to hide them again, set status back to 'draft'. Directory listings
-- have no published_at column, so status is the only visibility gate.

update public.directory_listings
   set status = 'published'
 where status = 'draft';

-- report
select status, count(*) as n from public.directory_listings group by status order by status;
