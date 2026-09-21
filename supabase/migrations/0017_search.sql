-- ============================================================================
-- On-site search. A single generated tsvector over all four languages' titles,
-- excerpts, summaries and English tags, with a GIN index. Config 'simple' is
-- language-agnostic (no stemming) so one index serves EN/EL/RO/AR. Run once.
-- ============================================================================

-- A generated (STORED) column must be IMMUTABLE. Postgres marks array_to_string()
-- STABLE (a conservative catch-all across element types), which makes a generated
-- column using it fail to create on PG 16+ ("generation expression is not
-- immutable"). For a text[] the join is genuinely immutable (text output never
-- varies), so we wrap it in an IMMUTABLE helper. Portable across PG 15/16/17.
-- Note: existing deployments already have search_document (the ADD COLUMN below is
-- IF NOT EXISTS and skips there); this only affects fresh applies / CI.
create or replace function public.text_array_join(arr text[], sep text)
  returns text language sql immutable parallel safe as $$ select array_to_string(arr, sep) $$;

alter table public.blog_posts
  add column if not exists search_document tsvector
  generated always as (
    to_tsvector('simple',
      coalesce(title_en, '')   || ' ' || coalesce(title_el, '')   || ' ' || coalesce(title_ro, '')   || ' ' || coalesce(title_ar, '')   || ' ' ||
      coalesce(excerpt_en, '') || ' ' || coalesce(excerpt_el, '') || ' ' || coalesce(excerpt_ro, '') || ' ' || coalesce(excerpt_ar, '') || ' ' ||
      coalesce(summary_en, '') || ' ' || coalesce(summary_el, '') || ' ' || coalesce(summary_ro, '') || ' ' || coalesce(summary_ar, '') || ' ' ||
      coalesce(public.text_array_join(tags_en, ' '), '')
    )
  ) stored;

create index if not exists blog_posts_search_idx on public.blog_posts using gin (search_document);
