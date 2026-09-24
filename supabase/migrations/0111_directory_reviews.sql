-- ============================================================================
-- Cyprus Lifestyle — 0111 · Review snippets on the listing
-- ----------------------------------------------------------------------------
-- Reviews are the one thing the cyprusatlas export did NOT contain, so they are the only
-- field worth fetching from Google. The enrich-directory edge function, when called with
-- &reviews=1, now stores up to 5 Google review snippets per listing here as JSON
-- ([{author,rating,text,when}]). Used to enrich semantic retrieval (embed-directory reads
-- it) and, later, for the concierge to quote real guest opinion. Additive & idempotent.
-- ============================================================================

alter table public.directory_listings add column if not exists reviews jsonb;

select (select count(*) from public.directory_listings where reviews is not null) as with_reviews;
