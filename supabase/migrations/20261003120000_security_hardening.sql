-- =============================================================================
-- CYPRUS LIFESTYLE — Backend security hardening
-- Generated 2026-10-03 from a live audit of project htwaivnvabvpqkffllnc.
-- Apply in the Supabase Dashboard → SQL Editor. Idempotent; safe to re-run.
-- =============================================================================
--
-- HOW THIS FILE IS ORGANISED
--   Sections 1–6 are SAFE to run as-is. They remove anonymous/public access to
--   things that were never meant to be public, and they do NOT touch anything a
--   logged-in admin or the public website legitimately uses. Run them top to
--   bottom, or one section at a time.
--
--   Section 7 is COMMENTED OUT on purpose. Every statement there is either
--   destructive or could affect the admin dashboard / a public client call, and
--   must be matched to how the Next.js app reads the data (repo review). Read the
--   notes, uncomment only what you've confirmed, then run.
--
--   Section 8 is verification — run it after, it writes nothing.
--
-- WHAT IS DELIBERATELY NOT TOUCHED (leave these as-is — they ARE meant to be anon):
--   has_role(...)                      used inside RLS policies; revoking it would
--                                      break every policy that calls it.
--   increment_view_count(...)          public blog view counter
--   increment_banner_clicks(...)       public ad metric
--   increment_banner_impressions(...)  public ad metric
--   validate_editor_token(...)         the editor magic-link flow (UUID token)
-- =============================================================================


-- =============================================================================
-- SECTION 1 — CRITICAL: lock down fulfil_ad_order()
-- -----------------------------------------------------------------------------
-- fulfil_ad_order(uuid) is SECURITY DEFINER with NO internal auth check, and is
-- currently EXECUTE-able by `anon` and `authenticated` over the public REST API
-- (/rest/v1/rpc/fulfil_ad_order). An unauthenticated caller can pass an ad_orders
-- id and the function will flip the linked directory listing to
-- featured + verified + commercial_tier, insert sponsor_banners, create sponsored
-- draft posts and newsletter_sponsors — i.e. grant paid placements for free, and
-- bypass the Stripe payment step. It should only ever be called server-side by the
-- payment webhook (service_role).
-- =============================================================================
revoke execute on function public.fulfil_ad_order(uuid) from anon, authenticated;
grant  execute on function public.fulfil_ad_order(uuid) to service_role;


-- =============================================================================
-- SECTION 2 — HIGH: revoke anon/authenticated EXECUTE on SECURITY DEFINER
--            functions that should be service-role / internal only
-- -----------------------------------------------------------------------------
--  get_analytics_data          returns the FULL site traffic analytics (views,
--                              visitors, countries, cities, referrers, devices).
--                              The app already has get_analytics_data_admin, which
--                              checks has_role(...). Lock the unguarded one down.
--  crm_upsert_account          lets anyone insert rows into crm_orgs (CRM spam).
--  crm_sync_directory_account  trigger fn, mis-exposed as RPC.
--  sync_subscriber_to_contacts trigger fn, mis-exposed as RPC.
--  handle_new_user             auth trigger fn, mis-exposed as RPC.
--  sweep_stuck_rewrite_jobs    job-queue maintenance; cron/service only.
-- =============================================================================
revoke execute on function public.get_analytics_data(text)             from anon, authenticated;
revoke execute on function public.crm_upsert_account(text,text,text,text,text) from anon, authenticated;
revoke execute on function public.crm_sync_directory_account()         from anon, authenticated;
revoke execute on function public.sync_subscriber_to_contacts()        from anon, authenticated;
revoke execute on function public.handle_new_user()                    from anon, authenticated;
revoke execute on function public.sweep_stuck_rewrite_jobs()           from anon, authenticated;


-- =============================================================================
-- SECTION 3 — HIGH: stop ANONYMOUS reads of internal SECURITY DEFINER views
-- -----------------------------------------------------------------------------
-- These 22 views are SECURITY DEFINER (they bypass RLS) AND were granted to anon
-- + authenticated. Anonymous REST reads currently expose revenue, AI spend, CRM
-- prospect data and support tickets. This section removes the ANONYMOUS grant only
-- (anon is never a signed-in admin, so this cannot break the admin UI). Tightening
-- the `authenticated` role + converting to security_invoker is in Section 7, which
-- needs confirmation of how the admin dashboard reads them.
--
-- blog_comments_public is intentionally public — it is NOT revoked here.
-- =============================================================================
revoke all on table
  public.listing_revenue,
  public.advertiser_roi,
  public.ai_spend_total,
  public.ai_spend_by_month,
  public.ai_spend_daily,
  public.ai_spend_by_function_daily,
  public.crm_prospect_scores,
  public.mailroom_tickets,
  public.mailroom_stats,
  public.error_log_grouped,
  public.job_queue_stats,
  public.listing_attribution,
  public.listing_recommendations,
  public.cta_by_listing,
  public.concierge_coverage_daily,
  public.concierge_coverage_summary,
  public.concierge_coverage_topics,
  public.concierge_eval_summary,
  public.directory_coverage_overall,
  public.directory_coverage_by_group,
  public.directory_coverage_by_district,
  public.directory_coverage_cells,
  public.editorial_coverage,
  public.editorial_plan
