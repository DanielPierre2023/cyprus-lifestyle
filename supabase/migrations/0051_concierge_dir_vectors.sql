-- 0051_concierge_dir_vectors.sql
-- Directory-wide semantic search for the concierge. Mirrors the KB vectors (0049):
-- additive and safe — until embeddings are generated (POST /api/concierge/
-- embed-directory), match_directory returns nothing and the concierge uses its
-- existing keyword/intent search unchanged. Requires the pgvector extension.

create extension if not exists vector;

-- One embedding per listing, keyed by slug (the id the concierge already uses).
-- content_hash lets the backfill skip listings whose text hasn't changed, so a
-- re-run only re-embeds what actually moved.
create table if not exists public.directory_embeddings (
  slug         text primary key references public.directory_listings(slug) on delete cascade,
  embedding    vector(1536),                     -- text-embedding-3-small
  content_hash text,
  updated_at   timestamptz not null default now()
);

-- Cosine HNSW index for fast nearest-neighbour search.
create index if not exists directory_embeddings_embedding_idx
  on public.directory_embeddings using hnsw (embedding vector_cosine_ops);

alter table public.directory_embeddings enable row level security;
-- No policies: only the service role (concierge routes) reads/writes.

-- Nearest PUBLISHED listings to a query embedding (cosine similarity), with an
-- optional type filter. Returns slug + score; the app hydrates the full rows so
-- name localisation stays in one place. Draft/unpublished listings never surface.
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
    and l.status = 'published'
    and (filter_type is null or l.type = filter_type)
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;
