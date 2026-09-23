-- atlas-4-descriptions-merge.sql — STEP B (run AFTER the CSV is loaded into public.atlas_descriptions).
-- Fills directory_listings.source_description / source_image from the export, matched by slug —
-- the same slug the rows already use. This is loading YOUR file's own fields, not a web scrape.
-- Idempotent: re-running just refreshes the text. Touches every matching row (published + listed);
-- source_* is internal (classification + embeddings), so overwriting is safe and desirable.

update public.directory_listings d
set source_description = nullif(btrim(s.description), ''),
    source_image       = coalesce(nullif(btrim(s.image), ''), d.source_image),
    updated_at         = now()
from public.atlas_descriptions s
where d.slug = s.slug
  and (nullif(btrim(s.description), '') is not null or nullif(btrim(s.image), '') is not null)
  and (d.source_description is distinct from nullif(btrim(s.description), '')
       or d.source_image is distinct from coalesce(nullif(btrim(s.image), ''), d.source_image));

-- Report: how much of the directory now has description text to classify + embed on.
select 'atlas_descriptions_merge' as check,
       (select count(*) from public.atlas_descriptions)                                         as staged,
       (select count(*) from public.directory_listings where source_description is not null)    as listings_with_description,
       (select count(*) from public.directory_listings where source_image is not null)          as listings_with_image;

-- Optional cleanup once you're happy:  drop table public.atlas_descriptions;
