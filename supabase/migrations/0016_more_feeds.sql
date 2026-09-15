-- ============================================================================
-- Tier 2 feed backlog + retag events into the new "agenda" category.
-- Run once in the Supabase SQL editor (after 0014). Safe to re-run.
--
-- The Tier 2 sources below are added INACTIVE with their homepage URLs: I could
-- not confirm a working feed URL for them today, and the scraper now auto-detects
-- a site's feed link and reports the real error, so you can flip one on in
-- Admin → Scraper and see immediately whether it resolves a feed. Activate the
-- ones that light up green; leave the rest off.
-- ============================================================================

-- Route "What's On" into the new Agenda section (category added this release).
update public.rss_sources set category = 'agenda'
where url = 'https://cyprus-mail.com/category/entertainment/whats-on/feed/';

-- Tier 2 backlog (inactive). region 'cyprus' stays eligible under the Cyprus-first
-- rule; the two clearly international titles are kept for gated yachting/Med-travel
-- (the relevance gate still filters them to Cyprus items only).
insert into public.rss_sources (name, url, category, source_language, region, tier, is_active) values
  ('Cyprus Profile',            'https://www.cyprusprofile.com/',        'business',   'en', 'cyprus',        'business', false),
  ('InBusinessNews',            'https://inbusinessnews.reporter.com.cy/','business',  'en', 'cyprus',        'business', false),
  ('Cyprus Yachting Magazine',  'https://cyprusyachtingmagazine.com/',   'escapes',    'en', 'cyprus',        'lifestyle',false),
  ('Visit Cyprus',              'https://www.visitcyprus.com/',          'agenda',     'en', 'cyprus',        'news',     false),
  ('EventOr Cyprus',            'https://eventor.com.cy/',               'agenda',     'en', 'cyprus',        'lifestyle',false),
  ('All About Limassol',        'https://allaboutlimassol.com/en/',      'agenda',     'en', 'cyprus',        'lifestyle',false),
  ('Boat International',         'https://www.boatinternational.com/',    'escapes',    'en', 'international',  'luxury',   false),
  ('Greece Is',                 'https://www.greece-is.com/',            'escapes',    'en', 'greece',        'luxury',   false)
on conflict (url) do nothing;

select name, category, region, is_active from public.rss_sources order by is_active desc, region, name;
