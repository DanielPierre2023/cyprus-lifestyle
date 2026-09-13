-- ============================================================================
-- Cyprus Lifestyle — 0008 · Indexes
-- Mirrors the live Transilvania Times index set for every ported table
-- (verbatim, made idempotent), plus:
--   • GIN indexes for search_el / search_ar (the 4-language extension)
--   • rss_sources region/tier/lang/url indexes (Cyprus feed routing)
-- Three of these are behaviourally important, not just performance:
--   • uq_rewrite_jobs_active_article  → the "one active rewrite per article" lock
--   • scraped_articles_original_url_uniq → de-dupes re-scraped URLs
--   • uq_blog_posts_scraped_article_id → one published post per scraped item
-- ============================================================================

-- ai_spend_log
create index if not exists ai_spend_log_function_idx          on public.ai_spend_log using btree (function_name, occurred_at desc);
create index if not exists ai_spend_log_job_idx               on public.ai_spend_log using btree (job_id) where (job_id is not null);
create index if not exists ai_spend_log_occurred_idx          on public.ai_spend_log using btree (occurred_at desc);
create index if not exists ai_spend_log_provider_occurred_idx on public.ai_spend_log using btree (provider, occurred_at desc);

-- authors
create index if not exists idx_authors_active     on public.authors using btree (active);
create index if not exists idx_authors_editor_key on public.authors using btree (editor_key);
create index if not exists idx_authors_slug       on public.authors using btree (slug);

-- comments
create index if not exists idx_blog_comments_post_id on public.blog_comments using btree (post_id);
create index if not exists idx_comments_post_id      on public.comments using btree (post_id);

-- blog_posts (live partial indexes + 4-language search GIN)
create index if not exists blog_posts_view_count_idx           on public.blog_posts using btree (view_count desc, published_at desc) where (status = 'published');
create index if not exists idx_blog_posts_author_id            on public.blog_posts using btree (author_id);
create index if not exists idx_blog_posts_breaking             on public.blog_posts using btree (published_at desc) where ((status = 'published') and (is_breaking = true));
create index if not exists idx_blog_posts_category_published   on public.blog_posts using btree (category, published_at desc) where (status = 'published');
create index if not exists idx_blog_posts_corrected            on public.blog_posts using btree (corrected_at desc) where (corrected_at is not null);
create index if not exists idx_blog_posts_county_published     on public.blog_posts using btree (county, published_at desc) where ((status = 'published') and (county is not null));
create index if not exists idx_blog_posts_scraped_article_id   on public.blog_posts using btree (scraped_article_id);
create index if not exists idx_blog_posts_status_published     on public.blog_posts using btree (published_at desc) where (status = 'published');
create unique index if not exists uq_blog_posts_scraped_article_id on public.blog_posts using btree (scraped_article_id) where (scraped_article_id is not null);
create index if not exists idx_blog_posts_search_en on public.blog_posts using gin (search_en);
create index if not exists idx_blog_posts_search_el on public.blog_posts using gin (search_el);
create index if not exists idx_blog_posts_search_ro on public.blog_posts using gin (search_ro);
create index if not exists idx_blog_posts_search_ar on public.blog_posts using gin (search_ar);

-- column_jobs
create index if not exists column_jobs_created_idx on public.column_jobs using btree (created_at desc);
create index if not exists column_jobs_worker_idx  on public.column_jobs using btree (status, claimed_at);

-- editor_drafts / editor_tokens
create index if not exists idx_editor_drafts_author on public.editor_drafts using btree (author_id);
create index if not exists idx_editor_drafts_status on public.editor_drafts using btree (status);
create index if not exists idx_editor_tokens_author on public.editor_tokens using btree (author_id);
create index if not exists idx_editor_tokens_token  on public.editor_tokens using btree (token) where (active = true);

-- generation_logs
create index if not exists idx_genlogs_created on public.generation_logs using btree (created_at desc);
create index if not exists idx_genlogs_status  on public.generation_logs using btree (status);

-- newsletter
create unique index if not exists newsletter_subscribers_confirmation_token_idx
  on public.newsletter_subscribers using btree (confirmation_token) where (confirmation_token is not null);

-- rewrite_jobs — the active-article lock
create unique index if not exists uq_rewrite_jobs_active_article
  on public.rewrite_jobs using btree (article_id) where (status = any (array['queued','processing']));

-- scraped_articles
create index if not exists idx_scraped_articles_sonnet_fallback on public.scraped_articles using btree (sonnet_fallback_used) where (sonnet_fallback_used = true);
create index if not exists idx_scraped_cleanup on public.scraped_articles using btree (is_used, marked_for_deletion, created_at);
create index if not exists idx_scraped_pending on public.scraped_articles using btree (status, is_used, created_at);
create unique index if not exists scraped_articles_original_url_uniq
  on public.scraped_articles using btree (original_url)
  where ((original_url is not null) and ((marked_for_deletion is null) or (marked_for_deletion = false)));

-- site_analytics
create index if not exists idx_analytics_country     on public.site_analytics using btree (country);
create index if not exists idx_analytics_created_at  on public.site_analytics using btree (created_at desc);
create index if not exists idx_analytics_is_bot      on public.site_analytics using btree (is_bot);
create index if not exists idx_analytics_page_path   on public.site_analytics using btree (page_path);
create index if not exists idx_analytics_referrer    on public.site_analytics using btree (referrer);
create index if not exists idx_analytics_visitor_id  on public.site_analytics using btree (visitor_id);
create index if not exists site_analytics_campaign_content_idx
  on public.site_analytics using btree (utm_campaign, utm_content, created_at desc) where (utm_campaign is not null);

-- social_posts
create index if not exists social_posts_article_idx  on public.social_posts using btree (article_id, created_at desc);
create index if not exists social_posts_campaign_idx on public.social_posts using btree (campaign);
create index if not exists social_posts_created_idx  on public.social_posts using btree (created_at desc);

-- rss_sources — Cyprus feed routing (live has only the pkey; these are additions)
create index if not exists idx_rss_active      on public.rss_sources using btree (is_active);
create index if not exists idx_rss_region_tier on public.rss_sources using btree (region, tier);
create index if not exists idx_rss_lang        on public.rss_sources using btree (source_language);
