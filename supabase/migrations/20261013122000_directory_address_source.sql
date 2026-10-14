-- 20261013122000_directory_address_source.sql
-- ---------------------------------------------------------------------------------------------------------------------
-- Where a street address came from (plan item A1).
--
-- Why: 3,083 published/listed businesses have no street address. They are filled from OpenStreetMap: from the tags of the OSM object itself
-- ("osm") or, for businesses without an OSM object, from the point's nearest address ("osm-reverse"). A reverse-geocoded address can be the
-- neighbouring house, so the origin is stored next to the address and can be told apart (or taken back) later.
--
-- Values: null (imported / typed by the owner / unknown), 'osm' (tags of the OSM object), 'osm-reverse' (nearest address to the coordinates).
-- Safe to re-run. No data is changed; the column starts empty for every row.
-- ---------------------------------------------------------------------------------------------------------------------

alter table public.directory_listings
  add column if not exists address_source text;

comment on column public.directory_listings.address_source is
  'Origin of address when it was completed automatically: osm (tags of the OSM object) | osm-reverse (nearest address to lat/lng). null = imported or owner-provided.';
