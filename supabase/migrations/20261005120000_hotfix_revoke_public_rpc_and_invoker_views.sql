-- 20261005120000_hotfix_revoke_public_rpc_and_invoker_views.sql
-- Phase 1 · Increment 1.0 — URGENT HOTFIX (idempotent; safe to run more than once).
-- Run in: Supabase → SQL Editor, project cyprus_lifestyle (htwaivnvabvpqkffllnc).
--
-- WHAT THE LIVE DATABASE SHOWED (read-only inspection on 2026-10-05, then reproduced and tested on a
-- rebuilt copy of production — see supabase/baseline/):
--   1. Seventeen SECURITY DEFINER functions carried the default "anyone may EXECUTE" permission, so anyone
--      holding the PUBLIC anon key could call them through https://<project>.supabase.co/rest/v1/rpc/<name>.
--      Demonstrated on the copy, as an anonymous caller:
--        fulfil_ad_order(<id of one's own UNPAID order>)  → creates a fulfilment task for the desk (and, for some
--                                                            products, an inactive banner draft / draft sponsored
--                                                            post / pending newsletter sponsor row). It cannot
--                                                            flip a listing to "featured/verified" by itself:
--                                                            orders are only linked to a CRM account after payment.
--        crm_upsert_account(...)                           → creates junk CRM accounts; probes existing ones by domain
--        get_analytics_data('7d')                          → reads the whole site's analytics (no admin check)
--        increment_banner_clicks / _impressions(<banner>)  → inflates an advertiser's click/impression counts
--        increment_view_count(<slug>)                      → inflates article views
--        sweep_stuck_rewrite_jobs()                        → fails queued rewrite jobs older than 15 minutes
--      (crm_sync_directory_account, sync_subscriber_to_contacts and handle_new_user are trigger functions and
--      cannot be called directly; they are tightened for hygiene. The match_* / search_kb_docs vector lookups
--      only return slugs and scores. The 2026-10-03 audit fix for this was not in effect on this database.)
--   2. Twenty-two internal reporting views (revenue, CRM, support tickets, AI spend, mail …) were SECURITY DEFINER:
--      they run with the owner's rights, so ANY signed-in user (not only admins) could read them. Today the
--      database has a single account (the admin), so nothing has leaked — but member accounts are coming,
--      and so is the risk if "Allow new users to sign up" is enabled in Supabase Auth → Providers.
--
-- WHAT THIS DOES (no data is modified):
--   A. Revokes EXECUTE on those 17 functions from PUBLIC, anon and authenticated; service_role keeps it.
--      Kept deliberately: has_role (used inside RLS policies) and get_analytics_data_admin for
--      signed-in admins (the admin pages call it with the admin's session).
--   B. Switches the 22 views to security_invoker = on, so they obey the RLS of the tables beneath
--      them. Every underlying table already has an admin-only policy (verified), so your admin
--      pages keep working and everyone else sees nothing. The service role is unaffected.
--
-- ROLLBACK (only if something you did not know about breaks) is at the bottom of this file.

-- ── A. Functions ─────────────────────────────────────────────────────────────────────
do $$
declare
  r record;
  lock_down text[] := array[
    -- privileged / maintenance: server only
    'fulfil_ad_order', 'crm_upsert_account', 'crm_sync_directory_account',
    'sweep_stuck_rewrite_jobs', 'sync_subscriber_to_contacts', 'handle_new_user',
    'get_analytics_data',
    -- never called by the app with a user/anon session (server uses the service role)
    'match_directory', 'match_directory_name', 'match_editorial_ideas',
    'match_kb_docs', 'search_kb_docs',
    -- legacy counters / token check: no caller in the app; rate-limited tracking is done server-side
    'increment_banner_clicks', 'increment_banner_impressions', 'increment_view_count',
    'update_view_geo', 'validate_editor_token'
  ];
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = any (lock_down)
  loop
    execute format('revoke all on function public.%I(%s) from public', r.proname, r.args);
    execute format('revoke all on function public.%I(%s) from anon, authenticated', r.proname, r.args);
    execute format('grant execute on function public.%I(%s) to service_role', r.proname, r.args);
  end loop;
end $$;

-- Admin analytics: signed-in users only (the function itself is called with the admin session).
revoke all on function public.get_analytics_data_admin(text) from public, anon;
grant execute on function public.get_analytics_data_admin(text) to authenticated, service_role;

-- ── B. Views → security_invoker ──────────────────────────────────────────────────────
do $$
declare v text;
  views text[] := array[
    'advertiser_roi', 'ai_spend_by_function_daily', 'ai_spend_by_month', 'ai_spend_daily',
    'ai_spend_total', 'blog_comments_public', 'concierge_coverage_daily',
    'concierge_coverage_summary', 'concierge_coverage_topics', 'concierge_eval_summary',
    'cta_by_listing', 'directory_coverage_by_district', 'directory_coverage_by_group',
    'directory_coverage_cells', 'directory_coverage_overall', 'error_log_grouped',
    'job_queue_stats', 'listing_attribution', 'listing_recommendations', 'listing_revenue',
    'mailroom_stats', 'mailroom_tickets'
  ];
begin
  foreach v in array views loop
    if to_regclass('public.' || v) is not null then
      execute format('alter view public.%I set (security_invoker = on)', v);
    end if;
  end loop;
end $$;

-- ── VERIFY (run after; expected results in comments) ─────────────────────────────────
-- 1) Should list NO rows (nothing privileged left open to anon/authenticated):
--    select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.prosecdef
--      and p.proname not in ('has_role', 'get_analytics_data_admin')
--      and (has_function_privilege('anon', p.oid, 'EXECUTE') or has_function_privilege('authenticated', p.oid, 'EXECUTE'));
-- 2) Should show security_invoker=on for every view:
--    select c.relname, c.reloptions from pg_class c where c.relnamespace = 'public'::regnamespace and c.relkind = 'v' order by 1;
-- 3) Then open /admin → Dashboard, Analytics, Attribution, Coverage, Mail, CRM, Fulfilment:
--    all must still load data. The Supabase security advisor should no longer list
--    "Security Definer View" (22) or the 19+19 SECURITY DEFINER function warnings (except the two kept above).

-- ── ROLLBACK (not part of the migration — copy only if needed) ───────────────────────
-- grant execute on function public.fulfil_ad_order(uuid) to public;   -- etc., per function
-- alter view public.advertiser_roi set (security_invoker = off);       -- etc., per view
