-- 0049_concierge_kb_vectors.sql
-- Hybrid retrieval: semantic recall for the concierge knowledge base.
-- Additive and safe — until embeddings are generated (see /api/concierge/embed),
-- match_kb returns nothing and the concierge uses keyword search as before.
-- Requires the pgvector extension (available on Supabase).

create extension if not exists vector;

create table if not exists public.kb_embeddings (
  id          text primary key,               -- knowledge-base intent id
  embedding   vector(1536),                    -- text-embedding-3-small
  updated_at  timestamptz not null default now()
);

-- Cosine HNSW index for fast nearest-neighbour search.
create index if not exists kb_embeddings_embedding_idx
  on public.kb_embeddings using hnsw (embedding vector_cosine_ops);

alter table public.kb_embeddings enable row level security;
-- No policies: only the service role (concierge routes) reads/writes.

-- Nearest knowledge-base entries to a query embedding (cosine similarity).
create or replace function public.match_kb(query_embedding vector(1536), match_count int default 6)
returns table (id text, similarity float)
language sql stable
as $$
  select e.id, 1 - (e.embedding <=> query_embedding) as similarity
  from public.kb_embeddings e
  where e.embedding is not null
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;
