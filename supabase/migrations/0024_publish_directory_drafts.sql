-- ============================================================================
-- Cyprus Lifestyle — publish the curated "broad" directory drafts
-- Surfaces the ~67 real, verified listings that were loaded as status='draft'
-- (backend only) so they appear on the public directory. Run once.
-- (Safe to re-run; only affects rows still in draft.)
-- ============================================================================

update public.directory_listings
   set status = 'published'
 where status = 'draft';

-- How many are now published, by type:
select type, count(*) as published
  from public.directory_listings
 where status = 'published'
 group by type
 order by type;
