-- ============================================================================
-- Cyprus Lifestyle — Concierge Hybrid Retrieval (Plan 1)
-- Run this in the Supabase Dashboard -> SQL Editor (no CLI needed).
-- Idempotent & safe: CREATE EXTENSION/INDEX ... IF NOT EXISTS, CREATE OR REPLACE.
--
-- What it adds:
--   1. Trigram indexes on the directory name columns (fast fuzzy name search).
--   2. match_directory_name(q, match_count): a name/near-name/misspelling RPC
--      the concierge calls as its highest-priority signal (catches "Zya",
--      "Zya Cafe" -> stored "Zya Caffee", etc.).
--   3. A data correction for the Zya listing's misspelled name.
--
-- The existing match_directory(query_embedding, ...) RPC (semantic search over
-- directory_embeddings) is used as-is by the new function code — nothing to change.
-- ============================================================================

create extension if not exists pg_trgm;

-- 1) Trigram indexes for fast fuzzy name matching across the stored locales.
create index if not exists directory_name_en_trgm on public.directory_listings using gin (name_en gin_trgm_ops);
create index if not exists directory_name_el_trgm on public.directory_listings using gin (name_el gin_trgm_ops);
create index if not exists directory_name_ru_trgm on public.directory_listings using gin (name_ru gin_trgm_ops);
create index if not exists directory_name_ro_trgm on public.directory_listings using gin (name_ro gin_trgm_ops);
create index if not exists directory_name_de_trgm on public.directory_listings using gin (name_de gin_trgm_ops);
create index if not exists directory_name_ar_trgm on public.directory_listings using gin (name_ar gin_trgm_ops);
create index if not exists directory_name_pl_trgm on public.directory_listings using gin (name_pl gin_trgm_ops);

-- 2) Name / near-name / misspelling match over PUBLISHED listings.
--    Uses word_similarity so a short distinctive token ("Zya") and a typo
--    ("Cafe" vs "Caffee") both match; a clean substring hit is treated as
--    near-exact (0.95). Returns best matches first. 3k published rows -> trivial cost.
create or replace function public.match_directory_name(q text, match_count int default 12)
returns table(slug text, score real)
language sql
stable
as $function$
  with scored as (
    select
      l.slug,
      greatest(
        word_similarity(q, coalesce(l.name_en, '')),
        word_similarity(q, coalesce(l.name_el, '')),
        word_similarity(q, coalesce(l.name_ru, '')),
        word_similarity(q, coalesce(l.name_ro, '')),
        word_similarity(q, coalesce(l.name_de, '')),
        word_similarity(q, coalesce(l.name_ar, '')),
        word_similarity(q, coalesce(l.name_pl, ''))
      )::real as sim,
      (coalesce(l.name_en, '') ilike '%' || q || '%') as substr_hit
    from public.directory_listings l
    where l.status = 'published'
  )
  select
    slug,
    (case when substr_hit then greatest(sim, 0.95::real) else sim end) as score
  from scored
  where sim > 0.30 or substr_hit
  order by score desc
  limit greatest(1, match_count);
$function$;

grant execute on function public.match_directory_name(text, int) to anon, authenticated, service_role;

-- 3) Data correction: this listing's stored name is misspelled ("Zya Caffee").
--    Its own summary and website say "Zya Cafe". Fix the name so exact search hits.
update public.directory_listings
   set name_en = 'Zya Cafe'
 where slug = 'zya-caffee'
   and name_en = 'Zya Caffee';
