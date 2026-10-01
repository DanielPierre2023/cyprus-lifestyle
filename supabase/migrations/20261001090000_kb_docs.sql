-- ============================================================================
-- Cyprus Lifestyle — Plan 2: Knowledge layer (kb_docs) for the concierge
-- Run in the Supabase Dashboard -> SQL Editor. Idempotent.
--
-- Loads the six scraped sites as a searchable knowledge store the concierge
-- retrieves semantically (fills culture / fashion / history / residency / fun
-- gaps). Kept SEPARATE from directory_listings on purpose: the scrape captured
-- page metadata (title/description/H1/og:image), not clean geocoded place
-- records, so it would pollute the curated directory. Rows land published=false
-- for your review; flip published=true to make them live to the concierge.
--
-- Reuses the existing kb_embeddings table (id text, embedding vector(1536),
-- updated_at) and its HNSW cosine index — nothing to change there.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists pg_trgm;

create table if not exists public.kb_docs (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,            -- mycypruslife | cyprusbucketlist | imin | cyprusfashion | cyprusdevelopers | mycyprustravel
  url           text not null unique,     -- dedup key
  lang          text,                     -- en | ro | ru (derived from URL/locale)
  category      text,                     -- page_type (article/website) or derived
  title         text,
  description   text,
  body          text,                     -- best-effort: H1 + title + description (full prose was not scraped)
  image         text,                     -- og:image / schema image
  published     boolean not null default false,
  content_hash  text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists kb_docs_published_idx on public.kb_docs (published);
create index if not exists kb_docs_source_idx    on public.kb_docs (source);
create index if not exists kb_docs_title_trgm     on public.kb_docs using gin (title gin_trgm_ops);

-- Rows that still need an embedding (new, or edited since last embed).
create or replace function public.kb_docs_needing_embedding(match_count int default 50)
returns table(id uuid, text text)
language sql stable as $function$
  select d.id,
    left(
      coalesce(d.title,'')
      || case when coalesce(d.description,'') <> '' then ' — ' || d.description else '' end
      || case when coalesce(d.body,'') <> '' then E'\n' || d.body else '' end,
    1800) as text
  from public.kb_docs d
  left join public.kb_embeddings e on e.id = d.id::text
  where e.id is null or d.updated_at > e.updated_at
  order by d.created_at
  limit greatest(1, match_count);
$function$;

-- Semantic search over the published knowledge docs (same 1536-dim space).
create or replace function public.match_kb_docs(query_embedding vector, match_count int default 6)
returns table(id text, url text, title text, description text, source text, image text, similarity double precision)
language sql stable as $function$
  select d.id::text, d.url, d.title, d.description, d.source, d.image,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.kb_embeddings e
  join public.kb_docs d on d.id::text = e.id
  where d.published = true
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$function$;

grant execute on function public.kb_docs_needing_embedding(int) to service_role;
grant execute on function public.match_kb_docs(vector, int)      to anon, authenticated, service_role;
