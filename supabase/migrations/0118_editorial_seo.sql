-- ============================================================================
-- Cyprus Lifestyle — 0118 · Article SEO & rich-result fields
-- ----------------------------------------------------------------------------
-- The editorial engine now produces a full SEO + editorial package for every
-- piece (excerpt, summary, SEO title/description, tags — all seven editions).
-- Those columns already exist (0003 / 0032). This migration adds the two fields
-- that power Google RICH RESULTS, which we did not store before:
--
--   • faq_<lang>     jsonb  — an array of {q,a} shown as an FAQPage rich result
--                             (the "People also ask" box). One per edition.
--   • review_rating  numeric — a real 1–5 star rating for review pieces (set from
--                             an editor's field-note visit; never fabricated), used
--                             for Review star snippets. Nullable: no rating → no
--                             stars, which is the honest default.
--
-- Idempotent: add-column-if-not-exists, safe to re-run.
-- ============================================================================

alter table public.blog_posts add column if not exists faq_en jsonb not null default '[]'::jsonb;
alter table public.blog_posts add column if not exists faq_el jsonb not null default '[]'::jsonb;
alter table public.blog_posts add column if not exists faq_ro jsonb not null default '[]'::jsonb;
alter table public.blog_posts add column if not exists faq_ar jsonb not null default '[]'::jsonb;
alter table public.blog_posts add column if not exists faq_de jsonb not null default '[]'::jsonb;
alter table public.blog_posts add column if not exists faq_pl jsonb not null default '[]'::jsonb;
alter table public.blog_posts add column if not exists faq_ru jsonb not null default '[]'::jsonb;

alter table public.blog_posts add column if not exists review_rating numeric;

do $$
begin
  if not exists (
    select 1 from information_schema.constraint_column_usage
    where table_name = 'blog_posts' and constraint_name = 'blog_posts_review_rating_range'
  ) then
    alter table public.blog_posts
      add constraint blog_posts_review_rating_range
      check (review_rating is null or (review_rating >= 1 and review_rating <= 5));
  end if;
end $$;

comment on column public.blog_posts.faq_en is
  'FAQ for the FAQPage rich result: jsonb array of {q,a}. One column per edition (faq_<lang>).';
comment on column public.blog_posts.review_rating is
  'Real 1–5 rating for review pieces (from an editor field-note visit). Powers Review star snippets. Null = no stars (honest default).';

-- Report.
select 'editorial seo fields ready' as status,
  count(*) filter (where column_name like 'faq_%') as faq_columns,
  count(*) filter (where column_name = 'review_rating') as review_rating_column
from information_schema.columns
where table_schema = 'public' and table_name = 'blog_posts'
  and (column_name like 'faq_%' or column_name = 'review_rating');