from anon;


-- =============================================================================
-- SECTION 4 — HIGH (correctness + search_path): make the retrieval RPCs work for
--            any caller, and pin their search_path
-- -----------------------------------------------------------------------------
-- WHY: directory_embeddings and kb_embeddings have RLS enabled with NO policy, so
-- an `anon`/`authenticated` caller sees 0 rows in them. match_directory and
-- match_kb_docs are SECURITY INVOKER, so when the public site calls them with the
-- anon/publishable key they return NOTHING — the entire semantic layer (17,747
-- directory vectors + the KB) is silently dead on the public path. (Verified live:
-- as the anon role, directory_embeddings and kb_embeddings both return 0 rows.)
--
-- The retired edge function avoided this by calling with the service_role key. If
-- the live concierge brain (lib/concierge/brain.ts) also uses service_role, these
-- already work and this section is a no-op for behaviour — but it still (a) fixes
-- the mutable-search_path warning and (b) makes retrieval correct even if the
-- brain ever calls with the anon key. Each function already filters to published
-- (match_directory also includes 'listed', by existing design, for the concierge),
-- so SECURITY DEFINER does not expose unpublished data beyond today's behaviour.
--
-- NOTE: match_directory returns 'listed' (concierge-only) slugs as well as
-- 'published'. That is unchanged from today. If you want direct anon callers to
-- never see 'listed' slugs, change `l.status in ('published','listed')` to
-- `l.status = 'published'` below — but confirm the concierge doesn't rely on
-- 'listed' semantic hits first.
-- =============================================================================

create or replace function public.match_directory(
  query_embedding vector,
  match_count integer default 8,
  filter_type text default null,
  filter_district text default null
)
returns table(slug text, similarity double precision)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select e.slug, 1 - (e.embedding <=> query_embedding) as similarity
  from public.directory_embeddings e
  join public.directory_listings l on l.slug = e.slug
  where e.embedding is not null
    and l.status in ('published', 'listed')
    and (filter_type is null or l.type = filter_type)
    and (filter_district is null or l.district = filter_district)
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$function$;

create or replace function public.match_directory_name(q text, match_count integer default 12)
returns table(slug text, score real)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  with scored as (
    select
      l.slug,
      greatest(
        word_similarity(q, coalesce(l.name_en, '')),
        word_similarity(q, coalesce(l.name_el, '')),
        word_similarity(q, coalesce(l.name_ru, '')),
        word_similarity(q, coalesce(l.name_ro, '')),
        word_similarity(q, coalesce(l.name_de, '')),
        word_similarity(q, coalesce(l.name_ar, '')),
        word_similarity(q, coalesce(l.name_pl, ''))
      )::real as sim,
      (coalesce(l.name_en, '') ilike '%' || q || '%') as substr_hit
    from public.directory_listings l
    where l.status = 'published'
  )
  select
    slug,
    (case when substr_hit then greatest(sim, 0.95::real) else sim end) as score
  from scored
  where sim > 0.30 or substr_hit
  order by score desc
  limit greatest(1, match_count);
$function$;

create or replace function public.match_kb_docs(query_embedding vector, match_count integer default 6)
returns table(id text, url text, title text, description text, source text, image text, similarity double precision)
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select d.id::text, d.url, d.title, d.description, d.source, d.image,
         1 - (e.embedding <=> query_embedding) as similarity
  from public.kb_embeddings e
  join public.kb_docs d on d.id::text = e.id
  where d.published = true
  order by e.embedding <=> query_embedding
  limit greatest(1, match_count);
$function$;

grant execute on function public.match_directory(vector,integer,text,text) to anon, authenticated, service_role;
grant execute on function public.match_directory_name(text,integer)        to anon, authenticated, service_role;
grant execute on function public.match_kb_docs(vector,integer)             to anon, authenticated, service_role;


-- =============================================================================
-- SECTION 5 — MEDIUM: close the public backup table
-- -----------------------------------------------------------------------------
-- directory_listings_coords_backup_20260928 has RLS DISABLED in the public schema,
-- so it is readable by anyone via /rest/v1/. Enabling RLS with no policy denies
-- all anon/authenticated access (service_role still sees it). Non-destructive.
-- (If the coords migration it backed up is confirmed stable, you can instead DROP
--  it — see Section 7.)
-- =============================================================================
alter table public.directory_listings_coords_backup_20260928 enable row level security;


