-- supabase/pg_cron/schedule.sql
-- Roadmap item 01 — the free-tier ceiling lift. Run this ONCE in the Supabase SQL
-- editor to have Postgres itself call the job worker every few minutes via pg_net,
-- instead of relying on the single daily Vercel Hobby cron. No Vercel Pro needed.
--
-- BEFORE RUNNING:
--   1. In Supabase → Database → Extensions, enable `pg_cron` and `pg_net`.
--   2. Replace <<SITE_URL>> with your deployed origin (e.g. https://cypruslifestyle.eu).
--   3. Provide CRON_SECRET. Recommended: store it in Supabase Vault (see the Vault
--      block below) so it is not written in plaintext into the cron command. If you
--      prefer, you can inline it instead (the "simple" block) — but Vault is safer.
--
-- The worker is idempotent and safe to run concurrently (FOR UPDATE SKIP LOCKED), so
-- overlapping ticks cannot double-process a job. Re-running this file re-schedules
-- cleanly (each schedule call is guarded by an unschedule).

-- ── Option A · Vault (recommended) ────────────────────────────────────────────
-- Store the secret once (replace the value):
--   select vault.create_secret('<<CRON_SECRET>>', 'cl_cron_secret');
-- Then schedule using it:
do $$
declare has_vault boolean;
begin
  select exists (select 1 from pg_extension where extname = 'supabase_vault') into has_vault;
  -- (Un)schedule the frequent worker drain (every 3 minutes).
  perform cron.unschedule('cl-worker') where exists (select 1 from cron.job where jobname = 'cl-worker');
  if has_vault then
    perform cron.schedule('cl-worker', '*/3 * * * *', $cmd$
      select net.http_post(
        url := '<<SITE_URL>>/api/cron/worker',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'cl_cron_secret')
        ),
        body := '{}'::jsonb
      );
    $cmd$);
  else
    raise notice 'Vault not enabled — use Option B (inline secret) below instead.';
  end if;
end $$;

-- ── Option B · Inline secret (simpler; plaintext in the cron command) ─────────
-- Uncomment and replace both placeholders if you are NOT using Vault:
-- select cron.unschedule('cl-worker') where exists (select 1 from cron.job where jobname='cl-worker');
-- select cron.schedule('cl-worker', '*/3 * * * *', $cmd$
--   select net.http_post(
--     url := '<<SITE_URL>>/api/cron/worker',
--     headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','<<CRON_SECRET>>'),
--     body := '{}'::jsonb
--   );
-- $cmd$);

-- ── Optional · also drive the daily subsystems from pg_cron ───────────────────
-- The Vercel cron already calls /api/cron/tick once a day. If you would rather run
-- everything from Supabase (and drop the Vercel cron), schedule these too. They are
-- guarded/idempotent, so a more frequent cadence is safe and just refreshes sooner.
--   select cron.schedule('cl-tick', '0 6 * * *', $cmd$ select net.http_post(url := '<<SITE_URL>>/api/cron/tick',    headers := jsonb_build_object('x-cron-secret','<<CRON_SECRET>>')); $cmd$);
--   select cron.schedule('cl-process','*/15 * * * *', $cmd$ select net.http_post(url := '<<SITE_URL>>/api/cron/process', headers := jsonb_build_object('x-cron-secret','<<CRON_SECRET>>')); $cmd$);

-- ── Inspect / remove ──────────────────────────────────────────────────────────
-- select jobname, schedule, active from cron.job order by jobname;
-- select * from cron.job_run_details order by start_time desc limit 20;   -- last runs
-- select cron.unschedule('cl-worker');                                     -- to stop
