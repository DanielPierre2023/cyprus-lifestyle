-- ============================================================================
-- Cyprus Lifestyle — 0109 · Source description + image (use the data we ALREADY have)
-- ----------------------------------------------------------------------------
-- The cyprusatlas export you provided carries a Description and an Image for ~16k
-- businesses, but the original clean_atlas.py dropped both before load, so every imported
-- ('listed') row is just a name with no text to match on. That — not missing contact — is
-- why the concierge can't find a tattoo studio: there is nothing to classify or embed.
-- This adds two columns to hold that provided text, which the classifier (normalize-directory)
-- and the semantic embedder (embed-directory) now read. It is NOT web-scraped enrichment:
-- it is loading the file's own fields. The data itself arrives via the staging loader
-- (scripts/import/atlas-3-descriptions-staging.sql → atlas-4-descriptions-merge.sql).
--
-- source_description = the business's own text (used INTERNALLY for retrieval + classification;
--   attributed, never presented as our editorial copy — display still uses summary_*).
-- source_image       = the export's image URL (held for later; not wired to public display).
-- Additive & idempotent.
-- ============================================================================

alter table public.directory_listings
  add column if not exists source_description text,
  add column if not exists source_image       text;

-- Full-text-ish help for ad-hoc admin filtering ("which rows still have no description").
create index if not exists directory_source_desc_null_idx
  on public.directory_listings (id) where source_description is null;

select
  (select count(*) from public.directory_listings where source_description is not null) as with_source_description,
  (select count(*) from public.directory_listings where source_image is not null)       as with_source_image;
