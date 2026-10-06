-- 20261007130000_revalidate_webhooks.sql
-- Increment 6.2 - refresh the public pages the moment content changes, with no Dashboard webhooks to click together.
-- Idempotent (safe to run any number of times). Changes no data. Run in: Supabase -> SQL Editor.
--
-- What it does: AFTER INSERT/UPDATE/DELETE triggers on blog_posts, directory_listings and events call
--   POST <cl_site_url>/api/revalidate/tags     (header x-revalidate-secret, Supabase-webhook-style JSON body)
-- through pg_net. The route turns the row into cache tags (lib/cache/tags.ts) and refreshes exactly the pages that read it.
--
-- BEFORE the first run, in Supabase -> SQL Editor (once; NO secret is stored in this repository):
--   select vault.create_secret('https://cypruslifestyle.eu', 'cl_site_url');     -- skip if the cron setup already created it
--   select vault.create_secret('<a long random string>',      'cl_revalidate_secret');
--   -> set the SAME string in Vercel (Production + Preview) as the environment variable REVALIDATE_SECRET, then redeploy.
-- To change a value later:
--   select vault.update_secret((select id from vault.secrets where name = 'cl_revalidate_secret'), '<new value>');
-- Needs the extensions pg_net and supabase_vault (Database -> Extensions); both are already enabled on this project.
--
-- Safety:
--   * NEVER blocks or fails a write: every error inside the trigger is caught and only logged as a WARNING.
--   * Missing Vault secrets -> the trigger silently does nothing (the pages still refresh hourly by themselves).
--   * Only rows that are (or just stopped being) 'published' notify; drafts do not.
--   * An UPDATE that only touched housekeeping columns (view counters, enrichment stamps, updated_at ...) is ignored, so
--     page views and background enrichment never flood the site with refresh calls.
--   * The payload carries only slug/category/type/status, never article text or contact data.
-- Switch off:  alter table public.blog_posts disable trigger zz_cl_revalidate;   (same for directory_listings, events)

create schema if not exists ops;
revoke all on schema ops from public, anon, authenticated;

create or replace function ops.revalidate_notify()
returns trigger
language plpgsql security definer
set search_path = pg_temp
as $$
declare
  v_new    jsonb;
  v_old    jsonb;
  v_noise  text[];
  v_base   text;
  v_secret text;
begin
  begin
    if tg_op in ('INSERT', 'UPDATE') then v_new := to_jsonb(new); end if;
    if tg_op in ('UPDATE', 'DELETE') then v_old := to_jsonb(old); end if;

    -- only public content matters
    if coalesce(v_new ->> 'status', '') <> 'published' and coalesce(v_old ->> 'status', '') <> 'published' then
      return null;
    end if;

    -- ignore edits that only touch housekeeping columns
    if tg_op = 'UPDATE' then
      v_noise := case tg_table_name
        when 'blog_posts' then array['updated_at', 'view_count', 'last_viewed_at', 'social_shares', 'skip_facebook', 'ai_quality_score', 'ai_review_reason']
        else array['updated_at', 'enriched_at', 'enrich_status', 'fetched_at', 'normalized_at', 'text_generated_at', 'partner_pitch', 'partner_pitch_at']
      end;
      if (v_new - v_noise) = (v_old - v_noise) then return null; end if;
    end if;

    select decrypted_secret into v_base   from vault.decrypted_secrets where name = 'cl_site_url';
    select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cl_revalidate_secret';
    if v_base is null or v_secret is null then return null; end if;

    perform net.http_post(
      url     := rtrim(v_base, '/') || '/api/revalidate/tags',
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-revalidate-secret', v_secret),
      body    := jsonb_build_object(
        'type',   tg_op,
        'table',  tg_table_name,
        'schema', tg_table_schema,
        'record',     case when v_new is null then null else jsonb_build_object(
          'slug', v_new ->> 'slug', 'category', v_new ->> 'category', 'type', v_new ->> 'type', 'status', v_new ->> 'status') end,
        'old_record', case when v_old is null then null else jsonb_build_object(
          'slug', v_old ->> 'slug', 'category', v_old ->> 'category', 'type', v_old ->> 'type', 'status', v_old ->> 'status') end
      ),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'revalidate_notify (%.%): %', tg_table_schema, tg_table_name, sqlerrm;
  end;
  return null;
end
$$;
revoke all on function ops.revalidate_notify() from public, anon, authenticated;

drop trigger if exists zz_cl_revalidate on public.blog_posts;
create trigger zz_cl_revalidate after insert or update or delete on public.blog_posts
  for each row execute function ops.revalidate_notify();

drop trigger if exists zz_cl_revalidate on public.directory_listings;
create trigger zz_cl_revalidate after insert or update or delete on public.directory_listings
  for each row execute function ops.revalidate_notify();

drop trigger if exists zz_cl_revalidate on public.events;
create trigger zz_cl_revalidate after insert or update or delete on public.events
  for each row execute function ops.revalidate_notify();

-- VERIFY (SQL editor), after the secrets exist:
--   update public.events set title_en = title_en where id = (select id from public.events limit 1);   -- no-op edit: nothing is sent
--   update public.events set summary_en = coalesce(summary_en,'') || ' ' where id = (select id from public.events where status = 'published' limit 1);
--   select id, status_code, left(content::text, 80) from net._http_response order by id desc limit 3;   -- 200 {"ok":true,...}
