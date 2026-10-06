-- 20261007110000_match_kb_static_only.sql
-- Increment 2.1b — stop scraped kb_docs vectors from crowding the static 94-intent knowledge base.
-- Idempotent (create or replace, same signature). Changes no data. Run in: Supabase → SQL Editor.
--
-- PROBLEM. kb_embeddings holds two populations that share one table and one index:
--     • the 94 static knowledge-base intents (ids like 'kb-…'), embedded by /api/concierge/embed, and
--     • the ~816 scraped kb_docs pages (id = the kb_docs uuid as text), embedded separately.
--   match_kb() — the lookup for the STATIC knowledge base — returned the nearest 6 of BOTH, but the caller
--   can only use static ids, so a query whose nearest neighbours were scraped pages got 0–6 useless ids and the
--   right static answer was silently dropped. (match_kb_docs() already joins to kb_docs, so it was never affected.)
--
-- FIX. match_kb() now considers ONLY rows whose id is NOT a uuid. Two safety details:
--   1. The ORDER BY is written as `1 - (embedding <=> q)` instead of `embedding <=> q`. That deliberately
--      prevents the planner from using the HNSW index here: an approximate index scan returns its ~40 nearest
--      candidates and THEN applies the WHERE, so with 816 uuid rows to every 94 static rows it could hand back
--      far fewer than `match_count` static rows. A plain scan over ~910 rows is exact and takes milliseconds.
--      (match_kb_docs keeps using the index.)
--   2. Same signature, same return type, SECURITY INVOKER and search_path pin as before, so the existing grants
--      (service role only; RLS on kb_embeddings has no policy) are unchanged — create or replace keeps them.
-- The brain also filters to static ids in code (lib/concierge/brain.ts staticKbIds), so the site is correct
-- before AND after this migration; this makes the SQL answer exact as well and keeps the payload small.

create or replace function public.match_kb(query_embedding vector(1536), match_count int default 6)
returns table (id text, similarity float)
language sql stable
set search_path = public, pg_temp
as $$
  select e.id, 1 - (e.embedding <=> query_embedding) as similarity
  from public.kb_embeddings e
  where e.embedding is not null
    and e.id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'   -- static intents only; kb_docs uuids are served by match_kb_docs()
  order by 1 - (e.embedding <=> query_embedding) desc                                 -- exact scan on purpose (see header)
  limit greatest(1, match_count);
$$;

-- report: static vs scraped vectors, and what match_kb can now see
select 'match_kb_static_only' as check,
       (select count(*) from public.kb_embeddings where id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') as static_vectors,
       (select count(*) from public.kb_embeddings where id  ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') as scraped_doc_vectors;
