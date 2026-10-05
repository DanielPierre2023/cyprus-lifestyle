# Operations — scheduler, health checks, alerts

## What runs automatically
| What | Where | How often |
|---|---|---|
| Daily job: queues the day's background work, prepares the Friday newsletter drafts, reconciles members, runs the health check | Vercel cron `/api/cron/tick` (vercel.json) | daily 06:00 UTC |
| `cl-worker`: background queue, approved newsletters, Facebook/Instagram posts, health check | Supabase pg_cron → `/api/cron/worker` | every 3 min |
| `cl-process`: AI desk (only acts if "AI processor" is ON) | Supabase pg_cron → `/api/cron/process` | every 15 min |
| `cyprus-scrape-rss`: RSS scraper (only acts if "RSS scraper" is ON) | Supabase pg_cron → edge function | every 3 h |
| `enrich-slow-all`: slow directory enrichment | Supabase pg_cron → edge function | daily 03:00 |

## One-time repair/installation of the Supabase jobs
1. Supabase → SQL Editor → run `supabase/migrations/20261005170000_ops_cron_health.sql`.
2. Database → Extensions: make sure `pg_cron`, `pg_net`, `supabase_vault` are enabled.
3. SQL Editor, add the four secrets (your values; see the top of `supabase/pg_cron/install-jobs.sql`):
   `cl_site_url`, `cl_cron_secret` (= CRON_SECRET in Vercel), `cl_service_role`, `cl_enrich_secret` (= ENRICH_SECRET).
4. Run `supabase/pg_cron/install-jobs.sql` (safe to repeat). The messages say which jobs were scheduled.
5. Admin → System health must show the jobs green within 3–15 minutes.
`supabase/pg_cron/schedule.sql` is obsolete (it contained placeholders that were never filled in) — do not run it.

## Health checks and alerts
Admin → **System health** shows every check, the switch ↔ job map and the scheduled jobs. The same checks run every 30 minutes (from the worker, and daily from the Vercel job as a fallback).
An e-mail goes to `OPS_ALERT_EMAIL` (or `NEWSLETTER_APPROVER_EMAIL`) when the set of red checks changes, again every 12 h while a problem persists, and once when everything is green again.

## Audit trail
Row edits made in the admin screens are recorded by database triggers; server actions (newsletter, members, social, …) by `lib/audit.ts`; every other admin API call (AI generation, scraping, translation, mail replies, moderation, privacy erasure, …) by `lib/auditRequest.ts` (who, which endpoint, when — never the request content). See Admin → Audit log.

## Region
`vercel.json` pins functions to `fra1` (Frankfurt), next to the Supabase database (eu-central-1). Vercel Hobby allows one region.
