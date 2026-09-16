-- 0032_commit_seven_langs.sql
-- Extend commit_scraper_blog_post() to persist the German/Polish/Russian editions
-- the generator now produces (best-effort — a missing edition arrives as NULL and
-- the reader pages fall back to English). Run AFTER 0031_more_locales.sql, which
-- adds the *_de/_pl/_ru columns this function writes to.
--
-- CREATE OR REPLACE keeps the same signature, so the edge function keeps calling it
-- unchanged; only the column coverage grows from four editions to seven.

create or replace function public.commit_scraper_blog_post(
  p_blog_payload jsonb, p_scraped_id uuid, p_writeback jsonb)
returns uuid
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_post_id uuid;
  v_updated int;
begin
  insert into public.blog_posts (
    title_en, title_el, title_ro, title_ar, title_de, title_pl, title_ru,
    content_en, content_el, content_ro, content_ar, content_de, content_pl, content_ru,
    excerpt_en, excerpt_el, excerpt_ro, excerpt_ar, excerpt_de, excerpt_pl, excerpt_ru,
    summary_en, summary_el, summary_ro, summary_ar, summary_de, summary_pl, summary_ru,
    tags_en, tags_el, tags_ro, tags_ar, tags_de, tags_pl, tags_ru,
    seo_title_en, seo_title_el, seo_title_ro, seo_title_ar, seo_title_de, seo_title_pl, seo_title_ru,
    seo_description_en, seo_description_el, seo_description_ro, seo_description_ar,
    seo_description_de, seo_description_pl, seo_description_ru,
    slug, category, subcategory, county,
    cover_image, source_url, scraped_article_id,
    ai_editor, author_name, author_id,
    word_count, status, published_at
  )
  values (
    p_blog_payload->>'title_en',
    p_blog_payload->>'title_el',
    p_blog_payload->>'title_ro',
    p_blog_payload->>'title_ar',
    p_blog_payload->>'title_de',
    p_blog_payload->>'title_pl',
    p_blog_payload->>'title_ru',
    p_blog_payload->>'content_en',
    p_blog_payload->>'content_el',
    p_blog_payload->>'content_ro',
    p_blog_payload->>'content_ar',
    p_blog_payload->>'content_de',
    p_blog_payload->>'content_pl',
    p_blog_payload->>'content_ru',
    p_blog_payload->>'excerpt_en',
    p_blog_payload->>'excerpt_el',
    p_blog_payload->>'excerpt_ro',
    p_blog_payload->>'excerpt_ar',
    p_blog_payload->>'excerpt_de',
    p_blog_payload->>'excerpt_pl',
    p_blog_payload->>'excerpt_ru',
    p_blog_payload->>'summary_en',
    p_blog_payload->>'summary_el',
    p_blog_payload->>'summary_ro',
    p_blog_payload->>'summary_ar',
    p_blog_payload->>'summary_de',
    p_blog_payload->>'summary_pl',
    p_blog_payload->>'summary_ru',
    case when jsonb_typeof(p_blog_payload->'tags_en') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_en')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_el') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_el')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_ro') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_ro')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_ar') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_ar')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_de') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_de')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_pl') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_pl')) else '{}'::text[] end,
    case when jsonb_typeof(p_blog_payload->'tags_ru') = 'array'
         then array(select jsonb_array_elements_text(p_blog_payload->'tags_ru')) else '{}'::text[] end,
    p_blog_payload->>'seo_title_en',
    p_blog_payload->>'seo_title_el',
    p_blog_payload->>'seo_title_ro',
    p_blog_payload->>'seo_title_ar',
    p_blog_payload->>'seo_title_de',
    p_blog_payload->>'seo_title_pl',
    p_blog_payload->>'seo_title_ru',
    p_blog_payload->>'seo_description_en',
    p_blog_payload->>'seo_description_el',
    p_blog_payload->>'seo_description_ro',
    p_blog_payload->>'seo_description_ar',
    p_blog_payload->>'seo_description_de',
    p_blog_payload->>'seo_description_pl',
    p_blog_payload->>'seo_description_ru',
    p_blog_payload->>'slug',
    p_blog_payload->>'category',
    p_blog_payload->>'subcategory',
    p_blog_payload->>'county',
    p_blog_payload->>'cover_image',
    p_blog_payload->>'source_url',
    nullif(p_blog_payload->>'scraped_article_id', '')::uuid,
    p_blog_payload->>'ai_editor',
    p_blog_payload->>'author_name',
    nullif(p_blog_payload->>'author_id', '')::uuid,
    nullif(p_blog_payload->>'word_count', '')::int,
    coalesce(p_blog_payload->>'status', 'draft'),
    nullif(p_blog_payload->>'published_at', '')::timestamptz
  )
  returning id into v_post_id;

  update public.scraped_articles
  set
    status              = 'processed',
    assigned_editor     = p_writeback->>'assigned_editor',
    rewritten_en        = p_writeback->>'rewritten_en',
    rewritten_el        = p_writeback->>'rewritten_el',
    rewritten_ro        = p_writeback->>'rewritten_ro',
    rewritten_ar        = p_writeback->>'rewritten_ar',
    rewritten_de        = p_writeback->>'rewritten_de',
    rewritten_pl        = p_writeback->>'rewritten_pl',
    rewritten_ru        = p_writeback->>'rewritten_ru',
    title_en            = p_writeback->>'title_en',
    title_el            = p_writeback->>'title_el',
    title_ro            = p_writeback->>'title_ro',
    title_ar            = p_writeback->>'title_ar',
    title_de            = p_writeback->>'title_de',
    title_pl            = p_writeback->>'title_pl',
    title_ru            = p_writeback->>'title_ru',
    excerpt_en          = p_writeback->>'excerpt_en',
    excerpt_el          = p_writeback->>'excerpt_el',
    excerpt_ro          = p_writeback->>'excerpt_ro',
    excerpt_ar          = p_writeback->>'excerpt_ar',
    excerpt_de          = p_writeback->>'excerpt_de',
    excerpt_pl          = p_writeback->>'excerpt_pl',
    excerpt_ru          = p_writeback->>'excerpt_ru',
    summary_en          = p_writeback->>'summary_en',
    summary_el          = p_writeback->>'summary_el',
    summary_ro          = p_writeback->>'summary_ro',
    summary_ar          = p_writeback->>'summary_ar',
    summary_de          = p_writeback->>'summary_de',
    summary_pl          = p_writeback->>'summary_pl',
    summary_ru          = p_writeback->>'summary_ru',
    rewrite_tags        = case when jsonb_typeof(p_writeback->'rewrite_tags') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags')) else rewrite_tags end,
    rewrite_tags_en     = case when jsonb_typeof(p_writeback->'rewrite_tags_en') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_en')) else rewrite_tags_en end,
    rewrite_tags_el     = case when jsonb_typeof(p_writeback->'rewrite_tags_el') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_el')) else rewrite_tags_el end,
    rewrite_tags_ro     = case when jsonb_typeof(p_writeback->'rewrite_tags_ro') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_ro')) else rewrite_tags_ro end,
    rewrite_tags_ar     = case when jsonb_typeof(p_writeback->'rewrite_tags_ar') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_ar')) else rewrite_tags_ar end,
    rewrite_tags_de     = case when jsonb_typeof(p_writeback->'rewrite_tags_de') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_de')) else rewrite_tags_de end,
    rewrite_tags_pl     = case when jsonb_typeof(p_writeback->'rewrite_tags_pl') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_pl')) else rewrite_tags_pl end,
    rewrite_tags_ru     = case when jsonb_typeof(p_writeback->'rewrite_tags_ru') = 'array'
                               then array(select jsonb_array_elements_text(p_writeback->'rewrite_tags_ru')) else rewrite_tags_ru end,
    seo_title_en        = p_writeback->>'seo_title_en',
    seo_title_el        = p_writeback->>'seo_title_el',
    seo_title_ro        = p_writeback->>'seo_title_ro',
    seo_title_ar        = p_writeback->>'seo_title_ar',
    seo_title_de        = p_writeback->>'seo_title_de',
    seo_title_pl        = p_writeback->>'seo_title_pl',
    seo_title_ru        = p_writeback->>'seo_title_ru',
    seo_description_en  = p_writeback->>'seo_description_en',
    seo_description_el  = p_writeback->>'seo_description_el',
    seo_description_ro  = p_writeback->>'seo_description_ro',
    seo_description_ar  = p_writeback->>'seo_description_ar',
    seo_description_de  = p_writeback->>'seo_description_de',
    seo_description_pl  = p_writeback->>'seo_description_pl',
    seo_description_ru  = p_writeback->>'seo_description_ru',
    category            = coalesce(p_writeback->>'category', category),
    subcategory         = p_writeback->>'subcategory',
    cover_image         = p_writeback->>'cover_image',
    output_word_count   = nullif(p_writeback->>'output_word_count', '')::int,
    rewrite_error       = null,
    rewrite_finished_at = now()
  where id = p_scraped_id;

  get diagnostics v_updated = row_count;
  if v_updated = 0 then
    raise exception 'commit_scraper_blog_post: scraped_article % not found during writeback', p_scraped_id;
  end if;

  return v_post_id;
end;
$$;
