-- 20261004130300_close_anon_inserts.sql
-- Phase 0 security hardening — close direct anonymous/authenticated INSERTs.
-- Safe to run more than once. Run in: Supabase → SQL Editor.
--
-- WHY: these policies let anyone holding the PUBLIC anon key write straight into the tables
-- through Supabase's REST API, bypassing the app's honeypot, rate limit and (for the
-- newsletter) double opt-in — which also destroys proof of consent.
--
-- WHY IT IS SAFE: every public form already writes through the server using the service
-- role, which bypasses RLS:
--   newsletter  → /api/newsletter/subscribe → lib/newsletter.ts (supabaseAdmin)
--   contact     → /api/contact              (supabaseAdmin)
--   comments    → /api/comments             (supabaseAdmin)
-- and no public page uses the anon browser client (only /admin pages do, signed in as admin,
-- and they are covered by the separate admin policies, which this file does not touch).
-- site_analytics / section_views have no writer in the app at all.
--
-- BEFORE YOU RUN — check nothing else in your stack inserts with the anon key:
--   select schemaname, tablename, policyname, roles, cmd
--   from pg_policies
--   where cmd in ('INSERT','ALL') and 'anon' = any(roles)
--   order by tablename;
-- (Anything listed other than the policies dropped below is outside this file's scope.)

drop policy if exists "Anyone can subscribe"         on public.newsletter_subscribers;
drop policy if exists "Anyone can submit contact"    on public.contact_messages;
drop policy if exists "Anyone can insert comments"   on public.comments;
drop policy if exists "Anyone can submit comments"   on public.blog_comments;
drop policy if exists "Anyone can insert analytics"  on public.site_analytics;
drop policy if exists "Anyone can insert section views" on public.section_views;

-- Verify (expect zero rows):
--   select tablename, policyname from pg_policies
--   where schemaname = 'public'
--     and tablename in ('newsletter_subscribers','contact_messages','comments','blog_comments','site_analytics','section_views')
--     and cmd = 'INSERT' and ('anon' = any(roles) or 'authenticated' = any(roles))
--     and policyname in ('Anyone can subscribe','Anyone can submit contact','Anyone can insert comments','Anyone can submit comments','Anyone can insert analytics','Anyone can insert section views');
--
-- ROLLBACK (only if something you did not know about breaks), e.g. for the newsletter:
--   create policy "Anyone can subscribe" on public.newsletter_subscribers
--     for insert to anon, authenticated with check (true);
