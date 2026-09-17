-- ============================================================================
-- Cyprus Lifestyle — 0039 · Rate-card language count fix
--   The à-la-carte "format" text still read "4 languages / 4-lang" (leftover
--   from the 0028 seed). Everything now publishes across all seven editions.
--   Cosmetic only; idempotent; safe to run once or again.
-- ============================================================================

update public.ad_pricing set format = 'Banner, 7 languages'
 where slot = 'sidebar-leaderboard';

update public.ad_pricing set format = 'Branded article, 7 languages, promoted'
 where slot = 'sponsored-feature';

-- report
select slot, format from public.ad_pricing
where slot in ('sidebar-leaderboard','sponsored-feature')
order by slot;
