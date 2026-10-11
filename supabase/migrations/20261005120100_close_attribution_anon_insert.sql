-- 20261005120100_close_attribution_anon_insert.sql
-- Phase 1 · Increment 1.2 — close the last wide-open write policy. Idempotent. Run in: Supabase → SQL Editor.
--
-- `attribution_clicks` had an INSERT policy for anon/authenticated with `with check (true)`: anyone holding the
-- public anon key could write rows straight into the table through Supabase's REST API. Those rows feed the
-- advertiser attribution/ROI reports (view listing_attribution, cta_by_listing), so they could be inflated at will.
--
-- Safe: the only writer in the application is POST /api/track/rec-click, which uses the server-side service role
-- (it bypasses RLS) and is rate-limited. No page writes to this table with the anon key.
--
-- Verify (expect no rows):
--   select policyname from pg_policies where schemaname = 'public' and tablename = 'attribution_clicks' and cmd = 'INSERT';
-- Rollback (only if something unexpected breaks):
--   create policy "attribution_clicks insert" on public.attribution_clicks for insert to anon, authenticated with check (true);

drop policy if exists "attribution_clicks insert" on public.attribution_clicks;
