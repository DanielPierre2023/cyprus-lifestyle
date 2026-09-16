-- 0034_fix_directory_coords.sql
-- Some directory listings drew pins in the sea because their coordinates were
-- stored swapped (longitude in the lat column and vice-versa). This flips them
-- back where the flip lands the point inside the Cyprus bounding box, and then
-- reports anything still off-island so you can re-import or clear it.
--
-- Cyprus box used: latitude 34.4–35.9, longitude 32.0–34.7. Safe to re-run.

-- 1) Recover swapped rows — only flip when the flipped pair is valid Cyprus, so a
--    correct point is never touched.
update public.directory_listings
   set lat = lng, lng = lat
 where lat is not null and lng is not null
   and not (lat between 34.4 and 35.9 and lng between 32.0 and 34.7)
   and     (lng between 34.4 and 35.9 and lat between 32.0 and 34.7);

-- 2) Same recovery for events (usually clean, but cheap to include).
update public.events
   set lat = lng, lng = lat
 where lat is not null and lng is not null
   and not (lat between 34.4 and 35.9 and lng between 32.0 and 34.7)
   and     (lng between 34.4 and 35.9 and lat between 32.0 and 34.7);

-- 3) Report listings still outside Cyprus after the fix (genuinely bad coordinates).
--    These draw nothing on the map now (the app filters them), but you may want to
--    re-import or null their lat/lng. Review the list this returns:
select slug, type, district, lat, lng
  from public.directory_listings
 where lat is not null
   and not (lat between 34.4 and 35.9 and lng between 32.0 and 34.7)
 order by type, slug;
