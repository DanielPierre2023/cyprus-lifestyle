-- 0105_match_directory_listed.sql
-- Light the concierge's SEMANTIC leg for the bulk import. match_directory (0051) still
-- only returned status='published', so the 14,671 imported businesses (status='listed')
-- were invisible to meaning-based search even once embedded — the exact mirror of the
-- keyword-path bug already fixed in lib/concierge/brain.ts (CONCIERGE_STATUSES). This
-- redefines the function to return both public ('published') and concierge-only
-- ('listed') listings, so "somewhere to fix my broken AC" can match an imported
-- air-conditioning firm by meaning. Only the status predicate changes vs 0051.
-- Idempotent (create or replace). Requires directory_embeddings to be populated
-- (POST /api/concierge/embed-directory, which now also covers 'listed').

create or replace function public.match_directory(
  query_embedding vector(1536),
  match_count int default 8,
  filter_type text default null
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
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;
