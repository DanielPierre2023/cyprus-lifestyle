-- 0106_match_directory_geo.sql
-- ENTERPRISE RETRIEVAL, step 1: make semantic search district-aware.
-- The bulk import stored each business's subtype as the raw source-category slug
-- (clean_atlas.py), so a gym may be 'gyms', 'fitness-centres', 'health-clubs' or
-- 'sports-clubs' — a keyword probe for 'gym'/'fitness' can never catch them all, in any
-- language. Vector search does (all of those embed next to "gym" / "sala de gimnastică"),
-- but match_directory returned only a small GLOBAL top-K, so "a gym in Larnaca" was
-- diluted by businesses elsewhere. This adds an optional district filter (and keeps the
-- type filter) so the concierge can ask for "the nearest-by-meaning listings of this kind
-- IN this district" in one indexed query — the backbone of language-agnostic retrieval.
-- Replaces the 3-arg function from 0105 (drop first, so there is a single overload).

drop function if exists public.match_directory(vector, integer, text);

create or replace function public.match_directory(
  query_embedding vector(1536),
  match_count int default 8,
  filter_type text default null,
  filter_district text default null
)
returns table (slug text, similarity float)
language sql stable
as $$
  select e.slug, 1 - (e.embedding <=> query_embedding) as similarity
  from public.directory_embeddings e
  join public.directory_listings l on l.slug = e.slug
  where e.embedding is not null
    and l.status in ('published', 'listed')
    and (filter_type is null or l.type = filter_type)
    and (filter_district is null or l.district = filter_district)
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

-- report
select 'match_directory_geo' as check,
       (select count(*) from pg_proc where proname = 'match_directory') as fns;
