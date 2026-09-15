-- ============================================================================
-- On-site search. A single generated tsvector over all four languages' titles,
-- excerpts, summaries and English tags, with a GIN index. Config 'simple' is
-- language-agnostic (no stemming) so one index serves EN/EL/RO/AR. Run once.
-- ============================================================================

alter table public.blog_posts
  add column if not exists search_document tsvector
  generated always as (
    to_tsvector('simple',
      coalesce(title_en, '')   || ' ' || coalesce(title_el, '')   || ' ' || coalesce(title_ro, '')   || ' ' || coalesce(title_ar, '')   || ' ' ||
      coalesce(excerpt_en, '') || ' ' || coalesce(excerpt_el, '') || ' ' || coalesce(excerpt_ro, '') || ' ' || coalesce(excerpt_ar, '') || ' ' ||
      coalesce(summary_en, '') || ' ' || coalesce(summary_el, '') || ' ' || coalesce(summary_ro, '') || ' ' || coalesce(summary_ar, '') || ' ' ||
      coalesce(array_to_string(tags_en, ' '), '')
    )
  ) stored;

create index if not exists blog_posts_search_idx on public.blog_posts using gin (search_document);
