-- ============================================================================
-- Cyprus-first feed set. The old seed leaned on international titles (BBC, NYT,
-- FT, Guardian, Vogue, Robb Report, Condé Nast…) — those produced the off-brand
-- content (Dangote, Panama, Miami, London cafés). With the relevance gate live,
-- they only fill the queue with items that get skipped, so we switch them off and
-- make the desk Cyprus-first. Run once in the Supabase SQL editor. Safe to re-run.
-- ============================================================================

-- 1) Switch OFF every non-Cyprus feed (kept in the table; re-enable any in Admin →
--    Scraper if you want it, the relevance gate still filters it to Cyprus items).
update public.rss_sources set is_active = false where region is distinct from 'cyprus';

-- 2) Keep all Cyprus feeds ON.
update public.rss_sources set is_active = true where region = 'cyprus';

-- 3) Verified-live Cyprus feeds (add if missing, otherwise (re)activate + retag).
-- (All URLs below verified live on 2026-09-15.)
insert into public.rss_sources (name, url, category, source_language, region, tier, is_active) values
  ('Cyprus Mail',                 'https://cyprus-mail.com/feed/',                                 'cyprus',   'en', 'cyprus', 'news',     true),
  ('Cyprus Mail — What''s On',    'https://cyprus-mail.com/category/entertainment/whats-on/feed/', 'culture',  'en', 'cyprus', 'lifestyle',true),
  ('Cyprus Mail — Life & Style',  'https://cyprus-mail.com/category/life-style/feed/',             'culture',  'en', 'cyprus', 'lifestyle',true),
  ('Financial Mirror',            'https://www.financialmirror.com/feed/',                         'business', 'en', 'cyprus', 'business', true),
  ('Cyprus Property News',        'https://www.news.cyprus-property-buyers.com/feed',              'property', 'en', 'cyprus', 'business', true)
on conflict (url) do update
  set is_active = true,
      region = 'cyprus',
      category = excluded.category,
      tier = excluded.tier;

-- Note: some Cyprus outlets sit behind bot protection (e.g. in-cyprus/Philenews)
-- and may still fail even with the browser user-agent — the scraper now records
-- the real reason (e.g. "blocked (bot-protection page)", "HTTP 404") on each
-- source, so check Admin → Scraper and switch off any that stay red.

select name, region, category, is_active from public.rss_sources order by is_active desc, region, name;