-- =============================================================================
-- SECTION 6 — WARN: pin search_path on the remaining flagged functions
-- -----------------------------------------------------------------------------
-- 19 functions were flagged with a mutable search_path. The 3 match_* RPCs are
-- handled in Section 4. This block sets `search_path = public, pg_temp` on the
-- rest, by name, only if they exist. Defense-in-depth against search_path hijack.
-- =============================================================================
do $$
declare
  fn record;
begin
  for fn in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'set_reading_time','update_updated_at','match_kb','prune_error_log',
        'job_enqueue','job_dequeue','job_complete','job_fail','job_reap_stuck','job_prune',
        'apply_listing_edit','enroll_prospects_bulk','erase_personal_data',
        'directory_dedup_key','directory_first_party_rating','kb_docs_needing_embedding'
      )
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn.sig);
  end loop;
end $$;


-- =============================================================================
-- SECTION 7 — CONFIRM FIRST (all statements COMMENTED OUT) ─ needs repo/app review
-- -----------------------------------------------------------------------------
-- Everything below is destructive or could affect the admin dashboard / a public
-- client call. Uncomment only the lines you've confirmed, then run.
-- =============================================================================

-- 7a) Remove `authenticated` reads of the internal views (members are
--     `authenticated` too, so they can currently read revenue / CRM / tickets).
--     ⚠️ CONFIRMED (repo review 2026-10-03): the admin dashboard reads these views
--     AS THE `authenticated` ROLE — attribution/analytics/coverage via server
--     components on the user session, and crm_prospect_scores from a CLIENT
--     component. Running this revoke AS-IS WILL BREAK those admin pages.
--     Fix first: move those reads to the service client (supabaseAdmin), then run
--     this. See docs/audit/2026-10-03-repo-review-addendum.md §2.
--
-- revoke all on table
--   public.listing_revenue, public.advertiser_roi,
--   public.ai_spend_total, public.ai_spend_by_month, public.ai_spend_daily,
--   public.ai_spend_by_function_daily, public.crm_prospect_scores,
--   public.mailroom_tickets, public.mailroom_stats, public.error_log_grouped,
--   public.job_queue_stats, public.listing_attribution, public.listing_recommendations,
--   public.cta_by_listing, public.concierge_coverage_daily, public.concierge_coverage_summary,
--   public.concierge_coverage_topics, public.concierge_eval_summary,
--   public.directory_coverage_overall, public.directory_coverage_by_group,
--   public.directory_coverage_by_district, public.directory_coverage_cells,
--   public.editorial_coverage, public.editorial_plan
-- from authenticated;

-- 7b) Robust alternative to revoking: make each view respect the caller's RLS
--     (security_invoker). Requires the base tables to have admin RLS policies,
--     otherwise admins see nothing through the view. Example for one view:
--
-- alter view public.listing_revenue set (security_invoker = on);
--   ... (repeat per view once base-table admin policies are confirmed)

-- 7c) update_view_geo(p_slug,...) is anon-executable and writes geo onto
--     site_analytics. If the public site calls it client-side after a pageview,
--     KEEP it. If geo is set server-side, revoke anon:
-- revoke execute on function public.update_view_geo(text,text,text) from anon, authenticated;

-- 7d) match_editorial_ideas(...) is editorial tooling, not public. If the public
--     site doesn't call it, revoke anon:
-- revoke execute on function public.match_editorial_ideas(vector,integer) from anon;

-- 7e) Drop the coords backup table entirely (instead of Section 5) once the
--     coords migration is confirmed stable. DESTRUCTIVE.
-- drop table if exists public.directory_listings_coords_backup_20260928;


-- =============================================================================
-- SECTION 8 — VERIFICATION (writes nothing; run after Sections 1–6)
-- =============================================================================
-- 8.1  Confirm the dangerous functions are no longer anon/authenticated-executable.
select p.proname,
       case when p.proacl is null then 'DEFAULT(PUBLIC)'
            else coalesce((select string_agg(distinct r.rolname, ',')
                           from aclexplode(p.proacl) a join pg_roles r on r.oid=a.grantee
                           where a.privilege_type='EXECUTE' and r.rolname in ('anon','authenticated')), '(none)')
       end as anon_auth_execute
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('fulfil_ad_order','get_analytics_data','crm_upsert_account',
                    'crm_sync_directory_account','sync_subscriber_to_contacts',
                    'handle_new_user','sweep_stuck_rewrite_jobs')
order by p.proname;
-- Expect: anon_auth_execute = '(none)' for every row.

-- 8.2  Confirm anon can no longer read the internal views (should return 0 rows / error per view).
-- set local role anon; select count(*) from public.listing_revenue; reset role;

-- 8.3  Confirm the retrieval RPCs now return rows for a public caller.
-- set local role anon;
-- select count(*) as name_hits from public.match_directory_name('Zya Cafe', 3);   -- expect > 0
-- reset role;

-- 8.4  Re-run the security advisor afterwards (Dashboard → Advisors, or the MCP)
--      and confirm the anon/authenticated SECURITY DEFINER-function findings and
--      the rls_disabled_in_public finding are cleared.
