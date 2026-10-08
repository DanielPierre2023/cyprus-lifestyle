# Operations — scheduler, health checks, alerts

## What runs automatically
| What | Where | How often |
|---|---|---|
| Daily job: queues the day's background work, prepares the Friday newsletter drafts, reconciles members, runs the health check | Vercel cron `/api/cron/tick` (vercel.json) | daily 06:00 UTC |
| `cl-worker`: background queue, approved newsletters, Facebook/Instagram posts, health check | Supabase pg_cron → `/api/cron/worker` | every 3 min |
| `cl-process`: AI desk (only acts if "AI processor" is ON). The route only wakes the edge function `process-scraped-article`, which does the work in the background (seven languages, checks, up to about three minutes per article) | Supabase pg_cron → `/api/cron/process` → edge function | every 15 min |
| `cyprus-scrape-rss`: RSS scraper (only acts if "RSS scraper" is ON) | Supabase pg_cron → edge function | every 3 h |
| `enrich-slow-all`: slow directory enrichment | Supabase pg_cron → edge function | daily 03:00 |

**Throughput of the AI desk.** One run takes the oldest unprocessed article and finishes it completely (fact core, seven native editions, sub-editing, fact check, publish bar). A second article is started in the same run only if the first one finished early, so plan for about **one article per run**: four per hour at the 15-minute rhythm. More is possible by shortening the schedule (for example every 5 minutes); the per-article claim (`scraped` → `rewriting`) means two runs never take the same article. The cost per article is visible in Admin → AI (spend log) after the first runs; see `docs/TEXTPRODUKTION-OPENAI.md`.

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

## External uptime monitor (free)
The site already has a health endpoint, so nothing needs to be built: `GET /api/health` (see `app/api/health/route.ts`).
It returns only true/false per integration and never a key or secret.

| URL | What it proves | Use it for |
|---|---|---|
| `https://cypruslifestyle.eu/api/health?ping` | The serverless function answers (`{"ok":true,…}`, no database work) | Monitor 1, every 5 minutes |
| `https://cypruslifestyle.eu/api/health?deep` | The Supabase database also answers (200, or 503 when it does not) | Monitor 2, every 5 minutes |
| `https://cypruslifestyle.eu/` | The public home page renders (add the keyword check "Cyprus Lifestyle") | Monitor 3, every 5 minutes |

Setup (about ten minutes, free tier, no card needed):
1. Create a free account at **Better Stack (Uptime)** or **UptimeRobot**. Both have a free plan with several monitors, HTTP(S) checks every few minutes and e-mail alerts. Free-plan limits and terms change; confirm on the pricing page that the free plan still allows a business site (UptimeRobot's free plan has been restricted to non-commercial use, so Better Stack is the safer first choice) and do not enter a payment method.
2. Add the three monitors above as "HTTP(S)" monitors, method GET, expect status 200, check interval 5 minutes, alert to the owner e-mail.
3. Do not point an alert at plain `/api/health` (no query): it is the long human-readable report and only turns 503 when the core Supabase variables are missing.
4. Optional: a public status page is included in some free plans; leave it off unless you want one.

Cost: EUR 0. The only paid features (SMS or phone call alerts, 30 second checks, more than the free monitor count) are not needed.
This monitor and the in-app checks above are complementary: the in-app checks watch the jobs, the external monitor tells you when the whole site is unreachable (which the in-app checks cannot, because they run on the same site).

## Dependency updates (Dependabot)
`.github/dependabot.yml` asks GitHub to open pull requests weekly (Mondays, 06:00 Cyprus time): npm packages and GitHub Actions, minor and patch updates grouped into one PR per ecosystem, at most five open PRs per ecosystem. Major-version updates arrive as separate PRs. It is free. Merge a PR in the GitHub web page after the checks are green. If the repository has no `.github/workflows` folder the Actions block simply finds nothing to update.

## Branch protection: not recommended for this workflow
Turning on branch protection (required pull requests or required status checks on `main`) would block the owner's "Add file / Upload files" commits straight to `main` from the GitHub web page, because those direct pushes would be rejected. Keep `main` unprotected as long as that is how code is deployed. The safety net is `npm run ci` (secret scan, migration check, translation parity, types, lint, tests) plus Vercel's preview and rollback; a protected branch can be introduced later together with a pull-request habit.

## Browser smoke test (read-only)
`npm run smoke` drives a real Chromium through the public pages of all seven locales (home, a section page, directory, a directory type page, a listing page, agenda, map, membership, advertise, contact, privacy, and the newsletter form on the home page). It only issues GET requests, never submits a form and never logs in. It checks HTTP 200, console errors, failed same-origin requests, `<html lang>` and `dir` (rtl for Arabic), the `<main>` landmark, horizontal overflow at 390 px and 1280 px, up to 15 internal links per page, and that every JSON-LD block parses.
Defaults to `https://cypruslifestyle.eu`; use `BASE_URL=http://localhost:3000 npm run smoke` for a local server and `LOCALES=en,ar` for a subset. Exit code 0 means no failures. It needs Playwright and a Chromium that is already installed (it never runs `playwright install`; see the header of `scripts/smoke/site-smoke.mjs`). It is deliberately not part of `npm run ci`.
