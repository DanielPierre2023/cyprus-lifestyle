-- 20261006110000_concierge_sources.sql
-- Increment 2.1 — concierge retrieval over ALL data sources. Idempotent; changes no existing data.
-- Run in: Supabase → SQL Editor, project cyprus_lifestyle (htwaivnvabvpqkffllnc).
--
-- Adds ONE new table + ONE new lookup function:
--   concierge_embeddings        one vector per published ARTICLE, EVENT or bookable EXPERIENCE
--   match_concierge_sources()   nearest items by meaning — returns ONLY items that are live right now
--                               (article published · event published and not over · experience active)
-- Nothing existing is altered. The table starts EMPTY; fill it with
--   /api/concierge/embed-sources?dry=1   (free: shows what would be embedded + token estimate)
--   /api/concierge/embed-sources         (paid: calls the embeddings API, ~110k tokens once)
-- Until then the function simply returns no rows and the concierge behaves as before.
--
-- Security (scripts/db/security-smoke.sql): RLS is on with NO policy (service role only), and the
-- function is executable by the service role only — visitors cannot call it through /rest/v1/rpc.

create extension if not exists vector;

create table if not exists public.concierge_embeddings (
  source       text not null check (source in ('article', 'event', 'activity')),
  ref          text not null,                       -- blog_posts.slug · events.slug · activities.external_id
  content_hash text not null,                       -- sha256 of the embedded text: re-embed only when it changes
  embedding    vector(1536) not null,               -- same model/space as directory_embeddings and kb_embeddings
  updated_at   timestamptz not null default now(),
  primary key (source, ref)
);

alter table public.concierge_embeddings enable row level security;   -- no policy on purpose: service role only

create index if not exists concierge_embeddings_hnsw
  on public.concierge_embeddings using hnsw (embedding vector_cosine_ops);

create or replace function public.match_concierge_sources(
  query_embedding vector(1536),
  match_count     int  default 12,
  filter_sources  text[] default null
)
returns table (source text, ref text, similarity double precision)
language sql stable
set search_path = public, pg_temp
as $$
  select e.source, e.ref, 1 - (e.embedding <=> query_embedding) as similarity
  from public.concierge_embeddings e
  left join public.blog_posts b  on e.source = 'article'  and b.slug = e.ref
  left join public.events     ev on e.source = 'event'    and ev.slug = e.ref
  left join public.activities a  on e.source = 'activity' and a.external_id = e.ref
  where (filter_sources is null or e.source = any (filter_sources))
    and (   (e.source = 'article'  and b.status  = 'published')
         or (e.source = 'event'    and ev.status = 'published'
                                   and coalesce(ev.ends_at, ev.starts_at + interval '6 hours') >= now())
         or (e.source = 'activity' and a.status  = 'active') )
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$$;

revoke all on function public.match_concierge_sources(vector, int, text[]) from public, anon, authenticated;
grant execute on function public.match_concierge_sources(vector, int, text[]) to service_role;

-- report
select 'concierge_sources' as check,
       (select count(*) from information_schema.tables where table_schema = 'public' and table_name = 'concierge_embeddings') as tables,
       (select count(*) from pg_proc where proname = 'match_concierge_sources') as fns,
       (select count(*) from public.concierge_embeddings) as embedded_rows;
